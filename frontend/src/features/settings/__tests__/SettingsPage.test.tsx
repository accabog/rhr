/**
 * Tests for SettingsPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import { useAuthStore } from '@/stores/authStore';
import SettingsPage from '../SettingsPage';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  is_staff: false,
  employee_id: 1,
};

function renderPage() {
  // Set up auth store with mock user
  useAuthStore.setState({ user: mockUser, isAuthenticated: true });

  const Wrapper = createWrapper();
  return render(
    <MemoryRouter>
      <Wrapper>
        <SettingsPage />
      </Wrapper>
    </MemoryRouter>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.post('/api/v1/auth/change-password/', async () => {
        return HttpResponse.json({ detail: 'Password changed successfully' });
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage();

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders account tab', () => {
      renderPage();

      expect(screen.getByText('Account')).toBeInTheDocument();
    });

    it('renders security tab', () => {
      renderPage();

      expect(screen.getByText('Security')).toBeInTheDocument();
    });
  });

  describe('AccountTab', () => {
    it('shows account information title', () => {
      renderPage();

      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    it('displays user name', () => {
      renderPage();

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('displays user email', () => {
      renderPage();

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('displays account status', () => {
      renderPage();

      expect(screen.getByText('Account Status')).toBeInTheDocument();
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    });

    it('shows edit profile button', () => {
      renderPage();

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('edit profile button links to profile page', () => {
      renderPage();

      const link = screen.getByRole('link', { name: /edit profile/i });
      expect(link).toHaveAttribute('href', '/profile');
    });
  });

  describe('SecurityTab', () => {
    it('switches to security tab', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        const activeTab = document.querySelector('.ant-tabs-tab-active');
        expect(activeTab?.textContent).toContain('Security');
      });
    });

    it('shows change password title', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument();
      });
    });

    it('shows password guidance text', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByText(/Choose a strong password/)).toBeInTheDocument();
      });
    });

    it('shows current password field', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByText('Current Password')).toBeInTheDocument();
      });
    });

    it('shows new password field', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByText('New Password')).toBeInTheDocument();
      });
    });

    it('shows confirm password field', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
      });
    });

    it('shows update password button', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
      });
    });
  });

  describe('inactive user state', () => {
    it('shows inactive status for inactive user', () => {
      useAuthStore.setState({
        user: { ...mockUser, is_active: false },
        isAuthenticated: true,
      });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <SettingsPage />
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('no user state', () => {
    it('shows not set for missing name', () => {
      useAuthStore.setState({
        user: { ...mockUser, full_name: '' },
        isAuthenticated: true,
      });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <SettingsPage />
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Not set')).toBeInTheDocument();
    });
  });
});
