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
  const [filter, setFilter] = useState({ locationId: '', tentIndex: '', blockIndex: '' });
  const [userLocationId, setUserLocationId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
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

  // Sort handler
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      if (filter.locationId && String(item.location_id) !== String(filter.locationId)) return false;
      if (filter.tentIndex && String(item.tent_index) !== String(filter.tentIndex)) return false;
      if (filter.blockIndex && String(item.block_index) !== String(filter.blockIndex)) return false;
      return true;
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Convert to strings for comparison (handles numbers and strings)
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, filter, sortConfig]);

  const downloadCSV = () => {
    // Prepare CSV data
    const headers = ['Location ID', 'Location Name', 'Tent Name', 'Block Name', 'Bed Number', 'Name', 'Phone', 'Gender', 'Start Date', 'End Date', 'Status'];
    const rows = filteredItems.map(item => [
      item.location_id,
      item.location_name || '',
      item.tent_name || `Tent ${item.tent_index}`,
      item.block_name || `Block ${item.block_index}`,
      item.bed_number,
      item.name || '',
      item.phone || '',
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

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
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
                {Array.from(new Set(items.filter(i => !filter.locationId || String(i.location_id) === String(filter.locationId)).map(i=>i.tent_index))).map(idx => {
                  const item = items.find(i => i.tent_index === idx);
                  return <option key={idx} value={idx}>{item?.tent_name || `Tent ${idx}`}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Block</label>
              <select value={filter.blockIndex} onChange={e=>setFilter(f=>({...f, blockIndex: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm">
                <option value="">All Blocks</option>
                {Array.from(new Set(items.filter(i => (!filter.locationId || String(i.location_id) === String(filter.locationId)) && (!filter.tentIndex || String(i.tent_index) === String(filter.tentIndex))).map(i=>i.block_index))).map(idx => {
                  const item = items.find(i => i.block_index === idx);
                  return <option key={idx} value={idx}>{item?.block_name || `Block ${idx}`}</option>;
                })}
              </select>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-2">
        {!loading && !filteredItems.length && items.length > 0 && <div className="text-sm text-gray-300">No departures match the selected filters</div>}
        {!loading && !items.length && <div className="text-sm text-gray-300">No departures for {date}</div>}
        {filteredItems.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
                  <tr>
                    <th onClick={() => handleSort('location_name')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Location
                        {sortConfig.key === 'location_name' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('tent_index')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Tent
                        {sortConfig.key === 'tent_index' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('block_index')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Block
                        {sortConfig.key === 'block_index' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('bed_number')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Bed
                        {sortConfig.key === 'bed_number' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Name
                        {sortConfig.key === 'name' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('phone')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Phone
                        {sortConfig.key === 'phone' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('gender')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Gender
                        {sortConfig.key === 'gender' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('start_date')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Check-in
                        {sortConfig.key === 'start_date' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('end_date')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-1">
                        Check-out
                        {sortConfig.key === 'end_date' && (
                          <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredItems.map((item, idx) => {
                    const isMale = item.gender?.toLowerCase() === 'male';
                    return (
                    <tr 
                      key={idx}
                      className={`${isMale ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-pink-500/10 hover:bg-pink-500/20'} transition-colors`}
                    >
                      <td className="px-4 py-3 text-white/90 whitespace-nowrap">{item.location_name}</td>
                      <td className="px-4 py-3 text-white/80">{item.tent_name || `Tent ${item.tent_index}`}</td>
                      <td className="px-4 py-3 text-white/80">{item.block_name || `Block ${item.block_index}`}</td>
                      <td className="px-4 py-3 text-white/90 font-semibold">{item.bed_number}</td>
                      <td className="px-4 py-3 text-white/90 whitespace-nowrap">{item.name || 'No name'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/admin/edit?phone=${encodeURIComponent(item.phone)}`)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                        >
                          {item.phone}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${isMale ? 'bg-blue-500/30 text-blue-200' : 'bg-pink-500/30 text-pink-200'}`}>
                          {isMale ? 'Male' : 'Female'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {item.start_date ? new Date(item.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {item.end_date ? new Date(item.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
