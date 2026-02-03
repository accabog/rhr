/**
 * Authentication helpers for E2E tests.
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const testUser: TestUser = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'Tester',
};

/**
 * Log in a user via the login page.
 */
export async function login(page: Page, user: TestUser = testUser) {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  // Wait for navigation to home page
  await expect(page).toHaveURL('/');
}

/**
 * Log out the current user.
 */
export async function logout(page: Page) {
  // Click user dropdown and logout
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: /logout/i }).click();

  // Wait for redirect to login
  await expect(page).toHaveURL('/login');
}

/**
 * Register a new user.
 */
export async function register(page: Page, user: TestUser = testUser) {
  await page.goto('/register');

  await page.getByPlaceholder('First name').fill(user.firstName || 'Test');
  await page.getByPlaceholder('Last name').fill(user.lastName || 'User');
  await page.getByPlaceholder('Email address').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByPlaceholder('Confirm password').fill(user.password);

  await page.getByRole('button', { name: /create account/i }).click();

  // Wait for successful registration
  await expect(page).toHaveURL('/');
}

/**
 * Check if user is logged in.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/');
    // If we can see the dashboard, we're logged in
    const url = page.url();
    return !url.includes('/login');
  } catch {
    return false;
  }
}

/**
 * Save authentication state for reuse in tests.
 */
export async function saveAuthState(page: Page, path: string) {
  await page.context().storageState({ path });
}

/**
 * Create a unique test user email.
 */
export function uniqueTestUser(): TestUser {
  const timestamp = Date.now();
  return {
    email: `e2e-test-${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'E2E',
    lastName: `Test${timestamp}`,
  };
}
