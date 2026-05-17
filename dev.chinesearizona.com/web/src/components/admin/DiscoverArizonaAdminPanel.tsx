'use client';

import { ChevronDown, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactNode } from 'react';

import { discoveryCategories, discoveryQueueStatuses } from '@/lib/discovery-taxonomy';
import {
  discoveryCategoryLabel,
  discoveryQueueStatusLabel,
  formatDateTime,
} from '@/lib/i18n';
import type {
  DiscoverAdminQueueItem,
  DiscoverArticle,
  DiscoverVideoCandidate,
  DiscoveryCategory,
  DiscoveryQueueStatus,
  Locale,
} from '@/lib/types';

type DiscoverArizonaAdminPanelProps = {
  locale: Locale;
  initialQueue: DiscoverAdminQueueItem[];
  writeEnabled: boolean;
};

function SummaryBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand';
}) {
  const toneClass =
    tone === 'brand' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
  );
}

function CollapsibleGroup({
  eyebrow,
  title,
  description,
  badges,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badges?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
            ) : null}
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            {badges ? <div className="flex flex-wrap justify-end gap-2">{badges}</div> : null}
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-180">
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </div>
      </summary>
      <div className="border-t border-slate-200 bg-slate-50 p-5">{children}</div>
    </details>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function queueStatusBadgeClass(status: DiscoveryQueueStatus) {
  switch (status) {
    case 'review_ready':
      return 'bg-amber-50 text-amber-800';
    case 'approved':
      return 'bg-sky-50 text-sky-700';
    case 'published':
      return 'bg-emerald-50 text-emerald-700';
    case 'blocked':
      return 'bg-rose-50 text-rose-700';
    case 'stale':
      return 'bg-slate-100 text-slate-600';
    case 'queued':
    default:
      return 'bg-brand-50 text-brand-700';
  }
}

function queueGroupDescription(status: DiscoveryQueueStatus, locale: Locale) {
  switch (status) {
    case 'queued':
      return locale === 'zh'
        ? '剛進佇列的候選影片，通常是先補 slug、分類與初步文章骨架。'
        : 'Freshly queued candidates that usually need slug, category, and first-draft article setup.';
    case 'review_ready':
      return locale === 'zh'
        ? '文章已接近完成，適合集中做最後檢查與編修。'
        : 'Drafts that are close to finished and ready for concentrated editorial review.';
    case 'approved':
      return locale === 'zh'
        ? '內容已通過審核，可作為即將發布的短清單。'
        : 'Items that passed review and can be treated as the near-publish shortlist.';
    case 'published':
      return locale === 'zh'
        ? '已上線的短影音轉文章內容，保留在這裡方便補修與回查。'
        : 'Published short-form articles kept here for quick edits and follow-up checks.';
    case 'blocked':
      return locale === 'zh'
        ? '不應繼續處理的候選內容，集中保留決策紀錄。'
        : 'Candidates that should not move forward, grouped together for decision history.';
    case 'stale':
      return locale === 'zh'
        ? '已失去時效或需要重新確認的候選內容。'
        : 'Candidates that have gone stale or need a freshness check before more work.';
    default:
      return '';
  }
}

function serializeParagraphs(article: DiscoverArticle | undefined, locale: Locale): string {
  if (!article) {
    return '';
  }

  return article.body
    .map((paragraph) => (locale === 'zh' ? paragraph.zh ?? paragraph.en : paragraph.en))
    .join('\n\n');
}

function serializeList(items: string[]): string {
  return items.join('\n');
}

function defaultPrimaryCategory(candidate: DiscoverVideoCandidate, article?: DiscoverArticle): DiscoveryCategory {
  return article?.primaryCategory ?? candidate.discoveredCategories[0] ?? 'things_to_do';
}

function defaultQueueStatus(candidate: DiscoverVideoCandidate, article?: DiscoverArticle): DiscoveryQueueStatus {
  return article?.queueStatus ?? candidate.queueStatus;
}

