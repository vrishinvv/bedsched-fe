import { expect, test } from '@playwright/test';

async function mockRoomStatus(page, role) {
  await page.addInitScript(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  let nextOptionId = 13;
  let options = [{ id: 11, name: 'Jharkhand', usageCount: 1 }];
  let roomAssignments = { 301: null, 302: 11 };

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
      const room = (id, name, peopleCount) => {
        const option = options.find((entry) => entry.id === roomAssignments[id]);
        return {
          id,
          name,
          section: 'Third Floor',
          capacity: 4,
          peopleCount,
          stateOptionId: option?.id || null,
          stateName: option?.name || null,
        };
      };
      return route.fulfill({
        status: 200,
        headers,
        json: {
          canEditStateAssignments: role === 'admin',
          stateOptions: options,
          refreshedAt: '2026-11-19T04:30:00.000Z',
          locations: [{ id: 5, name: 'New Block C', rooms: [room(301, 'C301', 1), room(302, 'C302', 0)] }],
        },
      });
    }
    if (path === '/api/room-state-options' && request.method() === 'POST') {
      const option = { id: nextOptionId++, name: request.postDataJSON().name.trim(), usageCount: 0 };
      options = [...options, option];
      return route.fulfill({ status: 201, headers, json: { ok: true, option } });
    }
    const optionMatch = path.match(/^\/api\/room-state-options\/(\d+)$/);
    if (optionMatch && request.method() === 'PATCH') {
      const id = Number(optionMatch[1]);
      const name = request.postDataJSON().name.trim();
      options = options.map((option) => option.id === id ? { ...option, name } : option);
      const option = options.find((entry) => entry.id === id);
      return route.fulfill({ status: 200, headers, json: { ok: true, option } });
    }
    if (optionMatch && request.method() === 'DELETE') {
      const id = Number(optionMatch[1]);
      const option = options.find((entry) => entry.id === id);
      const clearedAssignments = Object.values(roomAssignments).filter((optionId) => optionId === id).length;
      options = options.filter((entry) => entry.id !== id);
      roomAssignments = Object.fromEntries(Object.entries(roomAssignments).map(([roomId, optionId]) => [roomId, optionId === id ? null : optionId]));
      return route.fulfill({ status: 200, headers, json: { ok: true, deletedOption: option, clearedAssignments } });
    }
    const assignmentMatch = path.match(/^\/api\/room-status\/(\d+)\/state$/);
    if (assignmentMatch && request.method() === 'PATCH') {
      const roomId = Number(assignmentMatch[1]);
      const previousId = roomAssignments[roomId];
      const stateOptionId = request.postDataJSON().stateOptionId;
      roomAssignments[roomId] = stateOptionId;
      options = options.map((option) => ({
        ...option,
        usageCount: option.usageCount - (option.id === previousId ? 1 : 0) + (option.id === stateOptionId ? 1 : 0),
      }));
      const option = options.find((entry) => entry.id === stateOptionId);
      return route.fulfill({
        status: 200,
        headers,
        json: { ok: true, assignment: option ? { blockId: roomId, stateOptionId: option.id, stateName: option.name } : null },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected mocked request: ${path}` } });
  });

  return {
    getOptions: () => options,
    getRoomOptionId: (roomId) => roomAssignments[roomId],
  };
}

test('admin can add, rename, assign, filter, export, and delete custom options', async ({ page }) => {
  const api = await mockRoomStatus(page, 'admin');
  await page.goto('/room-status');

  await expect(page.getByRole('heading', { name: 'Room Status' })).toBeVisible();
  await expect(page.getByText('50% coverage')).toBeVisible();
  await expect(page.getByText('Jharkhand', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /Manage options/ }).click();
  await page.getByLabel('New option').fill('Tamil Nadu');
  await page.getByRole('button', { name: 'Add option' }).click();
  await expect.poll(() => api.getOptions().map((option) => option.name)).toContain('Tamil Nadu');

  const tamilNaduRow = page.getByText('Tamil Nadu', { exact: true }).locator('..').locator('..');
  await tamilNaduRow.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('Rename Tamil Nadu').fill('Tamil Nadu Team');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Tamil Nadu Team', { exact: true }).first()).toBeVisible();

  await page.getByRole('combobox', { name: 'Allocated state for C301' }).fill('Tamil Nadu Team');
  await expect.poll(() => api.getRoomOptionId(301)).toBe(13);
  await expect(page.getByText('100% coverage')).toBeVisible();

  await page.getByRole('combobox', { name: 'Allocated state', exact: true }).selectOption('13');
  await expect(page.getByRole('row', { name: /C301/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /C302/ })).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Generate CSV/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^room-state-allocations-\d{4}-\d{2}-\d{2}\.csv$/);

  await page.getByRole('combobox', { name: 'Allocated state', exact: true }).selectOption('all');
  const renamedRow = page.getByText('Tamil Nadu Team', { exact: true }).first().locator('..').locator('..');
  page.once('dialog', (dialog) => dialog.accept());
  await renamedRow.getByRole('button', { name: 'Delete' }).click();
  await expect.poll(() => api.getOptions().map((option) => option.name)).not.toContain('Tamil Nadu Team');
  await expect(page.getByText('50% coverage')).toBeVisible();
});

test('non-admin viewers see saved options without management or edit controls', async ({ page }) => {
  await mockRoomStatus(page, 'dashboard');
  await page.goto('/room-status');

  await expect(page.getByText('Jharkhand', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Manage options/ })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: /Allocated state for/ })).toHaveCount(0);
});
