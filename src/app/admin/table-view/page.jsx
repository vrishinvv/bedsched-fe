"use client";
import { useEffect, useState, useMemo, useRef } from "react";
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

function TableViewContent() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingCSV, setSendingCSV] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [userRole, setUserRole] = useState(null);
  const [userLocationId, setUserLocationId] = useState(null);
  const [locations, setLocations] = useState([]);
  const [tents, setTents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    gender: "",
    allocatedBy: "",
    location_id: "",
    tent_index: "",
    block_index: "",
    statusFilter: {
      active: true,
      expired: true,
      left_early: true,
      no_show: true,
      booking_error: true,
      other: true
    }
  });

  const itemsPerPage = 50;
  const userDropdownRef = useRef(null);

  useEffect(() => {
    loadUsers();
    loadLocations();
  }, []);

  useEffect(() => {
    console.log('=== TABLE VIEW: useEffect triggered ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    loadLocations();
    loadUsers();
    // Fetch user role and location
    console.log('About to fetch /api/auth/me');
    fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders() })
      .then(res => {
        console.log('Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('User data fetched:', data);
        console.log('User role:', data?.user?.role);
        setUserRole(data?.user?.role);
        if (data?.user?.role === 'location_user' && data?.user?.locationId) {
          setUserLocationId(data.user.locationId);
          setFilters(prev => ({ ...prev, location_id: String(data.user.locationId) }));
        }
      })
      .catch((err) => {
        console.error('Error fetching user:', err);
      });
  }, []);

  useEffect(() => {
    loadAllocations();
  }, [page, sortField, sortOrder]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/list`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
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

  const applyFilters = () => {
    setPage(1); // Reset to first page when applying filters
    loadAllocations();
  };

  const sendCSVEmail = async () => {
    if (!email || !email.includes('@')) {
      setNotification({ show: true, type: 'error', message: 'Please enter a valid email address' });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      return;
    }

    setSendingCSV(true);
    try {
      // Build status filter string
      const activeStatuses = [];
      if (filters.statusFilter.active) activeStatuses.push('active');
      if (filters.statusFilter.expired) activeStatuses.push('expired');
      if (filters.statusFilter.left_early) activeStatuses.push('left_early');
      if (filters.statusFilter.no_show) activeStatuses.push('no_show');
      if (filters.statusFilter.booking_error) activeStatuses.push('booking_error');
      if (filters.statusFilter.other) activeStatuses.push('other');

      const response = await fetch(`${API_BASE_URL}/api/allocations/send-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          email,
          filters: {
            search: filters.search,
            startDate: filters.startDate,
            endDate: filters.endDate,
            gender: filters.gender,
            allocatedBy: filters.allocatedBy,
            location_id: filters.location_id,
            tent_index: filters.tent_index,
            block_index: filters.block_index,
            status: activeStatuses.join(','),
            sortField,
            sortOrder,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send CSV');
      }

      setNotification({ 
        show: true, 
        type: 'success', 
        message: `CSV with ${data.recordCount} records sent to ${email}` 
      });
      setEmail(''); // Clear email input
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

  const loadAllocations = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortField,
        sortOrder,
      });

      // Add filters to query params
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.allocatedBy) params.append('allocatedBy', filters.allocatedBy);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.tent_index) params.append('tent_index', filters.tent_index);
      if (filters.block_index) params.append('block_index', filters.block_index);
      
      // Add status filters as comma-separated string
      const activeStatuses = [];
      if (filters.statusFilter.active) activeStatuses.push('active');
      if (filters.statusFilter.expired) activeStatuses.push('expired');
      if (filters.statusFilter.left_early) activeStatuses.push('left_early');
      if (filters.statusFilter.no_show) activeStatuses.push('no_show');
      if (filters.statusFilter.booking_error) activeStatuses.push('booking_error');
      if (filters.statusFilter.other) activeStatuses.push('other');
      if (activeStatuses.length > 0) {
        params.append('status', activeStatuses.join(','));
      }

      const response = await fetch(`${API_BASE_URL}/api/allocations/table-view?${params}`, {
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load allocations");

      const data = await response.json();
      setAllocations(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (e) {
      setError(e.message || "Failed to load allocations");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1); // Reset to page 1 when sorting/filtering changes
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-500 ml-1">⇅</span>;
    return <span className="text-blue-400 ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
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
            All Allocations
          </h2>
          <p className="text-sm sm:text-base text-indigo-200/80">
            Complete history of all allocations (was_occupied = true)
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Search (Name/Phone)</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search..."
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            />
          </div>
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
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              min="2025-11-01"
              max="2025-11-30"
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              min="2025-11-01"
              max="2025-11-30"
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="relative" ref={userDropdownRef}>
            <label className="block text-xs font-medium text-gray-300 mb-1">Allocated By</label>
            <input
              type="text"
              value={userSearch || filters.allocatedBy}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              placeholder="Search user..."
              className="w-full rounded-lg border border-gray-600 px-3 py-2 bg-gray-800 text-white text-sm"
            />
            {showUserDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div
                  onClick={() => {
                    setFilters(prev => ({ ...prev, allocatedBy: "" }));
                    setUserSearch("");
                    setShowUserDropdown(false);
                  }}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-300"
                >
                  All Users
                </div>
                {users
                  .filter(username => 
                    username.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map(username => (
                    <div
                      key={username}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, allocatedBy: username }));
                        setUserSearch(username);
                        setShowUserDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-white"
                    >
                      {username}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Checkboxes */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-2">Filter by Status</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusFilter.active}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statusFilter: { ...prev.statusFilter, active: e.target.checked }
                }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-300">Confirmed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusFilter.expired}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statusFilter: { ...prev.statusFilter, expired: e.target.checked }
                }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">Expired</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusFilter.left_early}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statusFilter: { ...prev.statusFilter, left_early: e.target.checked }
                }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">Left Early</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusFilter.no_show}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statusFilter: { ...prev.statusFilter, no_show: e.target.checked }
                }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">No-show</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusFilter.booking_error}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statusFilter: { ...prev.statusFilter, booking_error: e.target.checked }
                }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">Booking Error</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusFilter.other}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statusFilter: { ...prev.statusFilter, other: e.target.checked }
                }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">Other Deallocations</span>
            </label>
          </div>
        </div>

        {/* Apply Filters Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mt-4">
          {/* Debug: Show current user role */}
          <div className="text-xs text-gray-500">Role: {userRole || 'not loaded'}</div>
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
                disabled={sendingCSV}
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

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap w-16">S.No</th>
                <th onClick={() => handleSort("name")} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th onClick={() => handleSort("phone")} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Phone <SortIcon field="phone" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Tent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Block</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Bed</th>
                <th onClick={() => handleSort("start_date")} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Start Date <SortIcon field="start_date" />
                  </div>
                </th>
                <th onClick={() => handleSort("end_date")} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    End Date <SortIcon field="end_date" />
                  </div>
                </th>
                <th onClick={() => handleSort("updated_at")} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Updated <SortIcon field="updated_at" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">Allocated By</th>
                <th onClick={() => handleSort("status")} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="13" className="px-4 py-8 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : allocations.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-4 py-8 text-center text-gray-400">
                    No allocations found
                  </td>
                </tr>
              ) : (
                allocations.map((allocation, index) => {
                  const isMale = allocation.gender?.toLowerCase() === 'male';
                  const today = new Date();
                  const endDate = new Date(allocation.end_date);
                  const isActive = !allocation.deleted_at && endDate >= today;
                  const isDeallocated = allocation.deleted_at !== null;
                  const isExpired = !allocation.deleted_at && endDate < today;
                  
                  return (
                  <tr 
                    key={allocation.id} 
                    className={`${isMale ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-pink-500/10 hover:bg-pink-500/20'} transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-4 py-3 text-white/90 whitespace-nowrap font-medium">{allocation.name}</td>
                    <td className="px-4 py-3 text-white/80">{allocation.phone}</td>
                    <td className="px-4 py-3 text-white/90 whitespace-nowrap">{allocation.location_name}</td>
                    <td className="px-4 py-3 text-white/80">{allocation.tent_name || `Tent ${allocation.tent_index}`}</td>
                    <td className="px-4 py-3 text-white/80">{allocation.block_name || `Block ${allocation.block_index}`}</td>
                    <td className="px-4 py-3 text-white/90 font-semibold">{allocation.bed_number}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(allocation.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(allocation.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(allocation.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="px-4 py-3 text-white/80 text-xs">
                      {allocation.allocated_by || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      {isActive && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                          Confirmed
                        </span>
                      )}
                      {isDeallocated && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300">
                          {allocation.reason === 'left_early' ? 'Left Early' :
                           allocation.reason === 'no_show' ? 'No-show' :
                           allocation.reason === 'booking_error' ? 'Booking Error' :
                           'Deallocated'}
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/locations/${allocation.location_id}/tents/${allocation.tent_index}/blocks/${allocation.block_index}`}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors inline-block"
                      >
                        Go to Bed
                      </Link>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-800/30 px-4 py-3 flex items-center justify-between border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TableViewPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <TableViewContent />
    </ProtectedRoute>
  );
}
