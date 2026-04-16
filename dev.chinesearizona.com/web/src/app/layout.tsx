import type { Metadata } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { siteDescription, siteName, siteUrl } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansTC = Noto_Sans_TC({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-noto-sans-tc' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteName,
  description: siteDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      translate="no"
      className={`notranslate ${inter.variable} ${notoSansTC.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />
        <meta name="google" content="notranslate" />
        <Script id="document-lang" strategy="beforeInteractive">
          {`document.documentElement.lang = /^\\/zh(?:\\/|$)/.test(window.location.pathname) ? 'zh-Hant' : 'en';`}
        </Script>
      </head>
      <body className="antialiased font-sans flex flex-col min-h-screen bg-slate-50 text-slate-800" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
