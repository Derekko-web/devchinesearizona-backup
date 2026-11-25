import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

const validBody = {
  businessSlug: 'elite-az-realty-team',
  inquiryType: 'quote',
  name: '  Amy Lin ',
  email: 'Amy@Example.com',
  phone: '480-555-0101',
  message: 'Looking for a 3 bedroom home in Chandler.',
  pagePath: '/en/business/elite-az-realty-team',
  company_website: '',
};

function inquiryRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://127.0.0.1:3001/api/directory/inquiries', {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.20, 203.0.113.7, 127.0.0.1',
      ...headers,
    },
    method: 'POST',
  });
}

async function loadRoute(options: { allowed?: boolean; submit?: ReturnType<typeof vi.fn> } = {}) {
  const checkRateLimit = vi.fn(() => options.allowed ?? true);
  const submitBusinessInquiry = options.submit ?? vi.fn().mockResolvedValue({ id: 'inquiry-1', notified: true });

  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
  vi.doMock('@/lib/business-leads', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/business-leads')>()),
    submitBusinessInquiry,
  }));

  const { POST } = await import('@/app/api/directory/inquiries/route');
  return { POST, checkRateLimit, submitBusinessInquiry };
}

describe('business inquiries route', () => {
  it('rate limits by the visitor address our proxies forwarded, not one the client sent', async () => {
    const { POST, checkRateLimit } = await loadRoute();

    const response = await POST(inquiryRequest(validBody));

    expect(response.status).toBe(200);
    expect(checkRateLimit).toHaveBeenCalledWith('business-inquiry:203.0.113.7', 5, 600_000);
  });

  it('returns 429 with a bilingual message once the limit is reached', async () => {
    const { POST, submitBusinessInquiry } = await loadRoute({ allowed: false });

    const response = await POST(inquiryRequest(validBody, { 'x-locale': 'zh' }));

    expect(response.status).toBe(429);
    expect((await response.json()).message).toContain('送出次數太多');
    expect(submitBusinessInquiry).not.toHaveBeenCalled();
  });

  it('saves a valid inquiry with trimmed fields and a lower-case email', async () => {
    const { POST, submitBusinessInquiry } = await loadRoute();

    const response = await POST(inquiryRequest(validBody));

    expect(response.status).toBe(200);
    expect((await response.json()).message).toContain('Sent');
    expect(submitBusinessInquiry).toHaveBeenCalledWith({
      businessSlug: 'elite-az-realty-team',
      inquiryType: 'quote',
      name: 'Amy Lin',
      email: 'amy@example.com',
      phone: '480-555-0101',
      message: 'Looking for a 3 bedroom home in Chandler.',
      locale: 'en',
      pagePath: '/en/business/elite-az-realty-team',
    });
  });

  it('pretends to succeed for bots that fill the hidden honeypot field, and saves nothing', async () => {
    const { POST, submitBusinessInquiry } = await loadRoute();

    const response = await POST(inquiryRequest({ ...validBody, company_website: 'https://spam.example' }));

    expect(response.status).toBe(200);
    expect(submitBusinessInquiry).not.toHaveBeenCalled();
  });

  it('rejects missing fields and bad emails before touching the database', async () => {
    const { POST, submitBusinessInquiry } = await loadRoute();

    const missing = await POST(inquiryRequest({ businessSlug: 'elite-az-realty-team', name: 'Amy' }, { 'x-locale': 'zh' }));
    expect(missing.status).toBe(400);
    expect((await missing.json()).message).toContain('請填寫');

    const badEmail = await POST(inquiryRequest({ ...validBody, email: 'not-an-email' }));
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).message).toContain('valid email');

    const tooLong = await POST(inquiryRequest({ ...validBody, message: 'x'.repeat(2001) }));
    expect(tooLong.status).toBe(400);

    const badType = await POST(inquiryRequest({ ...validBody, inquiryType: 'referral' }));
    expect(badType.status).toBe(400);

    expect(submitBusinessInquiry).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const { POST } = await loadRoute();

    const response = await POST(inquiryRequest('name=Amy'));

    expect(response.status).toBe(400);
  });

  it('passes through the status of a lead error, such as an unknown listing', async () => {
    // Import the error class inside the mock so it comes from the same module
    // instance the route sees.
    const submit = vi.fn(async () => {
      const { BusinessLeadError } = await import('@/lib/business-leads');
      throw new BusinessLeadError('Listing not found.', 404);
    });
    const { POST } = await loadRoute({ submit });

    const response = await POST(inquiryRequest(validBody));

    expect(response.status).toBe(404);
    expect((await response.json()).message).toBe('Listing not found.');
  });

  it('hides unexpected errors behind a generic message', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('connection reset by db-host-17'));
    const { POST } = await loadRoute({ submit });

    const response = await POST(inquiryRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).not.toContain('db-host-17');
  });
});
