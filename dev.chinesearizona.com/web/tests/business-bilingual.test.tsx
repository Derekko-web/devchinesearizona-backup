import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BilingualDetailsError,
  acceptedPaymentNames,
  chineseMaterialsLabel,
  hasBilingualServiceDetails,
  isValidWeChatId,
  parseBilingualDetails,
} from '@/lib/business-bilingual';
import { languageLabel } from '@/lib/i18n';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('parseBilingualDetails', () => {
  it('keeps offered languages in a fixed order, drops unknown ones, and keeps legacy values', () => {
    const details = parseBilingualDetails(
      {
        languages: ['English', 'Cantonese', 'Klingon', 'Mandarin', 'Cantonese'],
        wechatId: '  @lotus_kitchen-az ',
        acceptsWeChatPay: true,
        acceptsAlipay: 'yes',
        chineseMenuOrForms: true,
      },
      'en',
      ['Traditional Chinese', 'Mandarin']
    );

    expect(details).toEqual({
      languages: ['Mandarin', 'Cantonese', 'English', 'Traditional Chinese'],
      wechatId: 'lotus_kitchen-az',
      acceptsWeChatPay: true,
      acceptsAlipay: false,
      chineseMenuOrForms: true,
    });
  });

  it('clears the WeChat ID when it is blank and rejects invalid ones in both languages', () => {
    expect(parseBilingualDetails({ wechatId: '   ' }, 'en').wechatId).toBeUndefined();
    expect(isValidWeChatId('+14805550101')).toBe(true);
    expect(isValidWeChatId('a')).toBe(false);
    expect(isValidWeChatId('x'.repeat(41))).toBe(false);

    expect(() => parseBilingualDetails({ wechatId: 'lotus kitchen' }, 'en')).toThrow(BilingualDetailsError);
    expect(() => parseBilingualDetails({ wechatId: '蓮花' }, 'zh')).toThrow('微信號只能包含');
    expect(() => parseBilingualDetails({ languages: 'Mandarin' }, 'en')).toThrow('Languages must be a list.');
  });

  it('labels Cantonese, Chinese materials and payments', () => {
    expect(languageLabel('Cantonese', 'zh')).toBe('粵語');
    expect(chineseMaterialsLabel('dining', 'en')).toBe('Chinese menu available');
    expect(chineseMaterialsLabel('medical', 'zh')).toBe('提供中文表格或資料');
    expect(acceptedPaymentNames({ acceptsWeChatPay: true, acceptsAlipay: true })).toEqual(['WeChat Pay', 'Alipay']);
    expect(hasBilingualServiceDetails({})).toBe(false);
    expect(hasBilingualServiceDetails({ acceptsAlipay: true })).toBe(true);
  });
});

describe('directory mapping and filters', () => {
  it('reads the new columns from a listing row and filters by payment', async () => {
    const { matchesPaymentFilter, rowToBusiness, countActiveDirectoryFilters } = await import('@/lib/directory');
    const business = rowToBusiness({
      id: 'b-1',
      slug: 'lotus-kitchen',
      name_en: 'Lotus Kitchen',
      city: 'Chandler',
      languages: ['Cantonese', 'English'],
      wechat_id: 'lotus_az',
      accepts_wechat_pay: true,
      accepts_alipay: null,
      chinese_menu_or_forms: true,
    });

    expect(business).toMatchObject({
      languages: ['Cantonese', 'English'],
      wechatId: 'lotus_az',
      acceptsWeChatPay: true,
      acceptsAlipay: false,
      chineseMenuOrForms: true,
      bilingual: true,
    });
    expect(matchesPaymentFilter(business, 'wechat-pay')).toBe(true);
    expect(matchesPaymentFilter(business, 'alipay')).toBe(false);
    expect(matchesPaymentFilter(business, undefined)).toBe(true);
    expect(countActiveDirectoryFilters({ language: 'Cantonese', payment: 'alipay' })).toBe(2);
  });

  it('renders language and payment filters with the chosen values', async () => {
    const { DirectoryFilters } = await import('@/components/DirectoryFilters');
    const html = renderToStaticMarkup(
      <DirectoryFilters
        locale="zh"
        categories={[]}
        cities={[]}
        values={{ language: 'Cantonese', payment: 'wechat-pay' }}
      />
    );

    expect(html).toContain('name="language"');
    expect(html).toMatch(/<option value="Cantonese" selected="">粵語<\/option>/);
    expect(html).toContain('name="payment"');
    expect(html).toMatch(/<option value="wechat-pay" selected="">微信支付<\/option>/);
    expect(html).toContain('<option value="alipay">支付寶</option>');
    expect(html).not.toContain('<option value="English">');
  });
});

