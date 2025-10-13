'use client';
import Link from 'next/link';
import StatPill from './StatPill';

export default function LocationCard({ location }) {
  const allocated = location.allocatedCount ?? 0;
  const total = location.capacity ?? 100;
  const pct = total ? Math.round((allocated / total) * 100) : 0;
  const freeingTomorrow = location.freeingTomorrow ?? 0;

  // Dynamic color based on occupancy
  const getOccupancyColor = () => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getOccupancyBgColor = () => {
    if (pct >= 90) return 'bg-red-50 border-red-200';
    if (pct >= 70) return 'bg-amber-50 border-amber-200';
    if (pct >= 50) return 'bg-blue-50 border-blue-200';
    return 'bg-emerald-50 border-emerald-200';
  };

  const getStatusText = () => {
    if (pct >= 90) return 'Critical';
    if (pct >= 70) return 'High';
    if (pct >= 50) return 'Medium';
    return 'Available';
  };

  const getStatusColor = () => {
    if (pct >= 90) return 'text-red-700 bg-red-100';
    if (pct >= 70) return 'text-amber-700 bg-amber-100';
    if (pct >= 50) return 'text-blue-700 bg-blue-100';
    return 'text-emerald-700 bg-emerald-100';
  };

  return (
    <Link href={`/locations/${location.id}`} className="block group">
      <div className={`relative overflow-hidden rounded-2xl border-2 ${getOccupancyBgColor()} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1`}>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
        
        {/* Status badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Header */}
        <div className="relative mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 pr-20">{location.name}</h3>
          <p className="text-sm text-gray-600">Tent Accommodation</p>
        </div>

        {/* Main stats */}
        <div className="relative mb-6">
          <div className="flex items-end gap-1 mb-2">
            <span className="text-3xl font-bold text-gray-900">{allocated}</span>
            <span className="text-lg text-gray-500 mb-1">/ {total}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">beds occupied</p>
        </div>

        {/* Progress bar with enhanced styling */}
        <div className="relative mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Occupancy</span>
            <span className="text-sm font-bold text-gray-900">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200/50 shadow-inner">
            <div
              className={`h-3 ${getOccupancyColor()} transition-all duration-700 ease-out rounded-full shadow-sm`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {freeingTomorrow > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">
                  {freeingTomorrow} freeing tomorrow
                </span>
              </div>
            )}
          </div>
          
          {/* Arrow indicator */}
          <div className="flex items-center text-gray-400 group-hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </Link>
  );
}