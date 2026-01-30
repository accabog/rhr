/**
 * Tests for ClockWidget component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import { createTimeEntry } from '@/test/mocks/data';
import ClockWidget from '../ClockWidget';

function renderClockWidget() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <ClockWidget />
    </Wrapper>
  );
}

describe('ClockWidget', () => {
  // Use real timers but mock Date for predictable elapsed time calculations
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when not clocked in', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/v1/time-entries/current/', () => {
          return HttpResponse.json(null);
        })
      );
    });

    it('shows clock in state', async () => {
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByText('Ready to Work?')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
    });

    it('shows helpful message', async () => {
      renderClockWidget();

      await waitFor(() => {
        expect(
          screen.getByText(/click below to start tracking your time/i)
        ).toBeInTheDocument();
      });
    });

    it('calls clock in API when button clicked', async () => {
      let clockInCalled = false;

      server.use(
        http.post('/api/v1/time-entries/clock_in/', () => {
          clockInCalled = true;
          return HttpResponse.json(
            createTimeEntry({ end_time: null }),
            { status: 201 }
          );
        })
      );

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /clock in/i }));

      await waitFor(() => {
        expect(clockInCalled).toBe(true);
      });
    });
  });

  describe('when clocked in', () => {
    beforeEach(() => {
      const activeEntry = createTimeEntry({
        end_time: null,
        start_time: '09:00:00',
        entry_type_name: 'Regular',
      });

      server.use(
        http.get('/api/v1/time-entries/current/', () => {
          return HttpResponse.json(activeEntry);
        })
      );
    });

    it('shows clocked in state', async () => {
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByText('Currently Working')).toBeInTheDocument();
      });
    });

    it('shows elapsed time', async () => {
      renderClockWidget();

      await waitFor(() => {
        // System time is 14:30, started at 09:00 = 5h 30m
        expect(screen.getByText('5h 30m')).toBeInTheDocument();
      });
    });

    it('shows start time', async () => {
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByText(/started at 09:00/i)).toBeInTheDocument();
      });
    });

    it('shows entry type', async () => {
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByText('Regular')).toBeInTheDocument();
      });
    });

    it('shows clock out button', async () => {
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock out/i })).toBeInTheDocument();
      });
    });

    it('opens clock out modal when button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderClockWidget();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock out/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /clock out/i }));

      await waitFor(() => {
        expect(screen.getByText('Break Time (minutes)')).toBeInTheDocument();
      });
    });

    it('calls clock out API with break minutes', async () => {
      let capturedBody: { break_minutes?: number } | undefined;

      server.use(
        http.post('/api/v1/time-entries/clock_out/', async ({ request }) => {
          capturedBody = await request.json() as { break_minutes?: number };
          return HttpResponse.json(createTimeEntry());
        })
      );

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderClockWidget();

      // Wait for clock out button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock out/i })).toBeInTheDocument();
      });

      // Click clock out
      await user.click(screen.getByRole('button', { name: /clock out/i }));

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Break Time (minutes)')).toBeInTheDocument();
      });

      // Enter break minutes
      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '60');

      // Submit
      await user.click(screen.getByRole('button', { name: /^clock out$/i }));

      await waitFor(() => {
        expect(capturedBody?.break_minutes).toBe(60);
      });
    });
  });

  describe('loading state', () => {
    it('shows spinner while loading', async () => {
      server.use(
        http.get('/api/v1/time-entries/current/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(null);
        })
      );

      renderClockWidget();

      // Ant Design Spin component renders with class ant-spin
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });
});
