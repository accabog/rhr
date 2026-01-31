/**
 * Tests for AppLayout component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import { useAuthStore } from '@/stores/authStore';
import AppLayout from '../AppLayout';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  avatar: null,
};

const mockTenant = {
  id: 1,
  name: 'Test Company',
  subdomain: 'test',
};

function renderLayout(initialPath = '/') {
  useAuthStore.setState({
    user: mockUser,
    currentTenant: mockTenant,
    isAuthenticated: true,
    refreshToken: 'mock-refresh-token',
  });

  const Wrapper = createWrapper();
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Wrapper>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Dashboard Content</div>} />
            <Route path="/employees" element={<div>Employees Content</div>} />
            <Route path="/profile" element={<div>Profile Content</div>} />
            <Route path="/settings" element={<div>Settings Content</div>} />
          </Route>
        </Routes>
      </Wrapper>
    </MemoryRouter>
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.post('/api/v1/auth/logout/', async () => {
        return HttpResponse.json({ detail: 'Logged out' });
      })
    );
  });

  describe('rendering', () => {
    it('renders logo text', () => {
      renderLayout();

      expect(screen.getByText('Raptor HR')).toBeInTheDocument();
    });

    it('renders tenant name in header', () => {
      renderLayout();

      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    it('renders user name in header', () => {
      renderLayout();

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders outlet content', () => {
      renderLayout();

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  describe('navigation menu', () => {
    it('renders dashboard menu item', () => {
      renderLayout();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders employees menu item', () => {
      renderLayout();

      expect(screen.getByText('Employees')).toBeInTheDocument();
    });

    it('renders organization menu item', () => {
      renderLayout();

      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    it('renders time tracking menu item', () => {
      renderLayout();

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
    });

    it('renders timesheets menu item', () => {
      renderLayout();

      expect(screen.getByText('Timesheets')).toBeInTheDocument();
    });

    it('renders leave menu item', () => {
      renderLayout();

      expect(screen.getByText('Leave')).toBeInTheDocument();
    });

    it('renders calendar menu item', () => {
      renderLayout();

      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('renders contracts menu item', () => {
      renderLayout();

      expect(screen.getByText('Contracts')).toBeInTheDocument();
    });

    it('menu item is clickable', async () => {
      const user = userEvent.setup();
      renderLayout();

      const employeesItem = screen.getByText('Employees');
      expect(employeesItem).toBeInTheDocument();

      // Just verify it's clickable, navigation is handled by router
      await user.click(employeesItem);
    });
  });

  describe('sidebar collapse', () => {
    it('shows collapse button', () => {
      renderLayout();

      // Look for the menu fold/unfold icon
      const collapseButton = document.querySelector('.anticon-menu-fold');
      expect(collapseButton).toBeInTheDocument();
    });

    it('toggles sidebar on collapse click', async () => {
      const user = userEvent.setup();
      renderLayout();

      const collapseButton = document.querySelector('.anticon-menu-fold');
      if (collapseButton) {
        await user.click(collapseButton);
      }

      // After collapse, should show unfold icon
      await waitFor(() => {
        const unfoldButton = document.querySelector('.anticon-menu-unfold');
        expect(unfoldButton).toBeInTheDocument();
      });
    });

    it('shows abbreviated logo when collapsed', async () => {
      const user = userEvent.setup();
      renderLayout();

      const collapseButton = document.querySelector('.anticon-menu-fold');
      if (collapseButton) {
        await user.click(collapseButton);
      }

      await waitFor(() => {
        expect(screen.getByText('RHR')).toBeInTheDocument();
      });
    });
  });

  describe('user dropdown', () => {
    it('shows user avatar', () => {
      renderLayout();

      const avatar = document.querySelector('.ant-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('opens dropdown on avatar click', async () => {
      const user = userEvent.setup();
      renderLayout();

      const userSpace = screen.getByText('Test User').closest('[style*="cursor: pointer"]');
      if (userSpace) {
        await user.click(userSpace);
      }

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('shows profile option in dropdown', async () => {
      const user = userEvent.setup();
      renderLayout();

      const userSpace = screen.getByText('Test User').closest('[style*="cursor: pointer"]');
      if (userSpace) {
        await user.click(userSpace);
      }

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    it('shows settings option in dropdown', async () => {
      const user = userEvent.setup();
      renderLayout();

      const userSpace = screen.getByText('Test User').closest('[style*="cursor: pointer"]');
      if (userSpace) {
        await user.click(userSpace);
      }

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });
  });

  describe('logout', () => {
    it('shows logout option in dropdown', async () => {
      const user = userEvent.setup();
      renderLayout();

      const userSpace = screen.getByText('Test User').closest('[style*="cursor: pointer"]');
      if (userSpace) {
        await user.click(userSpace);
      }

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });
  });

  describe('no tenant', () => {
    it('does not show tenant name when no tenant', () => {
      useAuthStore.setState({
        user: mockUser,
        currentTenant: null,
        isAuthenticated: true,
      });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<div>Content</div>} />
              </Route>
            </Routes>
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.queryByText('Test Company')).not.toBeInTheDocument();
    });
  });

  describe('user with avatar', () => {
    it('shows user avatar image when available', () => {
      useAuthStore.setState({
        user: { ...mockUser, avatar: 'https://example.com/avatar.jpg' },
        currentTenant: mockTenant,
        isAuthenticated: true,
      });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<div>Content</div>} />
              </Route>
            </Routes>
          </Wrapper>
        </MemoryRouter>
      );

      const avatarImg = document.querySelector('.ant-avatar img');
      expect(avatarImg).toBeInTheDocument();
    });
  });

  describe('user without full name', () => {
    it('shows email when no full name', () => {
      useAuthStore.setState({
        user: { ...mockUser, full_name: '' },
        currentTenant: mockTenant,
        isAuthenticated: true,
      });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<div>Content</div>} />
              </Route>
            </Routes>
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
