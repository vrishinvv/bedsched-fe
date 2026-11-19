import { expect, test } from '@playwright/test';

const states = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
];

async function mockRoomStatus(page, role) {
  await page.addInitScript(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  let savedStateCode = null;

  await page.route('http://localhost:3001/api/**', async (route) => {
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
      return route.fulfill({ status: 200, headers, json: { user: { id: 1, username: role, role } } });
    }
    if (path === '/api/room-status' && request.method() === 'GET') {
      const savedState = states.find((state) => state.code === savedStateCode);
      return route.fulfill({
        status: 200,
        headers,
        json: {
          canEditStateAssignments: role === 'admin',
          states,
          refreshedAt: '2026-11-19T04:30:00.000Z',
          locations: [{
            id: 5,
            name: 'New Block C',
            rooms: [
              { id: 301, name: 'C301', section: 'Third Floor', capacity: 4, peopleCount: 1, stateCode: savedState?.code || null, stateName: savedState?.name || null },
              { id: 302, name: 'C302', section: 'Third Floor', capacity: 4, peopleCount: 0, stateCode: 'TS', stateName: 'Telangana' },
            ],
          }],
        },
      });
    }
    if (path === '/api/room-status/301/state' && request.method() === 'PATCH') {
      savedStateCode = request.postDataJSON().stateCode;
      const state = states.find((option) => option.code === savedStateCode);
      return route.fulfill({
        status: 200,
        headers,
        json: { ok: true, assignment: state ? { blockId: 301, stateCode: state.code, stateName: state.name } : null },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected mocked request: ${path}` } });
  });

  return { getSavedStateCode: () => savedStateCode };
}

test('admin can search, save, filter, and export room state assignments', async ({ page }) => {
  const api = await mockRoomStatus(page, 'admin');
  await page.goto('/room-status');

  await expect(page.getByRole('heading', { name: 'Room Status' })).toBeVisible();
  await expect(page.getByText('50% coverage')).toBeVisible();
  await expect(page.getByText('Telangana', { exact: true }).first()).toBeVisible();

  await page.getByRole('combobox', { name: 'Allocated state for C301' }).fill('Tamil Nadu');
  await expect.poll(api.getSavedStateCode).toBe('TN');
  await expect(page.getByText('100% coverage')).toBeVisible();

  await page.getByRole('combobox', { name: 'Allocated state', exact: true }).selectOption('TN');
  await expect(page.getByRole('row', { name: /C301/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /C302/ })).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Generate CSV/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^room-state-allocations-\d{4}-\d{2}-\d{2}\.csv$/);
});

test('non-admin viewers see saved states without edit controls', async ({ page }) => {
  await mockRoomStatus(page, 'dashboard');
  await page.goto('/room-status');

  await expect(page.getByText('Telangana', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Allocated state for/ })).toHaveCount(0);
});
