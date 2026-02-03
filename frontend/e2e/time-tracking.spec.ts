/**
 * E2E tests for time tracking.
 */

import { test, expect } from '@playwright/test';
import { login, testUser } from './helpers/auth';

test.describe('Time Tracking', () => {
  test.beforeEach(async () => {
    test.skip(true, 'Requires authenticated user');
  });

  test.describe('Clock Widget', () => {
    test('shows clock in button when not clocked in', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      await expect(page.getByText('Ready to Work?')).toBeVisible();
      await expect(page.getByRole('button', { name: /clock in/i })).toBeVisible();
    });

    test('clocks in successfully', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      await page.getByRole('button', { name: /clock in/i }).click();

      // Should show clocked in state
      await expect(page.getByText('Currently Working')).toBeVisible();
      await expect(page.getByRole('button', { name: /clock out/i })).toBeVisible();
    });

    test('shows elapsed time when clocked in', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      // If already clocked in
      await expect(page.getByText(/\d+h \d+m/)).toBeVisible();
    });

    test('opens clock out modal', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      // Assuming already clocked in
      await page.getByRole('button', { name: /clock out/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Break Time (minutes)')).toBeVisible();
    });

    test('clocks out with break time', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      await page.getByRole('button', { name: /clock out/i }).click();

      // Enter break minutes
      await page.getByRole('spinbutton').fill('60');
      await page.getByRole('button', { name: /^clock out$/i }).click();

      // Should return to clock in state
      await expect(page.getByText('Ready to Work?')).toBeVisible();
    });
  });

  test.describe('Time Entry List', () => {
    test('displays time entries page', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/time-entries');

      await expect(page.getByText('Time Entries')).toBeVisible();
    });

    test('shows time entries table', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/time-entries');

      await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /hours/i })).toBeVisible();
    });

    test('filters by date range', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/time-entries');

      // Click date range picker
      await page.getByPlaceholder('Start date').click();

      // Select dates from picker
      await page.getByTitle(/\d{4}-\d{2}-\d{2}/).first().click();
      await page.getByTitle(/\d{4}-\d{2}-\d{2}/).last().click();

      await page.waitForResponse((resp) => resp.url().includes('/time-entries'));
    });
  });

  test.describe('Weekly Summary', () => {
    test('displays weekly summary', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      // Weekly summary widget should be visible
      await expect(page.getByText(/this week/i)).toBeVisible();
      await expect(page.getByText(/regular hours/i)).toBeVisible();
    });

    test('shows hours breakdown', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/');

      // Hours should be displayed
      await expect(page.getByText(/\d+(\.\d+)?\s*h/)).toBeVisible();
    });
  });

  test.describe('Manual Time Entry', () => {
    test('opens add time entry modal', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/time-entries');

      await page.getByRole('button', { name: /add entry/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('creates manual time entry', async ({ page }) => {
      await login(page, testUser);
      await page.goto('/time-entries');

      await page.getByRole('button', { name: /add entry/i }).click();

      // Fill form
      await page.getByLabel(/date/i).click();
      await page.getByTitle(/today/i).click();

      await page.getByLabel(/start time/i).fill('09:00');
      await page.getByLabel(/end time/i).fill('17:00');
      await page.getByLabel(/break/i).fill('60');

      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });
});
