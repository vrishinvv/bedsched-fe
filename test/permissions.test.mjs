import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageAccommodationStructure, canViewAnalytics } from '../src/lib/permissions.mjs';

test('only admins can manage accommodation structure', () => {
  assert.equal(canManageAccommodationStructure({ role: 'admin' }), true);
  assert.equal(canManageAccommodationStructure({ role: 'location_user' }), false);
  assert.equal(canManageAccommodationStructure({ role: 'dashboard' }), false);
  assert.equal(canManageAccommodationStructure(null), false);
});

test('admins and dashboard users can view analytics', () => {
  assert.equal(canViewAnalytics({ role: 'admin' }), true);
  assert.equal(canViewAnalytics({ role: 'dashboard' }), true);
  assert.equal(canViewAnalytics({ role: 'location_user' }), false);
  assert.equal(canViewAnalytics(null), false);
});
