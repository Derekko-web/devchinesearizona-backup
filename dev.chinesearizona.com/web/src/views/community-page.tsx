/* eslint-disable @next/next/no-img-element */
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/EmptyState';
import { getEvents } from '@/lib/content';
import { t } from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Event, Locale, LocalizedText } from '@/lib/types';

type CommunityPageViewProps = {
  locale: Locale;
  site?: SiteProfile;
};

type ResourceKind = 'school' | 'church' | 'pingpong';

type CommunityResource = {
  kind: ResourceKind;
  title: LocalizedText;
  eyebrow: LocalizedText;
  city: string;
  address?: string;
  imageUrl: string;
  imagePosition?: string;
  summary: LocalizedText;
  details: LocalizedText[];
  href: string;
  hrefLabel: LocalizedText;
};

type EventSpotlight = {
  title: LocalizedText;
  eyebrow: LocalizedText;
  dateLabel: LocalizedText;
  city: string;
  venue: LocalizedText;
  imageUrl: string;
  imagePosition?: string;
  summary: LocalizedText;
  href: string;
  hrefLabel: LocalizedText;
};

const schools: CommunityResource[] = [
  {
    kind: 'school',
    title: { en: 'Chinese Linguistic School of Phoenix', zh: '鳳凰城中文學校' },
    eyebrow: { en: 'Traditional Chinese · Sunday classes', zh: '繁體中文 · 週日課程' },
    city: 'Mesa',
    address: 'Mesa Community College, 1833 W. Southern Ave.',
    imageUrl: '/community/schools/chinese-linguistic-school-of-phoenix.webp',
    imagePosition: '50% 42%',
    summary: {
      en: 'A nonprofit Chinese school serving Greater Phoenix families with language and culture classes at Mesa Community College.',
      zh: '服務大鳳凰城家庭的非營利中文學校，在 Mesa Community College 開設語言與文化課程。',
    },
    details: [
      { en: 'Traditional Chinese emphasis', zh: '以繁體中文教學為主' },
      { en: 'Open to Chinese and non-Chinese speakers', zh: '華語與非華語背景學生皆可參加' },
      { en: 'Fall 2026 term listed for August 23', zh: '官網列出 2026 秋季班 8 月 23 日開課' },
    ],
    href: '/business/chinese-linguistic-school-of-phoenix-mesa',
    hrefLabel: { en: 'View school', zh: '查看學校' },
  },
  {
    kind: 'school',
    title: { en: 'AZ Hope Chinese School', zh: '亞省希望中文學校' },
    eyebrow: { en: 'East Valley Chinese learning', zh: '東谷中文教育' },
    city: 'Chandler',
    address: 'Chandler-Gilbert Community College Pecos Campus',
    imageUrl: '/community/schools/az-hope-chinese-school.jpg',
    imagePosition: '50% 42%',
    summary: {
      en: 'A Chandler-area Chinese school for families looking for weekend language, culture, and community learning.',
      zh: '位於 Chandler 一帶的中文學校，適合尋找週末語言、文化與社群學習的家庭。',
    },
    details: [
      { en: 'East Valley location', zh: '東谷上課地點' },
      { en: 'Language and cultural activities', zh: '中文與文化活動' },
      { en: 'Check the school site for current registration', zh: '請以學校官網的最新報名資訊為準' },
    ],
    href: '/business/az-hope-chinese-school-chandler',
    hrefLabel: { en: 'View school', zh: '查看學校' },
  },
  {
    kind: 'school',
    title: { en: 'Contemporary Chinese School of Arizona', zh: '亞省現代中文學校' },
    eyebrow: { en: 'Tempe enrichment', zh: 'Tempe 課後充實' },
    city: 'Tempe',
    address: '851 S. Cady Mall',
    imageUrl: '/community/schools/contemporary-chinese-school-of-arizona.jpg',
    imagePosition: '50% 46%',
    summary: {
      en: 'A Tempe-based weekend school with Chinese language, math, and cultural enrichment for local families.',
      zh: '位於 Tempe 的週末學校，提供中文、數學與文化課程給在地家庭。',
    },
    details: [
      { en: 'ASU-area location', zh: 'ASU 周邊地點' },
      { en: 'Academic and cultural classes', zh: '學科與文化課程' },
      { en: 'Useful for families near Tempe and Chandler', zh: '適合 Tempe、Chandler 一帶家庭' },
    ],
    href: '/business/contemporary-chinese-school-of-arizona-tempe',
    hrefLabel: { en: 'View school', zh: '查看學校' },
  },
  {
    kind: 'school',
    title: { en: 'Tucson Chinese School', zh: '圖森中文學校' },
    eyebrow: { en: 'Southern Arizona anchor', zh: '南亞利桑那據點' },
    city: 'Tucson',
    address: 'Tucson Chinese Cultural Center, 1288 W. River Rd.',
    imageUrl: '/community/schools/tucson-chinese-school.webp',
    imagePosition: '50% 42%',
    summary: {
      en: 'A long-running Tucson school with preschool, youth, adult Chinese, and culture classes at the Chinese Cultural Center.',
      zh: '歷史悠久的 Tucson 中文學校，在中華文化中心開設幼兒、青少年、成人中文與文化課。',
    },
    details: [
      { en: 'Founded in 1950', zh: '創立於 1950 年' },
      { en: 'Simplified, Traditional, and adult tracks', zh: '簡體、繁體與成人課程' },
      { en: 'Culture classes include arts and sports', zh: '文化課包含藝術與運動項目' },
    ],
    href: '/business/tucson-chinese-school-tucson',
    hrefLabel: { en: 'View school', zh: '查看學校' },
  },
];

