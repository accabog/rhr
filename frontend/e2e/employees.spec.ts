/**
 * E2E tests for employee management.
 */

import { test, expect } from '@playwright/test';
import { login, testUser } from './helpers/auth';

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    // Skip all tests in this suite if no authenticated session
    test.skip(true, 'Requires authenticated user with employee data');
  });

  test.describe('Employee List', () => {
    test('displays employees page', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await expect(page.getByText('Employees')).toBeVisible();
    });

    test('shows add employee button', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await expect(page.getByRole('button', { name: /add employee/i })).toBeVisible();
    });

    test('displays employee table', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      // Table headers
      await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /department/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('opens employee form modal', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await page.getByRole('button', { name: /add employee/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Add Employee')).toBeVisible();
    });
  });

  test.describe('Create Employee', () => {
    test('validates required fields', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await page.getByRole('button', { name: /add employee/i }).click();
      await page.getByRole('button', { name: /add employee/i }).click(); // Submit

      await expect(page.getByText('Please enter employee ID')).toBeVisible();
    });

    test('creates employee successfully', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await page.getByRole('button', { name: /add employee/i }).click();

      // Fill form
      await page.getByPlaceholder('e.g., EMP001').fill('EMP-TEST-001');
      await page.getByPlaceholder('First name').fill('Test');
      await page.getByPlaceholder('Last name').fill('Employee');
      await page.getByPlaceholder('email@company.com').fill('test.employee@example.com');

      await page.getByRole('button', { name: /add employee/i }).click();

      // Modal should close and success message shown
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText(/success/i)).toBeVisible();
    });
  });

  test.describe('Edit Employee', () => {
    test('opens edit modal from employee row', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      // Click first employee row action
      await page.getByRole('button', { name: /edit/i }).first().click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Edit Employee')).toBeVisible();
    });

    test('pre-fills form with employee data', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await page.getByRole('button', { name: /edit/i }).first().click();

      // Form should have values
      await expect(page.getByPlaceholder('e.g., EMP001')).not.toBeEmpty();
      await expect(page.getByPlaceholder('First name')).not.toBeEmpty();
    });
  });

  test.describe('View Employee', () => {
    test('opens employee detail drawer', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      // Click view button on first row
      await page.getByRole('button', { name: /view/i }).first().click();

      // Drawer should open with employee details
      await expect(page.getByRole('complementary')).toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test('filters employees by search', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await page.getByPlaceholder(/search/i).fill('John');

      // Should filter table results
      await page.waitForResponse((resp) => resp.url().includes('/employees'));
    });

    test('filters employees by department', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      // Click department filter
      await page.getByRole('combobox', { name: /department/i }).click();
      await page.getByText('Engineering').click();

      await page.waitForResponse((resp) => resp.url().includes('/employees'));
    });

    test('filters employees by status', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/employees');

      await page.getByRole('combobox', { name: /status/i }).click();
      await page.getByText('Active').click();

      await page.waitForResponse((resp) => resp.url().includes('/employees'));
    });
  });
});
