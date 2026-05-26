import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { getAdSenseClientId } from '@/lib/adsense';
import { buildSiteVerification } from '@/lib/seo';
import { getCurrentSiteProfile } from '@/lib/site-config.server';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansTC = Noto_Sans_TC({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-noto-sans-tc' });
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['500', '600', '700'],
});
const adSenseClientId = getAdSenseClientId();
const iconVersion = '20260423b';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getCurrentSiteProfile();

  return {
    metadataBase: new URL(site.url),
    title: site.brandName,
    description: site.description.en,
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
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getCurrentSiteProfile();

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
          <AppShell site={site}>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
