// Shared by the footer form (browser) and the subscribe route (server).

export const NEWSLETTER_UNSUBSCRIBE_PATH = '/newsletter/unsubscribe';

// A hidden field people never see; bots that fill every input fill it too.
export const NEWSLETTER_HONEYPOT_FIELD = 'website';

export const NEWSLETTER_RESULT_CODES = [
  'subscribed',
  'invalid_email',
  'rate_limited',
  'unavailable',
  'error',
] as const;

export type NewsletterResultCode = (typeof NEWSLETTER_RESULT_CODES)[number];

type Copy = { en: string; zh: string };

// Each result is shown in both languages, the page's language first.
export const newsletterResultCopy: Record<NewsletterResultCode, Copy> = {
  subscribed: {
    en: "You're subscribed. Thanks for joining!",
    zh: '訂閱成功，謝謝你的加入！',
  },
  invalid_email: {
    en: 'Please enter a valid email address.',
    zh: '請輸入有效的 Email。',
  },
  rate_limited: {
    en: 'Too many tries. Please wait a few minutes and try again.',
    zh: '嘗試次數太多，請稍候幾分鐘再試。',
  },
  unavailable: {
    en: "Sign-up isn't available right now. Please try again later.",
    zh: '目前暫停訂閱，請稍後再試。',
  },
  error: {
    en: "We couldn't save your email. Please try again.",
    zh: '無法儲存你的 Email，請再試一次。',
  },
};

export function isNewsletterResultCode(value: unknown): value is NewsletterResultCode {
  return typeof value === 'string' && (NEWSLETTER_RESULT_CODES as readonly string[]).includes(value);
}

export function newsletterConsentCopy(brandName: string): Copy {
  return {
    en: `By subscribing, you agree to get email updates from ${brandName}. Unsubscribe anytime.`,
    zh: `訂閱即表示你同意收到 ${brandName} 的電子報，可隨時取消訂閱。`,
  };
}
