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
