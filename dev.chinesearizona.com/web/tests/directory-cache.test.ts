import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cachedDirectoryRead,
  DIRECTORY_CACHE_TTL_MS,
  directoryCacheSize,
  invalidateDirectoryCache,
} from '@/lib/directory-cache';

const env = process.env as Record<string, string | undefined>;
const originalTtl = env.DIRECTORY_CACHE_TTL_MS;
const originalNodeEnv = env.NODE_ENV;

beforeEach(() => {
  env.DIRECTORY_CACHE_TTL_MS = String(DIRECTORY_CACHE_TTL_MS);
  invalidateDirectoryCache();
});

afterEach(() => {
  invalidateDirectoryCache();
  vi.resetModules();
  vi.restoreAllMocks();
  env.DIRECTORY_CACHE_TTL_MS = originalTtl;
  env.NODE_ENV = originalNodeEnv;
  if (originalTtl === undefined) {
    delete env.DIRECTORY_CACHE_TTL_MS;
  }
});

describe('shared directory cache', () => {
  it('runs a query once and shares it until it expires', async () => {
    let clock = 1_000;
    const now = () => clock;
    const load = vi.fn(async () => ['listing']);

    const [first, second] = await Promise.all([
      cachedDirectoryRead('k', load, { now }),
      cachedDirectoryRead('k', load, { now }),
    ]);
    expect(first).toEqual(['listing']);
    expect(second).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);

    clock += DIRECTORY_CACHE_TTL_MS - 1;
    await cachedDirectoryRead('k', load, { now });
    expect(load).toHaveBeenCalledTimes(1);

    clock += 2;
    await cachedDirectoryRead('k', load, { now });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not keep failed or unwanted results', async () => {
    const failing = vi.fn(async () => {
      throw new Error('db down');
    });
    await expect(cachedDirectoryRead('fail', failing)).rejects.toThrow('db down');
    await expect(cachedDirectoryRead('fail', failing)).rejects.toThrow('db down');
    expect(failing).toHaveBeenCalledTimes(2);

    const miss = vi.fn(async () => null);
    await cachedDirectoryRead('miss', miss, { shouldCache: (value) => value !== null });
    await cachedDirectoryRead('miss', miss, { shouldCache: (value) => value !== null });
    expect(miss).toHaveBeenCalledTimes(2);
  });

  it('clears everything on invalidate', async () => {
    const load = vi.fn(async () => 1);
    await cachedDirectoryRead('a', load);
    await cachedDirectoryRead('b', load);
    expect(directoryCacheSize()).toBe(2);

    invalidateDirectoryCache();
    expect(directoryCacheSize()).toBe(0);
    await cachedDirectoryRead('a', load);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('keeps at most 300 entries, so search spam cannot fill memory', async () => {
    for (let index = 0; index < 350; index += 1) {
      await cachedDirectoryRead(`search:${index}`, async () => index);
    }
    expect(directoryCacheSize()).toBe(300);
  });

  it('is off when the TTL is 0, and off by default under tests', async () => {
    const load = vi.fn(async () => 1);
    env.DIRECTORY_CACHE_TTL_MS = '0';
    await cachedDirectoryRead('z', load);
    await cachedDirectoryRead('z', load);
    expect(load).toHaveBeenCalledTimes(2);

    delete env.DIRECTORY_CACHE_TTL_MS;
    await cachedDirectoryRead('z', load);
    expect(load).toHaveBeenCalledTimes(3);
    expect(directoryCacheSize()).toBe(0);
  });
});

describe('directory reads and writes', () => {
  function mockSupabase(order: ReturnType<typeof vi.fn>) {
    vi.doMock('@/lib/supabase', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/supabase')>()),
      getSupabaseClient: () => ({ from: () => ({ select: () => ({ order }) }) }),
      getSupabaseServiceClient: () => null,
      isSupabaseConfigured: () => true,
      isSupabaseServiceConfigured: () => false,
    }));
  }

  it('serves categories from the cache and refetches after an owner edit', async () => {
    env.NODE_ENV = 'development';
    const order = vi.fn(async () => ({
      data: [{ slug: 'medical', name_en: 'Medical', name_zh_tw: '醫療', description_en: 'Care', description_zh_tw: '照護', icon: 'stethoscope' }],
      error: null,
    }));
    mockSupabase(order);
    const { getDirectoryCategories } = await import('@/lib/directory');
    const { updateBusinessPhotosForProfile } = await import('@/lib/directory-owner');

    await getDirectoryCategories();
    const categories = await getDirectoryCategories();
    expect(categories.map((category) => category.slug)).toEqual(['medical']);
    expect(order).toHaveBeenCalledTimes(1);

    // Any owner write clears the cache, even one that fails, so the next page load is fresh.
    await expect(
      updateBusinessPhotosForProfile({ businessSlug: 'x', profileId: 'p', role: 'member', gallery: [] })
    ).rejects.toThrow();
    await getDirectoryCategories();
    expect(order).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed category query', async () => {
    env.NODE_ENV = 'development';
    const order = vi.fn(async () => ({ data: null, error: { message: 'down' } }));
    mockSupabase(order);
    const { getDirectoryCategories } = await import('@/lib/directory');

    await getDirectoryCategories();
    await getDirectoryCategories();
    expect(order).toHaveBeenCalledTimes(2);
  });
});
