import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { canServeArizonaOnlyContent } from '@/lib/arizona-only-routes';
import { cityContentUnavailableMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import type { Locale } from '@/lib/types';

export async function requireArizonaOnlySite() {
  const site = await getCurrentSiteProfile();
  if (!canServeArizonaOnlyContent(site)) {
    notFound();
  }

  return site;
}

export async function arizonaOnlyMetadata(
  locale: Locale,
  path: string,
  buildAllowedMetadata: () => Metadata | Promise<Metadata>,
  label = 'Arizona-only content'
): Promise<Metadata> {
  const site = await getCurrentSiteProfile();
  if (!canServeArizonaOnlyContent(site)) {
    return cityContentUnavailableMetadata(locale, site, path, label);
  }

  return buildAllowedMetadata();
}
