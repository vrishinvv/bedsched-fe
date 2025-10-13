'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchLocation, updateCapacity, allocateBed, editAllocation, deallocateBed } from '@/lib/api';
import BedGrid from '@/components/BedGrid';
import AllocateModal from '@/components/AllocateModal';
import Link from 'next/link';

export default function LocationPage({ params }) {
  const { id } = params;
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, bedNumber: null, data: null });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLocation(id);
        // fallback if backend not ready
        const fallback = data?.id ? data : {
          id,
          name: `Tent ${String.fromCharCode(64 + Number(id)) || id}`,
          capacity: 100,
          beds: {}, // { [n]: { name, phone, gender, startDate, endDate } }
        };
        setLocation(fallback);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const allocatedCount = useMemo(() => Object.values(location?.beds || {}).filter(Boolean).length, [location]);

  function openAllocate(n, data) {
    setModal({ open: true, bedNumber: n, data });
  }

  async function handleCapacityIncrease() {
    const next = Number(prompt('New capacity (only increase):', String(location.capacity)) || location.capacity);
    if (!Number.isFinite(next) || next < location.capacity) return;
    try {
      setPending(true);
      // optimistic update
      setLocation((loc) => ({ ...loc, capacity: next }));
      await updateCapacity(id, next);
    } catch (e) {
      alert('Failed to update capacity');
    } finally { setPending(false); }
  }

  async function handleSave(payload) {
    const n = modal.bedNumber;
    const isEdit = Boolean(modal.data);
    try {
      setPending(true);
      // optimistic
      setLocation((loc) => ({ ...loc, beds: { ...loc.beds, [n]: payload } }));
      if (isEdit) await editAllocation(id, n, payload); else await allocateBed(id, n, payload);
      setModal({ open: false, bedNumber: null, data: null });
    } catch (e) {
      alert('Failed to save');
    } finally { setPending(false); }
  }

  async function handleDelete() {
    const n = modal.bedNumber;
    try {
      setPending(true);
      // optimistic
      setLocation((loc) => {
        const nextBeds = { ...loc.beds }; delete nextBeds[n];
        return { ...loc, beds: nextBeds };
      });
      await deallocateBed(id, n);
      setModal({ open: false, bedNumber: null, data: null });
    } catch (e) {
      alert('Failed to deallocate');
    } finally { setPending(false); }
  }

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:underline">← Back</Link>
          {/* <h2 className="text-xl font-semibold">{location.name}</h2> */}
          {/* <p className="text-sm text-gray-600">Allocated: {allocatedCount} / {location.capacity}</p> */}
        </div>
        {/* <div className="flex items-center gap-2">
          <button onClick={handleCapacityIncrease} disabled={pending} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50">Increase capacity</button>
        </div> */}
      </div>

      {/* Legend */}
      {/* <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2"><span className="inline-block h-4 w-4 rounded bg-red-500" /> Allocated</div>
        <div className="flex items-center gap-2"><span className="inline-block h-4 w-4 rounded bg-gray-200" /> Available</div>
      </div> */}

      {/* Grid */}
      <BedGrid capacity={location.capacity} beds={location.beds} onSelect={openAllocate} />

      {/* Modal */}
      <AllocateModal
        open={modal.open}
        onClose={() => setModal({ open: false, bedNumber: null, data: null })}
        bedNumber={modal.bedNumber}
        initialData={modal.data}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </main>
  );
}