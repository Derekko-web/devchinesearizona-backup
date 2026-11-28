import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Business } from '@/lib/types';

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

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: ({ entitySlug }: { entitySlug: string }) => <div data-report-issue={entitySlug} />,
}));

function listing(overrides: Partial<Business> = {}): Business {
  return {
    id: 'lotus-kitchen',
    slug: 'lotus-kitchen',
    name: { en: 'Lotus Kitchen', zh: '蓮花小館' },
    categorySlug: 'dining',
    city: 'Chandler',
    region: 'East Valley',
    address: '100 Main St',
    phone: '(480) 555-0100',
    gallery: [],
    shortDescription: { en: 'Noodles and dumplings.', zh: '麵食與水餃。' },
    description: { en: 'Noodles and dumplings.', zh: '麵食與水餃。' },
    services: [],
    languages: ['English'],
    searchAliases: [],
    verified: true,
    bilingual: true,
    newcomerFriendly: false,
    sponsored: false,
    featured: false,
    rating: 4.8,
    reviewCount: 12,
    lastUpdated: '2026-11-01T00:00:00.000Z',
    status: 'live',
    verificationState: 'editor_verified',
    hours: [],
    ...overrides,
  };
}

describe('listing trust rules (#457)', () => {
  it('calls a listing Verified only when an owner has claimed it', async () => {
    const { getListingTrustLevel } = await import('@/lib/listing-trust');

    expect(getListingTrustLevel(listing())).toBe('public_sources');
    // Approving a claim on an editor-imported listing keeps 'editor_verified' and adds the owner.
    expect(getListingTrustLevel(listing({ ownerProfileSlug: 'grace-lin' }))).toBe('owner_verified');
    expect(getListingTrustLevel(listing({ verificationState: 'claimed' }))).toBe('owner_verified');
    expect(getListingTrustLevel(listing({ verificationState: 'unverified' }))).toBe('unverified');
  });

  it('counts only a Chinese spoken language as evidence for Bilingual', async () => {
    const { hasChineseSpokenLanguage } = await import('@/lib/listing-trust');

    expect(hasChineseSpokenLanguage(['English', 'Mandarin'])).toBe(true);
    expect(hasChineseSpokenLanguage(['Cantonese'])).toBe(true);
    expect(hasChineseSpokenLanguage(['Taiwanese'])).toBe(true);
    expect(hasChineseSpokenLanguage(['chinese'])).toBe(true);
    expect(hasChineseSpokenLanguage(['English'])).toBe(false);
    expect(hasChineseSpokenLanguage(['Traditional Chinese'])).toBe(false);
    expect(hasChineseSpokenLanguage([])).toBe(false);
  });

  it('keeps typed-in ratings and trust badges out of every homepage featured card', async () => {
    const { siteProfiles } = await import('@/lib/site-config');

    for (const site of Object.values(siteProfiles)) {
      for (const card of site.home.featuredCards) {
        expect(card).not.toHaveProperty('rating');
        expect(card).not.toHaveProperty('reviewCount');
        expect(card.badge ?? '').not.toMatch(/verified|claimed|認證|認領|驗證/i);
      }
    }
  });

  it('shows a card with no stars or counts, labelled by what we know about the listing', async () => {
    const { BusinessCard } = await import('@/components/BusinessCard');

    const imported = renderToStaticMarkup(<BusinessCard business={listing()} locale="en" />);
    expect(imported).not.toContain('4.8');
    expect(imported).not.toContain('(12)');
    expect(imported).toContain('Listed from public sources');
    expect(imported).not.toContain('>Verified<');
    // The bilingual column is set, but the only language on record is English.
    expect(imported).not.toContain('Bilingual');

    const claimed = renderToStaticMarkup(
      <BusinessCard business={listing({ ownerProfileSlug: 'grace-lin', languages: ['English', 'Mandarin'] })} locale="zh" />
    );
    expect(claimed).toContain('認證商家');
    expect(claimed).toContain('業主已認領此商家頁面');
    expect(claimed).toContain('雙語服務');
  });

  it('shows no rating, review count or aggregateRating on a business page whose stored rating came from elsewhere', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');
    // Fixture with a copied Google rating (5.0, 47 reviews), the bilingual flag set and no languages on record.
    const slug = 'chili-rush-mesa';

    const en = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug }));
    expect(en).toContain('Chili Rush');
    expect(en).not.toContain('aggregateRating');
    expect(en).not.toContain('47 reviews');
    expect(en).not.toContain('5.0');
    expect(en).not.toContain('Bilingual support');
    expect(en).toContain('Listed from public sources');
    expect(en).toContain('The owner has not confirmed it yet.');

    const zh = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'zh', slug }));
    expect(zh).not.toContain('47 則評價');
    expect(zh).not.toContain('認證商家');
    expect(zh).not.toContain('雙語服務');
    expect(zh).toContain('資料來自公開來源');
  });

  it('says Bilingual support on a business page when a Chinese spoken language is on record', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug: 'tasty-pot-mesa' }));
    expect(html).toContain('Bilingual support');
  });

  it('labels the hand-picked business page badge Featured, not Popular', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const en = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug: 'hedy-li-phoenix' }));
    const zh = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'zh', slug: 'hedy-li-phoenix' }));
    expect(en).toContain('Featured');
    expect(en).not.toContain('>Popular<');
    expect(zh).toContain('精選');
    expect(zh).not.toContain('熱門商家');
  });

  it('shows the Arizona homepage without typed-in ratings, a false Claimed badge or a Verified count', async () => {
    const { HomePageView } = await import('@/views/home-page');

    const en = renderToStaticMarkup(await HomePageView({ locale: 'en' }));
    expect(en).toContain('Featured Businesses');
    expect(en).not.toContain('(47)');
    expect(en).not.toContain('(51)');
    expect(en).not.toContain('Claimed');
    expect(en).not.toContain('Verified Businesses');
    expect(en).toContain('Listed businesses');

    const zh = renderToStaticMarkup(await HomePageView({ locale: 'zh' }));
    expect(zh).not.toContain('已認領');
    expect(zh).not.toContain('認證商家');
    expect(zh).toContain('收錄商家');
    expect(zh).not.toContain('認證可信');
  });

  it('offers no rating filter or rating sorts in the directory filters', async () => {
    const { DirectoryFilters } = await import('@/components/DirectoryFilters');

    const html = renderToStaticMarkup(<DirectoryFilters locale="en" categories={[]} cities={[]} values={{}} />);
    expect(html).not.toContain('Minimum rating');
    expect(html).not.toContain('Highest rated');
    expect(html).not.toContain('Most reviewed');
  });
});

