/**
 * Tests for LoginPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import { useAuthStore } from '@/stores/authStore';
import { createAuthResponse } from '@/test/mocks/data';
import LoginPage from '../LoginPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginPage() {
  const Wrapper = createWrapper();
  return render(
    <MemoryRouter>
      <Wrapper>
        <LoginPage />
      </Wrapper>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  describe('rendering', () => {
    it('renders login form', () => {
      renderLoginPage();

      expect(screen.getByText('Raptor HR')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders link to registration', () => {
      renderLoginPage();

      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create one/i })).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows error for empty email', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter your email')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'notanemail');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      });
    });

    it('shows error for empty password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter your password')).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls login API with credentials', async () => {
      let capturedBody: { email: string; password: string } | undefined;

      server.use(
        http.post('/api/v1/auth/login/', async ({ request }) => {
          capturedBody = await request.json() as { email: string; password: string };
          return HttpResponse.json(createAuthResponse());
        })
      );

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(capturedBody?.email).toBe('test@example.com');
        expect(capturedBody?.password).toBe('password123');
      });
    });

    it('navigates to home on successful login', async () => {
      server.use(
        http.post('/api/v1/auth/login/', () => {
          return HttpResponse.json(createAuthResponse());
        })
      );

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('sets auth state on successful login', async () => {
      const mockResponse = createAuthResponse();

      server.use(
        http.post('/api/v1/auth/login/', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const authState = useAuthStore.getState();
        expect(authState.accessToken).toBe(mockResponse.access);
        expect(authState.refreshToken).toBe(mockResponse.refresh);
      });
    });

    it('shows loading state while submitting', async () => {
      server.use(
        http.post('/api/v1/auth/login/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(createAuthResponse());
        })
      );

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Inputs should be disabled while loading
      expect(screen.getByPlaceholderText('Email address')).toBeDisabled();
      expect(screen.getByPlaceholderText('Password')).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('shows error message on login failure', async () => {
      server.use(
        http.post('/api/v1/auth/login/', () => {
          return HttpResponse.json(
            { detail: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        // Ant Design message component
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });
  });
});
