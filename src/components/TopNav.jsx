"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getMe, logout } from '@/lib/api';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMe();
        setUser(res.user || null);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname]); // Re-fetch when pathname changes (e.g., after login redirect)

  const handleLogout = async () => {
    try {
      await logout();
      setOpen(false);
      router.push('/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isLocationUser = user?.role === 'location_user';

  // Hide nav on the login page
  if (pathname === '/login') return null;

  return (
    <nav className="text-sm">
      {/* Hamburger button */}
      <button
        aria-label="Open menu"
        className="inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
        onClick={() => setOpen(true)}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40" aria-hidden="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Side drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 h-full w-72 max-w-[85vw] bg-gray-900/95 backdrop-blur border-l border-white/10 transform transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="text-base font-semibold text-white">Menu</div>
          <button
            aria-label="Close menu"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">{!loading && (
            <>
            <li>
              <Link onClick={() => setOpen(false)} href="/" className="block px-3 py-2 rounded-md text-gray-200 hover:bg-white/10 hover:text-white transition-colors">
                Dashboard
              </Link>
            </li>
            {(isAdmin || isLocationUser) && (
              <>
                <li>
                  <Link onClick={() => setOpen(false)} href="/admin/confirm" className="block px-3 py-2 rounded-md text-gray-200 hover:bg-white/10 hover:text-white transition-colors">
                    Search & Confirm
                  </Link>
                </li>
                <li>
                  <Link onClick={() => setOpen(false)} href="/admin/edit" className="block px-3 py-2 rounded-md text-gray-200 hover:bg-white/10 hover:text-white transition-colors">
                    Edit
                  </Link>
                </li>
                <li>
                  <Link onClick={() => setOpen(false)} href="/admin/reserved" className="block px-3 py-2 rounded-md text-gray-200 hover:bg-white/10 hover:text-white transition-colors">
                    Active Reservations
                  </Link>
                </li>
                <li>
                  <Link onClick={() => setOpen(false)} href="/admin/departures" className="block px-3 py-2 rounded-md text-gray-200 hover:bg-white/10 hover:text-white transition-colors">
                    Departures
                  </Link>
                </li>
              </>
            )}
            <li className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </li>
            </>
          )}
          </ul>
        </div>

        {/* User info at bottom */}
        {!loading && user && (
          <div className="flex-shrink-0 p-4 border-t border-white/10 bg-gray-900/50">
            <div className="text-gray-400 text-xs">
              Signed in{user.username ? ` as ${user.username}` : ''}
              {isAdmin && <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-medium">ADMIN</span>}
              {isLocationUser && <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-[10px] font-medium">LOCATION</span>}
            </div>
          </div>
        )}
      </div>
    </nav>
  );

}
