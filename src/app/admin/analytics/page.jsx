"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchAnalytics, getLocations } from "@/lib/api";
import { BOOKING_MIN_DATE } from "@/lib/bookingWindow.mjs";
import {
  buildAllocatorRanking,
  buildCategoryGenderSummary,
  buildGenderTotals,
  buildLocationSummaries,
  isValidAnalyticsRange,
  percent,
} from "@/lib/analytics.mjs";

const EVENT_YEAR = BOOKING_MIN_DATE.slice(0, 4);
const DEFAULT_FILTERS = Object.freeze({
  startDate: `${EVENT_YEAR}-10-01`,
  endDate: `${EVENT_YEAR}-12-31`,
  locationId: "",
  tentIndex: "",
  blockIndex: "",
});

const CHART = Object.freeze({
  male: "#245f8f",
  female: "#bd4b6b",
  other: "#6b7280",
  accent: "#a65f00",
  ink: "#1f2937",
  muted: "#667085",
  grid: "#e5e7eb",
});

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #d7dce2",
  borderRadius: "8px",
  color: "#171717",
  boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)",
};

function formatDateLabel(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatRangeLabel({ startDate, endDate }) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

function EmptyState({ message }) {
  return <p className="mt-4 rounded-md border border-dashed border-[#cfd4da] px-3 py-3 text-sm text-[#5d6672]">{message}</p>;
}

function SummaryStrip({ total, genders, locationCount }) {
  const items = [
    { label: "People allocated", value: total },
    { label: "Men", value: genders.male },
    { label: "Women", value: genders.female },
    { label: "Locations used", value: locationCount },
  ];

  return (
    <section aria-label="Allocation summary" className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`min-w-0 border-[#e9ecef] px-4 py-4 sm:px-5 ${index % 2 ? "border-l" : ""} ${index >= 2 ? "border-t lg:border-t-0" : ""} lg:border-l lg:first:border-l-0`}
        >
          <p className="text-sm font-medium text-[#5d6672]">{item.label}</p>
          <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums text-[#171717]">
            {Number(item.value || 0).toLocaleString()}
          </p>
        </div>
      ))}
    </section>
  );
}

function ChartLegend({ showOther = false }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#4b5563]" aria-label="Gender legend">
      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#245f8f]" />Men</span>
      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#bd4b6b]" />Women</span>
      {showOther && <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#6b7280]" />Other</span>}
    </div>
  );
}

function CategoryGenderPanel({ rows }) {
  const hasData = rows.some((row) => row.total > 0);
  const hasOther = rows.some((row) => row.other > 0);

  return (
    <section aria-labelledby="category-gender-title" className="rounded-lg border border-[#dfe3e8] bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="category-gender-title" className="text-lg font-semibold text-[#171717]">Men and women by category</h3>
          <p className="mt-1 text-sm text-[#5d6672]">Compare delegates, sevadals, devotees and caretakers.</p>
        </div>
        <ChartLegend showOther={hasOther} />
      </div>
      {hasData ? (
        <div role="img" aria-label="Grouped bars comparing men, women and other genders in every accommodation category">
          <ResponsiveContainer width="100%" height={258}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 38, bottom: 4, left: 6 }} barGap={3}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke={CHART.muted} tickLine={false} axisLine={{ stroke: "#cfd4da" }} />
              <YAxis type="category" dataKey="label" width={82} stroke={CHART.muted} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [Number(value).toLocaleString(), name]} />
              <Bar dataKey="male" name="Men" fill={CHART.male} radius={0}>
                <LabelList dataKey="male" position="right" fill={CHART.ink} fontSize={12} formatter={(value) => value || ""} />
              </Bar>
              <Bar dataKey="female" name="Women" fill={CHART.female} radius={0}>
                <LabelList dataKey="female" position="right" fill={CHART.ink} fontSize={12} formatter={(value) => value || ""} />
              </Bar>
              <Bar dataKey="other" name="Other" fill={CHART.other} radius={0}>
                <LabelList dataKey="other" position="right" fill={CHART.ink} fontSize={12} formatter={(value) => value || ""} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="No allocations match this date range and filter." />
      )}
    </section>
  );
}

