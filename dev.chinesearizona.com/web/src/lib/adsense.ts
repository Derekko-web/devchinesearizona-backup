export type AdSensePlacement =
  | 'community_radar_sidebar'
  | 'news_archive_sidebar'
  | 'article_detail_sidebar';

type AdSensePlacementConfig = {
  placement: AdSensePlacement;
  slotId: string;
};

const ADSENSE_CERTIFICATE_AUTHORITY_ID = 'f08c47fec0942fa0';

function normalizeValue(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getAdSenseClientId(): string | null {
  return normalizeValue(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
}

export function getAdSensePlacementConfig(
  placement: AdSensePlacement
): AdSensePlacementConfig | null {
  const slotIdByPlacement: Record<AdSensePlacement, string | null> = {
    community_radar_sidebar: normalizeValue(
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_COMMUNITY_RADAR_SIDEBAR
    ),
    news_archive_sidebar: normalizeValue(
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_ARCHIVE_SIDEBAR
    ),
    article_detail_sidebar: normalizeValue(
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_DETAIL_SIDEBAR
    ),
  };

  const slotId = slotIdByPlacement[placement];
  if (!getAdSenseClientId() || !slotId) {
    return null;
  }

  return {
    placement,
    slotId,
  };
}

export function hasAdSensePlacement(placement: AdSensePlacement): boolean {
  return Boolean(getAdSensePlacementConfig(placement));
}

export function shouldRenderAdSensePlacement(placement: AdSensePlacement): boolean {
  return process.env.NODE_ENV !== 'production' || hasAdSensePlacement(placement);
}

export function getAdSenseAdsTxtLine(): string | null {
  const clientId = getAdSenseClientId();
  if (!clientId) {
    return null;
  }

  const publisherId = clientId.replace(/^ca-/, '');
  return `google.com, ${publisherId}, DIRECT, ${ADSENSE_CERTIFICATE_AUTHORITY_ID}`;
}
