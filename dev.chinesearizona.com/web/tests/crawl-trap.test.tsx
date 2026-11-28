import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildRobots } from '@/app/robots';
import { getHiddenArizonaFilterOptions } from '@/lib/hidden-arizona';
import { directoryMetadata, hiddenArizonaMetadata } from '@/lib/page-metadata';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, fill: _fill, ...props }: { alt: string; src: string; fill?: boolean; [key: string]: unknown }) => {
    void _fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={String(src)} {...props} />;
  },
}));

function hubLinkQueries(html: string): URLSearchParams[] {
  return Array.from(html.matchAll(/href="(?:\/en|\/zh)?\/hidden-arizona\?([^"#]*)"/g)).map(
    (match) => new URLSearchParams(match[1].replace(/&amp;/g, '&'))
  );
}

describe('Hidden Arizona filter links', () => {
  it('never combine filters, even on a page that already has every filter set', async () => {
    const { cities, tags } = getHiddenArizonaFilterOptions();
    const { HiddenArizonaHubPageView } = await import('@/views/hidden-arizona');

    const html = renderToStaticMarkup(
      await HiddenArizonaHubPageView({
        locale: 'en',
        searchParams: { kind: 'place', city: cities[0], tag: tags[0], view: 'map' },
      })
    );
    const queries = hubLinkQueries(html);

    expect(queries.length).toBeGreaterThan(10);
    for (const query of queries) {
      const filterKeys = ['kind', 'city', 'tag', 'view'].filter((key) => query.has(key));
      // A tag link carries only the tag; a city or map link only adds kind=place.
      if (query.has('tag')) {
        expect(filterKeys).toEqual(['tag']);
      }
      expect(query.has('city') && query.has('view')).toBe(false);
      expect(filterKeys.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('faceted pages stay out of search', () => {
  it('noindexes filtered Hidden Arizona views but keeps the hub indexable', () => {
    expect(hiddenArizonaMetadata('en').robots).toBeUndefined();
    for (const query of [{ tag: 'ghost-towns' }, { kind: 'place' }, { city: 'Phoenix' }, { view: 'map' }, { q: 'mine' }]) {
      expect(hiddenArizonaMetadata('zh', query).robots).toMatchObject({ index: false });
    }
  });

  it('noindexes filtered directory views but keeps plain pagination indexable', () => {
    expect(directoryMetadata('en', '/business', { category: 'medical' }).robots).toMatchObject({ index: false });
    expect(directoryMetadata('en', '/business', { language: 'Mandarin' }).robots).toMatchObject({ index: false });
    expect(directoryMetadata('en', '/business', { sort: 'rating' }).robots).toMatchObject({ index: false });
    expect(directoryMetadata('en', '/business', { page: '2' }).robots).toBeUndefined();
    expect(directoryMetadata('en', '/business').robots).toBeUndefined();
  });

  it('tells crawlers not to fetch filter and search combinations', () => {
    const rules = buildRobots().rules;
    const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow;

    expect(disallow).toEqual(
      expect.arrayContaining(['/*?tag=', '/*&tag=', '/*?city=', '/*&city=', '/*?kind=', '/*?view=', '/*?q=', '/*&category='])
    );
    expect(disallow).not.toContain('/*?page=');
  });
});
