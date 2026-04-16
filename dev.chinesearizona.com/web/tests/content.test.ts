import { describe, expect, it } from 'vitest';

import {
  getBusinesses,
  getCommunityPostBySlug,
  getCommunityPosts,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { createCommunityPost, createModerationReport } from '@/lib/runtime-store';

describe('content selectors', () => {
  it('filters businesses by city, category, and verified trust signal', () => {
    const results = getBusinesses('en', {
      city: 'Chandler',
      category: 'real-estate',
      verifiedOnly: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.slug).toBe('elite-az-realty-team');
  });

  it('includes runtime community submissions in the public feed', () => {
    const post = createCommunityPost({
      type: 'board',
      title: {
        en: 'Test Runtime Post',
        zh: '測試即時貼文',
      },
      excerpt: {
        en: 'Runtime feed coverage',
        zh: '即時社群串接',
      },
      body: [
        {
          en: 'This post exists to prove runtime submissions are merged into the community feed.',
          zh: '這則貼文用來驗證即時提交會被併入社群列表。',
        },
      ],
      authorSlug: 'newcomer-derek',
      city: 'Mesa',
      price: undefined,
      linkUrl: 'https://example.com/runtime-post',
    });

    const results = getCommunityPosts('board');
    expect(results.some((item) => item.slug === post.slug)).toBe(true);
  });

  it('marks reported community posts as noindex', () => {
    createModerationReport('used-minivan-east-valley', 'spam');
    const post = getCommunityPostBySlug('classified', 'used-minivan-east-valley');

    expect(post).toBeDefined();
    expect(post?.reportCount).toBeGreaterThan(0);
    expect(shouldNoIndexCommunityPost(post!)).toBe(true);
  });
});