type Call = { table: string; ops: Array<[string, ...unknown[]]> };

function fakeClient(business: Record<string, unknown> | null, updateError: unknown = null) {
  const calls: Call[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        const call: Call = { table, ops: [] };
        calls.push(call);
        const builder: Record<string, unknown> = {};
        for (const op of ['select', 'eq', 'update']) {
          builder[op] = (...args: unknown[]) => {
            call.ops.push([op, ...args]);
            return builder;
          };
        }
        builder.maybeSingle = () => Promise.resolve({ data: business, error: null });
        builder.then = (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: null, error: updateError }).then(resolve);
        return builder;
      },
    },
  };
}

async function loadOwner(business: Record<string, unknown> | null, updateError: unknown = null) {
  const fake = fakeClient(business, updateError);
  vi.doMock('@/lib/supabase', () => ({ getSupabaseServiceClient: () => fake.client }));
  const owner = await import('@/lib/directory-owner');
  return { owner, ...fake };
}

describe('updateBusinessBilingualDetailsForProfile', () => {
  const listing = { id: 'b-1', slug: 'lotus-kitchen', owner_profile_id: 'profile-1', languages: ['Traditional Chinese'] };
  const details = { languages: ['Mandarin'], wechatId: 'lotus_az', acceptsWeChatPay: true };

  it('saves the owner’s details and keeps legacy languages', async () => {
    const { owner, calls } = await loadOwner(listing);

    const result = await owner.updateBusinessBilingualDetailsForProfile({
      businessSlug: 'lotus-kitchen',
      details,
      locale: 'en',
      profileId: 'profile-1',
      role: 'member',
    });

    expect(result.businessSlug).toBe('lotus-kitchen');
    const update = calls.find((call) => call.ops.some(([op]) => op === 'update'));
    expect(update?.ops.find(([op]) => op === 'update')?.[1]).toMatchObject({
      languages: ['Mandarin', 'Traditional Chinese'],
      wechat_id: 'lotus_az',
      accepts_wechat_pay: true,
      accepts_alipay: false,
      chinese_menu_or_forms: false,
    });
  });

  it('lets admins edit any listing but not other owners', async () => {
    const admin = await loadOwner(listing);
    await expect(
      admin.owner.updateBusinessBilingualDetailsForProfile({
        businessSlug: 'lotus-kitchen',
        details,
        locale: 'en',
        profileId: 'admin-1',
        role: 'admin',
      })
    ).resolves.toMatchObject({ businessSlug: 'lotus-kitchen' });

    vi.resetModules();
    const stranger = await loadOwner(listing);
    await expect(
      stranger.owner.updateBusinessBilingualDetailsForProfile({
        businessSlug: 'lotus-kitchen',
        details,
        locale: 'zh',
        profileId: 'profile-2',
        role: 'member',
      })
    ).rejects.toThrow('你無法編輯這個商家。');
    expect(stranger.calls.some((call) => call.ops.some(([op]) => op === 'update'))).toBe(false);
  });

  it('reports a missing listing, a bad WeChat ID and a failed save', async () => {
    const missing = await loadOwner(null);
    await expect(
      missing.owner.updateBusinessBilingualDetailsForProfile({
        businessSlug: 'nope',
        details,
        locale: 'en',
        profileId: 'profile-1',
        role: 'member',
      })
    ).rejects.toThrow('Business not found.');

    vi.resetModules();
    const bad = await loadOwner(listing);
    await expect(
      bad.owner.updateBusinessBilingualDetailsForProfile({
        businessSlug: 'lotus-kitchen',
        details: { wechatId: 'has spaces' },
        locale: 'en',
        profileId: 'profile-1',
        role: 'member',
      })
    ).rejects.toBeInstanceOf((await import('@/lib/business-bilingual')).BilingualDetailsError);

    vi.resetModules();
    const failed = await loadOwner(listing, { message: 'timeout' });
    await expect(
      failed.owner.updateBusinessBilingualDetailsForProfile({
        businessSlug: 'lotus-kitchen',
        details,
        locale: 'en',
        profileId: 'profile-1',
        role: 'member',
      })
    ).rejects.toThrow('Unable to save bilingual details right now.');
  });
});