const churches: CommunityResource[] = [
  {
    kind: 'church',
    title: { en: 'First Chinese Baptist Church', zh: '鳳凰城第一華人浸信會' },
    eyebrow: { en: 'English and Mandarin services', zh: '英文與華語崇拜' },
    city: 'Phoenix',
    address: '4910 E. Earll Dr.',
    imageUrl: '/community/churches/first-chinese-baptist-church.jpg',
    imagePosition: '50% 44%',
    summary: {
      en: 'A long-standing Chinese church in the Phoenix Arcadia area with English and Mandarin Sunday worship.',
      zh: '位於 Phoenix Arcadia 一帶的老牌華人教會，週日有英文與華語崇拜。',
    },
    details: [
      { en: 'English service listed at 9:30 AM', zh: '英文崇拜列為上午 9:30' },
      { en: 'Chinese service listed at 11:00 AM', zh: '中文崇拜列為上午 11:00' },
      { en: 'Small groups and family ministries', zh: '小組與家庭事工' },
    ],
    href: '/business/first-chinese-baptist-church-phoenix',
    hrefLabel: { en: 'View church', zh: '查看教會' },
  },
  {
    kind: 'church',
    title: { en: 'Greater Phoenix Chinese Christian Church', zh: '鳳城華人基督教會' },
    eyebrow: { en: 'Chandler Mandarin and English community', zh: 'Chandler 華語與英文社群' },
    city: 'Chandler',
    address: '890 W. Ray Rd.',
    imageUrl: '/community/churches/greater-phoenix-chinese-christian-church.png',
    imagePosition: '50% 46%',
    summary: {
      en: 'A Chandler Chinese Christian church for families looking for Mandarin, English, and East Valley fellowship.',
      zh: 'Chandler 華人基督教會，適合尋找華語、英文與東谷團契的家庭。',
    },
    details: [
      { en: 'Mandarin and English language listing', zh: '資料列有華語與英文聚會' },
      { en: 'Central East Valley location', zh: '東谷核心位置' },
      { en: 'Confirm service times before visiting', zh: '到訪前請確認最新聚會時間' },
    ],
    href: 'http://chinese.gpccc.org',
    hrefLabel: { en: 'Visit site', zh: '前往官網' },
  },
  {
    kind: 'church',
    title: { en: 'Metro Phoenix Chinese Alliance Church', zh: '大鳳凰城華人宣道會' },
    eyebrow: { en: 'Tempe Cantonese and English services', zh: 'Tempe 粵語與英文崇拜' },
    city: 'Tempe',
    address: '1341 E. University Dr.',
    imageUrl: '/community/churches/metro-phoenix-chinese-alliance-church.png',
    imagePosition: '50% 48%',
    summary: {
      en: 'A Tempe Chinese Alliance church with Cantonese and English Sunday services and children ministry references.',
      zh: '位於 Tempe 的華人宣道會，資料列有粵語、英文週日崇拜與兒童事工。',
    },
    details: [
      { en: 'Cantonese service listed at 9:45 AM', zh: '粵語崇拜列為上午 9:45' },
      { en: 'English service listed at 12:30 PM', zh: '英文崇拜列為下午 12:30' },
      { en: 'Near ASU and central Tempe', zh: '鄰近 ASU 與 Tempe 核心區' },
    ],
    href: 'http://www.mpcac.org',
    hrefLabel: { en: 'Visit site', zh: '前往官網' },
  },
  {
    kind: 'church',
    title: { en: 'Tucson Christian Mandarin Church', zh: '圖森華語基督教會' },
    eyebrow: { en: 'Tucson Mandarin church', zh: 'Tucson 華語教會' },
    city: 'Tucson',
    address: '1501 N. Sahuara Ave.',
    imageUrl: '/community/churches/tucson-christian-mandarin-church.jpg',
    imagePosition: '50% 36%',
    summary: {
      en: 'A Tucson Mandarin church and Chinese school connection point for Southern Arizona families.',
      zh: 'Tucson 華語教會，也連結中文學校資源，服務南亞利桑那家庭。',
    },
    details: [
      { en: 'Mandarin church community', zh: '華語教會社群' },
      { en: 'Chinese school information available', zh: '提供中文學校資訊' },
      { en: 'Useful Tucson-area newcomer anchor', zh: '適合作為 Tucson 新居民據點' },
    ],
    href: '/business/tucson-christian-mandarin-church-tucson',
    hrefLabel: { en: 'View church', zh: '查看教會' },
  },
];

