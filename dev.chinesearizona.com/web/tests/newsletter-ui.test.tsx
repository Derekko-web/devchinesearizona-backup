import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ value: '/zh/community' }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}));

describe('footer newsletter form', () => {
  it('posts a real email field, hides a bot trap and shows the consent line with a privacy link', async () => {
    pathname.value = '/business';
    const Footer = (await import('@/components/Footer')).default;

    const html = renderToStaticMarkup(<Footer />);

    expect(html).not.toContain('action="#"');
    expect(html).toContain('name="email"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('name="website"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('By subscribing, you agree to get email updates from ChineseArizona. Unsubscribe anytime.');
    expect(html).toMatch(/href="\/privacy"[^>]*>Privacy</);
  });

  it('uses Chinese copy on Chinese pages', async () => {
    pathname.value = '/zh/news';
    vi.resetModules();
    const Footer = (await import('@/components/Footer')).default;

    const html = renderToStaticMarkup(<Footer />);

    expect(html).toContain('訂閱即表示你同意收到 ChineseArizona 的電子報，可隨時取消訂閱。');
    expect(html).toMatch(/href="\/zh\/privacy"[^>]*>隱私權政策</);
    expect(html).toContain('>訂閱<');
  });
});

describe('newsletter unsubscribe page', () => {
  const token = 'c'.repeat(64);

  it('asks for confirmation with a POST form instead of unsubscribing on page load', async () => {
    const { NewsletterUnsubscribeView } = await import('@/views/newsletter-unsubscribe-page');

    const html = renderToStaticMarkup(<NewsletterUnsubscribeView token={token} />);

    expect(html).toContain('Unsubscribe from our newsletter?');
    expect(html).toContain('確定要取消訂閱電子報嗎？');
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/newsletter/unsubscribe"');
    expect(html).toContain(`value="${token}"`);
  });

  it('shows the done, invalid, error and missing-token states in both languages', async () => {
    const { NewsletterUnsubscribeView } = await import('@/views/newsletter-unsubscribe-page');

    const done = renderToStaticMarkup(<NewsletterUnsubscribeView status="done" />);
    expect(done).toContain("You&#x27;re unsubscribed");
    expect(done).toContain('已取消訂閱');
    expect(done).not.toContain('<form');

    expect(renderToStaticMarkup(<NewsletterUnsubscribeView token="bad-token" />)).toContain('連結無效');
    expect(renderToStaticMarkup(<NewsletterUnsubscribeView status="invalid" />)).toContain('This link is not valid');
    expect(renderToStaticMarkup(<NewsletterUnsubscribeView status="error" />)).toContain('發生錯誤');
    expect(renderToStaticMarkup(<NewsletterUnsubscribeView />)).toContain('use the link at the bottom of any newsletter email');
  });
});
