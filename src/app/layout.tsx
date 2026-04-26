import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';
import ChatWidget from '@/components/ChatWidget';

export const metadata: Metadata = {
  title: 'Strapped Admin',
  description: 'Internal admin dashboard for Strapped Indonesia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          <div className="app-layout">
            <Sidebar />
            {children}
            <ChatWidget />
          </div>
        </Providers>
      </body>
    </html>
  );
}
