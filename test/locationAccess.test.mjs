import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessLocation,
  filterBatchesForUser,
  getUserLocationIds,
} from '../src/lib/locationAccess.mjs';

test('normalizes multi-location users and supports legacy locationId', () => {
  assert.deepEqual(getUserLocationIds({ locationIds: [4, '7', 4] }), [4, 7]);
  assert.deepEqual(getUserLocationIds({ locationId: '9' }), [9]);
});

test('location users can open every assigned location', () => {
  const user = { role: 'location_user', locationId: 1, locationIds: [1, 2, 3, 4] };
  assert.equal(canAccessLocation(user, 4), true);
  assert.equal(canAccessLocation(user, 5), false);
});

test('batch filtering retains allocations across all assigned locations', () => {
  const batches = [{ batchId: 'a', items: [{ locationId: 1 }, { locationId: 2 }, { locationId: 9 }] }];
  assert.deepEqual(
    filterBatchesForUser(batches, { role: 'location_user', locationIds: [1, 2] })[0].items,
    [{ locationId: 1 }, { locationId: 2 }],
  );
});
