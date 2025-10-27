// lib/api.js
// Frontend API wrappers for Express backend (no proxy).
// Set NEXT_PUBLIC_API_BASE (e.g., http://localhost:3001) in .env.local

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
 * Fetch all locations with their capacity and allocation data
 */
export async function fetchLocations() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/locations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents`, { credentials: 'include' });
  return handle(res, 'Failed to fetch location tents');
}

/**
 * Fetch blocks for a specific tent
 */
export async function fetchTentBlocks(locationId, tentIndex) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks`, { credentials: 'include' });
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
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}`, { credentials: 'include' });
  return handle(res, 'Failed to fetch block detail');
}

/**
 * Update location capacity
 */
export async function updateCapacity(id, newCapacity) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity: newCapacity }),
    credentials: 'include',
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handle(res, 'Failed to edit allocation');
}

/**
 * Deallocate a bed
 */
export async function deallocateBed(locationId, tentIndex, blockIndex, bedNumber) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/${bedNumber}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handle(res, 'Failed to deallocate bed');
}

/**
 * Bulk allocate beds
 */
export async function bulkAllocateBeds(locationId, tentIndex, blockIndex, payload) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/bulk-allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handle(res, 'Failed to bulk allocate beds');
}

export async function updateBlock(locationId, tentIndex, blockIndex, payload) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handle(res, 'Failed to update block');
}

// Auth helpers
export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
  return handle(res, 'Login failed');
}

export async function logout() {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handle(res, 'Logout failed');
}

export async function getMe() {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });
  return handle(res, 'Failed to get session');
}

// Reservation APIs
export async function smartReserve(payload) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/smart-reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to smart-reserve');
}

export async function searchAllocationsByPhone(phone) {
  const url = new URL(`${API_BASE_URL}/api/allocations/by-phone`);
  url.searchParams.set('phone', phone);
  const res = await fetch(url.toString(), { credentials: 'include' });
  return handle(res, 'Failed to search by phone');
}

export async function confirmAllocations({ batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ batchId, allocationIds }),
  });
  return handle(res, 'Failed to confirm allocations');
}

// Admin edits by phone
export async function updatePhoneByPhone({ oldPhone, newPhone, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/update-phone`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ oldPhone, newPhone, batchId, allocationIds }),
  });
  return handle(res, 'Failed to update phone');
}

export async function updateContactNameByPhone({ phone, contactName, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/update-contact`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, contactName, batchId, allocationIds }),
  });
  return handle(res, 'Failed to update contact name');
}

export async function updateEndDateByPhone({ phone, endDate, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/update-end-date`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, endDate, batchId, allocationIds }),
  });
  return handle(res, 'Failed to update end date');
}

export async function deallocateByPhone({ phone, batchId, allocationIds }) {
  const res = await fetch(`${API_BASE_URL}/api/allocations/by-phone/deallocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, batchId, allocationIds }),
  });
  return handle(res, 'Failed to deallocate');
}

export async function fetchDepartures(date) {
  const url = new URL(`${API_BASE_URL}/api/allocations/departures`);
  url.searchParams.set('date', date);
  const res = await fetch(url.toString(), { credentials: 'include' });
  return handle(res, 'Failed to fetch departures');
}

export async function fetchReservedActive() {
  const res = await fetch(`${API_BASE_URL}/api/allocations/reserved-active`, { credentials: 'include' });
  return handle(res, 'Failed to fetch active reserved');
}
