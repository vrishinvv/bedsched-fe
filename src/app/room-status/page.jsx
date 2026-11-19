"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchRoomStatus, updateRoomStateAssignment } from "@/lib/api";

const allowedRoles = ["admin", "dashboard", "location_user"];
const allocationFilters = [
  { id: "all", label: "All rooms" },
  { id: "allocated", label: "Allocated" },
  { id: "unallocated", label: "Not allocated" },
];
const refreshTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadRoomCsv(rooms) {
  const headers = ["Room ID", "Location", "Section / floor", "Booking status", "People", "Capacity", "Allocated state"];
  const rows = rooms.map((room) => [
    room.name,
    room.locationName,
    room.section,
    room.peopleCount > 0 ? "Allocated" : "Not allocated",
    room.peopleCount,
    room.capacity,
    room.stateName || "Unassigned",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `room-state-allocations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, note, accent = "neutral" }) {
  const accentClass = {
    emerald: "border-emerald-900/70 bg-emerald-950/30",
    amber: "border-amber-900/70 bg-amber-950/25",
    sky: "border-sky-900/70 bg-sky-950/25",
    neutral: "border-neutral-800 bg-neutral-950",
  }[accent];

  return (
    <article className={`rounded-xl border p-4 ${accentClass}`}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-400">{note}</p>
    </article>
  );
}

function StateDistribution({ rows, assignedCount }) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4" aria-labelledby="state-distribution-title">
      <h2 id="state-distribution-title" className="font-semibold text-white">Rooms by allocated state</h2>
      <p className="mt-1 text-xs text-neutral-400">Distribution of the {assignedCount} rooms with a saved state.</p>
      {rows.length ? (
        <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2" role="img" aria-label="Bar chart of rooms allocated to each state">
          {rows.map((row) => (
            <div key={row.code} className="grid grid-cols-[minmax(7rem,1fr)_minmax(7rem,2fr)_2rem] items-center gap-3">
              <span className="truncate text-xs text-neutral-300" title={row.name}>{row.name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max((row.count / maxCount) * 100, 4)}%` }} />
              </div>
              <span className="text-right text-xs tabular-nums text-neutral-300">{row.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-800 px-4 py-5 text-sm text-neutral-400">
          No room states have been assigned for this view yet.
        </p>
      )}
    </section>
  );
}

