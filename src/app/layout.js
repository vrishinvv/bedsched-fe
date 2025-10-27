import './globals.css';
import TopNav from '@/components/TopNav';
import AuthGate from '@/components/AuthGate';
export const metadata = { title: 'Tent Bed Allocator' };

export default function RootLayout({ children }) {
return (
  <html lang="en">
    <body className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl p-3 sm:p-4">
        <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Tent Bed Allocator</h1>
          <TopNav />
        </header>
        <AuthGate>
          {children}
        </AuthGate>
      </div>
    </body>
  </html>
);
}