const pingPongClubs: CommunityResource[] = [
  {
    kind: 'pingpong',
    title: { en: 'Phoenix Table Tennis Club', zh: '鳳凰城乒乓球俱樂部' },
    eyebrow: { en: 'League and open play', zh: '聯賽與開放練習' },
    city: 'Phoenix',
    address: 'Arizona Recreation Center for the Handicapped',
    imageUrl: '/community/pingpong/phoenix-table-tennis-club.jpg',
    imagePosition: '50% 48%',
    summary: {
      en: 'A nonprofit table tennis club founded in 1947 with weekly activities, league play, and visitor-friendly open play.',
      zh: '創立於 1947 年的非營利乒乓球俱樂部，提供例行活動、聯賽與訪客開放練習。',
    },
    details: [
      { en: 'First-time visitors are welcomed by the club', zh: '俱樂部歡迎第一次到訪者' },
      { en: 'Hosts Arizona tournament play', zh: '承辦亞利桑那賽事' },
      { en: 'Check closures and schedules before going', zh: '出發前請確認休館與活動時間' },
    ],
    href: 'https://www.phoenixtabletennisclub.org/',
    hrefLabel: { en: 'Visit club', zh: '前往俱樂部' },
  },
  {
    kind: 'pingpong',
    title: { en: 'Arizona State Table Tennis Club', zh: '亞利桑那州立大學乒乓球社' },
    eyebrow: { en: 'ASU student club', zh: 'ASU 學生社團' },
    city: 'Tempe',
    address: 'Sun Devil Fitness Complex',
    imageUrl: '/community/pingpong/arizona-state-table-tennis-club.png',
    imagePosition: '50% 52%',
    summary: {
      en: 'The ASU table tennis club gives students and nearby players a campus-based place to find practice and open play.',
      zh: 'ASU 乒乓球社讓學生與附近球友能在校園內找到練習與開放打球機會。',
    },
    details: [
      { en: 'Campus recreation setting', zh: '校園運動場域' },
      { en: 'Open play information is posted online', zh: '開放練習資訊可在線上查詢' },
      { en: 'Best fit for ASU students and Tempe players', zh: '適合 ASU 學生與 Tempe 球友' },
    ],
    href: 'https://pongspace.com/clubs/arizona-state-table-tennis-club/',
    hrefLabel: { en: 'View club', zh: '查看社團' },
  },
  {
    kind: 'pingpong',
    title: { en: 'University of Arizona Table Tennis', zh: '亞利桑那大學乒乓球社' },
    eyebrow: { en: 'Tucson college club', zh: 'Tucson 大學社團' },
    city: 'Tucson',
    address: 'University of Arizona Campus Recreation',
    imageUrl: '/community/pingpong/university-of-arizona-table-tennis.jpg',
    imagePosition: '50% 50%',
    summary: {
      en: 'A University of Arizona club sport for open play, collegiate competition, and Tucson student community.',
      zh: '亞利桑那大學俱樂部運動項目，提供開放練習、大學賽事與 Tucson 學生社群。',
    },
    details: [
      { en: 'Competes through college table tennis channels', zh: '參與大學乒乓球賽事系統' },
      { en: 'Lists club officers and contact email', zh: '列有社團幹部與聯絡信箱' },
      { en: 'Good Tucson student entry point', zh: '適合 Tucson 學生入門' },
    ],
    href: 'https://rec.arizona.edu/sports/club-sports/table-tennis',
    hrefLabel: { en: 'Visit club', zh: '前往社團' },
  },
  {
    kind: 'pingpong',
    title: { en: 'Southern Arizona Table Tennis Association', zh: '南亞利桑那乒乓球協會' },
    eyebrow: { en: 'Tucson-area club network', zh: 'Tucson 地區俱樂部網絡' },
    city: 'Tucson',
    address: 'Southern Arizona',
    imageUrl: '/community/pingpong/southern-arizona-table-tennis-association.jpg',
    summary: {
      en: 'A practical hub for Southern Arizona table tennis schedules, club links, ratings, and tournament notes.',
      zh: '南亞利桑那乒乓球資訊入口，整理練球時間、俱樂部連結、積分與賽事消息。',
    },
    details: [
      { en: 'Regional schedules and club listings', zh: '地區時間表與俱樂部名單' },
      { en: 'Useful when Tucson venue times change', zh: 'Tucson 場地時間變動時很實用' },
      { en: 'Best for regular players', zh: '適合固定打球者' },
    ],
    href: 'https://sattaonline.org/',
    hrefLabel: { en: 'View network', zh: '查看網絡' },
  },
];

