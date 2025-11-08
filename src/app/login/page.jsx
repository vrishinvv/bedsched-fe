"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[70vh] items-center justify-center gap-6 lg:gap-8 xl:gap-12">
      {/* Swami Image - Top on mobile, Left on desktop */}
      <div className="relative w-full max-w-sm lg:max-w-none lg:w-96 h-64 sm:h-80 lg:h-[500px]">
        {/* Top gradient fade - lighter on mobile, darker on desktop */}
        <div className="absolute top-0 left-0 right-0 h-16 lg:h-24 bg-gradient-to-b from-black/60 via-black/30 to-transparent lg:from-black lg:via-black/70 z-10" />
        {/* Bottom gradient fade - lighter on mobile, darker on desktop */}
        <div className="absolute bottom-0 left-0 right-0 h-24 lg:h-40 bg-gradient-to-t from-black/60 via-black/30 to-transparent lg:from-black lg:via-black/70 z-10" />
        {/* Right gradient fade (desktop only) */}
        <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-black via-black/60 to-transparent z-10 hidden lg:block" />
        <Image
          src="/swami-hd-2.png"
          alt="Bhagawan Sri Sathya Sai Baba"
          fill
          className="object-cover rounded-2xl shadow-2xl lg:object-[center_30%]"
          style={{ objectPosition: 'center center' }}
          priority
        />
      </div>

      {/* Login Form */}
      <div className="w-full max-w-sm lg:w-96 rounded-xl border border-gray-200 bg-white p-6 shadow-lg text-gray-900">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Sign in to SSS Nivas</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your credentials to continue</p>
        </div>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="username">Username</label>
            <input
              id="username"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="e.g. admin"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {/* <p className="text-center text-xs text-gray-500">Try admin/admin or dashboard/dashboard</p> */}
        </form>
      </div>
    </div>
  );
}
