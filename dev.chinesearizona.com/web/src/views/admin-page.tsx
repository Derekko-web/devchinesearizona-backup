import { Building2, CalendarDays, Clock3, FileWarning, Newspaper, ShieldAlert } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { BusinessClaimApprovalCard } from '@/components/admin/BusinessClaimApprovalCard';
import { DiscoverArizonaAdminPanel } from '@/components/admin/DiscoverArizonaAdminPanel';
import { RadarAdminPanel } from '@/components/admin/RadarAdminPanel';
import { AdminLeadOverview } from '@/components/directory/BusinessLeadPanels';
import { getAdminSnapshot } from '@/lib/content';
import { getDiscoverAdminQueue } from '@/lib/discover-arizona';
import { getRadarAdminSnapshotAsync } from '@/lib/radar';
import { isSupabaseServiceConfigured } from '@/lib/supabase';
import { getDirectoryBusinesses, getDirectoryCategories } from '@/lib/directory';
import { getBusinessLeadCounts, getRecentBusinessInquiries } from '@/lib/business-leads';
import { getAdminListingPlans } from '@/lib/listing-plans';
import { AdminListingPlansPanel } from '@/components/directory/AdminListingPlansPanel';
import { AdminBusinessDetailsEditor } from '@/components/directory/AdminBusinessDetailsEditor';
import {
  getModerationReportsSnapshot,
  getPendingBusinessClaimsSnapshot,
} from '@/lib/directory-moderation';
import {
  articleSeriesLabel,
  destinationSurfaceLabel,
  directoryFollowUpActionLabel,
  directoryFollowUpStatusLabel,
  freshnessTierLabel,
  personaTargetLabel,
  reportReasonLabel,
  signalDeskReviewStatusLabel,
  sourcePolicyLabel,
  sourceTypeLabel,
  t,
} from '@/lib/i18n';
import { getMonitoredSources, getSignalDeskQueue, getSignalDeskSummary } from '@/lib/signal-desk';
import type { Locale } from '@/lib/types';
import { bilingualDetailsOf, sectionContainer } from '@/views/site-page-shared';

