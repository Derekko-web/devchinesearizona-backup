import type { DiscoveryCategory, DiscoveryQueueStatus, LocalizedText } from '@/lib/types';

export const discoveryCategories: Array<{
  slug: DiscoveryCategory;
  title: LocalizedText;
  description: LocalizedText;
}> = [
  {
    slug: 'beautiful_arizona',
    title: { en: 'Beautiful Arizona', zh: '美麗亞利桑那' },
    description: {
      en: 'Scenic clips, red-rock moments, desert light, and the places that make Arizona feel visually distinct.',
      zh: '聚焦風景、紅岩、沙漠光線與最能代表亞利桑那視覺魅力的地方。',
    },
  },
  {
    slug: 'things_to_do',
    title: { en: 'Things to Do', zh: '玩樂體驗' },
    description: {
      en: 'Trip ideas, short stops, family-friendly outings, and practical Arizona activity notes.',
      zh: '整理行程靈感、短停靠點、親子玩法與更實際的亞利桑那遊玩筆記。',
    },
  },
  {
    slug: 'restaurants',
    title: { en: 'Restaurants', zh: '餐廳美食' },
    description: {
      en: 'Restaurant discoveries rewritten into calmer bilingual food planning.',
      zh: '把餐飲探索整理成更穩定、可實際使用的雙語美食規劃。',
    },
  },
  {
    slug: 'hotels',
    title: { en: 'Hotels', zh: '旅宿飯店' },
    description: {
      en: 'Stay recommendations and hotel notes that go beyond pool shots and pretty lobbies.',
      zh: '不只看泳池與大廳，而是補上真正影響住宿決策的旅宿重點。',
    },
  },
  {
    slug: 'parks',
    title: { en: 'Parks', zh: '公園綠地' },
    description: {
      en: 'Park stops, family reset points, and outdoorsy Arizona moments worth slowing down for.',
      zh: '適合放慢步調的公園停靠點、親子重整節奏的空間與戶外時刻。',
    },
  },
  {
    slug: 'shopping',
    title: { en: 'Shopping', zh: '購物逛街' },
    description: {
      en: 'Shopping stops that fit real Arizona itineraries instead of one-off viral clips.',
      zh: '把爆紅購物短影音整理成更符合真實亞利桑那行程的停靠建議。',
    },
  },
];

export const discoveryQueueStatuses: DiscoveryQueueStatus[] = [
  'queued',
  'review_ready',
  'approved',
  'published',
  'blocked',
  'stale',
];

const discoveryCategorySet = new Set<DiscoveryCategory>(
  discoveryCategories.map((category) => category.slug)
);
const discoveryQueueStatusSet = new Set<DiscoveryQueueStatus>(discoveryQueueStatuses);

export function isDiscoveryCategory(value: string): value is DiscoveryCategory {
  return discoveryCategorySet.has(value as DiscoveryCategory);
}

export function isDiscoveryQueueStatus(value: string): value is DiscoveryQueueStatus {
  return discoveryQueueStatusSet.has(value as DiscoveryQueueStatus);
}
