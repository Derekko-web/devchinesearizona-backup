import { describe, expect, it } from 'vitest';

import {
  formatBusinessGalleryInput,
  getBusinessHeroImageWarning,
  parseBusinessPhotoSet,
} from '@/lib/business-media';

describe('business media helpers', () => {
  it('promotes the first gallery image to cover photo when the cover field is blank', () => {
    expect(
      parseBusinessPhotoSet({
        galleryText: [
          'https://example.com/storefront.jpg',
          'https://example.com/interior.jpg',
        ].join('\n'),
      })
    ).toEqual({
      heroImage: 'https://example.com/storefront.jpg',
      gallery: ['https://example.com/interior.jpg'],
    });
  });

  it('deduplicates gallery URLs and removes the cover photo from the gallery set', () => {
    expect(
      parseBusinessPhotoSet({
        heroImage: 'https://example.com/storefront.jpg',
        gallery: [
          'https://example.com/storefront.jpg',
          'https://example.com/interior.jpg',
          'https://example.com/interior.jpg',
        ],
      })
    ).toEqual({
      heroImage: 'https://example.com/storefront.jpg',
      gallery: ['https://example.com/interior.jpg'],
    });
  });

  it('renders gallery URLs back into one-per-line form state', () => {
    expect(
      formatBusinessGalleryInput([
        'https://example.com/one.jpg',
        'https://example.com/two.jpg',
      ])
    ).toBe('https://example.com/one.jpg\nhttps://example.com/two.jpg');
  });

  it('rejects invalid photo URLs with a localized message', () => {
    expect(() =>
      parseBusinessPhotoSet(
        {
          heroImage: 'ftp://example.com/storefront.jpg',
        },
        'zh'
      )
    ).toThrow('封面照片網址必須是有效的 http 或 https 網址。');
  });

  it('warns when the cover photo looks like a tiny Instagram profile image', () => {
    expect(
      getBusinessHeroImageWarning(
        'https://scontent-hou1-1.cdninstagram.com/v/t51.82787-19/590415166_17852677047586193_2960565724718549172_n.jpg?stp=dst-jpg_s150x150_tt6&oe=69EC6E22&oh=00_Af1bzJH-xN4qqBq2JIx0zKTttazzaGoxnnoxqB2Ck2fFcg',
        'en'
      )
    ).toContain('small Instagram profile image URL');
  });

  it('does not warn for ordinary cover photo URLs', () => {
    expect(getBusinessHeroImageWarning('https://example.com/storefront.jpg', 'en')).toBeNull();
  });
});
