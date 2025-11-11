"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchAnalytics, triggerBackup, getLocations } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function AnalyticsContent() {
  const [data, setData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [tents, setTents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    locationId: '',
    tentIndex: '',
    blockIndex: ''
  });

  // Load locations for filter
  useEffect(() => {
    getLocations().then(res => {
      // API returns array directly, not wrapped
      setLocations(Array.isArray(res) ? res : []);
    }).catch(console.error);
  }, []);

  // Load tents when location changes
  useEffect(() => {
    if (!filters.locationId) {
      setTents([]);
      setBlocks([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/locations/${filters.locationId}/tents`, {
      headers: {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bs_token') : ''}`
      }
    })
      .then(res => res.json())
      .then(data => setTents(data.tents || []))
      .catch(console.error);
  }, [filters.locationId]);

  // Load blocks when tent changes
  useEffect(() => {
    if (!filters.locationId || !filters.tentIndex) {
      setBlocks([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/locations/${filters.locationId}/tents/${filters.tentIndex}/blocks`, {
      headers: {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bs_token') : ''}`
      }
    })
      .then(res => res.json())
      .then(data => setBlocks(data.blocks || []))
      .catch(console.error);
  }, [filters.locationId, filters.tentIndex]);

  // Load analytics data
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAnalytics(filters);
      setData(result.data);
    } catch (e) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess(false);
    try {
      await triggerBackup();
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 5000);
    } catch (e) {
      setError(e.message || "Failed to trigger backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadData();
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      locationId: '',
      tentIndex: '',
      blockIndex: ''
    });
    setTimeout(() => loadData(), 100);
  };

  // Location-based color mapping by location name (stable function)
  const getLocationColor = (locationName) => {
    const colorMap = {
      'Anand Vilas Enclave': '#fbbf24', // Yellow
      'Brindavan Enclave': '#10b981', // Green
      'Sai Sruthi Enclave': '#3b82f6', // Blue
      'Dharmakshetra Enclave': '#f97316', // Orange
      'Shivam Enclave': '#6366f1', // Indigo
      'Sundaram Enclave': '#ec4899', // Pink
      'New Block B Basement': '#ef4444', // Red
      'New Block A': '#f43f5e', // Rosy Red
      'New Block B': '#991b1b', // Maroon Red
    };
    return colorMap[locationName] || '#6b7280'; // gray fallback
  };

  // Gender pie chart colors (handle both lowercase and capitalized)
  const getGenderColor = (gender) => {
    const normalized = gender?.toLowerCase();
    if (normalized === 'male') return '#3b82f6';
    if (normalized === 'female') return '#ec4899';
    return '#6b7280'; // gray for other
  };

  // Format date to show just day number for November 2025
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.getDate().toString(); // Just the day number (11, 12, 13)
  };

  // Process deallocations data for stacked bar chart
  const deallocationChartData = useMemo(() => {
    if (!data?.dailyDeallocations) return [];
    
    // Group by date
    const grouped = {};
    data.dailyDeallocations.forEach(row => {
      const dateLabel = formatDateLabel(row.date);
      if (!grouped[dateLabel]) {
        grouped[dateLabel] = { dateLabel, date: row.date, left_early: 0, no_show: 0, booking_error: 0, not_specified: 0 };
      }
      const reason = row.reason || 'not_specified';
      grouped[dateLabel][reason] = parseInt(row.count);
    });
    
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.dailyDeallocations]);

  // Process user allocations data for multi-line chart
  const userChartData = useMemo(() => {
    if (!data?.userAllocations) return [];
    
    // Group by date
    const byDate = {};
    data.userAllocations.forEach(item => {
      const date = item.date;
      if (!byDate[date]) byDate[date] = { date, dateLabel: formatDateLabel(date) };
      const username = item.username && item.username !== 'Unknown' ? item.username : 'Unknown';
      byDate[date][username] = (byDate[date][username] || 0) + parseInt(item.count);
      byDate[date][`${username}_location`] = item.location_id;
      byDate[date][`${username}_locationName`] = item.location_name;
    });
    
    return Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data?.userAllocations]);

  // Get unique users for line chart with their location names for color coding
  const uniqueUsers = useMemo(() => {
    if (!data?.userAllocations) return [];
    const users = new Map();
    data.userAllocations.forEach(item => {
      const username = item.username && item.username !== 'Unknown' ? item.username : 'Unknown';
      if (!users.has(username)) {
        let color;
        if (username.toLowerCase() === 'admin') {
          color = '#ffffff'; // White for admin
        } else if (username.toLowerCase() === 'unknown') {
          color = '#6b7280'; // Grey for unknown
        } else {
          color = getLocationColor(item.location_name);
        }
        users.set(username, {
          username,
          location_name: item.location_name,
          color
        });
      }
    });
    return Array.from(users.values());
  }, [data?.userAllocations]);

  // Custom tooltip for user chart
  const CustomUserTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-white/20 p-3 rounded-lg shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !data) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-blue-900/20 border border-purple-500/20 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="relative">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:underline text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Back
            </Link>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            Analytics Dashboard
          </h2>
          <p className="text-sm sm:text-base text-purple-200/80">
            Comprehensive insights and statistics for bed allocations
          </p>
        </div>
      </section>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/20 rounded text-red-100">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-3 sm:p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm min-w-0"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm min-w-0"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <select
              value={filters.locationId}
              onChange={(e) => handleFilterChange('locationId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm min-w-0"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Tent</label>
            <select
              value={filters.tentIndex}
              onChange={(e) => handleFilterChange('tentIndex', e.target.value)}
              disabled={!filters.locationId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm disabled:opacity-50 min-w-0"
            >
              <option value="">All Tents</option>
              {tents.map(tent => (
                <option key={tent.index} value={tent.index}>{tent.name || `Tent ${tent.index}`}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Block</label>
            <select
              value={filters.blockIndex}
              onChange={(e) => handleFilterChange('blockIndex', e.target.value)}
              disabled={!filters.tentIndex}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 text-sm disabled:opacity-50 min-w-0"
            >
              <option value="">All Blocks</option>
              {blocks.map(block => (
                <option key={block.index} value={block.index}>{block.name || `Block ${block.index}`}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={applyFilters}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition"
          >
            Reset
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </section>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Backup Button Card */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-3">Database Backup</h3>
            <p className="text-sm text-gray-300 mb-4">
              Trigger immediate backup email with current data snapshot
            </p>
            <button
              onClick={handleTriggerBackup}
              disabled={backupLoading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {backupLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : backupSuccess ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Email Sent!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Backup Email
                </>
              )}
            </button>
          </div>

          {/* Total Allocations Card */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-2">Total Lifetime Allocations</h3>
            <p className="text-5xl font-bold text-gray-100 mb-2">{data.totalAllocations.toLocaleString()}</p>
            <p className="text-sm text-gray-400">All-time bed allocations</p>
          </div>

          {/* Gender Breakdown Card */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-3">Gender Breakdown</h3>
            {data.genderBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.genderBreakdown.map(item => ({ gender: item.gender, count: parseInt(item.count) }))}
                    dataKey="count"
                    nameKey="gender"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.gender}: ${entry.count}`}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {data.genderBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getGenderColor(entry.gender)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>

          {/* Daily Allocations Timeline */}
          <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-3">Daily Allocations Timeline</h3>
            {data.dailyAllocations?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyAllocations.map(d => ({ ...d, dateLabel: formatDateLabel(d.date) }))} margin={{ bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="dateLabel" stroke="#9ca3af" height={60} label={{ value: 'Day of November', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ paddingTop: '30px' }} />
                  <Line type="monotone" dataKey="count" name="Allocations" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>

          {/* Daily Departures Timeline */}
          <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-3">Daily Departures Timeline</h3>
            {data.dailyDepartures?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyDepartures.map(d => ({ ...d, dateLabel: formatDateLabel(d.date) }))} margin={{ bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="dateLabel" stroke="#9ca3af" height={60} label={{ value: 'Day of November', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ paddingTop: '30px' }} />
                  <Line type="monotone" dataKey="count" name="Departures" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>

          {/* Daily Deallocations Timeline */}
          <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-3">Daily Deallocations by Reason</h3>
            {deallocationChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deallocationChartData} margin={{ bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="dateLabel" stroke="#9ca3af" height={60} label={{ value: 'Day of November', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value, name) => {
                      const labels = {
                        left_early: 'Left Early',
                        no_show: 'No-show',
                        booking_error: 'Booking Error',
                        not_specified: 'Not Specified'
                      };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '30px' }}
                    formatter={(value) => {
                      const labels = {
                        left_early: 'Left Early',
                        no_show: 'No-show',
                        booking_error: 'Booking Error',
                        not_specified: 'Not Specified'
                      };
                      return labels[value] || value;
                    }}
                  />
                  <Bar dataKey="left_early" stackId="a" fill="#10b981" animationDuration={1000} />
                  <Bar dataKey="no_show" stackId="a" fill="#f97316" animationDuration={1000} animationBegin={200} />
                  <Bar dataKey="booking_error" stackId="a" fill="#ef4444" animationDuration={1000} animationBegin={400} />
                  <Bar dataKey="not_specified" stackId="a" fill="#6b7280" animationDuration={1000} animationBegin={600} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No deallocations yet</p>
            )}
          </div>

          {/* User Allocations Timeline */}
          <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-3">Allocations by User Over Time</h3>
            {userChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={userChartData} margin={{ bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="dateLabel" stroke="#9ca3af" height={60} label={{ value: 'Day of November', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} />
                  <Tooltip content={<CustomUserTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '30px' }} />
                  {uniqueUsers.map((user, index) => (
                    <Line
                      key={user.username}
                      type="monotone"
                      dataKey={user.username}
                      name={user.username}
                      stroke={user.color}
                      strokeWidth={2}
                      dot={{ fill: user.color, r: 3 }}
                      animationDuration={1000}
                      animationBegin={index * 100}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