function RoomStatusContent() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [draftStates, setDraftStates] = useState({});
  const [savingRooms, setSavingRooms] = useState({});

  const load = useCallback(async (signal) => {
    try {
      setSnapshot(await fetchRoomStatus(signal));
      setFailed(false);
    } catch {
      if (!signal?.aborted) setFailed(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function refresh() {
    setLoading(true);
    setFailed(false);
    setSaveError("");
    load();
  }

  const locations = useMemo(() => snapshot?.locations ?? [], [snapshot?.locations]);
  const states = snapshot?.states ?? [];
  const activeLocation = locations.find((location) => String(location.id) === locationId);
  const rooms = useMemo(
    () => (activeLocation ? [activeLocation] : locations).flatMap((location) =>
      location.rooms.map((room) => ({ ...room, locationName: location.name })),
    ),
    [activeLocation, locations],
  );
  const allocatedCount = rooms.filter((room) => room.peopleCount > 0).length;
  const stateAssignedCount = rooms.filter((room) => room.stateCode).length;
  const counts = { all: rooms.length, allocated: allocatedCount, unallocated: rooms.length - allocatedCount };
  const distribution = useMemo(() => {
    const stateCounts = new Map();
    for (const room of rooms) {
      if (!room.stateCode) continue;
      const current = stateCounts.get(room.stateCode) || { code: room.stateCode, name: room.stateName, count: 0 };
      current.count += 1;
      stateCounts.set(room.stateCode, current);
    }
    return [...stateCounts.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  }, [rooms]);
  const visibleRooms = rooms.filter((room) => {
    const matchesBooking = status === "all" || (room.peopleCount > 0 ? status === "allocated" : status === "unallocated");
    const matchesState = stateFilter === "all"
      || (stateFilter === "unassigned" ? !room.stateCode : room.stateCode === stateFilter);
    return matchesBooking && matchesState;
  });

  function updateRoomInSnapshot(roomId, state) {
    setSnapshot((current) => ({
      ...current,
      locations: current.locations.map((location) => ({
        ...location,
        rooms: location.rooms.map((room) => room.id === roomId
          ? { ...room, stateCode: state?.code || null, stateName: state?.name || null, stateUpdatedAt: state ? new Date().toISOString() : null }
          : room),
      })),
    }));
  }

  async function saveRoomState(room, state) {
    if (!snapshot?.canEditStateAssignments || savingRooms[room.id]) return;
    const previousState = states.find((option) => option.code === room.stateCode) || null;
    if ((state?.code || null) === (room.stateCode || null)) return;
    setSaveError("");
    setSavingRooms((current) => ({ ...current, [room.id]: true }));
    updateRoomInSnapshot(room.id, state);
    try {
      await updateRoomStateAssignment(room.id, state?.code || null);
      setDraftStates((current) => ({ ...current, [room.id]: state?.name || "" }));
    } catch (error) {
      updateRoomInSnapshot(room.id, previousState);
      setDraftStates((current) => ({ ...current, [room.id]: previousState?.name || "" }));
      setSaveError(error.message || `Couldn’t save the state for ${room.name}.`);
    } finally {
      setSavingRooms((current) => {
        const next = { ...current };
        delete next[room.id];
        return next;
      });
    }
  }

  function handleStateInput(room, value) {
    setDraftStates((current) => ({ ...current, [room.id]: value }));
    const normalized = value.trim().toLocaleLowerCase("en-IN");
    if (!normalized) {
      saveRoomState(room, null);
      return;
    }
    const selected = states.find((state) =>
      state.name.toLocaleLowerCase("en-IN") === normalized || state.code.toLocaleLowerCase("en-IN") === normalized,
    );
    if (selected) saveRoomState(room, selected);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-1 text-sm text-neutral-100 sm:px-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Room Status</h1>
          <p className="mt-1 text-neutral-400" role="status">
            {snapshot
              ? <>Updated <time dateTime={snapshot.refreshedAt}>{refreshTime.format(new Date(snapshot.refreshedAt))} IST</time></>
              : loading ? "Loading room status…" : "No room status loaded"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadRoomCsv(visibleRooms)}
            disabled={!snapshot || visibleRooms.length === 0}
            className="min-h-11 rounded-full border border-neutral-700 bg-neutral-950 px-5 font-semibold text-white hover:border-neutral-500 hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:text-neutral-600 sm:min-h-9"
          >
            Generate CSV <span className="text-neutral-400">({visibleRooms.length})</span>
          </button>
          <button type="button" onClick={refresh} disabled={loading} className="min-h-11 rounded-full bg-white px-5 font-semibold text-black hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:bg-neutral-700 disabled:text-neutral-200 sm:min-h-9">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {failed && (
        <p role="alert" className="rounded-lg bg-neutral-900 px-4 py-3 text-neutral-200">
          Couldn’t load the latest room status. {snapshot && "The previous counts are still shown. "}Select Refresh to retry.
        </p>
      )}
      {saveError && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-red-100">{saveError}</p>}

      <section aria-label="Room state analytics" className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Rooms in view" value={rooms.length} note={activeLocation ? activeLocation.name : "All locations"} />
          <SummaryCard label="State assigned" value={stateAssignedCount} note={`${rooms.length ? Math.round((stateAssignedCount / rooms.length) * 100) : 0}% coverage`} accent="emerald" />
          <SummaryCard label="Still unassigned" value={rooms.length - stateAssignedCount} note="Rooms needing a state" accent="amber" />
          <SummaryCard label="States represented" value={distribution.length} note="Out of 28 Indian states" accent="sky" />
        </div>
        <StateDistribution rows={distribution} assignedCount={stateAssignedCount} />
      </section>

      <section aria-label="Room allocations" aria-busy={loading}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-neutral-800">
          <div role="group" aria-label="Allocation status" className="flex min-w-0 gap-4 sm:gap-6">
            {allocationFilters.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)} className="min-h-11 whitespace-nowrap border-b-2 border-transparent py-2 text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white aria-pressed:border-white aria-pressed:text-white">
                {label}{snapshot && <span className="ml-1 tabular-nums text-neutral-400">{counts[id]}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-2 text-neutral-300">
            <label className="grid gap-1 text-xs" htmlFor="room-status-state-filter">
              Allocated state
              <select id="room-status-state-filter" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="min-h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <option value="all">All states</option>
                <option value="unassigned">Unassigned</option>
                {states.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs" htmlFor="room-status-location">
              Location
              <select id="room-status-location" value={activeLocation ? locationId : ""} onChange={(event) => setLocationId(event.target.value)} className="min-h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <option value="">All locations</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="sticky top-0 bg-black text-xs text-neutral-400">
              <tr>
                <th scope="col" className="py-3 pr-2 font-medium">Room ID</th>
                <th scope="col" className="py-3 pr-2 font-medium">Location</th>
                <th scope="col" className="py-3 pr-2 font-medium">Section / floor</th>
                <th scope="col" className="py-3 pr-2 font-medium">Status</th>
                <th scope="col" className="py-3 pr-3 text-right font-medium">People / capacity</th>
                <th scope="col" className="w-56 py-3 font-medium">Allocated state</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {visibleRooms.map((room) => (
                <tr key={room.id}>
                  <th scope="row" className="py-3 pr-2 font-semibold">{room.name}</th>
                  <td className="py-3 pr-2 text-neutral-300">{room.locationName}</td>
                  <td className="py-3 pr-2 text-neutral-300">{room.section}</td>
                  <td className="py-3 pr-2">
                    {room.peopleCount > 0
                      ? <span className="inline-block rounded bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-300">Allocated</span>
                      : <span className="inline-block rounded bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-200">Not allocated</span>}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 text-right tabular-nums">{room.peopleCount}<span className="text-neutral-400"> / {room.capacity}</span></td>
                  <td className="py-2">
                    {snapshot?.canEditStateAssignments ? (
                      <div className="relative">
                        <input
                          type="text"
                          list="indian-state-options"
                          aria-label={`Allocated state for ${room.name}`}
                          placeholder="Search state…"
                          autoComplete="off"
                          value={draftStates[room.id] ?? room.stateName ?? ""}
                          onChange={(event) => handleStateInput(room, event.target.value)}
                          onBlur={() => setDraftStates((current) => ({ ...current, [room.id]: room.stateName || "" }))}
                          disabled={Boolean(savingRooms[room.id])}
                          className="min-h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 pr-8 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:text-neutral-400"
                        />
                        {savingRooms[room.id] && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400" aria-label="Saving">•••</span>}
                      </div>
                    ) : room.stateName ? (
                      <span className="inline-flex rounded-full border border-sky-900 bg-sky-950/40 px-2.5 py-1 text-xs font-medium text-sky-200">{room.stateName}</span>
                    ) : <span className="text-xs text-neutral-500">Unassigned</span>}
                  </td>
                </tr>
              ))}
              {visibleRooms.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-neutral-400">
                    {loading && !snapshot ? "Loading room counts…" : !snapshot ? "Room counts are unavailable." : activeLocation && rooms.length === 0 ? `No rooms are listed in ${activeLocation.name}.` : "No rooms match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <datalist id="indian-state-options">
          {states.map((state) => <option key={state.code} value={state.name}>{state.code}</option>)}
        </datalist>
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-neutral-400">
          <p>A room is allocated if it has at least one current or upcoming confirmed booking or an unexpired reservation.</p>
          <p>CSV export includes the {visibleRooms.length} currently filtered room{visibleRooms.length === 1 ? "" : "s"}.</p>
        </div>
      </section>
    </main>
  );
}

export default function RoomStatusPage() {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <RoomStatusContent />
    </ProtectedRoute>
  );
}
