/**
 * E2E tests for leave management.
 */

import { test, expect } from '@playwright/test';
import { login, testUser } from './helpers/auth';

test.describe('Leave Management', () => {
  test.beforeEach(async () => {
    test.skip(true, 'Requires authenticated user');
  });

  test.describe('Leave Page', () => {
    test('displays leave page', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await expect(page.getByText('Leave')).toBeVisible();
    });

    test('shows leave balance summary', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await expect(page.getByText(/annual leave/i)).toBeVisible();
      await expect(page.getByText(/remaining/i)).toBeVisible();
    });

    test('shows request leave button', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await expect(page.getByRole('button', { name: /request leave/i })).toBeVisible();
    });
  });

  test.describe('Request Leave', () => {
    test('opens request leave modal', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByRole('button', { name: /request leave/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Request Leave')).toBeVisible();
    });

    test('shows leave type options', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByRole('button', { name: /request leave/i }).click();

      // Click leave type dropdown
      await page.getByLabel(/leave type/i).click();

      await expect(page.getByText('Annual Leave')).toBeVisible();
    });

    test('shows balance when leave type selected', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByRole('button', { name: /request leave/i }).click();

      await page.getByLabel(/leave type/i).click();
      await page.getByText('Annual Leave').click();

      // Balance info should appear
      await expect(page.getByText(/available/i)).toBeVisible();
    });

    test('toggles half day option', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByRole('button', { name: /request leave/i }).click();

      // Toggle half day switch
      await page.getByRole('switch').click();

      // Should show single date and period selectors
      await expect(page.getByLabel(/date/i)).toBeVisible();
      await expect(page.getByLabel(/period/i)).toBeVisible();
    });

    test('submits leave request', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByRole('button', { name: /request leave/i }).click();

      // Fill form
      await page.getByLabel(/leave type/i).click();
      await page.getByText('Annual Leave').click();

      // Select date range
      await page.getByPlaceholder('Start date').click();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      // Select dates from calendar

      await page.getByRole('button', { name: /submit/i }).click();

      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('My Leave Requests', () => {
    test('displays leave requests table', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /dates/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('shows request status', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      // Status tags should be visible
      await expect(page.getByText(/(pending|approved|rejected)/i).first()).toBeVisible();
    });

    test('cancels pending request', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      // Find and click cancel on a pending request
      await page.getByRole('button', { name: /cancel/i }).first().click();

      // Confirm cancellation
      await page.getByRole('button', { name: /yes/i }).click();

      await expect(page.getByText(/cancelled/i)).toBeVisible();
    });
  });

  test.describe('Leave Calendar', () => {
    test('displays leave calendar view', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave/calendar');

      await expect(page.getByRole('grid')).toBeVisible(); // Calendar grid
    });

    test('shows leave events on calendar', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave/calendar');

      // Calendar events should be visible
      // (Actual test would depend on data)
    });
  });

  test.describe('Pending Approval (Manager)', () => {
    test('displays pending approval tab', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByText('Pending Approval').click();

      // Should show pending requests table
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('approves leave request', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByText('Pending Approval').click();

      // Approve first pending request
      await page.getByRole('button', { name: /approve/i }).first().click();

      await expect(page.getByText(/approved/i)).toBeVisible();
    });

    test('rejects leave request with reason', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/leave');

      await page.getByText('Pending Approval').click();

      // Reject first pending request
      await page.getByRole('button', { name: /reject/i }).first().click();

      // Enter rejection reason
      await page.getByPlaceholder(/reason/i).fill('Insufficient coverage');
      await page.getByRole('button', { name: /confirm/i }).click();

      await expect(page.getByText(/rejected/i)).toBeVisible();
    });
  });
});
