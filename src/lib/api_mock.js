// lib/api_mock.js
// Mock hierarchy: Locations -> Tents (~2000) -> Blocks (500) -> Beds
// Data persists in localStorage. Dates are YYYY-MM-DD strings.

const STORAGE_KEY = 'tba_mock_v2';

const SEED_LOCATIONS = [
  { id: '1', name: 'West Gate North', capacity: 6000 },
  { id: '2', name: 'West Gate South', capacity: 5500 },
  { id: '3', name: 'Gas Tank',         capacity: 2000 },
  { id: '4', name: 'Bus Department',   capacity: 1500 },
  { id: '5', name: 'Electricity Board',capacity: 1500 },
  { id: '6', name: 'Deer Park',        capacity: 1500 },
];

function sleep(ms = 120) { return new Promise(r => setTimeout(r, ms)); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); }

function load() {
  if (typeof window === 'undefined') return { locations: SEED_LOCATIONS, alloc: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { locations: SEED_LOCATIONS, alloc: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.locations?.length) parsed.locations = SEED_LOCATIONS;
    if (!parsed.alloc) parsed.alloc = {};
    return parsed;
  } catch {
    return { locations: SEED_LOCATIONS, alloc: {} };
  }
}
function save(state) { if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// Split capacity into tents of 2000 (last remainder)
function tentsFromCapacity(cap) {
  const full = Math.floor(cap / 2000);
  const rem = cap % 2000;
  const sizes = Array.from({ length: full }, () => 2000);
  if (rem > 0) sizes.push(rem);
  return sizes.map((size, idx) => ({ index: idx + 1, size }));
}

// Each tent split into blocks of 500
function blocksFromTentSize(size) {
  const blocks = Math.ceil(size / 500);
  return Array.from({ length: blocks }, (_, i) => ({
    index: i + 1, size: Math.min(500, size - i * 500)
  }));
}

function bedKey(locId, tentIdx, blockIdx, bedNum) {
  return `${locId}:${tentIdx}:${blockIdx}:${bedNum}`;
}

function countFromKeys(state, keys) {
  const tmr = tomorrowStr();
  const today = todayStr();
  let allocated = 0, freeingTomorrow = 0;
  for (const k of keys) {
    const a = state.alloc[k];
    if (!a) continue;
    if (today >= a.startDate && today <= a.endDate) allocated++;
    if (a.endDate === tmr) freeingTomorrow++;
  }
  return { allocated, freeingTomorrow };
}

/* ------------------------------- Queries ------------------------------- */

export async function fetchLocations() {
  const state = load();
  await sleep();
  return state.locations.map((loc) => {
    const tentSizes = tentsFromCapacity(loc.capacity);
    const allKeys = [];
    for (const t of tentSizes) {
      for (const b of blocksFromTentSize(t.size)) {
        for (let i = 1; i <= b.size; i++) allKeys.push(bedKey(loc.id, t.index, b.index, i));
      }
    }
    const { allocated, freeingTomorrow } = countFromKeys(state, allKeys);
    return {
      id: loc.id,
      name: loc.name,
      capacity: loc.capacity,
      allocatedCount: allocated,
      freeingTomorrow,
    };
  });
}

export async function fetchLocationTents(locationId) {
  const state = load();
  await sleep();
  const loc = state.locations.find(l => l.id === String(locationId));
  if (!loc) throw new Error('Location not found');

  const tentSizes = tentsFromCapacity(loc.capacity);
  const tents = tentSizes.map((t) => {
    const keys = [];
    for (const b of blocksFromTentSize(t.size)) {
      for (let i = 1; i <= b.size; i++) keys.push(bedKey(loc.id, t.index, b.index, i));
    }
    const { allocated, freeingTomorrow } = countFromKeys(state, keys);
    return { index: t.index, size: t.size, allocated, freeingTomorrow };
  });

  return { location: { id: loc.id, name: loc.name, capacity: loc.capacity }, tents };
}

export async function fetchTentBlocks(locationId, tentIndex) {
  const state = load();
  await sleep();
  const loc = state.locations.find(l => l.id === String(locationId));
  if (!loc) throw new Error('Location not found');
  const tent = tentsFromCapacity(loc.capacity).find(t => t.index === Number(tentIndex));
  if (!tent) throw new Error('Tent not found');

  const blocks = blocksFromTentSize(tent.size).map((b) => {
    const keys = [];
    for (let i = 1; i <= b.size; i++) keys.push(bedKey(loc.id, tent.index, b.index, i));
    const { allocated, freeingTomorrow } = countFromKeys(state, keys);
    return { index: b.index, size: b.size, allocated, freeingTomorrow };
  });

  const tentRollup = blocks.reduce(
    (acc, b) => ({ allocated: acc.allocated + b.allocated, freeingTomorrow: acc.freeingTomorrow + b.freeingTomorrow }),
    { allocated: 0, freeingTomorrow: 0 }
  );

  return {
    location: { id: loc.id, name: loc.name },
    tent: { index: tent.index, size: tent.size, ...tentRollup },
    blocks,
  };
}

export async function fetchBlockDetail(locationId, tentIndex, blockIndex) {
  const state = load();
  await sleep();
  const loc = state.locations.find(l => l.id === String(locationId));
  if (!loc) throw new Error('Location not found');

  const tent = tentsFromCapacity(loc.capacity).find(t => t.index === Number(tentIndex));
  if (!tent) throw new Error('Tent not found');

  const block = blocksFromTentSize(tent.size).find(b => b.index === Number(blockIndex));
  if (!block) throw new Error('Block not found');

  const beds = {};
  for (let i = 1; i <= block.size; i++) {
    const k = bedKey(loc.id, tent.index, block.index, i);
    if (state.alloc[k]) beds[i] = state.alloc[k];
  }

  return {
    meta: {
      location: { id: loc.id, name: loc.name },
      tent: { index: tent.index, size: tent.size },
      block: { index: block.index, size: block.size },
    },
    blockSize: block.size,
    beds,
  };
}

/* ------------------------------ Mutations ------------------------------ */

export async function allocateBed(locationId, tentIndex, blockIndex, bedNumber, payload) {
  const state = load();
  await sleep();
  const k = bedKey(locationId, tentIndex, blockIndex, bedNumber);
  if (state.alloc[k]) throw new Error('Bed already allocated');
  state.alloc[k] = { ...payload };
  save(state);
  return { ok: true };
}

export async function editAllocation(locationId, tentIndex, blockIndex, bedNumber, payload) {
  const state = load();
  await sleep();
  const k = bedKey(locationId, tentIndex, blockIndex, bedNumber);
  if (!state.alloc[k]) throw new Error('No existing allocation to edit');
  state.alloc[k] = { ...state.alloc[k], ...payload };
  save(state);
  return { ok: true };
}

export async function deallocateBed(locationId, tentIndex, blockIndex, bedNumber) {
  const state = load();
  await sleep();
  const k = bedKey(locationId, tentIndex, blockIndex, bedNumber);
  delete state.alloc[k];
  save(state);
  return { ok: true };
}

// Increase capacity at location level (no reductions)
export async function updateCapacity(locationId, newCapacity) {
  const state = load();
  await sleep();
  const loc = state.locations.find(l => l.id === String(locationId));
  if (!loc) throw new Error('Location not found');
  if (Number(newCapacity) < Number(loc.capacity)) throw new Error('Cannot reduce capacity');
  loc.capacity = Number(newCapacity);
  save(state);
  return { ok: true, capacity: loc.capacity };
}
