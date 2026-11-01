import { expect, test } from '@playwright/test';

test('historical deallocations show Sai profile details for expired and manually deallocated bookings', async ({ page }) => {
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
        json: { user: { id: 1, username: 'admin', role: 'admin', locationId: null } },
      });
    }
    if (url.pathname === '/api/locations') {
      return route.fulfill({ status: 200, headers, json: [] });
    }
    if (url.pathname === '/api/allocations/historical-deallocations') {
      const shared = {
        phone: '9876543210',
        gender: 'Male',
        start_date: '2026-11-05',
        end_date: '2026-11-19',
        bed_number: 7,
        location_name: 'Test Location',
        tent_index: 1,
        tent_name: 'Test Tent',
        block_index: 1,
        block_name: 'Test Block',
      };
      return route.fulfill({
        status: 200,
        headers,
        json: {
          ok: true,
          date: '2026-11-01',
          previousDate: '2026-10-31',
          manualCount: 1,
          expiredCount: 1,
          expiredAllocations: [{
            ...shared,
            id: 101,
            name: 'Expired Delegate',
            accommodation_category: 'delegate',
            sai_connect_id: '808675',
            sai_connect_age: 35,
          }],
          manualDeallocations: [{
            ...shared,
            id: 102,
            name: 'Former Sevadal',
            accommodation_category: 'sevadal',
            sai_connect_id: '239910',
            sai_connect_age: 41,
            deleted_at: '2026-11-01T10:30:00.000Z',
            reason: 'left_early',
            deallocated_by: 'admin',
          }],
        },
      });
    }
    return route.fulfill({ status: 404, headers, json: { error: `Unexpected request: ${url.pathname}` } });
  });

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.setItem('bs_token', 'playwright-token'));
  await page.goto('/admin/historical-deallocations');

  await expect(page.getByText('Expired Delegate', { exact: true })).toBeVisible();
  await expect(page.getByText('808675', { exact: true })).toBeVisible();
  await expect(page.getByText('Delegate · Age 35', { exact: true })).toBeVisible();
  await expect(page.getByText('Former Sevadal', { exact: true })).toBeVisible();
  await expect(page.getByText('239910', { exact: true })).toBeVisible();
  await expect(page.getByText('Sevadal · Age 41', { exact: true })).toBeVisible();
});
