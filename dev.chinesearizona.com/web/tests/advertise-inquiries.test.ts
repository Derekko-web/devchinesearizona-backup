import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Advertising inquiries saved on our side instead of a mailto: link (#474).

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/lib/supabase');
  vi.doUnmock('@/lib/rate-limit');
  vi.doUnmock('@/lib/email');
});

const validBody = {
  name: '  Amy Lin ',
  businessName: 'Lotus Dental',
  contact: 'amy@example.com',
  planId: 'homepage-spotlight',
  message: 'Interested in the spotlight for January.',
  pagePath: '/en/advertise',
  company_website: '',
};

function inquiryRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://127.0.0.1:3001/api/advertise/inquiries', {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.20, 203.0.113.7, 127.0.0.1',
      ...headers,
    },
    method: 'POST',
  });
}

type Call = { table: string; ops: Array<[string, ...unknown[]]> };

function fakeSupabase(options: { insertError?: unknown; rows?: unknown[] } = {}) {
  const calls: Call[] = [];
  function from(table: string) {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const op of ['insert', 'update', 'select', 'eq', 'order', 'limit']) {
      builder[op] = (...args: unknown[]) => {
        call.ops.push([op, ...args]);
        return builder;
      };
    }
    builder.single = () =>
      Promise.resolve(options.insertError ? { data: null, error: options.insertError } : { data: { id: 'inq-1' }, error: null });
    builder.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: options.rows ?? [], error: null }).then(resolve);
    return builder;
  }
  return { client: { from }, calls };
}

function opArgs(call: Call | undefined, op: string) {
  return call?.ops.find(([name]) => name === op)?.slice(1) ?? [];
}

async function loadRoute(options: { allowed?: boolean; supabase?: ReturnType<typeof fakeSupabase> | null } = {}) {
  const checkRateLimit = vi.fn(() => options.allowed ?? true);
  const supabase = options.supabase === undefined ? fakeSupabase() : options.supabase;
  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
  vi.doMock('@/lib/supabase', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/supabase')>()),
    getSupabaseServiceClient: () => supabase?.client ?? null,
  }));
  const route = await import('@/app/api/advertise/inquiries/route');
  return { POST: route.POST, checkRateLimit, supabase };
}

