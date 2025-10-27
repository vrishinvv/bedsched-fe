export default function AllocationCard({ batch }) {
  const { batchId, statuses, items } = batch;

  // Determine status color
  const statusColors = {
    reserved: 'from-blue-950/40 via-indigo-950/30 to-blue-950/40 border-blue-500/20',
    confirmed: 'from-emerald-950/40 via-teal-950/30 to-green-950/40 border-emerald-500/20',
    cancelled: 'from-red-950/40 via-rose-950/30 to-red-950/40 border-red-500/20',
  };

  const primaryStatus = statuses[0] || 'confirmed';
  const colorClass = statusColors[primaryStatus] || statusColors.confirmed;

  return (
    <div className={`overflow-hidden rounded-xl border bg-gradient-to-br shadow-lg ${colorClass}`}>
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-300">Batch</div>
            <div className="text-lg font-bold text-white font-mono">
              {batchId || 'Single'}
            </div>
          </div>
          <div className="flex gap-2">
            {statuses.map((status, i) => (
              <span 
                key={i}
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                  ${status === 'reserved' ? 'bg-blue-500/20 border border-blue-400/30 text-blue-200' : ''}
                  ${status === 'confirmed' ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200' : ''}
                  ${status === 'cancelled' ? 'bg-red-500/20 border border-red-400/30 text-red-200' : ''}
                `}
              >
                {status}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-white/5">
        {items.map((item, idx) => (
          <div 
            key={item.id} 
            className="px-4 py-3 hover:bg-white/5 transition-colors duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/30 text-purple-200 font-medium">
                      Location {item.locationId}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300">
                      Tent <span className="font-semibold text-white">{item.tentIndex}</span>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300">
                      Block <span className="font-semibold text-white">{item.blockIndex}</span>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300">
                      Bed <span className="font-semibold text-white">{item.bedNumber}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                    ${item.gender?.toLowerCase() === 'male' ? 'bg-blue-500/20 border border-blue-400/30 text-blue-200' : ''}
                    ${item.gender?.toLowerCase() === 'female' ? 'bg-pink-500/20 border border-pink-400/30 text-pink-200' : ''}
                  `}>
                    {item.gender}
                  </span>
                  <span className="text-gray-400">
                    {new Date(item.startDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })} → {new Date(item.endDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 font-mono">
                ID {item.id}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
