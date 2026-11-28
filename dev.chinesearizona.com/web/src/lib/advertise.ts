import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

export const advertisePath = '/advertise';

// WeChat ID for advertising inquiries, shared by every city site.
// TODO(Derek): put the WeChat ID between the quotes. While it is empty, the
// Advertise page shows a "WeChat ID coming soon" note instead of an ID.
export const advertiseWeChatId = '';

export type AdvertiseText = { en: string; zh: string };

export type AdvertisePriceInterval = 'year' | 'month' | 'week' | 'send' | 'one-time';

export type AdvertisePrice = {
  amountUsd: number;
  interval: AdvertisePriceInterval;
};

export const advertisePlanIds = [
  'basic-listing',
  'enhanced-listing',
  'sponsored-category',
  'boost',
  'homepage-spotlight',
  'bilingual-write-up',
  'newsletter-slot',
  'sponsored-article',
] as const;

export type AdvertisePlanId = (typeof advertisePlanIds)[number];

export type AdvertisePlan = {
  id: AdvertisePlanId;
  name: AdvertiseText;
  // Empty means the plan is free.
  prices: AdvertisePrice[];
  // Founding sponsor offer (first 10 businesses), when the plan has one.
  foundingOffer?: AdvertiseText;
  summary: AdvertiseText;
  includes: AdvertiseText[];
  // Paid placements always carry the "Sponsored / 贊助" label.
  labeledSponsored: boolean;
};

export type AdvertiseInquiryInput = {
  name: string;
  businessName: string;
  contact: string;
  planId?: string;
  message?: string;
};

export const sponsoredLabel = 'Sponsored / 贊助';
export const featuredLabel = 'Featured / 精選';

function pick(locale: Locale, text: AdvertiseText): string {
  return locale === 'zh' ? text.zh : text.en;
}

// Plans an owner can pay for online from the dashboard (#408). Only sites whose
// listings live in the database have owner dashboards, so city sites that read
// static listings keep the inquiry form for every plan.
export const onlineCheckoutPlanIds: readonly AdvertisePlanId[] = ['enhanced-listing', 'sponsored-category'];

export function hasOnlineCheckout(site: SiteProfile = defaultSiteProfile): boolean {
  return hasLiveDirectoryData(site);
}

export function isOnlineCheckoutPlan(planId: AdvertisePlanId, site: SiteProfile = defaultSiteProfile): boolean {
  return hasOnlineCheckout(site) && onlineCheckoutPlanIds.includes(planId);
}

export function isAdvertisePlanId(value: unknown): value is AdvertisePlanId {
  return typeof value === 'string' && advertisePlanIds.includes(value as AdvertisePlanId);
}

function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

const intervalSuffix: Record<AdvertisePriceInterval, AdvertiseText> = {
  year: { en: '/year', zh: '／年' },
  month: { en: '/month', zh: '／月' },
  week: { en: '/week', zh: '／週' },
  send: { en: ' per send', zh: '／每期' },
  'one-time': { en: ' one time', zh: '（一次性）' },
};

export function formatAdvertisePrice(price: AdvertisePrice, locale: Locale): string {
  return `${formatUsd(price.amountUsd)}${pick(locale, intervalSuffix[price.interval])}`;
}

export function formatAdvertisePlanPrice(plan: AdvertisePlan, locale: Locale): string {
  if (plan.prices.length === 0) {
    return locale === 'zh' ? '免費' : 'Free';
  }

  return plan.prices
    .map((price) => formatAdvertisePrice(price, locale))
    .join(locale === 'zh' ? ' 或 ' : ' or ');
}

