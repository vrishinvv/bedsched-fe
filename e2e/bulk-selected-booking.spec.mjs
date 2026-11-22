import { expect, test } from '@playwright/test';

test('opens bulk booking for the exact selected range and keeps gender counts complementary', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => new Promise(() => {}) },
    });
  });

  const headers = {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-origin': 'http://127.0.0.1:3100',
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/api/auth/me') {
      return route.fulfill({ status: 200, headers, json: { user: { id: 1, username: 'admin', role: 'admin' } } });
    }
    if (path === '/api/locations/61/tents/1/blocks/1') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: {
              index: 1,
              name: 'Mixed Block',
              genderRestriction: 'both',
              allowedCategories: ['devotee'],
              minimumAge: 0,
            },
          },
          blockSize: 6,
          beds: {},
        },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');

  await page.getByTitle('Bed 2: Available').click({ modifiers: ['Meta'] });
  await expect(page.getByText('Selected (1)')).toBeVisible();
  await page.getByTitle('Bed 5: Available').click({ modifiers: ['Meta'] });
  await expect(page.getByText('4 beds selected', { exact: true })).toBeVisible();
  await expect(page.getByText('Beds 2–5', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Book selected beds' }).click();
  await expect(page.getByRole('heading', { name: 'Book selected beds' })).toBeVisible();
  await expect(page.getByText('One representative’s details and both photos will be stored on every booking in this group.')).toBeVisible();

  const maleCount = page.getByLabel('Male count', { exact: true });
  const femaleCount = page.getByLabel('Female count', { exact: true });
  await expect(maleCount).toHaveValue('4');
  await expect(femaleCount).toHaveValue('0');
  await femaleCount.fill('1');
  await expect(maleCount).toHaveValue('3');
  await maleCount.fill('2');
  await expect(femaleCount).toHaveValue('2');
  await expect(page.getByText('4 of 4 assigned')).toBeVisible();
  await expect(page.getByText(/Sai Connect/i)).toHaveCount(0);

  await page.getByLabel('Representative name').fill('Photo State Test');
  await page.getByLabel('Representative phone').fill('9876543210');
  await page.getByRole('button', { name: '📷 Capture Representative Photo *' }).click();
  await expect(page.getByText('4 selected beds', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Representative name')).toHaveValue('Photo State Test');
  await expect(page.getByLabel('Representative phone')).toHaveValue('9876543210');

  await page.screenshot({ path: 'test-results/bulk-selected-booking.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Book selected beds' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/bulk-selected-booking-mobile.png' });
});
