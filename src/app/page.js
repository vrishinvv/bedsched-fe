'use client';
import { useEffect, useMemo, useState } from 'react';
import LocationCard from '@/components/LocationCard';
import { fetchLocations } from '@/lib/api';

export default function Page() {
  const [locations, setLocations] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLocations();
        setLocations(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalCapacity = locations?.reduce((s, l) => s + (l.capacity || 0), 0) || 0;
    const totalAllocated = locations?.reduce((s, l) => s + (l.allocatedCount || 0), 0) || 0;
    const totalNotAllocated = totalCapacity - totalAllocated;
    const totalFreeingTomorrow = locations?.reduce((s, l) => s + (l.freeingTomorrow || 0), 0) || 0;
    return { totalCapacity, totalAllocated, totalNotAllocated, totalFreeingTomorrow };
  }, [locations]);

  if (loading) return <div className="text-white">Loading…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <main className="space-y-6">
      <section>
        <h2 className="mb-2 text-xl font-semibold text-white">Admin tools</h2>
        <p className="text-sm text-gray-300">Pick a location to view/allocate beds and edit capacity.</p>
      </section>

      {/* Global stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-sm">
          <div className="text-xs text-gray-400">Total capacity</div>
          <div className="text-2xl font-semibold text-white">{stats.totalCapacity}</div>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-sm">
          <div className="text-xs text-gray-400">Total allocated</div>
          <div className="text-2xl font-semibold text-white">{stats.totalAllocated}</div>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-sm">
          <div className="text-xs text-gray-400">Total not allocated</div>
          <div className="text-2xl font-semibold text-white">{stats.totalNotAllocated}</div>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-sm">
          <div className="text-xs text-gray-400">Frees tomorrow</div>
          <div className="text-2xl font-semibold text-white">{stats.totalFreeingTomorrow}</div>
        </div>
      </section>

      {/* Locations */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations?.map((loc) => (
          <LocationCard key={loc.id} location={loc} />
        ))}
      </section>
    </main>
  );
}