/**
 * Tests for time tracking hooks.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, createTestQueryClient, createWrapperWithClient } from '@/test/utils';
import {
  useTimeEntryTypes,
  useMyTimeEntries,
  useCurrentTimeEntry,
  useWeeklySummary,
  useClockIn,
  useClockOut,
} from '../useTimeTracking';
import { createTimeEntry, createTimeEntryType, paginatedResponse } from '@/test/mocks/data';

describe('useTimeEntryTypes', () => {
  it('fetches time entry types', async () => {
    const mockType = createTimeEntryType();

    server.use(
      http.get('/api/v1/time-entries/types/', () => {
        return HttpResponse.json([mockType]);
      })
    );

    const { result } = renderHook(() => useTimeEntryTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].code).toBe('REG');
  });
});

describe('useMyTimeEntries', () => {
  it('fetches user time entries', async () => {
    const mockEntry = createTimeEntry();

    server.use(
      http.get('/api/v1/time-entries/my_entries/', () => {
        return HttpResponse.json(paginatedResponse([mockEntry]));
      })
    );

    const { result } = renderHook(() => useMyTimeEntries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.results).toHaveLength(1);
  });

  it('passes filters to API', async () => {
    let receivedParams: URLSearchParams | undefined;

    server.use(
      http.get('/api/v1/time-entries/my_entries/', ({ request }) => {
        receivedParams = new URL(request.url).searchParams;
        return HttpResponse.json(paginatedResponse([]));
      })
    );

    const { result } = renderHook(
      () =>
        useMyTimeEntries({
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(receivedParams?.get('start_date')).toBe('2024-01-01');
    expect(receivedParams?.get('end_date')).toBe('2024-01-31');
  });
});

describe('useCurrentTimeEntry', () => {
  it('returns active entry when clocked in', async () => {
    const activeEntry = createTimeEntry({ end_time: null });

    server.use(
      http.get('/api/v1/time-entries/current/', () => {
        return HttpResponse.json(activeEntry);
      })
    );

    const { result } = renderHook(() => useCurrentTimeEntry(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.end_time).toBeNull();
  });

  it('returns null when not clocked in', async () => {
    server.use(
      http.get('/api/v1/time-entries/current/', () => {
        return HttpResponse.json(null);
      })
    );

    const { result } = renderHook(() => useCurrentTimeEntry(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useWeeklySummary', () => {
  it('fetches weekly summary', async () => {
    server.use(
      http.get('/api/v1/time-entries/summary/', () => {
        return HttpResponse.json({
          week_start: '2024-01-01',
          week_end: '2024-01-07',
          total_hours: 40,
          regular_hours: 35,
          overtime_hours: 5,
          daily_breakdown: [],
        });
      })
    );

    const { result } = renderHook(() => useWeeklySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.total_hours).toBe(40);
  });
});

describe('useClockIn', () => {
  it('clocks in successfully', async () => {
    const activeEntry = createTimeEntry({ end_time: null });

    server.use(
      http.post('/api/v1/time-entries/clock_in/', () => {
        return HttpResponse.json(activeEntry, { status: 201 });
      })
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useClockIn(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.end_time).toBeNull();
  });

  it('invalidates time entries on success', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    server.use(
      http.post('/api/v1/time-entries/clock_in/', () => {
        return HttpResponse.json(createTimeEntry(), { status: 201 });
      })
    );

    const { result } = renderHook(() => useClockIn(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['time-entries'] })
    );
  });
});

describe('useClockOut', () => {
  it('clocks out successfully', async () => {
    const completedEntry = createTimeEntry({
      end_time: '17:00:00',
      break_minutes: 60,
    });

    server.use(
      http.post('/api/v1/time-entries/clock_out/', () => {
        return HttpResponse.json(completedEntry);
      })
    );

    const { result } = renderHook(() => useClockOut(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ break_minutes: 60 });
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.end_time).toBe('17:00:00');
  });
});
