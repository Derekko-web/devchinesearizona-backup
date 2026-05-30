import type {
  Article,
  ArticleSeries,
  DiscoverArticle,
  DiscoveryCategory,
  DiscoveryQueueStatus,
  DestinationSurface,
  DirectoryFollowUpAction,
  DirectoryFollowUpStatus,
  DirectoryStatus,
  FreshnessTier,
  Guide,
  HiddenArizonaKind,
  LanguageOption,
  Locale,
  LocalizedText,
  MonitoredSource,
  PersonaTarget,
  ProfileRole,
  RadarLane,
  SignalDeskReviewStatus,
  SourcePolicy,
  VerificationState,
} from '@/lib/types';
import { locales } from '@/lib/types';

export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function resolveLocale(value: string | undefined): Locale {
  if (!value) {
    return defaultLocale;
  }

  const normalized = value === 'zh-TW' ? 'zh' : value;
  return isLocale(normalized) ? normalized : defaultLocale;
}

export function t(value: LocalizedText, locale: Locale): string {
  if (locale === 'zh') {
    return value.zh ?? value.en;
  }

  return value.en;
}

export function localeLangAttribute(locale: Locale): string {
  return locale === 'zh' ? 'zh-Hant' : 'en';
}

export function localeName(locale: Locale, displayLocale: Locale = locale): string {
  const labels: Record<Locale, LocalizedText> = {
    en: { en: 'English', 'zh': '英文' },
    zh: { en: 'Chinese', 'zh': '中文' },
  };

  return displayLocale === 'zh' ? labels[locale].zh ?? labels[locale].en : labels[locale].en;
}

export function languageLabel(language: LanguageOption | string, locale: Locale): string {
  const labels: Record<string, LocalizedText> = {
    English: { en: 'English', 'zh': '英文' },
    Mandarin: { en: 'Mandarin', 'zh': '國語' },
    'Traditional Chinese': { en: 'Traditional Chinese', 'zh': '繁體中文' },
    Taiwanese: { en: 'Taiwanese', 'zh': '台語' },
  };

  return labels[language]?.[locale] ?? language;
}

export function formatLanguageList(languages: Array<LanguageOption | string>, locale: Locale): string {
  return languages.map((language) => languageLabel(language, locale)).join(' · ');
}

export function guideSectionLabel(section: Guide['section'], locale: Locale): string {
  const labels: Record<Guide['section'], LocalizedText> = {
    moving: { en: 'Moving', 'zh': '搬遷安家' },
    housing: { en: 'Housing', 'zh': '住房' },
    utilities: { en: 'Utilities', 'zh': '公用事業' },
    schools: { en: 'Schools', 'zh': '學校教育' },
    healthcare: { en: 'Healthcare', 'zh': '醫療保健' },
    transportation: { en: 'Transportation', 'zh': '交通移動' },
    community: { en: 'Community', 'zh': '華人社群' },
    safety: { en: 'Safety and legal', 'zh': '安全與法律' },
  };

  return t(labels[section], locale);
}

export function articleCategoryLabel(category: Article['category'], locale: Locale): string {
  const labels: Record<Article['category'], LocalizedText> = {
    news: { en: 'News', 'zh': '新聞' },
    feature: { en: 'Feature', 'zh': '專題' },
  };

  return t(labels[category], locale);
}

export function hiddenArizonaKindLabel(kind: HiddenArizonaKind, locale: Locale): string {
  const labels: Record<HiddenArizonaKind, LocalizedText> = {
    place: { en: 'Place', zh: '地點' },
    story: { en: 'Story', zh: '故事' },
    list: { en: 'List', zh: '清單' },
    itinerary: { en: 'Itinerary', zh: '行程' },
  };

  return t(labels[kind], locale);
}

export function discoveryCategoryLabel(category: DiscoveryCategory, locale: Locale): string {
  const labels: Record<DiscoveryCategory, LocalizedText> = {
    beautiful_arizona: { en: 'Beautiful Arizona', zh: '美麗亞利桑那' },
    things_to_do: { en: 'Things to Do', zh: '玩樂體驗' },
    restaurants: { en: 'Restaurants', zh: '餐廳美食' },
    hotels: { en: 'Hotels', zh: '旅宿飯店' },
    parks: { en: 'Parks', zh: '公園綠地' },
    shopping: { en: 'Shopping', zh: '購物逛街' },
  };

  return t(labels[category], locale);
}

