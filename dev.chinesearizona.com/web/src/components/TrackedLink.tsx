'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventType: string;
  entitySlug?: string;
};

export function TrackedLink({ eventType, entitySlug, onClick, ...props }: TrackedLinkProps) {
  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: eventType,
        entitySlug,
        path: window.location.pathname,
      }),
    });

    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}
