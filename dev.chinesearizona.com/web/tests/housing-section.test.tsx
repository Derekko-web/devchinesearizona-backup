import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { HousingListingsSection } from '@/components/HousingListingsSection';
import { getStaticHousingRegionSnapshots } from '@/lib/housing';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('HousingListingsSection', () => {
  it('renders the Greater Phoenix map and removes the old route-placeholder copy', () => {
    const html = renderToStaticMarkup(
      <HousingListingsSection locale="en" regions={getStaticHousingRegionSnapshots()} />
    );

    expect(html).toContain('Greater Phoenix map');
    expect(html).toContain('Schematic Greater Phoenix map with Chandler selected');
    expect(html).toContain('Phoenix');
    expect(html).toContain('Chandler');
    expect(html).toContain('I-10');
    expect(html).toContain('US 60');
    expect(html).toContain('Static city orientation');
    expect(html).not.toContain('local center');
    expect(html).not.toContain('airport / work');
    expect(html).not.toContain('check by actual drive time');
  });

  it('renders the relocation page with the static housing fallback by default', async () => {
    const previousFlag = process.env.HOUSING_LIVE_LISTINGS_ENABLED;
    delete process.env.HOUSING_LIVE_LISTINGS_ENABLED;

    try {
      const { RelocationGuidePageView } = await import('@/views/site-pages');
      const html = renderToStaticMarkup(await RelocationGuidePageView({ locale: 'en' }));

      expect(html).toContain('Relocation and Newcomer');
      expect(html).toContain('Greater Phoenix map');
      expect(html).toContain('Static city orientation');
      expect(html).toContain('Open full city search');
      expect(html).not.toContain('Live housing listings are temporarily unavailable');
      expect(html).not.toContain('local center');
      expect(html).not.toContain('airport / work');
      expect(html).not.toContain('check by actual drive time');
    } finally {
      if (previousFlag === undefined) {
        delete process.env.HOUSING_LIVE_LISTINGS_ENABLED;
      } else {
        process.env.HOUSING_LIVE_LISTINGS_ENABLED = previousFlag;
      }
    }
  });
});
