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

vi.mock('@/lib/site-config.server', async () => {
  const { siteProfiles } = await import('@/lib/site-config');
  return { getCurrentSiteProfile: async () => siteProfiles['los-angeles'] };
});

describe('not-found page', () => {
  it('gives lost visitors a heading, a search box and links back into the site', async () => {
    const [{ default: NotFound }, { siteProfiles }] = await Promise.all([
      import('@/app/not-found'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(await NotFound());

    expect(html).toContain('<h1');
    expect(html).toContain('找不到這個頁面');
    expect(html).toContain('action="/business"');
    expect(html).toContain('name="q"');
    expect(html).toContain('href="/business"');
    expect(html).toContain(`href="${siteProfiles['los-angeles'].news.routePath}"`);
    expect(html).toContain('href="/"');
  });
});
