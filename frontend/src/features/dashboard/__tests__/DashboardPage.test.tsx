/**
 * Tests for DashboardPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import DashboardPage from '../DashboardPage';

// Mock auth store - must provide both hook interface and getState() for API client
const mockAuthState = {
  user: { first_name: 'John', email: 'john@example.com' },
  currentTenant: { id: 1, name: 'Test Company' },
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  isAuthenticated: true,
  setTokens: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    () => mockAuthState,
    { getState: () => mockAuthState }
  ),
}));

const mockStats = {
  total_employees: 50,
  active_employees: 45,
  on_leave_employees: 3,
  pending_leave_requests: 5,
  departments_count: 4,
  positions_count: 12,
  recent_hires: 8,
  expiring_contracts: 2,
};

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <Wrapper>
      <DashboardPage />
    </Wrapper>
  );

  // Wait for React Query to fetch and render data
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  return result;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/dashboard/stats/', () => {
        return HttpResponse.json(mockStats);
      })
    );
  });

  describe('rendering', () => {
    it('shows loading spinner initially', () => {
      // Override with a never-resolving handler for this test
      server.use(
        http.get('/api/v1/dashboard/stats/', () => {
          return new Promise(() => {}); // Never resolves
        })
      );

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <DashboardPage />
        </Wrapper>
      );

      // Should show loading state
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });

    it('renders welcome message with user name', async () => {
      await renderPage();

      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    });

    it('shows tenant name in subtitle', async () => {
      await renderPage();

      expect(screen.getByText(/Test Company/i)).toBeInTheDocument();
    });
  });

  describe('statistics display', () => {
    it('displays employee statistics', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Total Employees')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('displays department count', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Departments')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
      });
    });

    it('displays pending leave requests', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Pending Leave Requests')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('displays on leave count', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('On Leave Today')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('displays recent hires', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('New Hires')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows empty state when no data available', async () => {
      server.use(
        http.get('/api/v1/dashboard/stats/', () => {
          return HttpResponse.json(null, { status: 404 });
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/No data available/i)).toBeInTheDocument();
      });
    });

    it('shows empty state on network error', async () => {
      server.use(
        http.get('/api/v1/dashboard/stats/', () => {
          return HttpResponse.error();
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/No data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('quick actions', () => {
    it('displays quick action links', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Add new employee')).toBeInTheDocument();
        expect(screen.getByText('Review leave requests')).toBeInTheDocument();
        expect(screen.getByText('View timesheets')).toBeInTheDocument();
      });
    });
  });
});
