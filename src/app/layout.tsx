import type { Metadata } from 'next';
import './globals.css';
import './marketing.css';
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Strapped Admin',
  description: 'Internal admin dashboard for Strapped Indonesia',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          <div className="app-layout">
            <Sidebar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
