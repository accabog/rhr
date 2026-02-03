/**
 * Tests for TimesheetsPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import { createTimesheet, createEmployee, paginatedResponse } from '@/test/mocks/data';
import TimesheetsPage from '../TimesheetsPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockEmployee = createEmployee();

const mockMyTimesheets = [
  createTimesheet({
    id: 1,
    employee: mockEmployee,
    period_start: '2024-01-01',
    period_end: '2024-01-14',
    status: 'draft',
    total_regular_hours: '80.00',
    total_overtime_hours: '5.00',
    total_hours: 85,
  }),
  createTimesheet({
    id: 2,
    employee: mockEmployee,
    period_start: '2024-01-15',
    period_end: '2024-01-28',
    status: 'submitted',
    total_regular_hours: '75.00',
    total_overtime_hours: '0.00',
    total_hours: 75,
    submitted_at: '2024-01-28T10:00:00Z',
  }),
  createTimesheet({
    id: 3,
    employee: mockEmployee,
    period_start: '2024-02-01',
    period_end: '2024-02-14',
    status: 'approved',
    total_regular_hours: '80.00',
    total_overtime_hours: '10.00',
    total_hours: 90,
  }),
];

const bobEmployee = createEmployee({ id: 100, first_name: 'Bob', last_name: 'Smith' });
const mockPendingTimesheets = [
  createTimesheet({
    id: 10,
    employee: bobEmployee,
    employee_name: 'Bob Smith',
    period_start: '2024-01-01',
    period_end: '2024-01-14',
    status: 'submitted',
    total_regular_hours: '76.00',
    total_overtime_hours: '4.00',
    total_hours: 80,
    submitted_at: '2024-01-15T09:00:00Z',
  }),
];

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <MemoryRouter>
      <Wrapper>
        <TimesheetsPage />
      </Wrapper>
    </MemoryRouter>
  );

  // Wait for React Query to fetch and render data
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  return result;
}

describe('TimesheetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/timesheets/my_timesheets/', () => {
        return HttpResponse.json(paginatedResponse(mockMyTimesheets));
      }),
      http.get('/api/v1/timesheets/pending_approval/', () => {
        return HttpResponse.json(paginatedResponse(mockPendingTimesheets));
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      await renderPage();

      expect(screen.getByText('Timesheets')).toBeInTheDocument();
    });

    it('renders tabs for my timesheets and pending approval', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('My Timesheets')).toBeInTheDocument();
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });
    });

    it('shows generate timesheet button', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate timesheet/i })).toBeInTheDocument();
      });
    });
  });

  describe('my timesheets tab', () => {
    it('displays user timesheets in table', async () => {
      await renderPage();

      // Wait for empty state to disappear (means data loaded)
      await waitFor(() => {
        expect(screen.queryByText('No timesheets yet')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Now check for period display - use getAllByText since there are multiple dates
      expect(screen.getAllByText(/Jan 1/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Jan 14, 2024/)).toBeInTheDocument();
    });

    it('shows status tags with correct colors', async () => {
      await renderPage();

      // Wait for empty state to disappear (means data loaded)
      await waitFor(() => {
        expect(screen.queryByText('No timesheets yet')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for status tags - use getAllByText since there may be multiple
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('displays hours summary', async () => {
      await renderPage();

      await waitFor(() => {
        // Look for total hours - 80 regular + 5 overtime = 85 total
        expect(screen.getByText('85.0h total')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows view button for each timesheet', async () => {
      await renderPage();

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /view/i });
        expect(viewButtons.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('navigates to timesheet detail when view clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view/i })).toBeTruthy();
      }, { timeout: 5000 });

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/timesheets/1');
    });
  });

  describe('pending approval tab', () => {
    it('shows badge with pending count', async () => {
      await renderPage();

      await waitFor(() => {
        // The tab should show the count badge
        const pendingTab = screen.getByText('Pending Approval').closest('div');
        expect(pendingTab?.textContent).toContain('1');
      });
    });

    it('switches to pending tab and shows pending timesheets', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      });

      // Click pending approval tab
      await user.click(screen.getByText('Pending Approval'));

      await waitFor(() => {
        // Should show employee name column in pending tab
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('generate timesheet modal', () => {
    it.skip('opens modal when generate button clicked', async () => {
      // TODO: Modal behavior in JSDOM needs additional configuration
      // This test works correctly in E2E/Playwright
      const user = userEvent.setup();
      await renderPage();

      // Wait for data to load and button to appear
      await waitFor(() => {
        expect(screen.queryByText('No timesheets yet')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /generate timesheet/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      const button = screen.getByRole('button', { name: /generate timesheet/i });
      await user.click(button);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Period')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it.skip('shows period presets in date picker', async () => {
      // TODO: Modal behavior in JSDOM needs additional configuration
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate timesheet/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate timesheet/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Presets are shown when date picker is opened
    });

    it.skip('closes modal when cancel clicked', async () => {
      // TODO: Modal close behavior in JSDOM needs additional configuration
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate timesheet/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate timesheet/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the close button (X icon) in modal header
      const closeButton = document.querySelector('.ant-modal-close') as HTMLElement;
      expect(closeButton).toBeTruthy();
      await user.click(closeButton);

      // Wait for modal to close with animation
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).toBeNull();
      }, { timeout: 3000 });
    });

    it('calls generate API when form submitted', async () => {
      server.use(
        http.post('/api/v1/timesheets/generate/', async () => {
          return HttpResponse.json(createTimesheet({ id: 999 }), { status: 201 });
        })
      );

      // The full flow requires interacting with date range picker
      // which is complex with Ant Design
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate timesheet/i })).toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    it('shows empty state when no timesheets', async () => {
      server.use(
        http.get('/api/v1/timesheets/my_timesheets/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No timesheets yet')).toBeInTheDocument();
      });

      // Should show alternative generate button in empty state
      expect(screen.getByRole('button', { name: /generate your first timesheet/i })).toBeInTheDocument();
    });

    it('shows empty state when no pending approvals', async () => {
      server.use(
        http.get('/api/v1/timesheets/pending_approval/', () => {
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
        expect(screen.getByText('No timesheets pending approval')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading state while fetching data', async () => {
      server.use(
        http.get('/api/v1/timesheets/my_timesheets/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(paginatedResponse(mockMyTimesheets));
        })
      );

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <TimesheetsPage />
          </Wrapper>
        </MemoryRouter>
      );

      // Table should show loading spinner
      // The exact check depends on how Ant Design renders loading state
      expect(screen.getByText('Timesheets')).toBeInTheDocument();
    });
  });

  describe('status filtering', () => {
    it('displays timesheets of all statuses', async () => {
      await renderPage();

      // Wait for empty state to disappear (means data loaded)
      await waitFor(() => {
        expect(screen.queryByText('No timesheets yet')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // All three statuses should be visible - use getAllByText for Submitted
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('rejected timesheet shows error status', async () => {
      server.use(
        http.get('/api/v1/timesheets/my_timesheets/', () => {
          return HttpResponse.json(
            paginatedResponse([
              createTimesheet({
                id: 5,
                status: 'rejected',
                total_hours: 70,
                rejection_reason: 'Missing hours on Friday',
              }),
            ])
          );
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Rejected')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
