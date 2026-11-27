import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// New claims email the admin when email is set up (#464).

const sendEmail = vi.fn();

vi.mock('@/lib/email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email')>();
  return { ...actual, sendEmail: (...args: unknown[]) => sendEmail(...args) };
});

const claim = {
  businessName: 'Lotus Kitchen',
  businessSlug: 'lotus-kitchen',
  claimantName: 'Grace Lin',
  email: 'grace@example.com',
  category: 'Restaurants',
  city: 'Chandler',
  details: 'I own this restaurant.',
};

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function emailOn() {
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  vi.stubEnv('EMAIL_FROM', 'ChineseArizona <leads@chinesearizona.com>');
  vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@chinesearizona.com');
}

describe('notifyAdminOfBusinessClaim', () => {
  it('emails the admin about a claim, with a reply-to for the claimant', async () => {
    emailOn();
    const { notifyAdminOfBusinessClaim } = await import('@/lib/claim-notifications');

    await expect(notifyAdminOfBusinessClaim(claim)).resolves.toBe('sent');

    const message = sendEmail.mock.calls[0][0];
    expect(message).toMatchObject({ to: 'admin@chinesearizona.com', replyTo: 'grace@example.com' });
    expect(message.subject).toBe('New claim: Lotus Kitchen / 新認領');
    expect(message.text).toContain('Grace Lin asked to claim Lotus Kitchen');
    expect(message.text).toContain('https://chinesearizona.com/admin');
    expect(message.text).toContain('https://chinesearizona.com/business/lotus-kitchen');
    expect(message.text).toContain('I own this restaurant.');
  });

  it('calls a request without a listing a new listing request', async () => {
    emailOn();
    const { buildClaimNotificationEmail } = await import('@/lib/claim-notifications');

    const message = buildClaimNotificationEmail({ ...claim, businessSlug: undefined, details: undefined });

    expect(message.subject).toBe('New listing request: Lotus Kitchen / 新增商家');
    expect(message.text).toContain('asked to add a new business');
    expect(message.text).not.toContain('/business/');
  });

  it('sends nothing while email is off or has no recipient, and never throws', async () => {
    const { notifyAdminOfBusinessClaim } = await import('@/lib/claim-notifications');

    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', '');
    await expect(notifyAdminOfBusinessClaim(claim)).resolves.toBe('email_not_configured');

    emailOn();
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', '');
    await expect(notifyAdminOfBusinessClaim(claim)).resolves.toBe('no_recipient');
    expect(sendEmail).not.toHaveBeenCalled();

    emailOn();
    sendEmail.mockRejectedValueOnce(new Error('email_rejected_500'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(notifyAdminOfBusinessClaim(claim)).resolves.toBe('failed');
  });
});
