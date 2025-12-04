import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import ClientProvider from '@/components/ClientProvider';
import Chatbot from '@/components/Chatbot';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RallyUp',
  description: 'A Tennis Community Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <ClientProvider>
          <div className="min-h-screen bg-gray-100">
            <Header />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            {/* Global AI Assistant */}
            <Chatbot />
          </div>
        </ClientProvider>
      </body>
    </html>
  );
}
