'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchAllocationsByPhone, confirmAllocations } from '@/lib/api';
import Notification from '@/components/Notification';
import SearchResultCard from '@/components/SearchResultCard';
import { TreeSkeleton } from '@/components/Skeleton';
import ProtectedRoute from '@/components/ProtectedRoute';

function AdminConfirmContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // { ok, batches: [...] }
  const [selectedIds, setSelectedIds] = useState([]); // flat array of selected IDs
  const [note, setNote] = useState(null);
  const [filter, setFilter] = useState({ locationId: '', tentIndex: '', blockIndex: '' });
  const [filterBatchId, setFilterBatchId] = useState(null);

  const show = (type, message) => setNote({ type, message });

  const onSearch = async () => {
    try {
      setLoading(true);
      const res = await searchAllocationsByPhone(phone);
      setResults(res);
      setSelectedIds([]);
    } catch (e) {
      show('error', e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qp = params.get('phone');
    const locId = params.get('locationId');
    const tentIdx = params.get('tentIndex');
    const blockIdx = params.get('blockIndex');
    const batchId = params.get('batchId');
    
    if (locId || tentIdx || blockIdx) {
      setFilter({ locationId: locId || '', tentIndex: tentIdx || '', blockIndex: blockIdx || '' });
    }
    
    if (batchId) {
      setFilterBatchId(batchId);
    }
    
    if (qp) {
      setPhone(qp);
      // trigger search automatically with the phone number
      (async () => {
        try {
          setLoading(true);
          const res = await searchAllocationsByPhone(qp);
          setResults(res);
          setSelectedIds([]);
        } catch (e) {
          show('error', e.message || 'Search failed');
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const doConfirm = async (batchId, ids = null) => {
    try {
      setLoading(true);
      const payload = { batchId };
      // If caller didn't pass explicit ids and filters are set, apply filter to current batch
      if (!ids || !ids.length) {
        const b = (results?.batches || []).find(x => (x.batchId || null) === batchId);
        if (b) {
          const m = (val, f) => !f || String(val) === String(f);
          const filtered = b.items.filter(it => (
            m(it.locationId, filter.locationId) && m(it.tentIndex, filter.tentIndex) && m(it.blockIndex, filter.blockIndex) && it.status === 'reserved'
          )).map(it => it.id);
          if (filtered.length) payload.allocationIds = filtered;
        }
      } else {
        payload.allocationIds = ids;
      }
      const res = await confirmAllocations(payload);
      show('success', `Confirmed ${res.confirmedIds?.length || 0} allocations`);
      await onSearch();
    } catch (e) {
      show('error', e.message || 'Confirm failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-fuchsia-900/20 border border-indigo-500/20 p-4 sm:p-6">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Link href="/" className="inline-flex items-center gap-2 text-indigo-300 hover:underline text-sm sm:text-base touch-manipulation">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back
              </Link>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">Admin · Confirm Reservations</h2>
            <p className="text-sm sm:text-base text-indigo-200/80">Search by phone and confirm reserved seats.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-3 sm:p-4">
        {/* <div className="flex items-center gap-3 mb-3 text-sm">
          <Link href="/admin/confirm" className="px-3 py-1.5 rounded bg-indigo-600 text-white">Search & Confirm</Link>
          <Link href="/admin/edit" className="px-3 py-1.5 rounded border border-white/10 text-gray-200 hover:bg-white/10">Edit</Link>
          <Link href="/admin/reserved" className="px-3 py-1.5 rounded border border-white/10 text-gray-200 hover:bg-white/10">Active Reservations</Link>
          <Link href="/admin/departures" className="px-3 py-1.5 rounded border border-white/10 text-gray-200 hover:bg-white/10">Departures</Link>
        </div> */}
        <div className="flex items-center gap-2">
          <input
            type="tel"
            placeholder="Enter phone number"
            className="flex-1 min-w-0 rounded-lg border border-white/10 px-3 py-2 bg-black/40 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base touch-manipulation"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
          />
          <button onClick={onSearch} disabled={loading || !phone} className="px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium disabled:opacity-50 text-sm sm:text-base touch-manipulation whitespace-nowrap">Search</button>
        </div>
      </section>

      {loading && <TreeSkeleton count={2} />}

      {/* Filters */}
      {!loading && results && (
      <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <select value={filter.locationId} onChange={e=>setFilter(f=>({...f, locationId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900">
              <option value="">All</option>
              {Array.from(new Set((results?.batches||[]).flatMap(b=>b.items.map(i=>i.locationId)))).filter(Boolean).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tent</label>
            <select value={filter.tentIndex} onChange={e=>setFilter(f=>({...f, tentIndex: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900">
              <option value="">All</option>
              {Array.from(new Set((results?.batches||[]).flatMap(b=>b.items.map(i=>i.tentIndex)))).filter(Boolean).map(idx => (
                <option key={idx} value={idx}>{idx}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Block</label>
            <select value={filter.blockIndex} onChange={e=>setFilter(f=>({...f, blockIndex: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900">
              <option value="">All</option>
              {Array.from(new Set((results?.batches||[]).flatMap(b=>b.items.map(i=>i.blockIndex)))).filter(Boolean).map(idx => (
                <option key={idx} value={idx}>{idx}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      )}

      {!loading && results && (results.batches?.length ? (
        <section className="space-y-4">
          {results.batches.filter(b => !filterBatchId || String(b.batchId) === String(filterBatchId)).map((b, idx) => {
            const batchSelectedIds = selectedIds.filter(id => b.items.some(it => it.id === id));
            return (
              <div key={idx} className="space-y-2">
                <SearchResultCard
                  batch={b}
                  filter={filter}
                  onViewLocation={(locId) => router.push(`/locations/${locId}`)}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleItem}
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={()=>doConfirm(b.batchId)} disabled={loading || !b.batchId} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">Confirm All</button>
                  <button onClick={()=>doConfirm(b.batchId, batchSelectedIds)} disabled={loading || !b.batchId || batchSelectedIds.length === 0} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">Confirm Selected ({batchSelectedIds.length})</button>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <p className="text-sm text-gray-400 px-2">No results.</p>
      ))}

      <Notification notification={note} onClose={()=>setNote(null)} />
    </main>
  );
}

export default function AdminConfirmPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading...</div>}>
      <ProtectedRoute adminOnly={true}>
        <AdminConfirmContent />
      </ProtectedRoute>
    </Suspense>
  );
}
