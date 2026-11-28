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

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: ({ entitySlug }: { entitySlug: string }) => <div data-report-issue={entitySlug} />,
}));

// A plaza import: generated English text, no phone, no hours, boilerplate services.
const slug = 'wong-insurance-agency-mesa';

async function render(locale: 'en' | 'zh') {
  const { BusinessDetailPageView } = await import('@/views/site-pages');
  const rendered = await BusinessDetailPageView({ locale, slug });
  expect(rendered).toBeTruthy();
  return renderToStaticMarkup(rendered);
}

describe('thin business pages (#473)', () => {
  it('replaces the generated English paragraph with one honest line in the page language', async () => {
    const zh = await render('zh');
    expect(zh).not.toContain('generated from plaza directory sources');
    expect(zh).not.toContain('practical listing inside');
    expect(zh).toContain('我們還沒有這家商家的詳細資料。');
    expect(zh).toContain('是你的商家嗎？免費認領即可補上。');
    expect(zh).toContain('/zh/add-business?businessSlug=wong-insurance-agency-mesa');

    const en = await render('en');
    expect(en).not.toContain('generated from plaza directory sources');
    expect(en).toContain("We don&#x27;t have details for this business yet.");
  });

  it('hides empty rows instead of printing "pending"', async () => {
    const zh = await render('zh');
    expect(zh).not.toContain('待補充');
    expect(zh).not.toContain('商家尚未提供結構化營業時間');

    const en = await render('en');
    expect(en).not.toMatch(/Phone pending|Hours not listed|Price pending|Email not listed|Website not listed|Language details pending/);
  });

  it('shows no cut-down service chips and no stand-in picture', async () => {
    const en = await render('en');
    expect(en).not.toContain('And Practical Support');
    // Its own AI picture is gone (cards for other businesses are a separate question).
    expect(en).not.toContain('/directory-ai-replacements/wong-insurance-agency-mesa');
    expect(en).not.toContain('Placeholder');

    const zh = await render('zh');
    expect(zh).not.toContain('示意圖');
  });

  it('suggests only same-category listings with real details, or none', async () => {
    const [{ getDirectoryBusinessBySlug, getDirectoryBusinesses, selectSimilarBusinesses, shouldNoIndexDirectoryBusiness }] =
      await Promise.all([import('@/lib/directory')]);
    const business = await getDirectoryBusinessBySlug(slug);
    expect(business).toBeDefined();

    const candidates = await getDirectoryBusinesses({ category: business!.categorySlug }, { excludeSlug: slug });
    const similar = selectSimilarBusinesses(business!, candidates);
    for (const item of similar) {
      expect(item.categorySlug).toBe(business!.categorySlug);
      expect(shouldNoIndexDirectoryBusiness(item)).toBe(false);
    }

    const html = await render('en');
    if (similar.length === 0) {
      expect(html).not.toContain('More options in');
    }
  });
});
