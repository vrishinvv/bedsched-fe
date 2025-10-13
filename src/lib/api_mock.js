// Frontend-only MOCK API using localStorage. No backend required.
// All functions return Promises to mirror real fetch calls.

const STORAGE_KEY = 'tba_mock_state_v1';

function sleep(ms = 200) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultState() {
  // six locations, 100 beds each, all empty
  const base = Array.from({ length: 6 }, (_, i) => ({
    id: String(i + 1),
    name: `Tent ${String.fromCharCode(65 + i)}`,
    capacity: 100,
    beds: {}, // { [bedNumber]: { name, phone, gender, startDate, endDate } }
  }));
  return { locations: base };
}

function load() {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function save(state) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function computeAllocatedCount(loc) {
  return Object.values(loc.beds || {}).filter(Boolean).length;
}

export async function resetMock() {
  const state = defaultState();
  save(state);
  await sleep();
  return state;
}

export async function fetchLocations() {
  const state = load();
  await sleep();
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`; // compare to payload.endDate (YYYY-MM-DD)
  })();

  return state.locations.map((l) => {
    const allocatedCount = computeAllocatedCount(l);
    const freeingTomorrow = Object
      .values(l.beds || {})
      .filter((b) => b?.endDate === tomorrowStr).length;

    return {
      id: l.id,
      name: l.name,
      capacity: l.capacity,
      allocatedCount,
      freeingTomorrow,
    };
  });
}

export async function fetchLocation(id) {
  const state = load();
  await sleep();
  const loc = state.locations.find((l) => l.id === String(id));
  if (!loc) throw new Error('Location not found');
  return { id: loc.id, name: loc.name, capacity: loc.capacity, beds: loc.beds };
}

// Optional helper (not required by the page since it computes locally)
export async function fetchGlobalStats() {
  const state = load();
  await sleep();
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  })();

  let totalCapacity = 0;
  let totalAllocated = 0;
  let totalFreeingTomorrow = 0;

  for (const l of state.locations) {
    totalCapacity += Number(l.capacity || 0);
    const allocated = computeAllocatedCount(l);
    totalAllocated += allocated;
    totalFreeingTomorrow += Object
      .values(l.beds || {})
      .filter((b) => b?.endDate === tomorrowStr).length;
  }

  return {
    totalCapacity,
    totalAllocated,
    totalNotAllocated: totalCapacity - totalAllocated,
    totalFreeingTomorrow,
  };
}

export async function updateCapacity(id, newCapacity) {
  const state = load();
  const loc = state.locations.find((l) => l.id === String(id));
  if (!loc) throw new Error('Location not found');
  if (Number(newCapacity) < Number(loc.capacity)) throw new Error('Cannot reduce capacity');
  loc.capacity = Number(newCapacity);
  save(state);
  await sleep();
  return { ok: true, capacity: loc.capacity };
}

export async function allocateBed(id, bedNumber, payload) {
  const state = load();
  const loc = state.locations.find((l) => l.id === String(id));
  if (!loc) throw new Error('Location not found');
  const n = Number(bedNumber);
  if (n < 1 || n > loc.capacity) throw new Error('Bed out of range');
  if (loc.beds[n]) throw new Error('Bed already allocated');
  loc.beds[n] = { ...payload };
  save(state);
  await sleep();
  return { ok: true };
}

export async function editAllocation(id, bedNumber, payload) {
  const state = load();
  const loc = state.locations.find((l) => l.id === String(id));
  if (!loc) throw new Error('Location not found');
  const n = Number(bedNumber);
  if (!loc.beds[n]) throw new Error('No existing allocation to edit');
  loc.beds[n] = { ...loc.beds[n], ...payload };
  save(state);
  await sleep();
  return { ok: true };
}

export async function deallocateBed(id, bedNumber) {
  const state = load();
  const loc = state.locations.find((l) => l.id === String(id));
  if (!loc) throw new Error('Location not found');
  const n = Number(bedNumber);
  delete loc.beds[n];
  save(state);
  await sleep();
  return { ok: true };
}
