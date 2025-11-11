"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDepartures, getMe } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TableSkeleton } from "@/components/Skeleton";
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
  const [tempDate, setTempDate] = useState(() => getTodayIST());
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [items, setItems] = useState([]);
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
  const [sortConfig, setSortConfig] = useState({ key: 'bed_number', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('bs_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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

  // Load data with server-side pagination and sorting
  const load = async (d, currentPage = 1, sortField = 'bed_number', sortOrder = 'asc') => {
    setLoading(true); setError("");
    try {
      const response = await fetchDepartures(d, { 
        page: currentPage, 
        limit: itemsPerPage, 
        sortField, 
        sortOrder,
        location_id: filters.location_id,
        tent_index: filters.tent_index,
        block_index: filters.block_index
      });
      
      // Data is already filtered on backend based on filters.location_id
      setItems(response.items || []);
      setTotalItems(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
    } catch (e) {
      setError(e.message || "Failed to load departures");
    } finally {
      setLoading(false);
    }
  };

  // Initial load and reload when page/sort changes (NOT date)
  useEffect(() => { 
    load(date, page, sortConfig.key, sortConfig.direction); 
  }, [page, sortConfig]);

  // Load data on mount
  useEffect(() => {
    loadLocations();
    load(date, 1, sortConfig.key, sortConfig.direction);
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
      setFilters(prev => ({ ...prev, tent_index: "", block_index: "" }));
      setBlocks([]);
    } else {
      setTents([]);
      setBlocks([]);
    }
  }, [filters.location_id]);

  useEffect(() => {
    if (filters.location_id && filters.tent_index) {
      loadBlocks(filters.location_id, filters.tent_index);
      setFilters(prev => ({ ...prev, block_index: "" }));
    } else {
      setBlocks([]);
    }
  }, [filters.tent_index]);

  // Sort handler
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setPage(1); // Reset to page 1 when sorting changes
  };

  // Date change handlers
  const handleDateChange = (newDate) => {
    setTempDate(newDate);
    setSelectedFilter('custom');
  };

  const applyDate = () => {
    setDate(tempDate);
    setPage(1);
    load(tempDate, 1, sortConfig.key, sortConfig.direction);
  };

  const applyQuickFilter = (filterType) => {
    const today = getTodayIST();
    const todayDate = new Date(today);
    let targetDate;
    
    switch(filterType) {
      case 'today-1':
        todayDate.setDate(todayDate.getDate() - 1);
        targetDate = todayDate.toISOString().slice(0,10);
        break;
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        todayDate.setDate(todayDate.getDate() + 1);
        targetDate = todayDate.toISOString().slice(0,10);
        break;
      default:
        return;
    }
    
    setSelectedFilter(filterType);
    setDate(targetDate);
    setTempDate(targetDate);
    setPage(1);
    load(targetDate, 1, sortConfig.key, sortConfig.direction);
  };

  const sendCSVEmail = async () => {
    if (!email || !email.includes('@')) {
      setNotification({ show: true, type: 'error', message: 'Please enter a valid email address' });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      return;
    }

    setSendingCSV(true);
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('bs_token') : null;
      
      const response = await fetch(`${API_BASE_URL}/api/allocations/departures/send-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          date,
          sortField: sortConfig.key,
          sortOrder: sortConfig.direction,
          location_id: filters.location_id,
          tent_index: filters.tent_index,
          block_index: filters.block_index,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send CSV');
      }

      setNotification({ 
        show: true, 
        type: 'success', 
        message: `CSV with ${data.recordCount} records sent to ${data.message.includes('intended for') ? email : data.message}` 
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

  const downloadCSV = () => {
    const headers = ['Location ID', 'Location Name', 'Tent Name', 'Block Name', 'Bed Number', 'Name', 'Phone', 'Start Date', 'End Date', 'Status'];
    const rows = items.map(item => [
      item.location_id,
      item.location_name || '',
      item.tent_name || `Tent ${item.tent_index}`,
      item.block_name || `Block ${item.block_index}`,
      item.bed_number,
      item.name || '',
      item.phone || '',
      item.start_date ? new Date(item.start_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
      item.end_date ? new Date(item.end_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
      item.status || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `departures_${date}.csv`;
    link.click();
  };

  return (
    <div className="p-3 sm:p-4 max-w-[1800px] mx-auto">
      {/* Header */}
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-blue-900/20 border border-indigo-500/20 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="relative">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link href="/" className="inline-flex items-center gap-2 text-indigo-300 hover:underline text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Back
            </Link>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 to-blue-300 bg-clip-text text-transparent">
            Departures
          </h2>
          <p className="text-sm sm:text-base text-indigo-200/80">
            View all departures for a specific date
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

      {/* Quick Filters */}
      <section className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => applyQuickFilter('today-1')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'today-1' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
          Yesterday
        </button>
        <button onClick={() => applyQuickFilter('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
          Today
        </button>
        <button onClick={() => applyQuickFilter('tomorrow')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'tomorrow' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
          Tomorrow
        </button>
      </section>

      {/* Date Picker, Apply Button, Email and Send CSV */}
      <section className="mb-4 rounded-xl border border-gray-700 bg-gray-900/50 backdrop-blur p-4">
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
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium text-gray-300">Date:</label>
            <input 
              type="date" 
              value={tempDate} 
              onChange={(e) => handleDateChange(e.target.value)} 
              min={MIN_DATE} 
              max={MAX_DATE} 
              className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white text-sm [color-scheme:dark]" 
            />
          </div>
          
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
                  disabled={sendingCSV || loading || items.length === 0}
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
                onClick={applyDate}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      {loading && <TableSkeleton rows={10} columns={9} />}
      {!loading && items.length > 0 && (
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
                {items.map((item, idx) => {
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
          {totalPages > 1 && (
            <div className="bg-gray-800/30 px-4 py-3 flex items-center justify-between border-t border-white/10">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, totalItems)} of {totalItems} results
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
      {!loading && !items.length && <div className="text-sm text-gray-300">No departures for {date}</div>}
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
