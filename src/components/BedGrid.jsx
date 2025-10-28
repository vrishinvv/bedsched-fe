'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function BedGrid({
    capacity = 100,
    beds = {},
    onSelect,
    // Optional multi-select props
    selectedBeds = [],
    onSelectionChange,
    // Optional phone filter: if provided and valid (10 digits), non-matching beds are dimmed
    filterPhone = ''
}) {
    // beds: { [bedNumber]: allocationOrNull }
    const items = useMemo(() => Array.from({ length: capacity }, (_, i) => i + 1), [capacity]);
    const [anchor, setAnchor] = useState(null); // for ctrl/cmd range selection
    const containerRef = useRef(null);
    
    // Helper: get today's date in YYYY-MM-DD for IST using stable timezone formatting
    const todayIST = useMemo(() => {
        try {
            // en-CA yields YYYY-MM-DD
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        } catch {
            // Fallback: toLocaleDateString
            return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        }
    }, []);

    const toNum = (yyyyMmDd) => yyyyMmDd ? Number(yyyyMmDd.replace(/-/g, '')) : NaN;
    
    // Helper function to determine bed status
    const getBedStatus = (allocation) => {
        if (!allocation) return 'available';
        if (allocation.status === 'reserved') {
            // Treat null/absent expiry as active (align with backend semantics)
            if (!allocation.reservedExpiresAt) return 'reserved';
            const expires = new Date(allocation.reservedExpiresAt).getTime();
            if (Date.now() < expires) return 'reserved';
            // If reservation expired, treat as available (ignore date range)
            return 'available';
        }
        
        const today = todayIST;
        const startDate = allocation.startDate;
        const endDate = allocation.endDate;
        
        if (!startDate || !endDate) return 'available';
        
        // Check if today is within the booking period
        const tN = toNum(today), sN = toNum(startDate), eN = toNum(endDate);
        if (Number.isFinite(tN) && Number.isFinite(sN) && Number.isFinite(eN) && tN >= sN && tN <= eN) {
            return 'current'; // Currently occupied
        } else if (Number.isFinite(sN) && Number.isFinite(tN) && sN > tN) {
            return 'future'; // Future allocation
        } else {
            return 'available'; // Past allocation (treat as available)
        }
    };

    // Precompute statuses to avoid recalculating in render loop
    const statuses = useMemo(() => {
        const map = new Map();
        for (let n of items) {
            const allocation = beds?.[n];
            map.set(n, getBedStatus(allocation));
        }
        return map;
    }, [items, beds, todayIST]);
    
    // Helper function to format date for display as dd/mm/yyyy
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    
    // Normalize phone filter (digits only)
    const normalizedPhone = useMemo(() => (filterPhone || '').replace(/\D/g, ''), [filterPhone]);

    const isSelected = (n) => Array.isArray(selectedBeds) && selectedBeds.includes(n);

    function emitSelection(next) {
        if (typeof onSelectionChange === 'function') onSelectionChange(next);
    }

    const handleClick = useCallback((e, n, allocation) => {
        const isCtrlOrMeta = e.ctrlKey || e.metaKey; // support macOS cmd key too

        if (isCtrlOrMeta) {
            // Range select behavior: first ctrl/cmd-click sets anchor; second selects inclusive range
            if (anchor == null) {
                setAnchor(n);
                emitSelection([n]);
            } else {
                const [start, end] = anchor < n ? [anchor, n] : [n, anchor];
                const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                emitSelection(range);
                setAnchor(null);
            }
            return;
        }

        // Regular click: open allocation modal/callback
        setAnchor(null);
        onSelect?.(n, allocation || null);
    }, [anchor, onSelect]);

    // Clear selection when clicking outside the grid or pressing Escape
    useEffect(() => {
        function onDocClick(ev) {
            if (!Array.isArray(selectedBeds) || selectedBeds.length === 0) return;
            const node = containerRef.current;
            if (!node) return;
            // Don't clear if clicking on elements that preserve selection (e.g., toolbar buttons)
            const preserve = ev.target && typeof ev.target.closest === 'function' && ev.target.closest('[data-preserve-selection="true"]');
            if (preserve) return;
            if (!node.contains(ev.target)) {
                setAnchor(null);
                emitSelection([]);
            }
        }
        function onKey(ev) {
            if (ev.key === 'Escape' && Array.isArray(selectedBeds) && selectedBeds.length > 0) {
                setAnchor(null);
                emitSelection([]);
            }
        }
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [selectedBeds]);

    return (
        <div ref={containerRef} className="p-3 sm:p-6 bg-gray-800 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Bed Layout</h3>
                    <p className="text-xs sm:text-sm text-gray-400">Tap any bed to allocate or edit (IST timezone)</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 text-[11px] sm:text-xs overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Currently Occupied</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Future Booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                        <span className="text-gray-300">Reserved</span>
                    </div>
                    {Array.isArray(selectedBeds) && selectedBeds.length > 0 && (
                        <div className="flex items-center gap-2 ml-2">
                            <div className="w-3 h-3 rounded-full shadow-lg ring-2 ring-yellow-300 bg-transparent"></div>
                            <span className="text-gray-300">Selected ({selectedBeds.length})</span>
                            <button
                                onClick={() => { setAnchor(null); emitSelection([]); }}
                                className="ml-1 px-2 py-0.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                                title="Clear selection (Esc)"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Current Date Display */}
            <div className="mb-4 text-center">
                <div className="inline-flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1">
                    <span className="text-xs text-gray-400">Today (IST):</span>
                    <span className="text-sm font-medium text-white">
                        {formatDate(todayIST)}
                    </span>
                </div>
            </div>

            {/* Bed Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20 gap-2 sm:gap-3">
                {items.map((n) => {
                    const allocation = beds?.[n];
                    const status = statuses.get(n);
                    const phoneMatch = allocation?.phone && normalizedPhone.length === 10 && allocation.phone === normalizedPhone;
                    
                    // Define styles based on status
                    const getStatusStyles = () => {
                        switch (status) {
                            case 'reserved':
                                return {
                                    bg: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white hover:from-blue-500 hover:to-blue-700',
                                    glow: 'bg-blue-400',
                                    shadow: 'shadow-blue-500/25'
                                };
                            case 'current':
                                return {
                                    bg: 'bg-gradient-to-br from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700',
                                    glow: 'bg-red-400',
                                    shadow: 'shadow-red-500/25'
                                };
                            case 'future':
                                return {
                                    bg: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700',
                                    glow: 'bg-orange-400',
                                    shadow: 'shadow-orange-500/25'
                                };
                            default: // available
                                return {
                                    bg: 'bg-gradient-to-br from-white to-gray-100 text-black hover:from-gray-50 hover:to-gray-200',
                                    glow: 'bg-gray-300',
                                    shadow: 'shadow-gray-500/25'
                                };
                        }
                    };
                    
                    const styles = getStatusStyles();
                    
                    // Generate tooltip text
                    const getTooltipText = () => {
                        if (status === 'available') return `Bed ${n}: Available`;
                        
                        const startDate = formatDate(allocation.startDate);
                        const endDate = formatDate(allocation.endDate);
                        
                        switch (status) {
                            case 'reserved': {
                                const expiresAt = allocation.reservedExpiresAt ? new Date(allocation.reservedExpiresAt) : null;
                                const expiresStr = expiresAt ? expiresAt.toLocaleString() : 'Soon';
                                return `Bed ${n}: Reserved by ${allocation.name || 'contact'} (${startDate} - ${endDate}) until ${expiresStr}`;
                            }
                            case 'current':
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Currently Occupied`;
                            case 'future':
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Future Booking`;
                            default:
                                return `Bed ${n}: Available`;
                        }
                    };
                    
                    return (
                        <button
                            key={n}
                            onClick={(e) => handleClick(e, n, status === 'available' ? null : (allocation || null))}
                            className={`
                                group relative aspect-square w-full rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold
                                shadow-lg transition-all duration-300 ease-out transform cursor-pointer
                                hover:scale-110 hover:shadow-xl hover:z-10
                                ${styles.bg} ${styles.shadow}
                                ${normalizedPhone.length === 10 && !phoneMatch ? 'opacity-40' : ''}
                                ${isSelected(n) ? 'ring-4 ring-yellow-300 ring-offset-2 ring-offset-gray-800' : ''}
                            `}
                            title={getTooltipText()}
                        >
                            {/* Bed number */}
                            <span className="relative z-10 drop-shadow-sm">{n}</span>
                            
                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm ${styles.glow}`} />
                            
                            {/* Subtle pattern overlay */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
                            {phoneMatch && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full shadow" title="Phone match" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}