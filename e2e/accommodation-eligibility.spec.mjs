import { expect, test } from '@playwright/test';

test('allocates a name-only caretaker into a Delegate-only block', async ({ page }) => {
  let submittedPayload;
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
      submittedPayload = request.postDataJSON();
      return route.fulfill({
        status: 200,
        headers,
        json: {
          id: 102,
          name: submittedPayload.name,
          status: 'confirmed',
          accommodationCategory: 'devotee',
          caretakerForAllocationId: 101,
          startDate: '2026-11-05',
          endDate: '2026-11-24',
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
  await page.getByRole('combobox', { name: 'Caretaker for' }).selectOption('101');
  await page.getByPlaceholder('Full name').fill('Devotee Caretaker');
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect.poll(() => submittedPayload).toBeTruthy();
  expect(submittedPayload).toMatchObject({
    name: 'Devotee Caretaker',
    accommodationCategory: 'devotee',
    caretakerForAllocationId: 101,
  });
  expect(submittedPayload.personPhotoKey).toBeFalsy();
  expect(submittedPayload.aadhaarPhotoKey).toBeFalsy();
});
