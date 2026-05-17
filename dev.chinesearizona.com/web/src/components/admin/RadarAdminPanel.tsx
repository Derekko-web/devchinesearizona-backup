'use client';

import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';

import { getLocalizedArizonaNewsArticlePath } from '@/lib/arizona-news';
import { formatDateTime, radarLaneLabel, sourcePolicyLabel, sourceTypeLabel, t } from '@/lib/i18n';
import type {
  Locale,
  RadarArticle,
  RadarCandidate,
  RadarOverview,
  RadarRun,
  RadarSourceManifestEntry,
} from '@/lib/types';

type SourceRow = RadarSourceManifestEntry & {
  candidateCount: number;
  paused: boolean;
};

type RadarAdminPanelProps = {
  locale: Locale;
  overview: RadarOverview;
  sources: SourceRow[];
  candidates: RadarCandidate[];
  articles: RadarArticle[];
  runs: RadarRun[];
};

function SummaryBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}

function RadarSectionGroup({
  title,
  description,
  badges,
  children,
}: {
  title: string;
  description: string;
  badges: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap justify-end gap-2">{badges}</div>
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

function EmptyGroupState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm leading-6 text-slate-500">
      {children}
    </div>
  );
}

async function postJson(locale: Locale, url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-locale': locale,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed.');
  }

  return data;
}

