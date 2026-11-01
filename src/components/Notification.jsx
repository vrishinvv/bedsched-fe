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

  const variants = {
    success: {
      title: 'Success!',
      surface: 'bg-emerald-900/90 border-emerald-500/30 text-emerald-100',
      overlay: 'from-emerald-400/10',
      iconSurface: 'bg-emerald-500/20',
      titleText: 'text-emerald-200',
      bodyText: 'text-emerald-300',
      close: 'hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200',
    },
    warning: {
      title: 'Saved with warning',
      surface: 'bg-amber-950/90 border-amber-500/40 text-amber-100',
      overlay: 'from-amber-400/10',
      iconSurface: 'bg-amber-500/20',
      titleText: 'text-amber-200',
      bodyText: 'text-amber-300',
      close: 'hover:bg-amber-500/20 text-amber-300 hover:text-amber-200',
    },
    info: {
      title: 'Updated',
      surface: 'bg-blue-950/90 border-blue-500/40 text-blue-100',
      overlay: 'from-blue-400/10',
      iconSurface: 'bg-blue-500/20',
      titleText: 'text-blue-200',
      bodyText: 'text-blue-300',
      close: 'hover:bg-blue-500/20 text-blue-300 hover:text-blue-200',
    },
    error: {
      title: 'Error',
      surface: 'bg-red-900/90 border-red-500/30 text-red-100',
      overlay: 'from-red-400/10',
      iconSurface: 'bg-red-500/20',
      titleText: 'text-red-200',
      bodyText: 'text-red-300',
      close: 'hover:bg-red-500/20 text-red-300 hover:text-red-200',
    },
  };
  const type = variants[notification.type] ? notification.type : 'error';
  const variant = variants[type];
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`
        relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-sm border-2 max-w-sm
        ${variant.surface}
      `}>
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${variant.overlay} to-transparent pointer-events-none`} />
        
        <div className="relative flex items-start gap-3">
          {/* Icon */}
          <div className={`
            flex-shrink-0 p-2 rounded-xl
            ${variant.iconSurface}
          `}>
            {type === 'success' ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : type === 'warning' ? (
              <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 3.8 2.5 17.3A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.7L13.7 3.8a2 2 0 0 0-3.4 0Z" />
              </svg>
            ) : type === 'info' ? (
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-sm mb-1 ${variant.titleText}`}>
              {variant.title}
            </div>
            <div className={`text-sm ${variant.bodyText}`}>
              {notification.message}
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              flex-shrink-0 p-1 rounded-lg transition-colors
              ${variant.close}
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
