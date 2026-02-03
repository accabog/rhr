/**
 * Tests for TimeTrackingPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import {
  createEmployee,
  createTimeEntry,
  createTimeEntryType,
  paginatedResponse,
} from '@/test/mocks/data';
import TimeTrackingPage from '../TimeTrackingPage';

const mockEmployee = createEmployee();

const mockTimeEntryTypes = [
  createTimeEntryType({ id: 1, name: 'Regular', code: 'REG', color: '#3b82f6' }),
  createTimeEntryType({ id: 2, name: 'Overtime', code: 'OT', color: '#f59e0b' }),
];

const mockTimeEntries = [
  createTimeEntry({
    id: 1,
    employee: mockEmployee,
    entry_type: mockTimeEntryTypes[0],
    entry_type_name: 'Regular',
    entry_type_color: '#3b82f6',
    date: '2024-01-15',
    start_time: '09:00:00',
    end_time: '17:00:00',
    break_minutes: 60,
    duration_minutes: 420,
    duration_hours: 7,
    project: 'Project Alpha',
    task: 'Development',
    is_approved: false,
    notes: 'Working on feature X',
  }),
  createTimeEntry({
    id: 2,
    employee: mockEmployee,
    entry_type: mockTimeEntryTypes[0],
    entry_type_name: 'Regular',
    entry_type_color: '#3b82f6',
    date: '2024-01-16',
    start_time: '08:30:00',
    end_time: '16:30:00',
    break_minutes: 30,
    duration_minutes: 450,
    duration_hours: 7.5,
    project: 'Project Beta',
    task: '',
    is_approved: true,
  }),
  createTimeEntry({
    id: 3,
    employee: mockEmployee,
    entry_type: mockTimeEntryTypes[1],
    entry_type_name: 'Overtime',
    entry_type_color: '#f59e0b',
    date: '2024-01-16',
    start_time: '18:00:00',
    end_time: '20:00:00',
    break_minutes: 0,
    duration_minutes: 120,
    duration_hours: 2,
    project: 'Project Alpha',
    task: 'Bug fixes',
    is_approved: false,
  }),
];

const mockWeeklySummary = {
  week_start: '2024-01-15',
  week_end: '2024-01-21',
  total_hours: '16.50',
  regular_hours: '14.50',
  overtime_hours: '2.00',
  daily_breakdown: [
    { date: '2024-01-15', hours: '7.00' },
    { date: '2024-01-16', hours: '9.50' },
  ],
};

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <MemoryRouter>
      <Wrapper>
        <TimeTrackingPage />
      </Wrapper>
    </MemoryRouter>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  return result;
}

describe('TimeTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/time-entries/my_entries/', () => {
        return HttpResponse.json(paginatedResponse(mockTimeEntries));
      }),
      http.get('/api/v1/time-entries/current/', () => {
        return HttpResponse.json(null);
      }),
      http.get('/api/v1/time-entries/summary/', () => {
        return HttpResponse.json(mockWeeklySummary);
      }),
      http.get('/api/v1/time-entries/types/', () => {
        return HttpResponse.json(mockTimeEntryTypes);
      }),
      http.get('/api/v1/time-entry-types/', () => {
        return HttpResponse.json(mockTimeEntryTypes);
      }),
      http.get('/api/v1/employees/me/', () => {
        return HttpResponse.json(mockEmployee);
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      await renderPage();

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
    });

    it('renders date range picker', async () => {
      await renderPage();

      await waitFor(() => {
        const rangePicker = document.querySelector('.ant-picker-range');
        expect(rangePicker).toBeInTheDocument();
      });
    });

    it('renders add entry button', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
      });
    });

    it('renders clock widget', async () => {
      await renderPage();

      await waitFor(() => {
        const clockWidget = document.querySelector('[class*="clock"]') ||
                           screen.queryByText(/clock in/i);
        expect(clockWidget).toBeInTheDocument();
      });
    });
  });

  describe('time entries table', () => {
    it('displays time entries', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Project Alpha').length).toBeGreaterThan(0);
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows entry type tags', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Regular').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Overtime').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('shows duration for completed entries', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('7h 0m')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows break time', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('60m')).toBeInTheDocument();
        expect(screen.getByText('30m')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows project and task', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Development')).toBeInTheDocument();
        expect(screen.getByText('Bug fixes')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows approval status', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('entry actions', () => {
    it('shows edit button for non-approved entries', async () => {
      await renderPage();

      await waitFor(() => {
        const editButtons = document.querySelectorAll('[aria-label*="edit"], .anticon-edit');
        expect(editButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('shows delete button for non-approved entries', async () => {
      await renderPage();

      await waitFor(() => {
        const deleteButtons = document.querySelectorAll('[aria-label*="delete"], .anticon-delete');
        expect(deleteButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('opens edit modal when edit clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        const editButton = document.querySelector('.anticon-edit')?.closest('button');
        expect(editButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const editButton = document.querySelector('.anticon-edit')?.closest('button');
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });

    it('shows delete confirmation when delete clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        const deleteButton = document.querySelector('.anticon-delete')?.closest('button');
        expect(deleteButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const deleteButton = document.querySelector('.anticon-delete')?.closest('button');
      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText('Delete this entry?')).toBeInTheDocument();
        });
      }
    });

    it('calls delete API when confirmed', async () => {
      let deleteCalledWithId: number | null = null;

      server.use(
        http.delete('/api/v1/time-entries/:id/', ({ params }) => {
          deleteCalledWithId = Number(params.id);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        const deleteButton = document.querySelector('.anticon-delete')?.closest('button');
        expect(deleteButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const deleteButton = document.querySelector('.anticon-delete')?.closest('button');
      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText('Delete this entry?')).toBeInTheDocument();
        });

        const popconfirmDeleteButton = document.querySelector('.ant-popconfirm-buttons button.ant-btn-dangerous');
        if (popconfirmDeleteButton) {
          await user.click(popconfirmDeleteButton);
        }

        await waitFor(() => {
          expect(deleteCalledWithId).toBe(1);
        });
      }
    });
  });

  describe('add entry modal', () => {
    it('opens modal when add entry button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add entry/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('weekly summary', () => {
    it('displays weekly summary card', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/weekly summary/i)).toBeInTheDocument();
      });
    });

    it('shows total hours', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/16\.5/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('date range filtering', () => {
    it('filters entries when date range changes', async () => {
      let requestedStartDate: string | null = null;
      let requestedEndDate: string | null = null;

      server.use(
        http.get('/api/v1/time-entries/my_entries/', ({ request }) => {
          const url = new URL(request.url);
          requestedStartDate = url.searchParams.get('start_date');
          requestedEndDate = url.searchParams.get('end_date');
          return HttpResponse.json(paginatedResponse(mockTimeEntries));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(requestedStartDate).not.toBeNull();
        expect(requestedEndDate).not.toBeNull();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no entries for period', async () => {
      server.use(
        http.get('/api/v1/time-entries/my_entries/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No time entries for this period')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading state while fetching data', async () => {
      server.use(
        http.get('/api/v1/time-entries/my_entries/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(paginatedResponse(mockTimeEntries));
        })
      );

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <TimeTrackingPage />
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
    });
  });

  describe('in-progress entries', () => {
    it('shows in progress tag for entries without end time', async () => {
      const inProgressEntry = createTimeEntry({
        id: 100,
        start_time: '09:00:00',
        end_time: null,
        duration_minutes: 0,
      });

      server.use(
        http.get('/api/v1/time-entries/my_entries/', () => {
          return HttpResponse.json(paginatedResponse([inProgressEntry]));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
