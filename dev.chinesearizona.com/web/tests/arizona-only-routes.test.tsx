import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const NEXT_NOT_FOUND = 'NEXT_NOT_FOUND';

function mockRequestHost(host: string) {
  vi.doMock('next/headers', () => ({
    headers: async () => new Headers({ host }),
    cookies: async () => ({
      get: () => undefined,
      set: () => undefined,
    }),
  }));

  vi.doMock('next/navigation', () => ({
    notFound: () => {
      throw new Error(NEXT_NOT_FOUND);
    },
    permanentRedirect: (url: string) => {
      const error = new Error('NEXT_REDIRECT');
      Object.assign(error, { url });
      throw error;
    },
  }));

  vi.doMock('next/link', () => ({
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

  vi.doMock('next/image', () => ({
    default: ({
      alt,
      src,
      ...props
    }: {
      alt: string;
      src: string;
      [key: string]: unknown;
    }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={String(src)} {...props} />
    ),
  }));
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('next/headers');
  vi.doUnmock('next/navigation');
  vi.doUnmock('next/link');
  vi.doUnmock('next/image');
  vi.restoreAllMocks();
});

describe('Arizona-only route guards', () => {
  it('identifies Arizona-only route families', async () => {
    const {
      canServeArizonaOnlyContent,
      isArizonaOnlyRouteSegments,
    } = await import('@/lib/arizona-only-routes');
    const { defaultSiteProfile, siteProfiles } = await import('@/lib/site-config');

    expect(canServeArizonaOnlyContent(defaultSiteProfile)).toBe(true);
    expect(canServeArizonaOnlyContent(siteProfiles.austin)).toBe(false);
    expect(isArizonaOnlyRouteSegments(['relocation-guide'])).toBe(true);
    expect(isArizonaOnlyRouteSegments(['hidden-arizona', 'places', 'the-wave'])).toBe(true);
    expect(isArizonaOnlyRouteSegments(['discover-arizona', 'restaurants'])).toBe(true);
    expect(isArizonaOnlyRouteSegments(['community', 'events', 'phoenix-wushu-nationals-2026'])).toBe(true);
    expect(isArizonaOnlyRouteSegments(['community', 'news'])).toBe(true);
    expect(isArizonaOnlyRouteSegments(['business'])).toBe(false);
    expect(isArizonaOnlyRouteSegments(['community'])).toBe(false);
  });

  it('blocks localized Arizona-only routes for Austin hosts', async () => {
    vi.resetModules();
    mockRequestHost('www.chineseaustin.com');

    const localizedPage = await import('@/app/[locale]/[[...segments]]/page');
    const routeSegments = [
      ['relocation-guide'],
      ['hidden-arizona'],
      ['hidden-arizona', 'places', 'the-wave'],
      ['discover-arizona'],
      ['discover-arizona', 'restaurants'],
      ['community', 'events', 'phoenix-wushu-nationals-2026'],
      ['community', 'board', 'sample-post'],
      ['community', 'classifieds', 'sample-classified'],
      ['community', 'news'],
      ['community', 'news', 'sample-article'],
    ];

    for (const segments of routeSegments) {
      const props = {
        params: Promise.resolve({ locale: 'en', segments }),
        searchParams: Promise.resolve({}),
      };

      const metadata = await localizedPage.generateMetadata(props);
      expect(metadata.robots).toEqual({ index: false, follow: false });
      await expect(localizedPage.default(props)).rejects.toThrow(NEXT_NOT_FOUND);
    }
  });

  it('blocks unlocalized Arizona-only route files for Austin hosts', async () => {
    vi.resetModules();
    mockRequestHost('www.chineseaustin.com');

    const relocationPage = await import('@/app/relocation-guide/page');
    const hiddenArizonaPage = await import('@/app/hidden-arizona/page');
    const discoverArizonaPage = await import('@/app/discover-arizona/page');
    const communityEventPage = await import('@/app/community/events/[slug]/page');
    const communityNewsPage = await import('@/app/community/news/page');

    const relocationMetadata = await relocationPage.generateMetadata();
    expect(relocationMetadata.robots).toEqual({ index: false, follow: false });

    await expect(relocationPage.default()).rejects.toThrow(NEXT_NOT_FOUND);
    await expect(hiddenArizonaPage.default({ searchParams: Promise.resolve({}) })).rejects.toThrow(NEXT_NOT_FOUND);
    await expect(discoverArizonaPage.default()).rejects.toThrow(NEXT_NOT_FOUND);
    await expect(
      communityEventPage.default({
        params: Promise.resolve({ slug: 'phoenix-wushu-nationals-2026' }),
      })
    ).rejects.toThrow(NEXT_NOT_FOUND);
    await expect(communityNewsPage.default({ searchParams: Promise.resolve({}) })).rejects.toThrow(NEXT_NOT_FOUND);
  });
});
