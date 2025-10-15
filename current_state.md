# current state

locations/[id]/page.jsx
```jsx
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
```

global.css
```css
@import "tailwindcss";

body {
  font-family: Arial, Helvetica, sans-serif;
}
```

layout.js
```jsx
import './globals.css';
export const metadata = { title: 'Tent Bed Allocator' };

export default function RootLayout({ children }) {
return (
  <html lang="en">
    <body className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl p-4">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">Tent Bed Allocator</h1>
          <nav className="text-sm text-gray-400">Internal tool</nav>
        </header>
        {children}
      </div>
    </body>
  </html>
);
}
```


page.js
```jsx
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
```


components/AllocateModal.jsx
```jsx
'use client';
import { useEffect, useRef, useState } from 'react';

export default function AllocateModal({
  open,
  onClose,
  bedNumber,
  initialData, // null for new; { name, phone, gender, startDate, endDate }
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'Other',
    startDate: '',
    endDate: '',
  });
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(
        initialData || { name: '', phone: '', gender: 'Other', startDate: '', endDate: '' }
      );
    }
  }, [open, initialData]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const isEdit = Boolean(initialData);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSave() {
    // lightweight client validation
    if (!form.name || !form.startDate || !form.endDate) return alert('Name, start & end dates are required');
    onSave({ ...form });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {isEdit ? `Edit allocation — Bed ${bedNumber}` : `Allocate bed — Bed ${bedNumber}`}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Name*</label>
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none" 
              placeholder="Full name" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none" 
              placeholder="Optional" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Gender</label>
            <select 
              name="gender" 
              value={form.gender} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Start date*</label>
            <input 
              type="date" 
              name="startDate" 
              value={form.startDate} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">End date*</label>
            <input 
              type="date" 
              name="endDate" 
              value={form.endDate} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none" 
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {isEdit ? (
            <button onClick={onDelete} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Deallocate</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
            <button onClick={handleSave} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">{isEdit ? 'Save changes' : 'Allocate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```