function QueueEditorCard({
  item,
  locale,
  writeEnabled,
}: {
  item: DiscoverAdminQueueItem;
  locale: Locale;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slug, setSlug] = useState(item.article?.slug ?? '');
  const [primaryCategory, setPrimaryCategory] = useState<DiscoveryCategory>(
    defaultPrimaryCategory(item.candidate, item.article)
  );
  const [queueStatus, setQueueStatus] = useState<DiscoveryQueueStatus>(
    defaultQueueStatus(item.candidate, item.article)
  );
  const [titleEn, setTitleEn] = useState(item.article?.title.en ?? '');
  const [titleZh, setTitleZh] = useState(item.article?.title.zh ?? '');
  const [excerptEn, setExcerptEn] = useState(item.article?.excerpt.en ?? '');
  const [excerptZh, setExcerptZh] = useState(item.article?.excerpt.zh ?? '');
  const [bodyEn, setBodyEn] = useState(serializeParagraphs(item.article, 'en'));
  const [bodyZh, setBodyZh] = useState(serializeParagraphs(item.article, 'zh'));
  const [heroImageUrl, setHeroImageUrl] = useState(item.article?.heroImageUrl ?? '');
  const [city, setCity] = useState(item.article?.city ?? '');
  const [region, setRegion] = useState(item.article?.region ?? '');
  const [tags, setTags] = useState(serializeList(item.article?.tags ?? []));
  const [relatedBusinessSlugs, setRelatedBusinessSlugs] = useState(
    serializeList(item.article?.relatedBusinessSlugs ?? [])
  );
  const [relatedHiddenArizonaSlugs, setRelatedHiddenArizonaSlugs] = useState(
    serializeList(item.article?.relatedHiddenArizonaSlugs ?? [])
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(item.article?.isFeatured));
  const [embedEnabled, setEmbedEnabled] = useState(Boolean(item.article?.embedEnabled ?? true));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writeEnabled) {
      setMessage(
        locale === 'zh'
          ? '目前缺少 Supabase service key，無法寫入 Discover Arizona。'
          : 'The Supabase service key is missing, so Discover Arizona is read-only right now.'
      );
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/discover/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-locale': locale,
      },
      body: JSON.stringify({
        candidateId: item.candidate.id,
        slug,
        primaryCategory,
        queueStatus,
        titleEn,
        titleZh,
        excerptEn,
        excerptZh,
        bodyEn,
        bodyZh,
        heroImageUrl,
        city,
        region,
        tags,
        relatedBusinessSlugs,
        relatedHiddenArizonaSlugs,
        isFeatured,
        embedEnabled,
      }),
    });

    const data = (await response.json()) as { message?: string };
    setMessage(
      data.message ??
        (response.ok
          ? locale === 'zh'
            ? '文章已儲存。'
            : 'Article saved.'
          : locale === 'zh'
            ? '無法儲存文章。'
            : 'Unable to save the article.')
    );
    setIsSubmitting(false);

    if (response.ok) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  const summaryTitle =
    (locale === 'zh' ? titleZh || titleEn : titleEn || titleZh) ||
    (item.article ? item.article.title[locale] ?? item.article.title.en : item.candidate.postId);
  const draftStateLabel =
    slug || titleEn || titleZh
      ? locale === 'zh'
        ? '草稿進行中'
        : 'Draft in progress'
      : locale === 'zh'
        ? '尚未開始文章'
        : 'No article draft yet';

  return (
    <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              {item.candidate.discoveredCategories.map((category) => (
                <span
                  key={`${item.candidate.id}-${category}`}
                  className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                >
                  {discoveryCategoryLabel(category, locale)}
                </span>
              ))}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${queueStatusBadgeClass(queueStatus)}`}
              >
                {discoveryQueueStatusLabel(queueStatus, locale)}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {draftStateLabel}
              </span>
            </div>

            <div className="space-y-1">
              <p className="truncate text-lg font-semibold text-slate-900">{summaryTitle}</p>
              <p className="text-sm text-slate-500">
                {item.candidate.creatorHandle ? `@${item.candidate.creatorHandle}` : item.candidate.sourceSurface}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span>
                {locale === 'zh' ? '最近看到' : 'Last seen'}: {formatDateTime(item.candidate.lastSeenAt, locale)}
              </span>
              <span>
                {locale === 'zh' ? '漏掃計數' : 'Missing runs'}: {item.candidate.missingRunCount}
              </span>
              <span>{slug ? `/${slug}` : locale === 'zh' ? '尚未設定 slug' : 'Slug not set'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
              {locale === 'zh' ? '展開編輯器' : 'Open editor'}
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-180">
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </div>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <div className="space-y-1">
            <p className="font-medium text-slate-900">
              {locale === 'zh' ? '原始短影音來源' : 'Original short-form source'}
            </p>
            <p>{item.candidate.sourceSurface}</p>
          </div>
          <a
            href={item.candidate.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-900"
          >
            {locale === 'zh' ? '查看原始 TikTok' : 'Open original TikTok'}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {item.candidate.collectorNotes ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
            {item.candidate.collectorNotes}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-5">
              <FormSection
                title={locale === 'zh' ? '發布設定' : 'Publishing setup'}
                description={
                  locale === 'zh'
                    ? '先整理 slug、分類、佇列狀態與顯示選項。'
                    : 'Start with slug, category, queue status, and the main presentation flags.'
                }
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label htmlFor={`slug-${item.candidate.id}`} className="mb-2 block text-sm font-semibold text-slate-800">
                      Slug
                    </label>
                    <input
                      id={`slug-${item.candidate.id}`}
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      placeholder="sedona-sunrise-notes"
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`category-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      {locale === 'zh' ? '主分類' : 'Primary category'}
                    </label>
                    <select
                      id={`category-${item.candidate.id}`}
                      value={primaryCategory}
                      onChange={(event) => setPrimaryCategory(event.target.value as DiscoveryCategory)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {discoveryCategories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {discoveryCategoryLabel(category.slug, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`status-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      {locale === 'zh' ? '佇列狀態' : 'Queue status'}
                    </label>
                    <select
                      id={`status-${item.candidate.id}`}
                      value={queueStatus}
                      onChange={(event) => setQueueStatus(event.target.value as DiscoveryQueueStatus)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {discoveryQueueStatuses.map((status) => (
                        <option key={status} value={status}>
                          {discoveryQueueStatusLabel(status, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <label htmlFor={`hero-${item.candidate.id}`} className="mb-2 block text-sm font-semibold text-slate-800">
                      Hero image URL
                    </label>
                    <input
                      id={`hero-${item.candidate.id}`}
                      value={heroImageUrl}
                      onChange={(event) => setHeroImageUrl(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`city-${item.candidate.id}`} className="mb-2 block text-sm font-semibold text-slate-800">
                        {locale === 'zh' ? '城市' : 'City'}
                      </label>
                      <input
                        id={`city-${item.candidate.id}`}
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        disabled={!writeEnabled || isSubmitting}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label htmlFor={`region-${item.candidate.id}`} className="mb-2 block text-sm font-semibold text-slate-800">
                        {locale === 'zh' ? '區域' : 'Region'}
                      </label>
                      <input
                        id={`region-${item.candidate.id}`}
                        value={region}
                        onChange={(event) => setRegion(event.target.value)}
                        disabled={!writeEnabled || isSubmitting}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={embedEnabled}
                      onChange={(event) => setEmbedEnabled(event.target.checked)}
                      disabled={!writeEnabled || isSubmitting}
                    />
                    <span>{locale === 'zh' ? '啟用嵌入播放器' : 'Enable embed player'}</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(event) => setIsFeatured(event.target.checked)}
                      disabled={!writeEnabled || isSubmitting}
                    />
                    <span>{locale === 'zh' ? '精選內容' : 'Featured story'}</span>
                  </label>
                </div>
              </FormSection>

              <FormSection
                title={locale === 'zh' ? '標題與摘要' : 'Headlines and excerpts'}
                description={
                  locale === 'zh'
                    ? '把雙語標題和導言放在同一區塊，方便比對語氣與資訊量。'
                    : 'Keep bilingual titles and excerpts together so tone and structure can be reviewed side by side.'
                }
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`title-en-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      English title
                    </label>
                    <input
                      id={`title-en-${item.candidate.id}`}
                      value={titleEn}
                      onChange={(event) => setTitleEn(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`title-zh-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      {locale === 'zh' ? '中文標題' : 'Chinese title'}
                    </label>
                    <input
                      id={`title-zh-${item.candidate.id}`}
                      value={titleZh}
                      onChange={(event) => setTitleZh(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`excerpt-en-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      English excerpt
                    </label>
                    <textarea
                      id={`excerpt-en-${item.candidate.id}`}
                      rows={3}
                      value={excerptEn}
                      onChange={(event) => setExcerptEn(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`excerpt-zh-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      {locale === 'zh' ? '中文摘要' : 'Chinese excerpt'}
                    </label>
                    <textarea
                      id={`excerpt-zh-${item.candidate.id}`}
                      rows={3}
                      value={excerptZh}
                      onChange={(event) => setExcerptZh(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      required
                    />
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="space-y-5">
              <FormSection
                title={locale === 'zh' ? '文章內文' : 'Article body'}
                description={
                  locale === 'zh'
                    ? '雙語正文放在同一區塊，讓段落長度和資訊密度更容易同步調整。'
                    : 'The bilingual body fields stay together so paragraph length and detail level can be tuned in parallel.'
                }
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`body-en-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      English body
                    </label>
                    <textarea
                      id={`body-en-${item.candidate.id}`}
                      rows={12}
                      value={bodyEn}
                      onChange={(event) => setBodyEn(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`body-zh-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      {locale === 'zh' ? '中文內文' : 'Chinese body'}
                    </label>
                    <textarea
                      id={`body-zh-${item.candidate.id}`}
                      rows={12}
                      value={bodyZh}
                      onChange={(event) => setBodyZh(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                      required
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title={locale === 'zh' ? '關聯與標籤' : 'Relationships and tags'}
                description={
                  locale === 'zh'
                    ? '把 tags、相關商家與 Hidden Arizona 連結集中管理。'
                    : 'Manage tags, related businesses, and Hidden Arizona links in one supporting section.'
                }
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label htmlFor={`tags-${item.candidate.id}`} className="mb-2 block text-sm font-semibold text-slate-800">
                      {locale === 'zh' ? '標籤' : 'Tags'}
                    </label>
                    <textarea
                      id={`tags-${item.candidate.id}`}
                      rows={4}
                      value={tags}
                      onChange={(event) => setTags(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      placeholder={locale === 'zh' ? '每行一個標籤' : 'One tag per line'}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`businesses-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      {locale === 'zh' ? '相關商家 slugs' : 'Related business slugs'}
                    </label>
                    <textarea
                      id={`businesses-${item.candidate.id}`}
                      rows={4}
                      value={relatedBusinessSlugs}
                      onChange={(event) => setRelatedBusinessSlugs(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      placeholder="taste-of-taiwan"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`hidden-${item.candidate.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Hidden Arizona slugs
                    </label>
                    <textarea
                      id={`hidden-${item.candidate.id}`}
                      rows={4}
                      value={relatedHiddenArizonaSlugs}
                      onChange={(event) => setRelatedHiddenArizonaSlugs(event.target.value)}
                      disabled={!writeEnabled || isSubmitting}
                      placeholder="the-wave"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </FormSection>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <button
              type="submit"
              disabled={!writeEnabled || isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? locale === 'zh'
                  ? '儲存中...'
                  : 'Saving...'
                : locale === 'zh'
                  ? '儲存 Discover Arizona 文章'
                  : 'Save Discover Arizona article'}
            </button>
            {message ? (
              <p className="text-sm font-medium text-brand-700" aria-live="polite">
                {message}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </details>
  );
}

export function DiscoverArizonaAdminPanel({
  locale,
  initialQueue,
  writeEnabled,
}: DiscoverArizonaAdminPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sourceUrl, setSourceUrl] = useState('');
  const [discoveredCategory, setDiscoveredCategory] = useState<DiscoveryCategory>('things_to_do');
  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);

  const queueGroups = discoveryQueueStatuses
    .map((status) => ({
      status,
      items: initialQueue.filter(
        (item) => defaultQueueStatus(item.candidate, item.article) === status
      ),
    }))
    .filter((group) => group.items.length > 0);

  const queuedCount = queueGroups.find((group) => group.status === 'queued')?.items.length ?? 0;
  const reviewReadyCount =
    queueGroups.find((group) => group.status === 'review_ready')?.items.length ?? 0;
  const publishedCount = queueGroups.find((group) => group.status === 'published')?.items.length ?? 0;

  async function handleManualCandidateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writeEnabled) {
      setManualStatus(
        locale === 'zh'
          ? '目前缺少 Supabase service key，無法建立新的候選內容。'
          : 'The Supabase service key is missing, so new discovery candidates cannot be created right now.'
      );
      return;
    }

    setIsAddingCandidate(true);
    setManualStatus(null);

    const response = await fetch('/api/discover/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-locale': locale,
      },
      body: JSON.stringify({
        sourceUrl,
        discoveredCategory,
      }),
    });

    const data = (await response.json()) as { message?: string };
    setManualStatus(
      data.message ??
        (response.ok
          ? locale === 'zh'
            ? '候選內容已加入佇列。'
            : 'Candidate added to the queue.'
          : locale === 'zh'
            ? '無法新增候選內容。'
            : 'Unable to add the candidate.')
    );
    setIsAddingCandidate(false);

    if (response.ok) {
      setSourceUrl('');
      startTransition(() => {
        router.refresh();
      });
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              {locale === 'zh' ? 'Discover Arizona 佇列' : 'Discover Arizona queue'}
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === 'zh' ? 'TikTok 旅遊候選內容與文章編輯台' : 'TikTok travel candidates and article desk'}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {locale === 'zh'
                ? '先按佇列狀態看工作量，再打開需要的候選卡片編輯，不必一次面對整份雙語表單。'
                : 'Review the queue by status first, then open only the candidate cards you need instead of loading every bilingual article form at once.'}
            </p>
          </div>

          <div className="grid min-w-[16rem] gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '待審核' : 'Queued'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{queuedCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '待複查' : 'Review ready'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{reviewReadyCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '已發布' : 'Published'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{publishedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <CollapsibleGroup
        eyebrow={locale === 'zh' ? '手動收錄' : 'Manual intake'}
        title={locale === 'zh' ? '手動加入短影音候選內容' : 'Add a short-form candidate manually'}
        description={
          locale === 'zh'
            ? '把較低頻的手動加入表單收起來，需要補資料時再展開，不佔用主要編輯區。'
            : 'Keep the lower-frequency intake form tucked away so it is available when needed without crowding the main editorial workspace.'
        }
        badges={
          <>
            <SummaryBadge>{locale === 'zh' ? `${initialQueue.length} 筆佇列` : `${initialQueue.length} queued`}</SummaryBadge>
            <SummaryBadge tone={writeEnabled ? 'brand' : 'neutral'}>
              {writeEnabled
                ? locale === 'zh'
                  ? '可寫入'
                  : 'Write enabled'
                : locale === 'zh'
                  ? '唯讀'
                  : 'Read only'}
            </SummaryBadge>
          </>
        }
      >
        <form
          onSubmit={handleManualCandidateSubmit}
          className="grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-5 lg:grid-cols-[1.4fr,0.8fr,auto]"
        >
          <div>
            <label htmlFor="manual-discover-url" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '手動加入 TikTok URL' : 'Add a TikTok URL manually'}
            </label>
            <input
              id="manual-discover-url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@creator/video/1234567890123456789"
              disabled={!writeEnabled || isAddingCandidate}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              required
            />
          </div>
          <div>
            <label htmlFor="manual-discover-category" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '發現分類' : 'Discovered category'}
            </label>
            <select
              id="manual-discover-category"
              value={discoveredCategory}
              onChange={(event) => setDiscoveredCategory(event.target.value as DiscoveryCategory)}
              disabled={!writeEnabled || isAddingCandidate}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {discoveryCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {discoveryCategoryLabel(category.slug, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!writeEnabled || isAddingCandidate}
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAddingCandidate
                ? locale === 'zh'
                  ? '加入中...'
                  : 'Adding...'
                : locale === 'zh'
                  ? '加入佇列'
                  : 'Add to queue'}
            </button>
          </div>
        </form>

        {!writeEnabled ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {locale === 'zh'
              ? '目前沒有可用的 Supabase service role 設定，因此這個區塊會顯示種子資料並保持唯讀。'
              : 'A Supabase service role key is not available right now, so this panel is showing seed data in read-only mode.'}
          </p>
        ) : null}

        {manualStatus ? (
          <p className="mt-4 text-sm font-medium text-brand-700" aria-live="polite">
            {manualStatus}
          </p>
        ) : null}
      </CollapsibleGroup>

      {initialQueue.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          {locale === 'zh'
            ? '目前沒有 Discover Arizona 候選內容。當 collector 或手動新增開始工作後，這裡會出現分組後的待編輯卡片。'
            : 'There are no Discover Arizona candidates yet. Once the collector or the manual intake form adds items, grouped editable queue cards will appear here.'}
        </div>
      ) : (
        <div className="space-y-4">
          {queueGroups.map((group) => (
            <CollapsibleGroup
              key={group.status}
              title={discoveryQueueStatusLabel(group.status, locale)}
              description={queueGroupDescription(group.status, locale)}
              badges={
                <>
                  <SummaryBadge tone="brand">{group.items.length}</SummaryBadge>
                  <SummaryBadge>{group.status}</SummaryBadge>
                </>
              }
            >
              <div className="space-y-4">
                {group.items.map((item) => (
                  <QueueEditorCard
                    key={item.candidate.id}
                    item={item}
                    locale={locale}
                    writeEnabled={writeEnabled}
                  />
                ))}
              </div>
            </CollapsibleGroup>
          ))}
        </div>
      )}
    </section>
  );
}
