import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CommunityPageView', () => {
  it('renders the redesigned community resource lanes', async () => {
    const { CommunityPageView } = await import('@/views/community-page');

    const html = renderToStaticMarkup(<CommunityPageView locale="en" />);

    expect(html).toContain('Find your people in Arizona.');
    expect(html).toContain('Chinese Schools');
    expect(html).toContain('Chinese Churches');
    expect(html).toContain('Ping Pong Clubs');
    expect(html).toContain('Events');
    expect(html).not.toContain('Festivals, tournaments, and recurring community dates');
    expect(html).not.toContain('The strongest community calendar mixes big annual festivals with smaller sport and culture events.');
    expect(html).toContain('Phoenix Wushu Nationals 2026');
    expect(html).toContain('/en/add-business');
  });

  it('does not serve Arizona community resources for placeholder city sites', async () => {
    const [{ siteProfiles }, { CommunityPageView }] = await Promise.all([
      import('@/lib/site-config'),
      import('@/views/community-page'),
    ]);

    const html = renderToStaticMarkup(<CommunityPageView locale="en" site={siteProfiles.austin} />);

    expect(html).toContain('ChineseAustin community content is not connected yet');
    expect(html).toContain('will not fall back to ChineseArizona community content');
    expect(html).not.toContain('Chinese Linguistic School of Phoenix');
    expect(html).not.toContain('Phoenix Wushu Nationals 2026');
  });
});