function LocationTotalsPanel({ locations }) {
  const chartRows = locations.slice(0, 10);
  return (
    <section aria-labelledby="location-total-title" className="rounded-lg border border-[#dfe3e8] bg-white p-4 sm:p-5">
      <h3 id="location-total-title" className="text-lg font-semibold text-[#171717]">Allocations by location</h3>
      <p className="mt-1 text-sm text-[#5d6672]">Largest locations appear first. Exact category splits are below.</p>
      {chartRows.length ? (
        <div className="mt-4" role="img" aria-label="Horizontal bars comparing total allocations across locations">
          <ResponsiveContainer width="100%" height={258}>
            <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke={CHART.muted} tickLine={false} axisLine={{ stroke: "#cfd4da" }} />
              <YAxis type="category" dataKey="name" width={118} stroke={CHART.muted} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [Number(value).toLocaleString(), "People"]} />
              <Bar dataKey="total" name="People" fill={CHART.accent} radius={0}>
                <LabelList dataKey="total" position="right" fill={CHART.ink} fontSize={12} formatter={(value) => Number(value).toLocaleString()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="No locations have allocations in this view." />
      )}
    </section>
  );
}

function SplitBar({ male, female, other, total, label }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#e7e9ed]" role="img" aria-label={`${label}: ${male} men, ${female} women, ${other} other`}>
      {male > 0 && <span className="h-full bg-[#245f8f]" style={{ width: `${percent(male, total)}%` }} />}
      {female > 0 && <span className="h-full bg-[#bd4b6b]" style={{ width: `${percent(female, total)}%` }} />}
      {other > 0 && <span className="h-full bg-[#6b7280]" style={{ width: `${percent(other, total)}%` }} />}
    </div>
  );
}

function GenderCounts({ row }) {
  const showOther = row.other > 0;
  return (
    <div className={`grid ${showOther ? "grid-cols-3" : "grid-cols-2"} gap-2 text-right text-xs tabular-nums text-[#4b5563] sm:text-sm`}>
      <span><span className="font-semibold text-[#245f8f]">{row.male.toLocaleString()}</span> men</span>
      <span><span className="font-semibold text-[#bd4b6b]">{row.female.toLocaleString()}</span> women</span>
      {showOther && <span><span className="font-semibold text-[#6b7280]">{row.other.toLocaleString()}</span> other</span>}
    </div>
  );
}