describe('bilingual details route', () => {
  async function loadRoute(update = vi.fn(), allowed = true) {
    vi.doMock('@/lib/api-auth', () => ({
      requireApiUser: vi.fn().mockResolvedValue({
        profile: { id: 'profile-1', role: 'member' },
        response: null,
        user: { email: 'owner@example.com' },
      }),
      withApiAuthSession: vi.fn((response: Response) => response),
    }));
    vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(() => allowed) }));
    vi.doMock('@/lib/directory-owner', () => ({ updateBusinessBilingualDetailsForProfile: update }));
    const { PATCH } = await import('@/app/api/directory/businesses/[slug]/details/route');
    return PATCH;
  }

  function request(body: unknown) {
    return new NextRequest('https://chinesearizona.com/api/directory/businesses/lotus-kitchen/details', {
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { 'content-type': 'application/json', 'x-locale': 'en' },
      method: 'PATCH',
    });
  }

  const params = { params: Promise.resolve({ slug: 'lotus-kitchen' }) };

  it('saves details for the signed-in user', async () => {
    const update = vi.fn().mockResolvedValue({ businessSlug: 'lotus-kitchen', details: { languages: ['Mandarin'] } });
    const PATCH = await loadRoute(update);

    const response = await PATCH(request({ languages: ['Mandarin'] }), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ message: 'Bilingual details saved.' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ businessSlug: 'lotus-kitchen', profileId: 'profile-1', role: 'member' })
    );
  });

  it('answers 422 for invalid details, 400 for a bad body and 429 when rate limited', async () => {
    // Use the same module instance the route loads after vi.resetModules().
    const { BilingualDetailsError: RouteBilingualDetailsError } = await import('@/lib/business-bilingual');
    const invalid = await loadRoute(
      vi.fn().mockRejectedValue(new RouteBilingualDetailsError('WeChat ID can only use letters'))
    );
    expect((await invalid(request({ wechatId: 'x y' }), params)).status).toBe(422);
    expect((await invalid(request('not json'), params)).status).toBe(400);
    expect((await invalid(request([1, 2]), params)).status).toBe(400);

    vi.resetModules();
    const limited = await loadRoute(vi.fn(), false);
    expect((await limited(request({}), params)).status).toBe(429);
  });
});

describe('bilingual editors', () => {
  const details = {
    languages: ['Cantonese', 'Traditional Chinese'],
    wechatId: 'lotus_az',
    acceptsWeChatPay: true,
    acceptsAlipay: false,
    chineseMenuOrForms: true,
  };

  it('pre-fills the owner editor', async () => {
    const { BusinessBilingualDetailsEditor } = await import(
      '@/components/directory/BusinessBilingualDetailsEditor'
    );
    const html = renderToStaticMarkup(
      <BusinessBilingualDetailsEditor businessSlug="lotus-kitchen" categorySlug="dining" initialDetails={details} locale="en" />
    );

    expect(html).toContain('Bilingual details');
    expect(html).toContain('value="lotus_az"');
    expect(html).toContain('Chinese menu available');
    expect(html.match(/checked=""/g)).toHaveLength(3);
    expect(html).toContain('Cantonese');
    expect(html).toContain('Save bilingual details');
  });

  it('lists every listing in the admin editor', async () => {
    const { AdminBusinessDetailsEditor } = await import('@/components/directory/AdminBusinessDetailsEditor');
    const html = renderToStaticMarkup(
      <AdminBusinessDetailsEditor
        locale="zh"
        listings={[
          { slug: 'lotus-kitchen', name: 'Lotus Kitchen 蓮花廚房', categorySlug: 'dining', city: 'Chandler', details },
          { slug: 'az-law', name: 'AZ Law', categorySlug: 'legal-finance', city: 'Tempe', details },
        ]}
      />
    );

    expect(html).toContain('商家雙語資訊');
    expect(html).toContain('<option value="lotus-kitchen">Lotus Kitchen 蓮花廚房 · Chandler</option>');
    expect(html).toContain('<option value="az-law">AZ Law · Tempe</option>');
  });
});
