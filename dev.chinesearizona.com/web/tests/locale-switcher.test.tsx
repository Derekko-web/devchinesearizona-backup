import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/community',
  useSearchParams: () => new URLSearchParams('city=Mesa'),
}));

describe('LocaleSwitcher', () => {
  it('keeps locale pills from shrinking or wrapping in either state', async () => {
    const { LocaleSwitcher } = await import('@/components/LocaleSwitcher');

    const englishHtml = renderToStaticMarkup(<LocaleSwitcher currentLocale="en" />);
    const chineseHtml = renderToStaticMarkup(<LocaleSwitcher currentLocale="zh" />);

    expect(englishHtml).toContain('shrink-0');
    expect(englishHtml).toContain('whitespace-nowrap');
    expect(englishHtml).toContain('href="/zh/community?city=Mesa"');
    expect(englishHtml).toContain('>中文</a>');

    expect(chineseHtml).toContain('shrink-0');
    expect(chineseHtml).toContain('whitespace-nowrap');
    expect(chineseHtml).toContain('aria-current="page"');
    expect(chineseHtml).toContain('>中文</span>');
  });
});
