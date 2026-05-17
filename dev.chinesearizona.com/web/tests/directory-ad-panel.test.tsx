import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DirectoryAdCampaignPanel } from '@/components/directory/DirectoryAdCampaignPanel';
import type { DirectoryAdCampaign } from '@/lib/types';

const baseBusiness = {
  legacySponsored: false,
  name: { en: 'Lotus Market', zh: '蓮花市場' },
  slug: 'lotus-market',
  status: 'live' as const,
  verificationState: 'claimed' as const,
};

const activeCampaign: DirectoryAdCampaign = {
  id: 'campaign-1',
  businessId: 'business-1',
  ownerProfileId: 'owner-1',
  status: 'active',
  budgetCents: 25_000,
  remainingBudgetCents: 14_500,
  costPerClickCents: 300,
  scopeCity: 'phoenix',
  scopeCategory: 'grocery',
  startsAt: '2026-04-01T00:00:00.000Z',
  endsAt: '2026-05-01T00:00:00.000Z',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-18T12:00:00.000Z',
  metrics: {
    impressions: 120,
    clicks: 11,
    ctr: 9.2,
    spendCents: 3_300,
  },
};

describe('DirectoryAdCampaignPanel', () => {
  it('keeps sponsorship controls read-only when ads are unavailable', () => {
    const html = renderToStaticMarkup(
      <DirectoryAdCampaignPanel
        adsAvailable={false}
        adsMode="read_only"
        business={baseBusiness}
        initialCampaign={activeCampaign}
        locale="en"
      />
    );

    expect(html).toContain('sponsorship stays read-only for now');
    expect(html).toMatch(/<input[^>]*id="directory-ad-budget-lotus-market"[^>]*disabled=""[^>]*\/>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Top up and checkout<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Pause<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Cancel campaign<\/button>/);
  });

  it('shows local test mode messaging and actions when mock checkout is enabled', () => {
    const html = renderToStaticMarkup(
      <DirectoryAdCampaignPanel
        adsAvailable={true}
        adsMode="mock"
        business={baseBusiness}
        locale="en"
      />
    );

    expect(html).toContain('Local test mode is enabled');
    expect(html).toContain('Start test sponsorship');
    expect(html).not.toContain('disabled=""');
  });

  it('explains when Stripe is configured but the directory ad schema is not deployed yet', () => {
    const html = renderToStaticMarkup(
      <DirectoryAdCampaignPanel
        adsAvailable={false}
        adsMode="read_only"
        business={baseBusiness}
        locale="en"
        readOnlyReason="schema"
      />
    );

    expect(html).toContain('directory sponsorship tables are not deployed yet');
  });
});
