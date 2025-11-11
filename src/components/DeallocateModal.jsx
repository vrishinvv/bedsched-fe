'use client';

export default function DeallocateModal({ open, onClose, onConfirm, personName }) {
  if (!open) return null;

  const handleChoice = (wasOccupied, reason) => {
    onConfirm(wasOccupied, reason);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Remove This Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Person name */}
        {personName && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-200 text-xs sm:text-sm">
              <span className="font-semibold">Guest:</span> {personName}
            </p>
          </div>
        )}

        {/* Description */}
        <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6">
          Why are you removing this booking? Choose the option that best describes the situation:
        </p>

        {/* Options */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          {/* Option 1: Left Early */}
          <button
            onClick={() => handleChoice(true, 'left_early')}
            className="w-full text-left p-3 sm:p-4 bg-gradient-to-br from-green-600/20 to-green-700/10 hover:from-green-600/30 hover:to-green-700/20 border border-green-500/30 hover:border-green-500/50 rounded-lg sm:rounded-xl transition-all group active:scale-[0.98]"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-green-300 transition-colors">
                  Person Left Early
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">
                  They stayed here but departed before the end date
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Never Arrived / No-show */}
          <button
            onClick={() => handleChoice(false, 'no_show')}
            className="w-full text-left p-3 sm:p-4 bg-gradient-to-br from-orange-600/20 to-orange-700/10 hover:from-orange-600/30 hover:to-orange-700/20 border border-orange-500/30 hover:border-orange-500/50 rounded-lg sm:rounded-xl transition-all group active:scale-[0.98]"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-orange-300 transition-colors">
                  Never Arrived / No-show
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">
                  Person booked but never showed up
                </p>
              </div>
            </div>
          </button>

          {/* Option 3: Booking Error */}
          <button
            onClick={() => handleChoice(false, 'booking_error')}
            className="w-full text-left p-3 sm:p-4 bg-gradient-to-br from-red-600/20 to-red-700/10 hover:from-red-600/30 hover:to-red-700/20 border border-red-500/30 hover:border-red-500/50 rounded-lg sm:rounded-xl transition-all group active:scale-[0.98]"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-red-300 transition-colors">
                  Booking Error
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">
                  This was booked by mistake - they never actually stayed
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-2 sm:py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors active:scale-[0.98]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
