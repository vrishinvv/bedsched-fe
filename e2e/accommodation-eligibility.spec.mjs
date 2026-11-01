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
  await expect(page.getByText('Sai Connect lookup is not required for caretakers')).toBeVisible();
  await expect(page.getByText('Sai Connect lookup is required', { exact: true })).toHaveCount(0);
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

test('filters the caretaker Delegate picker by name or bed number', async ({ page }) => {
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
          blockSize: 3,
          beds: {
            1: {
              id: 101,
              name: 'Arun Delegate',
              status: 'confirmed',
              accommodationCategory: 'delegate',
              startDate: '2026-11-05',
              endDate: '2026-11-24',
              gender: 'Male',
            },
            2: {
              id: 102,
              name: 'Lakshmi Delegate',
              status: 'confirmed',
              accommodationCategory: 'delegate',
              startDate: '2026-11-05',
              endDate: '2026-11-24',
              gender: 'Female',
            },
          },
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
  await page.getByTitle('Bed 3: Available').click();
  await page.getByLabel('Allocate as caretaker').check();

  const search = page.getByRole('searchbox', { name: 'Search Delegates' });
  const delegatePicker = page.getByRole('combobox', { name: 'Caretaker for' });
  await search.fill('Lakshmi');

  await expect(delegatePicker).toContainText('Lakshmi Delegate — Bed 2');
  await expect(delegatePicker).not.toContainText('Arun Delegate');

  await search.fill('1');
  await expect(delegatePicker).toContainText('Arun Delegate — Bed 1');
  await expect(delegatePicker).not.toContainText('Lakshmi Delegate');
});

test('shows Sai lookups as Delegate, Sevadal, or Devotee category outcomes', async ({ page }) => {
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
            block: { index: 1, name: 'All guests', genderRestriction: 'both', allowedCategories: ['delegate', 'sevadal', 'devotee'] },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      const { identifier } = request.postDataJSON();
      if (identifier === '239910') {
        return route.fulfill({
          status: 200,
          headers,
          json: {
            matched: true,
            fullName: 'Verified Delegate',
            mobileNo: null,
            verifiedCategories: ['delegate'],
            verificationToken: 'delegate-token',
          },
        });
      }
      if (identifier === '888888') {
        return route.fulfill({
          status: 200,
          headers,
          json: {
            matched: true,
            fullName: 'Verified Sevadal',
            mobileNo: null,
            verifiedCategories: ['sevadal'],
            verificationToken: 'sevadal-token',
          },
        });
      }
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: false,
          outcome: 'not_registered',
          message: 'Participant not registered.',
          defaultCategory: 'devotee',
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
  await page.getByTitle('Bed 1: Available').click();
  const identifier = page.getByPlaceholder('Sai Connect ID or phone');
  const verify = page.getByRole('button', { name: 'Verify' });

  await expect(page.getByText('Sai Connect lookup is required')).toBeVisible();
  await expect(page.getByText('Complete Sai Connect lookup')).toBeVisible();

  await identifier.fill('239910');
  await verify.click();
  await expect(page.getByRole('status')).toContainText('Delegate');
  await expect(page.getByRole('status')).toContainText('Sai Connect verified');
  await expect(page.getByRole('status')).toHaveClass(/bg-emerald-50/);
  await expect(page.getByText('Complete Sai Connect lookup')).toHaveCount(0);

  await identifier.fill('888888');
  await expect(page.getByText('Complete Sai Connect lookup')).toBeVisible();
  await verify.click();
  await expect(page.getByRole('status')).toContainText('Sevadal');

  await identifier.fill('999999');
  await verify.click();

  const categoryOutcome = page.getByRole('status');
  await expect(categoryOutcome).toContainText('Devotee');
  await expect(categoryOutcome).toContainText('Continue as a Devotee');
  await expect(page.getByText('Participant not registered.')).toHaveCount(0);
  await expect(page.getByText('Complete Sai Connect lookup')).toHaveCount(0);
});
