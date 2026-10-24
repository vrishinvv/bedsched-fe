import { expect, test } from '@playwright/test';

const locations = [
  {
    id: 61,
    name: 'Anand Vilas Enclave',
    capacity: 100,
    allocatedCount: 40,
    freeingTomorrow: 3,
    reservedCount: 2,
  },
  {
    id: 62,
    name: 'Brindavan Enclave',
    capacity: 80,
    allocatedCount: 20,
    freeingTomorrow: 0,
    reservedCount: 0,
  },
];

async function mockAuthenticatedApi(page, user) {
  await page.addInitScript(() => {
    window.localStorage.setItem('bs_token', 'playwright-token');
  });

  await page.route('http://localhost:3001/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': 'http://127.0.0.1:3100',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }

    if (path === '/api/auth/me') {
      await route.fulfill({ status: 200, headers, json: { user } });
      return;
    }
    if (path === '/api/locations') {
      await route.fulfill({ status: 200, headers, json: locations });
      return;
    }
    if (path === '/api/admin/structure') {
      await route.fulfill({ status: 200, headers, json: { locations: [] } });
      return;
    }

    await route.fulfill({ status: 404, headers, json: { error: 'Unexpected mocked request' } });
  });
}

test('an unauthenticated visitor is redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to SSS Enclave Booking' })).toBeVisible();
});

test('a location user only gets their assigned location and no admin setup controls', async ({ page }) => {
  await mockAuthenticatedApi(page, {
    id: 10,
    username: 'location-61',
    role: 'location_user',
    locationId: 61,
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Global Overview' })).toBeVisible();

  // Reserved records are still displayed, even though reservation creation is dormant.
  await expect(page.getByText('2 reserved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reserve' })).toHaveCount(0);
  await expect(page.locator('a[href="/locations/61"]')).toHaveCount(1);
  await expect(page.locator('a[href="/locations/62"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('link', { name: 'User Accounts' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Accommodation Setup' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Search & Confirm' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Active Reservations' })).toHaveCount(0);

  await page.goto('/admin/structure');
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
});

test('an admin can reach the account and accommodation setup screens', async ({ page }) => {
  await mockAuthenticatedApi(page, {
    id: 1,
    username: 'admin',
    role: 'admin',
    locationId: null,
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Global Overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('link', { name: 'User Accounts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Accommodation Setup' })).toBeVisible();

  await page.goto('/admin/structure');
  await expect(page.getByRole('heading', { name: 'Accommodation Setup' })).toBeVisible();
  await expect(page.getByText('No locations found.')).toBeVisible();
});
