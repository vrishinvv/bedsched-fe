"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { searchAllocationsByPhone, updatePhoneByPhone, updateContactNameByPhone, updateEndDateByPhone, deallocateByPhone } from "@/lib/api";
import Notification from "@/components/Notification";
import { TreeSkeleton } from '@/components/Skeleton';
import ProtectedRoute from '@/components/ProtectedRoute';

function EditByPhoneContent() {
  const sp = useSearchParams();
  const [phone, setPhone] = useState(sp.get('phone') || '');
  const [newPhone, setNewPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterBatchId, setFilterBatchId] = useState(null);

  const load = async (ph) => {
    setLoading(true); setNotification(null); setSelectedIds(new Set());
    try {
      const res = await searchAllocationsByPhone(ph);
      setData(res.batches || []);
      // Set newPhone to match search phone by default
      setNewPhone(ph);
      // Don't pre-fill contact name and end date - let user specify
      setContactName('');
      setEndDate('');
    } catch (e) {
      setNotification({ type: 'error', message: e.message || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const locId = sp.get('locationId');
    const tentIdx = sp.get('tentIndex');
    const blockIdx = sp.get('blockIndex');
    const batchId = sp.get('batchId');
    
    if (locId || tentIdx || blockIdx) {
      // Filters will be applied when data loads since we don't have a filter state in edit page
      // But we can store them for future enhancement
    }
    
    if (batchId) {
      setFilterBatchId(batchId);
    }
    
    if (phone) load(phone);
  }, []);

  const onUpdatePhone = async (newPhoneValue, allocationIds = null) => {
    if (!newPhoneValue || newPhoneValue === phone) return;
    // Must be a 10-digit number if provided
    if (!/^\d{10}$/.test(newPhoneValue)) {
      setNotification({ type: 'error', message: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    const ids = allocationIds !== null ? allocationIds : (selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    try {
      setLoading(true);
      await updatePhoneByPhone({ oldPhone: phone, newPhone: newPhoneValue, allocationIds: ids });
      setNotification({ type: 'success', message: 'Phone updated' });
      
      // If we updated specific items, reload with old phone first
      // Then update to new phone for subsequent searches
      if (ids && ids.length > 0) {
        // Partial update - still have items with old phone
        const res = await searchAllocationsByPhone(phone);
        setData(res.batches || []);
        setNewPhone(phone); // Reset to current phone
      } else {
        // Full update - all items now have new phone
        setPhone(newPhoneValue);
        await load(newPhoneValue);
      }
    } catch (e) { 
      setNotification({ type: 'error', message: e.message || 'Failed to update phone' });
    } finally {
      setLoading(false);
    }
  };

  const onUpdateContact = async (name, allocationIds = null) => {
    // Don't update if name is empty or just whitespace
    if (!name || !name.trim()) {
      setNotification({ type: 'error', message: 'Contact name cannot be empty' });
      return;
    }
    const ids = allocationIds !== null ? allocationIds : (selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    try {
      setLoading(true);
      await updateContactNameByPhone({ phone, contactName: name.trim(), allocationIds: ids });
      setNotification({ type: 'success', message: 'Contact name updated' });
      setContactName(name.trim());
      // Reload without clearing selection
      const res = await searchAllocationsByPhone(phone);
      setData(res.batches || []);
    } catch (e) { 
      setNotification({ type: 'error', message: e.message || 'Failed to update contact' });
    } finally {
      setLoading(false);
    }
  };

  const onUpdateEndDate = async (date, allocationIds = null) => {
    if (!date || !date.trim()) {
      setNotification({ type: 'error', message: 'End date cannot be empty' });
      return;
    }
    const ids = allocationIds !== null ? allocationIds : (selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    try {
      setLoading(true);
      await updateEndDateByPhone({ phone, endDate: date, allocationIds: ids });
      setNotification({ type: 'success', message: 'End date updated' });
      setEndDate(date);
      // Reload without clearing selection
      const res = await searchAllocationsByPhone(phone);
      setData(res.batches || []);
    } catch (e) { 
      setNotification({ type: 'error', message: e.message || 'Failed to update end date' });
    } finally {
      setLoading(false);
    }
  };

  const onDeallocate = async (batchItemIds = null) => {
    // Filter selectedIds to only items in this batch if batchItemIds provided
    let ids;
    if (batchItemIds) {
      const batchSelected = Array.from(selectedIds).filter(id => batchItemIds.includes(id));
      ids = batchSelected.length > 0 ? batchSelected : batchItemIds;
    } else {
      ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    }
    const confirmMsg = ids ? `Deallocate ${ids.length} item(s)?` : 'Deallocate all active items for this phone?';
    if (!confirm(confirmMsg)) return;
    try {
      setLoading(true);
      await deallocateByPhone({ phone, allocationIds: ids });
      setNotification({ type: 'success', message: 'Deallocated' });
      // Reload without clearing selection
      const res = await searchAllocationsByPhone(phone);
      setData(res.batches || []);
      
      // Clear selections for deallocated items
      if (ids) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      }
    } catch (e) { 
      setNotification({ type: 'error', message: e.message || 'Failed to deallocate' });
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = async (batchItemIds = null) => {
    // Filter selectedIds to only items in this batch if batchItemIds provided
    let ids = null;
    if (batchItemIds) {
      const batchSelected = Array.from(selectedIds).filter(id => batchItemIds.includes(id));
      if (batchSelected.length === 0) {
        setNotification({ type: 'error', message: 'Select at least one allocation in this batch to apply changes.' });
        return;
      }
      ids = batchSelected;
    } else if (selectedIds.size === 0) {
      setNotification({ type: 'error', message: 'Select at least one allocation to apply changes.' });
      return;
    }
    
    // Check if any field has a value
    const hasPhoneChange = newPhone && newPhone.trim() && newPhone !== phone;
    const hasContactName = contactName && contactName.trim();
    const hasEndDate = endDate && endDate.trim();
    
    if (!hasPhoneChange && !hasContactName && !hasEndDate) {
      setNotification({ type: 'error', message: 'Please fill in at least one field to update' });
      return;
    }
    
    if (hasPhoneChange) await onUpdatePhone(newPhone, ids);
    if (hasContactName) await onUpdateContact(contactName, ids);
    if (hasEndDate) await onUpdateEndDate(endDate, ids);
    
    // Clear selections for items in this batch after successful update
    if (batchItemIds && ids) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  
  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids) => {
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  // Build hierarchy: location -> tent -> block -> beds
  const hierarchy = useMemo(() => {
    if (!data) return [];
    const locs = new Map();
    for (const batch of data) {
      for (const it of batch.items) {
        const locKey = `loc-${it.locationId}`;
        if (!locs.has(locKey)) locs.set(locKey, { id: it.locationId, tents: new Map(), items: [] });
        const loc = locs.get(locKey);
        loc.items.push(it);

        const tentKey = `tent-${it.tentIndex}`;
        if (!loc.tents.has(tentKey)) loc.tents.set(tentKey, { index: it.tentIndex, blocks: new Map(), items: [] });
        const tent = loc.tents.get(tentKey);
        tent.items.push(it);

        const blockKey = `block-${it.blockIndex}`;
        if (!tent.blocks.has(blockKey)) tent.blocks.set(blockKey, { index: it.blockIndex, beds: [], items: [] });
        const block = tent.blocks.get(blockKey);
        block.items.push(it);
        block.beds.push(it);
      }
    }
    return Array.from(locs.values()).map(loc => ({
      ...loc,
      tents: Array.from(loc.tents.values()).map(tent => ({
        ...tent,
        blocks: Array.from(tent.blocks.values())
      }))
    }));
  }, [data]);

  return (
    <div className="p-3 sm:p-4 max-w-5xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-fuchsia-900/20 border border-indigo-500/20 p-4 sm:p-6 mb-6">
        <div className="relative flex items-end justify-between gap-3 sm:gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Link href="/" className="inline-flex items-center gap-2 text-indigo-300 hover:underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back
              </Link>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">Edit by Phone</h2>
            <p className="text-sm sm:text-base text-indigo-200/80">Search and modify allocations by phone number.</p>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="tel"
            placeholder="Enter phone number to search"
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 bg-black/40 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
          />
          <button onClick={()=>phone && load(phone)} disabled={!phone || loading} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50">Search</button>
        </div>
      </section>

      {/* Update Fields - Only show when data is loaded */}
      {data && data.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Update Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">New Phone Number</label>
              <input 
                className="w-full px-3 py-2 rounded border border-white/10 bg-black/40 text-white placeholder-gray-400" 
                type="tel" 
                inputMode="numeric"
                pattern="\\d{10}"
                maxLength={10}
                value={newPhone} 
                onChange={(e)=>setNewPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                placeholder="10-digit phone" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">New Contact Name</label>
              <input 
                className="w-full px-3 py-2 rounded border border-white/10 bg-black/40 text-white placeholder-gray-400" 
                type="text" 
                value={contactName} 
                onChange={(e)=>setContactName(e.target.value)}
                placeholder="Enter name" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">New End Date</label>
              <input 
                className="w-full px-3 py-2 rounded border border-white/10 bg-black/40 text-white" 
                type="date" 
                value={endDate} 
                onChange={(e)=>setEndDate(e.target.value)}
                min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
              />
            </div>
          </div>
        </section>
      )}

      {loading && <TreeSkeleton count={2} />}

      {!loading && data && data.length > 0 && (
        <div className="space-y-4">
          {data.filter(batch => !filterBatchId || String(batch.batchId) === String(filterBatchId)).map((batch, batchIdx) => {
            const batchItems = batch.items || [];
            const batchPhone = batch.phone || phone;
            const batchStatuses = Array.from(new Set(batchItems.map(it => it.status)));
            
            return (
              <div key={batchIdx} className="space-y-2">
                {/* Batch Card - similar to SearchResultCard */}
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
                        {/* <div className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-medium">
                          {batchPhone}
                        </div> */}
                      </div>
                      <div className="flex gap-2">
                        {batchStatuses.map((status, i) => (
                          <span 
                            key={i}
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                              ${status === 'reserved' ? 'bg-blue-500/20 border border-blue-400/30 text-blue-200' : ''}
                              ${status === 'confirmed' ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200' : ''}
                              ${status === 'cancelled' ? 'bg-red-500/20 border border-red-400/30 text-red-200' : ''}
                            `}
                          >
                            {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hierarchical tree from this batch's items */}
                  {(() => {
                    // Build hierarchy for this batch
                    const locs = new Map();
                    for (const it of batchItems) {
                      const locKey = `loc-${it.locationId}`;
                      if (!locs.has(locKey)) locs.set(locKey, { id: it.locationId, tents: new Map(), items: [] });
                      const loc = locs.get(locKey);
                      loc.items.push(it);

                      const tentKey = `tent-${it.tentIndex}`;
                      if (!loc.tents.has(tentKey)) loc.tents.set(tentKey, { index: it.tentIndex, blocks: new Map(), items: [] });
                      const tent = loc.tents.get(tentKey);
                      tent.items.push(it);

                      const blockKey = `block-${it.blockIndex}`;
                      if (!tent.blocks.has(blockKey)) tent.blocks.set(blockKey, { index: it.blockIndex, beds: [], items: [] });
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
                          beds: block.beds.sort((a, b) => a.bedNumber - b.bedNumber)
                        }))
                      }))
                    }));

                    return (
                      <div className="divide-y divide-white/5">
                        {batchHierarchy.map((loc) => {
                          const locKey = `batch${batchIdx}-loc-${loc.id}`;
                          const locExpanded = expanded[locKey];
                          const locIds = loc.items.map(it => it.id);
                          const allLocSelected = locIds.every(id => selectedIds.has(id));
                          return (
                            <div key={locKey}>
                              <div className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggle(locKey)}>
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={allLocSelected} onChange={() => toggleAll(locIds)} onClick={(e) => e.stopPropagation()} className="rounded" />
                                  <svg className={`w-4 h-4 text-blue-300 transition-transform ${locExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                  </svg>
                                  <span className="text-lg font-semibold text-white">Location {loc.id}</span>
                                </div>
                                <span className="text-sm text-gray-300">{loc.items.length} items</span>
                              </div>

                              {locExpanded && (
                                <div className="bg-black/20">
                                  {loc.tents.map((tent) => {
                                    const tentKey = `${locKey}-tent-${tent.index}`;
                                    const tentExpanded = expanded[tentKey];
                                    const tentIds = tent.items.map(it => it.id);
                                    const allTentSelected = tentIds.every(id => selectedIds.has(id));
                                    return (
                                      <div key={tentKey}>
                                        <div className="px-4 py-2 pl-12 flex items-center justify-between cursor-pointer hover:bg-white/5 border-b border-white/5" onClick={() => toggle(tentKey)}>
                                          <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={allTentSelected} onChange={() => toggleAll(tentIds)} onClick={(e) => e.stopPropagation()} className="rounded" />
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
                                              const blockIds = block.items.map(it => it.id);
                                              const allBlockSelected = blockIds.every(id => selectedIds.has(id));
                                              return (
                                                <div key={blockKey}>
                                                  <div className="px-4 py-2 pl-20 flex items-center justify-between cursor-pointer hover:bg-white/5 border-b border-white/5" onClick={() => toggle(blockKey)}>
                                                    <div className="flex items-center gap-3">
                                                      <input type="checkbox" checked={allBlockSelected} onChange={() => toggleAll(blockIds)} onClick={(e) => e.stopPropagation()} className="rounded" />
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
                                                            <input type="checkbox" checked={selectedIds.has(bed.id)} onChange={() => toggleSelection(bed.id)} className="rounded" />
                                                            <span className="text-xs text-gray-400">Bed {bed.bedNumber}</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-xs ${bed.gender?.toLowerCase() === 'male' ? 'bg-blue-500/20 text-blue-200' : 'bg-pink-500/20 text-pink-200'}`}>
                                                              {bed.gender}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${bed.status === 'reserved' ? 'bg-blue-500/20 border border-blue-400/30 text-blue-200' : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200'}`}>
                                                              {bed.status}
                                                            </span>
                                                          </div>
                                                          <div className="text-xs text-gray-400">
                                                            {new Date(bed.startDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })} → {new Date(bed.endDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })}
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
                </div>

                {/* Action buttons for this batch */}
                <div className="flex items-center justify-end gap-2">
                  {(() => {
                    const batchItemIds = batchItems.map(it => it.id);
                    const selectedInBatch = Array.from(selectedIds).filter(id => batchItemIds.includes(id));
                    return (
                      <button 
                        className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" 
                        onClick={() => applyChanges(batchItemIds)} 
                        disabled={loading || selectedInBatch.length === 0}
                        title={selectedInBatch.length === 0 ? 'Select at least one allocation in this batch' : undefined}
                      >
                        Apply Changes {selectedInBatch.length > 0 ? `(${selectedInBatch.length} selected)` : ''}
                      </button>
                    );
                  })()}
                  <button 
                    className="px-3 py-2 rounded border border-red-500/40 text-red-200 hover:bg-red-900/30" 
                    onClick={() => onDeallocate(batchItems.map(it => it.id))} 
                    disabled={loading}
                  >
                    Deallocate {(() => {
                      const batchItemIds = batchItems.map(it => it.id);
                      const selectedInBatch = Array.from(selectedIds).filter(id => batchItemIds.includes(id));
                      return selectedInBatch.length > 0 ? `Selected (${selectedInBatch.length})` : 'All';
                    })()}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && data && !data.length && <div className="text-sm text-gray-300">No records for this phone.</div>}
      
      <Notification notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}

export default function EditByPhonePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading...</div>}>
      <ProtectedRoute adminOnly={true}>
        <EditByPhoneContent />
      </ProtectedRoute>
    </Suspense>
  );
}
