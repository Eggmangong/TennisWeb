import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import ClientProvider from '@/components/ClientProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '网球社区',
  description: '连接网球爱好者的在线平台',
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
          </div>
        </ClientProvider>
      </body>
    </html>
  );
}
