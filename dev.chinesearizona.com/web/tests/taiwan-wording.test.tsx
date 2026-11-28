import fs from 'node:fs';
import path from 'node:path';
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

vi.mock('@/components/forms/BusinessClaimForm', () => ({
  BusinessClaimForm: () => <form data-testid="business-claim-form" />,
}));

// Mainland terms with a clear Taiwan equivalent (company rule: Traditional
// Chinese as used in Taiwan). 搜索→搜尋, 信息→資訊, 鏈接→連結, 網絡→網路, 關鍵詞→關鍵字.
const MAINLAND_TERMS = ['搜索', '信息', '鏈接', '網絡', '關鍵詞'];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('Taiwan wording (#509)', () => {
  it('keeps common mainland terms out of the source code', () => {
    const offenders = sourceFiles(path.join(process.cwd(), 'src')).flatMap((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return MAINLAND_TERMS.filter((term) => text.includes(term)).map((term) => `${path.relative(process.cwd(), file)}: ${term}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses 搜尋 on the Chinese homepage and an owner-first headline on /zh/add-business', async () => {
    const [{ HomePageView }, { AddBusinessPageView }] = await Promise.all([
      import('@/views/home-page'),
      import('@/views/site-pages'),
    ]);

    const home = renderToStaticMarkup(await HomePageView({ locale: 'zh' }));
    expect(home).toContain('搜尋商家、服務或關鍵字');
    expect(home).toContain('熱門搜尋');

    const addBusiness = renderToStaticMarkup(await AddBusinessPageView({ locale: 'zh' }));
    expect(addBusiness).toContain('認領你的商家頁面，完全免費。');
    expect(addBusiness).not.toContain('被找到、被維護、被驗證');
  });

  it('says "in one Arizona category" on /advertise', async () => {
    const { getAdvertisePlans } = await import('@/lib/advertise');
    const sponsored = getAdvertisePlans().find((plan) => plan.id === 'sponsored-category');

    expect(sponsored?.summary.en).toContain('in one Arizona category');
    expect(sponsored?.summary.en).not.toContain('a Arizona');
  });
});
