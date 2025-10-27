'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMe } from '@/lib/api';

export default function TopNav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMe();
        setUser(res.user || null);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  const isAdmin = user?.role === 'admin';

  if (!user) {
    return null; // Don't show nav until user is loaded
  }

  return (
    <nav className="text-sm">
      <ul className="flex items-center gap-2">
        <li><Link className="px-3 py-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" href="/">Dashboard</Link></li>
        {isAdmin && (
          <>
            <li><Link className="px-3 py-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" href="/admin/confirm">Search & Confirm</Link></li>
            <li><Link className="px-3 py-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" href="/admin/edit">Edit</Link></li>
            <li><Link className="px-3 py-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" href="/admin/reserved">Active Reservations</Link></li>
            <li><Link className="px-3 py-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" href="/admin/departures">Departures</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}
