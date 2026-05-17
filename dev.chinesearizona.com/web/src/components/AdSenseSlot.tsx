'use client';

import { useEffect, useRef, useState } from 'react';

import type { AdSensePlacement } from '@/lib/adsense';
import type { Locale } from '@/lib/types';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSenseFillStatus = 'idle' | 'filled' | 'unfilled' | 'unfill-optimized';

function readFillStatus(node: HTMLModElement): AdSenseFillStatus {
  const value = node.getAttribute('data-ad-status');

  if (value === 'filled' || value === 'unfilled' || value === 'unfill-optimized') {
    return value;
  }

  return 'idle';
}

function placementClassName(placement: AdSensePlacement): string {
  return `adsense-slot-${placement}`;
}

export function AdSenseSlot({
  clientId,
  slotId,
  placement,
  locale,
}: {
  clientId: string;
  slotId: string;
  placement: AdSensePlacement;
  locale: Locale;
}) {
  const slotRef = useRef<HTMLModElement | null>(null);
  const [fillStatus, setFillStatus] = useState<AdSenseFillStatus>('idle');
  const className = placementClassName(placement);

  useEffect(() => {
    const node = slotRef.current;
    if (!node) {
      return;
    }

    setFillStatus(readFillStatus(node));

    const observer = new MutationObserver(() => {
      setFillStatus(readFillStatus(node));
    });

    observer.observe(node, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
    });

    if (!node.getAttribute('data-adsbygoogle-status')) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('AdSense slot push failed.', error);
        }
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [clientId, slotId, placement]);

  if (fillStatus === 'unfilled') {
    return null;
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {locale === 'zh' ? '廣告' : 'Advertisement'}
        </span>
        {process.env.NODE_ENV !== 'production' && fillStatus === 'idle' ? (
          <span className="text-xs text-slate-400">
            {locale === 'zh' ? '等待 Google 回應' : 'Waiting for Google'}
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-100/80 px-2 py-3">
        <ins
          ref={slotRef}
          className={`adsbygoogle ${className}`}
          style={{ display: 'block' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
        />
      </div>

      <style jsx>{`
        .${className} {
          width: 300px;
          height: 250px;
          margin: 0 auto;
        }

        @media (min-width: 1280px) {
          .${className} {
            height: 600px;
          }
        }
      `}</style>
    </div>
  );
}
