import { useState } from 'react';

export default function SearchResultCard({ batch, filter = {}, onViewLocation, selectedIds = [], onToggleSelect }) {
  const { batchId, statuses, items, phone } = batch;
  const [expanded, setExpanded] = useState({});

  // Helper to toggle all items in a group
  const toggleAll = (ids) => {
    if (!onToggleSelect) return;
    const allSelected = ids.every(id => selectedIds.includes(id));
    ids.forEach(id => {
      const isCurrentlySelected = selectedIds.includes(id);
      if (allSelected && isCurrentlySelected) {
        onToggleSelect(id); // deselect
      } else if (!allSelected && !isCurrentlySelected) {
        onToggleSelect(id); // select
      }
    });
  };

  // Apply filter
  const matchesFilter = (it) => {
    const m = (val, f) => !f || String(val) === String(f);
    return m(it.locationId, filter.locationId) && m(it.tentIndex, filter.tentIndex) && m(it.blockIndex, filter.blockIndex);
  };
  const filteredItems = items.filter(matchesFilter);

  // Build hierarchy: location -> tent -> block -> beds
  const hierarchy = (() => {
    const locs = new Map();
    for (const it of filteredItems) {
      const locKey = `loc-${it.locationId}`;
      if (!locs.has(locKey)) locs.set(locKey, { id: it.locationId, tents: new Map(), items: [] });
      const loc = locs.get(locKey);
      loc.items.push(it);

      const tentKey = `tent-${it.tentIndex}`;
      if (!loc.tents.has(tentKey)) loc.tents.set(tentKey, { index: it.tentIndex, blocks: new Map(), items: [] });
      const tent = loc.tents.get(tentKey);
      tent.items.push(it);

      const blockKey = `block-${it.blockIndex}`;
      if (!tent.blocks.has(blockKey)) tent.blocks.set(blockKey, { index: it.blockIndex, beds: [] });
      const block = tent.blocks.get(blockKey);
      block.beds.push(it);
    }
    return Array.from(locs.values()).map(loc => ({
      ...loc,
      tents: Array.from(loc.tents.values()).map(tent => ({
        ...tent,
        blocks: Array.from(tent.blocks.values()).map(block => ({
          ...block,
          beds: block.beds.sort((a, b) => {
            // Sort by status: reserved first, then confirmed
            const statusOrder = { 'reserved': 0, 'confirmed': 1, 'cancelled': 2 };
            const aOrder = statusOrder[a.status] ?? 999;
            const bOrder = statusOrder[b.status] ?? 999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            // If same status, sort by bed number
            return a.bedNumber - b.bedNumber;
          })
        }))
      }))
    }));
  })();

  // Determine status color
  const hasReserved = statuses.includes('reserved');
  const hasConfirmed = statuses.includes('confirmed');
  const hasCancelled = statuses.includes('cancelled');

  let colorClass = 'from-gray-950/40 via-slate-950/30 to-gray-950/40 border-gray-500/20';
  if (hasReserved) colorClass = 'from-blue-950/40 via-indigo-950/30 to-blue-950/40 border-blue-500/20';
  else if (hasConfirmed) colorClass = 'from-emerald-950/40 via-teal-950/30 to-green-950/40 border-emerald-500/20';
  else if (hasCancelled) colorClass = 'from-red-950/40 via-rose-950/30 to-red-950/40 border-red-500/20';

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className={`overflow-hidden rounded-xl border bg-gradient-to-br shadow-lg ${colorClass}`}>
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            {batchId && (
              <>
                <div className="text-sm font-medium text-gray-300">Batch</div>
                <div className="text-lg font-bold text-white font-mono">{batchId}</div>
              </>
            )}
            {phone && (
              <div className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-200 text-sm font-medium">
                {phone}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((status, i) => (
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

      {/* Hierarchical tree view */}
      {hierarchy.length > 0 && (
        <div className="divide-y divide-white/5">
          {hierarchy.map((loc) => {
            const locKey = `search-loc-${loc.id}`;
            const locExpanded = expanded[locKey];
            const locIds = loc.items.filter(it => it.status === 'reserved').map(it => it.id);
            const allLocSelected = locIds.length > 0 && locIds.every(id => selectedIds.includes(id));
            return (
              <div key={locKey}>
                <div className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggle(locKey)}>
                  <div className="flex items-center gap-3">
                    {onToggleSelect && locIds.length > 0 && (
                      <input type="checkbox" checked={allLocSelected} onChange={() => toggleAll(locIds)} onClick={(e) => e.stopPropagation()} className="rounded" />
                    )}
                    <svg className={`w-4 h-4 text-indigo-300 transition-transform ${locExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewLocation(loc.id); }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-sm font-medium hover:bg-indigo-500/30 hover:border-indigo-400/50"
                    >
                      Location {loc.id}
                    </button>
                  </div>
                  <span className="text-sm text-gray-300">{loc.items.length} items</span>
                </div>

                {locExpanded && (
                  <div className="bg-black/20">
                    {loc.tents.map((tent) => {
                      const tentKey = `${locKey}-tent-${tent.index}`;
                      const tentExpanded = expanded[tentKey];
                      const tentIds = tent.items.filter(it => it.status === 'reserved').map(it => it.id);
                      const allTentSelected = tentIds.length > 0 && tentIds.every(id => selectedIds.includes(id));
                      return (
                        <div key={tentKey}>
                          <div className="px-4 py-2 pl-8 sm:pl-12 flex items-center justify-between cursor-pointer hover:bg-white/5 border-b border-white/5" onClick={() => toggle(tentKey)}>
                            <div className="flex items-center gap-3">
                              {onToggleSelect && tentIds.length > 0 && (
                                <input type="checkbox" checked={allTentSelected} onChange={() => toggleAll(tentIds)} onClick={(e) => e.stopPropagation()} className="rounded" />
                              )}
                              <svg className={`w-4 h-4 text-purple-300 transition-transform ${tentExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                              </svg>
                              <span className="font-medium text-white">{tent.name || `Tent ${tent.index}`}</span>
                            </div>
                            <span className="text-sm text-gray-300">{tent.items.length}</span>
                          </div>

                          {tentExpanded && (
                            <div className="bg-black/30">
                              {tent.blocks.map((block) => {
                                const blockKey = `${tentKey}-block-${block.index}`;
                                const blockExpanded = expanded[blockKey];
                                const blockIds = block.beds.filter(bed => bed.status === 'reserved').map(bed => bed.id);
                                const allBlockSelected = blockIds.length > 0 && blockIds.every(id => selectedIds.includes(id));
                                return (
                                  <div key={blockKey}>
                                        <div className="px-4 py-2 pl-12 sm:pl-20 flex items-center justify-between cursor-pointer hover:bg-white/5 border-b border-white/5" onClick={() => toggle(blockKey)}>
                                      <div className="flex items-center gap-3">
                                        {onToggleSelect && blockIds.length > 0 && (
                                          <input type="checkbox" checked={allBlockSelected} onChange={() => toggleAll(blockIds)} onClick={(e) => e.stopPropagation()} className="rounded" />
                                        )}
                                        <svg className={`w-3 h-3 text-blue-300 transition-transform ${blockExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                        </svg>
                                        <span className="text-sm text-gray-200">{block.name || `Block ${block.index}`}</span>
                                      </div>
                                      <span className="text-xs text-gray-400">{block.beds.length}</span>
                                    </div>

                                    {blockExpanded && (
                                      <div className="bg-black/40 divide-y divide-white/5">
                                        {block.beds.map((bed) => {
                                          const isSelected = selectedIds.includes(bed.id);
                                          return (
                                            <div key={bed.id} className={`px-4 py-2 pl-16 sm:pl-28 flex items-center gap-2 sm:gap-3 hover:bg-white/5 ${isSelected ? 'bg-indigo-500/10' : ''}`}>
                                              {bed.status === 'reserved' && onToggleSelect && (
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => onToggleSelect(bed.id)}
                                                  className="w-4 h-4 rounded border-gray-400 text-indigo-600"
                                                />
                                              )}
                                              <span className="text-[11px] sm:text-xs text-gray-400">Bed {bed.bedNumber}</span>
                                              <span className={`px-1.5 py-0.5 rounded text-xs ${bed.gender?.toLowerCase() === 'male' ? 'bg-blue-500/20 text-blue-200' : 'bg-pink-500/20 text-pink-200'}`}>
                                                {bed.gender}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded-full text-xs ${bed.status === 'reserved' ? 'bg-blue-500/20 border border-blue-400/30 text-blue-200' : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200'}`}>
                                                {bed.status}
                                              </span>
                                              <span className="text-xs text-gray-400">
                                                {new Date(bed.startDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })} → {new Date(bed.endDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })}
                                              </span>
                                              {bed.contactName && (
                                                <span className="text-[11px] sm:text-xs text-gray-300">{bed.contactName}</span>
                                              )}
                                              <span className="text-xs text-gray-500 ml-auto">#{bed.id}</span>
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