export async function AdminPageView({ locale }: { locale: Locale }) {
  const [
    snapshot,
    pendingClaims,
    directoryCategories,
    moderationReports,
    monitoredSources,
    signalDeskQueue,
    signalDeskSummary,
    discoverAdminQueue,
    radarAdminSnapshot,
    adminLeadCounts,
    adminRecentInquiries,
    adminListingPlans,
    adminDirectoryBusinesses,
  ] = await Promise.all([
    Promise.resolve(getAdminSnapshot()),
    getPendingBusinessClaimsSnapshot(),
    getDirectoryCategories(),
    getModerationReportsSnapshot(),
    Promise.resolve(getMonitoredSources()),
    Promise.resolve(getSignalDeskQueue()),
    Promise.resolve(getSignalDeskSummary()),
    getDiscoverAdminQueue(),
    getRadarAdminSnapshotAsync(),
    getBusinessLeadCounts({ limit: 100 }),
    getRecentBusinessInquiries({ limit: 20 }),
    getAdminListingPlans(),
    getDirectoryBusinesses({}, { includeNonPublic: true, limit: 500 }),
  ]);
  const discoverWriteEnabled = isSupabaseServiceConfigured();
  const moderationQueueCount = moderationReports.length + snapshot.flaggedPosts.length;
  const totalTrustItems = pendingClaims.length + moderationQueueCount;
  const editorialQueueCount = signalDeskQueue.length;
  const radarControlCount =
    radarAdminSnapshot.candidates.length + radarAdminSnapshot.articles.length + radarAdminSnapshot.sources.length;

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              {locale === 'zh' ? '營運首頁' : 'Operations home'}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                {locale === 'zh' ? '管理與審核中心' : 'Admin and moderation center'}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                {locale === 'zh'
                  ? '把商家審核、內容風控、編輯流程與自動化工作台分成清楚區塊，讓日常營運先看重點，再深入處理。'
                  : 'The admin home now separates claims, moderation, editorial workflow, and automation desks so daily operations start with priorities instead of a long mixed queue.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="#admin-trust"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '信任與審核' : 'Trust and moderation'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalTrustItems}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? '認領、檢舉與待處理內容'
                  : 'Claims, reports, and flagged content'}
              </p>
            </a>
            <a
              href="#admin-editorial"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '編輯流程' : 'Editorial workflow'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{editorialQueueCount}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? 'Signal Desk 與監看來源'
                  : 'Signal Desk queue and monitored sources'}
              </p>
            </a>
            <a
              href="#admin-automation"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '自動化工作台' : 'Automation desks'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{radarControlCount}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? 'Radar 與 Discover Arizona'
                  : 'Radar and Discover Arizona controls'}
              </p>
            </a>
            <a
              href="#admin-analytics"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '平台訊號' : 'Platform signals'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {Object.keys(snapshot.analytics).length}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? '近期事件追蹤與互動統計'
                  : 'Recent event tracking and interaction stats'}
              </p>
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">
              {locale === 'zh' ? '信任與審核' : 'Trust and moderation'}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '先處理需要人工判斷的項目' : 'Start with human-review items'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把商家認領、檢舉與被標記內容放在同一個工作區塊，先做最影響平台信任的決策。'
              : 'Keep claims, reports, and flagged content together so the highest-trust decisions are handled first.'}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <FileWarning className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '檢舉案件' : 'Reports'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{moderationReports.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '待處理認領' : 'Pending claims'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{pendingClaims.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarDays className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '待處理貼文' : 'Flagged posts'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{snapshot.flaggedPosts.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Newspaper className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">
              {locale === 'zh' ? '編輯與發佈流程' : 'Editorial and publishing'}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '把內容流程和來源監看分開看' : 'Separate queue work from source watching'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '用摘要卡先看內容隊列、來源規模與目錄跟進，真正需要深入時再進到下方工作區。'
              : 'Use the overview to spot queue pressure, source coverage, and directory follow-ups before diving into the detailed desks below.'}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock3 className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '監看來源' : 'Monitored sources'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.monitoredSourceCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Newspaper className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '待編輯訊號' : 'Review-ready signals'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.reviewReadyCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '目錄跟進' : 'Directory follow-ups'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.openDirectoryFollowUpCount}</p>
            </div>
          </div>
        </section>
      </div>

      <section id="admin-trust" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '信任與審核工作區' : 'Trust and moderation workspace'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '左邊集中處理商家認領，右邊看檢舉與被標記內容，讓決策路徑更清楚。'
              : 'Claims stay on the left and moderation reports stay on the right so review work follows one clear path.'}
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? '待處理認領' : 'Pending claims'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {pendingClaims.length}
              </span>
            </div>
            <div className="mt-5">
              {pendingClaims.length === 0 ? (
                <EmptyState
                  title={locale === 'zh' ? '目前沒有新的認領申請' : 'No pending claims right now'}
                  description={
                    locale === 'zh'
                      ? '新的認領進來後會在這裡顯示。'
                      : 'New claim requests will appear here once submitted.'
                  }
                />
              ) : (
                <div className="max-h-[48rem] space-y-4 overflow-y-auto pr-1">
                  {pendingClaims.map((claim) => (
                    <div key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="font-semibold text-slate-900">{claim.claimantName}</p>
                      <p className="text-sm text-slate-600">{claim.email}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-600">
                        {claim.businessName}
                        {claim.city ? ` · ${claim.city}` : ''}
                      </p>
                      {claim.category ? (
                        <p className="mt-2 text-sm text-slate-500">
                          {locale === 'zh' ? '分類' : 'Category'}: {claim.category}
                        </p>
                      ) : null}
                      <BusinessClaimApprovalCard
                        categories={directoryCategories}
                        claim={claim}
                        locale={locale}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? '檢舉與內容佇列' : 'Reports and content queue'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {moderationQueueCount}
              </span>
            </div>
            <div className="mt-5">
              {moderationReports.length === 0 && snapshot.flaggedPosts.length === 0 ? (
                <EmptyState
                  title={locale === 'zh' ? '目前沒有待審核內容' : 'No moderation items at the moment'}
                  description={
                    locale === 'zh'
                      ? '當貼文被檢舉或達到自動隱藏門檻時，會在這裡集中。'
                      : 'When posts are reported or cross an auto-hide threshold, they will queue up here.'
                  }
                />
              ) : (
                <div className="max-h-[48rem] space-y-4 overflow-y-auto pr-1">
                  {snapshot.flaggedPosts.map((post) => (
                    <div key={post.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{t(post.title, locale)}</p>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {post.reportCount} {locale === 'zh' ? '則回報' : 'reports'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{t(post.excerpt, locale)}</p>
                    </div>
                  ))}
                  {moderationReports.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="font-semibold text-slate-900">{report.entitySlug}</p>
                      <p className="mt-2 text-sm text-slate-600">{reportReasonLabel(report.reason, locale)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AdminLeadOverview counts={adminLeadCounts} inquiries={adminRecentInquiries} locale={locale} />

      <AdminListingPlansPanel plans={adminListingPlans} locale={locale} />

      <AdminBusinessDetailsEditor
        locale={locale}
        listings={[...adminDirectoryBusinesses]
          .sort((left, right) => left.name.en.localeCompare(right.name.en))
          .map((business) => ({
            slug: business.slug,
            name: business.name.zh && business.name.zh !== business.name.en
              ? `${business.name.en} ${business.name.zh}`
              : business.name.en,
            categorySlug: business.categorySlug,
            city: business.city,
            details: bilingualDetailsOf(business),
          }))}
      />

      <section id="admin-editorial" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '編輯流程工作區' : 'Editorial workflow workspace'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把 Signal Desk 的待辦內容和來源名單分欄顯示，方便一邊處理文章，一邊檢查來源策略。'
              : 'Signal Desk tasks and source manifests live side by side so article handling and source strategy stay visually separate.'}
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? 'Signal Desk 佇列' : 'Signal Desk queue'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {signalDeskQueue.length}
              </span>
            </div>
            <div className="mt-5">
              {signalDeskQueue.length === 0 ? (
                <EmptyState
                  title={locale === 'zh' ? '目前沒有內容訊號' : 'No signal desk items yet'}
                  description={
                    locale === 'zh'
                      ? '一旦內容雷達開始輸出，這裡會顯示待審、已核准與已發布的內容訊號。'
                      : 'Once the content radar starts producing output, this area will show queued, approved, and published signal-desk items.'
                  }
                />
              ) : (
                <div className="max-h-[48rem] space-y-4 overflow-y-auto pr-1">
                  {signalDeskQueue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                            <span>{articleSeriesLabel(item.series, locale)}</span>
                            <span className="text-slate-300">/</span>
                            <span>{freshnessTierLabel(item.freshnessTier, locale)}</span>
                            <span className="text-slate-300">/</span>
                            <span className="tracking-normal text-slate-500">
                              {destinationSurfaceLabel(item.destinationSurface, locale)}
                            </span>
                          </div>
                          <p className="mt-2 font-semibold text-slate-900">{t(item.title, locale)}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {signalDeskReviewStatusLabel(item.reviewStatus, locale)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{item.sourceName}</span>
                        <span className="text-slate-300">/</span>
                        <span>{locale === 'zh' ? `優先分數 ${item.priorityScore}` : `Priority ${item.priorityScore}`}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.personaTargets.map((target) => (
                          <span
                            key={`${item.id}-${target}`}
                            className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                          >
                            {personaTargetLabel(target, locale)}
                          </span>
                        ))}
                      </div>
                      {item.directoryFollowUp ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                            <span>{directoryFollowUpActionLabel(item.directoryFollowUp.action, locale)}</span>
                            <span className="text-amber-300">/</span>
                            <span>{directoryFollowUpStatusLabel(item.directoryFollowUp.status, locale)}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-amber-900">
                            {t(item.directoryFollowUp.notes, locale)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? '監看來源清單' : 'Monitored source manifest'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {monitoredSources.length}
              </span>
            </div>
            <div className="mt-5 max-h-[48rem] space-y-3 overflow-y-auto pr-1">
              {monitoredSources.map((source) => (
                <div key={source.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{source.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{source.url}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {sourceTypeLabel(source.sourceType, locale)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {sourcePolicyLabel(source.allowedUse, locale)}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {destinationSurfaceLabel(source.destinationSurface, locale)}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {locale === 'zh' ? `${source.cadence} 監看` : `${source.cadence} cadence`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="admin-automation" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '自動化工作台' : 'Automation desks'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把高密度操作面板收進可展開區塊，平常先看摘要，需要時再深入處理。'
              : 'The densest control surfaces now live inside collapsible desks so you can scan the summaries first and only open the heavy tools when needed.'}
          </p>
        </div>

        <details
          open
          className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="list-none cursor-pointer p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Arizona News
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'zh' ? '即時 Radar 控制台' : 'Live Radar control desk'}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {locale === 'zh'
                      ? '看摘要、來源、候選內容與已上線內容，再決定要不要打開完整操作面板。'
                      : 'Review summary counts for sources, candidates, and live stories before opening the full operations desk.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh'
                    ? `${radarAdminSnapshot.overview.publishedCount} 已發佈`
                    : `${radarAdminSnapshot.overview.publishedCount} published`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh'
                    ? `${radarAdminSnapshot.candidates.length} 候選內容`
                    : `${radarAdminSnapshot.candidates.length} candidates`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {radarAdminSnapshot.overview.jobControl.paused
                    ? locale === 'zh'
                      ? '排程已暫停'
                      : 'Job paused'
                    : locale === 'zh'
                      ? '排程執行中'
                      : 'Job running'}
                </span>
              </div>
            </div>
          </summary>
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <RadarAdminPanel
              locale={locale}
              overview={radarAdminSnapshot.overview}
              sources={radarAdminSnapshot.sources}
              candidates={radarAdminSnapshot.candidates}
              articles={radarAdminSnapshot.articles}
              runs={radarAdminSnapshot.runs}
            />
          </div>
        </details>

        <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
          <summary className="list-none cursor-pointer p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Discover Arizona
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'zh' ? '短影音轉文章工作台' : 'Short-form discovery desk'}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {locale === 'zh'
                      ? '把候選影片、文章草稿與寫入能力放在可展開面板，減少主頁干擾。'
                      : 'Candidate videos, article drafting, and write controls now stay tucked into an expandable desk to keep the admin home calmer.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh'
                    ? `${discoverAdminQueue.length} 筆佇列`
                    : `${discoverAdminQueue.length} queued`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {discoverWriteEnabled
                    ? locale === 'zh'
                      ? '可寫入'
                      : 'Write enabled'
                    : locale === 'zh'
                      ? '唯讀'
                      : 'Read only'}
                </span>
              </div>
            </div>
          </summary>
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <DiscoverArizonaAdminPanel
              locale={locale}
              initialQueue={discoverAdminQueue}
              writeEnabled={discoverWriteEnabled}
            />
          </div>
        </details>
      </section>

      <section id="admin-analytics" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '平台訊號' : 'Platform signals'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把較低頻的事件追蹤放在最後，保留可見性，但不搶前面的營運注意力。'
              : 'Lower-frequency analytics stay visible at the end of the page without competing with the higher-priority operational work above.'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            {locale === 'zh' ? '目前事件追蹤' : 'Current event tracking'}
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(snapshot.analytics).length === 0 ? (
              <p className="text-sm text-slate-500">
                {locale === 'zh'
                  ? '互動事件還沒有累積；點擊商家、指南與社群內容後，這裡會開始顯示。'
                  : 'Interaction events have not accumulated yet. Clicks from business, guide, and community surfaces will begin populating this area.'}
              </p>
            ) : (
              Object.entries(snapshot.analytics).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">{key}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
