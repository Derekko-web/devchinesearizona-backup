// Bilingual listing details (issue #411): spoken languages, WeChat ID,
// WeChat Pay / Alipay, and Chinese menus or forms. Newcomers need these and
// map listings rarely have them. No server dependencies, so the dashboard and
// admin editors can use this module too.

import type { LanguageOption, Locale } from '@/lib/types';

// Spoken languages an owner can pick. "Chinese" is for a source that does not
// name a dialect. Older listings may also carry "Traditional Chinese" (written,
// not spoken); saving keeps any value not offered here.
export const spokenLanguageOptions = ['Mandarin', 'Cantonese', 'Taiwanese', 'Chinese', 'English'] as const satisfies readonly LanguageOption[];
export type SpokenLanguage = (typeof spokenLanguageOptions)[number];

export const paymentFilterOptions = ['wechat-pay', 'alipay'] as const;
export type PaymentFilter = (typeof paymentFilterOptions)[number];

export const WECHAT_ID_MAX_LENGTH = 40;

export type BusinessBilingualDetails = {
  languages: string[];
  wechatId?: string;
  acceptsWeChatPay: boolean;
  acceptsAlipay: boolean;
  chineseMenuOrForms: boolean;
};

export type BilingualDetailsInput = {
  languages?: unknown;
  wechatId?: unknown;
  acceptsWeChatPay?: unknown;
  acceptsAlipay?: unknown;
  chineseMenuOrForms?: unknown;
};

export class BilingualDetailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BilingualDetailsError';
  }
}

export function isSpokenLanguage(value: unknown): value is SpokenLanguage {
  return typeof value === 'string' && spokenLanguageOptions.includes(value as SpokenLanguage);
}

export function isPaymentFilter(value: unknown): value is PaymentFilter {
  return typeof value === 'string' && paymentFilterOptions.includes(value as PaymentFilter);
}

// WeChat IDs are letters, digits, underscores and hyphens; some businesses use
// their phone number, so "+" and digits are allowed too.
export function normalizeWeChatId(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().replace(/^@/, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isValidWeChatId(value: string): boolean {
  return value.length >= 2 && value.length <= WECHAT_ID_MAX_LENGTH && /^[A-Za-z0-9_+-]+$/.test(value);
}

// Validates editor input. `existingLanguages` keeps legacy values the editor
// does not offer, so saving never drops them.
export function parseBilingualDetails(
  input: BilingualDetailsInput,
  locale: Locale,
  existingLanguages: readonly string[] = []
): BusinessBilingualDetails {
  const zh = locale === 'zh';
  if (input.languages !== undefined && !Array.isArray(input.languages)) {
    throw new BilingualDetailsError(zh ? '語言資料格式不正確。' : 'Languages must be a list.');
  }

  const picked = (Array.isArray(input.languages) ? input.languages : []).filter(isSpokenLanguage);
  const kept = existingLanguages.filter((language) => !isSpokenLanguage(language));
  const languages = [
    ...spokenLanguageOptions.filter((language) => picked.includes(language)),
    ...kept,
  ];

  const wechatId = normalizeWeChatId(input.wechatId);
  if (wechatId && !isValidWeChatId(wechatId)) {
    throw new BilingualDetailsError(
      zh
        ? `微信號只能包含英文字母、數字、底線或連字號，長度 2 到 ${WECHAT_ID_MAX_LENGTH} 個字元。`
        : `WeChat ID can only use letters, numbers, underscores or hyphens, 2 to ${WECHAT_ID_MAX_LENGTH} characters.`
    );
  }

  return {
    languages,
    wechatId,
    acceptsWeChatPay: input.acceptsWeChatPay === true,
    acceptsAlipay: input.acceptsAlipay === true,
    chineseMenuOrForms: input.chineseMenuOrForms === true,
  };
}

export function hasBilingualServiceDetails(details: {
  wechatId?: string;
  acceptsWeChatPay?: boolean;
  acceptsAlipay?: boolean;
  chineseMenuOrForms?: boolean;
}): boolean {
  return Boolean(
    details.wechatId || details.acceptsWeChatPay || details.acceptsAlipay || details.chineseMenuOrForms
  );
}

export const paymentLabels: Record<PaymentFilter, { en: string; zh: string }> = {
  'wechat-pay': { en: 'WeChat Pay', zh: '微信支付' },
  alipay: { en: 'Alipay', zh: '支付寶' },
};

export function chineseMaterialsLabel(categorySlug: string | undefined, locale: Locale): string {
  const dining = categorySlug === 'dining';
  if (locale === 'zh') {
    return dining ? '提供中文菜單' : '提供中文表格或資料';
  }

  return dining ? 'Chinese menu available' : 'Chinese forms or materials available';
}

// Payment methods for schema.org `paymentAccepted`.
export function acceptedPaymentNames(details: { acceptsWeChatPay?: boolean; acceptsAlipay?: boolean }): string[] {
  return [
    ...(details.acceptsWeChatPay ? [paymentLabels['wechat-pay'].en] : []),
    ...(details.acceptsAlipay ? [paymentLabels.alipay.en] : []),
  ];
}
