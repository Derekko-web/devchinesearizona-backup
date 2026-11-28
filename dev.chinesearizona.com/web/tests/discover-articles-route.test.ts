import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

const baseArticle = {
  candidateId: 'candidate-1',
  primaryCategory: 'family-fun',
  queueStatus: 'draft',
  titleEn: 'Bearizona Wildlife Park in Williams',
  titleZh: 'Williams 的 Bearizona Wildlife Park：適合全家出遊的自駕野生動物園',
  excerptEn: 'A drive-through wildlife park.',
  excerptZh: '可以開車穿過園區觀賞北美動物。',
  bodyEn: 'Drive through, then walk Fort Bearizona.',
  bodyZh: '先開車看動物，再步行參觀 Fort Bearizona。',
  embedEnabled: false,
};

async function postArticle(article: Record<string, unknown>, locale = 'en') {
  const upsertDiscoverArticle = vi.fn().mockResolvedValue({ slug: 'bearizona-wildlife-park-williams' });

  vi.doMock('@/lib/api-auth', () => ({
    requireApiUser: vi.fn().mockResolvedValue({
      profile: { id: 'profile-1', role: 'admin' },
      response: null,
      user: { app_metadata: {} },
    }),
    withApiAuthSession: vi.fn((response: Response) => response),
  }));
  vi.doMock('@/lib/discover-arizona', () => ({
    parseLineList: (value: string) => value.split('\n').filter(Boolean),
    upsertDiscoverArticle,
  }));
  vi.doMock('@/lib/discovery-taxonomy', () => ({
    isDiscoveryCategory: () => true,
    isDiscoveryQueueStatus: () => true,
  }));
  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn(() => true),
  }));

  const { POST } = await import('@/app/api/discover/articles/route');
  const response = await POST(
    new NextRequest('https://dev.chinesearizona.com/api/discover/articles', {
      body: JSON.stringify(article),
      headers: { 'content-type': 'application/json', 'x-locale': locale },
      method: 'POST',
    })
  );

  return { response, upsertDiscoverArticle };
}

describe('Discover article save route', () => {
  it('saves articles whose Chinese fields are Traditional Chinese', async () => {
    const { response, upsertDiscoverArticle } = await postArticle(baseArticle);

    expect(response.status).toBe(200);
    expect(upsertDiscoverArticle).toHaveBeenCalledTimes(1);
  });

  it('refuses Simplified Chinese and names the fields and characters', async () => {
    const { response, upsertDiscoverArticle } = await postArticle({
      ...baseArticle,
      titleZh: 'Williams 的 Bearizona Wildlife Park：适合家庭出游的自驾野生动物园',
      bodyZh: '先开车看动物。',
    });

    expect(response.status).toBe(400);
    expect(upsertDiscoverArticle).not.toHaveBeenCalled();
    const { message } = (await response.json()) as { message: string };
    expect(message).toContain('Traditional Chinese as used in Taiwan');
    expect(message).toContain('Chinese title, Chinese body');
    expect(message).toContain('驾');
  });

  it('explains the refusal in Traditional Chinese for Chinese admins', async () => {
    const { response } = await postArticle({ ...baseArticle, excerptZh: '可以开车穿过园区。' }, 'zh');

    expect(response.status).toBe(400);
    const { message } = (await response.json()) as { message: string };
    expect(message).toContain('台灣慣用的繁體中文');
    expect(message).toContain('中文摘要');
  });
});
