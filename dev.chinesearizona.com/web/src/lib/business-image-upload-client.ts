import type { Locale } from '@/lib/types';

export function getClipboardImageFile(items: DataTransferItemList | null | undefined): File | null {
  if (!items) {
    return null;
  }

  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      continue;
    }

    const file = item.getAsFile();
    if (file) {
      return file;
    }
  }

  return null;
}

export function appendUploadedGalleryUrl(existing: string, url: string): string {
  const urls = existing
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!urls.includes(url)) {
    urls.push(url);
  }

  return urls.join('\n');
}

export async function uploadBusinessImageFile(input: {
  file: File;
  locale: Locale;
  target: 'hero' | 'gallery';
}): Promise<{ message?: string; url: string }> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('target', input.target);

  const response = await fetch('/api/directory/uploads/business-images', {
    method: 'POST',
    headers: {
      'x-locale': input.locale,
    },
    body: formData,
  });

  const data = (await response.json()) as { message?: string; url?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.message ?? 'Image upload failed.');
  }

  return {
    message: data.message,
    url: data.url,
  };
}
