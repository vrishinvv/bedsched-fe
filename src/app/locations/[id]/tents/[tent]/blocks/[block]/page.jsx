'use client';
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BedGrid from '@/components/BedGrid';
import AllocateModal from '@/components/AllocateModal';
import BulkAllocateModal from '@/components/BulkAllocateModal';
import Notification from '@/components/Notification';
import { BedGridSkeleton, StatCardSkeleton, HeaderSkeleton } from '@/components/Skeleton';
import {
  fetchBlockDetail,
  allocateBed,
  editAllocation,
  deallocateBed,
  bulkAllocateBeds,
  updateBlock,
} from '@/lib/api';

export default function BlockBedsPage({ params }) {
  const { id, tent, block } = use(params);
  const [meta, setMeta] = useState(null); // { location, tent, block }
  const [genderRestriction, setGenderRestriction] = useState('both'); // block-level gender restriction
  const [bedsState, setBedsState] = useState(null); // { capacity, beds:{} }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState({ open: false, bedNumber: null, data: null });
  const [bulkModal, setBulkModal] = useState(false);
  const [pending, setPending] = useState(false);
  const [notification, setNotification] = useState(null);
  const [updatingRestriction, setUpdatingRestriction] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Fetch block detail
        const blockRes = await fetchBlockDetail(id, Number(tent), Number(block));
        setMeta(blockRes.meta);
        setBedsState({ capacity: blockRes.blockSize, beds: blockRes.beds });
        setGenderRestriction(blockRes.meta?.block?.genderRestriction || 'both');
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, tent, block]);

  const allocatedCount = useMemo(
    () => Object.values(bedsState?.beds || {}).filter(b => b && b.status === 'confirmed').length,
    [bedsState]
  );

  const stats = useMemo(() => {
    if (!bedsState) return { totalCapacity: 0, totalAllocated: 0, totalNotAllocated: 0, totalFreeingTomorrow: 0, totalReserved: 0 };
    
    const totalCapacity = bedsState.capacity || 0;
    const totalAllocated = allocatedCount;
    const totalNotAllocated = totalCapacity - totalAllocated;
    const totalReserved = Object.values(bedsState.beds || {}).filter(b => b && b.status === 'reserved' && (!b.reservedExpiresAt || new Date(b.reservedExpiresAt).getTime() > Date.now())).length;
    
    // Calculate freeing tomorrow from bed allocations (IST)
    const totalFreeingTomorrow = Object.values(bedsState.beds || {}).filter(bed => {
      if (!bed?.endDate || bed.status !== 'confirmed') return false;
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istToday = new Date(now.getTime() + istOffset);
      const istTomorrow = new Date(istToday);
      istTomorrow.setDate(istToday.getDate() + 1);
      const tomorrowStr = istTomorrow.toISOString().split('T')[0];
      return bed.endDate === tomorrowStr;
    }).length;
    
    return { totalCapacity, totalAllocated, totalNotAllocated, totalFreeingTomorrow, totalReserved };
  }, [bedsState, allocatedCount]);

  function openAllocate(n, data) {
    setModal({ open: true, bedNumber: n, data });
  }

  function showNotification(type, message) {
    setNotification({ type, message });
  }

  function closeNotification() {
    setNotification(null);
  }

  async function handleSave(payload) {
    const n = modal.bedNumber;
    const isEdit = Boolean(modal.data);
    try {
      setPending(true);
      // Optimistic update: ensure status present so stats rerender correctly
      setBedsState((s) => ({ 
        ...s, 
        beds: { 
          ...s.beds, 
          [n]: { 
            ...(s.beds?.[n] || {}),
            ...payload,
            status: isEdit ? (s.beds?.[n]?.status || 'confirmed') : 'confirmed'
          } 
        } 
      }));
      
      if (isEdit) {
        const updated = await editAllocation(id, Number(tent), Number(block), n, payload);
        // If API returns authoritative allocation, sync it (fallback to optimistic if not)
        if (updated && typeof updated === 'object') {
          setBedsState((s) => ({ ...s, beds: { ...s.beds, [n]: { ...s.beds?.[n], ...updated, status: updated.status || (s.beds?.[n]?.status || 'confirmed') } } }));
        }
        showNotification('success', `Bed ${n} allocation updated successfully for ${payload.name}`);
      } else {
        const created = await allocateBed(id, Number(tent), Number(block), n, payload);
        if (created && typeof created === 'object') {
          setBedsState((s) => ({ ...s, beds: { ...s.beds, [n]: { ...s.beds?.[n], ...created, status: created.status || 'confirmed' } } }));
        }
        showNotification('success', `Bed ${n} allocated successfully to ${payload.name}`);
      }
      
      setModal({ open: false, bedNumber: null, data: null });
    } catch (e) {
      // Revert optimistic update on error
      setBedsState((s) => {
        const reverted = { ...s.beds };
        if (isEdit) {
          reverted[n] = modal.data; // Restore original data
        } else {
          delete reverted[n]; // Remove allocation
        }
        return { ...s, beds: reverted };
      });
      
      const errorMessage = e.message || (isEdit ? 'Failed to update allocation' : 'Failed to allocate bed');
      showNotification('error', errorMessage);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const n = modal.bedNumber;
    const guestName = modal.data?.name || 'guest';
    
    try {
      setPending(true);
      // Store original data for potential revert
      const originalData = modal.data;
      
      setBedsState((s) => {
        const next = { ...s.beds };
        delete next[n];
        return { ...s, beds: next };
      });
      
      await deallocateBed(id, Number(tent), Number(block), n);
      showNotification('success', `Bed ${n} deallocated successfully (${guestName})`);
      setModal({ open: false, bedNumber: null, data: null });
    } catch (e) {
      // Revert optimistic update on error
      setBedsState((s) => ({ ...s, beds: { ...s.beds, [n]: originalData } }));
      
      const errorMessage = e.message || 'Failed to deallocate bed';
      showNotification('error', errorMessage);
    } finally {
      setPending(false);
    }
  }

  async function handleBulkBooking(formData) {
    const { name, phone, maleCount, femaleCount, startDate, endDate } = formData;
    
    try {
      const result = await bulkAllocateBeds(id, Number(tent), Number(block), {
        name,
        phone: phone || null,
        maleCount,
        femaleCount,
        startDate,
        endDate,
      });

      // Update local state with successful allocations
      if (result.success && result.success.length > 0) {
        setBedsState((s) => {
          const updatedBeds = { ...s.beds };
          result.success.forEach(booking => {
            updatedBeds[booking.bedNumber] = {
              name,
              phone,
              gender: booking.gender,
              startDate,
              endDate,
              status: 'confirmed'
            };
          });
          return { ...s, beds: updatedBeds };
        });
      }

      return result;
    } catch (e) {
      return {
        success: [],
        errors: [{ message: e.message || 'Failed to bulk allocate beds' }]
      };
    }
  }

  if (loading) {
    return (
      <main className="space-y-5">
        {/* Header skeleton */}
        <HeaderSkeleton />

        {/* Stats skeleton */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </section>

        {/* Bed grid skeleton */}
        <BedGridSkeleton capacity={500} />
      </main>
    );
  }

  if (err) return <div className="text-red-400">{err}</div>;

  return (
    <main className="space-y-5 p-3 sm:p-4">
      {/* Enhanced Header with Purple Breadcrumb */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-900/20 via-purple-800/20 to-indigo-900/20 border border-purple-500/20 p-4 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="relative">
          <nav className="mb-3">
            <Link href={`/locations/${meta.location.id}/tents/${meta.tent.index}`} className="inline-flex items-center text-xs sm:text-sm text-purple-300/80 hover:text-purple-200 transition-colors">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tent {meta.tent.index}
            </Link>
          </nav>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            {meta.location.name} | Tent {meta.tent.index} | Block {meta.block.index}
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <p className="text-xs sm:text-sm text-purple-200/80">{stats.totalCapacity} beds • {stats.totalAllocated} occupied • {stats.totalNotAllocated} available • {stats.totalReserved} reserved</p>
              <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                genderRestriction === 'male_only' ? 'text-blue-200 bg-blue-600/40 border-blue-400/50' :
                genderRestriction === 'female_only' ? 'text-pink-200 bg-pink-600/40 border-pink-400/50' :
                'text-green-200 bg-green-600/40 border-green-400/50'
              }`}>
                {genderRestriction === 'male_only' ? '♂️ Male Only' : genderRestriction === 'female_only' ? '♀️ Female Only' : '👫 All Genders'}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <select
                  value={genderRestriction}
                  disabled={updatingRestriction}
                  onChange={async (e) => {
                    const newVal = e.target.value;
                    if (newVal === genderRestriction) return;
                    try {
                      setUpdatingRestriction(true);
                      await updateBlock(id, Number(tent), Number(block), { genderRestriction: newVal });
                      setGenderRestriction(newVal);
                    } catch (e) {
                      alert(e.message || 'Failed to update block restriction');
                    } finally {
                      setUpdatingRestriction(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    genderRestriction === 'male_only' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                    genderRestriction === 'female_only' ? 'bg-pink-50 border-pink-300 text-pink-700' :
                    'bg-green-50 border-green-300 text-green-700'
                  } ${updatingRestriction ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <option value="both">👫 All Genders</option>
                  <option value="male_only">♂️ Male Only</option>
                  <option value="female_only">♀️ Female Only</option>
                </select>
              </div>
              <button
                onClick={() => setBulkModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Bulk Book Beds
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Dashboard */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
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

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/20 p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 col-span-2 md:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="p-2 bg-indigo-500/20 rounded-xl w-fit mb-3">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-indigo-300/70 font-medium">Active Reservations</div>
            <div className="text-2xl font-bold text-white">{stats.totalReserved.toLocaleString()}</div>
          </div>
        </div>
      </section>

      <BedGrid
        capacity={bedsState.capacity}
        beds={bedsState.beds}
        onSelect={openAllocate}
      />

      <AllocateModal
        open={modal.open}
        onClose={() => setModal({ open: false, bedNumber: null, data: null })}
        bedNumber={modal.bedNumber}
        initialData={modal.data}
        onSave={handleSave}
        onDelete={handleDelete}
        pending={pending}
        genderRestriction={genderRestriction}
      />

      <BulkAllocateModal
        open={bulkModal}
        onClose={() => setBulkModal(false)}
        genderRestriction={genderRestriction}
        onSave={handleBulkBooking}
      />

      <Notification 
        notification={notification}
        onClose={closeNotification}
      />
    </main>
  );
}
