// lib/api.js
// Frontend API wrappers for Express backend (no proxy).
// Set NEXT_PUBLIC_API_BASE (e.g., http://localhost:3001) in .env.local

const API = process.env.NEXT_PUBLIC_API_BASE || '';

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
  let msg = fallbackMsg;
  try {
    const text = await res.text();
    msg = text || fallbackMsg;
  } catch {}
  throw new Error(msg);
}

export async function fetchLocations() {
  const res = await fetch(`${API}/api/locations`, { cache: 'no-store' });
  return handle(res, 'Failed to load locations');
}

export async function fetchLocation(id) {
  const res = await fetch(`${API}/api/locations/${id}`, { cache: 'no-store' });
  return handle(res, 'Failed to load location');
}

export async function updateCapacity(id, newCapacity) {
  const res = await fetch(`${API}/api/locations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity: newCapacity }),
  });
  return handle(res, 'Failed to update capacity');
}

export async function allocateBed(id, bedNumber, payload) {
  const res = await fetch(`${API}/api/locations/${id}/beds/${bedNumber}/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to allocate bed');
}

export async function editAllocation(id, bedNumber, payload) {
  const res = await fetch(`${API}/api/locations/${id}/beds/${bedNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to edit allocation');
}

export async function deallocateBed(id, bedNumber) {
  const res = await fetch(`${API}/api/locations/${id}/beds/${bedNumber}`, {
    method: 'DELETE',
  });
  return handle(res, 'Failed to deallocate bed');
}
