'use client';

import { useSyncExternalStore } from 'react';

import type { Locale } from '@/lib/types';

export function formatDateTimeInTimeZone(date: string, locale: Locale, timeZone: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(parsed);
}

type LocalDateTimeProps = {
  date: string;
  locale: Locale;
  className?: string;
};

function subscribeToTimeZone() {
  return () => {};
}

function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function LocalDateTime({ date, locale, className }: LocalDateTimeProps) {
  const timeZone = useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, () => 'UTC');
  const formatted = formatDateTimeInTimeZone(date, locale, timeZone);

  return (
    <time dateTime={date} className={className} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
