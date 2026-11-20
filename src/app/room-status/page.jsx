"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  createRoomStateOption,
  deleteRoomStateOption,
  fetchRoomStatus,
  renameRoomStateOption,
  updateRoomStateAssignment,
} from "@/lib/api";

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
            <div key={row.id} className="grid grid-cols-[minmax(7rem,1fr)_minmax(7rem,2fr)_2rem] items-center gap-3">
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

function StateOptionManager({ options, onCreate, onRename, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function submitNew(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusyId("new");
    setError("");
    try {
      await onCreate(newName);
      setNewName("");
    } catch (requestError) {
      setError(requestError.message || "Couldn’t add the option.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitRename(event, option) {
    event.preventDefault();
    if (!editingName.trim()) return;
    setBusyId(option.id);
    setError("");
    try {
      await onRename(option.id, editingName);
      setEditingId(null);
      setEditingName("");
    } catch (requestError) {
      setError(requestError.message || "Couldn’t rename the option.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(option) {
    const roomLabel = `${option.usageCount} assigned room${option.usageCount === 1 ? "" : "s"}`;
    if (!window.confirm(`Delete “${option.name}”? This will clear it from ${roomLabel}.`)) return;
    setBusyId(option.id);
    setError("");
    try {
      await onDelete(option.id);
    } catch (requestError) {
      setError(requestError.message || "Couldn’t delete the option.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="state-options-title" className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="state-options-title" className="font-semibold text-white">Manage allocated state options</h2>
          <p className="mt-1 text-xs text-neutral-400">Only the options you add here will appear in the room dropdown.</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-9 rounded-lg px-3 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Close</button>
      </div>

      <form onSubmit={submitNew} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="new-state-option">New option</label>
        <input id="new-state-option" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={100} placeholder="Add an option" disabled={busyId === "new"} className="min-h-11 flex-1 rounded-lg border border-neutral-700 bg-black px-3 text-white placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:text-neutral-500" />
        <button type="submit" disabled={!newName.trim() || busyId === "new"} className="min-h-11 rounded-lg bg-white px-5 font-semibold text-black hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:bg-neutral-700 disabled:text-neutral-400">{busyId === "new" ? "Adding…" : "Add option"}</button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-100">{error}</p>}

      <div className="mt-4 divide-y divide-neutral-900 border-t border-neutral-800">
        {options.map((option) => (
          <div key={option.id} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-2">
            {editingId === option.id ? (
              <form onSubmit={(event) => submitRename(event, option)} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor={`edit-state-option-${option.id}`}>Rename {option.name}</label>
                <input id={`edit-state-option-${option.id}`} autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={100} disabled={busyId === option.id} className="min-h-10 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
                <div className="flex gap-2">
                  <button type="submit" disabled={!editingName.trim() || busyId === option.id} className="min-h-10 rounded-lg bg-white px-4 font-semibold text-black disabled:bg-neutral-700 disabled:text-neutral-400">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-lg px-3 text-neutral-300 hover:bg-neutral-900">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{option.name}</p>
                  <p className="text-xs text-neutral-500">{option.usageCount} assigned room{option.usageCount === 1 ? "" : "s"}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => { setEditingId(option.id); setEditingName(option.name); setError(""); }} disabled={busyId === option.id} className="min-h-10 rounded-lg px-3 text-neutral-300 hover:bg-neutral-900 hover:text-white disabled:text-neutral-600">Rename</button>
                  <button type="button" onClick={() => remove(option)} disabled={busyId === option.id} className="min-h-10 rounded-lg px-3 text-red-300 hover:bg-red-950/40 hover:text-red-200 disabled:text-neutral-600">{busyId === option.id ? "Working…" : "Delete"}</button>
                </div>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && <p className="py-5 text-sm text-neutral-400">No options yet. Add the first option to enable room assignment.</p>}
      </div>
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
  const [optionsOpen, setOptionsOpen] = useState(false);

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
  const stateOptions = snapshot?.stateOptions ?? [];
  const activeLocation = locations.find((location) => String(location.id) === locationId);
  const rooms = useMemo(
    () => (activeLocation ? [activeLocation] : locations).flatMap((location) =>
      location.rooms.map((room) => ({ ...room, locationName: location.name })),
    ),
    [activeLocation, locations],
  );
  const allocatedCount = rooms.filter((room) => room.peopleCount > 0).length;
  const stateAssignedCount = rooms.filter((room) => room.stateOptionId).length;
  const counts = { all: rooms.length, allocated: allocatedCount, unallocated: rooms.length - allocatedCount };
  const distribution = useMemo(() => {
    const stateCounts = new Map();
    for (const room of rooms) {
      if (!room.stateOptionId) continue;
      const current = stateCounts.get(room.stateOptionId) || { id: room.stateOptionId, name: room.stateName, count: 0 };
      current.count += 1;
      stateCounts.set(room.stateOptionId, current);
    }
    return [...stateCounts.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  }, [rooms]);
  const visibleRooms = rooms.filter((room) => {
    const matchesBooking = status === "all" || (room.peopleCount > 0 ? status === "allocated" : status === "unallocated");
    const matchesState = stateFilter === "all"
      || (stateFilter === "unassigned" ? !room.stateOptionId : String(room.stateOptionId) === stateFilter);
    return matchesBooking && matchesState;
  });

  function updateRoomInSnapshot(roomId, option) {
    setSnapshot((current) => {
      const previousRoom = current.locations.flatMap((location) => location.rooms).find((room) => room.id === roomId);
      const previousOptionId = previousRoom?.stateOptionId || null;
      const nextOptionId = option?.id || null;
      return {
        ...current,
        stateOptions: current.stateOptions.map((existing) => {
          let usageCount = existing.usageCount;
          if (previousOptionId !== nextOptionId && existing.id === previousOptionId) usageCount -= 1;
          if (previousOptionId !== nextOptionId && existing.id === nextOptionId) usageCount += 1;
          return { ...existing, usageCount };
        }),
        locations: current.locations.map((location) => ({
          ...location,
          rooms: location.rooms.map((room) => room.id === roomId
            ? { ...room, stateOptionId: nextOptionId, stateName: option?.name || null, stateUpdatedAt: option ? new Date().toISOString() : null }
            : room),
        })),
      };
    });
  }

  async function saveRoomState(room, option) {
    if (!snapshot?.canEditStateAssignments || savingRooms[room.id]) return;
    const previousOption = stateOptions.find((existing) => existing.id === room.stateOptionId) || null;
    if ((option?.id || null) === (room.stateOptionId || null)) return;
    setSaveError("");
    setSavingRooms((current) => ({ ...current, [room.id]: true }));
    updateRoomInSnapshot(room.id, option);
    try {
      await updateRoomStateAssignment(room.id, option?.id || null);
      setDraftStates((current) => ({ ...current, [room.id]: option?.name || "" }));
    } catch (error) {
      updateRoomInSnapshot(room.id, previousOption);
      setDraftStates((current) => ({ ...current, [room.id]: previousOption?.name || "" }));
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
    const selected = stateOptions.find((option) => option.name.toLocaleLowerCase("en-IN") === normalized);
    if (selected) saveRoomState(room, selected);
  }

  async function addStateOption(name) {
    const { option } = await createRoomStateOption(name);
    setSnapshot((current) => ({
      ...current,
      stateOptions: [...current.stateOptions, option].sort((left, right) => left.name.localeCompare(right.name)),
    }));
  }

  async function editStateOption(optionId, name) {
    const { option } = await renameRoomStateOption(optionId, name);
    setSnapshot((current) => ({
      ...current,
      stateOptions: current.stateOptions
        .map((existing) => existing.id === optionId ? option : existing)
        .sort((left, right) => left.name.localeCompare(right.name)),
      locations: current.locations.map((location) => ({
        ...location,
        rooms: location.rooms.map((room) => room.stateOptionId === optionId ? { ...room, stateName: option.name } : room),
      })),
    }));
    setDraftStates((current) => {
      const next = { ...current };
      for (const room of rooms) if (room.stateOptionId === optionId) next[room.id] = option.name;
      return next;
    });
  }

  async function removeStateOption(optionId) {
    await deleteRoomStateOption(optionId);
    setSnapshot((current) => ({
      ...current,
      stateOptions: current.stateOptions.filter((option) => option.id !== optionId),
      locations: current.locations.map((location) => ({
        ...location,
        rooms: location.rooms.map((room) => room.stateOptionId === optionId
          ? { ...room, stateOptionId: null, stateName: null, stateUpdatedAt: null }
          : room),
      })),
    }));
    setDraftStates((current) => {
      const next = { ...current };
      for (const room of rooms) if (room.stateOptionId === optionId) next[room.id] = "";
      return next;
    });
    if (stateFilter === String(optionId)) setStateFilter("all");
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
          {snapshot?.canEditStateAssignments && (
            <button type="button" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((open) => !open)} className="min-h-11 rounded-full border border-neutral-700 bg-neutral-950 px-5 font-semibold text-white hover:border-neutral-500 hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:min-h-9">
              Manage options <span className="text-neutral-400">({stateOptions.length})</span>
            </button>
          )}
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

      {snapshot?.canEditStateAssignments && optionsOpen && (
        <StateOptionManager options={stateOptions} onCreate={addStateOption} onRename={editStateOption} onDelete={removeStateOption} onClose={() => setOptionsOpen(false)} />
      )}

      <section aria-label="Room state analytics" className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Rooms in view" value={rooms.length} note={activeLocation ? activeLocation.name : "All locations"} />
          <SummaryCard label="State assigned" value={stateAssignedCount} note={`${rooms.length ? Math.round((stateAssignedCount / rooms.length) * 100) : 0}% coverage`} accent="emerald" />
          <SummaryCard label="Still unassigned" value={rooms.length - stateAssignedCount} note="Rooms needing a state" accent="amber" />
          <SummaryCard label="States represented" value={distribution.length} note={`${stateOptions.length} custom option${stateOptions.length === 1 ? "" : "s"} available`} accent="sky" />
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
                {stateOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
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
                          list="allocated-state-options"
                          aria-label={`Allocated state for ${room.name}`}
                          placeholder={stateOptions.length ? "Search option…" : "Add an option first"}
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
        <datalist id="allocated-state-options">
          {stateOptions.map((option) => <option key={option.id} value={option.name} />)}
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
