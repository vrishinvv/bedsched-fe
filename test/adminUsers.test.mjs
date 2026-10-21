import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminUserFormError, validateAdminUserForm } from '../src/lib/adminUsers.mjs';

test('builds a normalized location-user payload', () => {
  assert.deepEqual(
    validateAdminUserForm({
      username: '  anv_21 ',
      password: 'safe-password',
      confirmPassword: 'safe-password',
      role: 'location_user',
      locationId: '61',
    }),
    {
      username: 'anv_21',
      password: 'safe-password',
      role: 'location_user',
      locationId: 61,
    }
  );
});

test('removes location assignment from global roles', () => {
  const result = validateAdminUserForm({
    username: 'dashboard.user',
    password: 'safe-password',
    confirmPassword: 'safe-password',
    role: 'dashboard',
    locationId: '61',
  });

  assert.equal(result.locationId, null);
});

test('rejects mismatched passwords', () => {
  assert.throws(
    () => validateAdminUserForm({
      username: 'valid.user',
      password: 'safe-password',
      confirmPassword: 'different-password',
      role: 'dashboard',
      locationId: '',
    }),
    (error) => error instanceof AdminUserFormError && error.field === 'confirmPassword'
  );
});

test('requires a location for location users', () => {
  assert.throws(
    () => validateAdminUserForm({
      username: 'valid.user',
      password: 'safe-password',
      confirmPassword: 'safe-password',
      role: 'location_user',
      locationId: '',
    }),
    (error) => error instanceof AdminUserFormError && error.field === 'locationId'
  );
});
