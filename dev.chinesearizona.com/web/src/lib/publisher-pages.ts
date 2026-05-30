import type { Locale } from '@/lib/types';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';

export const publisherPageSlugs = [
  'about',
  'contact',
  'privacy',
  'terms',
  'editorial-policy',
] as const;

export type PublisherPageSlug = (typeof publisherPageSlugs)[number];

export type PublisherPageSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type PublisherPageCopy = {
  slug: PublisherPageSlug;
  title: string;
  eyebrow: string;
  description: string;
  updatedLabel?: string;
  sections: PublisherPageSection[];
};

export function isPublisherPageSlug(value: string): value is PublisherPageSlug {
  return publisherPageSlugs.includes(value as PublisherPageSlug);
}

function copy(locale: Locale, en: string, zh: string): string {
  return locale === 'zh' ? zh : en;
}

export function getPublisherPageCopy(
  slug: PublisherPageSlug,
  locale: Locale,
  site: SiteProfile = defaultSiteProfile
): PublisherPageCopy {
  const brandName = site.brandName;
  const regionName = site.regionName;
  const regionNameZh = site.regionNameZh;
  const domain = site.domain;
  const contactEmail = site.publisher.contactEmail;
  const updatedLabel = copy(locale, site.publisher.updatedLabel.en, site.publisher.updatedLabel.zh);

  if (slug === 'about') {
    return {
      slug,
      title: copy(locale, `About ${brandName}`, `關於 ${brandName}`),
      eyebrow: copy(locale, 'Publisher Profile', '平台介紹'),
      description: copy(
        locale,
        `${brandName} is a bilingual ${regionName} publisher and local guide for Chinese, Taiwanese, Mandarin-speaking, and Asia-connected residents, families, students, and business owners.`,
        `${brandName} 是服務${regionNameZh}華人、台灣人、中文使用者與亞洲連結家庭的雙語在地出版與生活指南。`
      ),
      sections: [
        {
          heading: copy(locale, 'What We Publish', '我們發布什麼'),
          body: [
            copy(
              locale,
              `We publish bilingual local guides, ${regionName} news explainers, relocation resources, community listings, event information, and a practical business directory focused on ${regionName} life.`,
              `我們發布雙語在地指南、${regionNameZh}新聞整理、搬遷資源、社群活動資訊，以及聚焦${regionNameZh}生活的實用商家目錄。`
            ),
            copy(
              locale,
              `The site is built for readers who need context, not just search results: where to find a Chinese school, how to compare neighborhoods, which local services support Mandarin speakers, and what ${regionName} updates matter to newcomer families.`,
              `這個網站是為需要脈絡的讀者而建，不只是搜尋結果：如何找中文學校、比較社區、尋找中文友善服務，以及哪些${regionNameZh}更新與新移民家庭有關。`
            ),
          ],
        },
        {
          heading: copy(locale, 'How We Build Listings', '商家資料如何建立'),
          body: [
            copy(
              locale,
              'Directory pages may combine owner submissions, public business information, local plaza research, community tips, and editorial review. Claimed, sponsored, and editor-verified signals are labeled separately so readers can understand why a listing appears.',
              '商家頁面可能整合商家主理人提交、公開商家資訊、商場資料研究、社群提示與人工編輯審核。認領、贊助與編輯驗證會分開標示，讓讀者了解列表出現原因。'
            ),
          ],
          bullets: [
            copy(locale, 'Sponsored placement does not change verification status.', '贊助排序不會改變驗證狀態。'),
            copy(locale, 'Incomplete listings are treated as utility references until more details are confirmed.', '資訊不足的列表會以工具型參考處理，直到補齊更多資料。'),
            copy(locale, 'Readers and owners can request corrections at any time.', '讀者與商家可隨時要求修正。'),
          ],
        },
        {
          heading: copy(locale, 'Ownership', '網站所有權'),
          body: [
            copy(
              locale,
              `${brandName} operates at ${domain}. The production domain is the site reviewed for publishing, advertising, and community access.`,
              `${brandName} 於 ${domain} 營運。正式主網域是發布、廣告審核與社群使用的主要網站。`
            ),
          ],
        },
      ],
    };
  }

  if (slug === 'contact') {
    return {
      slug,
      title: copy(locale, `Contact ${brandName}`, `聯絡 ${brandName}`),
      eyebrow: copy(locale, 'Corrections, Listings, Partnerships', '修正、商家、合作'),
      description: copy(
        locale,
        'Use this page for editorial corrections, business listing updates, ownership claims, community submissions, and advertising questions.',
        '可透過本頁聯絡我們進行內容修正、商家資料更新、商家認領、社群投稿與廣告合作詢問。'
      ),
      sections: [
        {
          heading: copy(locale, 'Email', '電子郵件'),
          body: [
            copy(
              locale,
              `For corrections, owner requests, privacy questions, and advertising inquiries, email ${contactEmail}.`,
              `如需內容修正、商家主理人申請、隱私問題或廣告合作，請寄信至 ${contactEmail}。`
            ),
          ],
        },
        {
          heading: copy(locale, 'Business Listings', '商家資料'),
          body: [
            copy(
              locale,
              'Business owners can use the Add Business flow to submit a new listing or claim an existing page. Claims are reviewed before ownership tools are enabled.',
              '商家主理人可使用「新增商家」流程提交新商家或認領既有頁面。認領會先經過審核，再開放管理功能。'
            ),
          ],
          bullets: [
            copy(locale, 'Send the business name, city, website, and the change requested.', '請附上商家名稱、城市、網站與需要修正的內容。'),
            copy(locale, 'For urgent safety or identity issues, include enough context for review.', '如涉及安全或身份問題，請提供足夠脈絡供審核。'),
          ],
        },
        {
          heading: copy(locale, 'Community Submissions', '社群投稿'),
          body: [
            copy(
              locale,
              `Events, school updates, nonprofit announcements, and local resource tips are welcome when they are relevant to ${regionName} readers and can be checked by an editor.`,
              `歡迎提交與${regionNameZh}讀者相關且可供編輯核對的活動、學校更新、非營利公告與在地資源線索。`
            ),
          ],
        },
      ],
    };
  }

  if (slug === 'privacy') {
    return {
      slug,
      title: copy(locale, 'Privacy Policy', '隱私權政策'),
      eyebrow: copy(locale, 'Data and Advertising Disclosure', '資料與廣告揭露'),
      description: copy(
        locale,
        `This policy explains what information ${brandName} collects, how it is used, and how advertising and analytics partners may process data.`,
        `本政策說明 ${brandName} 收集哪些資訊、如何使用，以及廣告與分析合作夥伴可能如何處理資料。`
      ),
      updatedLabel,
      sections: [
        {
          heading: copy(locale, 'Information We Collect', '我們收集的資訊'),
          body: [
            copy(
              locale,
              'We collect information that readers, account holders, business owners, and contributors provide directly, such as names, emails, profile details, listing details, claim notes, community posts, reports, and support requests.',
              '我們會收集讀者、帳號持有人、商家主理人與投稿者直接提供的資訊，例如姓名、電子郵件、個人資料、商家資訊、認領說明、社群內容、檢舉與支援請求。'
            ),
            copy(
              locale,
              'We may also collect basic technical information such as browser type, device information, IP-derived request data, pages visited, and interaction events needed for security, analytics, moderation, and site improvement.',
              '我們也可能收集基本技術資訊，例如瀏覽器類型、裝置資訊、由 IP 衍生的請求資料、瀏覽頁面與互動事件，用於安全、分析、審核與網站改善。'
            ),
          ],
        },
        {
          heading: copy(locale, 'How We Use Information', '資料使用方式'),
          body: [
            copy(
              locale,
              'We use information to operate the site, maintain accounts, review business claims, publish and correct listings, moderate community submissions, prevent abuse, process marketplace or advertising transactions, and improve reader experience.',
              '我們使用資料來營運網站、維護帳號、審核商家認領、發布與修正商家資料、審核社群投稿、防止濫用、處理市集或廣告交易，以及改善讀者體驗。'
            ),
          ],
        },
        {
          heading: copy(locale, 'Advertising and Google Services', '廣告與 Google 服務'),
          body: [
            copy(
              locale,
              `${brandName} may use Google AdSense and related Google products. Google and other third parties may use cookies, web beacons, IP addresses, advertising identifiers, or similar technologies to serve, measure, and personalize ads where permitted by law and user settings.`,
              `${brandName} 可能使用 Google AdSense 與相關 Google 產品。Google 與其他第三方可能依法律與使用者設定，使用 Cookie、網路信標、IP 位址、廣告識別碼或類似技術來投放、衡量與個人化廣告。`
            ),
            copy(
              locale,
              'You can learn how Google uses data from partner sites at https://policies.google.com/technologies/partner-sites.',
              '你可以在 https://policies.google.com/technologies/partner-sites 了解 Google 如何使用合作夥伴網站的資料。'
            ),
          ],
        },
        {
          heading: copy(locale, 'Sharing and Service Providers', '資料分享與服務供應商'),
          body: [
            copy(
              locale,
              'We use service providers for hosting, authentication, database storage, payments, moderation, analytics, and communications. We do not sell private account information. Public submissions, public profiles, and approved business listing details may appear on the site.',
              '我們會使用代管、驗證、資料庫、付款、審核、分析與通訊服務供應商。我們不出售私人帳號資訊。公開投稿、公開個人資料與核准的商家資訊可能會顯示在網站上。'
            ),
          ],
        },
        {
          heading: copy(locale, 'Choices and Requests', '選擇與請求'),
          body: [
            copy(
              locale,
              `You may request correction or removal of personal information, business listing details, or community submissions by contacting ${contactEmail}. Some records may be retained when needed for security, legal compliance, dispute handling, or abuse prevention.`,
              `你可以寄信至 ${contactEmail} 要求修正或移除個人資訊、商家資料或社群投稿。基於安全、法規遵循、爭議處理或防止濫用，部分紀錄可能會保留。`
            ),
          ],
        },
      ],
    };
  }

  if (slug === 'terms') {
    return {
      slug,
      title: copy(locale, 'Terms of Use', '使用條款'),
      eyebrow: copy(locale, 'Reader and Contributor Terms', '讀者與投稿者條款'),
      description: copy(
        locale,
        `These terms describe acceptable use of ${brandName}, directory information, community features, owner tools, and advertising surfaces.`,
        `本條款說明 ${brandName}、商家目錄、社群功能、商家工具與廣告版位的可接受使用方式。`
      ),
      updatedLabel,
      sections: [
        {
          heading: copy(locale, 'Use of the Site', '網站使用'),
          body: [
            copy(
              locale,
              `${brandName} provides local information, directory tools, community resources, and editorial content. The site is for general information and should not be treated as legal, medical, financial, immigration, tax, or professional advice.`,
              `${brandName} 提供在地資訊、商家工具、社群資源與編輯內容。網站內容僅供一般參考，不應視為法律、醫療、財務、移民、稅務或專業建議。`
            ),
          ],
        },
        {
          heading: copy(locale, 'Listings and Community Content', '商家與社群內容'),
          body: [
            copy(
              locale,
              'Business listings, event listings, posts, and resource pages may change. Readers should confirm hours, eligibility, prices, availability, safety, and official rules directly with the business, agency, or organizer before relying on them.',
              '商家資料、活動資訊、貼文與資源頁可能會變動。讀者在依賴資訊前，應直接向商家、機構或主辦方確認營業時間、資格、價格、可用性、安全與官方規則。'
            ),
          ],
        },
        {
          heading: copy(locale, 'Acceptable Conduct', '可接受行為'),
          body: [
            copy(
              locale,
              `Do not use ${brandName} to submit spam, impersonate another person or business, upload unlawful content, interfere with site security, scrape at unreasonable scale, or mislead readers.`,
              `請勿利用 ${brandName} 發送垃圾內容、冒充他人或商家、上傳違法內容、干擾網站安全、進行不合理規模的抓取，或誤導讀者。`
            ),
          ],
        },
        {
          heading: copy(locale, 'Advertising and Sponsored Material', '廣告與贊助內容'),
          body: [
            copy(
              locale,
              'Advertising, sponsored directory placement, and paid promotions must be distinguishable from editorial or verification decisions. We may reject or remove paid material that harms user trust or violates platform policies.',
              '廣告、贊助排序與付費推廣必須能與編輯或驗證決策區分。我們可拒絕或移除損害使用者信任或違反平台政策的付費內容。'
            ),
          ],
        },
      ],
    };
  }

  return {
    slug,
    title: copy(locale, 'Editorial Policy', '編輯政策'),
    eyebrow: copy(locale, 'Sources, Corrections, Advertising', '來源、修正、廣告'),
    description: copy(
      locale,
      `${brandName} separates editorial judgment, business verification, source attribution, corrections, and sponsored placement.`,
      `${brandName} 會區分編輯判斷、商家驗證、來源標註、內容修正與贊助排序。`
    ),
    updatedLabel,
    sections: [
      {
        heading: copy(locale, 'Original Value', '原創價值'),
        body: [
          copy(
            locale,
            `Our editorial goal is to add ${regionName}-specific context for bilingual readers. When we reference outside sources, we summarize, explain, compare, translate, or organize information instead of simply copying it.`,
            `我們的編輯目標是為雙語讀者補充${regionNameZh}在地脈絡。引用外部來源時，我們會整理、說明、比較、翻譯或組織資訊，而不是單純複製。`
          ),
        ],
      },
      {
        heading: copy(locale, 'Source Handling', '來源處理'),
        body: [
          copy(
            locale,
            'Articles may use public agency pages, official announcements, business websites, community notices, licensed partner content, and locally reviewed directory data. Source links or source labels are included when they help readers verify the underlying information.',
            '文章可能使用政府公開頁面、官方公告、商家網站、社群通知、授權合作內容與在地審核的目錄資料。當來源連結或標籤有助讀者核對資訊時，我們會提供。'
          ),
        ],
      },
      {
        heading: copy(locale, 'Corrections', '內容修正'),
        body: [
          copy(
            locale,
            'We correct material errors when we can verify the issue. Send correction requests with the page URL, the specific item to review, and a reliable source or owner context.',
            '確認重大錯誤後，我們會進行修正。請在修正請求中附上頁面網址、需要審查的具體內容，以及可靠來源或商家主理人脈絡。'
          ),
        ],
      },
      {
        heading: copy(locale, 'Advertising Separation', '廣告分離'),
        body: [
          copy(
            locale,
            'Paid placement can affect where a sponsored item appears, but it does not make a business editor-verified, claimed, or recommended. Ads and sponsored surfaces should not overwhelm publisher content.',
            '付費排序可能影響贊助項目的呈現位置，但不會使商家自動成為編輯驗證、已認領或推薦。廣告與贊助版位不應壓過發布者內容。'
          ),
        ],
      },
    ],
  };
}
