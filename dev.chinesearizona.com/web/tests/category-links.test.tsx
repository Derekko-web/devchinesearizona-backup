import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { getDirectoryFilterOptions } from '@/lib/directory';
import { siteProfiles } from '@/lib/site-config';

const pathname = vi.hoisted(() => ({ value: '/news' }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// English links may or may not carry the /en prefix (#443); either is the same page.
const en = (path: string) => new RegExp(`href="(?:/en)?${path.replace(/[?]/g, '\\?')}"`);

describe('footer links to professional category pages', () => {
  it('links every English page to the paying categories', async () => {
    pathname.value = '/news/some-story';
    const Footer = (await import('@/components/Footer')).default;

    const html = renderToStaticMarkup(<Footer site={siteProfiles.arizona} />);

    expect(html).toContain('Find a professional');
    for (const slug of ['real-estate', 'legal-finance', 'medical', 'education', 'home-services']) {
      expect(html).toMatch(en(`/business/category/${slug}`));
    }
    expect(html).toMatch(/>Realtors</);
  });

  it('uses Chinese labels and /zh links on Chinese pages', async () => {
    pathname.value = '/zh/news';
    vi.resetModules();
    const Footer = (await import('@/components/Footer')).default;

    const html = renderToStaticMarkup(<Footer site={siteProfiles.arizona} />);

    expect(html).toContain('找專業服務');
    expect(html).toContain('href="/zh/business/category/medical"');
    expect(html).toContain('>律師與會計師<');
  });

  it('only links categories a city site offers, and none on a site without live listings', async () => {
    pathname.value = '/';
    vi.resetModules();
    const Footer = (await import('@/components/Footer')).default;

    const austin = renderToStaticMarkup(<Footer site={siteProfiles.austin} />);
    expect(austin).toMatch(en('/business/category/real-estate'));
    expect(austin).not.toContain('/business/category/home-services');

    const noData = renderToStaticMarkup(
      <Footer
        site={{
          ...siteProfiles.arizona,
          directory: {
            ...siteProfiles.arizona.directory,
            listingSource: { ...siteProfiles.arizona.directory.listingSource, state: 'required' },
          },
        }}
      />
    );
    expect(noData).not.toContain('Find a professional');
  });
});

describe('directory quick category links', () => {
  it('counts listings per category in the filter options', async () => {
    const options = await getDirectoryFilterOptions(siteProfiles.arizona);

    expect(options.categoryCounts.dining).toBeGreaterThanOrEqual(3);
    expect(Object.values(options.categoryCounts).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
  });

  it('sends quick categories with enough listings to their landing page, others to the filter', async () => {
    pathname.value = '/business';
    vi.resetModules();
    const [{ DirectoryPageView }, { categoryCounts }] = await Promise.all([
      import('@/views/directory-page'),
      getDirectoryFilterOptions(siteProfiles.arizona),
    ]);

    const html = renderToStaticMarkup(
      await DirectoryPageView({ locale: 'en', searchParams: {}, site: siteProfiles.arizona })
    );

    for (const slug of ['dining', 'real-estate', 'medical', 'education', 'local-services']) {
      if ((categoryCounts[slug] ?? 0) >= 3) {
        expect(html).toMatch(en(`/business/category/${slug}`));
      } else {
        expect(html).toMatch(en(`/business?category=${slug}`));
      }
    }
    expect(html).toMatch(en('/business/category/dining'));
  });
});
