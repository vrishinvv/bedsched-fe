// lib/api.js
// Frontend API wrappers for Express backend (no proxy).
// Set NEXT_PUBLIC_API_BASE (e.g., http://localhost:3001) in .env.local

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

async function handle(res, fallbackMsg) {
  if (res.ok) {
    // some DELETE/PATCH endpoints might return {} or minimal payload
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
  // Try to surface server-provided error details
  let errorData = null;
  let msg = fallbackMsg;
  try {
    const text = await res.text();
    // Try to parse as JSON first
    try {
      errorData = JSON.parse(text);
      msg = errorData.message || errorData.error || text || fallbackMsg;
    } catch {
      msg = text || fallbackMsg;
    }
  } catch {}
  
  // Create error with response data attached
  const error = new Error(msg);
  if (errorData) {
    error.response = {
      status: res.status,
      data: errorData
    };
  }
  throw error;
}

/**
 * Generate view URL for a photo key
 */
export async function generatePhotoViewUrl(photoKey) {
  if (!photoKey) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/photo-view-url`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ key: photoKey }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.viewUrl;
  } catch (error) {
    console.error('Failed to generate view URL:', error);
    return null;
  }
}

/**
 * Fetch all locations with their capacity and allocation data
 */
export async function fetchLocations() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/locations`, {
      method: 'GET',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Ensure the data has the expected structure for the frontend
    return data.map((location) => ({
      id: location.id,
      name: location.name,
      capacity: location.capacity || 0,
      allocatedCount: location.allocatedCount || 0,
      freeingTomorrow: location.freeingTomorrow || 0,
      ...location, // Include any additional fields from backend
    }));
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }
}

/**
 * Fetch a specific location by ID
 */
export async function fetchLocationById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/locations/${id}`, {
      method: 'GET',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching location ${id}:`, error);
    throw new Error(`Failed to fetch location: ${error.message}`);
  }
}

/**
 * Fetch tents for a specific location
 */
export async function fetchLocationTents(locationId) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents`, { headers: authHeaders() });
  return handle(res, 'Failed to fetch location tents');
}

/**
 * Fetch blocks for a specific tent
 */
export async function fetchTentBlocks(locationId, tentIndex) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks`, { headers: authHeaders() });
  return handle(res, 'Failed to fetch tent blocks');
}

/**
 * Update tent settings (gender restriction)
 */
export async function updateTent(locationId, tentIndex, payload) {
  // Deprecated: tent-level gender restriction removed. Kept for backward compatibility.
  throw new Error('Tent update is deprecated. Use updateBlock for gender restriction.');
}

/**
 * Fetch block detail with bed information
 */
export async function fetchBlockDetail(locationId, tentIndex, blockIndex) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}`, { headers: authHeaders() });
  return handle(res, 'Failed to fetch block detail');
}

// Reallocate-related helpers removed per request

/**
 * Update location capacity
 */
export async function updateCapacity(id, newCapacity) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ capacity: newCapacity }),
  });
  return handle(res, 'Failed to update capacity');
}

/**
 * Allocate a bed in a specific block
 */
export async function allocateBed(locationId, tentIndex, blockIndex, bedNumber, payload) {
  const res = await fetch(
    `${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/${bedNumber}/allocate`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    }
  );
  return handle(res, 'Failed to allocate bed');
}

/**
 * Edit an existing bed allocation
 */
export async function editAllocation(locationId, tentIndex, blockIndex, bedNumber, payload) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/${bedNumber}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to edit allocation');
}

/**
 * Deallocate a bed
 */
export async function deallocateBed(locationId, tentIndex, blockIndex, bedNumber) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/${bedNumber}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handle(res, 'Failed to deallocate bed');
}

/**
 * Bulk allocate beds
 */
export async function bulkAllocateBeds(locationId, tentIndex, blockIndex, payload) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/bulk-allocate`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to bulk allocate beds');
}

export async function updateBlock(locationId, tentIndex, blockIndex, payload) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to update block');
}

export async function deallocateBedsBatch(locationId, tentIndex, blockIndex, bedNumbers) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/deallocate-batch`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ bedNumbers }),
  });
  return handle(res, 'Failed to batch deallocate beds');
}

export async function editAllocationsBatch(locationId, tentIndex, blockIndex, bedNumbers, updates) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/batch-edit`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ bedNumbers, updates }),
  });
  return handle(res, 'Failed to batch edit allocations');
}

// Reallocate-related helpers removed per request

// Auth helpers
export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  const data = await handle(res, 'Login failed');
  try {
    if (typeof window !== 'undefined' && data?.token) {
      window.localStorage.setItem('bs_token', data.token);
    }
  } catch {}
  return data;
}

export async function logout() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bs_token');
    }
  } catch {}
  try { await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
  return { ok: true };
}

export async function getMe() {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  return handle(res, 'Failed to get session');
}

// Reservation APIs
export async function smartReserve(payload) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/smart-reserve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to smart-reserve');
}

export async function searchAllocationsByPhone(phone) {
  const url = new URL(`${API_BASE_URL}/api/allocations/by-phone`);
  url.searchParams.set('phone', phone);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handle(res, 'Failed to search by phone');
}

export async function confirmAllocations({ batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/confirm`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ batchId, allocationIds }),
  });
  return handle(res, 'Failed to confirm allocations');
}

// Admin edits by phone
export async function updatePhoneByPhone({ oldPhone, newPhone, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/update-phone`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ oldPhone, newPhone, batchId, allocationIds }),
  });
  return handle(res, 'Failed to update phone');
}

export async function updateContactNameByPhone({ phone, contactName, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/update-contact`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ phone, contactName, batchId, allocationIds }),
  });
  return handle(res, 'Failed to update contact name');
}

export async function updateEndDateByPhone({ phone, endDate, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/update-end-date`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ phone, endDate, batchId, allocationIds }),
  });
  return handle(res, 'Failed to update end date');
}

export async function deallocateByPhone({ phone, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/deallocate`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ phone, batchId, allocationIds }),
  });
  return handle(res, 'Failed to deallocate');
}

export async function fetchDepartures(date) {
  const url = new URL(`${API_BASE_URL}/api/allocations/departures`);
  url.searchParams.set('date', date);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handle(res, 'Failed to fetch departures');
}

export async function fetchReservedActive() {
  const res = await fetch(`${API_BASE_URL}/api/allocations/reserved-active`, { headers: authHeaders() });
  return handle(res, 'Failed to fetch active reserved');
}
