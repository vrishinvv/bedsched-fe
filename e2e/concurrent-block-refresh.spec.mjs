import { expect, test } from '@playwright/test';

test('refreshes the bed grid and warns when another operator books the selected bed', async ({ page }) => {
  let occupiedByAnotherOperator = false;
  let liveRefreshFails = false;

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
      if (liveRefreshFails) {
        return route.fulfill({ status: 503, headers, json: { error: 'temporarily_unavailable' } });
      }
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: { index: 1, name: 'Shared Block', genderRestriction: 'both', allowedCategories: ['delegate', 'sevadal', 'devotee'] },
          },
          blockSize: 2,
          beds: occupiedByAnotherOperator
            ? {
                1: {
                  id: 900,
                  name: 'Other Operator Booking',
                  phone: '9999999999',
                  gender: 'Male',
                  startDate: '2026-11-05',
                  endDate: '2026-11-24',
                  status: 'confirmed',
                },
              }
            : {},
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
  await expect(page.getByText('Live updates every 5 seconds')).toBeVisible();
  await page.getByTitle('Bed 1: Available').click();
  await expect(page.getByRole('heading', { name: 'Allocate bed — Bed 1' })).toBeVisible();

  occupiedByAnotherOperator = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  await expect(page.getByRole('heading', { name: 'Allocate bed — Bed 1' })).toHaveCount(0);
  await expect(page.getByTitle(/Bed 1: Other Operator Booking/)).toBeVisible();
  await expect(page.getByText('Bed 1 was just booked. Please select another available bed.')).toBeVisible();

  liveRefreshFails = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Live updates unavailable — retrying')).toBeVisible();
});
