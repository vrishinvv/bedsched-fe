import { expect, test } from '@playwright/test';

test('search accepts a Sai Connect ID and keeps the Sai profile visible while editing', async ({ page }) => {
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
      return route.fulfill({
        status: 200,
        headers,
        json: { user: { id: 2, username: 'location-user', role: 'location_user', locationId: 61 } },
      });
    }
    if (path === '/api/allocations/by-phone/808675') {
      return route.fulfill({
        status: 200,
        headers,
        json: [{
          id: 101,
          location_id: 61,
          tent_index: 1,
          block_index: 1,
          bed_number: 7,
          name: 'Verified Person',
          phone: '9876543210',
          emergency_phone: '',
          gender: 'Male',
          start_date: '2026-11-05',
          end_date: '2026-11-19',
          status: 'confirmed',
          location_name: 'Test Location',
          tent_name: 'Test Tent',
          block_name: 'Test Block',
          accommodation_category: 'delegate',
          category_source: 'sai_connect',
          verified_categories: ['delegate'],
          sai_connect_id: '808675',
          sai_connect_age: 35,
          personPhotoUrl: 'https://example.com/person.jpg',
          aadhaarPhotoUrl: null,
          deleted_at: null,
        }],
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/search');
  await page.getByPlaceholder('Phone number or Sai Connect ID').fill('808675');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page.getByText('808675', { exact: true })).toBeVisible();
  await expect(page.getByText('35', { exact: true })).toBeVisible();
  await expect(page.getByText('Delegate', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Edit/ }).click();
  await expect(page.getByText('Sai Connect ID', { exact: true })).toBeVisible();
  await expect(page.getByText('808675', { exact: true })).toBeVisible();
  await expect(page.getByText('Sai Connect Age', { exact: true })).toBeVisible();
  await expect(page.getByText('35', { exact: true })).toBeVisible();
  await expect(page.getByText('delegate', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Phone', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Gender', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Emergency Phone', { exact: true })).toBeEnabled();
  await expect(page.getByText('Sai Connect verified fields can only be changed by an administrator.')).toBeVisible();
});

test('search offers reallocation and completes the shared bed-move flow', async ({ page }) => {
  let reallocationPayload = null;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': 'http://127.0.0.1:3100',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/api/auth/me') {
      return route.fulfill({
        status: 200,
        headers,
        json: { user: { id: 2, username: 'location-user', role: 'location_user', locationId: 61 } },
      });
    }
    if (url.pathname === '/api/allocations/by-phone/808675') {
      return route.fulfill({
        status: 200,
        headers,
        json: [{
          id: 101,
          location_id: 61,
          tent_index: 1,
          block_index: 1,
          bed_number: 7,
          name: 'Verified Person',
          phone: '9876543210',
          gender: 'Male',
          start_date: '2026-11-18',
          end_date: '2026-11-24',
          status: 'confirmed',
          location_name: 'North',
          tent_name: 'North 7',
          block_name: 'N7B22',
          accommodation_category: 'delegate',
          sai_connect_age: 35,
          deleted_at: null,
        }],
      });
    }
    if (url.pathname === '/api/allocations/101/reallocate-options') {
      if (url.searchParams.has('block_id')) {
        return route.fulfill({ status: 200, headers, json: { step: 'beds', available_beds: [2] } });
      }
      if (url.searchParams.has('tent_id')) {
        return route.fulfill({
          status: 200,
          headers,
          json: { step: 'blocks', blocks: [{ id: 111, name: 'N7B22', size: 4, gender_restriction: 'both', minimumAge: 0 }] },
        });
      }
      if (url.searchParams.has('location_id')) {
        return route.fulfill({
          status: 200,
          headers,
          json: { step: 'tents', tents: [{ id: 11, name: 'North 7', size: 20, block_count: 5 }] },
        });
      }
      return route.fulfill({
        status: 200,
        headers,
        json: { step: 'locations', locations: [{ id: 61, name: 'North', capacity: 116 }] },
      });
    }
    if (url.pathname === '/api/allocations/101/reallocate' && request.method() === 'POST') {
      reallocationPayload = request.postDataJSON();
      return route.fulfill({ status: 200, headers, json: { to: { bed: 2 } } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${url.pathname}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/search');
  await page.getByPlaceholder('Phone number or Sai Connect ID').fill('808675');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await page.getByRole('button', { name: 'Reallocate', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Reallocate Bed' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Verified Person', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /North Capacity/ }).click();
  await page.getByRole('button', { name: /North 7/ }).click();
  await page.getByRole('button', { name: /N7B22/ }).click();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: /Confirm Reallocation/ }).click();

  await expect(page.getByText('Verified Person moved to bed 2.')).toBeVisible();
  expect(reallocationPayload).toEqual({
    newLocationId: 61,
    newTentId: 11,
    newBlockId: 111,
    newBedNumber: 2,
  });
});

test('bulk edit accepts a Sai Connect ID and locks verified name and phone for a location user', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': 'http://127.0.0.1:3100',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/api/auth/me') {
      return route.fulfill({
        status: 200,
        headers,
        json: { user: { id: 2, username: 'location-user', role: 'location_user', locationId: 61 } },
      });
    }
    if (url.pathname === '/api/allocations/by-phone') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          batches: [{
            batchId: 'verified-batch',
            items: [{
              id: 101,
              locationId: 61,
              tentIndex: 1,
              blockIndex: 1,
              bedNumber: 7,
              name: 'Verified Person',
              phone: '9876543210',
              gender: 'Male',
              status: 'confirmed',
              startDate: '2026-11-05',
              endDate: '2026-11-19',
              emergencyPhone: '',
              accommodationCategory: 'delegate',
              categorySource: 'sai_connect',
              verifiedCategories: ['delegate'],
              saiConnectId: '808675',
              saiConnectAge: 35,
            }],
          }],
        },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${url.pathname}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/admin/edit?phone=808675');

  await page.getByText('Location 61', { exact: true }).click();
  await page.getByText('Tent 1', { exact: true }).click();
  await page.getByText('Block 1', { exact: true }).click();
  await expect(page.getByText(/delegate · Sai ID: 808675 · Age: 35/i)).toBeVisible();

  const bedRow = page.getByText('Bed 7', { exact: true }).locator('..');
  await bedRow.getByRole('checkbox').check();
  await expect(page.getByText('New Phone Number').locator('..').locator('input')).toBeDisabled();
  await expect(page.getByText('New Contact Name').locator('..').locator('input')).toBeDisabled();
  await expect(page.getByText(/A location user cannot change its name or phone/)).toBeVisible();
});
