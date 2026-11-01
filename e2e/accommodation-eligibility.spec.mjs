import { expect, test } from '@playwright/test';

test('allocates a caretaker with gender and locked Delegate stay dates', async ({ page }) => {
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
              categorySource: 'sai_connect',
              verifiedCategories: ['delegate'],
              startDate: '2026-11-05',
              endDate: '2026-11-24',
              gender: 'Male',
            },
          },
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: false,
          outcome: 'not_registered',
          message: 'Participant not registered.',
          validIdentifier: true,
          defaultCategory: 'devotee',
          verificationToken: 'unregistered-token',
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
  const categoryTags = page.getByRole('region', { name: 'Allowed accommodation categories' });
  await expect(categoryTags.getByText('Delegate', { exact: true })).toBeVisible();
  await expect(categoryTags.getByText('Sevadal', { exact: true })).toHaveCount(0);
  await expect(categoryTags.getByText('Devotee', { exact: true })).toHaveCount(0);
  await page.getByTitle('Bed 2: Available').click();
  const allocationDialog = page.getByRole('dialog', { name: 'Allocate bed 2' });
  await expect(page.getByText('Sai Connect lookup is required')).toBeVisible();
  await expect(page.getByText('Complete the lookup to verify eligibility for this restricted block. A person without an eligible registration cannot be allocated here.')).toBeVisible();
  await expect(page.getByText('Complete Sai Connect lookup')).toBeVisible();
  await expect(allocationDialog.getByText(/devotee/i)).toHaveCount(0);
  await page.getByPlaceholder('Sai Connect ID or phone').fill('800717');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('status', { name: 'Sai Connect lookup result' })).toContainText(
    'No Delegate or Sevadal registration was found. This person cannot be allocated to this restricted block.',
  );
  await expect(page.getByText('No eligible Delegate or Sevadal registration was found for this block.')).toBeVisible();
  await expect(allocationDialog.getByText(/devotee/i)).toHaveCount(0);
  await page.getByLabel('Allocate as caretaker').check();
  await expect(page.getByText('Sai Connect lookup is optional for caretakers')).toBeVisible();
  await expect(page.getByText('Sai Connect lookup is required', { exact: true })).toHaveCount(0);
  const caretakerPicker = page.getByRole('combobox', { name: 'Caretaker for' });
  await caretakerPicker.fill('Verified');
  await page.getByRole('option', { name: 'Verified Delegate — Bed 1' }).click();
  await page.getByPlaceholder('Full name').fill('Devotee Caretaker');
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2026-11-05');
  await expect(page.locator('input[name="startDate"]')).toBeDisabled();
  await expect(page.locator('input[name="endDate"]')).toHaveValue('2026-11-24');
  await expect(page.locator('input[name="endDate"]')).toBeDisabled();
  await page.locator('select[name="gender"]').selectOption('Female');
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect.poll(() => submittedPayload).toBeTruthy();
  expect(submittedPayload).toMatchObject({
    name: 'Devotee Caretaker',
    gender: 'Female',
    startDate: '2026-11-05',
    endDate: '2026-11-24',
    accommodationCategory: 'devotee',
    caretakerForAllocationId: 101,
  });
  expect(submittedPayload.personPhotoKey).toBeFalsy();
  expect(submittedPayload.aadhaarPhotoKey).toBeFalsy();
});

