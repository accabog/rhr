import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixels: 100,
    });
  });

  test('employee list', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('employees.png', {
      maxDiffPixels: 100,
    });
  });

  test('leave calendar', async ({ page }) => {
    await page.goto('/leave/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('leave-calendar.png', {
      maxDiffPixels: 100,
    });
  });
});
