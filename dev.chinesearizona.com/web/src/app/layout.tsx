import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { getAdSenseClientId } from '@/lib/adsense';
import { buildSiteVerification, siteDescription, siteName, siteUrl } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansTC = Noto_Sans_TC({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-noto-sans-tc' });
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['500', '600', '700'],
});
const adSenseClientId = getAdSenseClientId();
const iconVersion = '20260423b';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteName,
  description: siteDescription,
  verification: buildSiteVerification(),
  manifest: `/site.webmanifest?v=${iconVersion}`,
  icons: {
    icon: [
      { url: `/favicon-32x32.png?v=${iconVersion}`, type: 'image/png', sizes: '32x32' },
      { url: `/favicon-16x16.png?v=${iconVersion}`, type: 'image/png', sizes: '16x16' },
      { url: `/favicon.ico?v=${iconVersion}`, type: 'image/x-icon' },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${iconVersion}`, sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: `/favicon.ico?v=${iconVersion}`, type: 'image/x-icon' }],
  },
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
      className={`notranslate ${inter.variable} ${notoSansTC.variable} ${cormorantGaramond.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        {adSenseClientId ? (
          <meta name="google-adsense-account" content={adSenseClientId} />
        ) : null}
        {adSenseClientId ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClientId}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body
        className="flex min-h-screen flex-col bg-[#f5eee2] font-sans text-slate-800 antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
