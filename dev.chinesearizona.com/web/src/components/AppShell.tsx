'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
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

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <>
      <Navbar />
      <main lang={lang} className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </>
  );
}