describe('the Chinese language value (#485)', () => {
  it('treats Chinese like Mandarin, Cantonese or Taiwanese for Bilingual and the "any Chinese" filter', async () => {
    const { hasChineseSpokenLanguage, matchesLanguageFilter } = await import('@/lib/listing-trust');

    expect(hasChineseSpokenLanguage(['English', 'Chinese'])).toBe(true);
    expect(matchesLanguageFilter(['English', 'Chinese'], 'Chinese')).toBe(true);
    expect(matchesLanguageFilter(['Cantonese'], 'Chinese')).toBe(true);
    expect(matchesLanguageFilter(['English', 'Traditional Chinese'], 'Chinese')).toBe(false);
    // A source that only said "Chinese" does not tell us the dialect.
    expect(matchesLanguageFilter(['English', 'Chinese'], 'Mandarin')).toBe(false);
    expect(matchesLanguageFilter(['Mandarin'], 'Mandarin')).toBe(true);
  });

  it('asks the database for any Chinese spoken language when the filter is Chinese', async () => {
    const { applyDirectoryQueryFilters } = await import('@/lib/directory');
    const calls: Array<[string, unknown[]]> = [];
    const query = new Proxy(
      {},
      {
        get: (_target, method: string) => (...args: unknown[]) => {
          calls.push([method, args]);
          return query;
        },
      }
    ) as Parameters<typeof applyDirectoryQueryFilters>[0];

    applyDirectoryQueryFilters(query, { language: 'Chinese' });
    expect(calls).toContainEqual(['overlaps', ['languages', ['Mandarin', 'Cantonese', 'Taiwanese', 'Chinese']]]);
  });

  it('shows the Bilingual badge and the 中文 label for a listing recorded as English and Chinese', async () => {
    const { BusinessCard } = await import('@/components/BusinessCard');
    const { languageLabel } = await import('@/lib/i18n');

    const html = renderToStaticMarkup(<BusinessCard business={listing({ languages: ['English', 'Chinese'] })} locale="en" />);
    expect(html).toContain('Bilingual');
    expect(languageLabel('Chinese', 'zh')).toBe('中文');
  });

  it('offers "Chinese (any dialect)" in the directory language filter', async () => {
    const { DirectoryFilters } = await import('@/components/DirectoryFilters');

    expect(renderToStaticMarkup(<DirectoryFilters locale="en" categories={[]} cities={[]} values={{}} />)).toContain(
      'Chinese (any dialect)'
    );
    expect(renderToStaticMarkup(<DirectoryFilters locale="zh" categories={[]} cities={[]} values={{}} />)).toContain(
      '中文（不限方言）'
    );
  });
});