test('submits a verified caretaker with their Sai Connect profile and actual category', async ({ page }) => {
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
              categorySource: 'sai_connect',
              verifiedCategories: ['delegate'],
              startDate: '2026-11-05',
              endDate: '2026-11-24',
              gender: 'Male',
            },
          },
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: true,
          saiConnectId: '239910',
          fullName: 'Verified Sevadal Caretaker',
          age: 42,
          mobileNo: '9876543210',
          gender: 'Female',
          verifiedCategories: ['sevadal'],
          registrations: [],
          verificationToken: 'verified-caretaker-token',
          existingAllocation: null,
        },
      });
    }
    if (path.endsWith('/beds/2/allocate') && request.method() === 'POST') {
      submittedPayload = request.postDataJSON();
      return route.fulfill({ status: 200, headers, json: { id: 102, ...submittedPayload, status: 'confirmed' } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 2: Available').click();
  await page.getByPlaceholder('Sai Connect ID or phone').fill('239910');
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByLabel('Allocate as caretaker').check();
  await expect(page.getByText('Sai Connect lookup is optional for caretakers')).toBeVisible();
  await expect(page.getByText('If verified, the caretaker’s Sai Connect ID, category, age, phone, and gender will be saved.', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'Caretaker for' }).fill('Verified Delegate');
  await page.getByRole('option', { name: 'Verified Delegate — Bed 1' }).click();
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect.poll(() => submittedPayload).toBeTruthy();
  expect(submittedPayload).toMatchObject({
    name: 'Verified Sevadal Caretaker',
    phone: '9876543210',
    gender: 'Female',
    accommodationCategory: 'sevadal',
    saiVerificationToken: 'verified-caretaker-token',
    caretakerForAllocationId: 101,
  });
});

test('blocks a duplicate Sai Connect ID during verification and shows its existing bed', async ({ page }) => {
  let allocationRequests = 0;
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
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: true,
          saiConnectId: '808675',
          fullName: 'Existing Delegate',
          age: 35,
          mobileNo: '9876543210',
          gender: 'Male',
          verifiedCategories: ['delegate'],
          registrations: [],
          verificationToken: 'verified-token',
          existingAllocation: {
            locationName: 'Anand Vilas Enclave',
            tentName: 'Tent A',
            blockName: 'Block 1',
            bedNumber: 25,
          },
          allocationConflictMessage: 'This Sai Connect ID is already booked at Anand Vilas Enclave / Tent A / Block 1 / Bed 25.',
        },
      });
    }
    if (path.endsWith('/beds/1/allocate') && request.method() === 'POST') {
      allocationRequests += 1;
      return route.fulfill({ status: 500, headers, json: { error: 'should_not_allocate' } });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 1: Available').click();
  await page.getByPlaceholder('Sai Connect ID or phone').fill('808675');
  await page.getByRole('button', { name: 'Verify' }).click();

  const conflict = page.getByRole('alert', { name: 'Sai Connect booking conflict' });
  await expect(conflict).toHaveText('This Sai Connect ID is already booked at Anand Vilas Enclave / Tent A / Block 1 / Bed 25.');
  await expect(page.getByRole('button', { name: 'Allocate', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Allocate', exact: true }).click({ force: true });
  expect(allocationRequests).toBe(0);
});

test('keeps the precise Sai Connect conflict if another operator books after verification', async ({ page }) => {
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
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: true,
          saiConnectId: '808675',
          fullName: 'New Delegate',
          age: 35,
          mobileNo: '9876543210',
          gender: 'Male',
          verifiedCategories: ['delegate'],
          registrations: [],
          verificationToken: 'verified-token',
          existingAllocation: null,
        },
      });
    }
    if (path.endsWith('/beds/1/allocate') && request.method() === 'POST') {
      return route.fulfill({
        status: 400,
        headers,
        json: {
          error: 'sai_connect_already_allocated',
          message: 'This Sai Connect ID is already booked at Anand Vilas Enclave / Tent A / Block 1 / Bed 25.',
        },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 1: Available').click();
  await page.getByPlaceholder('Sai Connect ID or phone').fill('808675');
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.locator('input[name="startDate"]').fill('2026-11-05');
  await page.locator('input[name="endDate"]').fill('2026-11-24');
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect(page.getByText('This Sai Connect ID is already booked at Anand Vilas Enclave / Tent A / Block 1 / Bed 25.')).toBeVisible();
  await expect(page.getByText('Bed 1 is already booked. Please choose another available bed.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Allocate bed — Bed 1' })).toBeVisible();
});

