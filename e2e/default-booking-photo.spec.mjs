import { expect, test } from '@playwright/test';

test('uses the Sathya Sai Baba default for both booking photos and uploads both', async ({ page }) => {
  let submittedPayload;
  const uploadedTypes = [];
  const headers = {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-origin': 'http://127.0.0.1:3100',
  };

  await page.route('**/test-photo-upload**', async (route) => {
    uploadedTypes.push(new URL(route.request().url()).searchParams.get('type'));
    return route.fulfill({ status: 200 });
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
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
            block: { index: 1, name: 'Mixed', genderRestriction: 'both', allowedCategories: ['devotee'] },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/upload-url' && request.method() === 'POST') {
      const body = request.postDataJSON();
      return route.fulfill({
        status: 200,
        headers,
        json: {
          key: body.key || `prefetched-${body.photoType}.jpg`,
          uploadUrl: `http://127.0.0.1:3100/test-photo-upload?type=${body.photoType}`,
        },
      });
    }
    if (path.endsWith('/beds/1/allocate') && request.method() === 'POST') {
      submittedPayload = request.postDataJSON();
      return route.fulfill({ status: 200, headers, json: { id: 500, ...submittedPayload } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 1: Available').click();

  await page.getByRole('button', { name: 'Use Baba default for both' }).click();
  await expect(page.getByText('Selected for both person and identity photos.', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Person Photo')).toHaveAttribute('src', /sathya-sai-baba-default\.jpg/);
  await expect(page.getByAltText('Identity Card Photo')).toHaveAttribute('src', /sathya-sai-baba-default\.jpg/);

  await page.getByPlaceholder('Full name').fill('Default Photo Guest');
  await page.locator('input[name="phone"]').fill('9876543210');
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect.poll(() => submittedPayload).toBeTruthy();
  expect(submittedPayload.personPhotoKey).toMatch(/-person\.jpg$/);
  expect(submittedPayload.aadhaarPhotoKey).toMatch(/-identity\.jpg$/);
  expect(uploadedTypes.sort()).toEqual(['aadhaar', 'person']);
});

test('hides the default booking photo option from non-admins', async ({ page }) => {
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
      return route.fulfill({ status: 200, headers, json: { user: { id: 10, username: 'location-user', role: 'location_user', locationId: 61 } } });
    }
    if (path === '/api/locations/61/tents/1/blocks/1') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: { index: 1, name: 'Mixed', genderRestriction: 'both', allowedCategories: ['devotee'] },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/upload-url' && request.method() === 'POST') {
      return route.fulfill({ status: 200, headers, json: { key: 'unused.jpg', uploadUrl: 'http://127.0.0.1:3100/unused' } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 1: Available').click();

  await expect(page.getByRole('button', { name: 'Use Baba default for both' })).toHaveCount(0);
});
