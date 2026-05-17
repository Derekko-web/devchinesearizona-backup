'use client';

import { useEffect, useRef } from 'react';

type DirectoryAdCardTrackerProps = {
  businessId: string;
  campaignId: string;
  children: React.ReactNode;
  pagePath: string;
};

const SESSION_STORAGE_KEY = 'directory-ad-session-id';

function storageKey(eventType: 'impression' | 'click', campaignId: string, pagePath: string) {
  return `directory-ad:${eventType}:${campaignId}:${pagePath}`;
}

function readSessionId() {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = Math.random().toString(36).slice(2, 12);
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

function hasRecorded(eventType: 'impression' | 'click', campaignId: string, pagePath: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(storageKey(eventType, campaignId, pagePath)) === '1';
}

function markRecorded(eventType: 'impression' | 'click', campaignId: string, pagePath: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(storageKey(eventType, campaignId, pagePath), '1');
}

export function DirectoryAdCardTracker({
  businessId,
  campaignId,
  children,
  pagePath,
}: DirectoryAdCardTrackerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sessionId = readSessionId();

    if (!sessionId || hasRecorded('impression', campaignId, pagePath)) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const recordImpression = () => {
      if (hasRecorded('impression', campaignId, pagePath)) {
        return;
      }

      markRecorded('impression', campaignId, pagePath);
      void fetch('/api/directory/ads/events', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          campaignId,
          eventType: 'impression',
          pagePath,
          sessionId,
        }),
      });
    };

    if (!('IntersectionObserver' in window)) {
      recordImpression();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        recordImpression();
        observer.disconnect();
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [businessId, campaignId, pagePath]);

  async function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('[data-directory-ad-click="true"]')) {
      return;
    }

    if (hasRecorded('click', campaignId, pagePath)) {
      return;
    }

    const sessionId = readSessionId();
    if (!sessionId) {
      return;
    }

    markRecorded('click', campaignId, pagePath);
    void fetch('/api/directory/ads/events', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        campaignId,
        eventType: 'click',
        pagePath,
        sessionId,
      }),
    });
  }

  return (
    <div ref={containerRef} onClickCapture={handleClickCapture}>
      {children}
    </div>
  );
}
