import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageAccommodationStructure } from '../src/lib/permissions.mjs';

test('only admins can manage accommodation structure', () => {
  assert.equal(canManageAccommodationStructure({ role: 'admin' }), true);
  assert.equal(canManageAccommodationStructure({ role: 'location_user' }), false);
  assert.equal(canManageAccommodationStructure({ role: 'dashboard' }), false);
  assert.equal(canManageAccommodationStructure(null), false);
});