export function RadarAdminPanel({
  locale,
  overview,
  sources,
  candidates,
  articles,
  runs,
}: RadarAdminPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ message?: string }>) {
    setStatus(null);

    startTransition(async () => {
      try {
        const result = await action();
        setStatus(result.message ?? (locale === 'zh' ? '操作已完成。' : 'Action completed.'));
        router.refresh();
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法完成操作。'
              : 'Unable to complete the action.'
        );
      }
    });
  }

  const liveArticleCount = articles.filter((article) => article.isPublished).length;
  const failedRunCount = runs.filter((run) => run.status === 'failed').length;

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Arizona News</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === 'zh' ? '即時內容控制台' : 'Live content control desk'}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {locale === 'zh'
                ? '先看發布、阻擋與來源摘要，再按需要展開來源控管、候選審核、已上線內容和執行紀錄。'
                : 'Scan publishing, blocking, and source health first, then open the specific source, moderation, publishing, or run-history group you need.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                runAction(() =>
                  postJson(locale, '/api/radar/pause-job', {
                    paused: !overview.jobControl.paused,
                  })
                )
              }
              className="inline-flex items-center rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {overview.jobControl.paused
                ? locale === 'zh'
                  ? '恢復排程'
                  : 'Resume job'
                : locale === 'zh'
                  ? '暫停排程'
                  : 'Pause job'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '最新發佈' : 'Latest publish'}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {overview.latestPublishedAt
                ? formatDateTime(overview.latestPublishedAt, locale)
                : locale === 'zh'
                  ? '尚無內容'
                  : 'No content yet'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '已發佈' : 'Published'}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{overview.publishedCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '候選內容' : 'Candidates'}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{candidates.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '已阻擋' : 'Blocked'}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{overview.blockedCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '暫停來源' : 'Paused sources'}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{overview.pausedSourceCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '狀態' : 'Status'}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {overview.jobControl.paused
                ? locale === 'zh'
                  ? '已暫停'
                  : 'Paused'
                : locale === 'zh'
                  ? '執行中'
                  : 'Running'}
            </p>
          </div>
        </div>

        {status ? (
          <p className="mt-4 text-sm font-medium text-brand-700" aria-live="polite">
            {status}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RadarSectionGroup
          title={locale === 'zh' ? '來源控管' : 'Source controls'}
          description={
            locale === 'zh'
              ? '把高噪音來源與完整允許清單放在同一組，先處理異常來源，再回頭檢查整體來源策略。'
              : 'Keep noisy-source interventions and the full allowlist together so source triage and policy review live in one place.'
          }
          badges={
            <>
              <SummaryBadge>
                {locale === 'zh' ? `${overview.topNoisySources.length} 個高噪音來源` : `${overview.topNoisySources.length} noisy`}
              </SummaryBadge>
              <SummaryBadge>
                {locale === 'zh' ? `${sources.length} 個允許來源` : `${sources.length} allowlisted`}
              </SummaryBadge>
            </>
          }
        >
          <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-slate-900">
                  {locale === 'zh' ? '高噪音來源' : 'Top noisy sources'}
                </h4>
                <SummaryBadge>{overview.topNoisySources.length}</SummaryBadge>
              </div>
              {overview.topNoisySources.length === 0 ? (
                <EmptyGroupState>
                  {locale === 'zh'
                    ? '目前沒有需要立即暫停的來源。'
                    : 'There are no sources that need immediate intervention right now.'}
                </EmptyGroupState>
              ) : (
                <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                  {overview.topNoisySources.map((source) => (
                    <div key={source.sourceSlug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{source.sourceName}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {locale === 'zh'
                              ? `${source.itemCount} 筆候選內容 / ${source.blockedCount} 筆阻擋`
                              : `${source.itemCount} candidates / ${source.blockedCount} blocked`}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runAction(() =>
                              postJson(locale, '/api/radar/pause-source', {
                                sourceSlug: source.sourceSlug,
                                paused: !source.paused,
                              })
                            )
                          }
                          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {source.paused
                            ? locale === 'zh'
                              ? '恢復來源'
                              : 'Resume source'
                            : locale === 'zh'
                              ? '暫停來源'
                              : 'Pause source'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-slate-900">
                  {locale === 'zh' ? '允許來源清單' : 'Allowlisted sources'}
                </h4>
                <SummaryBadge>{sources.length}</SummaryBadge>
              </div>
              {sources.length === 0 ? (
                <EmptyGroupState>
                  {locale === 'zh'
                    ? '目前沒有來源設定。'
                    : 'There are no configured Radar sources yet.'}
                </EmptyGroupState>
              ) : (
                <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                  {sources.map((source) => (
                    <div key={source.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{source.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{source.url}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {sourceTypeLabel(source.sourceType, locale)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                          {radarLaneLabel(source.lane, locale)}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {sourcePolicyLabel(source.sourcePolicy, locale)}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {locale === 'zh'
                            ? `${source.candidateCount} 筆候選內容`
                            : `${source.candidateCount} candidates`}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {source.paused
                            ? locale === 'zh'
                              ? '來源已暫停'
                              : 'Paused'
                            : locale === 'zh'
                              ? '來源運作中'
                              : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </RadarSectionGroup>

        <RadarSectionGroup
          title={locale === 'zh' ? '候選內容審核' : 'Candidate moderation'}
          description={
            locale === 'zh'
              ? '把待阻擋與待檢查的候選內容集中處理，只在需要時展開完整清單。'
              : 'Keep moderation actions focused on the candidate queue and only open the full list when you are ready to act.'
          }
          badges={
            <>
              <SummaryBadge>
                {locale === 'zh' ? `${candidates.length} 筆候選內容` : `${candidates.length} candidates`}
              </SummaryBadge>
              <SummaryBadge>
                {locale === 'zh' ? `${overview.duplicateCount} 筆重複` : `${overview.duplicateCount} duplicates`}
              </SummaryBadge>
            </>
          }
        >
          {candidates.length === 0 ? (
            <EmptyGroupState>
              {locale === 'zh'
                ? '目前沒有待審核的 Radar 候選內容。'
                : 'There are no Radar candidates waiting for moderation right now.'}
            </EmptyGroupState>
          ) : (
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                    <span>{radarLaneLabel(candidate.lane, locale)}</span>
                    <span className="text-slate-300">/</span>
                    <span>{sourceTypeLabel(candidate.sourceType, locale)}</span>
                    <span className="text-slate-300">/</span>
                    <span>{sourcePolicyLabel(candidate.sourcePolicy, locale)}</span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{t(candidate.title, locale)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t(candidate.excerpt, locale)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{candidate.sourceName}</span>
                    <span>{formatDateTime(candidate.lastSeenAt, locale)}</span>
                    <span>{candidate.moderationState}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isPending || candidate.moderationState === 'blocked'}
                      onClick={() =>
                        runAction(() =>
                          postJson(locale, '/api/radar/block', { candidateId: candidate.id })
                        )
                      }
                      className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {locale === 'zh' ? '阻擋候選內容' : 'Block candidate'}
                    </button>
                    <a
                      href={candidate.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {locale === 'zh' ? '查看來源' : 'Open source'}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RadarSectionGroup>

        <RadarSectionGroup
          title={locale === 'zh' ? '已上線內容' : 'Published stories'}
          description={
            locale === 'zh'
              ? '把已發佈的 Radar 內容收成一組，方便需要時快速撤下或檢查公開頁面。'
              : 'Published Radar stories live in their own group so takedowns and page checks are easy without cluttering the moderation view.'
          }
          badges={
            <>
              <SummaryBadge>
                {locale === 'zh' ? `${liveArticleCount} 篇上線中` : `${liveArticleCount} live`}
              </SummaryBadge>
              <SummaryBadge>
                {locale === 'zh'
                  ? `${articles.length} 篇已整理內容`
                  : `${articles.length} prepared stories`}
              </SummaryBadge>
            </>
          }
        >
          {articles.length === 0 ? (
            <EmptyGroupState>
              {locale === 'zh'
                ? '目前還沒有已整理的 Radar 內容。'
                : 'There are no prepared Radar stories yet.'}
            </EmptyGroupState>
          ) : (
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {articles.map((article) => (
                <div key={article.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                    <span>{radarLaneLabel(article.lane, locale)}</span>
                    <span className="text-slate-300">/</span>
                    <span>{sourceTypeLabel(article.sourceType, locale)}</span>
                    <span className="text-slate-300">/</span>
                    <span>{sourcePolicyLabel(article.sourcePolicy, locale)}</span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{t(article.title, locale)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t(article.excerpt, locale)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{article.sourceName}</span>
                    <span>{formatDateTime(article.publishedAt, locale)}</span>
                    <span>{article.isPublished ? 'live' : 'hidden'}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isPending || !article.isPublished}
                      onClick={() =>
                        runAction(() =>
                          postJson(locale, '/api/radar/unpublish', { articleId: article.id })
                        )
                      }
                      className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {locale === 'zh' ? '撤下內容' : 'Unpublish'}
                    </button>
                    <a
                      href={getLocalizedArizonaNewsArticlePath(locale, article.slug)}
                      className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {locale === 'zh' ? '查看頁面' : 'Open page'}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RadarSectionGroup>

        <RadarSectionGroup
          title={locale === 'zh' ? '最近執行紀錄' : 'Recent runs'}
          description={
            locale === 'zh'
              ? '把 worker 執行結果獨立成一組，需要除錯時再查看完整紀錄。'
              : 'Keep worker history in its own group so operational debugging is available without always taking over the page.'
          }
          badges={
            <>
              <SummaryBadge>
                {locale === 'zh' ? `${runs.length} 次執行` : `${runs.length} runs`}
              </SummaryBadge>
              <SummaryBadge>
                {locale === 'zh' ? `${failedRunCount} 次失敗` : `${failedRunCount} failed`}
              </SummaryBadge>
            </>
          }
        >
          {runs.length === 0 ? (
            <EmptyGroupState>
              {locale === 'zh'
                ? '目前還沒有 Radar 執行紀錄。'
                : 'There is no Radar run history yet.'}
            </EmptyGroupState>
          ) : (
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {runs.map((run) => (
                <div key={run.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{formatDateTime(run.startedAt, locale)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {locale === 'zh'
                          ? `發佈 ${run.publishedCount} / 阻擋 ${run.blockedCount} / 重複 ${run.duplicateCount}`
                          : `Published ${run.publishedCount} / Blocked ${run.blockedCount} / Duplicates ${run.duplicateCount}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {run.status}
                    </span>
                  </div>
                  {run.errorMessage ? (
                    <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                      {run.errorMessage}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </RadarSectionGroup>
      </div>
    </section>
  );
}
