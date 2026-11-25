import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { table: string; ops: Array<[string, ...unknown[]]> };
type Result = { data: unknown; error: unknown };
type Resolver = (call: Call, terminal: 'maybeSingle' | 'single' | 'many') => Result;

// A tiny stand-in for the Supabase query builder: records each chained call
// and lets the test decide what each query returns.
function createFakeClient(resolve: Resolver) {
  const calls: Call[] = [];
  const rpcCalls: Array<{ fn: string; args: unknown; limit?: number }> = [];

  function from(table: string) {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const op of ['select', 'eq', 'order', 'limit', 'in', 'insert', 'update', 'upsert']) {
      builder[op] = (...args: unknown[]) => {
        call.ops.push([op, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = () => Promise.resolve(resolve(call, 'maybeSingle'));
    builder.single = () => Promise.resolve(resolve(call, 'single'));
    builder.then = (onFulfilled: (value: Result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resolve(call, 'many')).then(onFulfilled, onRejected);
    return builder;
  }

  function rpc(fn: string, args: unknown) {
    const entry: { fn: string; args: unknown; limit?: number } = { fn, args };
    rpcCalls.push(entry);
    const builder = {
      limit(count: number) {
        entry.limit = count;
        return builder;
      },
      then(onFulfilled: (value: Result) => unknown) {
        return Promise.resolve(resolve({ table: `rpc:${fn}`, ops: [] }, 'many')).then(onFulfilled);
      },
    };
    return builder;
  }

  return { client: { from, rpc }, calls, rpcCalls };
}

function hasOp(call: Call, op: string) {
  return call.ops.some(([name]) => name === op);
}

function opArgs(call: Call, op: string) {
  return call.ops.find(([name]) => name === op)?.slice(1) ?? [];
}

const realEstateBusiness = {
  id: 'b-1',
  slug: 'elite-az-realty-team',
  name_en: 'Elite AZ Realty Team',
  name_zh_tw: '亞利桑那菁英地產',
  status: 'live',
  owner_profile_id: null as string | null,
  category: { slug: 'real-estate' },
};

function leadResolver(business: Record<string, unknown> | null, ownerEmail?: string): Resolver {
  return (call, terminal) => {
    if (call.table === 'businesses') {
      return { data: business, error: null };
    }
    if (call.table === 'business_inquiries' && hasOp(call, 'insert') && terminal === 'single') {
      return { data: { id: 'inquiry-1' }, error: null };
    }
    if (call.table === 'business_inquiries' && hasOp(call, 'update')) {
      return { data: null, error: null };
    }
    if (call.table === 'profiles') {
      return { data: { auth_user_id: 'auth-1' }, error: null };
    }
    if (call.table === 'auth_profiles') {
      return { data: ownerEmail ? { email: ownerEmail } : null, error: null };
    }
    return { data: null, error: { message: `unexpected ${call.table}` } };
  };
}

async function loadLeads(resolve: Resolver) {
  const fake = createFakeClient(resolve);
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: () => fake.client,
    isSupabaseServiceConfigured: () => true,
  }));
  const leads = await import('@/lib/business-leads');
  return { leads, ...fake };
}

const inquiry = {
  businessSlug: 'elite-az-realty-team',
  inquiryType: 'quote' as const,
  name: 'Amy Lin',
  email: 'amy@example.com',
  phone: '480-555-0101',
  message: 'Looking for a 3 bedroom home in Chandler.',
  locale: 'zh' as const,
  pagePath: '/zh/business/elite-az-realty-team',
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stubEmailEnv() {
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  vi.stubEnv('EMAIL_FROM', 'ChineseArizona <leads@chinesearizona.com>');
  vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@chinesearizona.com');
}

describe('submitBusinessInquiry', () => {
  it('saves the inquiry and emails the owner of a claimed listing, with reply-to set to the visitor', async () => {
    stubEmailEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"email-1"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { leads, calls } = await loadLeads(
      leadResolver({ ...realEstateBusiness, owner_profile_id: 'profile-1' }, 'owner@realty.example')
    );

    const result = await leads.submitBusinessInquiry(inquiry);

    expect(result).toEqual({ id: 'inquiry-1', notified: true });
    const insert = calls.find((call) => call.table === 'business_inquiries' && hasOp(call, 'insert'));
    expect(opArgs(insert!, 'insert')[0]).toMatchObject({
      business_id: 'b-1',
      inquiry_type: 'quote',
      email: 'amy@example.com',
      locale: 'zh',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    const payload = JSON.parse(String(init.body));
    expect(payload.to).toEqual(['owner@realty.example']);
    expect(payload.reply_to).toBe('amy@example.com');
    expect(payload.subject).not.toContain('Unclaimed');
    expect(payload.text).toContain('Looking for a 3 bedroom home in Chandler.');
    expect(payload.text).toContain('/business/elite-az-realty-team');
    expect(payload.text).toContain('never charges per lead or per closed deal');

    const update = calls.find((call) => call.table === 'business_inquiries' && hasOp(call, 'update'));
    expect(opArgs(update!, 'update')[0]).toMatchObject({ notified_to: 'owner', notify_error: null });
    expect(opArgs(update!, 'eq')).toEqual(['id', 'inquiry-1']);
  });

  it('sends leads for unclaimed listings to the admin', async () => {
    stubEmailEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { leads, calls } = await loadLeads(leadResolver(realEstateBusiness));

    await leads.submitBusinessInquiry(inquiry);

    const payload = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(payload.to).toEqual(['admin@chinesearizona.com']);
    expect(payload.subject).toContain('[Unclaimed listing]');
    expect(calls.some((call) => call.table === 'profiles')).toBe(false);
    const update = calls.find((call) => call.table === 'business_inquiries' && hasOp(call, 'update'));
    expect(opArgs(update!, 'update')[0]).toMatchObject({ notified_to: 'admin' });
  });

  it('falls back to the admin when a claimed listing has no owner email on file', async () => {
    stubEmailEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { leads } = await loadLeads(leadResolver({ ...realEstateBusiness, owner_profile_id: 'profile-1' }));

    await leads.submitBusinessInquiry(inquiry);

    const payload = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(payload.to).toEqual(['admin@chinesearizona.com']);
  });

  it('keeps the inquiry and records why when email is not set up', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { leads, calls } = await loadLeads(leadResolver(realEstateBusiness));

    const result = await leads.submitBusinessInquiry(inquiry);

    expect(result).toEqual({ id: 'inquiry-1', notified: false });
    expect(fetchMock).not.toHaveBeenCalled();
    const update = calls.find((call) => call.table === 'business_inquiries' && hasOp(call, 'update'));
    expect(opArgs(update!, 'update')[0]).toEqual({ notify_error: 'email_not_configured' });
  });

  it('keeps the inquiry when the email provider rejects the message', async () => {
    stubEmailEnv();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 422 })));
    const { leads, calls } = await loadLeads(leadResolver(realEstateBusiness));

    const result = await leads.submitBusinessInquiry(inquiry);

    expect(result.notified).toBe(false);
    const update = calls.find((call) => call.table === 'business_inquiries' && hasOp(call, 'update'));
    expect(opArgs(update!, 'update')[0]).toEqual({ notify_error: 'email_rejected_422' });
  });

  it('refuses listings outside the high-value categories without saving', async () => {
    const { leads, calls } = await loadLeads(leadResolver({ ...realEstateBusiness, category: { slug: 'dining' } }));

    await expect(leads.submitBusinessInquiry(inquiry)).rejects.toMatchObject({ status: 400 });
    expect(calls.some((call) => call.table === 'business_inquiries')).toBe(false);
  });

  it('returns 404 for unknown or hidden listings', async () => {
    const missing = await loadLeads(leadResolver(null));
    await expect(missing.leads.submitBusinessInquiry(inquiry)).rejects.toMatchObject({ status: 404 });

    vi.resetModules();
    const hidden = await loadLeads(leadResolver({ ...realEstateBusiness, status: 'suppressed' }));
    await expect(hidden.leads.submitBusinessInquiry(inquiry)).rejects.toMatchObject({ status: 404 });
  });

  it('returns 503 when Supabase is not configured', async () => {
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseServiceClient: () => null,
      isSupabaseServiceConfigured: () => false,
    }));
    const leads = await import('@/lib/business-leads');

    await expect(leads.submitBusinessInquiry(inquiry)).rejects.toMatchObject({ status: 503 });
  });
});