export function discoveryQueueStatusLabel(status: DiscoveryQueueStatus, locale: Locale): string {
  const labels: Record<DiscoveryQueueStatus, LocalizedText> = {
    queued: { en: 'Queued', zh: '排隊中' },
    review_ready: { en: 'Review ready', zh: '待編輯審核' },
    approved: { en: 'Approved', zh: '已核准' },
    published: { en: 'Published', zh: '已發佈' },
    blocked: { en: 'Blocked', zh: '已阻擋' },
    stale: { en: 'Stale', zh: '已過時' },
  };

  return t(labels[status], locale);
}

export function discoveryArticleByline(article: DiscoverArticle, locale: Locale): string {
  const creator = article.creatorHandle ? `@${article.creatorHandle}` : article.sourceUrl;

  return locale === 'zh'
    ? `來源：${creator}`
    : `Source: ${creator}`;
}

export function articleSeriesLabel(series: ArticleSeries, locale: Locale): string {
  const labels: Record<ArticleSeries, LocalizedText> = {
    'housing-watch': { en: 'Housing Watch', zh: '房市觀察' },
    'tsmc-corridor-watch': { en: 'TSMC Corridor Watch', zh: 'TSMC 走廊觀察' },
    'route-watch': { en: 'Phoenix Route Watch', zh: '航線觀察' },
    'restaurant-opening-radar': { en: 'Restaurant Opening Radar', zh: '新店雷達' },
    'trend-radar': { en: 'Trend Radar', zh: '趨勢雷達' },
    'arizona-radar': { en: 'Arizona News', zh: '亞利桑那新聞' },
    'local-radar': { en: 'Local News', zh: '本地新聞' },
    'austin-radar': { en: 'Austin News', zh: '奥斯汀新聞' },
    'sf-bay-radar': { en: 'SF Bay News', zh: '灣區新聞' },
    'community-wire': { en: 'Community Wire', zh: '社群轉載' },
  };

  return t(labels[series], locale);
}

export function freshnessTierLabel(tier: FreshnessTier, locale: Locale): string {
  const labels: Record<FreshnessTier, LocalizedText> = {
    breaking: { en: 'Breaking', zh: '即時' },
    weekly: { en: 'Weekly', zh: '每週' },
    monthly: { en: 'Monthly', zh: '每月' },
    evergreen: { en: 'Evergreen', zh: '長青' },
    archive: { en: 'Archive', zh: '檔案' },
  };

  return t(labels[tier], locale);
}

export function sourcePolicyLabel(policy: SourcePolicy, locale: Locale): string {
  const labels: Record<SourcePolicy, LocalizedText> = {
    summary_link: { en: 'Source links', zh: '來源連結' },
    signal_only: { en: 'Discovery only', zh: '僅作題材發現' },
    republish_with_permission: { en: 'Republished with permission', zh: '授權轉載' },
  };

  return t(labels[policy], locale);
}

export function radarLaneLabel(lane: RadarLane, locale: Locale): string {
  const labels: Record<RadarLane, LocalizedText> = {
    housing: { en: 'Housing', zh: '住房' },
    openings: { en: 'Openings', zh: '新店' },
    community: { en: 'Community', zh: '社群' },
    official: { en: 'Official', zh: '官方' },
    social: { en: 'Social posts', zh: '社群貼文' },
  };

  return t(labels[lane], locale);
}

export function personaTargetLabel(target: PersonaTarget, locale: Locale): string {
  const labels: Record<PersonaTarget, LocalizedText> = {
    tsmc_newcomers: { en: 'TSMC newcomers', zh: 'TSMC 新住民' },
    local_families: { en: 'Local families', zh: '在地家庭' },
    students: { en: 'Students', zh: '學生' },
    business_owners: { en: 'Business owners', zh: '商家主理人' },
  };

  return t(labels[target], locale);
}

