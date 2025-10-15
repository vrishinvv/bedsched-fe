'use client';
import { useEffect } from 'react';

export default function Notification({ notification, onClose }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-dismiss after 4 seconds
      
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`
        relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-sm border-2 max-w-sm
        ${isSuccess 
          ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-100' 
          : 'bg-red-900/90 border-red-500/30 text-red-100'
        }
      `}>
        {/* Gradient overlay */}
        <div className={`absolute inset-0 ${isSuccess ? 'bg-gradient-to-br from-emerald-400/10 to-transparent' : 'bg-gradient-to-br from-red-400/10 to-transparent'} pointer-events-none`} />
        
        <div className="relative flex items-start gap-3">
          {/* Icon */}
          <div className={`
            flex-shrink-0 p-2 rounded-xl
            ${isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'}
          `}>
            {isSuccess ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm ${isSuccess ? 'text-emerald-200' : 'text-red-200'}`}>
              {isSuccess ? 'Success!' : 'Error'}
            </h4>
            <p className={`text-sm mt-1 ${isSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
              {notification.message}
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              flex-shrink-0 p-1 rounded-lg transition-colors
              ${isSuccess 
                ? 'hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200' 
                : 'hover:bg-red-500/20 text-red-300 hover:text-red-200'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
