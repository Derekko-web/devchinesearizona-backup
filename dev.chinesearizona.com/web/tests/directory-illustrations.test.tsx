import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BusinessImage } from '@/components/BusinessImage';
import {
  getDirectoryAiReplacementImage,
  isIllustrationImageUrl,
  resolveDirectoryHeroImage,
} from '@/lib/directory-ai-replacements';

describe('directory illustrations', () => {
  it('recognizes AI-made directory and city images as illustrations', () => {
    expect(isIllustrationImageUrl('/directory-ai-replacements/bido-cafe.webp?v=20260421-1700')).toBe(true);
    expect(isIllustrationImageUrl('/city-site-images/h-mart-austin.webp')).toBe(true);
    expect(isIllustrationImageUrl('https://chinesearizona.com/directory-ai-replacements/bido-cafe.webp')).toBe(true);
    expect(isIllustrationImageUrl('https://images.example.com/storefront.jpg')).toBe(false);
    expect(isIllustrationImageUrl('https://example.com/blog/directory-ai-replacements-guide.jpg')).toBe(false);
    expect(isIllustrationImageUrl(undefined)).toBe(false);
  });

  it('labels illustrations in both languages, but not real photos', () => {
    const english = renderToStaticMarkup(
      <BusinessImage imageUrl="/directory-ai-replacements/bido-cafe.webp" label="Bido Cafe" locale="en" />
    );
    const chinese = renderToStaticMarkup(
      <BusinessImage imageUrl="/city-site-images/h-mart-austin.webp" label="H Mart" locale="zh" />
    );
    const realPhoto = renderToStaticMarkup(
      <BusinessImage imageUrl="https://images.example.com/storefront.jpg" label="Storefront" locale="en" />
    );

    expect(english).toContain('Illustration');
    expect(chinese).toContain('示意圖');
    expect(realPhoto).not.toContain('Illustration');
  });

  it('can hide the label on tiny thumbnails', () => {
    const html = renderToStaticMarkup(
      <BusinessImage
        imageUrl="/directory-ai-replacements/bido-cafe.webp"
        label="Bido Cafe"
        locale="en"
        showIllustrationLabel={false}
      />
    );

    expect(html).not.toContain('Illustration');
  });

  it('drops AI portraits and images of the wrong business instead of falling back to scraped photos', () => {
    for (const slug of ['hedy-li-phoenix', 'walgreens-chandler', 'carl-s-jr-peoria', 'china-jade-tempe']) {
      expect(getDirectoryAiReplacementImage(slug, 'https://cdn.example.com/scraped.jpg'), slug).toBeUndefined();
    }

    expect(getDirectoryAiReplacementImage('bido-cafe')).toMatch(/^\/directory-ai-replacements\/bido-cafe\.webp/);
  });

  it("shows a claimed owner's own photo instead of the illustration", () => {
    expect(
      resolveDirectoryHeroImage({
        slug: 'bido-cafe',
        heroImage: 'https://images.example.com/owner-storefront.jpg',
        claimed: true,
      })
    ).toBe('https://images.example.com/owner-storefront.jpg');

    expect(
      resolveDirectoryHeroImage({
        slug: 'bido-cafe',
        heroImage: 'https://images.example.com/scraped.jpg',
        claimed: false,
      })
    ).toMatch(/^\/directory-ai-replacements\/bido-cafe\.webp/);

    // An owner who saved the illustration's own address has not uploaded a photo.
    expect(
      resolveDirectoryHeroImage({
        slug: 'bido-cafe',
        heroImage: '/directory-ai-replacements/bido-cafe.webp?v=1',
        claimed: true,
      })
    ).toMatch(/^\/directory-ai-replacements\/bido-cafe\.webp/);
  });
});
