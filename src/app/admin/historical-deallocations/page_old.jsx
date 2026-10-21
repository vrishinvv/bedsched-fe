"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('bs_token');
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function HistoricalDeallocationsContent() {
  const [deallocations, setDeallocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState("deleted_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "", // 'manual' or 'automatic'
    reason: "",
  });

  const itemsPerPage = 50;

  useEffect(() => {
    loadDeallocations();
  }, [page, sortField, sortOrder]);

  const loadDeallocations = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortField: sortField,
        sortOrder: sortOrder,
      });
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type) params.append('type', filters.type);
      if (filters.reason) params.append('reason', filters.reason);

      const response = await fetch(`${API_BASE_URL}/api/allocations/historical-deallocations?${params}`, {
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load deallocations");

      const data = await response.json();
      setDeallocations(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (e) {
      setError(e.message || "Failed to load deallocations");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setPage(1); // Reset to page 1 when applying filters
    loadDeallocations();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1); // Reset to page 1 when sorting changes
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-500 ml-1 cursor-pointer">⇅</span>;
    return <span className="text-blue-400 ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      type: "",
      reason: "",
    });
    setTimeout(() => loadDeallocations(), 100);
  };

  const getReasonBadge = (reason, type) => {
    if (type === 'automatic') {
      return <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300">Auto Cleanup</span>;
    }
    
    const badges = {
      left_early: <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">Left Early</span>,
      no_show: <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-300">No-show</span>,
      booking_error: <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300">Booking Error</span>,
      not_specified: <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-300">Not Specified</span>,
    };
    return badges[reason] || badges.not_specified;
  };

  return (
    <div className="p-3 sm:p-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-900/20 via-orange-900/20 to-yellow-900/20 border border-red-500/20 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="relative">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link href="/" className="inline-flex items-center gap-2 text-red-300 hover:underline text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Back
            </Link>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
            Historical Deallocations
          </h2>
          <p className="text-sm sm:text-base text-red-200/80">
            View all manual and automatic deallocations with reasons
          </p>
        </div>
      </section>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/20 rounded text-red-100">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="rounded-xl border border-gray-700 bg-gray-900/50 backdrop-blur p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            >
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Reason</label>
            <select
              value={filters.reason}
              onChange={(e) => setFilters(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            >
              <option value="">All Reasons</option>
              <option value="left_early">Left Early</option>
              <option value="no_show">No-show</option>
              <option value="booking_error">Booking Error</option>
              <option value="not_specified">Not Specified</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </section>

      {/* Results */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap w-16">S.No</th>
                <th onClick={() => handleSort('deleted_at')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Deallocated On <SortIcon field="deleted_at" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th onClick={() => handleSort('phone')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Phone <SortIcon field="phone" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Location/Bed</th>
                <th onClick={() => handleSort('start_date')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Start Date <SortIcon field="start_date" />
                  </div>
                </th>
                <th onClick={() => handleSort('end_date')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    End Date <SortIcon field="end_date" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Reason</th>
                <th onClick={() => handleSort('deallocated_by')} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Deallocated By <SortIcon field="deallocated_by" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : deallocations.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                    No deallocations found for the selected filters
                  </td>
                </tr>
              ) : (
                deallocations.map((dealloc, index) => {
                  const isMale = dealloc.gender?.toLowerCase() === 'male';
                  return (
                  <tr 
                    key={dealloc.id}
                    className={`${isMale ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-pink-500/10 hover:bg-pink-500/20'} transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(dealloc.deleted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white/90 whitespace-nowrap font-medium">{dealloc.name}</td>
                    <td className="px-4 py-3 text-white/80">{dealloc.phone}</td>
                    <td className="px-4 py-3 text-white/90 whitespace-nowrap">
                      {dealloc.location_name}<br/>
                      <span className="text-xs text-gray-400">
                        {dealloc.tent_name || `Tent ${dealloc.tent_index}`} - {dealloc.block_name || `Block ${dealloc.block_index}`} - Bed {dealloc.bed_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(dealloc.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(dealloc.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="px-4 py-3">
                      {dealloc.deallocation_type === 'automatic' ? (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300">Automatic</span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getReasonBadge(dealloc.reason, dealloc.deallocation_type)}
                    </td>
                    <td className="px-4 py-3 text-white/80">{dealloc.deallocated_by || 'System'}</td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {deallocations.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Showing</p>
            <p className="text-2xl font-bold text-white">{deallocations.length}</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Manual</p>
            <p className="text-2xl font-bold text-blue-400">
              {deallocations.filter(d => d.deallocation_type === 'manual').length}
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Automatic</p>
            <p className="text-2xl font-bold text-purple-400">
              {deallocations.filter(d => d.deallocation_type === 'automatic').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoricalDeallocationsPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <HistoricalDeallocationsContent />
    </ProtectedRoute>
  );
}
