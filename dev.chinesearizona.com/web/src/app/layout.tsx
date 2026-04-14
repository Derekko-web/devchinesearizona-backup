import type { Metadata } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansTC = Noto_Sans_TC({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-noto-sans-tc' });

export const metadata: Metadata = {
  title: 'Chinese Arizona - Your Modern Trusted Guide',
  description: 'A modern trusted guide for the Chinese community in Arizona',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansTC.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans flex flex-col min-h-screen bg-slate-50 text-slate-800" suppressHydrationWarning>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
