import { describe, expect, it } from 'vitest';

import {
  BUSINESS_IMAGE_ALLOWED_MIME_TYPES,
  MAX_BUSINESS_IMAGE_BYTES,
  createBusinessImageObjectPath,
  extensionForBusinessImageMimeType,
  validateBusinessImageFile,
} from '@/lib/business-image-storage';

describe('business image storage helpers', () => {
  it('accepts supported image mime types', () => {
    for (const mimeType of BUSINESS_IMAGE_ALLOWED_MIME_TYPES) {
      expect(
        validateBusinessImageFile(
          {
            mimeType,
            sizeBytes: 1024,
          },
          'en'
        )
      ).toBe(mimeType);
    }
  });

  it('rejects unsupported image mime types', () => {
    expect(() =>
      validateBusinessImageFile(
        {
          mimeType: 'image/svg+xml',
          sizeBytes: 1024,
        },
        'en'
      )
    ).toThrow('Only JPG, PNG, WebP, or GIF images are supported.');
  });

  it('rejects oversized images', () => {
    expect(() =>
      validateBusinessImageFile(
        {
          mimeType: 'image/png',
          sizeBytes: MAX_BUSINESS_IMAGE_BYTES + 1,
        },
        'zh'
      )
    ).toThrow('圖片大小必須小於 10MB。');
  });

  it('maps mime types to file extensions', () => {
    expect(extensionForBusinessImageMimeType('image/jpeg')).toBe('jpg');
    expect(extensionForBusinessImageMimeType('image/png')).toBe('png');
    expect(extensionForBusinessImageMimeType('image/webp')).toBe('webp');
    expect(extensionForBusinessImageMimeType('image/gif')).toBe('gif');
  });

  it('creates predictable storage paths', () => {
    const path = createBusinessImageObjectPath({
      profileId: 'Profile Id',
      target: 'hero',
      mimeType: 'image/png',
    });

    expect(path).toMatch(/^profile-id\/hero\/\d{4}-\d{2}-\d{2}\/.+\.png$/);
  });
});
