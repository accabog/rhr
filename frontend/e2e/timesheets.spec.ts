/**
 * E2E tests for timesheet management.
 */

import { test, expect } from '@playwright/test';
import { login, testUser } from './helpers/auth';

test.describe('Timesheet Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(true, 'Requires authenticated user');
  });

  test.describe('Timesheets Page', () => {
    test('displays timesheets page', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByText('Timesheets')).toBeVisible();
    });

    test('shows my timesheets tab', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByText('My Timesheets')).toBeVisible();
    });

    test('shows pending approval tab', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByText('Pending Approval')).toBeVisible();
    });

    test('shows generate timesheet button', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByRole('button', { name: /generate timesheet/i })).toBeVisible();
    });
  });

  test.describe('Generate Timesheet', () => {
    test('opens generate timesheet modal', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByRole('button', { name: /generate timesheet/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Generate Timesheet')).toBeVisible();
    });

    test('shows period presets', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByRole('button', { name: /generate timesheet/i }).click();

      // Click date range picker
      await page.getByRole('textbox').first().click();

      // Presets should be visible
      await expect(page.getByText('This Week')).toBeVisible();
      await expect(page.getByText('Last Week')).toBeVisible();
    });

    test('generates timesheet for selected period', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByRole('button', { name: /generate timesheet/i }).click();

      // Select period
      await page.getByRole('textbox').first().click();
      await page.getByText('This Week').click();

      await page.getByRole('button', { name: /^generate$/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Timesheet List', () => {
    test('displays timesheet table', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByRole('table')).toBeVisible();
    });

    test('shows period column', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByRole('columnheader', { name: /period/i })).toBeVisible();
    });

    test('shows status column', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('shows hours column', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await expect(page.getByRole('columnheader', { name: /hours/i })).toBeVisible();
    });
  });

  test.describe('Timesheet Detail', () => {
    test('navigates to timesheet detail', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByRole('button', { name: /view/i }).first().click();

      await expect(page).toHaveURL(/\/timesheets\/\d+/);
    });

    test('displays timesheet period', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets/1');

      await expect(page.getByText(/\w+ \d+.*-.*\w+ \d+/)).toBeVisible();
    });

    test('displays time entries', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets/1');

      await expect(page.getByRole('table')).toBeVisible();
    });

    test('displays total hours', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets/1');

      await expect(page.getByText(/total.*\d+.*hours/i)).toBeVisible();
    });
  });

  test.describe('Timesheet Workflow', () => {
    test('submits draft timesheet', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets/1');

      await page.getByRole('button', { name: /submit/i }).click();

      // Confirm submission
      await page.getByRole('button', { name: /yes/i }).click();

      await expect(page.getByText(/submitted/i)).toBeVisible();
    });

    test('shows status badge', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets/1');

      await expect(page.getByText(/(draft|submitted|approved|rejected)/i)).toBeVisible();
    });
  });

  test.describe('Pending Approval (Manager)', () => {
    test('switches to pending approval tab', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByText('Pending Approval').click();

      // Tab should be active
      await expect(page.getByRole('tab', { selected: true })).toHaveText(/pending/i);
    });

    test('shows employee name in pending list', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByText('Pending Approval').click();

      // Employee column should be visible
      await expect(page.getByRole('columnheader', { name: /employee/i })).toBeVisible();
    });

    test('approves timesheet', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByText('Pending Approval').click();
      await page.getByRole('button', { name: /view/i }).first().click();

      await page.getByRole('button', { name: /approve/i }).click();

      await expect(page.getByText(/approved/i)).toBeVisible();
    });

    test('rejects timesheet with reason', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets');

      await page.getByText('Pending Approval').click();
      await page.getByRole('button', { name: /view/i }).first().click();

      await page.getByRole('button', { name: /reject/i }).click();

      // Enter rejection reason
      await page.getByPlaceholder(/reason/i).fill('Missing hours for Monday');
      await page.getByRole('button', { name: /confirm/i }).click();

      await expect(page.getByText(/rejected/i)).toBeVisible();
    });
  });

  test.describe('Reopen Timesheet', () => {
    test('reopens rejected timesheet', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/timesheets/1'); // Rejected timesheet

      await page.getByRole('button', { name: /reopen/i }).click();

      await expect(page.getByText(/draft/i)).toBeVisible();
    });
  });
});
