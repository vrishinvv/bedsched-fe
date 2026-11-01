import { expect, test } from '@playwright/test';

test('shows a clear notice when a stale screen attempts a second caretaker', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': 'http://127.0.0.1:3100',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/api/auth/me') {
      return route.fulfill({ status: 200, headers, json: { user: { id: 1, username: 'admin', role: 'admin', locationId: null } } });
    }
    if (path === '/api/locations/61/tents/1/blocks/1') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: { index: 1, name: 'Delegates', genderRestriction: 'both', allowedCategories: ['delegate'] },
          },
          blockSize: 2,
          beds: {
            1: {
              id: 101,
              name: 'Verified Delegate',
              status: 'confirmed',
              accommodationCategory: 'delegate',
              startDate: '2026-11-05',
              endDate: '2026-11-24',
              gender: 'Male',
            },
          },
        },
      });
    }
    if (path.endsWith('/beds/2/allocate') && request.method() === 'POST') {
      return route.fulfill({
        status: 400,
        headers,
        json: {
          error: 'caretaker_already_assigned',
          message: 'This Delegate already has a caretaker.',
        },
      });
    }
    if (path === '/api/upload-url') {
      return route.fulfill({ status: 503, headers, json: { error: 'disabled_in_test' } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 2: Available').click();
  await page.getByLabel('Allocate as caretaker').check();
  await page.getByRole('combobox', { name: 'Caretaker for' }).fill('Delegate');
  await page.getByRole('option', { name: 'Verified Delegate — Bed 1' }).click();
  await page.getByPlaceholder('Full name').fill('Second Caretaker');
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect(page.getByText('This Delegate already has a caretaker.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Allocate bed — Bed 2' })).toBeVisible();
});
