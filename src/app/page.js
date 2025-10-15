'use client';
import { useEffect, useMemo, useState } from 'react';
import LocationCard from '@/components/LocationCard';
import { fetchLocations } from '@/lib/api';

export default function Page() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLocations();
        setLocations(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalCapacity = locations.reduce((s, l) => s + (l.capacity || 0), 0);
    const totalAllocated = locations.reduce((s, l) => s + (l.allocatedCount || 0), 0);
    const totalNotAllocated = totalCapacity - totalAllocated;
    const totalFreeingTomorrow = locations.reduce((s, l) => s + (l.freeingTomorrow || 0), 0);
    return { totalCapacity, totalAllocated, totalNotAllocated, totalFreeingTomorrow };
  }, [locations]);

  if (loading) return <div>Loading…</div>;

  return (
    <main className="space-y-6">
      {/* Enhanced Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 border border-blue-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Global Overview
          </h2>
          <p className="text-blue-200/80">Monitor accommodation across all locations</p>
        </div>
      </section>

      {/* Enhanced Global Stats Dashboard */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Capacity */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m-2 0h2m0 0h6m-7-10h6m-6 4h6m6-7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
            </div>
            <div className="text-xs text-blue-300/70 font-medium mb-1">Total Capacity</div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalCapacity.toLocaleString()}</div>
          </div>
        </div>

        {/* Total Allocated */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600/10 via-red-500/10 to-orange-500/10 border border-red-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-red-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xs text-red-300/70 font-medium mb-1">Total Allocated</div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalAllocated.toLocaleString()}</div>
          </div>
        </div>

        {/* Available Beds */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/10 via-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-emerald-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xs text-emerald-300/70 font-medium mb-1">Available Beds</div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalNotAllocated.toLocaleString()}</div>
          </div>
        </div>

        {/* Frees Tomorrow */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-amber-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xs text-amber-300/70 font-medium mb-1">Frees Tomorrow</div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalFreeingTomorrow.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* Location cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <LocationCard key={loc.id} location={loc} />
        ))}
      </section>

      {err ? <p className="text-sm text-amber-400">{err}</p> : null}
    </main>
  );
}
