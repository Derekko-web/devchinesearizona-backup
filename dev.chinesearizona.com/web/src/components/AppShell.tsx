'use client';

import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { localeLangAttribute } from '@/lib/i18n';
import { localeFromPath } from '@/lib/routing';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const lang = localeLangAttribute(locale);
  const isMissionControl = pathname === '/mission-control' || pathname.startsWith('/mission-control/');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (isMissionControl) {
    return (
      <main lang={lang} className="flex flex-1 flex-col">
        {children}
      </main>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <main lang={lang} className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </>
  );
}