function LocationBreakdownCard({ location }) {
  const activeCategories = location.categories.filter((category) => category.total > 0);
  return (
    <article className="rounded-lg border border-[#dfe3e8] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-[#171717]">{location.name}</h4>
          <p className="mt-0.5 text-sm text-[#5d6672]">{location.total.toLocaleString()} people allocated</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold leading-none tabular-nums text-[#171717]">{location.total.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#5d6672]">total</p>
        </div>
      </div>

      <div className="mt-4">
        <GenderCounts row={location.genders} />
        <div className="mt-2"><SplitBar {...location.genders} total={location.total} label={`${location.name} overall`} /></div>
      </div>

      <div className="mt-5 space-y-4">
        {activeCategories.map((category) => (
          <div key={category.category}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-[#303844]">{category.label}</p>
              <p className="text-sm tabular-nums text-[#5d6672]">{category.total.toLocaleString()}</p>
            </div>
            <SplitBar {...category} label={`${location.name}, ${category.label}`} />
            <div className="mt-1.5"><GenderCounts row={category} /></div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ActivityPanel({ title, subtitle, rows, color }) {
  const chartRows = rows.map((row) => ({ ...row, count: Number(row.count || 0), dateLabel: formatDateLabel(row.date) }));
  return (
    <section className="rounded-lg border border-[#dfe3e8] bg-white p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-[#171717]">{title}</h3>
      <p className="mt-1 text-sm text-[#5d6672]">{subtitle}</p>
      {chartRows.length >= 4 ? (
        <div className="mt-4" role="img" aria-label={`${title} bar chart`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartRows} margin={{ top: 8, right: 8, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="dateLabel" stroke={CHART.muted} tickLine={false} axisLine={{ stroke: "#cfd4da" }} minTickGap={18} />
              <YAxis stroke={CHART.muted} allowDecimals={false} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [Number(value).toLocaleString(), "People"]} />
              <Bar dataKey="count" name="People" fill={color} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : chartRows.length ? (
        <div className="mt-4 space-y-2">
          {chartRows.map((row) => (
            <div key={`${row.date}-${row.count}`} className="flex items-center justify-between rounded-md bg-[#f5f6f8] px-3 py-2 text-sm">
              <span className="text-[#4b5563]">{formatDateLabel(row.date)}</span>
              <span className="font-semibold tabular-nums text-[#171717]">{row.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : <EmptyState message="No activity in this date range." />}
    </section>
  );
}

function AllocatorPanel({ rows }) {
  const max = Math.max(...rows.map((row) => row.count), 0);
  return (
    <section aria-labelledby="allocator-title" className="rounded-lg border border-[#dfe3e8] bg-white p-4 sm:p-5">
      <h3 id="allocator-title" className="text-lg font-semibold text-[#171717]">Allocations recorded by each user</h3>
      <p className="mt-1 text-sm text-[#5d6672]">A simple count of records added in the selected period.</p>
      {rows.length ? (
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.username} className="grid grid-cols-[minmax(90px,180px)_1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#303844]">{row.username}</p>
                {row.locationNames.length > 0 && <p className="truncate text-xs text-[#68717d]">{row.locationNames.join(", ")}</p>}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#e7e9ed]" role="img" aria-label={`${row.username}: ${row.count} allocations`}>
                <div className="h-full bg-[#3f4a56]" style={{ width: `${max ? (row.count / max) * 100 : 0}%` }} />
              </div>
              <span className="min-w-10 text-right text-sm font-semibold tabular-nums text-[#171717]">{row.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : <EmptyState message="No allocator activity in this view." />}
    </section>
  );
}

function InitialLoading() {
  return (
    <div className="rounded-2xl bg-[#f2f4f7] p-4 text-[#171717] sm:p-6" aria-live="polite">
      <h2 className="text-2xl font-semibold">Analytics</h2>
      <p className="mt-2 text-sm text-[#5d6672]">Loading allocation totals and breakdowns…</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 rounded-lg bg-[#e3e7eb]" />)}
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const [data, setData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [tents, setTents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });

  useEffect(() => {
    getLocations().then((result) => setLocations(Array.isArray(result) ? result : []))
      .catch(() => setError("Could not load the list of locations."));
  }, []);

  useEffect(() => {
    if (!filters.locationId) {
      setTents([]);
      setBlocks([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/locations/${filters.locationId}/tents`, {
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("bs_token") : ""}` },
    }).then((response) => response.json()).then((result) => setTents(result.tents || []))
      .catch(() => setError("Could not load floors for this location."));
  }, [filters.locationId]);

  useEffect(() => {
    if (!filters.locationId || !filters.tentIndex) {
      setBlocks([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/locations/${filters.locationId}/tents/${filters.tentIndex}/blocks`, {
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("bs_token") : ""}` },
    }).then((response) => response.json()).then((result) => setBlocks(result.blocks || []))
      .catch(() => setError("Could not load rooms for this floor."));
  }, [filters.locationId, filters.tentIndex]);

  const loadData = useCallback(async (nextFilters) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAnalytics(nextFilters);
      setData(result.data);
      setAppliedFilters({ ...nextFilters });
    } catch (loadError) {
      setError(loadError.message || "Could not load analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(DEFAULT_FILTERS); }, [loadData]);

  const categoryRows = useMemo(() => buildCategoryGenderSummary(data?.categoryGenderBreakdown || []), [data?.categoryGenderBreakdown]);
  const genderTotals = useMemo(() => buildGenderTotals(categoryRows), [categoryRows]);
  const locationRows = useMemo(() => buildLocationSummaries(data?.locationCategoryGenderBreakdown || []), [data?.locationCategoryGenderBreakdown]);
  const allocatorRows = useMemo(() => buildAllocatorRanking(data?.allocatorTotals || [], 10), [data?.allocatorTotals]);
  const hasOtherGender = genderTotals.other > 0;
  const dateRangeValid = isValidAnalyticsRange(filters.startDate, filters.endDate);

  const handleFilterChange = (key, value) => {
    setFilters((current) => {
      if (key === "locationId") return { ...current, locationId: value, tentIndex: "", blockIndex: "" };
      if (key === "tentIndex") return { ...current, tentIndex: value, blockIndex: "" };
      return { ...current, [key]: value };
    });
  };

  const resetFilters = () => {
    const defaults = { ...DEFAULT_FILTERS };
    setFilters(defaults);
    setTents([]);
    setBlocks([]);
    loadData(defaults);
  };

  if (!data && loading) return <InitialLoading />;

  return (
    <main className="overflow-hidden rounded-2xl bg-[#f2f4f7] text-[#171717]">
      <div className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#4f5965] hover:text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#a65f00] focus:ring-offset-2">
              <span aria-hidden="true">←</span> Back to bookings
            </Link>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#171717]">Analytics</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5d6672]">See who was allocated, where they stayed, and how every group was split by gender.</p>
          </div>
          <div className="md:pt-11 md:text-right">
            <p className="text-sm font-medium text-[#303844]">{formatRangeLabel(appliedFilters)}</p>
            <p className="mt-1 text-xs text-[#68717d]">Counts exclude no-shows and booking errors.</p>
          </div>
        </header>

        {error && <div role="alert" className="mt-5 rounded-lg border border-[#e5b6b9] bg-[#fff1f1] px-4 py-3 text-sm text-[#8b1f25]">{error}</div>}

        <section aria-label="Analytics filters" className="mt-6 rounded-lg border border-[#dfe3e8] bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm font-medium text-[#303844]">From
              <input type="date" value={filters.startDate} onChange={(event) => handleFilterChange("startDate", event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-[#c9cfd6] bg-white px-3 text-sm text-[#171717] focus:border-[#a65f00] focus:outline-none focus:ring-2 focus:ring-[#f3d6ad]" />
            </label>
            <label className="text-sm font-medium text-[#303844]">To
              <input type="date" value={filters.endDate} onChange={(event) => handleFilterChange("endDate", event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-[#c9cfd6] bg-white px-3 text-sm text-[#171717] focus:border-[#a65f00] focus:outline-none focus:ring-2 focus:ring-[#f3d6ad]" />
            </label>
            <label className="text-sm font-medium text-[#303844]">Location
              <select value={filters.locationId} onChange={(event) => handleFilterChange("locationId", event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-[#c9cfd6] bg-white px-3 text-sm text-[#171717] focus:border-[#a65f00] focus:outline-none focus:ring-2 focus:ring-[#f3d6ad]">
                <option value="">All locations</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#303844]">Section / Floor
              <select value={filters.tentIndex} onChange={(event) => handleFilterChange("tentIndex", event.target.value)} disabled={!filters.locationId} className="mt-1 block h-10 w-full rounded-md border border-[#c9cfd6] bg-white px-3 text-sm text-[#171717] disabled:bg-[#f1f2f4] disabled:text-[#747d88] focus:border-[#a65f00] focus:outline-none focus:ring-2 focus:ring-[#f3d6ad]">
                <option value="">All sections</option>
                {tents.map((tent) => <option key={tent.index} value={tent.index}>{tent.name || `Floor ${tent.index}`}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#303844]">Room / Block
              <select value={filters.blockIndex} onChange={(event) => handleFilterChange("blockIndex", event.target.value)} disabled={!filters.tentIndex} className="mt-1 block h-10 w-full rounded-md border border-[#c9cfd6] bg-white px-3 text-sm text-[#171717] disabled:bg-[#f1f2f4] disabled:text-[#747d88] focus:border-[#a65f00] focus:outline-none focus:ring-2 focus:ring-[#f3d6ad]">
                <option value="">All rooms</option>
                {blocks.map((block) => <option key={block.index} value={block.index}>{block.name || `Room ${block.index}`}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => loadData(filters)} disabled={loading || !dateRangeValid} className="min-h-11 rounded-md bg-[#202428] px-5 text-sm font-semibold text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#a65f00] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#9ca3af]">
              {loading ? "Updating…" : "Show analytics"}
            </button>
            <button type="button" onClick={resetFilters} disabled={loading} className="min-h-11 px-2 text-sm font-medium text-[#4f5965] underline-offset-4 hover:text-[#171717] hover:underline focus:outline-none focus:ring-2 focus:ring-[#a65f00] focus:ring-offset-2">Reset filters</button>
            {!dateRangeValid && <p className="text-sm text-[#9b252b]">The “From” date must be before the “To” date.</p>}
          </div>
        </section>

        {data && <div className="mt-5 space-y-5">
          <SummaryStrip total={data.totalAllocations} genders={genderTotals} locationCount={locationRows.length} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <CategoryGenderPanel rows={categoryRows} />
            <LocationTotalsPanel locations={locationRows} />
          </div>
          <section aria-labelledby="location-details-title">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 id="location-details-title" className="text-lg font-semibold text-[#171717]">Inside each location</h3>
                <p className="mt-1 text-sm text-[#5d6672]">Every category shows its men–women split and exact counts.</p>
              </div>
              <ChartLegend showOther={hasOtherGender} />
            </div>
            {locationRows.length ? <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {locationRows.map((location) => <LocationBreakdownCard key={location.id || location.name} location={location} />)}
            </div> : <EmptyState message="No location breakdown is available for this view." />}
          </section>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ActivityPanel title="Bookings recorded by day" subtitle="When allocation records were added." rows={data.dailyAllocations || []} color={CHART.accent} />
            <ActivityPanel title="Departures by day" subtitle="When allocated stays were due to end." rows={data.dailyDepartures || []} color={CHART.ink} />
          </div>
          <AllocatorPanel rows={allocatorRows} />
        </div>}
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  return <ProtectedRoute requiredRole="admin"><AnalyticsContent /></ProtectedRoute>;
}