// Launch prices approved by Derek on Nov 25, 2026 (#408 / #409).
export function getAdvertisePlans(site: SiteProfile = defaultSiteProfile): AdvertisePlan[] {
  return [
    {
      id: 'basic-listing',
      name: { en: 'Basic bilingual listing', zh: '基本雙語商家頁' },
      prices: [],
      summary: {
        en: 'Your business in the directory in English and Chinese. Claiming your page stays free.',
        zh: '你的商家以中英雙語列在目錄中。認領商家頁面永遠免費。',
      },
      includes: [
        { en: 'Name, address, phone, hours and category', zh: '名稱、地址、電話、營業時間與分類' },
        { en: 'Free owner claim and updates after review', zh: '審核後可免費認領與更新資料' },
      ],
      labeledSponsored: false,
    },
    {
      id: 'enhanced-listing',
      name: { en: 'Enhanced listing', zh: '進階商家頁' },
      prices: [{ amountUsd: 199, interval: 'year' }],
      foundingOffer: {
        en: 'Founding offer: $99/year for the first 10 businesses',
        zh: '創始優惠：前 10 家商家 $99／年',
      },
      summary: {
        en: 'A fuller page that helps customers choose you.',
        zh: '更完整的商家頁，幫助顧客選擇你。',
      },
      includes: [
        { en: 'Logo and more photos', zh: '商標與更多照片' },
        { en: 'Description in both English and Chinese', zh: '中英雙語商家介紹' },
        { en: 'Verified badge once we confirm your details', zh: '確認資料後顯示驗證標章' },
      ],
      labeledSponsored: false,
    },
    {
      id: 'sponsored-category',
      name: { en: 'Sponsored category spot', zh: '分類贊助版位' },
      prices: [
        { amountUsd: 59, interval: 'month' },
        { amountUsd: 590, interval: 'year' },
      ],
      foundingOffer: {
        en: 'Founding offer: half price ($29.50/month or $295/year) for the first 10 businesses',
        zh: '創始優惠：前 10 家商家半價（$29.50／月 或 $295／年）',
      },
      summary: {
        en: `One of the top 3 spots in a ${site.regionName} category, always labeled "${sponsoredLabel}".`,
        zh: `${site.regionNameZh}分類頁前 3 名版位之一，一律標示「${sponsoredLabel}」。`,
      },
      includes: [
        { en: 'Top-3 placement in one category', zh: '單一分類前 3 名曝光' },
        { en: `Clearly labeled ${sponsoredLabel}`, zh: `清楚標示 ${sponsoredLabel}` },
        { en: 'No effect on reviews, ratings or verification', zh: '不影響評論、評分或驗證狀態' },
      ],
      labeledSponsored: true,
    },
    {
      id: 'boost',
      name: { en: 'Short boost', zh: '短期加強曝光' },
      prices: [{ amountUsd: 15, interval: 'week' }],
      summary: {
        en: 'A one-week push for an opening, a sale or an event.',
        zh: '為開幕、促銷或活動加強曝光一週。',
      },
      includes: [
        { en: 'Higher placement in your category for 7 days', zh: '7 天內在分類中提升排序' },
        { en: `Labeled ${sponsoredLabel}`, zh: `標示 ${sponsoredLabel}` },
      ],
      labeledSponsored: true,
    },
    {
      id: 'homepage-spotlight',
      name: { en: 'Homepage spotlight', zh: '首頁焦點版位' },
      prices: [{ amountUsd: 149, interval: 'month' }],
      summary: {
        en: `Your business on the ${site.brandName} homepage for a month.`,
        zh: `你的商家在 ${site.brandName} 首頁展示一個月。`,
      },
      includes: [
        { en: 'Bilingual card with a photo and a link to your page', zh: '附照片與商家頁連結的雙語卡片' },
        { en: `Labeled ${sponsoredLabel}`, zh: `標示 ${sponsoredLabel}` },
      ],
      labeledSponsored: true,
    },
    {
      id: 'bilingual-write-up',
      name: { en: 'Done-for-you bilingual write-up', zh: '代寫雙語商家介紹' },
      prices: [{ amountUsd: 149, interval: 'one-time' }],
      foundingOffer: {
        en: 'Free with a founding-year plan',
        zh: '購買創始年度方案即免費贈送',
      },
      summary: {
        en: 'We write your listing in natural English and Traditional Chinese.',
        zh: '我們為你撰寫自然流暢的英文與繁體中文商家介紹。',
      },
      includes: [
        { en: 'Written from your details', zh: '依你提供的資料撰寫' },
        { en: 'You approve it before it goes live', zh: '經你確認後才上線' },
      ],
      labeledSponsored: false,
    },
    {
      id: 'newsletter-slot',
      name: { en: 'Newsletter sponsor slot', zh: '電子報贊助版位' },
      prices: [{ amountUsd: 50, interval: 'send' }],
      summary: {
        en: 'A sponsor message in our community newsletter.',
        zh: '在社區電子報中刊登贊助訊息。',
      },
      includes: [
        { en: 'Short message with an image and a link', zh: '簡短文字、圖片與連結' },
        { en: `Labeled ${sponsoredLabel}`, zh: `標示 ${sponsoredLabel}` },
      ],
      labeledSponsored: true,
    },
    {
      id: 'sponsored-article',
      name: { en: 'Sponsored feature article', zh: '贊助專題文章' },
      prices: [{ amountUsd: 250, interval: 'one-time' }],
      summary: {
        en: 'A bilingual article about your business, clearly marked as sponsored.',
        zh: '介紹你商家的雙語文章，清楚標示為贊助內容。',
      },
      includes: [
        { en: 'Written by our team in English and Chinese', zh: '由我們團隊以中英文撰寫' },
        { en: `Marked ${sponsoredLabel} at the top`, zh: `文章開頭標示 ${sponsoredLabel}` },
      ],
      labeledSponsored: true,
    },
  ];
}

