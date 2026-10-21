'use client';

import Link from 'next/link';

/**
 * Breadcrumb component for hierarchical navigation
 * Shows: Home > Location > Tent > Block
 * Each segment is clickable to navigate back
 */
export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="mb-6">
      <ol className="flex items-center flex-wrap gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isLast ? (
                <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-200 font-semibold text-sm">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/40 border border-gray-700/50 text-gray-300 hover:bg-purple-500/10 hover:border-purple-400/30 hover:text-purple-200 font-medium text-sm transition-all duration-200"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