describe('recordBusinessContactClick', () => {
  it('stores one click per listing, action, visitor and day, without the raw address', async () => {
    const { leads, calls } = await loadLeads((call) => {
      if (call.table === 'businesses') {
        return { data: { id: 'b-1' }, error: null };
      }
      return { data: [{ id: 'click-1' }], error: null };
    });

    const result = await leads.recordBusinessContactClick({
      businessSlug: 'elite-az-realty-team',
      action: 'call',
      visitorAddress: '203.0.113.7',
    });

    expect(result).toEqual({ recorded: true });
    const upsert = calls.find((call) => call.table === 'business_contact_clicks')!;
    const [row, options] = opArgs(upsert, 'upsert') as [Record<string, string>, Record<string, unknown>];
    expect(row).toMatchObject({ business_id: 'b-1', action: 'call' });
    expect(row.dedupe_key).not.toContain('203.0.113.7');
    expect(options).toEqual({ onConflict: 'dedupe_key', ignoreDuplicates: true });
  });

  it('reports a repeat click as not recorded', async () => {
    const { leads } = await loadLeads((call) =>
      call.table === 'businesses' ? { data: { id: 'b-1' }, error: null } : { data: [], error: null }
    );

    const result = await leads.recordBusinessContactClick({
      businessSlug: 'elite-az-realty-team',
      action: 'website',
      visitorAddress: '203.0.113.7',
    });

    expect(result).toEqual({ recorded: false });
  });

  it('ignores clicks for listings that are not in the database', async () => {
    const { leads, calls } = await loadLeads(() => ({ data: null, error: null }));

    const result = await leads.recordBusinessContactClick({
      businessSlug: 'unknown',
      action: 'directions',
      visitorAddress: '203.0.113.7',
    });

    expect(result).toEqual({ recorded: false });
    expect(calls.some((call) => call.table === 'business_contact_clicks')).toBe(false);
  });

  it('builds the same key for the same visitor on the same day, and a new one the next day', async () => {
    const { leads } = await loadLeads(() => ({ data: null, error: null }));
    const day = new Date('2026-11-25T10:00:00Z');

    const first = leads.buildContactClickDedupeKey('b-1', 'call', '203.0.113.7', day);
    const again = leads.buildContactClickDedupeKey('b-1', 'call', '203.0.113.7', new Date('2026-11-25T23:00:00Z'));
    const otherVisitor = leads.buildContactClickDedupeKey('b-1', 'call', '203.0.113.8', day);
    const nextDay = leads.buildContactClickDedupeKey('b-1', 'call', '203.0.113.7', new Date('2026-11-26T10:00:00Z'));

    expect(again).toBe(first);
    expect(otherVisitor).not.toBe(first);
    expect(nextDay).not.toBe(first);
  });
});

