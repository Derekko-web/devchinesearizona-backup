import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ListingPlanOwnerState } from '@/lib/listing-plan-offers';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Owner dashboard next steps (#451).

const liveListing = {
  slug: 'lotus-kitchen',
  name: { en: 'Lotus Kitchen', zh: '蓮花廚房' },
  status: 'live' as const,
  verificationState: 'editor_verified' as const,
};

function states(overrides: Partial<Record<'enhanced' | 'sponsored', Partial<ListingPlanOwnerState>>> = {}) {
  return [
    { planId: 'enhanced-listing', foundingPrice: true, soldOut: false, ...overrides.enhanced },
    { planId: 'sponsored-category', foundingPrice: true, soldOut: false, ...overrides.sponsored },
  ] as ListingPlanOwnerState[];
}

describe('buildOwnerUpgradeTarget', () => {
  it('offers the founding prices to a live listing with no paid plan', async () => {
    const { buildOwnerUpgradeTarget } = await import('@/components/directory/OwnerNextSteps');

    expect(buildOwnerUpgradeTarget(liveListing, states(), 'zh')).toEqual({
      slug: 'lotus-kitchen',
      name: '蓮花廚房',
      enhancedPriceCents: 9_900,
      sponsoredMonthPriceCents: 2_950,
      founding: true,
    });
    expect(
      buildOwnerUpgradeTarget(
        liveListing,
        states({ enhanced: { foundingPrice: false }, sponsored: { foundingPrice: false } }),
        'en'
      )
    ).toMatchObject({ name: 'Lotus Kitchen', enhancedPriceCents: 19_900, sponsoredMonthPriceCents: 5_900, founding: false });
  });

  it('leaves out a sold-out sponsored spot, and skips listings that have a plan or cannot buy', async () => {
    const { buildOwnerUpgradeTarget } = await import('@/components/directory/OwnerNextSteps');

    expect(
      buildOwnerUpgradeTarget(liveListing, states({ sponsored: { soldOut: true } }), 'en')?.sponsoredMonthPriceCents
    ).toBeUndefined();
    expect(
      buildOwnerUpgradeTarget(liveListing, states({ enhanced: { activeUntil: '2027-11-27T00:00:00.000Z' } }), 'en')
    ).toBeNull();
    expect(buildOwnerUpgradeTarget({ ...liveListing, status: 'pending_review' }, states(), 'en')).toBeNull();
    expect(buildOwnerUpgradeTarget({ ...liveListing, verificationState: 'unverified' }, states(), 'en')).toBeNull();
    expect(buildOwnerUpgradeTarget(liveListing, [], 'en')).toBeNull();
  });
});

describe('OwnerNextSteps', () => {
  it('shows the payment note, claims under review and an upgrade linking to that listing’s plans', async () => {
    const { OwnerNextSteps, buildOwnerUpgradeTarget } = await import('@/components/directory/OwnerNextSteps');
    const target = buildOwnerUpgradeTarget(liveListing, states(), 'en')!;

    const en = renderToStaticMarkup(
      <OwnerNextSteps
        dashboardPath="/en/dashboard"
        locale="en"
        pendingClaims={[{ id: 'c-1', businessName: 'Golden Dragon', createdAt: '2026-11-27T18:00:00.000Z' }]}
        returnNotice={{ tone: 'success', message: 'Payment received, thank you! Your plan is now on.' }}
        upgradeTargets={[target]}
      />
    );

    expect(en).toContain('Payment received, thank you! Your plan is now on.');
    expect(en).toContain('Your claim is under review');
    expect(en).toContain('Golden Dragon');
    expect(en).toContain('Next step: bring more customers to Lotus Kitchen');
    expect(en).toContain('An Enhanced listing ($99/year) adds your logo, more photos and a description in both languages');
    expect(en).toContain('from $29.50/month');
    expect(en).toContain('Founding price for the first 10 businesses');
    expect(en).toContain('href="/en/dashboard?business=lotus-kitchen#plans-lotus-kitchen"');

    const zh = renderToStaticMarkup(
      <OwnerNextSteps
        dashboardPath="/zh/dashboard"
        locale="zh"
        pendingClaims={[{ id: 'c-1', businessName: 'Golden Dragon', createdAt: '2026-11-27T18:00:00.000Z' }]}
        upgradeTargets={[buildOwnerUpgradeTarget(liveListing, states(), 'zh')!]}
      />
    );
    expect(zh).toContain('你的認領正在審核中');
    expect(zh).toContain('下一步：讓更多客人找到蓮花廚房');
    expect(zh).toContain('進階商家頁（$99／年）');
    expect(zh).toContain('查看方案');
  });

  it('renders nothing when there is no next step', async () => {
    const { OwnerNextSteps } = await import('@/components/directory/OwnerNextSteps');

    expect(
      renderToStaticMarkup(
        <OwnerNextSteps dashboardPath="/en/dashboard" locale="en" pendingClaims={[]} upgradeTargets={[]} />
      )
    ).toBe('');
  });
});

describe('getPendingBusinessClaimsForProfile', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/supabase');
    vi.resetModules();
  });

  it("reads only this owner's pending claims", async () => {
    const ops: Array<[string, ...unknown[]]> = [];
    const builder: Record<string, unknown> = {};
    for (const op of ['select', 'eq', 'order', 'limit']) {
      builder[op] = (...args: unknown[]) => {
        ops.push([op, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [{ id: 'c-1', business_name: 'Golden Dragon', business_slug: null, created_at: '2026-11-27T18:00:00.000Z' }],
        error: null,
      }).then(resolve);

    vi.resetModules();
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => null,
      getSupabaseServiceClient: () => ({ from: () => builder }),
    }));
    const { getPendingBusinessClaimsForProfile } = await import('@/lib/directory-moderation');

    await expect(getPendingBusinessClaimsForProfile('profile-1')).resolves.toEqual([
      { id: 'c-1', businessName: 'Golden Dragon', businessSlug: undefined, createdAt: '2026-11-27T18:00:00.000Z' },
    ]);
    expect(ops).toContainEqual(['eq', 'profile_id', 'profile-1']);
    expect(ops).toContainEqual(['eq', 'status', 'pending']);
  });
});