test('prefills and locks Sai gender while blocking a gender mismatch', async ({ page }) => {
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
            block: { index: 1, name: 'Male Delegates', genderRestriction: 'male_only', allowedCategories: ['delegate'] },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: true,
          fullName: 'Verified Female Delegate',
          mobileNo: '9876543210',
          gender: 'Female',
          verifiedCategories: ['delegate'],
          verificationToken: 'female-delegate-token',
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
  await page.getByPlaceholder('Sai Connect ID or phone').fill('808675');
  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.getByPlaceholder('Full name')).toHaveValue('Verified Female Delegate');
  await expect(page.locator('select[name="gender"]')).toHaveValue('Female');
  await expect(page.locator('select[name="gender"]')).toBeDisabled();
  await expect(page.getByRole('alert', { name: 'Gender mismatch' })).toHaveText(
    'Gender mismatch: this block is restricted to male guests only.',
  );
  await expect(page.getByRole('button', { name: 'Save & Next' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Allocate', exact: true })).toBeDisabled();
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

  const delegatePicker = page.getByRole('combobox', { name: 'Caretaker for' });
  await expect(page.getByRole('searchbox', { name: 'Search Delegates' })).toHaveCount(0);
  await delegatePicker.fill('Lakshmi');

  await expect(page.getByRole('option', { name: 'Lakshmi Delegate — Bed 2' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Arun Delegate — Bed 1' })).toHaveCount(0);
  await page.getByRole('option', { name: 'Lakshmi Delegate — Bed 2' }).click();
  await expect(delegatePicker).toHaveValue('Lakshmi Delegate — Bed 2');

  await delegatePicker.fill('1');
  await expect(page.getByRole('option', { name: 'Arun Delegate — Bed 1' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Lakshmi Delegate — Bed 2' })).toHaveCount(0);
});

test('shows verified Sai categories without exposing the backend Devotee default', async ({ page }) => {
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
      if (identifier === '777777') {
        return route.fulfill({
          status: 503,
          headers,
          json: { message: 'Sai Connect is temporarily unavailable.' },
        });
      }
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: false,
          outcome: 'not_registered',
          message: 'Participant not registered.',
          validIdentifier: true,
          defaultCategory: 'devotee',
          verificationToken: 'valid-unregistered-token',
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
  const verifiedCategoryOutcome = page.locator('[role="status"].bg-emerald-50');

  await expect(page.getByText('Sai Connect lookup is optional')).toBeVisible();
  await expect(page.getByText('Complete Sai Connect lookup')).toHaveCount(0);

  await identifier.fill('239910');
  await verify.click();
  await expect(verifiedCategoryOutcome).toContainText('Delegate');
  await expect(verifiedCategoryOutcome).toContainText('Sai Connect verified');
  await expect(page.getByText('Complete Sai Connect lookup')).toHaveCount(0);

  await identifier.fill('888888');
  await expect(page.getByText('Complete Sai Connect lookup')).toHaveCount(0);
  await verify.click();
  await expect(verifiedCategoryOutcome).toContainText('Sevadal');

  await identifier.fill('999999');
  await verify.click();

  await expect(verifiedCategoryOutcome).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Sai Connect lookup result' })).toContainText(
    'No Delegate or Sevadal registration was found. You can continue with the normal allocation flow.',
  );
  await expect(identifier).toHaveValue('999999');
  await expect(page.getByText('Continue as a Devotee')).toHaveCount(0);
  await expect(page.getByText(/Booking as: devotee/i)).toHaveCount(0);
  await expect(page.getByText('Participant not registered.')).toHaveCount(0);
  await expect(page.getByText('Complete Sai Connect lookup')).toHaveCount(0);

  await identifier.fill('777777');
  await verify.click();
  await expect(page.getByRole('alert', { name: 'Sai Connect lookup error' })).toHaveText(
    'Sai Connect could not be checked. Try again.',
  );
});

async function mockOccupiedSaiBooking(page, role) {
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
        json: { user: { id: role === 'admin' ? 1 : 10, username: role, role, locationId: role === 'admin' ? null : 61 } },
      });
    }
    if (path === '/api/locations/61/tents/1/blocks/1') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: { index: 1, name: 'Delegates', genderRestriction: 'both', allowedCategories: ['delegate', 'sevadal'] },
          },
          blockSize: 1,
          beds: {
            1: {
              id: 101,
              name: 'Verified Delegate',
              phone: '9876543210',
              status: 'confirmed',
              accommodationCategory: 'delegate',
              startDate: '2026-11-05',
              endDate: '2026-11-24',
              gender: 'Male',
              saiConnectId: '808675',
              saiConnectAge: 35,
              categorySource: 'sai_connect',
              verifiedCategories: ['delegate'],
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
  await page.getByTitle(/Bed 1: Verified Delegate/).click();
}

test('shows saved Sai Connect ID and age for an occupied booking', async ({ page }) => {
  await mockOccupiedSaiBooking(page, 'location_user');

  const details = page.getByRole('region', { name: 'Sai Connect details' });
  await expect(details.getByText('808675', { exact: true })).toBeVisible();
  await expect(details.getByText('35 years', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Accommodation category')).toHaveCount(0);
  await expect(page.getByPlaceholder('Full name')).toBeDisabled();
  await expect(page.locator('input[name="phone"]')).toBeDisabled();
  await expect(page.locator('select[name="gender"]')).toBeDisabled();
});

test('only an admin can edit the accommodation category of an occupied booking', async ({ page }) => {
  await mockOccupiedSaiBooking(page, 'admin');

  await expect(page.getByLabel('Accommodation category')).toBeVisible();
  await expect(page.getByPlaceholder('Full name')).toBeEnabled();
  await expect(page.locator('input[name="phone"]')).toBeEnabled();
  await expect(page.locator('select[name="gender"]')).toBeEnabled();
});

test('books without photos using one authoritative success outcome when S3 is unavailable', async ({ page }) => {
  let submittedPayload;
  let bookingAttempted = false;
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
            block: { index: 1, name: 'Mixed', genderRestriction: 'both', allowedCategories: ['delegate', 'sevadal', 'devotee'] },
          },
          blockSize: 1,
          beds: bookingAttempted ? {
            1: {
              id: 501,
              ...submittedPayload,
              status: 'confirmed',
              accommodationCategory: 'devotee',
              personPhotoKey: null,
              aadhaarPhotoKey: null,
            },
          } : {},
        },
      });
    }
    if (path === '/api/upload-url') {
      return route.fulfill({ status: 503, headers, json: { error: 's3_unavailable' } });
    }
    if (path.endsWith('/beds/1/allocate') && request.method() === 'POST') {
      submittedPayload = request.postDataJSON();
      bookingAttempted = true;
      return route.fulfill({
        status: 503,
        headers,
        json: { error: 'response_lost', message: 'The connection dropped after saving.' },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 1: Available').click();

  await expect(page.getByText('Photos are optional')).toBeVisible();
  await page.getByPlaceholder('Full name').fill('No Photo Guest');
  await page.locator('input[name="phone"]').fill('9876543210');
  await page.locator('input[name="startDate"]').fill('2026-11-05');
  await page.locator('input[name="endDate"]').fill('2026-11-24');
  await page.getByRole('button', { name: 'Allocate', exact: true }).click();

  await expect.poll(() => submittedPayload).toBeTruthy();
  expect(submittedPayload.personPhotoKey).toBeFalsy();
  expect(submittedPayload.aadhaarPhotoKey).toBeFalsy();
  await expect(page.getByText('Saved with warning')).toBeVisible();
  await expect(page.getByText('The booking for No Photo Guest is saved in bed 1 without photos. The connection dropped after saving, so the bed was rechecked.')).toBeVisible();
  await expect(page.getByText(/Failed to save|another operator|just booked by someone else/i)).toHaveCount(0);
  await expect(page.getByTitle(/Bed 1: No Photo Guest/)).toBeVisible();
});

test('clears invalid or unapproved Sai Connect identifiers and shows the reason beside Verify', async ({ page }) => {
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
            block: { index: 1, name: 'Mixed', genderRestriction: 'both', allowedCategories: ['delegate', 'sevadal', 'devotee'] },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      const { identifier } = request.postDataJSON();
      const notApproved = identifier === '222222';
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: false,
          outcome: notApproved ? 'not_approved' : 'invalid',
          validIdentifier: false,
          clearIdentifier: true,
          message: notApproved ? 'Sai Connect ID not approved.' : 'Invalid Sai connect ID.',
          defaultCategory: 'devotee',
        },
      });
    }
    if (path === '/api/upload-url') return route.fulfill({ status: 503, headers, json: {} });
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByTitle('Bed 1: Available').click();
  const identifier = page.getByPlaceholder('Sai Connect ID or phone');

  await identifier.fill('111111');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(identifier).toHaveValue('');
  await expect(page.getByRole('alert', { name: 'Sai Connect lookup error' })).toHaveText('Invalid Sai connect ID.');

  await identifier.fill('222222');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(identifier).toHaveValue('');
  await expect(page.getByRole('alert', { name: 'Sai Connect lookup error' })).toHaveText('Sai Connect ID not approved.');
});

test('locks Sai-sourced profile fields for location users but leaves admins in control', async ({ page }) => {
  let role = 'location_user';
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
      return route.fulfill({ status: 200, headers, json: { user: { id: 10, username: role, role, locationId: role === 'admin' ? null : 61 } } });
    }
    if (path === '/api/locations/61/tents/1/blocks/1') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: { index: 1, name: 'Mixed', genderRestriction: 'both', allowedCategories: ['delegate', 'sevadal', 'devotee'] },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    if (path === '/api/sai-connect/lookup' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          matched: true,
          saiConnectId: '808675',
          fullName: 'Verified Delegate',
          mobileNo: '9876543210',
          gender: 'Female',
          verifiedCategories: ['delegate'],
          verificationToken: 'verified-token',
        },
      });
    }
    if (path === '/api/upload-url') return route.fulfill({ status: 503, headers, json: {} });
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  async function openAndVerify() {
    await page.goto('/locations/61/tents/1/blocks/1');
    await page.getByTitle('Bed 1: Available').click();
    await page.getByPlaceholder('Sai Connect ID or phone').fill('808675');
    await page.getByRole('button', { name: 'Verify' }).click();
  }

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await openAndVerify();
  await expect(page.getByPlaceholder('Sai Connect ID or phone')).toBeDisabled();
  await expect(page.getByPlaceholder('Full name')).toBeDisabled();
  await expect(page.locator('input[name="phone"]')).toBeDisabled();
  await expect(page.locator('select[name="gender"]')).toBeDisabled();

  role = 'admin';
  await page.getByRole('button', { name: 'Cancel' }).click();
  await openAndVerify();
  await expect(page.getByPlaceholder('Sai Connect ID or phone')).toBeEnabled();
  await expect(page.getByPlaceholder('Full name')).toBeEnabled();
  await expect(page.locator('input[name="phone"]')).toBeEnabled();
  await expect(page.locator('select[name="gender"]')).toBeEnabled();
});

