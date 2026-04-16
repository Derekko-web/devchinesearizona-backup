import { AlertTriangle, ExternalLink, MessageSquareText, Tags } from 'lucide-react';

import { formatDate, t } from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import type { CommunityPost, Locale } from '@/lib/types';
import { TrackedLink } from '@/components/TrackedLink';

type CommunityCardProps = {
  post: CommunityPost;
  locale: Locale;
};

export function CommunityCard({ post, locale }: CommunityCardProps) {
  const section = post.type === 'classified' ? 'classifieds' : 'board';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {post.type === 'classified'
                ? locale === 'zh'
                  ? '二手／分類'
                  : 'Classified'
                : locale === 'zh'
                  ? '社群看板'
                  : 'Community Board'}
            </span>
            <h3 className="text-xl font-bold text-slate-900">{t(post.title, locale)}</h3>
          </div>

          {post.reportCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {locale === 'zh' ? '未建立信任，不收錄搜尋' : 'Untrusted / noindex'}
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-slate-600">{t(post.excerpt, locale)}</p>

        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <MessageSquareText className="h-4 w-4 text-slate-400" />
            {formatDate(post.updatedAt, locale)}
          </span>
          {post.price ? (
            <span className="flex items-center gap-1.5">
              <Tags className="h-4 w-4 text-slate-400" />
              {post.price}
            </span>
          ) : null}
          {post.linkUrl ? (
            <span className="flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              {locale === 'zh' ? '外部連結附帶 ugc / nofollow' : 'Links marked ugc / nofollow'}
            </span>
          ) : null}
        </div>

        <TrackedLink
          href={withLocale(locale, `/community/${section}/${post.slug}`)}
          eventType="community_click"
          entitySlug={post.slug}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {locale === 'zh' ? '查看貼文' : 'View post'}
        </TrackedLink>
      </div>
    </article>
  );
}
