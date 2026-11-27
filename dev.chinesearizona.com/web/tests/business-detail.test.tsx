import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: ({ entitySlug }: { entitySlug: string }) => <div data-report-issue={entitySlug} />,
}));

describe('BusinessDetailPageView', () => {
  it('renders Los Angeles business details without Arizona SEO or verification fallback copy', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        slug: 'lunasia-dim-sum-house-alhambra',
        site: siteProfiles['los-angeles'],
      })
    );

    expect(html).toContain('Lunasia Dim Sum House');
    expect(html).toContain('Verified by ChineseLosAngeles');
    expect(html).toContain('"addressRegion":"CA"');
    expect(html).toContain('https://chineselosangeles.com/en/business/lunasia-dim-sum-house-alhambra');
    expect(html).not.toContain('Verified by ChineseArizona');
    expect(html).not.toContain('"addressRegion":"AZ"');
    expect(html).not.toContain('https://chinesearizona.com/en/business/lunasia-dim-sum-house-alhambra');
  });

  it('shows the full description once, in the About section, not again in the top section', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }, { getDirectoryBusinessBySlug }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
      import('@/lib/directory'),
    ]);
    const site = siteProfiles['los-angeles'];
    const slug = 'lunasia-dim-sum-house-alhambra';
    const business = await getDirectoryBusinessBySlug(slug, { site });
    expect(business).toBeDefined();

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug, site }));
    const visibleHtml = html.replace(/<script[\s\S]*?<\/script>/g, '');
    const description = renderToStaticMarkup(<>{business!.description.en}</>);

    expect(visibleHtml.split(description).length - 1).toBe(1);
  });

  it('shows bilingual details and puts languages and payments in the structured data (#411)', async () => {
    const directory = await import('@/lib/directory');
    const { siteProfiles } = await import('@/lib/site-config');
    const site = siteProfiles['los-angeles'];
    const slug = 'lunasia-dim-sum-house-alhambra';
    const business = await directory.getDirectoryBusinessBySlug(slug, { site });
    const spy = vi.spyOn(directory, 'getDirectoryBusinessBySlug').mockResolvedValue({
      ...business!,
      categorySlug: 'dining',
      languages: ['Cantonese', 'Mandarin', 'English'],
      wechatId: 'lunasia_dimsum',
      acceptsWeChatPay: true,
      acceptsAlipay: true,
      chineseMenuOrForms: true,
    });

    try {
      const { BusinessDetailPageView } = await import('@/views/site-pages');
      const zh = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'zh', slug, site }));
      const en = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug, site }));

      expect(zh).toContain('華語服務');
      expect(zh).toContain('lunasia_dimsum');
      expect(zh).toContain('接受微信支付');
      expect(zh).toContain('接受支付寶');
      expect(zh).toContain('提供中文菜單');
      expect(en).toContain('Chinese-language service');
      expect(en).toContain('Accepts WeChat Pay');
      expect(en).toContain('"knowsLanguage":["Cantonese","Mandarin","English"]');
      expect(en).toContain('"paymentAccepted":"WeChat Pay, Alipay"');
    } finally {
      spy.mockRestore();
    }
  });

  it('offers the claim flow on any main-site listing without an owner (#448)', async () => {
    const { canClaimBusiness } = await import('@/views/business-detail-page');
    const { defaultSiteProfile, siteProfiles } = await import('@/lib/site-config');

    expect(canClaimBusiness({ verificationState: 'editor_verified' }, defaultSiteProfile)).toBe(true);
    expect(canClaimBusiness({ verificationState: 'unverified' }, defaultSiteProfile)).toBe(true);
    expect(
      canClaimBusiness({ verificationState: 'editor_verified', ownerProfileSlug: 'owner' }, defaultSiteProfile)
    ).toBe(false);
    expect(canClaimBusiness({ verificationState: 'claimed' }, defaultSiteProfile)).toBe(false);
    // City sites can't connect an owner to a verified listing, so they keep the old rule.
    expect(canClaimBusiness({ verificationState: 'editor_verified' }, siteProfiles['los-angeles'])).toBe(false);
    expect(canClaimBusiness({ verificationState: 'unverified' }, siteProfiles['los-angeles'])).toBe(true);
  });

  it('shows a bilingual "claim this listing free" prompt on an unclaimed verified listing (#448)', async () => {
    const directory = await import('@/lib/directory');
    const { defaultSiteProfile } = await import('@/lib/site-config');
    const [sample] = await directory.getDirectoryBusinesses({}, { site: defaultSiteProfile, limit: 1 });
    expect(sample).toBeDefined();
    const unclaimed = { ...sample, verificationState: 'editor_verified' as const, ownerProfileSlug: undefined };
    const spy = vi.spyOn(directory, 'getDirectoryBusinessBySlug').mockResolvedValue(unclaimed);

    try {
      const { BusinessDetailPageView } = await import('@/views/site-pages');
      const render = async (locale: 'en' | 'zh') =>
        renderToStaticMarkup(
          await BusinessDetailPageView({ locale, slug: sample.slug, site: defaultSiteProfile })
        );
      const claimHref = `/add-business?businessSlug=${encodeURIComponent(sample.slug)}`;

      const en = await render('en');
      expect(en).toContain('data-testid="claim-listing-prompt"');
      expect(en).toContain('Is this your business?');
      expect(en).toContain('Claim this listing free');
      expect(en).toContain(`href="/en${claimHref}`);
      expect(en).not.toContain('Business owners can still use the claim flow');

      const zh = await render('zh');
      expect(zh).toContain('這是你的商家嗎？');
      expect(zh).toContain('免費認領此商家');
      expect(zh).toContain(`href="/zh${claimHref}`);

      spy.mockResolvedValue({ ...unclaimed, ownerProfileSlug: 'grace-lin' });
      const claimed = await render('en');
      expect(claimed).not.toContain('claim-listing-prompt');
      expect(claimed).not.toContain('Claim this listing');
    } finally {
      spy.mockRestore();
    }
  });

  it('hides the Chinese-language service box when no details are filled in', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');
    const { siteProfiles } = await import('@/lib/site-config');
    const html = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        slug: 'lunasia-dim-sum-house-alhambra',
        site: siteProfiles['los-angeles'],
      })
    );

    expect(html).not.toContain('Chinese-language service');
    expect(html).not.toContain('paymentAccepted');
  });
});
