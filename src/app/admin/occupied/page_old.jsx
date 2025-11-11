"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchCurrentlyOccupied, getMe } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TreeSkeleton } from "@/components/Skeleton";
import ProtectedRoute from "@/components/ProtectedRoute";

function CurrentlyOccupiedContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ locationId: '', tentName: '', blockIndex: '' });
  const [userLocationId, setUserLocationId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  const router = useRouter();

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { items } = await fetchCurrentlyOccupied();
      const me = await getMe().catch(() => null);
      
      // Filter for location_user role
      let filteredData = items || [];
      if (me?.user?.role === 'location_user' && me?.user?.locationId) {
        setUserLocationId(me.user.locationId);
        filteredData = filteredData.filter(item => Number(item.location_id) === Number(me.user.locationId));
      }
      
      setItems(filteredData);
    } catch (e) {
      setError(e.message || "Failed to load currently occupied");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      if (filter.tentName) {
        const itemTentName = item.tent_name || `Tent ${String.fromCharCode(64 + item.tent_index)}`;
        if (itemTentName !== filter.tentName) return false;
      }
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

  // Paginate filtered items
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, page]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, sortConfig]);

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
    const today = new Date().toISOString().slice(0,10);
    link.setAttribute('download', `currently_occupied_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-900/20 via-teal-900/20 to-cyan-900/20 border border-emerald-500/20 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Link href="/" className="inline-flex items-center gap-2 text-emerald-300 hover:underline text-sm sm:text-base touch-manipulation">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back
              </Link>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Currently Occupied</h2>
            <p className="text-sm sm:text-base text-emerald-200/80">View all confirmed beds currently occupied.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={load}
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-xs sm:text-sm transition-all touch-manipulation"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </button>
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
        <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-3 sm:p-4 mb-4">
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
              <select value={filter.tentName} onChange={e=>setFilter(f=>({...f, tentName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm">
                <option value="">All Tents</option>
                {(() => {
                  // Get all items matching the location filter
                  const filteredItems = items.filter(i => !filter.locationId || String(i.location_id) === String(filter.locationId));
                  // Create options for each unique tent name
                  const uniqueTentNames = new Set();
                  const options = [];
                  filteredItems.forEach(item => {
                    const tentName = item.tent_name || `Tent ${String.fromCharCode(64 + item.tent_index)}`;
                    if (!uniqueTentNames.has(tentName)) {
                      uniqueTentNames.add(tentName);
                      options.push({
                        value: tentName,
                        label: tentName,
                        index: item.tent_index
                      });
                    }
                  });
                  // Sort by tent index
                  options.sort((a, b) => a.index - b.index);
                  return options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ));
                })()}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Block</label>
              <select value={filter.blockIndex} onChange={e=>setFilter(f=>({...f, blockIndex: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm">
                <option value="">All Blocks</option>
                {Array.from(new Set(items.filter(i => {
                  if (filter.locationId && String(i.location_id) !== String(filter.locationId)) return false;
                  if (filter.tentName) {
                    const tentName = i.tent_name || `Tent ${String.fromCharCode(64 + i.tent_index)}`;
                    if (tentName !== filter.tentName) return false;
                  }
                  return true;
                }).map(i=>i.block_index))).map(idx => {
                  const item = items.find(i => {
                    if (i.block_index !== idx) return false;
                    if (filter.locationId && String(i.location_id) !== String(filter.locationId)) return false;
                    if (filter.tentName) {
                      const tentName = i.tent_name || `Tent ${String.fromCharCode(64 + i.tent_index)}`;
                      if (tentName !== filter.tentName) return false;
                    }
                    return true;
                  });
                  return <option key={idx} value={idx}>{item?.block_name || `Block ${idx}`}</option>;
                })}
              </select>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-2">
        {!loading && !filteredItems.length && items.length > 0 && <div className="text-sm text-gray-300">No occupied beds match the selected filters</div>}
        {!loading && !items.length && <div className="text-sm text-gray-300">No beds currently occupied</div>}
        {!loading && filteredItems.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap w-16">S.No</th>
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
                  {paginatedItems.map((item, idx) => {
                    const isMale = item.gender?.toLowerCase() === 'male';
                    const globalIndex = (page - 1) * itemsPerPage + idx;
                    return (
                    <tr 
                      key={idx}
                      className={`${isMale ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-pink-500/10 hover:bg-pink-500/20'} transition-colors`}
                    >
                      <td className="px-4 py-3 text-gray-400">{globalIndex + 1}</td>
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
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {item.start_date ? new Date(item.start_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {item.end_date ? new Date(item.end_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'N/A'}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredItems.length > itemsPerPage && (
              <div className="bg-gray-800/30 px-4 py-3 flex items-center justify-between border-t border-white/10">
                <div className="text-sm text-gray-400">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredItems.length)} of {filteredItems.length} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-400 text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CurrentlyOccupiedPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <CurrentlyOccupiedContent />
    </ProtectedRoute>
  );
}
