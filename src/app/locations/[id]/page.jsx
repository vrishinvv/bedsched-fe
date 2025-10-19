'use client';
import { use, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import TentCard from '@/components/TentCard';
import { CardSkeleton, StatCardSkeleton, HeaderSkeleton } from '@/components/Skeleton';
import { fetchLocationTents } from '@/lib/api';

export default function LocationTentsPage({ params }) {
  const { id } = use(params); // location id
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchLocationTents(id);
        setData(res);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const stats = useMemo(() => {
    if (!data?.tents) return { totalCapacity: 0, totalAllocated: 0, totalNotAllocated: 0, totalFreeingTomorrow: 0 };
    
    const totalCapacity = data.tents.reduce((s, t) => s + (t.size || 0), 0);
    const totalAllocated = data.tents.reduce((s, t) => s + (t.allocated || 0), 0);
    const totalNotAllocated = totalCapacity - totalAllocated;
    const totalFreeingTomorrow = data.tents.reduce((s, t) => s + (t.freeingTomorrow || 0), 0);
    return { totalCapacity, totalAllocated, totalNotAllocated, totalFreeingTomorrow };
  }, [data]);

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

        {/* Tent cards skeleton */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </section>
      </main>
    );
  }

  if (err) return <div className="text-red-400">{err}</div>;

  const { location, tents } = data;

  return (
    <main className="space-y-6">
      {/* Enhanced Header with Purple Breadcrumb */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/20 via-purple-800/20 to-indigo-900/20 border border-purple-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="relative">
          <nav className="mb-3">
            <Link href="/" className="inline-flex items-center text-sm text-purple-300/80 hover:text-purple-200 transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Locations
            </Link>
          </nav>
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            {location.name}
          </h2>
          <p className="text-purple-200/80">Managing {tents.length} tent{tents.length !== 1 ? 's' : ''} • {stats.totalCapacity} total beds</p>
        </div>
      </section>

      {/* Enhanced Dashboard */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="p-2 bg-blue-500/20 rounded-xl w-fit mb-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m-2 0h2m0 0h6m-7-10h6m-6 4h6m6-7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="text-xs text-blue-300/70 font-medium">Total Capacity</div>
            <div className="text-2xl font-bold text-white">{stats.totalCapacity.toLocaleString()}</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600/10 via-red-500/10 to-orange-500/10 border border-red-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="p-2 bg-red-500/20 rounded-xl w-fit mb-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-xs text-red-300/70 font-medium">Total Allocated</div>
            <div className="text-2xl font-bold text-white">{stats.totalAllocated.toLocaleString()}</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/10 via-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="p-2 bg-emerald-500/20 rounded-xl w-fit mb-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-emerald-300/70 font-medium">Available Beds</div>
            <div className="text-2xl font-bold text-white">{stats.totalNotAllocated.toLocaleString()}</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="p-2 bg-amber-500/20 rounded-xl w-fit mb-3">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-amber-300/70 font-medium">Frees Tomorrow</div>
            <div className="text-2xl font-bold text-white">{stats.totalFreeingTomorrow.toLocaleString()}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tents.map((t) => (
          <TentCard key={t.index} locationId={location.id} tent={t} />
        ))}
      </section>
    </main>
  );
}
