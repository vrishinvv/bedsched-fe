"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchRoomStatus } from "@/lib/api";

const allowedRoles = ["admin", "dashboard", "location_user"];
const filters = [
  { id: "all", label: "All rooms" },
  { id: "allocated", label: "Allocated" },
  { id: "unallocated", label: "Not allocated" },
];
const refreshTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function RoomStatusContent() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async (signal) => {
    try {
      setSnapshot(await fetchRoomStatus(signal));
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
    load();
  }

  const locations = snapshot?.locations ?? [];
  const activeLocation = locations.find((location) => String(location.id) === locationId);
  const rooms = (activeLocation ? [activeLocation] : locations).flatMap((location) =>
    location.rooms.map((room) => ({ ...room, locationName: location.name })),
  );
  const allocatedCount = rooms.filter((room) => room.peopleCount > 0).length;
  const counts = { all: rooms.length, allocated: allocatedCount, unallocated: rooms.length - allocatedCount };
  const visibleRooms = rooms.filter((room) =>
    status === "all" || (room.peopleCount > 0 ? status === "allocated" : status === "unallocated"),
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-1 text-sm text-neutral-100 sm:px-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Room Status</h1>
          <p className="mt-1 text-neutral-400" role="status">
            {snapshot
              ? <>Updated <time dateTime={snapshot.refreshedAt}>{refreshTime.format(new Date(snapshot.refreshedAt))} IST</time></>
              : loading ? "Loading room status…" : "No room status loaded"}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="min-h-11 rounded-full bg-white px-5 font-semibold text-black hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:bg-neutral-700 disabled:text-neutral-200 sm:min-h-9"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {failed && (
        <p role="alert" className="rounded-lg bg-neutral-900 px-4 py-3 text-neutral-200">
          Couldn’t load the latest room status. {snapshot && "The previous counts are still shown. "}Select Refresh to retry.
        </p>
      )}

      <section aria-label="Room allocations" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-neutral-800">
          <div role="group" aria-label="Allocation status" className="flex min-w-0 gap-4 sm:gap-6">
            {filters.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={status === id}
                onClick={() => setStatus(id)}
                className="min-h-11 whitespace-nowrap border-b-2 border-transparent py-2 text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white aria-pressed:border-white aria-pressed:text-white"
              >
                {label}{snapshot && <span className="ml-1 tabular-nums text-neutral-400">{counts[id]}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2 text-neutral-300 sm:pb-0">
            <label htmlFor="room-status-location">Location</label>
            <select
              id="room-status-location"
              value={activeLocation ? locationId : ""}
              onChange={(event) => setLocationId(event.target.value)}
              className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-9"
            >
              <option value="">All locations</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="sticky top-0 bg-black text-xs text-neutral-400">
            <tr>
              <th scope="col" className="py-3 pr-2 font-medium">Room ID</th>
              <th scope="col" className="hidden py-3 pr-2 font-medium sm:table-cell">Location</th>
              <th scope="col" className="hidden py-3 pr-2 font-medium sm:table-cell">Section / floor</th>
              <th scope="col" className="py-3 pr-2 font-medium">Status</th>
              <th scope="col" className="py-3 text-right font-medium">People / capacity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {visibleRooms.map((room) => (
              <tr key={room.id}>
                <th scope="row" className="py-3 pr-2 font-semibold">
                  {room.name}
                  <span className="mt-0.5 block text-xs font-normal text-neutral-400 sm:hidden">
                    {room.locationName} · {room.section}
                  </span>
                </th>
                <td className="hidden py-3 pr-2 text-neutral-300 sm:table-cell">{room.locationName}</td>
                <td className="hidden py-3 pr-2 text-neutral-300 sm:table-cell">{room.section}</td>
                <td className="py-3 pr-2">
                  {room.peopleCount > 0 ? (
                    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-emerald-300 bg-emerald-950">Allocated</span>
                  ) : (
                    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-amber-200 bg-amber-950">Not allocated</span>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 text-right tabular-nums">
                  {room.peopleCount}<span className="text-neutral-400"> / {room.capacity}</span>
                </td>
              </tr>
            ))}
            {visibleRooms.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-neutral-400">
                  {loading && !snapshot ? "Loading room counts…" :
                    !snapshot ? "Room counts are unavailable." :
                      activeLocation && rooms.length === 0 ? `No rooms are listed in ${activeLocation.name}.` :
                        "No rooms match these filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-neutral-400">
          A room is allocated if it has at least one current or upcoming confirmed booking or an unexpired reservation.
        </p>
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