test('lets an admin update block category tags directly from the bed view', async ({ page }) => {
  let updatedCategories = ['delegate', 'sevadal', 'devotee'];
  let patchPayload;
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
    if (path === '/api/locations/61/tents/1/blocks/1' && request.method() === 'PATCH') {
      patchPayload = request.postDataJSON();
      updatedCategories = patchPayload.allowedCategories;
      return route.fulfill({ status: 200, headers, json: { ok: true } });
    }
    if (path === '/api/locations/61/tents/1/blocks/1') {
      return route.fulfill({
        status: 200,
        headers,
        json: {
          meta: {
            location: { id: '61', name: 'Test Location' },
            tent: { index: 1, name: 'Test Tent' },
            block: { index: 1, name: 'Mixed', genderRestriction: 'both', allowedCategories: updatedCategories },
          },
          blockSize: 1,
          beds: {},
        },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${path}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/locations/61/tents/1/blocks/1');
  await page.getByLabel('Allowed categories').selectOption('delegate,sevadal');

  await expect.poll(() => patchPayload).toEqual({ allowedCategories: ['delegate', 'sevadal'] });
  const tags = page.getByRole('region', { name: 'Allowed accommodation categories' });
  await expect(tags.getByText('Delegate', { exact: true })).toBeVisible();
  await expect(tags.getByText('Sevadal', { exact: true })).toBeVisible();
  await expect(tags.getByText('Devotee', { exact: true })).toHaveCount(0);
});
