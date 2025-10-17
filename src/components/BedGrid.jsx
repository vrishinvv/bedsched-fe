'use client';

export default function BedGrid({ capacity = 100, beds = {}, onSelect }) {
    // beds: { [bedNumber]: allocationOrNull }
    const items = Array.from({ length: capacity }, (_, i) => i + 1);
    console.log('Rendering BedGrid with capacity:', capacity, 'and beds:', beds);
    
    // Helper function to get today's date in YYYY-MM-DD format (IST)
    const getTodayIST = () => {
        const now = new Date();
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        
        // Format as YYYY-MM-DD
        return istTime.toISOString().split('T')[0];
    };
    
    // Helper function to determine bed status
    const getBedStatus = (allocation) => {
        if (!allocation) return 'available';
        
        const today = getTodayIST();
        const startDate = allocation.startDate;
        const endDate = allocation.endDate;
        
        if (!startDate || !endDate) return 'available';
        
        // Check if today is within the booking period
        if (today >= startDate && today <= endDate) {
            return 'current'; // Currently occupied
        } else if (startDate > today) {
            return 'future'; // Future allocation
        } else {
            return 'available'; // Past allocation (treat as available)
        }
    };
    
    // Helper function to format date for display as dd/mm/yyyy
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    
    return (
        <div className="p-6 bg-gray-800 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">Bed Layout</h3>
                    <p className="text-sm text-gray-400">Click any bed to allocate or edit (IST timezone)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
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
                </div>
            </div>

            {/* Current Date Display */}
            <div className="mb-4 text-center">
                <div className="inline-flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1">
                    <span className="text-xs text-gray-400">Today (IST):</span>
                    <span className="text-sm font-medium text-white">
                        {formatDate(getTodayIST())}
                    </span>
                </div>
            </div>

            {/* Bed Grid */}
            <div className="grid grid-cols-8 gap-3 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20">
                {items.map((n) => {
                    const allocation = beds?.[n];
                    const status = getBedStatus(allocation);
                    
                    // Define styles based on status
                    const getStatusStyles = () => {
                        switch (status) {
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
                        if (!allocation) return `Bed ${n}: Available`;
                        
                        const startDate = formatDate(allocation.startDate);
                        const endDate = formatDate(allocation.endDate);
                        
                        switch (status) {
                            case 'current':
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Currently Occupied`;
                            case 'future':
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Future Booking`;
                            default:
                                return `Bed ${n}: ${allocation.name} (${startDate} - ${endDate}) - Past Booking`;
                        }
                    };
                    
                    return (
                        <button
                            key={n}
                            onClick={() => onSelect(n, allocation || null)}
                            className={`
                                group relative aspect-square w-full rounded-xl text-xs font-bold
                                shadow-lg transition-all duration-300 ease-out transform cursor-pointer
                                hover:scale-110 hover:shadow-xl hover:z-10
                                ${styles.bg} ${styles.shadow}
                            `}
                            title={getTooltipText()}
                        >
                            {/* Bed number */}
                            <span className="relative z-10 drop-shadow-sm">{n}</span>
                            
                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm ${styles.glow}`} />
                            
                            {/* Subtle pattern overlay */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}