export function sourceTypeLabel(sourceType: MonitoredSource['sourceType'], locale: Locale): string {
  const labels: Record<MonitoredSource['sourceType'], LocalizedText> = {
    housing_portal: { en: 'Housing portal', zh: '房市平台' },
    corporate_newsroom: { en: 'Corporate newsroom', zh: '企業新聞室' },
    official_data: { en: 'Official data', zh: '官方資料' },
    airport_newsroom: { en: 'Airport newsroom', zh: '機場消息' },
    local_media: { en: 'Local media', zh: '在地媒體' },
    social_signal: { en: 'Social source', zh: '社群來源' },
  };

  return t(labels[sourceType], locale);
}

export function destinationSurfaceLabel(surface: DestinationSurface, locale: Locale): string {
  const labels: Record<DestinationSurface, LocalizedText> = {
    community_news: { en: 'Community news', zh: '社群新聞' },
    relocation_guide: { en: 'Relocation guide', zh: '搬遷指南' },
    directory_followup: { en: 'Directory follow-up', zh: '目錄跟進' },
    discover_arizona: { en: 'Discover Arizona', zh: '探索亞利桑那' },
    mixed: { en: 'Mixed surfaces', zh: '混合入口' },
  };

  return t(labels[surface], locale);
}

export function signalDeskReviewStatusLabel(status: SignalDeskReviewStatus, locale: Locale): string {
  const labels: Record<SignalDeskReviewStatus, LocalizedText> = {
    queued: { en: 'Queued', zh: '排隊中' },
    review_ready: { en: 'Review ready', zh: '待編輯審核' },
    approved: { en: 'Approved', zh: '已核准' },
    published: { en: 'Published', zh: '已發佈' },
  };

  return t(labels[status], locale);
}

export function directoryFollowUpActionLabel(action: DirectoryFollowUpAction, locale: Locale): string {
  const labels: Record<DirectoryFollowUpAction, LocalizedText> = {
    verify_listing: { en: 'Verify listing', zh: '核對既有商家' },
    create_listing: { en: 'Create listing', zh: '建立新商家' },
    expand_category: { en: 'Expand category', zh: '擴充分類' },
  };

  return t(labels[action], locale);
}

export function directoryFollowUpStatusLabel(status: DirectoryFollowUpStatus, locale: Locale): string {
  const labels: Record<DirectoryFollowUpStatus, LocalizedText> = {
    queued: { en: 'Queued', zh: '排隊中' },
    in_progress: { en: 'In progress', zh: '進行中' },
    done: { en: 'Done', zh: '已完成' },
  };

  return t(labels[status], locale);
}

export function profileRoleLabel(role: ProfileRole, locale: Locale): string {
  const labels: Record<ProfileRole, LocalizedText> = {
    member: { en: 'Community member', 'zh': '社群成員' },
    business_owner: { en: 'Business owner', 'zh': '商家主理人' },
    editor: { en: 'Editor', 'zh': '編輯' },
    moderator: { en: 'Moderator', 'zh': '版主' },
    admin: { en: 'Admin', 'zh': '管理員' },
  };

  return t(labels[role], locale);
}

export function reportReasonLabel(reason: string, locale: Locale): string {
  const labels: Record<string, LocalizedText> = {
    spam: { en: 'Spam', 'zh': '垃圾訊息' },
    unsafe: { en: 'Unsafe or suspicious', 'zh': '不安全或可疑' },
    incorrect: { en: 'Incorrect information', 'zh': '資訊錯誤' },
  };

  return labels[reason] ? t(labels[reason], locale) : reason;
}

export function verificationStateLabel(state: VerificationState, locale: Locale): string {
  const labels: Record<VerificationState, LocalizedText> = {
    unverified: { en: 'Unverified', zh: '未驗證' },
    claimed: { en: 'Claimed', zh: '已認領' },
    editor_verified: { en: 'Verified', zh: '已驗證' },
  };

  return t(labels[state], locale);
}

export function directoryStatusLabel(status: DirectoryStatus, locale: Locale): string {
  const labels: Record<DirectoryStatus, LocalizedText> = {
    live: { en: 'Live', zh: '已上線' },
    pending_review: { en: 'Pending review', zh: '待審核' },
    planned: { en: 'Planned', zh: '規劃中' },
    suppressed: { en: 'Suppressed', zh: '已隱藏' },
    stale: { en: 'Needs refresh', zh: '待更新' },
  };

  return t(labels[status], locale);
}

