/**
 * Tests for ProfilePage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import { useAuthStore } from '@/stores/authStore';
import { createEmployee } from '@/test/mocks/data';
import ProfilePage from '../ProfilePage';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  is_staff: false,
  employee_id: 1,
  avatar: null,
  created_at: '2023-01-15T00:00:00Z',
};

const mockEmployee = {
  ...createEmployee({
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    timezone: 'America/New_York',
  }),
  full_name: 'Test User',
  department_country: 'US',
};

function renderPage() {
  useAuthStore.setState({ user: mockUser, isAuthenticated: true });

  const Wrapper = createWrapper();
  return render(
    <MemoryRouter>
      <Wrapper>
        <ProfilePage />
      </Wrapper>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/employees/me/', () => {
        return HttpResponse.json(mockEmployee);
      }),
      http.patch('/api/v1/users/me/', async () => {
        return HttpResponse.json(mockUser);
      }),
      http.patch('/api/v1/employees/me/', async () => {
        return HttpResponse.json(mockEmployee);
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage();

      expect(screen.getByText('My Profile')).toBeInTheDocument();
    });

    it('displays user name', () => {
      renderPage();

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('displays user email', () => {
      renderPage();

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('shows avatar placeholder', () => {
      renderPage();

      const avatar = document.querySelector('.ant-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('shows photo change hint', () => {
      renderPage();

      expect(screen.getByText('Click the photo to change')).toBeInTheDocument();
    });
  });

  describe('profile form', () => {
    it('shows first name field', () => {
      renderPage();

      expect(screen.getByText('First Name')).toBeInTheDocument();
    });

    it('shows last name field', () => {
      renderPage();

      expect(screen.getByText('Last Name')).toBeInTheDocument();
    });

    it('populates form with user data', () => {
      renderPage();

      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    });

    it('shows email field as disabled', () => {
      renderPage();

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Email cannot be changed')).toBeInTheDocument();
    });

    it('shows member since date', () => {
      renderPage();

      expect(screen.getByText('Member Since')).toBeInTheDocument();
      expect(screen.getByText('January 15, 2023')).toBeInTheDocument();
    });

    it('shows save changes button', () => {
      renderPage();

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });

  describe('work location section', () => {
    it('shows work location title', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Work Location')).toBeInTheDocument();
      });
    });

    it('shows country field', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Country')).toBeInTheDocument();
      });
    });

    it('displays country from department', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('United States')).toBeInTheDocument();
      });
    });

    it('shows timezone field', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Timezone')).toBeInTheDocument();
      });
    });

    it('shows save location button', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save location/i })).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls update API when save changes clicked', async () => {
      let updateCalled = false;

      server.use(
        http.patch('/api/v1/users/me/', async () => {
          updateCalled = true;
          return HttpResponse.json(mockUser);
        })
      );

      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(updateCalled).toBe(true);
      });
    });

    it('allows editing first name', async () => {
      const user = userEvent.setup();
      renderPage();

      const firstNameInput = screen.getByDisplayValue('Test');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'NewTest');

      expect(firstNameInput).toHaveValue('NewTest');
    });

    it('allows editing last name', async () => {
      const user = userEvent.setup();
      renderPage();

      const lastNameInput = screen.getByDisplayValue('User');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'NewUser');

      expect(lastNameInput).toHaveValue('NewUser');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when no user', () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <ProfilePage />
          </Wrapper>
        </MemoryRouter>
      );

      const spinner = document.querySelector('.ant-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading for work location', async () => {
      server.use(
        http.get('/api/v1/employees/me/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(mockEmployee);
        })
      );

      renderPage();

      expect(screen.getByText('Loading work location...')).toBeInTheDocument();
    });
  });

  describe('user with avatar', () => {
    it('displays avatar when user has one', () => {
      useAuthStore.setState({
        user: { ...mockUser, avatar: 'https://example.com/avatar.jpg' },
        isAuthenticated: true,
      });

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <ProfilePage />
          </Wrapper>
        </MemoryRouter>
      );

      const avatar = document.querySelector('.ant-avatar img');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('no department country', () => {
    it('shows not set message when no country', async () => {
      server.use(
        http.get('/api/v1/employees/me/', () => {
          return HttpResponse.json({ ...mockEmployee, department_country: null });
        })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Not set (assign via department)')).toBeInTheDocument();
      });
    });
  });
});
