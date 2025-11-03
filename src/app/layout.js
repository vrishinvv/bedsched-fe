import './globals.css';
import TopNav from '@/components/TopNav';
import AuthGate from '@/components/AuthGate';
import Image from 'next/image';

export const metadata = { title: 'Tent Bed Allocator' };

export default function RootLayout({ children }) {
return (
  <html lang="en">
    <body className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl p-3 sm:p-4">
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          {/* Left Logo */}
          <div className="flex-shrink-0">
            <Image 
              src="/logo-left.png" 
              alt="Sri Sathya Sai" 
              width={60} 
              height={60}
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain"
              priority
            />
          </div>

          {/* Center Title and Nav */}
          <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between gap-2 sm:gap-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white text-center sm:text-left">Tent Bed Allocator</h1>
            <TopNav />
          </div>

          {/* Right Logo */}
          <div className="flex-shrink-0">
            <Image 
              src="/logo-right.png" 
              alt="100 Years Celebration" 
              width={60} 
              height={60}
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain"
              priority
            />
          </div>
        </header>
        <AuthGate>
          {children}
        </AuthGate>
      </div>
    </body>
  </html>
);
}