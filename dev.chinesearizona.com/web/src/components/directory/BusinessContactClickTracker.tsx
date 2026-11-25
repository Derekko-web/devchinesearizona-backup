'use client';

import { useEffect } from 'react';

const ENDPOINT = '/api/directory/contact-clicks';
const ACTIONS = new Set(['call', 'website', 'directions']);

// Counts clicks on any element marked data-contact-action="call|website|directions"
// on this listing's page. Renders nothing. Each action is sent once per browser
// tab session; the server also keeps one per visitor per day.
export function BusinessContactClickTracker({ businessSlug }: { businessSlug: string }) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      // Left click, or middle click (open in new tab).
      if (event.type === 'auxclick' && event.button !== 1) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const action = target.closest('[data-contact-action]')?.getAttribute('data-contact-action');
      if (!action || !ACTIONS.has(action)) {
        return;
      }

      const storageKey = `contact-click:${businessSlug}:${action}`;
      try {
        if (window.sessionStorage.getItem(storageKey) === '1') {
          return;
        }
        window.sessionStorage.setItem(storageKey, '1');
      } catch {
        // Storage can be blocked (private mode); the server still de-duplicates.
      }

      const payload = JSON.stringify({ businessSlug, action });
      const queued =
        typeof navigator.sendBeacon === 'function' &&
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
      if (!queued) {
        void fetch(ENDPOINT, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }).catch(() => undefined);
      }
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('auxclick', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('auxclick', handleClick, true);
    };
  }, [businessSlug]);

  return null;
}
