import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, fill: _fill, ...props }: { alt: string; src: string; fill?: boolean; [key: string]: unknown }) => {
    void _fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={String(src)} {...props} />;
  },
}));

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: ({ entitySlug }: { entitySlug: string }) => <div data-report-issue={entitySlug} />,
}));

// The page reads fixtures in tests; pretend the main site has a real database.
vi.mock('@/lib/business-leads', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/business-leads')>()),
  businessLeadsEnabled: (site: { key: string }) => site.key === 'arizona',
}));

describe('business page leads', () => {
  it('shows the bilingual inquiry form and tracked contact buttons on a real estate listing', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug: 'grace-tung-gilbert' }));

    expect(html).toContain('id="inquiry"');
    expect(html).toContain('href="#inquiry"');
    expect(html).toContain('Ask a question / Request a quote');
    expect(html).toContain('詢價');
    expect(html).toContain('name="company_website"');
    expect(html).toContain('By sending, you agree that we share your name');
    expect(html).toContain('href="/en/privacy"');
    expect(html).toContain('data-contact-action="call"');
    expect(html).toContain('data-contact-action="directions"');
  });

  it('uses Chinese labels first on the Chinese page', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'zh', slug: 'grace-tung-gilbert' }));

    expect(html).toContain('送出即表示你同意');
    expect(html).toContain('href="/zh/privacy"');
    expect(html).toContain('索取報價');
  });

  it('tracks clicks but shows no inquiry form on a restaurant listing', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug: 'chili-rush-mesa' }));

    expect(html).not.toContain('id="inquiry"');
    expect(html).not.toContain('name="company_website"');
    expect(html).toContain('data-contact-action="call"');
  });

  it('shows neither form nor tracking on city sites that read static listings', async () => {
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

    expect(html).not.toContain('id="inquiry"');
  });
});

describe('lead panels', () => {
  const counts = [
    {
      businessId: 'b-1',
      slug: 'elite-az-realty-team',
      name: { en: 'Elite AZ Realty Team', zh: '菁英地產' },
      claimed: false,
      callClicks: 12,
      websiteClicks: 4,
      directionsClicks: 3,
      inquiries: 2,
    },
  ];
  const inquiries = [
    {
      id: 'inquiry-1',
      inquiryType: 'quote' as const,
      name: 'Amy Lin',
      email: 'amy@example.com',
      message: 'Looking for a home in Chandler.',
      createdAt: '2026-11-25T18:00:00Z',
      notifyError: 'email_not_configured',
      business: { slug: 'elite-az-realty-team', name: { en: 'Elite AZ Realty Team', zh: '菁英地產' } },
    },
  ];

  it('tells owners how many people tapped to call this month, with zeros for quiet listings', async () => {
    const { OwnerLeadSummary } = await import('@/components/directory/BusinessLeadPanels');

    const html = renderToStaticMarkup(
      <OwnerLeadSummary
        businesses={[
          { id: 'b-1', slug: 'elite-az-realty-team', name: { en: 'Elite AZ Realty Team' } },
          { id: 'b-2', slug: 'quiet-listing', name: { en: 'Quiet Listing' } },
        ]}
        counts={counts}
        inquiries={inquiries}
        locale="en"
      />
    );

    expect(html).toContain('12 people tapped to call you this month');
    expect(html).toContain('No one has tapped Call yet this month');
    expect(html).toContain('Looking for a home in Chandler.');
    expect(html).not.toContain('Not emailed');
  });

  it('words the call count naturally in both languages', async () => {
    const { callHeadline } = await import('@/components/directory/BusinessLeadPanels');

    expect(callHeadline(1, 'en')).toBe('1 person tapped to call you this month');
    expect(callHeadline(12, 'zh')).toBe('本月有 12 人點擊撥打你的電話');
  });

  it('shows admins counts per listing, unclaimed badges, and inquiries that still need forwarding', async () => {
    const { AdminLeadOverview } = await import('@/components/directory/BusinessLeadPanels');

    const html = renderToStaticMarkup(<AdminLeadOverview counts={counts} inquiries={inquiries} locale="en" />);

    expect(html).toContain('Listing leads this month');
    expect(html).toContain('href="/en/business/elite-az-realty-team"');
    expect(html).toContain('Unclaimed');
    expect(html).toContain('>12<');
    expect(html).toContain('Not emailed. Forward it by hand');
    expect(html).toContain('email_not_configured');
  });

  it('shows an empty state to admins before any leads arrive', async () => {
    const { AdminLeadOverview } = await import('@/components/directory/BusinessLeadPanels');

    const html = renderToStaticMarkup(<AdminLeadOverview counts={[]} inquiries={[]} locale="zh" />);

    expect(html).toContain('本月還沒有點擊或詢價。');
    expect(html).toContain('還沒有詢價。');
  });
});
