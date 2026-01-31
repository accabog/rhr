/**
 * Tests for TimesheetDetailPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import TimesheetDetailPage from '../TimesheetDetailPage';

const mockTimesheet = {
  id: 1,
  employee: 1,
  employee_name: 'John Doe',
  period_start: '2024-01-15',
  period_end: '2024-01-21',
  status: 'draft',
  total_hours: 40.5,
  total_regular_hours: '38.00',
  total_overtime_hours: '2.50',
  total_break_hours: '5.00',
  submitted_at: null,
  approved_at: null,
  approved_by: null,
  approved_by_name: null,
  rejection_reason: null,
  time_entries: [
    {
      id: 1,
      date: '2024-01-15',
      entry_type: 1,
      entry_type_name: 'Regular',
      entry_type_color: '#3b82f6',
      start_time: '09:00:00',
      end_time: '17:00:00',
      break_minutes: 60,
      duration_minutes: 420,
      project: 'Project Alpha',
      task: 'Development',
    },
    {
      id: 2,
      date: '2024-01-16',
      entry_type: 1,
      entry_type_name: 'Regular',
      entry_type_color: '#3b82f6',
      start_time: '09:00:00',
      end_time: '18:00:00',
      break_minutes: 60,
      duration_minutes: 480,
      project: null,
      task: null,
    },
  ],
  comments: [
    {
      id: 1,
      author_name: 'Jane Manager',
      content: 'Please check the overtime on Tuesday',
      created_at: '2024-01-16T10:00:00Z',
    },
  ],
};

function renderPage(timesheetId = '1') {
  const Wrapper = createWrapper();
  return render(
    <MemoryRouter initialEntries={[`/timesheets/${timesheetId}`]}>
      <Wrapper>
        <Routes>
          <Route path="/timesheets/:id" element={<TimesheetDetailPage />} />
        </Routes>
      </Wrapper>
    </MemoryRouter>
  );
}

describe('TimesheetDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/timesheets/:id/', () => {
        return HttpResponse.json(mockTimesheet);
      }),
      http.post('/api/v1/timesheets/:id/submit/', () => {
        return HttpResponse.json({ ...mockTimesheet, status: 'submitted' });
      }),
      http.post('/api/v1/timesheets/:id/approve/', () => {
        return HttpResponse.json({ ...mockTimesheet, status: 'approved' });
      }),
      http.post('/api/v1/timesheets/:id/reject/', () => {
        return HttpResponse.json({ ...mockTimesheet, status: 'rejected' });
      }),
      http.post('/api/v1/timesheets/:id/reopen/', () => {
        return HttpResponse.json({ ...mockTimesheet, status: 'draft' });
      }),
      http.delete('/api/v1/timesheets/:id/', () => {
        return new HttpResponse(null, { status: 204 });
      }),
      http.post('/api/v1/timesheets/:id/comments/', () => {
        return HttpResponse.json({ id: 2, content: 'New comment' });
      })
    );
  });

  describe('rendering', () => {
    it('renders back button', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('renders timesheet period header', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Timesheet:/)).toBeInTheDocument();
      });
    });

    it('renders employee name', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('renders status tag', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('DRAFT')).toBeInTheDocument();
      });
    });

    it('renders total hours statistic', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
      });
    });

    it('renders entries count statistic', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Entries')).toBeInTheDocument();
      });
    });

    it('renders regular hours', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Regular Hours')).toBeInTheDocument();
        expect(screen.getByText('38.0h')).toBeInTheDocument();
      });
    });

    it('renders overtime hours', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Overtime')).toBeInTheDocument();
        expect(screen.getByText('2.5h')).toBeInTheDocument();
      });
    });

    it('renders time entries table', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Time Entries')).toBeInTheDocument();
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });
    });

    it('renders comments section', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Jane Manager')).toBeInTheDocument();
        expect(screen.getByText('Please check the overtime on Tuesday')).toBeInTheDocument();
      });
    });
  });

  describe('draft status actions', () => {
    it('shows submit button for draft timesheet', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
      });
    });

    it('shows delete button for draft timesheet', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('calls submit API when submit clicked', async () => {
      let submitCalled = false;
      server.use(
        http.post('/api/v1/timesheets/:id/submit/', () => {
          submitCalled = true;
          return HttpResponse.json({ ...mockTimesheet, status: 'submitted' });
        })
      );

      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /submit for approval/i }));

      await waitFor(() => {
        expect(submitCalled).toBe(true);
      });
    });
  });

  describe('submitted status actions', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({
            ...mockTimesheet,
            status: 'submitted',
            submitted_at: '2024-01-17T10:00:00Z',
          });
        })
      );
    });

    it('shows approve button for submitted timesheet', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      });
    });

    it('shows reject button for submitted timesheet', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
      });
    });

    it('shows submitted date', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Submitted')).toBeInTheDocument();
      });
    });
  });

  describe('rejected status', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({
            ...mockTimesheet,
            status: 'rejected',
            rejection_reason: 'Missing project information',
          });
        })
      );
    });

    it('shows reopen button for rejected timesheet', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reopen for editing/i })).toBeInTheDocument();
      });
    });

    it('shows rejection reason', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
        expect(screen.getByText('Missing project information')).toBeInTheDocument();
      });
    });
  });

  describe('approved status', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({
            ...mockTimesheet,
            status: 'approved',
            submitted_at: '2024-01-17T10:00:00Z',
            approved_at: '2024-01-18T14:00:00Z',
            approved_by_name: 'Jane Manager',
          });
        })
      );
    });

    it('shows approved status tag', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
      });
    });

    it('shows approved by name', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Approved By')).toBeInTheDocument();
        expect(screen.getAllByText('Jane Manager').length).toBeGreaterThan(0);
      });
    });
  });

  describe('reject modal', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({
            ...mockTimesheet,
            status: 'submitted',
          });
        })
      );
    });

    it('opens reject modal when reject clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /reject/i }));

      await waitFor(() => {
        expect(screen.getByText('Reject Timesheet')).toBeInTheDocument();
        expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
      });
    });
  });

  describe('comment modal', () => {
    it('shows add comment button', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
      });
    });

    it('opens comment modal when add comment clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add comment/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('shows back button', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching', async () => {
      server.use(
        http.get('/api/v1/timesheets/:id/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(mockTimesheet);
        })
      );

      renderPage();

      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('not found state', () => {
    it('shows error when timesheet not found', async () => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Timesheet not found')).toBeInTheDocument();
      });
    });

    it('shows back to timesheets button on not found', async () => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to timesheets/i })).toBeInTheDocument();
      });
    });
  });

  describe('time entries display', () => {
    it('shows entry type tags', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Regular').length).toBeGreaterThan(0);
      });
    });

    it('shows project and task', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Development')).toBeInTheDocument();
      });
    });

    it('shows break time', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Break')).toBeInTheDocument();
      });
    });
  });

  describe('no comments state', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/v1/timesheets/:id/', () => {
          return HttpResponse.json({
            ...mockTimesheet,
            comments: [],
          });
        })
      );
    });

    it('shows no comments message', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument();
      });
    });
  });
});
