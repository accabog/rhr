/**
 * Tests for timetracking API module.
 */

import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { timetrackingApi } from '../timetracking';
import {
  createTimeEntry,
  createTimeEntryType,
  paginatedResponse,
} from '@/test/mocks/data';

describe('timetrackingApi', () => {
  describe('listTypes', () => {
    it('returns list of time entry types', async () => {
      const mockType = createTimeEntryType();

      server.use(
        http.get('/api/v1/time-entries/types/', () => {
          return HttpResponse.json([mockType]);
        })
      );

      const result = await timetrackingApi.listTypes();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('REG');
    });
  });

  describe('list', () => {
    it('returns paginated time entries', async () => {
      const mockEntry = createTimeEntry();

      server.use(
        http.get('/api/v1/time-entries/', () => {
          return HttpResponse.json(paginatedResponse([mockEntry]));
        })
      );

      const result = await timetrackingApi.list();

      expect(result.results).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('passes filter parameters', async () => {
      let receivedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/v1/time-entries/', ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await timetrackingApi.list({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        employee: 1,
      });

      expect(receivedParams?.get('start_date')).toBe('2024-01-01');
      expect(receivedParams?.get('end_date')).toBe('2024-01-31');
      expect(receivedParams?.get('employee')).toBe('1');
    });
  });

  describe('getMyEntries', () => {
    it('returns current user time entries', async () => {
      const mockEntry = createTimeEntry();

      server.use(
        http.get('/api/v1/time-entries/my_entries/', () => {
          return HttpResponse.json(paginatedResponse([mockEntry]));
        })
      );

      const result = await timetrackingApi.getMyEntries();

      expect(result.results).toHaveLength(1);
    });
  });

  describe('getCurrent', () => {
    it('returns active time entry when clocked in', async () => {
      const activeEntry = createTimeEntry({ end_time: null });

      server.use(
        http.get('/api/v1/time-entries/current/', () => {
          return HttpResponse.json(activeEntry);
        })
      );

      const result = await timetrackingApi.getCurrent();

      expect(result).toBeDefined();
      expect(result?.end_time).toBeNull();
    });

    it('returns null when not clocked in', async () => {
      server.use(
        http.get('/api/v1/time-entries/current/', () => {
          return HttpResponse.json(null);
        })
      );

      const result = await timetrackingApi.getCurrent();

      expect(result).toBeNull();
    });
  });

  describe('clockIn', () => {
    it('creates active time entry', async () => {
      const activeEntry = createTimeEntry({
        end_time: null,
        break_minutes: 0,
      });

      server.use(
        http.post('/api/v1/time-entries/clock_in/', () => {
          return HttpResponse.json(activeEntry, { status: 201 });
        })
      );

      const result = await timetrackingApi.clockIn();

      expect(result.end_time).toBeNull();
    });

    it('passes optional data', async () => {
      let receivedBody: Record<string, unknown> | undefined;

      server.use(
        http.post('/api/v1/time-entries/clock_in/', async ({ request }) => {
          receivedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(createTimeEntry(), { status: 201 });
        })
      );

      await timetrackingApi.clockIn({
        notes: 'Working from home',
        project: 'RHR',
      });

      expect(receivedBody?.notes).toBe('Working from home');
      expect(receivedBody?.project).toBe('RHR');
    });
  });

  describe('clockOut', () => {
    it('updates active entry with end time', async () => {
      const completedEntry = createTimeEntry({
        end_time: '17:00:00',
        break_minutes: 60,
      });

      server.use(
        http.post('/api/v1/time-entries/clock_out/', () => {
          return HttpResponse.json(completedEntry);
        })
      );

      const result = await timetrackingApi.clockOut({ break_minutes: 60 });

      expect(result.end_time).toBe('17:00:00');
      expect(result.break_minutes).toBe(60);
    });
  });

  describe('getSummary', () => {
    it('returns weekly summary', async () => {
      server.use(
        http.get('/api/v1/time-entries/summary/', () => {
          return HttpResponse.json({
            week_start: '2024-01-01',
            week_end: '2024-01-07',
            total_hours: '40.00',
            regular_hours: '35.00',
            overtime_hours: '5.00',
            daily_breakdown: [],
          });
        })
      );

      const result = await timetrackingApi.getSummary();

      expect(result.total_hours).toBe('40.00');
      expect(result.regular_hours).toBe('35.00');
      expect(result.overtime_hours).toBe('5.00');
    });

    it('passes date range parameters', async () => {
      let receivedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/v1/time-entries/summary/', ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({
            week_start: '2024-01-01',
            week_end: '2024-01-07',
            total_hours: '0',
            regular_hours: '0',
            overtime_hours: '0',
            daily_breakdown: [],
          });
        })
      );

      await timetrackingApi.getSummary('2024-01-01', '2024-01-07');

      expect(receivedParams?.get('start_date')).toBe('2024-01-01');
      expect(receivedParams?.get('end_date')).toBe('2024-01-07');
    });
  });

  describe('approve', () => {
    it('approves time entry', async () => {
      const approvedEntry = createTimeEntry({ is_approved: true });

      server.use(
        http.post('/api/v1/time-entries/1/approve/', () => {
          return HttpResponse.json(approvedEntry);
        })
      );

      const result = await timetrackingApi.approve(1);

      expect(result.is_approved).toBe(true);
    });
  });

  describe('create', () => {
    it('creates a new time entry', async () => {
      const newEntry = createTimeEntry({ id: 100 });

      server.use(
        http.post('/api/v1/time-entries/', () => {
          return HttpResponse.json(newEntry, { status: 201 });
        })
      );

      const result = await timetrackingApi.create({
        date: '2024-01-15',
        start_time: '09:00:00',
        end_time: '17:00:00',
      });

      expect(result.id).toBe(100);
    });
  });

  describe('update', () => {
    it('updates an existing time entry', async () => {
      const updatedEntry = createTimeEntry({ notes: 'Updated notes' });

      server.use(
        http.patch('/api/v1/time-entries/1/', () => {
          return HttpResponse.json(updatedEntry);
        })
      );

      const result = await timetrackingApi.update(1, { notes: 'Updated notes' });

      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('delete', () => {
    it('deletes a time entry', async () => {
      server.use(
        http.delete('/api/v1/time-entries/1/', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      await expect(timetrackingApi.delete(1)).resolves.not.toThrow();
    });
  });
});