export function formatReadTime(readTime: string, locale: Locale): string {
  const minutes = readTime.match(/\d+/)?.[0];
  if (!minutes) {
    return readTime;
  }

  return locale === 'zh' ? `${minutes} 分鐘閱讀` : `${minutes} min read`;
}

export function businessHoursLabel(label: string, locale: Locale): string {
  const labels: Record<string, LocalizedText> = {
    'Mon-Fri': { en: 'Mon-Fri', 'zh': '週一至週五' },
    Sat: { en: 'Sat', 'zh': '週六' },
    Sun: { en: 'Sun', 'zh': '週日' },
    'Sun-Thu': { en: 'Sun-Thu', 'zh': '週日至週四' },
    'Fri-Sat': { en: 'Fri-Sat', 'zh': '週五至週六' },
    'Mon-Thu': { en: 'Mon-Thu', 'zh': '週一至週四' },
    Fri: { en: 'Fri', 'zh': '週五' },
    'Mon-Sat': { en: 'Mon-Sat', 'zh': '週一至週六' },
    Emergency: { en: 'Emergency', 'zh': '緊急服務' },
  };
  const weekdays: Record<string, LocalizedText> = {
    Monday: { en: 'Monday', zh: '週一' },
    Tuesday: { en: 'Tuesday', zh: '週二' },
    Wednesday: { en: 'Wednesday', zh: '週三' },
    Thursday: { en: 'Thursday', zh: '週四' },
    Friday: { en: 'Friday', zh: '週五' },
    Saturday: { en: 'Saturday', zh: '週六' },
    Sunday: { en: 'Sunday', zh: '週日' },
    Mon: { en: 'Mon', zh: '週一' },
    Tue: { en: 'Tue', zh: '週二' },
    Wed: { en: 'Wed', zh: '週三' },
    Thu: { en: 'Thu', zh: '週四' },
    Fri: { en: 'Fri', zh: '週五' },
  };

  if (labels[label]) {
    return t(labels[label], locale);
  }

  const parts = label.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => weekdays[part])) {
    return parts.map((part) => t(weekdays[part]!, locale)).join(locale === 'zh' ? '、' : ', ');
  }

  return weekdays[label] ? t(weekdays[label]!, locale) : label;
}

export function businessHoursValue(value: string, locale: Locale): string {
  const labels: Record<string, LocalizedText> = {
    'By appointment': { en: 'By appointment', 'zh': '採預約制' },
    'Available on request': { en: 'Available on request', 'zh': '可依需求安排' },
    'Virtual appointments': { en: 'Virtual appointments', 'zh': '提供線上預約' },
    'Special programs': { en: 'Special programs', 'zh': '特別課程時段' },
    Closed: { en: 'Closed', zh: '休息' },
  };
  const timeRangeMatch = value.match(
    /^(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)$/
  );

  if (timeRangeMatch) {
    return `${formatBusinessTime(timeRangeMatch[1], locale)} - ${formatBusinessTime(timeRangeMatch[2], locale)}`;
  }

  return labels[value] ? t(labels[value], locale) : value;
}

function formatBusinessTime(value: string, locale: Locale): string {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return value;
  }

  const hour = Number(match[1]);
  const minute = match[2];
  if (locale === 'zh') {
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${minute} ${period}`;
}

export function descriptiveImageAlt(
  subject: string,
  kind: 'article' | 'business' | 'event' | 'guide',
  locale: Locale
): string {
  const suffixes: Record<typeof kind, LocalizedText> = {
    article: { en: 'article cover image', 'zh': '文章封面圖' },
    business: { en: 'business photo', 'zh': '商家照片' },
    event: { en: 'event photo', 'zh': '活動照片' },
    guide: { en: 'guide cover image', 'zh': '指南封面圖' },
  };

  return `${subject} ${t(suffixes[kind], locale)}`;
}

export function formatDate(date: string, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return formatter.format(new Date(date));
}

export function formatDateTime(date: string, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return formatter.format(new Date(date));
}
