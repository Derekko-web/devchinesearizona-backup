import { describe, expect, it } from 'vitest';

import { isBlurredPreviewImage, selectRealBusinessPhotos } from '@/lib/business-photos';

const blurredWix =
  'https://static.wixstatic.com/media/c837a6_f145~mv2.jpg/v1/fill/w_147,h_98,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/c837a6_f145~mv2.jpg';
const sharpWix =
  'https://static.wixstatic.com/media/c837a6_f145~mv2.jpg/v1/fill/w_980,h_653,al_c,q_85,enc_avif,quality_auto/dish.jpg';

describe('business photos', () => {
  it('spots Wix blurred preview URLs', () => {
    expect(isBlurredPreviewImage(blurredWix)).toBe(true);
    expect(isBlurredPreviewImage(sharpWix)).toBe(false);
    expect(isBlurredPreviewImage('/directory-ai-replacements/bido-cafe.webp')).toBe(false);
  });

  it('keeps only real, distinct photos up to the limit', () => {
    expect(
      selectRealBusinessPhotos([
        '/hero.webp?v=1',
        blurredWix,
        undefined,
        null,
        '/hero.webp?v=2',
        sharpWix,
        '/a.jpg',
        '/b.jpg',
        '/c.jpg',
      ])
    ).toEqual(['/hero.webp?v=1', sharpWix, '/a.jpg', '/b.jpg']);
  });

  it('returns nothing when there are no usable photos', () => {
    expect(selectRealBusinessPhotos([blurredWix, undefined])).toEqual([]);
  });
});
