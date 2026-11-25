/**
 * Picks the photos a business page can honestly show.
 *
 * Some imported galleries captured Wix "blur" preview URLs (tiny, blurred
 * thumbnails Wix shows while the real image loads). Those look broken on our
 * pages, so they are skipped. Duplicates are dropped by path.
 */
export function isBlurredPreviewImage(url: string): boolean {
  return /static\.wixstatic\.com\/.*[,/]blur_\d+/i.test(url);
}

export function selectRealBusinessPhotos(
  urls: ReadonlyArray<string | null | undefined>,
  limit = 4
): string[] {
  const seen = new Set<string>();
  const photos: string[] = [];

  for (const url of urls) {
    if (!url || isBlurredPreviewImage(url)) {
      continue;
    }

    const key = url.split('?')[0] ?? url;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    photos.push(url);

    if (photos.length >= limit) {
      break;
    }
  }

  return photos;
}
