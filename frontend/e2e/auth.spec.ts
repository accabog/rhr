/**
 * E2E tests for authentication flows.
 */

import { test, expect } from '@playwright/test';
import { testUser, login } from './helpers/auth';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('shows login form', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByText('Raptor HR')).toBeVisible();
      await expect(page.getByText('Sign in to your account')).toBeVisible();
      await expect(page.getByPlaceholder('Email address')).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('shows validation error for empty fields', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText('Please enter your email')).toBeVisible();
    });

    test('shows validation error for invalid email', async ({ page }) => {
      await page.goto('/login');

      await page.getByPlaceholder('Email address').fill('not-an-email');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText('Please enter a valid email')).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByPlaceholder('Email address').fill('wrong@example.com');
      await page.getByPlaceholder('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message - backend returns "No active account found with the given credentials"
      // or fallback "Login failed"
      await expect(page.getByText(/no active account|login failed|credentials/i)).toBeVisible();
    });

    test('redirects to home after successful login', async ({ page }) => {
      // Skip if test user doesn't exist in the system
      test.skip(true, 'Requires test user to be seeded in database');

      await login(page, testUser);
      await expect(page).toHaveURL('/');
    });

    test('has link to registration', async ({ page }) => {
      await page.goto('/login');

      const createLink = page.getByRole('link', { name: /create one/i });
      await expect(createLink).toBeVisible();
      await createLink.click();

      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Registration', () => {
    test('shows registration form', async ({ page }) => {
      await page.goto('/register');

      await expect(page.getByPlaceholder('First name')).toBeVisible();
      await expect(page.getByPlaceholder('Last name')).toBeVisible();
      await expect(page.getByPlaceholder('Email address')).toBeVisible();
      // Use exact match for password field (not confirm password)
      await expect(page.getByPlaceholder('Password', { exact: true })).toBeVisible();
      await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('validates required fields', async ({ page }) => {
      await page.goto('/register');

      await page.getByRole('button', { name: /create account/i }).click();

      // Check for validation message - first required field is company name
      await expect(page.getByText(/company name|email|password/i)).toBeVisible();
    });

    test('validates email format', async ({ page }) => {
      await page.goto('/register');

      await page.getByPlaceholder('First name').fill('Test');
      await page.getByPlaceholder('Last name').fill('User');
      await page.getByPlaceholder('Email address').fill('not-an-email');
      await page.getByPlaceholder('Password', { exact: true }).fill('Password123!');
      await page.getByPlaceholder('Confirm password').fill('Password123!');

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('has link to login', async ({ page }) => {
      await page.goto('/register');

      const signInLink = page.getByRole('link', { name: /sign in/i });
      await expect(signInLink).toBeVisible();
      await signInLink.click();

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Logout', () => {
    test.skip('logs out successfully', async ({ page }) => {
      // Skip if test user doesn't exist
      test.skip(true, 'Requires authenticated user');

      await login(page, testUser);
      await expect(page).toHaveURL('/');

      // Click user menu and logout
      await page.getByTestId('user-menu').click();
      await page.getByRole('menuitem', { name: /logout/i }).click();

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login for employee pages', async ({ page }) => {
      await page.goto('/employees');

      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login for timesheet pages', async ({ page }) => {
      await page.goto('/timesheets');

      await expect(page).toHaveURL(/\/login/);
    });
  });
});
