"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchReservedActive } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TreeSkeleton } from "@/components/Skeleton";

export default function ReservedActivePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState({ locationId: '', tentIndex: '', blockIndex: '' });
  const router = useRouter();

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { items } = await fetchReservedActive();
      setItems(items || []);
    } catch (e) {
      setError(e.message || "Failed to load reserved");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // Filter items first
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter.locationId && String(item.location_id) !== String(filter.locationId)) return false;
      if (filter.tentIndex && String(item.tent_index) !== String(filter.tentIndex)) return false;
      if (filter.blockIndex && String(item.block_index) !== String(filter.blockIndex)) return false;
      return true;
    });
  }, [items, filter]);

  // Group items by batch and sort by size descending
  const batches = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const key = it.batch_id || `single_${it.location_id}-${it.tent_index}-${it.block_index}-${it.bed_number}-${it.phone}`;
      if (!map.has(key)) map.set(key, { batchId: it.batch_id || null, items: [], phones: new Set(), expiresAt: null });
      const b = map.get(key);
      b.items.push(it);
      if (it.phone) b.phones.add(it.phone);
      if (!b.expiresAt || (it.reserved_expires_at && b.expiresAt < it.reserved_expires_at)) b.expiresAt = it.reserved_expires_at || b.expiresAt;
    }
    // Sort by batch size descending
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [filteredItems]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-fuchsia-900/20 border border-indigo-500/20 p-6 mb-6">
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/" className="inline-flex items-center gap-2 text-indigo-300 hover:underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back
              </Link>
            </div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">Active Reservations</h2>
            <p className="text-indigo-200/80">View all currently active reserved seats.</p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow">Refresh</button>
        </div>
      </section>

      {loading && <TreeSkeleton count={3} />}
      {error && <div className="p-3 bg-red-900/30 border border-red-500/20 rounded text-red-100">{error}</div>}

      {/* Filters */}
      {!loading && items.length > 0 && (
        <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <select value={filter.locationId} onChange={e=>setFilter(f=>({...f, locationId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm">
                <option value="">All Locations</option>
                {Array.from(new Set(items.map(i=>i.location_id))).map(id => {
                  const name = items.find(i => i.location_id === id)?.location_name;
                  return <option key={id} value={id}>{name || `Location ${id}`}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tent</label>
              <select value={filter.tentIndex} onChange={e=>setFilter(f=>({...f, tentIndex: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm">
                <option value="">All Tents</option>
                {Array.from(new Set(items.filter(i => !filter.locationId || String(i.location_id) === String(filter.locationId)).map(i=>i.tent_index))).map(idx => (
                  <option key={idx} value={idx}>Tent {idx}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Block</label>
              <select value={filter.blockIndex} onChange={e=>setFilter(f=>({...f, blockIndex: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm">
                <option value="">All Blocks</option>
                {Array.from(new Set(items.filter(i => (!filter.locationId || String(i.location_id) === String(filter.locationId)) && (!filter.tentIndex || String(i.tent_index) === String(filter.tentIndex))).map(i=>i.block_index))).map(idx => (
                  <option key={idx} value={idx}>Block {idx}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-4">
        {batches.map((batch, batchIdx) => {
          const batchItems = batch.items || [];
          const phoneList = Array.from(batch.phones);
          const phone = phoneList[0] || '';
          
          return (
            <div key={batchIdx} className="space-y-2">
              {/* Batch Card */}
              <div className="overflow-hidden rounded-xl border bg-gradient-to-br shadow-lg border-blue-500/20 from-blue-950/40 via-indigo-950/30 to-blue-950/40">
                {/* Header */}
                <div className="bg-white/5 border-b border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {batch.batchId && (
                        <>
                          <div className="text-sm font-medium text-gray-300">Batch</div>
                          <div className="text-lg font-bold text-white font-mono">{batch.batchId}</div>
                        </>
                      )}
                      {!batch.batchId && (
                        <div className="text-lg font-bold text-gray-400">Individual Reservation</div>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-500/20 border border-blue-400/30 text-blue-200">
                        {batchItems.length} Reserved
                      </span>
                      {batch.expiresAt && (
                        <span className="text-xs text-gray-400">
                          Expires {new Date(batch.expiresAt).toLocaleString('en-CA', { 
                            timeZone: 'Asia/Kolkata',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).replace(',', '')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Phone chips */}
                  {phoneList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="text-xs text-gray-400 self-center">Phone:</div>
                      {phoneList.slice(0, 2).map((p, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-sm font-medium">
                          {p}
                        </span>
                      ))}
                      {phoneList.length > 2 && (
                        <span className="px-3 py-1 rounded-full bg-gray-500/20 border border-gray-400/30 text-gray-300 text-sm">
                          +{phoneList.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Hierarchical tree from this batch's items */}
                {(() => {
                  // Build hierarchy for this batch
                  const locs = new Map();
                  for (const it of batchItems) {
                    const locKey = `loc-${it.location_id}`;
                    if (!locs.has(locKey)) locs.set(locKey, { id: it.location_id, name: it.location_name, tents: new Map(), items: [] });
                    const loc = locs.get(locKey);
                    loc.items.push(it);

                    const tentKey = `tent-${it.tent_index}`;
                    if (!loc.tents.has(tentKey)) loc.tents.set(tentKey, { index: it.tent_index, blocks: new Map(), items: [] });
                    const tent = loc.tents.get(tentKey);
                    tent.items.push(it);

                    const blockKey = `block-${it.block_index}`;
                    if (!tent.blocks.has(blockKey)) tent.blocks.set(blockKey, { index: it.block_index, beds: [], items: [] });
                    const block = tent.blocks.get(blockKey);
                    block.items.push(it);
                    block.beds.push(it);
                  }
                  const batchHierarchy = Array.from(locs.values()).map(loc => ({
                    ...loc,
                    tents: Array.from(loc.tents.values()).map(tent => ({
                      ...tent,
                      blocks: Array.from(tent.blocks.values()).map(block => ({
                        ...block,
                        beds: block.beds.sort((a, b) => a.bed_number - b.bed_number)
                      }))
                    }))
                  }));

                  return (
                    <div className="divide-y divide-white/5">
                      {batchHierarchy.map((loc) => {
                        const locKey = `batch${batchIdx}-loc-${loc.id}`;
                        const locExpanded = expanded[locKey];
                        return (
                          <div key={locKey}>
                            <div className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggle(locKey)}>
                              <div className="flex items-center gap-3">
                                <svg className={`w-4 h-4 text-blue-300 transition-transform ${locExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                </svg>
                                <span className="text-lg font-semibold text-white">{loc.name || `Location ${loc.id}`}</span>
                              </div>
                              <span className="text-sm text-gray-300">{loc.items.length} items</span>
                            </div>

                            {locExpanded && (
                              <div className="bg-black/20">
                                {loc.tents.map((tent) => {
                                  const tentKey = `${locKey}-tent-${tent.index}`;
                                  const tentExpanded = expanded[tentKey];
                                  return (
                                    <div key={tentKey}>
                                      <div className="px-4 py-2 pl-12 flex items-center justify-between cursor-pointer hover:bg-white/5 border-b border-white/5" onClick={() => toggle(tentKey)}>
                                        <div className="flex items-center gap-3">
                                          <svg className={`w-4 h-4 text-indigo-300 transition-transform ${tentExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                          </svg>
                                          <span className="font-medium text-white">Tent {tent.index}</span>
                                        </div>
                                        <span className="text-sm text-gray-300">{tent.items.length}</span>
                                      </div>

                                      {tentExpanded && (
                                        <div className="bg-black/30">
                                          {tent.blocks.map((block) => {
                                            const blockKey = `${tentKey}-block-${block.index}`;
                                            const blockExpanded = expanded[blockKey];
                                            return (
                                              <div key={blockKey}>
                                                <div className="px-4 py-2 pl-20 flex items-center justify-between cursor-pointer hover:bg-white/5 border-b border-white/5" onClick={() => toggle(blockKey)}>
                                                  <div className="flex items-center gap-3">
                                                    <svg className={`w-3 h-3 text-blue-300 transition-transform ${blockExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                                    </svg>
                                                    <span className="text-sm text-gray-200">Block {block.index}</span>
                                                  </div>
                                                  <span className="text-xs text-gray-400">{block.items.length}</span>
                                                </div>

                                                {blockExpanded && (
                                                  <div className="bg-black/40 divide-y divide-white/5">
                                                    {block.beds.map((bed) => (
                                                      <div key={bed.id} className="px-4 py-2 pl-28 flex items-center justify-between hover:bg-white/5">
                                                        <div className="flex items-center gap-3">
                                                          <span className="text-xs text-gray-400">Bed {bed.bed_number}</span>
                                                          {bed.gender && (
                                                            <span className={`px-1.5 py-0.5 rounded text-xs ${bed.gender?.toLowerCase() === 'male' ? 'bg-blue-500/20 text-blue-200' : 'bg-pink-500/20 text-pink-200'}`}>
                                                              {bed.gender}
                                                            </span>
                                                          )}
                                                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 border border-blue-400/30 text-blue-200">
                                                            reserved
                                                          </span>
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                          {bed.start_date && bed.end_date ? (
                                                            <>
                                                              {new Date(bed.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })} → {new Date(bed.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                            </>
                                                          ) : (
                                                            <span className="text-gray-500">No dates</span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Action buttons for this batch */}
                <div className="bg-white/5 border-t border-white/10 px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      className="px-4 py-2 rounded-lg border border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all duration-200 font-medium text-sm"
                      onClick={() => {
                        const params = new URLSearchParams({ phone });
                        if (batch.batchId) params.set('batchId', batch.batchId);
                        if (filter.locationId) params.set('locationId', filter.locationId);
                        if (filter.tentIndex) params.set('tentIndex', filter.tentIndex);
                        if (filter.blockIndex) params.set('blockIndex', filter.blockIndex);
                        router.push(`/admin/edit?${params.toString()}`);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 font-medium text-sm shadow-lg shadow-blue-900/30"
                      onClick={() => {
                        const params = new URLSearchParams({ phone });
                        if (batch.batchId) params.set('batchId', batch.batchId);
                        if (filter.locationId) params.set('locationId', filter.locationId);
                        if (filter.tentIndex) params.set('tentIndex', filter.tentIndex);
                        if (filter.blockIndex) params.set('blockIndex', filter.blockIndex);
                        router.push(`/admin/confirm?${params.toString()}`);
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && !batches.length && items.length > 0 && <div className="text-sm text-gray-300">No reservations match the selected filters</div>}
        {!loading && !items.length && <div className="text-sm text-gray-300">No active reservations</div>}
      </div>
    </div>
  );
}