describe('lead counts', () => {
  it('starts the month on the 1st in Arizona time', async () => {
    const { leads } = await loadLeads(() => ({ data: null, error: null }));

    // 05:00 UTC on Dec 1 is still Nov 30 in Arizona.
    expect(leads.startOfLeadMonth(new Date('2026-12-01T05:00:00Z')).toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(leads.startOfLeadMonth(new Date('2026-12-01T08:00:00Z')).toISOString()).toBe('2026-12-01T07:00:00.000Z');
  });

  it('maps the per-listing counts from the database function', async () => {
    const { leads, rpcCalls } = await loadLeads(() => ({
      data: [
        {
          business_id: 'b-1',
          business_slug: 'elite-az-realty-team',
          business_name_en: 'Elite AZ Realty Team',
          business_name_zh_tw: null,
          claimed: true,
          call_clicks: 12,
          website_clicks: '4',
          directions_clicks: 3,
          inquiries: 2,
        },
      ],
      error: null,
    }));
    const since = new Date('2026-11-01T07:00:00Z');

    const counts = await leads.getBusinessLeadCounts({ businessIds: ['b-1'], since });

    expect(rpcCalls[0]).toMatchObject({
      fn: 'business_lead_counts',
      args: { p_since: since.toISOString(), p_business_ids: ['b-1'] },
    });
    expect(counts).toEqual([
      {
        businessId: 'b-1',
        slug: 'elite-az-realty-team',
        name: { en: 'Elite AZ Realty Team', zh: null },
        claimed: true,
        callClicks: 12,
        websiteClicks: 4,
        directionsClicks: 3,
        inquiries: 2,
      },
    ]);
  });

  it('skips the query for an owner with no listings and survives database errors', async () => {
    const { leads, rpcCalls } = await loadLeads(() => ({ data: null, error: { message: 'boom' } }));

    expect(await leads.getBusinessLeadCounts({ businessIds: [] })).toEqual([]);
    expect(rpcCalls).toHaveLength(0);
    expect(await leads.getBusinessLeadCounts({ limit: 10 })).toEqual([]);
    expect(rpcCalls[0].limit).toBe(10);
    expect(await leads.getRecentBusinessInquiries({ businessIds: [] })).toEqual([]);
    expect(await leads.getRecentBusinessInquiries()).toEqual([]);
  });

  it('lists recent inquiries with their listing and delivery status', async () => {
    const { leads, calls } = await loadLeads(() => ({
      data: [
        {
          id: 'inquiry-1',
          inquiry_type: 'quote',
          name: 'Amy Lin',
          email: 'amy@example.com',
          phone: null,
          message: 'Hi',
          created_at: '2026-11-25T18:00:00Z',
          notified_to: null,
          notify_error: 'email_not_configured',
          business: [{ slug: 'elite-az-realty-team', name_en: 'Elite AZ Realty Team', name_zh_tw: '菁英地產' }],
        },
      ],
      error: null,
    }));

    const inquiries = await leads.getRecentBusinessInquiries({ businessIds: ['b-1'], limit: 5 });

    expect(opArgs(calls[0], 'in')).toEqual(['business_id', ['b-1']]);
    expect(opArgs(calls[0], 'limit')).toEqual([5]);
    expect(inquiries[0]).toMatchObject({
      id: 'inquiry-1',
      inquiryType: 'quote',
      phone: undefined,
      notifiedTo: undefined,
      notifyError: 'email_not_configured',
      business: { slug: 'elite-az-realty-team', name: { en: 'Elite AZ Realty Team', zh: '菁英地產' } },
    });
  });
});

describe('lead eligibility', () => {
  it('offers the inquiry form only in the high-value categories', async () => {
    const { leads } = await loadLeads(() => ({ data: null, error: null }));

    for (const slug of ['real-estate', 'legal-finance', 'medical', 'education', 'home-services']) {
      expect(leads.isInquiryCategory(slug)).toBe(true);
    }
    for (const slug of ['dining', 'shopping', 'beauty-wellness', undefined, null]) {
      expect(leads.isInquiryCategory(slug)).toBe(false);
    }
  });

  it('turns leads on only for the main site with a real database', async () => {
    const { leads } = await loadLeads(() => ({ data: null, error: null }));
    const { siteProfiles, defaultSiteProfile } = await import('@/lib/site-config');

    expect(leads.businessLeadsEnabled(defaultSiteProfile)).toBe(true);
    expect(leads.businessLeadsEnabled(siteProfiles['los-angeles'])).toBe(false);

    vi.stubEnv('DIRECTORY_USE_FIXTURES', '1');
    expect(leads.businessLeadsEnabled(defaultSiteProfile)).toBe(false);
  });
});
