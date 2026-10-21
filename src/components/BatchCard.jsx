export default function BatchCard({ batch, onEdit, onAllocate }) {
  const { batchId, rows, phones, expiresAt } = batch;
  const count = rows.length;
  const phoneList = Array.from(phones);
  const phone = phoneList[0] || '';

  // Build location summary with gender split
  const locMap = new Map();
  for (const r of rows) {
    const key = `${r.location_id}-${r.tent_index}-${r.block_index}`;
    if (!locMap.has(key)) locMap.set(key, { male: 0, female: 0, location_id: r.location_id, tent_index: r.tent_index, block_index: r.block_index });
    const loc = locMap.get(key);
    if (r.gender === 'male') loc.male++;
    else if (r.gender === 'female') loc.female++;
  }
  const locations = Array.from(locMap.values());

  return (
    <div className="group relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-blue-950/40 hover:border-indigo-400/40 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20">
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
      
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-indigo-300 uppercase tracking-wide">Batch ID</div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {batchId || '—'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-sm font-semibold">
              {count} reserved
            </div>
            {expiresAt && (
              <div className="text-xs text-gray-400">
                Expires {new Date(expiresAt).toLocaleString('en-CA', { 
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(',', '')}
              </div>
            )}
          </div>
        </div>

        {/* Location summary - line by line with gender split */}
        <div className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-1">
          <div className="text-xs text-gray-400 mb-2">Locations</div>
          {locations.map((loc, i) => (
            <div key={i} className="text-sm text-gray-200 flex items-center justify-between">
              <span>Loc {loc.location_id} • Tent {loc.tent_index} • Block {loc.block_index}</span>
              <div className="flex gap-2">
                {loc.male > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 border border-blue-400/30 text-blue-200">
                    {loc.male} Male
                  </span>
                )}
                {loc.female > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-pink-500/20 border border-pink-400/30 text-pink-200">
                    {loc.female} Female
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Phone chips */}
        {phoneList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="text-xs text-gray-400 self-center">Phone:</div>
            {phoneList.slice(0, 2).map((p, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-sm font-medium">
                {p}
              </span>
            ))}
            {phoneList.length > 2 && (
              <span className="px-3 py-1 rounded-full bg-gray-500/20 border border-gray-400/30 text-gray-300 text-sm">
                +{phoneList.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Action buttons - improved compact design */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button 
            className="px-3 py-2 rounded-lg border border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all duration-200 font-medium text-sm"
            onClick={() => onEdit(phone)}
          >
            Edit
          </button>
          <button 
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 font-medium text-sm shadow-lg shadow-blue-900/30"
            onClick={() => onAllocate(phone)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
