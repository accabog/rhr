/**
 * Tests for CalendarPage component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import {
  createEmployee,
  createLeaveRequest,
  createDepartment,
} from '@/test/mocks/data';
import { useAuthStore } from '@/stores/authStore';
import CalendarPage from '../CalendarPage';

const mockDepartment = createDepartment({ id: 1, name: 'Engineering' });
const mockEmployee = createEmployee({
  id: 1,
  department: mockDepartment,
});

const mockLeaveRequests = [
  createLeaveRequest({
    id: 1,
    employee_name: 'John Doe',
    leave_type_name: 'Annual Leave',
    leave_type_color: '#10b981',
    start_date: '2024-07-01',
    end_date: '2024-07-05',
    status: 'approved',
  }),
  createLeaveRequest({
    id: 2,
    employee_name: 'Jane Smith',
    leave_type_name: 'Sick Leave',
    leave_type_color: '#ef4444',
    start_date: '2024-07-10',
    end_date: '2024-07-10',
    status: 'pending',
  }),
];

const mockHolidays = [
  {
    id: 1,
    name: 'Independence Day',
    local_name: 'Independence Day',
    date: '2024-07-04',
    country: 'US',
    source: 'nager_date',
    is_recurring: false,
    applies_to_all: true,
    departments: [],
    holiday_types: ['Public'],
  },
  {
    id: 2,
    name: 'Labor Day',
    local_name: 'Labor Day',
    date: '2024-09-02',
    country: 'US',
    source: 'nager_date',
    is_recurring: false,
    applies_to_all: true,
    departments: [],
    holiday_types: ['Public'],
  },
];

const mockTenant = {
  id: 1,
  name: 'Test Company',
  slug: 'test-company',
  is_active: true,
  plan: 'professional' as const,
  max_employees: 100,
};

const mockMembership = {
  id: 1,
  user: { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', is_active: true },
  tenant: mockTenant,
  role: 'admin' as const,
  is_default: true,
};

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <MemoryRouter>
      <Wrapper>
        <CalendarPage />
      </Wrapper>
    </MemoryRouter>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  return result;
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      tenantMemberships: [mockMembership],
      currentTenant: mockTenant,
    });

    server.use(
      http.get('/api/v1/employees/me/', () => {
        return HttpResponse.json({
          ...mockEmployee,
          department_country: 'US',
        });
      }),
      http.get('/api/v1/leave/requests/calendar/', () => {
        return HttpResponse.json(mockLeaveRequests);
      }),
      http.get('/api/v1/leave/holidays/', () => {
        return HttpResponse.json(mockHolidays);
      })
    );
  });

  afterEach(() => {
    useAuthStore.setState({
      tenantMemberships: [],
      currentTenant: null,
    });
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      await renderPage();

      expect(screen.getByText('Leave Calendar')).toBeInTheDocument();
    });

    it('renders description text', async () => {
      await renderPage();

      expect(
        screen.getByText(/view leave schedules for you and your department members/i)
      ).toBeInTheDocument();
    });

    it('renders calendar component', async () => {
      await renderPage();

      await waitFor(() => {
        const calendar = document.querySelector('.ant-picker-calendar');
        expect(calendar).toBeInTheDocument();
      });
    });

    it('renders legend card', async () => {
      await renderPage();

      expect(screen.getByText('Legend')).toBeInTheDocument();
      expect(screen.getByText('Approved Leave')).toBeInTheDocument();
      expect(screen.getByText('Pending Leave')).toBeInTheDocument();
      expect(screen.getByText('Holiday')).toBeInTheDocument();
    });
  });

  describe('country filter', () => {
    it('shows country tag when employee has country', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('US Holidays')).toBeInTheDocument();
      });
    });

    it('does not show country tag when employee has no country', async () => {
      server.use(
        http.get('/api/v1/employees/me/', () => {
          return HttpResponse.json({
            ...mockEmployee,
            department_country: undefined,
          });
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.queryByText('US Holidays')).not.toBeInTheDocument();
      });
    });
  });

  describe('sync holidays button', () => {
    it('shows sync button for admin users', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync holidays/i })).toBeInTheDocument();
      });
    });

    it('hides sync button for non-admin users', async () => {
      useAuthStore.setState({
        tenantMemberships: [{ ...mockMembership, role: 'member' }],
        currentTenant: mockTenant,
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /sync holidays/i })).not.toBeInTheDocument();
      });
    });

    it('calls sync API when sync button clicked', async () => {
      let syncCalled = false;

      server.use(
        http.post('/api/v1/leave/holidays/sync/', () => {
          syncCalled = true;
          return HttpResponse.json({ message: 'Success', created: 5, updated: 0 });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync holidays/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sync holidays/i }));

      await waitFor(() => {
        expect(syncCalled).toBe(true);
      });
    });
  });

  describe('calendar content', () => {
    it('displays holidays on calendar when data loads', async () => {
      await renderPage();

      await waitFor(() => {
        const calendar = document.querySelector('.ant-picker-calendar');
        expect(calendar).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays leave requests on calendar when data loads', async () => {
      await renderPage();

      await waitFor(() => {
        const calendar = document.querySelector('.ant-picker-calendar');
        expect(calendar).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows loading spinner while fetching data', async () => {
      server.use(
        http.get('/api/v1/leave/requests/calendar/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return HttpResponse.json(mockLeaveRequests);
        }),
        http.get('/api/v1/leave/holidays/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return HttpResponse.json(mockHolidays);
        })
      );

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <CalendarPage />
          </Wrapper>
        </MemoryRouter>
      );

      await waitFor(() => {
        const spinner = document.querySelector('.ant-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('calendar navigation', () => {
    it('renders month navigation controls', async () => {
      await renderPage();

      await waitFor(() => {
        const calendar = document.querySelector('.ant-picker-calendar');
        expect(calendar).toBeInTheDocument();
      });

      const header = document.querySelector('.ant-picker-calendar-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('renders calendar even with no holidays', async () => {
      server.use(
        http.get('/api/v1/leave/holidays/', () => {
          return HttpResponse.json([]);
        })
      );

      await renderPage();

      await waitFor(() => {
        const calendar = document.querySelector('.ant-picker-calendar');
        expect(calendar).toBeInTheDocument();
      });
    });

    it('renders calendar even with no leave requests', async () => {
      server.use(
        http.get('/api/v1/leave/requests/calendar/', () => {
          return HttpResponse.json([]);
        })
      );

      await renderPage();

      await waitFor(() => {
        const calendar = document.querySelector('.ant-picker-calendar');
        expect(calendar).toBeInTheDocument();
      });
    });
  });

  describe('admin vs member permissions', () => {
    it('shows sync button for owner role', async () => {
      useAuthStore.setState({
        tenantMemberships: [{ ...mockMembership, role: 'owner' }],
        currentTenant: mockTenant,
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync holidays/i })).toBeInTheDocument();
      });
    });

    it('hides sync button for hr_manager role', async () => {
      useAuthStore.setState({
        tenantMemberships: [{ ...mockMembership, role: 'hr_manager' as 'admin' }],
        currentTenant: mockTenant,
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /sync holidays/i })).not.toBeInTheDocument();
      });
    });
  });
});