describe('POST /api/advertise/inquiries', () => {
  it('saves the inquiry with the site it came from and promises a reply within one business day', async () => {
    const { POST, checkRateLimit, supabase } = await loadRoute();

    const response = await POST(inquiryRequest(validBody, { host: 'chineseaustin.com', 'x-locale': 'zh' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('一個工作天內');
    expect(checkRateLimit).toHaveBeenCalledWith('advertise-inquiry:203.0.113.7', 5, 600_000);
    const insert = supabase!.calls.find((call) => call.ops.some(([op]) => op === 'insert'));
    expect(opArgs(insert, 'insert')[0]).toEqual({
      site_key: 'austin',
      plan_id: 'homepage-spotlight',
      name: 'Amy Lin',
      business_name: 'Lotus Dental',
      contact: 'amy@example.com',
      message: 'Interested in the spotlight for January.',
      locale: 'zh',
      page_path: '/en/advertise',
    });
    // Email is off in tests, so the row records why nobody was emailed.
    const update = supabase!.calls.find((call) => call.ops.some(([op]) => op === 'update'));
    expect(opArgs(update, 'update')[0]).toEqual({ notify_error: 'email_not_configured' });
  });

  it('answers in English on the main site', async () => {
    const { POST } = await loadRoute();
    const body = await (await POST(inquiryRequest(validBody, { host: 'chinesearizona.com' }))).json();
    expect(body.message).toContain('within one business day');
  });

  it('rejects missing fields, unknown plans, bad JSON and too many messages', async () => {
    const missing = await loadRoute();
    const noContact = await missing.POST(inquiryRequest({ ...validBody, contact: ' ' }));
    expect(noContact.status).toBe(400);
    expect((await noContact.json()).message).toContain('how to reach you');

    vi.resetModules();
    const plan = await loadRoute();
    expect((await plan.POST(inquiryRequest({ ...validBody, planId: 'free-money' }))).status).toBe(400);

    vi.resetModules();
    const json = await loadRoute();
    expect((await json.POST(inquiryRequest('{not json'))).status).toBe(400);

    vi.resetModules();
    const limited = await loadRoute({ allowed: false });
    expect((await limited.POST(inquiryRequest(validBody))).status).toBe(429);
    expect(limited.supabase!.calls).toHaveLength(0);
  });

  it('looks successful to a bot that fills the hidden field, and saves nothing', async () => {
    const { POST, supabase } = await loadRoute();
    const response = await POST(inquiryRequest({ ...validBody, company_website: 'spam.example' }));
    expect(response.status).toBe(200);
    expect(supabase!.calls).toHaveLength(0);
  });

  it('answers 503 when the database is not set up, and 500 when saving fails', async () => {
    const offline = await loadRoute({ supabase: null });
    expect((await offline.POST(inquiryRequest(validBody))).status).toBe(503);

    vi.resetModules();
    const failing = await loadRoute({ supabase: fakeSupabase({ insertError: { message: 'boom' } }) });
    expect((await failing.POST(inquiryRequest(validBody))).status).toBe(500);
  });
});

describe('advertise inquiry email', () => {
  it('emails the admin when email is set up, replying to the business when they gave an email', async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('EMAIL_FROM', 'ChineseArizona <leads@chinesearizona.com>');
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@chinesearizona.com');
    vi.doMock('@/lib/email', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/email')>()),
      sendEmail,
    }));
    const supabase = fakeSupabase();
    vi.doMock('@/lib/supabase', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/supabase')>()),
      getSupabaseServiceClient: () => supabase.client,
    }));
    const { submitAdvertiseInquiry, parseAdvertiseInquiryInput } = await import('@/lib/advertise-inquiries');
    const { defaultSiteProfile } = await import('@/lib/site-config');

    const result = await submitAdvertiseInquiry({
      inquiry: parseAdvertiseInquiryInput(validBody, 'en'),
      locale: 'en',
      site: defaultSiteProfile,
    });

    expect(result).toEqual({ id: 'inq-1', notified: true });
    const message = sendEmail.mock.calls[0][0];
    expect(message).toMatchObject({ to: 'admin@chinesearizona.com', replyTo: 'amy@example.com' });
    expect(message.subject).toContain('Lotus Dental');
    expect(message.text).toContain('Homepage spotlight');
    expect(message.text).toContain('within one business day');
  });

  it('leaves out reply-to when the business gave a phone or WeChat ID', async () => {
    const { buildAdvertiseInquiryEmail, parseAdvertiseInquiryInput } = await import('@/lib/advertise-inquiries');
    const { defaultSiteProfile } = await import('@/lib/site-config');

    const email = buildAdvertiseInquiryEmail({
      inquiry: parseAdvertiseInquiryInput({ ...validBody, contact: 'WeChat: lotusdental88', planId: '' }, 'zh'),
      locale: 'zh',
      site: defaultSiteProfile,
    });

    expect(email.replyTo).toBeUndefined();
    expect(email.text).toContain('Not sure yet / 尚未決定');
    expect(email.text).toContain('Language 語言: 中文');
  });
});

describe('getRecentAdvertiseInquiries', () => {
  it('names the site and plan for the admin list', async () => {
    const supabase = fakeSupabase({
      rows: [
        {
          id: 'inq-1',
          site_key: 'los-angeles',
          plan_id: 'bilingual-write-up',
          name: 'Amy Lin',
          business_name: 'Lotus Dental',
          contact: '626-555-0101',
          message: null,
          locale: 'zh',
          created_at: '2026-11-27T20:00:00.000Z',
          notified_at: null,
          notify_error: 'email_not_configured',
        },
      ],
    });
    vi.doMock('@/lib/supabase', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/supabase')>()),
      getSupabaseServiceClient: () => supabase.client,
    }));
    const { getRecentAdvertiseInquiries } = await import('@/lib/advertise-inquiries');

    const [inquiry] = await getRecentAdvertiseInquiries();

    expect(inquiry).toMatchObject({
      siteKey: 'los-angeles',
      siteName: 'ChineseLosAngeles',
      businessName: 'Lotus Dental',
      contact: '626-555-0101',
      locale: 'zh',
      notifyError: 'email_not_configured',
    });
    expect(inquiry.planName).toContain('/');
    expect(inquiry.message).toBeUndefined();
  });
});
