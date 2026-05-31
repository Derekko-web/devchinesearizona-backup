import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    priority: _priority,
    ...props
  }: {
    alt: string;
    src: string | { src?: string };
    fill?: boolean;
    priority?: boolean;
    [key: string]: unknown;
  }) => {
    void _fill;
    void _priority;
    const resolvedSrc = typeof src === 'string' ? src : src.src ?? '';

    return (
      // The mock intentionally renders a plain img so server-side markup tests stay dependency-light.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={resolvedSrc} {...props} />
    );
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/business/r-g-lounge-san-francisco',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signOut: vi.fn(async () => null),
  }),
}));

describe('directory UI', () => {
  it('renders the connected SF Bay directory instead of the missing-data placeholder', async () => {
    const [{ DirectoryPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const element = await DirectoryPageView({
      locale: 'en',
      searchParams: {},
      site: siteProfiles['sf-bay'],
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('R&amp;G Lounge');
    expect(html).toContain('Asian Health Services');
    expect(html).toContain('/en/add-business');
    expect(html).not.toContain('directory data is not connected yet');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('ChineseArizona listings');
    expect(html).not.toContain('Phoenix');
    expect(html).not.toContain('Chandler');
  });

  it('uses SF Bay values in directory homepage JSON-LD when rendered as a homepage section', async () => {
    const [{ DirectoryPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const element = await DirectoryPageView({
      locale: 'en',
      searchParams: {},
      isHomepage: true,
      site: siteProfiles['sf-bay'],
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('ChineseSFBay');
    expect(html).toContain('https://chinesesfbay.com/en/business?q={search_term_string}');
    expect(html).not.toContain('ChineseArizona');
    expect(html).not.toContain('https://chinesearizona.com');
  });

  it('uses the SF Bay site region on SF Bay business detail pages', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const element = await BusinessDetailPageView({
      locale: 'en',
      slug: 'r-g-lounge-san-francisco',
      site: siteProfiles['sf-bay'],
    });
    const html = renderToStaticMarkup(element);

    expect(element).not.toBeNull();
    expect(html).toContain('San Francisco, CA');
    expect(html).toContain('SAN FRANCISCO, CA');
    expect(html).toContain('https://chinesesfbay.com/en/business/r-g-lounge-san-francisco');
    expect(html).toContain('"addressRegion":"CA"');
    expect(html).not.toContain('https://chinesearizona.com/en/business/r-g-lounge-san-francisco');
    expect(html).not.toContain('San Francisco, AZ');
    expect(html).not.toContain('SAN FRANCISCO, ARIZONA');
    expect(html).not.toContain('"addressRegion":"AZ"');
  });
});
