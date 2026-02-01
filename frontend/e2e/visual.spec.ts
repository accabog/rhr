import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Visual regression tests for key pages.
 *
 * These tests compare screenshots against baseline images to detect visual changes.
 *
 * To generate/update baseline snapshots:
 *   npm run test:e2e:update-snapshots -- e2e/visual.spec.ts
 *
 * Baseline images are stored in: e2e/visual.spec.ts-snapshots/
 * These should be committed to the repository.
 *
 * Note: Visual tests are skipped until baseline snapshots are generated.
 * Remove the .skip() calls after running update-snapshots locally.
 */
test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // Skip visual tests until baseline snapshots are generated
  // Run: npm run test:e2e:update-snapshots -- e2e/visual.spec.ts
  // Then commit the generated snapshots and remove .skip()

  test.skip('dashboard page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixels: 100,
    });
  });

  test.skip('employee list', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('employees.png', {
      maxDiffPixels: 100,
    });
  });

  test.skip('leave calendar', async ({ page }) => {
    await page.goto('/leave/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('leave-calendar.png', {
      maxDiffPixels: 100,
    });
  });
});
