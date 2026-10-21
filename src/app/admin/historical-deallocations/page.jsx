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
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [tempDate, setTempDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sendingCSV, setSendingCSV] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [userRole, setUserRole] = useState(null);
  const [userLocationId, setUserLocationId] = useState(null);
  const [locations, setLocations] = useState([]);
  const [tents, setTents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filters, setFilters] = useState({
    location_id: "",
    tent_index: "",
    block_index: ""
  });

  const loadLocations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/locations`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data || []);
      }
    } catch (e) {
      console.error('Failed to load locations:', e);
    }
  };

  const loadTents = async (locationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTents(data.tents || []);
      }
    } catch (e) {
      console.error('Failed to load tents:', e);
    }
  };

  const loadBlocks = async (locationId, tentIndex) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks || []);
      }
    } catch (e) {
      console.error('Failed to load blocks:', e);
    }
  };

  useEffect(() => {
    loadLocations();
    // Fetch user role and location
    fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        setUserRole(data?.user?.role);
        if (data?.user?.role === 'location_user' && data?.user?.locationId) {
          setUserLocationId(data.user.locationId);
          setFilters(prev => ({ ...prev, location_id: String(data.user.locationId) }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.location_id) {
      loadTents(filters.location_id);
      setBlocks([]);
      setFilters(prev => ({ ...prev, tent_index: "", block_index: "" }));
    } else {
      setTents([]);
      setBlocks([]);
      setFilters(prev => ({ ...prev, tent_index: "", block_index: "" }));
    }
  }, [filters.location_id]);

  useEffect(() => {
    if (filters.location_id && filters.tent_index) {
      loadBlocks(filters.location_id, filters.tent_index);
      setFilters(prev => ({ ...prev, block_index: "" }));
    } else {
      setBlocks([]);
      setFilters(prev => ({ ...prev, block_index: "" }));
    }
  }, [filters.tent_index]);

  useEffect(() => {
    if (date) {
      loadData();
    }
  }, [date]);

  const loadData = async (dateValue = date, locationId = filters.location_id, tentIndex = filters.tent_index, blockIndex = filters.block_index) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date: dateValue });
      if (locationId) params.append('location_id', locationId);
      if (tentIndex) params.append('tent_index', tentIndex);
      if (blockIndex) params.append('block_index', blockIndex);

      const response = await fetch(`${API_BASE_URL}/api/allocations/historical-deallocations?${params}`, {
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load data");

      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Apply all filters including date
    if (tempDate) {
      setDate(tempDate);
      loadData(tempDate, filters.location_id, filters.tent_index, filters.block_index);
    }
  };

  const sendCSVEmail = async () => {
    if (!email || !email.includes('@')) {
      setNotification({ show: true, type: 'error', message: 'Please enter a valid email address' });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      return;
    }

    setSendingCSV(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/allocations/historical-deallocations/send-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          email,
          date,
          location_id: filters.location_id,
          tent_index: filters.tent_index,
          block_index: filters.block_index,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send CSV');
      }

      setNotification({ 
        show: true, 
        type: 'success', 
        message: `CSV with ${result.recordCount} records sent to ${email}` 
      });
      setEmail(''); 
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
    } catch (e) {
      setNotification({ 
        show: true, 
        type: 'error', 
        message: e.message || 'Failed to send CSV email' 
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
    } finally {
      setSendingCSV(false);
    }
  };

  const getReasonBadge = (reason) => {
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
            View expired allocations and manual deallocations for a specific date
          </p>
        </div>
      </section>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/20 rounded text-red-100">
          {error}
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`mb-4 p-4 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-green-900/30 border-green-500/20 text-green-100' 
            : 'bg-red-900/30 border-red-500/20 text-red-100'
        } flex items-center gap-3`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filters */}
      <section className="rounded-xl border border-gray-700 bg-gray-900/50 backdrop-blur p-4 mb-4">
        {/* Location/Tent/Block Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-700">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Location</label>
            <select
              value={filters.location_id}
              onChange={(e) => setFilters(prev => ({ ...prev, location_id: e.target.value }))}
              disabled={userRole === 'location_user'}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Tent</label>
            <select
              value={filters.tent_index}
              onChange={(e) => setFilters(prev => ({ ...prev, tent_index: e.target.value }))}
              disabled={!filters.location_id}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Tents</option>
              {tents.map(tent => (
                <option key={tent.index} value={tent.index}>
                  {tent.name || `Tent ${tent.index}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Block</label>
            <select
              value={filters.block_index}
              onChange={(e) => setFilters(prev => ({ ...prev, block_index: e.target.value }))}
              disabled={!filters.tent_index}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Blocks</option>
              {blocks.map(block => (
                <option key={block.index} value={block.index}>
                  {block.name || `Block ${block.index}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selection */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium text-gray-300">Date:</label>
          <input
            type="date"
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
            className="rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm [color-scheme:dark]"
          />
        </div>

        {/* Send CSV and Apply Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          {userRole === 'admin' && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-300 mb-1">Send CSV to Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            {userRole === 'admin' && (
              <button
                onClick={sendCSVEmail}
                disabled={sendingCSV || loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
              {sendingCSV ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send CSV
                </>
              )}
              </button>
            )}
            <button
              onClick={applyFilters}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-400">Loading...</span>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Expired Allocations Section */}
          <section className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-gray-200">Allocations Expired on {data.previousDate}</h3>
              <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full text-sm font-medium">
                {data.expiredCount || 0} expired
              </span>
            </div>
            
            {!data.expiredAllocations || data.expiredAllocations.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center text-gray-400">
                No allocations expired on this date
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap w-16">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Location/Bed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">End Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.expiredAllocations.map((alloc, index) => {
                        const isMale = alloc.gender?.toLowerCase() === 'male';
                        return (
                          <tr 
                            key={alloc.id}
                            className={`${isMale ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-pink-500/10 hover:bg-pink-500/20'} transition-colors`}
                          >
                            <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 text-white/90 whitespace-nowrap font-medium">{alloc.name}</td>
                            <td className="px-4 py-3 text-white/80">{alloc.phone}</td>
                            <td className="px-4 py-3 text-white/90 whitespace-nowrap">
                              {alloc.location_name}<br/>
                              <span className="text-xs text-gray-400">
                                {alloc.tent_name || `Tent ${alloc.tent_index}`} - {alloc.block_name || `Block ${alloc.block_index}`} - Bed {alloc.bed_number}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                              {new Date(alloc.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                              {new Date(alloc.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Manual Deallocations Section */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-gray-200">Manual Deallocations on {data.date}</h3>
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium">
                {data.manualCount || 0} deallocated
              </span>
            </div>
            
            {!data.manualDeallocations || data.manualDeallocations.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center text-gray-400">
                No manual deallocations on this date
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap w-16">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Deallocated At</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Location/Bed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Deallocated By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.manualDeallocations.map((dealloc, index) => {
                        const isMale = dealloc.gender?.toLowerCase() === 'male';
                        return (
                          <tr 
                            key={dealloc.id}
                            className={`${isMale ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-pink-500/10 hover:bg-pink-500/20'} transition-colors`}
                          >
                            <td className="px-4 py-3 text-gray-400">{index + 1}</td>
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
                              {getReasonBadge(dealloc.reason)}
                            </td>
                            <td className="px-4 py-3 text-white/80">{dealloc.deallocated_by || 'System'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
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
