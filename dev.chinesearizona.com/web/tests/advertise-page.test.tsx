import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const pathnameMock = vi.fn(() => '/en');

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    ...props
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    [key: string]: unknown;
  }) => {
    void _fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={String(src)} {...props} />
    );
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

vi.mock('@/components/forms/BusinessClaimForm', () => ({
  BusinessClaimForm: () => <form data-testid="business-claim-form" />,
}));

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: () => <form data-testid="report-issue-form" />,
}));

const siteKeys = ['arizona', 'los-angeles', 'sf-bay', 'austin'] as const;
const allContactEmails = [
  'hello@chinesearizona.com',
  'hello@chineselosangeles.com',
  'hello@chinesesfbay.com',
  'hello@chineseaustin.com',
];

describe('advertise plans', () => {
  it('publishes the launch prices Derek approved on Nov 25, 2026', async () => {
    const { formatAdvertisePlanPrice, getAdvertisePlans } = await import('@/lib/advertise');
    const plans = getAdvertisePlans();
    const prices = Object.fromEntries(plans.map((plan) => [plan.id, formatAdvertisePlanPrice(plan, 'en')]));
    const founding = Object.fromEntries(plans.map((plan) => [plan.id, plan.foundingOffer?.en]));

    expect(prices).toEqual({
      'basic-listing': 'Free',
      'enhanced-listing': '$199/year',
      'sponsored-category': '$59/month or $590/year',
      boost: '$15/week',
      'homepage-spotlight': '$149/month',
      'bilingual-write-up': '$149 one time',
      'newsletter-slot': '$50 per send',
      'sponsored-article': '$250 one time',
    });
    expect(founding['enhanced-listing']).toContain('$99/year for the first 10 businesses');
    expect(founding['sponsored-category']).toContain('half price ($29.50/month or $295/year)');
    expect(founding['bilingual-write-up']).toBe('Free with a founding-year plan');
    expect(formatAdvertisePlanPrice(plans[2], 'zh')).toBe('$59／月 或 $590／年');
  });

  it('labels every paid placement Sponsored and never sells the Featured badge', async () => {
    const { getAdvertisePlans, sponsoredLabel } = await import('@/lib/advertise');

    for (const plan of getAdvertisePlans()) {
      const planText = JSON.stringify(plan);
      expect(planText).not.toMatch(/Featured|精選/);
      if (plan.labeledSponsored) {
        expect(plan.includes.some((item) => item.en.includes(sponsoredLabel) && item.zh.includes(sponsoredLabel))).toBe(
          true
        );
      }
    }
  });

  it('builds a ready-to-send inquiry email for the current city site', async () => {
    const [{ buildAdvertiseInquiryMailto }, { siteProfiles }] = await Promise.all([
      import('@/lib/advertise'),
      import('@/lib/site-config'),
    ]);

    const href = buildAdvertiseInquiryMailto(
      {
        name: ' Amy Chen ',
        businessName: 'Golden Tea House',
        contact: '512-555-0100',
        planId: 'sponsored-category',
        message: 'Interested in the dining category.',
      },
      'zh',
      siteProfiles.austin
    );
    const url = new URL(href);
    const subject = url.searchParams.get('subject') ?? '';
    const body = url.searchParams.get('body') ?? '';

    expect(href.startsWith('mailto:hello@chineseaustin.com?')).toBe(true);
    expect(subject).toContain('Golden Tea House');
    expect(subject).toContain('ChineseAustin');
    expect(body).toContain('Name / 姓名: Amy Chen');
    expect(body).toContain('Reach me at / 聯絡方式: 512-555-0100');
    expect(body).toContain('Sponsored category spot / 分類贊助版位 ($59/month or $590/year)');
    expect(body).toContain('Site / 網站: chineseaustin.com');
    expect(body).toContain('Interested in the dining category.');

    const noPlan = new URL(
      buildAdvertiseInquiryMailto({ name: 'A', businessName: 'B', contact: 'c', planId: 'nope' }, 'en')
    );
    expect(noPlan.searchParams.get('body')).toContain('Plan / 方案: Not sure yet / 尚未決定');
    expect(noPlan.pathname).toBe('hello@chinesearizona.com');
  });
});

