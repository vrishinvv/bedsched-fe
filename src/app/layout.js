import './globals.css';
import TopNav from '@/components/TopNav';
import AuthGate from '@/components/AuthGate';
import Image from 'next/image';

export const metadata = { 
  title: 'Sri Sathya Sai Nivas',
  icons: {
    icon: '/logo-left.png',
  }
};

export default function RootLayout({ children }) {
return (
  <html lang="en">
    <body className="min-h-screen bg-black text-white">
      <div className="min-h-screen flex flex-col">
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 flex-1 flex flex-col">
          <header className="mb-6 sm:mb-8">
            {/* Top Row: Logo, Title, and Menu */}
            <div className="flex items-center justify-between gap-4 pl-4 pr-2 sm:pr-4">
              {/* Left Logo */}
              <div className="flex-shrink-0">
                <Image 
                  src="/logo-left.png" 
                  alt="Sri Sathya Sai" 
                  width={70} 
                  height={70}
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] object-contain drop-shadow-lg"
                  priority
                />
              </div>

              {/* Center: Title Section */}
              <div className="flex-1 text-center space-y-0.5 sm:space-y-1 pt-2 sm:pt-3">
                <div className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent uppercase leading-tight">
                  Sri Sathya Sai Seva Organisations
                </div>
                <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-amber-200/80 leading-tight">
                  Centenary Celebrations of Bhagawan Sri Sathya Sai Baba
                </div>
                <div className="pt-0.5">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                    SRI SATHYA SAI NIVAS
                  </h1>
                </div>
              </div>

              {/* Menu */}
              <div className="flex-shrink-0">
                <TopNav />
              </div>
            </div>
          </header>
          <div className="flex-1 w-full">
            <AuthGate>
              {children}
            </AuthGate>
          </div>
          
          {/* Footer */}
          <footer className="mt-8 sm:mt-12 pt-6 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <Image 
                src="/logo-right.png" 
                alt="100 Years Celebration" 
                width={80} 
                height={80}
                className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity"
                priority
              />
              <div className="text-xs sm:text-sm text-gray-400 text-center">
                <p className="font-medium text-amber-300/70">Centenary Year 2025-2026</p>
                <p className="text-[10px] sm:text-xs mt-1">© Sri Sathya Sai Seva Organisations</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </body>
  </html>
);
}