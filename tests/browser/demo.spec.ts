import { expect, test } from '@playwright/test';

test('renders inline data and src-based custom elements', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-testid="inline-data-art"]').locator('canvas')).toBeVisible();
  await expect(page.locator('[data-testid="src-art"]').locator('svg')).toBeVisible();
});

test('switches render modes on the playground element', async ({ page }) => {
  await page.goto('/');

  const playground = page.locator('[data-testid="playground-art"]');
  const modeSelect = page.locator('[data-testid="mode-select"]');

  await modeSelect.selectOption('svg');
  await expect(playground.locator('svg')).toBeVisible();

  await modeSelect.selectOption('png');
  await expect(playground.locator('img')).toBeVisible();
});

test('completes finite playback from button triggers', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-testid="completion-count"]')).toHaveText('0');
  await page.locator('[data-testid="play-twice"]').click();
  await expect(page.locator('[data-testid="completion-count"]')).toHaveText('1', { timeout: 6000 });
});
