import { expect, test } from '@playwright/test';

function blockResponse() {
  return {
    meta: {
      location: { id: '61', name: 'Anand Vilas Enclave' },
      tent: { index: 1, name: 'Tent A' },
      block: { index: 1, name: 'Block 1', genderRestriction: 'male_only', allowedCategories: ['delegate'] },
    },
    blockSize: 3,
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
      2: {
        id: 202,
        name: 'Delegate Caretaker',
        status: 'confirmed',
        accommodationCategory: 'devotee',
        startDate: '2026-11-05',
        endDate: '2026-11-24',
        gender: 'Male',
        caretakerForAllocationId: 101,
        caretakerForName: 'Verified Delegate',
        caretakerForBedNumber: 1,
      },
    },
  };
}

test('shows the backend reason when caretaker reallocation options cannot load', async ({ page }) => {
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
      return route.fulfill({ status: 200, headers, json: blockResponse() });
    }
    if (path === '/api/allocations/202/reallocate-options') {
      return route.fulfill({
        status: 409,
        headers,
        json: {
          error: 'linked_caretaker_reallocation',
          message: 'A caretaker and their Delegate must remain in the same block.',
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
  await page.getByTitle(/Bed 2: Delegate Caretaker/).click();
  await page.getByRole('button', { name: 'Reallocate' }).click();

  await expect(page.getByRole('main').getByRole('alert')).toContainText('A caretaker and their Delegate must remain in the same block.');
});

test('shows the linked Delegate and reallocates a caretaker within the same block', async ({ page }) => {
  let submittedReallocation;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
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
      return route.fulfill({ status: 200, headers, json: blockResponse() });
    }
    if (path === '/api/allocations/202/reallocate-options') {
      const allocation = { id: 202, gender: 'Male', start_date: '2026-11-05', end_date: '2026-11-24' };
      if (!url.searchParams.has('location_id')) {
        return route.fulfill({ status: 200, headers, json: {
          step: 'locations', allocation, locations: [{ id: 61, name: 'Anand Vilas Enclave', capacity: 100 }],
        } });
      }
      if (!url.searchParams.has('tent_id')) {
        return route.fulfill({ status: 200, headers, json: {
          step: 'tents', allocation, tents: [{ id: 10, name: 'Tent A', size: 20, block_count: 1 }],
        } });
      }
      if (!url.searchParams.has('block_id')) {
        return route.fulfill({ status: 200, headers, json: {
          step: 'blocks', allocation, blocks: [{ id: 11, name: 'Block 1', size: 3, gender_restriction: 'male_only' }],
        } });
      }
      return route.fulfill({ status: 200, headers, json: {
        step: 'beds', allocation, available_beds: [3], total_beds: 3,
      } });
    }
    if (path === '/api/allocations/202/reallocate' && request.method() === 'POST') {
      submittedReallocation = request.postDataJSON();
      return route.fulfill({ status: 200, headers, json: {
        ok: true, to: { location_id: 61, tent_id: 10, block_id: 11, bed: 3 },
      } });
    }
    if (path === '/api/upload-url') {
      return route.fulfill({ status: 503, headers, json: { error: 'disabled_in_test' } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle(/Bed 2: Delegate Caretaker/).click();

  const assignment = page.getByRole('region', { name: 'Caretaker assignment' });
  await expect(assignment).toContainText('Verified Delegate');
  await expect(assignment).toContainText('Bed 1');

  await page.getByRole('button', { name: 'Reallocate' }).click();
  const reallocationDialog = page.getByRole('dialog', { name: 'Reallocate Bed' });
  await reallocationDialog.getByRole('button', { name: /Anand Vilas Enclave/ }).click();
  await reallocationDialog.getByRole('button', { name: /Tent A/ }).click();
  await reallocationDialog.getByRole('button', { name: /Block 1/ }).click();
  await reallocationDialog.getByRole('button', { name: '3', exact: true }).click();
  await reallocationDialog.getByRole('button', { name: /Confirm Reallocation/ }).click();

  await expect.poll(() => submittedReallocation).toEqual({
    newLocationId: 61,
    newTentId: 10,
    newBlockId: 11,
    newBedNumber: 3,
  });
  await expect(page.getByText('Successfully reallocated Delegate Caretaker to new bed 3')).toBeVisible();
});
