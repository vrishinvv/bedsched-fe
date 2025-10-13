import './globals.css';
export const metadata = { title: 'Tent Bed Allocator' };

export default function RootLayout({ children }) {
return (
  <html lang="en">
    <body className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl p-4">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">Tent Bed Allocator</h1>
          <nav className="text-sm text-gray-400">Internal tool</nav>
        </header>
        {children}
      </div>
    </body>
  </html>
);
}