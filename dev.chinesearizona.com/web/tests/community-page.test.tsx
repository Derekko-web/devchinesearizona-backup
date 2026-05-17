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
});
