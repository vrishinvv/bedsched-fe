"use client";

import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { createAdminUser, fetchAdminUsers, getLocations } from '@/lib/api';
import { ADMIN_USER_ROLES, AdminUserFormError, validateAdminUserForm } from '@/lib/adminUsers.mjs';

const EMPTY_FORM = {
  username: '',
  password: '',
  confirmPassword: '',
  role: 'location_user',
  locationId: '',
};

const ROLE_LABELS = Object.fromEntries(ADMIN_USER_ROLES.map(({ value, label }) => [value, label]));

function formatCreatedAt(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function UserAccountsContent() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResult, locationsResult] = await Promise.all([
        fetchAdminUsers(),
        getLocations(),
      ]);
      setUsers(usersResult.users || []);
      setLocations(Array.isArray(locationsResult) ? locationsResult : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load account data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'role' && value !== 'location_user' ? { locationId: '' } : {}),
    }));
    setFieldError('');
    setError('');
    setCreatedCredentials(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldError('');
    setCreatedCredentials(null);

    let payload;
    try {
      payload = validateAdminUserForm(form);
    } catch (validationError) {
      if (validationError instanceof AdminUserFormError) {
        setFieldError(validationError.field);
        setError(validationError.message);
        return;
      }
      throw validationError;
    }

    setSubmitting(true);
    try {
      const result = await createAdminUser(payload);
      setUsers((current) => [...current, result.user].sort((a, b) => a.username.localeCompare(b.username)));
      setCreatedCredentials({ username: payload.username, password: payload.password });
      setForm(EMPTY_FORM);
    } catch (submitError) {
      setFieldError(submitError.response?.data?.field || '');
      setError(submitError.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(
      `Username: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`
    );
  };

  const inputClass = (field) => `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 ${
    fieldError === field
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
  }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Accounts</h1>
        <p className="mt-1 text-sm text-gray-400">Create login accounts and assign the minimum access each person needs.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="h-fit rounded-xl border border-white/10 bg-gray-900 p-5 shadow-xl">
          <h2 className="text-lg font-semibold text-white">Create account</h2>
          <p className="mt-1 text-xs text-gray-400">Passwords are stored securely and cannot be viewed again later.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {createdCredentials && (
            <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-100">
              <div className="font-medium">Account created</div>
              <div className="mt-2 font-mono text-xs">Username: {createdCredentials.username}</div>
              <div className="font-mono text-xs">Password: {createdCredentials.password}</div>
              <button
                type="button"
                onClick={copyCredentials}
                className="mt-3 rounded-md border border-green-400/30 px-2.5 py-1.5 text-xs font-medium hover:bg-green-400/10"
              >
                Copy credentials
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-200">Username</label>
              <input
                id="username"
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                className={inputClass('username')}
                autoComplete="off"
                placeholder="e.g. anv_21"
                minLength={3}
                maxLength={50}
                required
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-gray-200">Role</label>
              <select
                id="role"
                value={form.role}
                onChange={(event) => updateField('role', event.target.value)}
                className={inputClass('role')}
              >
                {ADMIN_USER_ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                {form.role === 'location_user' && 'Can manage bookings only for the assigned location.'}
                {form.role === 'dashboard' && 'Can view the dashboard and use smart reserve.'}
                {form.role === 'admin' && 'Has full access, including creating other accounts.'}
              </p>
            </div>

            {form.role === 'location_user' && (
              <div>
                <label htmlFor="locationId" className="mb-1.5 block text-sm font-medium text-gray-200">Location</label>
                <select
                  id="locationId"
                  value={form.locationId}
                  onChange={(event) => updateField('locationId', event.target.value)}
                  className={inputClass('locationId')}
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-200">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className={inputClass('password')}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-200">Confirm password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                className={inputClass('confirmPassword')}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                  className="rounded border-gray-500"
                />
                Show passwords
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Existing accounts</h2>
              <p className="text-xs text-gray-400">{users.length} account{users.length === 1 ? '' : 's'}</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-black/20 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Loading accounts…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No accounts found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="text-gray-200 hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-white">{user.username}</td>
                    <td className="whitespace-nowrap px-5 py-3">{ROLE_LABELS[user.role] || user.role}</td>
                    <td className="px-5 py-3 text-gray-400">{user.location_name || 'All locations'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-400">{formatCreatedAt(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function UserAccountsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UserAccountsContent />
    </ProtectedRoute>
  );
}