export function getAdvertisePageCopy(locale: Locale, site: SiteProfile = defaultSiteProfile) {
  const email = site.publisher.contactEmail;

  return {
    eyebrow: pick(locale, { en: site.brandName, zh: site.brandNameZh }),
    title: pick(locale, { en: 'Advertise with us', zh: '廣告合作' }),
    description: pick(locale, {
      en: `Reach Chinese-speaking families, newcomers and students across ${site.regionName}. Prices are published up front, and every paid spot is labeled.`,
      zh: `觸及${site.regionNameZh}的華人家庭、新移民與留學生。價格公開透明，所有付費版位都清楚標示。`,
    }),
    checkoutNote: hasOnlineCheckout(site)
      ? pick(locale, {
          en: 'Claimed businesses can buy the Enhanced listing and the Sponsored category spot online from their dashboard. For other plans, send an inquiry and we will set things up with you.',
          zh: '已認領的商家可在商家後台線上購買「進階商家頁」與「分類贊助版位」。其他方案請送出詢問，我們會與你聯絡安排。',
        })
      : pick(locale, {
          en: 'Online checkout is coming soon. For now, send an inquiry and we will set things up with you.',
          zh: '線上付款即將推出。目前請先送出詢問，我們會與你聯絡安排。',
        }),
    plansHeading: pick(locale, { en: 'Plans and prices', zh: '方案與價格' }),
    plansIntro: pick(locale, {
      en: 'All prices are in US dollars. Founding offers are for the first 10 businesses that sign up.',
      zh: '所有價格以美元計。創始優惠僅限前 10 家加入的商家。',
    }),
    sponsored: {
      heading: pick(locale, { en: 'What "Sponsored" means', zh: '「贊助」是什麼意思' }),
      body: pick(locale, {
        en: `Every paid placement is labeled "${sponsoredLabel}". Sponsorship changes where a listing appears, never what we say about the business.`,
        zh: `所有付費版位都會標示「${sponsoredLabel}」。贊助只會改變商家出現的位置，不會改變我們對商家的介紹。`,
      }),
      bullets: [
        pick(locale, {
          en: 'Reviews and ratings are never for sale. Paying does not add, remove or change any review or rating.',
          zh: '評論與評分絕不販售。付費不會新增、刪除或修改任何評論或評分。',
        }),
        pick(locale, {
          en: `The "${featuredLabel}" badge is chosen by our editors and is never sold.`,
          zh: `「${featuredLabel}」標章由編輯挑選，絕不販售。`,
        }),
        pick(locale, {
          en: 'Sponsorship does not change verification or editorial status.',
          zh: '贊助不會改變驗證或編輯狀態。',
        }),
        pick(locale, {
          en: 'Realtors and mortgage brokers pay flat advertising fees only, never a share of a deal or a referral fee.',
          zh: '房地產經紀人與貸款經紀人只支付固定廣告費，不收取任何成交分成或轉介費。',
        }),
      ],
    },
    refunds: {
      heading: pick(locale, { en: 'Refunds and cancellation', zh: '退款與取消政策' }),
      bullets: [
        pick(locale, {
          en: 'Yearly plans: full refund if you ask within 14 days of purchase.',
          zh: '年度方案：購買後 14 天內提出申請，可全額退款。',
        }),
        pick(locale, {
          en: 'Monthly and weekly plans: cancel anytime. Cancelling stops the next renewal, and your current period runs to its end.',
          zh: '月繳與週繳方案：可隨時取消。取消後不再自動續約，目前已付費的期間會持續到期末。',
        }),
        pick(locale, {
          en: 'Unused pay-per-click budget is refunded on request.',
          zh: '未使用的按點擊付費預算，可申請退還。',
        }),
        pick(locale, {
          en: 'One-time services can be cancelled for a full refund before we start the work.',
          zh: '一次性服務在我們開始製作前取消，可全額退款。',
        }),
        pick(locale, {
          en: `To cancel or ask for a refund, send us a message with the form below, or email ${email}.`,
          zh: `如需取消或退款，請用下方表單留言給我們，或寄信至 ${email}。`,
        }),
      ],
    },
    contact: {
      heading: pick(locale, { en: 'Talk to us', zh: '聯絡我們' }),
      intro: pick(locale, {
        en: 'Tell us a little about your business. We reply by email, phone or WeChat, whichever you prefer.',
        zh: '簡單介紹你的商家，我們會依你方便的方式，透過 Email、電話或微信回覆。',
      }),
      emailHeading: pick(locale, { en: 'Email', zh: '電子郵件' }),
      email,
      wechatHeading: pick(locale, { en: 'WeChat', zh: '微信' }),
      wechatId: advertiseWeChatId,
      wechatPending: pick(locale, {
        en: 'Our WeChat ID is coming soon. Leave your WeChat ID in the form and we will add you.',
        zh: '微信號即將公布。請在表單留下你的微信號，我們會主動加你。',
      }),
    },
    claimCta: pick(locale, { en: 'Claim your free listing', zh: '免費認領商家' }),
    buyCta: pick(locale, { en: 'Buy online in your dashboard', zh: '在商家後台線上購買' }),
    askCta: pick(locale, { en: 'Ask about this plan', zh: '詢問這個方案' }),
  };
}

// The inquiry form opens a ready-to-send email to the site's contact address,
// so nothing is stored on the server and nothing can be lost in transit.
export function buildAdvertiseInquiryMailto(
  input: AdvertiseInquiryInput,
  locale: Locale,
  site: SiteProfile = defaultSiteProfile
): string {
  const plan = getAdvertisePlans(site).find((item) => item.id === input.planId);
  const planLabel = plan
    ? `${plan.name.en} / ${plan.name.zh} (${formatAdvertisePlanPrice(plan, 'en')})`
    : 'Not sure yet / 尚未決定';
  const businessName = input.businessName.trim();
  const subject = `Advertising inquiry / 廣告合作詢問: ${businessName} (${site.brandName})`;
  const body = [
    `Name / 姓名: ${input.name.trim()}`,
    `Business / 商家: ${businessName}`,
    `Reach me at / 聯絡方式: ${input.contact.trim()}`,
    `Plan / 方案: ${planLabel}`,
    `Site / 網站: ${site.domain}`,
    `Language / 語言: ${locale === 'zh' ? '中文' : 'English'}`,
    '',
    input.message?.trim() ?? '',
  ]
    .join('\n')
    .trimEnd();

  return `mailto:${site.publisher.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