const eventSpotlights: EventSpotlight[] = [
  {
    title: { en: 'Phoenix Wushu Nationals 2026', zh: '2026 鳳凰城武術全國賽' },
    eyebrow: { en: 'Chinese martial arts', zh: '中華武術' },
    dateLabel: { en: 'May 23-24, 2026', zh: '2026 年 5 月 23-24 日' },
    city: 'Phoenix',
    venue: { en: 'Phoenix Convention Center South Building', zh: 'Phoenix Convention Center South Building' },
    imageUrl: '/community/events/phoenix-wushu-nationals.jpg',
    imagePosition: '50% 42%',
    summary: {
      en: 'A national Chinese martial arts competition with athlete events, performances, lion dance, and vendor activity.',
      zh: '全國性中華武術賽事，包含選手比賽、表演、舞獅與攤商活動。',
    },
    href: 'https://www.phoenixwushunationals.com/',
    hrefLabel: { en: 'Event site', zh: '活動官網' },
  },
  {
    title: { en: 'Arizona State Table Tennis Championship', zh: '亞利桑那州乒乓球錦標賽' },
    eyebrow: { en: 'Tournament watch', zh: '賽事關注' },
    dateLabel: { en: 'July 25-26, 2026', zh: '2026 年 7 月 25-26 日' },
    city: 'Phoenix',
    venue: { en: 'Hosted by Phoenix Table Tennis Club', zh: 'Phoenix Table Tennis Club 主辦' },
    imageUrl: '/community/events/arizona-state-table-tennis-championship.jpg',
    imagePosition: '50% 50%',
    summary: {
      en: 'A useful event for players who want serious matches, ratings, and a reason to meet the broader Arizona table tennis circle.',
      zh: '適合想打正式比賽、累積積分並認識亞利桑那乒乓球圈的球友。',
    },
    href: 'https://www.phoenixtabletennisclub.org/index.php?p=tou&sitelg=en',
    hrefLabel: { en: 'Tournament page', zh: '賽事頁面' },
  },
  {
    title: { en: 'Phoenix Chinese Week Lunar New Year Festival', zh: '鳳凰城中國周農曆新年文化節' },
    eyebrow: { en: 'Annual cultural festival', zh: '年度文化節' },
    dateLabel: { en: '2026 edition: Feb. 14-15', zh: '2026 場次：2 月 14-15 日' },
    city: 'Phoenix',
    venue: { en: 'Heritage Square', zh: 'Heritage Square' },
    imageUrl: '/community/events/phoenix-chinese-week.jpg',
    imagePosition: '50% 46%',
    summary: {
      en: 'The largest recurring Chinese New Year anchor in downtown Phoenix, with performances, food, exhibits, and family activities.',
      zh: '鳳凰城市中心最具代表性的年度春節活動，包含表演、美食、展區與親子活動。',
    },
    href: 'https://phoenixchineseweek.org/pages/festival-details',
    hrefLabel: { en: 'Festival page', zh: '文化節頁面' },
  },
  {
    title: { en: 'Arizona Dragon Boat Festival', zh: '亞利桑那龍舟節' },
    eyebrow: { en: 'Tempe water festival', zh: 'Tempe 水上文化節' },
    dateLabel: { en: '2026 edition: Mar. 28-29', zh: '2026 場次：3 月 28-29 日' },
    city: 'Tempe',
    venue: { en: 'Tempe Town Lake', zh: 'Tempe Town Lake' },
    imageUrl: '/community/events/arizona-dragon-boat-festival.jpg',
    imagePosition: '50% 50%',
    summary: {
      en: 'A Tempe Town Lake weekend built around dragon boat racing, teamwork, culture, and regional community turnout.',
      zh: '在 Tempe Town Lake 舉辦的龍舟週末，結合競賽、團隊精神、文化與地區社群參與。',
    },
    href: 'https://azdba.org/festival/',
    hrefLabel: { en: 'Festival page', zh: '活動頁面' },
  },
];

