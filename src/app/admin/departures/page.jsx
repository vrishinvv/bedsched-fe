"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchDepartures, getMe } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TreeSkeleton } from "@/components/Skeleton";
import ProtectedRoute from "@/components/ProtectedRoute";

function DeparturesContent() {
  const MIN_DATE = '2025-11-03';
  const MAX_DATE = '2025-11-24';
  
  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().slice(0,10);
  };
  
  const [date, setDate] = useState(() => getTodayIST());
  const [selectedFilter, setSelectedFilter] = useState('today'); // 'today-1', 'today', 'tomorrow', or 'custom'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({}); // { 'loc-1': true, 'loc-1-tent-2': true, ... }
  const [filter, setFilter] = useState({ locationId: '', tentIndex: '', blockIndex: '' });
  const [userLocationId, setUserLocationId] = useState(null);
  const router = useRouter();

  const load = async (d) => {
    setLoading(true); setError("");
    try {
      const { items } = await fetchDepartures(d);
      const me = await getMe().catch(() => null);
      
      // Filter for location_user role
      let filteredData = items || [];
      if (me?.user?.role === 'location_user' && me?.user?.locationId) {
        setUserLocationId(me.user.locationId);
        filteredData = filteredData.filter(item => Number(item.location_id) === Number(me.user.locationId));
      }
      
      setItems(filteredData);
    } catch (e) {
      setError(e.message || "Failed to load departures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(date); }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter.locationId && String(item.location_id) !== String(filter.locationId)) return false;
      if (filter.tentIndex && String(item.tent_index) !== String(filter.tentIndex)) return false;
      if (filter.blockIndex && String(item.block_index) !== String(filter.blockIndex)) return false;
      return true;
    });
  }, [items, filter]);

  const downloadCSV = () => {
    // Prepare CSV data
    const headers = ['Location ID', 'Location Name', 'Tent Index', 'Block Index', 'Bed Number', 'Name', 'Phone', 'Contact Name', 'Gender', 'Start Date', 'End Date', 'Status'];
    const rows = filteredItems.map(item => [
      item.location_id,
      item.location_name || '',
      item.tent_index,
      item.block_index,
      item.bed_number,
      item.name || '',
      item.phone || '',
      item.contact_name || '',
      item.gender || '',
      item.start_date ? new Date(item.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '',
      item.end_date ? new Date(item.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '',
      item.status || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `departures_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build hierarchical structure: location -> tent -> block -> beds
  const hierarchy = useMemo(() => {
    const locs = new Map();
    for (const it of filteredItems) {
      const locKey = `loc-${it.location_id}`;
      if (!locs.has(locKey)) locs.set(locKey, { id: it.location_id, name: it.location_name, tents: new Map(), total: 0, male: 0, female: 0 });
      const loc = locs.get(locKey);
      loc.total++;
      if (it.gender === 'male') loc.male++;
      if (it.gender === 'female') loc.female++;

      const tentKey = `tent-${it.tent_index}`;
      if (!loc.tents.has(tentKey)) loc.tents.set(tentKey, { index: it.tent_index, blocks: new Map(), total: 0, male: 0, female: 0 });
      const tent = loc.tents.get(tentKey);
      tent.total++;
      if (it.gender === 'male') tent.male++;
      if (it.gender === 'female') tent.female++;

      const blockKey = `block-${it.block_index}`;
      if (!tent.blocks.has(blockKey)) tent.blocks.set(blockKey, { index: it.block_index, beds: [], total: 0, male: 0, female: 0, genderType: 'both' });
      const block = tent.blocks.get(blockKey);
      block.total++;
      if (it.gender === 'male') block.male++;
      if (it.gender === 'female') block.female++;
      block.beds.push(it);
      // Determine gender type for coloring
      if (block.male > 0 && block.female > 0) block.genderType = 'both';
      else if (block.male > 0) block.genderType = 'male';
      else if (block.female > 0) block.genderType = 'female';
    }
    return Array.from(locs.values()).map(loc => ({
      ...loc,
      tents: Array.from(loc.tents.values()).map(tent => ({
        ...tent,
        blocks: Array.from(tent.blocks.values())
      }))
    }));
  }, [filteredItems]);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-3 sm:p-4 max-w-5xl mx-auto">
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-fuchsia-900/20 border border-indigo-500/20 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Link href="/" className="inline-flex items-center gap-2 text-indigo-300 hover:underline text-sm sm:text-base touch-manipulation">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back
              </Link>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">Departures</h2>
            <p className="text-sm sm:text-base text-indigo-200/80">View seats expiring on a selected date.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button 
              className={`px-2 sm:px-3 py-1.5 rounded border text-xs sm:text-sm font-medium transition-all touch-manipulation ${selectedFilter === 'today-1' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-gray-200 hover:bg-white/10 active:bg-white/20'}`}
              onClick={()=>{ const now = new Date(); const istOffset = 5.5 * 60 * 60 * 1000; const istDate = new Date(now.getTime() + istOffset); istDate.setDate(istDate.getDate()-1); const d=istDate.toISOString().slice(0,10); setDate(d); setSelectedFilter('today-1'); load(d); }}
            >
              Yesterday
            </button>
            <button 
              className={`px-2 sm:px-3 py-1.5 rounded border text-xs sm:text-sm font-medium transition-all touch-manipulation ${selectedFilter === 'today' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-gray-200 hover:bg-white/10 active:bg-white/20'}`}
              onClick={()=>{ const d=getTodayIST(); setDate(d); setSelectedFilter('today'); load(d); }}
            >
              Today
            </button>
            <button 
              className={`px-2 sm:px-3 py-1.5 rounded border text-xs sm:text-sm font-medium transition-all touch-manipulation ${selectedFilter === 'tomorrow' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-gray-200 hover:bg-white/10 active:bg-white/20'}`}
              onClick={()=>{ const now = new Date(); const istOffset = 5.5 * 60 * 60 * 1000; const istDate = new Date(now.getTime() + istOffset); istDate.setDate(istDate.getDate()+1); const d=istDate.toISOString().slice(0,10); setDate(d); setSelectedFilter('tomorrow'); load(d); }}
            >
              Tomorrow
            </button>
            <input 
              type="date" 
              value={date} 
              onChange={(e)=>{ setDate(e.target.value); setSelectedFilter('custom'); load(e.target.value); }} 
              min={MIN_DATE}
              max={MAX_DATE}
              className="px-2 py-1.5 rounded border border-white/10 bg-black/40 text-white text-xs sm:text-sm min-w-[120px] touch-manipulation" 
            />
            <button
              onClick={downloadCSV}
              disabled={!items.length}
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Download CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
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

      <div className="space-y-2">
        {hierarchy.map((loc) => {
          const locKey = `loc-${loc.id}`;
          const locExpanded = expanded[locKey];
          return (
            <div key={locKey} className="border border-blue-500/20 rounded-lg bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-blue-950/40 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggle(locKey)}>
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 text-blue-300 transition-transform ${locExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                  <span className="text-lg font-semibold text-white">{loc.name || `Location ${loc.id}`}</span>
                </div>
                <span className="text-sm text-gray-300">{loc.total} items</span>
              </div>

              {locExpanded && (
                <div className="border-t border-blue-500/20 bg-black/20">
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
                          <span className="text-sm text-gray-300">{tent.total}</span>
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
                                    <span className="text-xs text-gray-400">{block.beds.length}</span>
                                  </div>

                                  {blockExpanded && (
                                    <div className="bg-black/40 divide-y divide-white/5">
                                      {block.beds.map((bed) => (
                                        <div key={bed.id} className="px-4 py-2 pl-28 flex items-center justify-between hover:bg-white/5">
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">Bed {bed.bed_number}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${bed.gender?.toLowerCase() === 'male' ? 'bg-blue-500/20 text-blue-200' : 'bg-pink-500/20 text-pink-200'}`}>
                                              {bed.gender}
                                            </span>
                                            <button
                                              onClick={() => router.push(`/admin/edit?phone=${encodeURIComponent(bed.phone)}`)}
                                              className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs hover:bg-blue-500/30"
                                            >
                                              {bed.phone}
                                            </button>
                                            <span className="text-xs text-gray-300">{bed.contact_name || 'No name'}</span>
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {bed.start_date ? new Date(bed.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'} → {new Date(bed.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })}
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
        {!loading && !filteredItems.length && items.length > 0 && <div className="text-sm text-gray-300">No departures match the selected filters</div>}
        {!loading && !items.length && <div className="text-sm text-gray-300">No departures for {date}</div>}
      </div>
    </div>
  );
}

export default function DeparturesPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <DeparturesContent />
    </ProtectedRoute>
  );
}
