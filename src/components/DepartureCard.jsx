export default function DepartureCard({ group, onPhoneClick }) {
  const { date, items } = group;
  const count = items.length;

  return (
    <div className="overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-blue-950/40 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-blue-500/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <h3 className="text-lg font-semibold text-white">{date}</h3>
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-semibold">
            {count} departure{count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="divide-y divide-white/5">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className="px-4 py-3 hover:bg-white/5 transition-colors duration-150 group/item"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="text-base font-medium text-white">
                    {item.name || 'No name'}
                  </div>
                  <button
                    onClick={() => onPhoneClick(item.phone)}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-medium hover:bg-blue-500/30 hover:border-blue-400/50 transition-all duration-200"
                  >
                    {item.phone}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <span className="text-gray-400">Location</span>
                    <span className="font-medium text-blue-200">{item.location_id}</span>
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-gray-400">Tent</span>
                    <span className="font-medium text-blue-200">{item.tent_index}</span>
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-gray-400">Block</span>
                    <span className="font-medium text-blue-200">{item.block_index}</span>
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-gray-400">Bed</span>
                    <span className="font-medium text-blue-200">{item.bed_number}</span>
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${item.gender?.toLowerCase() === 'male' ? 'bg-blue-500/20 text-blue-200' : 'bg-pink-500/20 text-pink-200'}`}>
                    {item.gender}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Checked in</div>
                <div className="text-sm font-medium text-gray-200">
                  {item.start_date ? new Date(item.start_date).toLocaleDateString('en-CA', { 
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
