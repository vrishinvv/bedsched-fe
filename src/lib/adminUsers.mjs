export const ADMIN_USER_ROLES = Object.freeze([
  { value: 'location_user', label: 'Location user' },
  { value: 'dashboard', label: 'Dashboard user' },
  { value: 'admin', label: 'Administrator' },
]);

const VALID_ROLES = new Set(ADMIN_USER_ROLES.map(({ value }) => value));
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export class AdminUserFormError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'AdminUserFormError';
    this.field = field;
  }
}

export function validateAdminUserForm(form) {
  const username = form.username.trim();
  const password = form.password;
  const role = form.role;

  if (username.length < 3 || username.length > 50 || !USERNAME_PATTERN.test(username)) {
    throw new AdminUserFormError(
      'Username must be 3–50 characters and use only letters, numbers, periods, underscores, or hyphens.',
      'username'
    );
  }
  if (password.length < 8) {
    throw new AdminUserFormError('Password must be at least 8 characters.', 'password');
  }
  if (password !== form.confirmPassword) {
    throw new AdminUserFormError('Passwords do not match.', 'confirmPassword');
  }
  if (!VALID_ROLES.has(role)) {
    throw new AdminUserFormError('Select a valid role.', 'role');
  }

  const locationId = role === 'location_user' ? Number(form.locationId) : null;
  if (role === 'location_user' && (!Number.isSafeInteger(locationId) || locationId <= 0)) {
    throw new AdminUserFormError('Select a location for this user.', 'locationId');
  }

  return { username, password, role, locationId };
}