function copy(locale: Locale, value: LocalizedText): string {
  return t(value, locale);
}

function oppositeCopy(locale: Locale, value: LocalizedText): string {
  return locale === 'zh' ? value.en : value.zh ?? value.en;
}

function resourceHref(locale: Locale, href: string): string {
  return href.startsWith('/') ? withLocale(locale, href) : href;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function formatEventDate(event: Event, locale: Locale): string {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : null;

  if (Number.isNaN(start.getTime())) {
    return event.startDate;
  }

  const formatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Phoenix',
  });

  if (!end || Number.isNaN(end.getTime())) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function DetailLink({
  href,
  locale,
  children,
  className,
}: {
  href: string;
  locale: Locale;
  children: React.ReactNode;
  className?: string;
}) {
  const resolvedHref = resourceHref(locale, href);
  const external = isExternalHref(href);
  const defaultClassName =
    'inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700';

  if (external) {
    return (
      <a
        href={resolvedHref}
        target="_blank"
        rel="noreferrer"
        className={className ?? defaultClassName}
      >
        {children}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link href={resolvedHref} className={className ?? defaultClassName}>
      {children}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function ResourceCard({ resource, locale }: { resource: CommunityResource; locale: Locale }) {
  return (
    <article className="homepage-card group overflow-hidden rounded-[20px] border border-[#e3d3c2] bg-[#fffdfa] shadow-[0_22px_50px_-42px_rgba(74,49,27,0.46)]">
      <div className="relative h-[162px] overflow-hidden bg-[#eadccf]">
        <img
          src={resource.imageUrl}
          alt={copy(locale, resource.title)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: resource.imagePosition ?? 'center' }}
          loading={resource.kind === 'pingpong' ? 'eager' : 'lazy'}
          decoding="async"
        />
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(38,27,21,0)_0%,rgba(38,27,21,0.82)_100%)] px-4 pb-3 pt-12 text-white">
          <h3 className="text-[1.18rem] font-semibold leading-tight tracking-tight">
            {copy(locale, resource.title)}
          </h3>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#7b685c]">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            {resource.city}
          </span>
          {resource.address ? <span className="truncate">{resource.address}</span> : null}
        </div>

        <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-[#5f4e43]">
          {copy(locale, resource.summary)}
        </p>

        <ul className="mt-4 space-y-2 border-t border-[#eadbcc] pt-4">
          {resource.details.map((detail) => (
            <li key={detail.en} className="flex gap-2 text-[13px] leading-5 text-[#69574c]">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
              <span>{copy(locale, detail)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <DetailLink href={resource.href} locale={locale}>
            {copy(locale, resource.hrefLabel)}
          </DetailLink>
        </div>
      </div>
    </article>
  );
}

function EventSpotlightCard({ event, locale }: { event: EventSpotlight; locale: Locale }) {
  return (
    <article className="homepage-card group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#e3d3c2] bg-[#fffdfa] shadow-[0_22px_50px_-42px_rgba(74,49,27,0.46)]">
      <div className="relative h-[154px] overflow-hidden bg-[#e7d7c9]">
        <img
          src={event.imageUrl}
          alt={copy(locale, event.title)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: event.imagePosition ?? 'center' }}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="flex flex-1 flex-col px-4 py-4">
        <h3 className="text-[1.24rem] font-semibold leading-tight tracking-tight text-[#261b15]">
          {copy(locale, event.title)}
        </h3>
        <div className="mt-3 space-y-1.5 text-[13px] text-[#725f53]">
          <p className="inline-flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            {copy(locale, event.dateLabel)}
          </p>
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            {event.city} · {copy(locale, event.venue)}
          </p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#5f4e43]">{copy(locale, event.summary)}</p>
        <div className="mt-auto pt-5">
          <DetailLink href={event.href} locale={locale}>
            {copy(locale, event.hrefLabel)}
          </DetailLink>
        </div>
      </div>
    </article>
  );
}

function PublishedEventLink({ event, locale }: { event: Event; locale: Locale }) {
  return (
    <Link
      href={withLocale(locale, `/community/events/${event.slug}`)}
      className="homepage-card flex items-center justify-between gap-4 rounded-[18px] border border-[#e3d3c2] bg-[#fffdfa] px-4 py-3 transition-colors hover:border-brand-200 hover:text-brand-600"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#2e221c]">{copy(locale, event.title)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#806d61]">
          <span>{formatEventDate(event, locale)}</span>
          <span>{event.city}</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden="true" />
    </Link>
  );
}

export function CommunityPageView({ locale, site = defaultSiteProfile }: CommunityPageViewProps) {
  if (site.key !== defaultSiteProfile.key) {
    return (
      <div className="flex-1 overflow-x-hidden bg-transparent px-6 py-12 text-[#261b15] sm:px-8 xl:px-10">
        <EmptyState
          title={
            locale === 'zh'
              ? `${site.brandName} 社群內容尚未接入`
              : `${site.brandName} community content is not connected yet`
          }
          description={
            locale === 'zh'
              ? '此城市設定必須先接入自己的學校、教會、活動與商家資料；平台不会回退顯示 ChineseArizona 社群內容。'
              : 'This city config must connect its own schools, churches, events, and business data first; the platform will not fall back to ChineseArizona community content.'
          }
        />
      </div>
    );
  }

  const publishedEvents = getEvents().slice(0, 4);

  return (
    <div className="flex-1 overflow-x-hidden bg-transparent text-[#261b15]">
      <section className="overflow-hidden border-b border-[#dccbbb] bg-[#fcf8f1]">
        <div className="grid xl:grid-cols-[0.92fr_1.08fr]">
          <div className="relative z-20 flex flex-col justify-center px-6 py-10 sm:px-8 xl:px-10 xl:py-12">
            <p className="homepage-rise text-[12px] font-semibold uppercase tracking-[0.26em] text-brand-600">
              {copy(locale, { en: 'Community', zh: '社區' })}
            </p>
            <h1
              className="homepage-rise homepage-rise-delay-1 mt-3 max-w-[16ch] text-[3.45rem] leading-[0.9] tracking-[-0.045em] text-[#2c2019] sm:text-[4.25rem] xl:text-[5.1rem] [font-family:var(--font-display)] [font-weight:900]"
              style={{
                WebkitTextStroke: '0.55px rgba(44, 32, 25, 0.5)',
                textShadow: '0.015em 0 0 rgba(44, 32, 25, 0.22)',
              }}
            >
              {copy(locale, { en: 'Find your people in Arizona.', zh: '在亞利桑那找到你的社群。' })}
            </h1>
            <p className="homepage-rise homepage-rise-delay-2 mt-4 max-w-[38rem] text-[1.12rem] font-semibold leading-8 text-brand-700 sm:text-[1.28rem]">
              {oppositeCopy(locale, {
                en: 'Schools, churches, ping pong clubs, and real events in one bilingual guide.',
                zh: '學校、教會、乒乓球俱樂部與真實活動，一頁整理。',
              })}
            </p>

            <div className="homepage-rise homepage-rise-delay-3 mt-7 flex flex-wrap gap-3">
              <Link
                href="#schools"
                className="inline-flex items-center gap-2 rounded-[16px] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(187,61,41,0.86)] transition-colors hover:bg-brand-700"
              >
                {copy(locale, { en: 'Explore resources', zh: '探索資源' })}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#events"
                className="inline-flex items-center gap-2 rounded-[16px] border border-[#d9c8b6] bg-[#fffaf3] px-5 py-3 text-sm font-semibold text-[#352820] transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {copy(locale, { en: 'See events', zh: '查看活動' })}
              </Link>
            </div>

          </div>

          <div className="homepage-rise homepage-rise-delay-2 relative min-h-[420px] overflow-hidden bg-[#b06a35] xl:min-h-[560px]">
            <img
              src="/community/events/phoenix-chinese-week.jpg"
              alt={copy(locale, { en: 'Phoenix Chinese Week festival lion dance', zh: '鳳凰城中國周舞獅文化節' })}
              className="absolute inset-0 h-full w-full object-cover object-[50%_46%]"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(48,28,17,0.62)_0%,rgba(48,28,17,0.14)_42%,rgba(48,28,17,0.04)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(48,28,17,0)_0%,rgba(48,28,17,0.26)_100%)]" />
          </div>
        </div>
      </section>

      <section id="schools" className="border-b border-[#dccbbb] bg-[#fcf8f1] px-6 py-12 sm:px-8 xl:px-10">
        <h2 className="text-[2.05rem] font-semibold leading-none tracking-tight text-[#261b15] sm:text-[2.55rem] [font-family:var(--font-display)]">
          {copy(locale, { en: 'Chinese Schools', zh: '中文學校' })}
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {schools.map((school) => (
            <ResourceCard key={school.title.en} resource={school} locale={locale} />
          ))}
        </div>
      </section>

      <section id="churches" className="border-b border-[#dccbbb] bg-[#f6eadc] px-6 py-12 sm:px-8 xl:px-10">
        <h2 className="text-[2.05rem] font-semibold leading-none tracking-tight text-[#261b15] sm:text-[2.55rem] [font-family:var(--font-display)]">
          {copy(locale, { en: 'Chinese Churches', zh: '華人教會' })}
        </h2>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {churches.map((church) => (
            <ResourceCard key={church.title.en} resource={church} locale={locale} />
          ))}
        </div>
      </section>

      <section id="ping-pong" className="border-b border-[#dccbbb] bg-[#fcf8f1] px-6 py-12 sm:px-8 xl:px-10">
        <h2 className="text-[2.05rem] font-semibold leading-none tracking-tight text-[#261b15] sm:text-[2.55rem] [font-family:var(--font-display)]">
          {copy(locale, { en: 'Ping Pong Clubs', zh: '乒乓球俱樂部' })}
        </h2>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pingPongClubs.map((club) => (
            <ResourceCard key={club.title.en} resource={club} locale={locale} />
          ))}
        </div>
      </section>

      <section id="events" className="border-b border-[#dccbbb] bg-[#f6eadc] px-6 py-12 sm:px-8 xl:px-10">
        <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr]">
          <div>
            <h2 className="text-[2.05rem] font-semibold leading-none tracking-tight text-[#261b15] sm:text-[2.55rem] [font-family:var(--font-display)]">
              {copy(locale, { en: 'Events', zh: '活動' })}
            </h2>

            <div className="mt-7 rounded-[24px] border border-[#ddcbb8] bg-[#fffaf3] p-5">
              <p className="text-sm font-semibold text-[#2c2019]">
                {copy(locale, { en: 'Published on ChineseArizona', zh: 'ChineseArizona 已收錄活動' })}
              </p>
              <div className="mt-4 space-y-3">
                {publishedEvents.map((event) => (
                  <PublishedEventLink key={event.slug} event={event} locale={locale} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {eventSpotlights.map((event) => (
              <EventSpotlightCard key={event.title.en} event={event} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fcf8f1] px-6 py-12 sm:px-8 xl:px-10">
        <div className="grid items-center gap-7 rounded-[28px] border border-[#e0d0bf] bg-[#fffaf3] p-6 shadow-[0_24px_55px_-44px_rgba(72,49,27,0.45)] md:grid-cols-[1fr_auto] md:p-8">
          <div>
            <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-[#261b15] [font-family:var(--font-display)]">
              {copy(locale, { en: 'Know a school, church, club, or event we should add?', zh: '知道該加入的學校、教會、球社或活動嗎？' })}
            </h2>
          </div>

          <Link
            href={withLocale(locale, '/add-business')}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(187,61,41,0.88)] transition-colors hover:bg-brand-700"
          >
            {copy(locale, { en: 'Submit a resource', zh: '提交資源' })}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
