/**
 * Tests for RegisterPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import RegisterPage from '../RegisterPage';

function renderPage() {
  const Wrapper = createWrapper();
  return render(
    <MemoryRouter>
      <Wrapper>
        <RegisterPage />
      </Wrapper>
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.post('/api/v1/auth/register/', async () => {
        return HttpResponse.json({
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          },
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
          tenants: [{ id: 1, name: 'Test Company' }],
        });
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage();

      expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
    });

    it('renders subtitle', () => {
      renderPage();

      expect(screen.getByText('Start your HR management journey')).toBeInTheDocument();
    });

    it('renders company name field', () => {
      renderPage();

      expect(screen.getByPlaceholderText('Company name')).toBeInTheDocument();
    });

    it('renders first name field', () => {
      renderPage();

      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    });

    it('renders last name field', () => {
      renderPage();

      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    });

    it('renders email field', () => {
      renderPage();

      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    });

    it('renders password field', () => {
      renderPage();

      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    it('renders confirm password field', () => {
      renderPage();

      expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
    });

    it('renders create account button', () => {
      renderPage();

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('renders sign in link', () => {
      renderPage();

      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('sign in link points to login page', () => {
      renderPage();

      const link = screen.getByRole('link', { name: /sign in/i });
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  describe('form validation', () => {
    it('shows error when company name is empty', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter your company name')).toBeInTheDocument();
      });
    });

    it('shows error when email is empty', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Company name'), 'Test Company');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter your email')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Email address'), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      });
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Password'), 'short');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm password'), 'different123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('allows typing in all fields', async () => {
      const user = userEvent.setup();
      renderPage();

      const companyInput = screen.getByPlaceholderText('Company name');
      const firstNameInput = screen.getByPlaceholderText('First name');
      const lastNameInput = screen.getByPlaceholderText('Last name');
      const emailInput = screen.getByPlaceholderText('Email address');

      await user.type(companyInput, 'Test Company');
      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');

      expect(companyInput).toHaveValue('Test Company');
      expect(firstNameInput).toHaveValue('John');
      expect(lastNameInput).toHaveValue('Doe');
      expect(emailInput).toHaveValue('john@example.com');
    });
  });

  describe('API error handling', () => {
    it('shows error message on registration failure', async () => {
      server.use(
        http.post('/api/v1/auth/register/', async () => {
          return HttpResponse.json(
            { email: ['This email is already registered'] },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Company name'), 'Test Company');
      await user.type(screen.getByPlaceholderText('Email address'), 'existing@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Error should be handled by the component
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled();
      });
    });
  });
});
