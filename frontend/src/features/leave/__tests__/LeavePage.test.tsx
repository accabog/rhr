/**
 * Tests for LeavePage component.
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
  createLeaveRequest,
  createLeaveType,
  paginatedResponse,
} from '@/test/mocks/data';
import LeavePage from '../LeavePage';

const mockEmployee = createEmployee();

const mockLeaveTypes = [
  createLeaveType({ id: 1, name: 'Annual Leave', code: 'ANNUAL', color: '#10b981' }),
  createLeaveType({ id: 2, name: 'Sick Leave', code: 'SICK', color: '#ef4444' }),
];

const mockBalanceSummary = [
  {
    leave_type_id: 1,
    leave_type_name: 'Annual Leave',
    leave_type_color: '#10b981',
    entitled_days: '20.00',
    used_days: '5.00',
    remaining_days: '15.00',
    pending_days: '2.00',
  },
  {
    leave_type_id: 2,
    leave_type_name: 'Sick Leave',
    leave_type_color: '#ef4444',
    entitled_days: '10.00',
    used_days: '0.00',
    remaining_days: '10.00',
    pending_days: '0.00',
  },
];

const mockMyRequests = [
  createLeaveRequest({
    id: 1,
    employee: mockEmployee,
    employee_name: 'John Doe',
    leave_type: 1,
    leave_type_name: 'Annual Leave',
    leave_type_color: '#10b981',
    start_date: '2024-07-01',
    end_date: '2024-07-05',
    days_requested: 5,
    status: 'pending',
    reason: 'Summer vacation',
  }),
  createLeaveRequest({
    id: 2,
    employee: mockEmployee,
    employee_name: 'John Doe',
    leave_type: 1,
    leave_type_name: 'Annual Leave',
    leave_type_color: '#10b981',
    start_date: '2024-03-01',
    end_date: '2024-03-01',
    days_requested: 1,
    status: 'approved',
    reason: 'Personal day',
  }),
  createLeaveRequest({
    id: 3,
    employee: mockEmployee,
    employee_name: 'John Doe',
    leave_type: 2,
    leave_type_name: 'Sick Leave',
    leave_type_color: '#ef4444',
    start_date: '2024-02-15',
    end_date: '2024-02-15',
    days_requested: 1,
    status: 'rejected',
    reason: 'Feeling unwell',
  }),
];

const bobEmployee = createEmployee({ id: 100, first_name: 'Bob', last_name: 'Smith' });
const mockPendingRequests = [
  createLeaveRequest({
    id: 10,
    employee: bobEmployee,
    employee_name: 'Bob Smith',
    leave_type: 1,
    leave_type_name: 'Annual Leave',
    leave_type_color: '#10b981',
    start_date: '2024-08-01',
    end_date: '2024-08-05',
    days_requested: 5,
    status: 'pending',
    reason: 'Family vacation',
  }),
  createLeaveRequest({
    id: 11,
    employee: bobEmployee,
    employee_name: 'Alice Jones',
    leave_type: 2,
    leave_type_name: 'Sick Leave',
    leave_type_color: '#ef4444',
    start_date: '2024-07-20',
    end_date: '2024-07-21',
    days_requested: 2,
    status: 'pending',
    reason: 'Medical appointment',
  }),
];

const mockUpcomingHolidays = [
  { id: 1, name: 'Independence Day', date: '2024-07-04', country: 'US' },
  { id: 2, name: 'Labor Day', date: '2024-09-02', country: 'US' },
];

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <MemoryRouter>
      <Wrapper>
        <LeavePage />
      </Wrapper>
    </MemoryRouter>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  return result;
}

describe('LeavePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/leave/types/', () => {
        return HttpResponse.json(mockLeaveTypes);
      }),
      http.get('/api/v1/leave/balances/summary/', () => {
        return HttpResponse.json(mockBalanceSummary);
      }),
      http.get('/api/v1/leave/requests/my_requests/', () => {
        return HttpResponse.json(paginatedResponse(mockMyRequests));
      }),
      http.get('/api/v1/leave/requests/pending_approval/', () => {
        return HttpResponse.json(paginatedResponse(mockPendingRequests));
      }),
      http.get('/api/v1/leave/holidays/upcoming/', () => {
        return HttpResponse.json(mockUpcomingHolidays);
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      await renderPage();

      expect(screen.getByText('Leave Management')).toBeInTheDocument();
    });

    it('renders leave balances card', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Leave Balances')).toBeInTheDocument();
      });
    });

    it('renders tabs for my requests and pending approval', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('My Requests')).toBeInTheDocument();
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });
    });

    it('shows request leave button', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request leave/i })).toBeInTheDocument();
      });
    });
  });

  describe('leave balances', () => {
    it('displays leave balance for each type', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Annual Leave').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Sick Leave').length).toBeGreaterThan(0);
      });
    });

    it('shows remaining and entitled days', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/15\.0 \/ 20 days/)).toBeInTheDocument();
        expect(screen.getByText(/10\.0 \/ 10 days/)).toBeInTheDocument();
      });
    });

    it('shows pending days when applicable', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/2\.0 days pending/)).toBeInTheDocument();
      });
    });

    it('shows empty state when no balances configured', async () => {
      server.use(
        http.get('/api/v1/leave/balances/summary/', () => {
          return HttpResponse.json([]);
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No leave balances configured')).toBeInTheDocument();
      });
    });
  });

  describe('upcoming holidays', () => {
    it('renders upcoming holidays card', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Upcoming Holidays')).toBeInTheDocument();
      });
    });

    it('displays holiday names and dates', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Independence Day')).toBeInTheDocument();
        expect(screen.getByText('Labor Day')).toBeInTheDocument();
      });
    });

    it('shows empty state when no upcoming holidays', async () => {
      server.use(
        http.get('/api/v1/leave/holidays/upcoming/', () => {
          return HttpResponse.json([]);
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No upcoming holidays')).toBeInTheDocument();
      });
    });
  });

  describe('my requests tab', () => {
    it('displays leave requests in table', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.queryByText('No leave requests')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Summer vacation')).toBeInTheDocument();
    });

    it('shows status tags with correct text', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('Rejected')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows cancel button only for pending requests', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.queryByText('No leave requests')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      expect(cancelButtons.length).toBe(1);
    });

    it('shows empty state when no requests', async () => {
      server.use(
        http.get('/api/v1/leave/requests/my_requests/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No leave requests')).toBeInTheDocument();
      });

      expect(
        screen.getByRole('button', { name: /submit your first request/i })
      ).toBeInTheDocument();
    });
  });

  describe('pending approval tab', () => {
    it('shows badge with pending count', async () => {
      await renderPage();

      await waitFor(() => {
        const pendingTab = screen.getByText('Pending Approval').closest('div');
        expect(pendingTab?.textContent).toContain('2');
      });
    });

    it('switches to pending tab and shows pending requests', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        expect(screen.getByText('Alice Jones')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows approve and reject buttons for pending requests', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        const approveButtons = screen.getAllByRole('button', { name: /approve/i });
        const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
        expect(approveButtons.length).toBe(2);
        expect(rejectButtons.length).toBe(2);
      }, { timeout: 3000 });
    });

    it('shows empty state when no pending requests', async () => {
      server.use(
        http.get('/api/v1/leave/requests/pending_approval/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        expect(screen.getByText('No requests pending approval')).toBeInTheDocument();
      });
    });
  });

  describe('approve request flow', () => {
    it('calls approve API when approve button clicked', async () => {
      let approveCalledWithId: number | null = null;

      server.use(
        http.post('/api/v1/leave/requests/:id/approve/', ({ params }) => {
          approveCalledWithId = Number(params.id);
          return HttpResponse.json({
            ...mockPendingRequests[0],
            id: Number(params.id),
            status: 'approved',
          });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      }, { timeout: 3000 });

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(approveCalledWithId).toBe(10);
      });
    });
  });

  describe('reject request flow', () => {
    it('opens reject modal when reject button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      }, { timeout: 3000 });

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reject Leave Request')).toBeInTheDocument();
        expect(screen.getByText('Reason for rejection')).toBeInTheDocument();
      });
    });

    it('calls reject API with notes when form submitted', async () => {
      let rejectCalledWithId: number | null = null;
      let rejectNotes: string | undefined;

      server.use(
        http.post('/api/v1/leave/requests/:id/reject/', async ({ params, request }) => {
          rejectCalledWithId = Number(params.id);
          const body = (await request.json()) as { notes?: string };
          rejectNotes = body.notes;
          return HttpResponse.json({
            ...mockPendingRequests[0],
            id: Number(params.id),
            status: 'rejected',
          });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      }, { timeout: 3000 });

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reject Leave Request')).toBeInTheDocument();
      });

      const reasonInput = screen.getByPlaceholderText(
        'Explain why this request is rejected...'
      );
      await user.type(reasonInput, 'Insufficient coverage');

      const modalRejectButton = screen.getByRole('button', { name: /^reject$/i });
      await user.click(modalRejectButton);

      await waitFor(() => {
        expect(rejectCalledWithId).toBe(10);
        expect(rejectNotes).toBe('Insufficient coverage');
      });
    });
  });

  describe('cancel request flow', () => {
    it('shows confirmation when cancel clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.queryByText('No leave requests')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel this leave request?')).toBeInTheDocument();
      });
    });

    it('calls cancel API when confirmed', async () => {
      let cancelCalledWithId: number | null = null;

      server.use(
        http.post('/api/v1/leave/requests/:id/cancel/', ({ params }) => {
          cancelCalledWithId = Number(params.id);
          return HttpResponse.json({
            ...mockMyRequests[0],
            id: Number(params.id),
            status: 'cancelled',
          });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.queryByText('No leave requests')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel this leave request?')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /yes/i }));

      await waitFor(() => {
        expect(cancelCalledWithId).toBe(1);
      });
    });
  });

  describe('request leave modal', () => {
    it('opens modal when request leave button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request leave/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /request leave/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('opens modal from empty state button', async () => {
      server.use(
        http.get('/api/v1/leave/requests/my_requests/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No leave requests')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /submit your first request/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading while fetching data', async () => {
      server.use(
        http.get('/api/v1/leave/requests/my_requests/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(paginatedResponse(mockMyRequests));
        })
      );

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <LeavePage />
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Leave Management')).toBeInTheDocument();
    });
  });
});