components/BedGrid.jsx
```jsx
'use client';

export default function BedGrid({ capacity = 100, beds = {}, onSelect }) {
    // beds: { [bedNumber]: allocationOrNull }
    const items = Array.from({ length: capacity }, (_, i) => i + 1);
    console.log('Rendering BedGrid with capacity:', capacity, 'and beds:', beds);
    
    // Helper function to get today's date in YYYY-MM-DD format (IST)
    const getTodayIST = () => {
        const now = new Date();
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        
        // Format as YYYY-MM-DD
        return istTime.toISOString().split('T')[0];
    };
    
    // Helper function to determine bed status
    const getBedStatus = (allocation) => {
        if (!allocation) return 'available';
        
        const today = getTodayIST();
        const startDate = allocation.startDate;
        const endDate = allocation.endDate;
        
        if (!startDate || !endDate) return 'available';
        
        // Check if today is within the booking period
        if (today >= startDate && today <= endDate) {
            return 'current'; // Currently occupied
        } else if (startDate > today) {
            return 'future'; // Future allocation
        } else {
            return 'available'; // Past allocation (treat as available)
        }
    };
    
    // Helper function to format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    
    return (
        <div className="p-6 bg-gray-800 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">Bed Layout</h3>
                    <p className="text-sm text-gray-400">Click any bed to allocate or edit (IST timezone)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Currently Occupied</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Future Booking</span>
                    </div>
                </div>
            </div>

            {/* Current Date Display */}
            <div className="mb-4 text-center">
                <div className="inline-flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1">
                    <span className="text-xs text-gray-400">Today (IST):</span>
                    <span className="text-sm font-medium text-white">
                        {formatDate(getTodayIST())}
                    </span>
                </div>
            </div>

            {/* Bed Grid */}
            <div className="grid grid-cols-8 gap-3 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20">
                {items.map((n) => {
                    const allocation = beds?.[n];
                    const status = getBedStatus(allocation);
                    
                    // Define styles based on status
                    const getStatusStyles = () => {
                        switch (status) {
                            case 'current':
                                return {
                                    bg: 'bg-gradient-to-br from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700',
                                    glow: 'bg-red-400',
                                    shadow: 'shadow-red-500/25'
                                };
                            case 'future':
                                return {
                                    bg: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700',
                                    glow: 'bg-orange-400',
                                    shadow: 'shadow-orange-500/25'
                                };
                            default: // available
                                return {
                                    bg: 'bg-gradient-to-br from-white to-gray-100 text-black hover:from-gray-50 hover:to-gray-200',
                                    glow: 'bg-gray-300',
                                    shadow: 'shadow-gray-500/25'
                                };
                        }
                    };
                    
                    const styles = getStatusStyles();
                    
                    // Generate tooltip text
                    const getTooltipText = () => {
                        if (!allocation) return `Bed ${n}: Available`;
                        
                        const startDate = formatDate(allocation.startDate);
                        const endDate = formatDate(allocation.endDate);
                        
                        switch (status) {
                            case 'current':
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Currently Occupied`;
                            case 'future':
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Future Booking`;
                            default:
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Past Booking`;
                        }
                    };
                    
                    return (
                        <button
                            key={n}
                            onClick={() => onSelect(n, allocation || null)}
                            className={`
                                group relative aspect-square w-full rounded-xl text-xs font-bold
                                shadow-lg transition-all duration-300 ease-out transform cursor-pointer
                                hover:scale-110 hover:shadow-xl hover:z-10
                                ${styles.bg} ${styles.shadow}
                            `}
                            title={getTooltipText()}
                        >
                            {/* Bed number */}
                            <span className="relative z-10 drop-shadow-sm">{n}</span>
                            
                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm ${styles.glow}`} />
                            
                            {/* Subtle pattern overlay */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
                        </button>
                    );
                })}
            </div>

            {/* Statistics Bar */}
            <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-700/50 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xl font-bold text-white">{capacity}</div>
                        <div className="text-xs text-gray-400">Total Beds</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xl font-bold text-emerald-400">
                            {items.filter(n => getBedStatus(beds?.[n]) === 'available').length}
                        </div>
                        <div className="text-xs text-emerald-300">Available</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xl font-bold text-blue-400">
                            {items.filter(n => {
                                const status = getBedStatus(beds?.[n]);
                                return status === 'current' || status === 'future';
                            }).length}
                        </div>
                        <div className="text-xs text-blue-300">Allocated</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
```


components/LocationCard.jsx
```jsx
'use client';
import Link from 'next/link';
import StatPill from './StatPill';

export default function LocationCard({ location }) {
  const allocated = location.allocatedCount ?? 0;
  const total = location.capacity ?? 100;
  const pct = total ? Math.round((allocated / total) * 100) : 0;
  const freeingTomorrow = location.freeingTomorrow ?? 0;

  // Dynamic color based on occupancy
  const getOccupancyColor = () => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getOccupancyBgColor = () => {
    if (pct >= 90) return 'bg-red-50 border-red-200';
    if (pct >= 70) return 'bg-amber-50 border-amber-200';
    if (pct >= 50) return 'bg-blue-50 border-blue-200';
    return 'bg-emerald-50 border-emerald-200';
  };

  const getStatusText = () => {
    if (pct >= 90) return 'Critical';
    if (pct >= 70) return 'High';
    if (pct >= 50) return 'Medium';
    return 'Available';
  };

  const getStatusColor = () => {
    if (pct >= 90) return 'text-red-700 bg-red-100';
    if (pct >= 70) return 'text-amber-700 bg-amber-100';
    if (pct >= 50) return 'text-blue-700 bg-blue-100';
    return 'text-emerald-700 bg-emerald-100';
  };

  return (
    <Link href={`/locations/${location.id}`} className="block group">
      <div className={`relative overflow-hidden rounded-2xl border-2 ${getOccupancyBgColor()} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1`}>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
        
        {/* Status badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Header */}
        <div className="relative mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 pr-20">{location.name}</h3>
          <p className="text-sm text-gray-600">Tent Accommodation</p>
        </div>

        {/* Main stats */}
        <div className="relative mb-6">
          <div className="flex items-end gap-1 mb-2">
            <span className="text-3xl font-bold text-gray-900">{allocated}</span>
            <span className="text-lg text-gray-500 mb-1">/ {total}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">beds occupied</p>
        </div>

        {/* Progress bar with enhanced styling */}
        <div className="relative mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Occupancy</span>
            <span className="text-sm font-bold text-gray-900">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200/50 shadow-inner">
            <div
              className={`h-3 ${getOccupancyColor()} transition-all duration-700 ease-out rounded-full shadow-sm`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {freeingTomorrow > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">
                  {freeingTomorrow} freeing tomorrow
                </span>
              </div>
            )}
          </div>
          
          {/* Arrow indicator */}
          <div className="flex items-center text-gray-400 group-hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </Link>
  );
}
```


components/StatPill.jsx
```jsx
export default function StatPill({ label, value }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            <span className="opacity-70">{label}</span>
            <span className="text-gray-900">{value}</span>
        </div>
    );
}
```


lib/api.js
```js
// lib/api.js
// Frontend API wrappers for Express backend (no proxy).
// Set NEXT_PUBLIC_API_BASE (e.g., http://localhost:3001) in .env.local

const API = process.env.NEXT_PUBLIC_API_BASE || '';

async function handle(res, fallbackMsg) {
  if (res.ok) {
    // some DELETE/PATCH endpoints might return {} or minimal payload
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
  // Try to surface server-provided error details
  let msg = fallbackMsg;
  try {
    const text = await res.text();
    msg = text || fallbackMsg;
  } catch {}
  throw new Error(msg);
}

export async function fetchLocations() {
  const res = await fetch(`${API}/api/locations`, { cache: 'no-store' });
  return handle(res, 'Failed to load locations');
}

export async function fetchLocation(id) {
  const res = await fetch(`${API}/api/locations/${id}`, { cache: 'no-store' });
  return handle(res, 'Failed to load location');
}

export async function updateCapacity(id, newCapacity) {
  const res = await fetch(`${API}/api/locations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity: newCapacity }),
  });
  return handle(res, 'Failed to update capacity');
}

export async function allocateBed(id, bedNumber, payload) {
  const res = await fetch(`${API}/api/locations/${id}/beds/${bedNumber}/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to allocate bed');
}

export async function editAllocation(id, bedNumber, payload) {
  const res = await fetch(`${API}/api/locations/${id}/beds/${bedNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to edit allocation');
}

export async function deallocateBed(id, bedNumber) {
  const res = await fetch(`${API}/api/locations/${id}/beds/${bedNumber}`, {
    method: 'DELETE',
  });
  return handle(res, 'Failed to deallocate bed');
}

```
