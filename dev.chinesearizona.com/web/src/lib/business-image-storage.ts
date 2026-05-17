import { getSupabaseServiceClient } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

export const BUSINESS_IMAGE_BUCKET = 'business-images';
export const MAX_BUSINESS_IMAGE_BYTES = 10 * 1024 * 1024;
export const BUSINESS_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

type BusinessImageTarget = 'hero' | 'gallery';

let ensureBucketPromise: Promise<void> | null = null;

function invalidImageTypeMessage(locale: Locale): string {
  if (locale === 'zh') {
    return '只支援 JPG、PNG、WebP 或 GIF 圖片。';
  }

  return 'Only JPG, PNG, WebP, or GIF images are supported.';
}

function invalidImageSizeMessage(locale: Locale): string {
  if (locale === 'zh') {
    return '圖片大小必須小於 10MB。';
  }

  return 'Images must be smaller than 10MB.';
}

function missingImageFileMessage(locale: Locale): string {
  if (locale === 'zh') {
    return '請先貼上一張圖片。';
  }

  return 'Paste an image first.';
}

function storageConfigMessage(locale: Locale): string {
  if (locale === 'zh') {
    return '目前尚未設定圖片儲存空間。';
  }

  return 'Image storage is not configured right now.';
}

function uploadFailureMessage(locale: Locale): string {
  if (locale === 'zh') {
    return '目前無法上傳這張圖片。';
  }

  return 'Unable to upload this image right now.';
}

function sanitizePathSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-');
  return normalized.replace(/^-|-$/g, '') || 'item';
}

function normalizeAllowedMimeTypes() {
  return [...BUSINESS_IMAGE_ALLOWED_MIME_TYPES].sort().join('|');
}

export function validateBusinessImageFile(
  input: {
    mimeType?: string | null;
    sizeBytes?: number | null;
  },
  locale: Locale = 'en'
): string {
  const mimeType = input.mimeType?.trim().toLowerCase();
  if (!mimeType || !BUSINESS_IMAGE_ALLOWED_MIME_TYPES.includes(mimeType as (typeof BUSINESS_IMAGE_ALLOWED_MIME_TYPES)[number])) {
    throw new Error(invalidImageTypeMessage(locale));
  }

  if (!input.sizeBytes || input.sizeBytes <= 0 || input.sizeBytes > MAX_BUSINESS_IMAGE_BYTES) {
    throw new Error(
      input.sizeBytes && input.sizeBytes > MAX_BUSINESS_IMAGE_BYTES
        ? invalidImageSizeMessage(locale)
        : missingImageFileMessage(locale)
    );
  }

  return mimeType;
}

export function extensionForBusinessImageMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function createBusinessImageObjectPath(input: {
  profileId: string;
  target: BusinessImageTarget;
  mimeType: string;
}): string {
  const extension = extensionForBusinessImageMimeType(input.mimeType);
  const dateStamp = new Date().toISOString().slice(0, 10);

  return `${sanitizePathSegment(input.profileId)}/${input.target}/${dateStamp}/${crypto.randomUUID()}.${extension}`;
}

async function ensureBusinessImageBucket() {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Business image storage is not configured.');
  }

  if (ensureBucketPromise) {
    return ensureBucketPromise;
  }

  ensureBucketPromise = (async () => {
    const { data: bucket, error } = await client.storage.getBucket(BUSINESS_IMAGE_BUCKET);
    if (error || !bucket) {
      const { error: createError } = await client.storage.createBucket(BUSINESS_IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_BUSINESS_IMAGE_BYTES,
        allowedMimeTypes: [...BUSINESS_IMAGE_ALLOWED_MIME_TYPES],
      });

      if (createError && !/already exists/i.test(createError.message ?? '')) {
        throw createError;
      }

      return;
    }

    const bucketMimeTypes = [...(bucket.allowed_mime_types ?? [])].sort().join('|');
    const bucketLimit =
      typeof bucket.file_size_limit === 'number'
        ? bucket.file_size_limit
        : Number(bucket.file_size_limit ?? 0);

    if (
      !bucket.public ||
      bucketLimit !== MAX_BUSINESS_IMAGE_BYTES ||
      bucketMimeTypes !== normalizeAllowedMimeTypes()
    ) {
      const { error: updateError } = await client.storage.updateBucket(BUSINESS_IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_BUSINESS_IMAGE_BYTES,
        allowedMimeTypes: [...BUSINESS_IMAGE_ALLOWED_MIME_TYPES],
      });

      if (updateError) {
        throw updateError;
      }
    }
  })().catch((error) => {
    ensureBucketPromise = null;
    throw error;
  });

  return ensureBucketPromise;
}

export async function uploadBusinessImageForProfile(input: {
  file: File;
  locale: Locale;
  profileId: string;
  target: BusinessImageTarget;
}): Promise<{ path: string; url: string }> {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error(storageConfigMessage(input.locale));
  }

  const mimeType = validateBusinessImageFile(
    {
      mimeType: input.file.type,
      sizeBytes: input.file.size,
    },
    input.locale
  );

  try {
    await ensureBusinessImageBucket();
  } catch {
    throw new Error(storageConfigMessage(input.locale));
  }

  const path = createBusinessImageObjectPath({
    profileId: input.profileId,
    target: input.target,
    mimeType,
  });

  const { data, error } = await client.storage
    .from(BUSINESS_IMAGE_BUCKET)
    .upload(path, new Uint8Array(await input.file.arrayBuffer()), {
      cacheControl: '31536000',
      contentType: mimeType,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(uploadFailureMessage(input.locale));
  }

  const {
    data: { publicUrl },
  } = client.storage.from(BUSINESS_IMAGE_BUCKET).getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicUrl,
  };
}
