'use client';
import { useEffect, useMemo, useState } from 'react';
import LocationCard from '@/components/LocationCard';
import { CardSkeleton, StatCardSkeleton, HeaderSkeleton } from '@/components/Skeleton';
import RegisterModal from '@/components/RegisterModal';
import Link from 'next/link';
import { fetchLocations, smartReserve, getMe } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [regOpen, setRegOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [adminSearch, setAdminSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLocations();
        setLocations(data);
        const me = await getMe().catch(()=>null);
        if (!me || !me.user) {
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }
        setRole(me?.user?.role || null);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const stats = useMemo(() => {
    const totalCapacity = locations.reduce((s, l) => s + (l.capacity || 0), 0);
    const totalAllocated = locations.reduce((s, l) => s + (l.allocatedCount || 0), 0);
    const totalNotAllocated = totalCapacity - totalAllocated;
    const totalFreeingTomorrow = locations.reduce((s, l) => s + (l.freeingTomorrow || 0), 0);
    const totalReserved = locations.reduce((s, l) => s + (l.reservedCount || 0), 0);
    return { totalCapacity, totalAllocated, totalNotAllocated, totalFreeingTomorrow, totalReserved };
  }, [locations]);

  const locationNames = useMemo(() => {
    const m = {};
    for (const l of locations) m[l.id] = l.name;
    return m;
  }, [locations]);

  if (loading) {
    return (
      <main className="space-y-6">
        {/* Header skeleton */}
        <HeaderSkeleton />

        {/* Stats skeleton */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </section>

        {/* Location cards skeleton */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Enhanced Header Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 border border-blue-500/20 p-4 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Global Overview
          </h2>
          <p className="text-sm sm:text-base text-blue-200/80">Monitor accommodation across all locations</p>
          <div className="mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
            <button onClick={()=>setRegOpen(true)} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium shadow text-sm sm:text-base touch-manipulation">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Reserve
            </button>
            {/* {role === 'admin' && (
              <Link href="/admin/confirm" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-medium shadow">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"/></svg>
                Search & Confirm
              </Link>
            )} */}
          </div>
        </div>
      </section>

      {/* Enhanced Global Stats Dashboard - visible to all, clickable only for admin */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* Total Capacity */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600/10 via-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-3 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-400/40 touch-manipulation">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m-2 0h2m0 0h6m-7-10h6m-6 4h6m6-7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-blue-300/70 font-medium mb-1">Total Capacity</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{stats.totalCapacity.toLocaleString()}</div>
          </div>
        </div>

        {/* Total Allocated */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-600/10 via-red-500/10 to-orange-500/10 border border-red-500/20 p-3 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-red-400/40 touch-manipulation">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-red-300/70 font-medium mb-1">Total Allocated</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{stats.totalAllocated.toLocaleString()}</div>
          </div>
        </div>

        {/* Available Beds */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600/10 via-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-3 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-emerald-400/40 touch-manipulation">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-emerald-300/70 font-medium mb-1">Available Beds</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{stats.totalNotAllocated.toLocaleString()}</div>
          </div>
        </div>

        {/* Frees Tomorrow */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-600/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/20 p-3 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-amber-400/40 touch-manipulation">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-300/70 font-medium mb-1">Frees Tomorrow</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{stats.totalFreeingTomorrow.toLocaleString()}</div>
          </div>
        </div>

        {/* Reserved Active */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-600/10 via-blue-500/10 to-indigo-500/10 border border-sky-500/20 p-3 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-sky-400/40 touch-manipulation col-span-2 md:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-sky-500/20 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7m0 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-sky-300/70 font-medium mb-1">Active Reservations</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{stats.totalReserved.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* Location cards - visible to all, clickable only for admin */}
      <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <LocationCard key={loc.id} location={loc} isClickable={role === 'admin'} />
        ))}
      </section>
      
      {/* Dashboard user message */}
      {role === 'dashboard' && (
        <div className="text-center py-4">
          <div className="inline-block px-6 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              Use the <span className="font-bold">Register</span> button above to create reservations
            </p>
          </div>
        </div>
      )}

      {err ? <p className="text-sm text-amber-400">{err}</p> : null}

      <RegisterModal
        open={regOpen}
        onClose={()=>setRegOpen(false)}
        smartReserveFn={smartReserve}
        locationNames={locationNames}
        onSuccess={async ()=>{
          try {
            const data = await fetchLocations();
            setLocations(data);
          } catch {}
        }}
      />
    </main>
  );
}
