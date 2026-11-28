import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The claim form's answer tells a claim from a new business, and says how
// long review usually takes (#469).

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadRoute(claim: { businessSlug?: string; businessName: string }) {
  vi.doMock('@/lib/api-auth', () => ({
    requireApiUser: vi.fn().mockResolvedValue({ user: { id: 'u-1', email: 'owner@example.com' }, profile: { id: 'p-1' } }),
    withApiAuthSession: (response: Response) => response,
  }));
  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit: () => true }));
  vi.doMock('@/lib/runtime-store', () => ({ recordAnalyticsEvent: vi.fn() }));
  vi.doMock('@/lib/claim-notifications', () => ({ notifyAdminOfBusinessClaim: vi.fn().mockResolvedValue('email_not_configured') }));
  vi.doMock('@/lib/directory-moderation', () => ({
    submitBusinessClaim: vi.fn().mockResolvedValue({ id: 'c-1', claimantName: 'Grace', email: 'owner@example.com', gallery: [], status: 'pending', createdAt: '', ...claim }),
  }));
  return (await import('@/app/api/business-claims/route')).POST;
}

function claimRequest(body: Record<string, unknown>, locale: 'en' | 'zh') {
  return new NextRequest('http://127.0.0.1:3001/api/business-claims', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-locale': locale },
    body: JSON.stringify({ businessName: 'Lotus Kitchen', claimantName: 'Grace', email: 'owner@example.com', ...body }),
  });
}

describe('POST /api/business-claims answer', () => {
  it('calls a claim a claim and a request without a listing a new business', async () => {
    const claimPost = await loadRoute({ businessSlug: 'lotus-kitchen', businessName: 'Lotus Kitchen' });
    const claim = await (await claimPost(claimRequest({ businessSlug: 'lotus-kitchen' }, 'en'))).json();
    expect(claim.message).toContain('Claim request received.');
    expect(claim.message).toContain('usually within one business day');

    vi.resetModules();
    const newPost = await loadRoute({ businessName: 'Lotus Kitchen' });
    const added = await (await newPost(claimRequest({}, 'zh'))).json();
    expect(added.message).toContain('已收到你的新增商家申請');
    expect(added.message).not.toContain('認領申請');
  });
});
