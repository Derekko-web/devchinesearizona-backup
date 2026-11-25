import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TrustBadges } from '@/components/TrustBadges';

describe('TrustBadges', () => {
  // The highlighted listings are hand-picked, not ranked by popularity data,
  // so the badge must not claim they are the "most popular".
  it('labels hand-picked listings as Featured, not Most Popular', () => {
    const en = renderToStaticMarkup(<TrustBadges locale="en" mostPopular />);
    const zh = renderToStaticMarkup(<TrustBadges locale="zh" mostPopular />);

    expect(en).toContain('Featured');
    expect(en).not.toContain('Most Popular');
    expect(zh).toContain('精選');
    expect(zh).not.toContain('人氣熱門');
  });
});
