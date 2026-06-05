import fs from 'node:fs';
import path from 'node:path';

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
const routerRefreshMock = vi.fn();
const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalShopFlag = env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;

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

vi.mock('next/navigation', () => ({
  usePathname: () => '/zh/community',
  useRouter: () => ({ refresh: routerRefreshMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/LocaleSwitcher', () => ({
  LocaleSwitcher: ({ currentLocale }: { currentLocale: string }) => (
    <span data-locale={currentLocale}>locale</span>
  ),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: useAuthMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({
    user: null,
    signOut: vi.fn(async () => null),
  });
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = originalNodeEnv;
  }

  if (originalShopFlag === undefined) {
    delete env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;
  } else {
    env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED = originalShopFlag;
  }
});

describe('public chrome', () => {
  it('uses city-specific generated images instead of starter placeholders for launched non-Arizona city home pages', async () => {
    const { siteProfiles } = await import('@/lib/site-config');
    const starterPlaceholderPaths = new Set(['/window.svg', '/globe.svg']);
    const launchedCityProfiles = [siteProfiles.austin, siteProfiles['los-angeles'], siteProfiles['sf-bay']];

    for (const site of launchedCityProfiles) {
      const imagePaths = [
        site.home.heroImageUrl,
        site.home.heroForegroundImageUrl,
        site.home.mapImageUrl,
        site.home.relocationImageUrl,
        ...site.home.featuredCards.map((card) => card.imageUrl),
        ...site.home.neighborhoods.map((neighborhood) => neighborhood.imageUrl),
      ];

      expect(imagePaths, site.key).not.toContain(Array.from(starterPlaceholderPaths)[0]);
      expect(imagePaths, site.key).not.toContain(Array.from(starterPlaceholderPaths)[1]);

      for (const imagePath of imagePaths) {
        expect(imagePath, `${site.key} ${imagePath}`).toMatch(/^\/city-site-images\/.+\.webp$/);
        expect(fs.existsSync(path.join(process.cwd(), 'public', imagePath.slice(1))), imagePath).toBe(true);
      }
    }

    expect(siteProfiles.arizona.home.heroImageUrl).toBe('/directory-ai-replacements/old-town-taste-tempe-v2.webp');
    expect(siteProfiles.arizona.domains).toContain('dev.chinesearizona.com');
  });

  it('does not expose protected routes to signed-out visitors', async () => {
    const Navbar = (await import('@/components/Navbar')).default;
    const Footer = (await import('@/components/Footer')).default;

    const navbarHtml = renderToStaticMarkup(<Navbar />);
    const footerHtml = renderToStaticMarkup(<Footer />);

    expect(navbarHtml).toContain('/zh/shop');
    expect(navbarHtml).toContain('/zh/business');
    expect(navbarHtml).toContain('商家');
    expect(navbarHtml).toContain('Business');
    expect(navbarHtml).toContain('/zh/news');
    expect(navbarHtml).toContain('亞利桑那新聞');
    expect(navbarHtml).toContain('/zh/relocation-guide');
    expect(navbarHtml).not.toContain('/zh/directory');
    expect(navbarHtml).not.toContain('/zh/discover-arizona');
    expect(navbarHtml).not.toContain('/zh/community#events');

    expect(navbarHtml).not.toContain('/dashboard');
    expect(navbarHtml).not.toContain('/admin');
    expect(navbarHtml).not.toContain('/shop/sell');

    expect(footerHtml).not.toContain('/dashboard');
    expect(footerHtml).not.toContain('/admin');
    expect(footerHtml).not.toContain('/shop/sell');
    expect(footerHtml).toContain('/zh/privacy');
    expect(footerHtml).toContain('/zh/contact');
    expect(footerHtml).toContain('/zh/editorial-policy');
  });

  it('hides Arizona-only nav links for placeholder city profiles', async () => {
    const [{ siteProfiles }, { default: Navbar }] = await Promise.all([
      import('@/lib/site-config'),
      import('@/components/Navbar'),
    ]);

    const navbarHtml = renderToStaticMarkup(<Navbar site={siteProfiles.austin} />);

    expect(navbarHtml).toContain('/zh/business');
    expect(navbarHtml).toContain('/zh/community');
    expect(navbarHtml).toContain('/zh/news');
    expect(navbarHtml).toContain('奥斯汀新聞');
    expect(navbarHtml).not.toContain('/zh/arizona-news');
    expect(navbarHtml).not.toContain('/zh/local-news');
    expect(navbarHtml).not.toContain('/zh/relocation-guide');
  });

  it('uses the SF Bay news route for the SF Bay profile', async () => {
    const [{ siteProfiles }, { default: Navbar }] = await Promise.all([
      import('@/lib/site-config'),
      import('@/components/Navbar'),
    ]);

    const navbarHtml = renderToStaticMarkup(<Navbar site={siteProfiles['sf-bay']} />);

    expect(navbarHtml).toContain('/zh/news');
    expect(navbarHtml).toContain('灣區新聞');
    expect(navbarHtml).not.toContain('/zh/arizona-news');
    expect(navbarHtml).not.toContain('/zh/local-news');
    expect(navbarHtml).not.toContain('/zh/relocation-guide');
  });

  it('keeps relocation as the last top-level navbar item', () => {
    const navbarSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Navbar.tsx'), 'utf-8');

    expect(navbarSource).not.toContain("path: '/discover-arizona'");
    expect(navbarSource).not.toContain("hash: 'events'");
    expect(navbarSource.lastIndexOf("path: '/relocation-guide'")).toBeGreaterThan(
      navbarSource.lastIndexOf("path: '/shop'")
    );
  });

  it('hides shop from public chrome in production until launch is enabled', async () => {
    env.NODE_ENV = 'production';
    delete env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;
    vi.resetModules();

    const Navbar = (await import('@/components/Navbar')).default;
    const Footer = (await import('@/components/Footer')).default;

    const navbarHtml = renderToStaticMarkup(<Navbar />);
    const footerHtml = renderToStaticMarkup(<Footer />);

    expect(navbarHtml).not.toContain('/zh/shop');
    expect(footerHtml).not.toContain('/zh/shop');
  });
});
