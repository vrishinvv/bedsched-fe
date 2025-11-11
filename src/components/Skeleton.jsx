'use client';

export default function Skeleton({ className = "", variant = "default" }) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 bg-[length:200%_100%] rounded";
  
  const variants = {
    default: "h-4 w-full",
    text: "h-4 w-3/4",
    title: "h-8 w-1/2",
    card: "h-48 w-full",
    circle: "h-12 w-12 rounded-full",
    button: "h-10 w-24",
    stat: "h-20 w-full",
    bed: "aspect-square w-full rounded-xl"
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
}

// Skeleton for cards (locations, tents, blocks)
export function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 bg-gray-800 border-gray-700 p-6 shadow-lg">
      <div className="absolute top-4 right-4">
        <Skeleton variant="button" className="h-6 w-16 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
      </div>
      
      <div className="mb-4">
        <Skeleton variant="title" className="mb-2 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500" />
      </div>
      
      <div className="mb-6">
        <div className="flex items-end gap-1 mb-2">
          <Skeleton className="h-8 w-16 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500" />
          <Skeleton className="h-6 w-12 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
          <Skeleton className="h-4 w-8 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        </div>
        <Skeleton className="h-3 w-full rounded-full bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
      </div>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        <Skeleton className="h-5 w-5 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
      </div>
    </div>
  );
}

// Skeleton for dashboard stats
export function StatCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-5 backdrop-blur-sm">
      <div className="relative">
        <Skeleton className="h-8 w-8 rounded-xl mb-3 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        <Skeleton className="h-3 w-20 mb-2 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        <Skeleton className="h-6 w-16 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500" />
      </div>
    </div>
  );
}

// Skeleton for bed grid
export function BedGridSkeleton({ capacity = 100 }) {
  const items = Array.from({ length: capacity }, (_, i) => i + 1);
  
  return (
    <div className="p-6 bg-gray-800 rounded-2xl shadow-2xl">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-2 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
          <Skeleton className="h-4 w-48 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
          <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
          <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        </div>
      </div>

      {/* Date display skeleton */}
      <div className="mb-4 text-center">
        <Skeleton className="h-6 w-32 mx-auto bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-lg" />
      </div>

      {/* Bed grid skeleton */}
      <div className="grid grid-cols-8 gap-3 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20">
        {items.map((n) => (
          <Skeleton key={n} variant="bed" className="bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600" />
        ))}
      </div>
    </div>
  );
}

// Skeleton for header sections
export function HeaderSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gray-800 border border-gray-700 p-6">
      <div className="relative">
        <Skeleton className="h-4 w-32 mb-3 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
        <Skeleton variant="title" className="h-8 w-64 mb-2 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500" />
        <Skeleton className="h-4 w-48 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
      </div>
    </section>
  );
}

// Skeleton for tree view (batches with hierarchy)
export function TreeSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border bg-gradient-to-br shadow-lg border-blue-500/20 from-blue-950/40 via-indigo-950/30 to-blue-950/40">
          {/* Header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500" />
              <Skeleton className="h-5 w-20 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
            </div>
          </div>
          
          {/* Content */}
          <div className="px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-full bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
            <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
            <Skeleton className="h-4 w-5/6 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
          </div>
          
          {/* Footer buttons */}
          <div className="bg-white/5 border-t border-white/10 px-4 py-3">
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-8 w-20 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
              <Skeleton className="h-8 w-24 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for table view
export function TableSkeleton({ rows = 10, columns = 9 }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
            <tr>
              {Array.from({ length: columns }).map((_, idx) => (
                <th key={idx} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="animate-pulse">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <Skeleton className={`h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 ${
                      colIdx === 0 ? 'w-8' : 
                      colIdx === 1 ? 'w-32' : 
                      colIdx === 2 || colIdx === 3 ? 'w-20' : 
                      colIdx === 4 ? 'w-12' : 
                      colIdx === 5 ? 'w-40' : 
                      colIdx === 6 ? 'w-28' : 
                      'w-24'
                    }`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
