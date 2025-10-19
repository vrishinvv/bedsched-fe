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
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents`);
  return handle(res, 'Failed to fetch location tents');
}

/**
 * Fetch blocks for a specific tent
 */
export async function fetchTentBlocks(locationId, tentIndex) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks`);
  return handle(res, 'Failed to fetch tent blocks');
}

/**
 * Update tent settings (gender restriction)
 */
export async function updateTent(locationId, tentIndex, payload) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to update tent');
}

/**
 * Fetch block detail with bed information
 */
export async function fetchBlockDetail(locationId, tentIndex, blockIndex) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}`);
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
  });
  return handle(res, 'Failed to edit allocation');
}

/**
 * Deallocate a bed
 */
export async function deallocateBed(locationId, tentIndex, blockIndex, bedNumber) {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/tents/${tentIndex}/blocks/${blockIndex}/beds/${bedNumber}`, {
    method: 'DELETE',
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
  });
  return handle(res, 'Failed to bulk allocate beds');
}
