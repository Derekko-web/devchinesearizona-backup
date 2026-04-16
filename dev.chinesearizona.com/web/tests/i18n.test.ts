import { describe, expect, it } from 'vitest';

import {
  articleCategoryLabel,
  businessHoursLabel,
  businessHoursValue,
  formatLanguageList,
  formatReadTime,
  guideSectionLabel,
  localeLangAttribute,
  localeName,
  profileRoleLabel,
  reportReasonLabel,
  resolveLocale,
  t,
} from '@/lib/i18n';

describe('i18n helpers', () => {
  it('translates shared content labels for Chinese surfaces', () => {
    expect(articleCategoryLabel('feature', 'zh')).toBe('專題');
    expect(guideSectionLabel('schools', 'zh')).toBe('學校教育');
    expect(profileRoleLabel('business_owner', 'zh')).toBe('商家主理人');
    expect(reportReasonLabel('unsafe', 'zh')).toBe('不安全或可疑');
  });

  it('formats language lists and read-time copy for the active locale', () => {
    expect(formatLanguageList(['English', 'Traditional Chinese'], 'zh')).toBe('英文 · 繁體中文');
    expect(formatReadTime('8 min', 'zh')).toBe('8 分鐘閱讀');
    expect(formatReadTime('8 min', 'en')).toBe('8 min read');
  });

  it('formats business hours for both condensed cards and full profiles', () => {
    expect(businessHoursLabel('Monday, Tuesday, Wednesday', 'zh')).toBe('週一、週二、週三');
    expect(businessHoursValue('10:30:00 - 21:00:00', 'en')).toBe('10:30 AM - 9:00 PM');
    expect(businessHoursValue('10:30:00 - 21:00:00', 'zh')).toBe('10:30 - 21:00');
  });

  it('normalizes the Chinese locale without tying it to Taiwan', () => {
    expect(resolveLocale('zh-TW')).toBe('zh');
    expect(localeName('zh', 'en')).toBe('Chinese');
    expect(localeLangAttribute('zh')).toBe('zh-Hant');
  });

  it('falls back to English when Chinese content is missing', () => {
    expect(t({ en: 'English only copy' }, 'zh')).toBe('English only copy');
  });
});