describe('AdvertisePageView', () => {
  it.each(siteKeys.flatMap((key) => [[key, 'en'] as const, [key, 'zh'] as const]))(
    'renders the %s site in %s with its own brand, email and prices',
    async (siteKey, locale) => {
      const [{ AdvertisePageView }, { siteProfiles }] = await Promise.all([
        import('@/views/advertise-page'),
        import('@/lib/site-config'),
      ]);
      const site = siteProfiles[siteKey];
      const html = renderToStaticMarkup(<AdvertisePageView locale={locale} site={site} />);

      expect(html).toContain(locale === 'zh' ? '廣告合作' : 'Advertise with us');
      expect(html).toContain(site.publisher.contactEmail);
      expect(html).toContain(site.brandName);
      expect(html).toContain('$199');
      expect(html).toContain('$590');
      expect(html).toContain('Sponsored / 贊助');
      expect(html).toContain(locale === 'zh' ? '評論與評分絕不販售' : 'Reviews and ratings are never for sale');
      expect(html).toContain(locale === 'zh' ? '退款與取消政策' : 'Refunds and cancellation');
      // Pay-per-click is not on the price list and is hidden from owners (#468).
      expect(html).not.toMatch(/pay-per-click|按點擊付費/i);
      expect(html).toContain('id="sponsored"');
      expect(html).toContain('id="advertise-inquiry"');
      expect(html).toContain('id="wechat"');
      expect(html).toContain(locale === 'zh' ? '微信號即將公布' : 'Our WeChat ID is coming soon');
      // The form sends to our server; the email app is only a second option (#474).
      expect(html).toContain(locale === 'zh' ? '送出詢問' : 'Send inquiry');
      expect(html).toContain(locale === 'zh' ? '一個工作天內回覆' : 'We reply within one business day.');
      expect(html).toContain(locale === 'zh' ? '用郵件程式開啟這則訊息' : 'Open this message in your email app');
      expect(html).toContain('name="company_website"');
      expect(html).not.toContain(locale === 'zh' ? '用 Email 送出詢問' : 'Send inquiry by email');
      expect(html).toContain(`href="/${locale}/add-business"`);
      // Owners on a site with database listings buy online from the dashboard (#408).
      // City sites with static listings keep the inquiry form for every plan.
      if (site.directory.listingSource.state === 'live') {
        expect(html).toContain(`href="/${locale}/dashboard"`);
        expect(html).toContain(locale === 'zh' ? '在商家後台線上購買' : 'Buy online in your dashboard');
        expect(html).not.toContain(`href="/${locale}/advertise?plan=enhanced-listing#contact"`);
        expect(html).toContain(`href="/${locale}/advertise?plan=boost#contact"`);
      } else {
        expect(html).toContain(`href="/${locale}/advertise?plan=enhanced-listing#contact"`);
        expect(html).not.toContain(locale === 'zh' ? '在商家後台線上購買' : 'Buy online in your dashboard');
      }
      for (const otherEmail of allContactEmails.filter((email) => email !== site.publisher.contactEmail)) {
        expect(html).not.toContain(otherEmail);
      }
    }
  );

  it('preselects the plan a visitor asked about', async () => {
    const { AdvertisePageView } = await import('@/views/advertise-page');
    const html = renderToStaticMarkup(<AdvertisePageView locale="en" searchParams={{ plan: 'boost' }} />);
    const ignored = renderToStaticMarkup(<AdvertisePageView locale="en" searchParams={{ plan: 'not-a-plan' }} />);

    expect(html).toMatch(/<option value="boost" selected="">/);
    expect(ignored).toMatch(/<option value="" selected="">/);
  });

  it('has city-aware metadata and a sitemap entry', async () => {
    const [{ advertiseMetadata }, { buildSitemap }, { siteProfiles }] = await Promise.all([
      import('@/lib/page-metadata'),
      import('@/app/sitemap'),
      import('@/lib/site-config'),
    ]);
    const metadata = advertiseMetadata('zh', siteProfiles.austin);
    const urls = (await buildSitemap()).map((entry) => entry.url);

    expect(metadata.title).toBe('廣告合作與價格 | ChineseAustin');
    expect(metadata.alternates?.canonical).toBe('https://chineseaustin.com/zh/advertise');
    expect(advertiseMetadata('en').title).toBe('Advertise with Us: Plans and Prices | ChineseArizona');
    expect(urls).toContain('https://chinesearizona.com/advertise');
  });
});

describe('links to the Advertise page', () => {
  it('appears in the footer in both languages', async () => {
    const Footer = (await import('@/components/Footer')).default;

    pathnameMock.mockReturnValue('/zh/community');
    const zhHtml = renderToStaticMarkup(<Footer />);
    pathnameMock.mockReturnValue('/en');
    const enHtml = renderToStaticMarkup(<Footer />);

    expect(zhHtml).toContain('href="/zh/advertise"');
    expect(zhHtml).toContain('廣告合作');
    expect(enHtml).toContain('href="/en/advertise"');
    expect(enHtml).toContain('>Advertise<');
  });

  it('appears on business pages and in the claim flow', async () => {
    const [{ AddBusinessPageView, BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const businessHtml = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'zh',
        slug: 'lunasia-dim-sum-house-alhambra',
        site: siteProfiles['los-angeles'],
      })
    );
    const claimHtml = renderToStaticMarkup(await AddBusinessPageView({ locale: 'en', site: siteProfiles.austin }));

    expect(businessHtml).toContain('href="/zh/advertise"');
    expect(businessHtml).toContain('推廣這家商家');
    expect(claimHtml).toContain('id="advertise-plans"');
    expect(claimHtml).toContain('href="/en/advertise"');
    expect(claimHtml).toContain('See plans and prices');
  });
});
