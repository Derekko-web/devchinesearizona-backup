import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Discover Arizona hub page', () => {
  it('has exactly one main heading (H1) in each language', async () => {
    const { DiscoverArizonaHubPageView } = await import('@/views/discover-arizona');

    const en = renderToStaticMarkup(await DiscoverArizonaHubPageView({ locale: 'en' }));
    const zh = renderToStaticMarkup(await DiscoverArizonaHubPageView({ locale: 'zh' }));

    expect(en.match(/<h1\b/g)).toHaveLength(1);
    expect(en).toContain('<h1 class="sr-only">Discover Arizona</h1>');
    expect(zh.match(/<h1\b/g)).toHaveLength(1);
    expect(zh).toContain('<h1 class="sr-only">探索亞利桑那</h1>');
  });
});
