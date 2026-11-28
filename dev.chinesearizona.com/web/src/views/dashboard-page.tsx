import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  MessageCircle,
  Search,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

import { BusinessImage } from '@/components/BusinessImage';
import { BusinessCard } from '@/components/BusinessCard';
import { EmptyState } from '@/components/EmptyState';
import { DashboardAccessNotice } from '@/components/auth/DashboardAccessNotice';
import { OwnerLeadSummary } from '@/components/directory/BusinessLeadPanels';
import { BusinessPhotoEditor } from '@/components/directory/BusinessPhotoEditor';
import { OwnedBusinessDeleteButton } from '@/components/directory/OwnedBusinessDeleteButton';
import {
  OwnerNextSteps,
  buildOwnerUpgradeTarget,
  type OwnerUpgradeTarget,
} from '@/components/directory/OwnerNextSteps';
import { getBusinessReviews } from '@/lib/content';
import { isSupabaseServiceConfigured } from '@/lib/supabase';
import { getDirectoryBusinesses } from '@/lib/directory';
import { getBusinessLeadCounts, getRecentBusinessInquiries } from '@/lib/business-leads';
import {
  confirmListingPlanCheckoutForProfile,
  getListingPlanAvailability,
  getListingPlanStatesForOwnerBusinesses,
} from '@/lib/listing-plans';
import {
  listingPlanReturnMessage,
  type ListingPlanCheckoutOutcome,
  type ListingPlanOwnerState,
} from '@/lib/listing-plan-offers';
import { getPendingBusinessClaimsForProfile } from '@/lib/directory-moderation';
import { ListingPlanPanel } from '@/components/directory/ListingPlanPanel';
import { BusinessBilingualDetailsEditor } from '@/components/directory/BusinessBilingualDetailsEditor';
import { getDirectoryAdCampaignsForOwnerBusinesses } from '@/lib/directory-ads';
import {
  descriptiveImageAlt,
  directoryStatusLabel,
  profileRoleLabel,
  t,
  verificationStateLabel,
} from '@/lib/i18n';
import { ensureProfileForAuthUser } from '@/lib/profile-auth';
import { withLocale } from '@/lib/routing';
import { getServerUserFromCookies } from '@/lib/server-auth';
import type { Business, DirectoryAdCampaign, Locale } from '@/lib/types';
import { bilingualDetailsOf, sectionContainer } from '@/views/site-page-shared';

function DashboardMetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="group rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(74,49,27,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white active:translate-y-px">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-[#f6eee5] p-2.5 text-brand-800 transition duration-300 group-hover:bg-brand-900 group-hover:text-white">
          {icon}
        </div>
        <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(102,33,22,0.22),transparent)]" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-4xl font-semibold leading-none tracking-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function DashboardQuickAction({
  href,
  icon,
  title,
  description,
  cta,
  primary = false,
  className = '',
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-[1.35rem] border p-5 transition duration-300 hover:-translate-y-0.5 active:translate-y-px ${
        primary
          ? 'border-brand-900 bg-brand-900 text-white shadow-[0_24px_60px_rgba(102,33,22,0.2)]'
          : 'border-slate-200/80 bg-white/80 text-slate-950 shadow-[0_18px_45px_rgba(74,49,27,0.06)] hover:border-brand-200 hover:bg-white'
      } ${className}`}
    >
      <div className="space-y-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            primary ? 'bg-white/[0.12] text-white' : 'bg-[#f6eee5] text-brand-800'
          }`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className={`mt-2 text-sm leading-6 ${primary ? 'text-white/75' : 'text-slate-600'}`}>{description}</p>
        </div>
      </div>
      <span
        className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
          primary ? 'text-white' : 'text-brand-700'
        }`}
      >
        {cta}
        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function DashboardChecklistItem({
  icon,
  title,
  description,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <li className="flex gap-3 border-t border-slate-200/80 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
          active ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </li>
  );
}

function dashboardCampaignStatusLabel(status: DirectoryAdCampaign['status'], locale: Locale) {
  const labels: Record<DirectoryAdCampaign['status'], { en: string; zh: string }> = {
    pending_payment: { en: 'Pending payment', zh: '待付款' },
    active: { en: 'Sponsored', zh: '贊助中' },
    paused: { en: 'Paused', zh: '已暫停' },
    cancelled: { en: 'Cancelled', zh: '已取消' },
    exhausted: { en: 'Budget spent', zh: '預算用盡' },
    expired: { en: 'Expired', zh: '已到期' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

function ManagedBusinessWorkspaceRow({
  business,
  locale,
  campaign,
  listingPlansAvailable,
  listingPlansMockMode,
  listingPlanStates,
  checkoutOutcome,
  defaultOpen,
}: {
  business: Business;
  locale: Locale;
  campaign?: DirectoryAdCampaign;
  listingPlansAvailable: boolean;
  listingPlansMockMode: boolean;
  listingPlanStates: ListingPlanOwnerState[];
  checkoutOutcome?: ListingPlanCheckoutOutcome;
  // Open when it's the owner's only listing or the one they just paid for or
  // asked to see, so plans and payment notes are not hidden (#451).
  defaultOpen: boolean;
}) {
  const detailHref = withLocale(locale, `/business/${business.slug}`);
  const photoCount = (business.heroImage ? 1 : 0) + business.gallery.length;
  const statusLabel = business.status
    ? directoryStatusLabel(business.status, locale)
    : locale === 'zh'
      ? '已收錄'
      : 'Listed';
  const verificationLabel = business.verificationState
    ? verificationStateLabel(business.verificationState, locale)
    : locale === 'zh'
      ? '未驗證'
      : 'Unverified';
  const placementLabel = campaign
    ? dashboardCampaignStatusLabel(campaign.status, locale)
    : business.paidPlans?.includes('sponsored-category')
      ? locale === 'zh'
        ? '贊助版位'
        : 'Sponsored spot'
      : business.sponsored || business.legacySponsored
        ? locale === 'zh'
          ? '人工精選'
          : 'Manual placement'
        : locale === 'zh'
          ? '未啟用'
          : 'Not active';

  return (
    <details
      id={`listing-${business.slug}`}
      open={defaultOpen}
      className="group overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white/80 shadow-[0_18px_45px_rgba(74,49,27,0.055)] transition duration-300 open:bg-white open:shadow-[0_24px_60px_rgba(74,49,27,0.08)]">
      <summary className="grid cursor-pointer list-none gap-4 px-4 py-4 outline-none transition duration-300 hover:bg-[#fff8ef] focus-visible:ring-2 focus-visible:ring-brand-200 sm:grid-cols-[minmax(0,1.45fr)_0.65fr_0.65fr_0.65fr_auto] sm:items-center [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#eadccb]">
            <BusinessImage
              imageUrl={business.heroImage}
              label={descriptiveImageAlt(t(business.name, locale), 'business', locale)}
              locale={locale}
              sizes="56px"
              className="object-cover"
              showIllustrationLabel={false}
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-950">
              {t(business.name, locale)}
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500">
              {business.address ?? business.serviceAreaText ?? `${business.city}, AZ`}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {locale === 'zh' ? '狀態' : 'Status'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{statusLabel}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {locale === 'zh' ? '驗證' : 'Verification'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{verificationLabel}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {locale === 'zh' ? '推廣' : 'Placement'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{placementLabel}</p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {locale === 'zh' ? `${photoCount} 張照片` : `${photoCount} photos`}
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-90" />
        </div>
      </summary>

      <div className="border-t border-slate-200/80 bg-[#fffdfa] px-4 py-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '展開後只顯示這筆商家的管理工具，避免整個頁面變成長卡片列表。'
              : 'Expanded rows show only this listing’s management tools, keeping the workspace compact.'}
          </p>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800 active:translate-y-px"
          >
            {locale === 'zh' ? '查看公開頁面' : 'View public page'}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-4">
          <BusinessPhotoEditor business={business} locale={locale} />
          <BusinessBilingualDetailsEditor
            businessSlug={business.slug}
            categorySlug={business.categorySlug}
            initialDetails={bilingualDetailsOf(business)}
            locale={locale}
          />
          <ListingPlanPanel
            available={listingPlansAvailable}
            business={business}
            checkoutOutcome={checkoutOutcome}
            locale={locale}
            mockMode={listingPlansMockMode}
            states={listingPlanStates}
          />
          {/* The pay-per-click "Sponsored placement" panel is hidden (#468): it is not on the
              approved price list, and per-click billing conflicts with the flat-fee rule for
              realtors. DirectoryAdCampaignPanel and its API stay in the code for later. */}
          <OwnedBusinessDeleteButton business={business} locale={locale} />
        </div>
      </div>
    </details>
  );
}

// Query string Stripe Checkout sends owners back with, plus `business` to open
// one listing's plans from the next-step card.
export type DashboardSearchParams = {
  business?: string;
  listingPlan?: string;
  session_id?: string;
};

// Saves the plan as soon as the owner is back from a paid checkout, without
// waiting for the webhook (#449). A failure here only falls back to the
// webhook, so it never breaks the dashboard.
async function confirmReturnedPlanCheckout(
  profileId: string | undefined,
  searchParams: DashboardSearchParams
): Promise<ListingPlanCheckoutOutcome | undefined> {
  if (!profileId || searchParams.listingPlan !== 'success' || !searchParams.session_id) {
    return undefined;
  }

  try {
    return await confirmListingPlanCheckoutForProfile({
      checkoutSessionId: searchParams.session_id,
      profileId,
    });
  } catch (error) {
    console.error('[dashboard] Unable to confirm the returned plan checkout:', error);
    return undefined;
  }
}

export async function DashboardPageView({
  locale,
  searchParams = {},
}: {
  locale: Locale;
  searchParams?: DashboardSearchParams;
}) {
  const user = await getServerUserFromCookies();
  const normalizedUserEmail = user?.email?.trim().toLowerCase() ?? '';
  const profilePromise = user ? ensureProfileForAuthUser(user) : Promise.resolve(null);
  // Confirm before loading listings so a plan bought a moment ago shows as on.
  const planCheckoutOutcome = await profilePromise.then((loadedProfile) =>
    confirmReturnedPlanCheckout(loadedProfile?.id, searchParams)
  );
  const [profile, ownerBusinesses] = await Promise.all([
    profilePromise,
    getDirectoryBusinesses({}, { includeNonPublic: true, limit: 500 }),
  ]);
  const managedBusinesses = profile
    ? ownerBusinesses.filter((business) => business.ownerProfileSlug === profile.slug)
    : [];
  const claimableBusinesses = normalizedUserEmail
    ? ownerBusinesses.filter((business) => {
        if (managedBusinesses.some((managedBusiness) => managedBusiness.id === business.id)) {
          return false;
        }

        if (business.ownerProfileSlug) {
          return false;
        }

        return (business.email?.trim().toLowerCase() ?? '') === normalizedUserEmail;
      })
    : [];
  const adCampaignsByBusinessId: Map<string, DirectoryAdCampaign> = profile
    ? await getDirectoryAdCampaignsForOwnerBusinesses(profile.id, managedBusinesses)
    : new Map<string, DirectoryAdCampaign>();
  const managedBusinessIds = managedBusinesses.map((business) => business.id);
  const [
    leadCounts,
    recentInquiries,
    listingPlanAvailability,
    listingPlanStatesByBusinessId,
    pendingClaims,
  ] = await Promise.all([
    getBusinessLeadCounts({ businessIds: managedBusinessIds }),
    getRecentBusinessInquiries({ businessIds: managedBusinessIds, limit: 10 }),
    getListingPlanAvailability(),
    getListingPlanStatesForOwnerBusinesses(managedBusinesses),
    profile ? getPendingBusinessClaimsForProfile(profile.id) : Promise.resolve([]),
  ]);
  const listingPlansAvailable = listingPlanAvailability.mode !== 'read_only';
  const focusBusinessSlug =
    managedBusinesses.length === 1 ? managedBusinesses[0].slug : searchParams.business;
  const returnedFrom =
    searchParams.listingPlan === 'success' || searchParams.listingPlan === 'cancelled'
      ? searchParams.listingPlan
      : undefined;
  const returnNotice =
    returnedFrom && managedBusinesses.some((business) => business.slug === searchParams.business)
      ? listingPlanReturnMessage(returnedFrom, planCheckoutOutcome, locale)
      : undefined;
  const upgradeTargets = listingPlansAvailable
    ? managedBusinesses
        // The listing just paid for gets the payment note, not another offer.
        .filter((business) => !(returnedFrom === 'success' && business.slug === searchParams.business))
        .map((business) =>
          buildOwnerUpgradeTarget(business, listingPlanStatesByBusinessId.get(business.id) ?? [], locale)
        )
        .filter((target): target is OwnerUpgradeTarget => target !== null)
    : [];
  const showLeadSummary = managedBusinesses.length > 0 && isSupabaseServiceConfigured();
  const recentReviews = managedBusinesses.flatMap((business) => getBusinessReviews(business.slug));
  const claimBusinessHref = withLocale(locale, '/add-business');
  const editProfileHref = withLocale(locale, '/dashboard/profile');
  const directoryHref = withLocale(locale, '/directory');
  const accountName = profile?.name ?? user?.email ?? (locale === 'zh' ? '主理人' : 'Owner');
  const accountRoleLabel = profileRoleLabel(profile?.role ?? 'member', locale);
  const firstName = accountName.split(/\s+/)[0] || accountName;
  const plansReadinessLabel = listingPlansAvailable
    ? locale === 'zh'
      ? '方案可購買'
      : 'Plans open'
    : locale === 'zh'
      ? '方案即將開放'
      : 'Plans coming soon';

  return sectionContainer(
    <div className="space-y-8 py-10 sm:py-12 lg:py-14">
      {/* The owner's next step comes first: a payment note, a claim under review or an upgrade (#451). */}
      <OwnerNextSteps
        dashboardPath={withLocale(locale, '/dashboard')}
        locale={locale}
        pendingClaims={pendingClaims}
        returnNotice={returnNotice}
        upgradeTargets={upgradeTargets}
      />
      <section className="relative overflow-hidden rounded-[2rem] border border-[#e5d7c8] bg-[#fffdfa] shadow-[0_30px_80px_rgba(74,49,27,0.09)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#662116,#b87f3d,#f7e8d0)]" />
        <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)] xl:p-10">
          <div className="flex min-h-[21rem] flex-col justify-between gap-10">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                {locale === 'zh' ? '主理人工作台' : 'Owner workspace'}
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {locale === 'zh' ? `${firstName}，今天從這裡開始` : `Start here, ${firstName}`}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {locale === 'zh'
                    ? user
                      ? '把認領、已連結商家、近期互動與帳號設定放在同一個清楚的工作區，少一點翻找，多一點掌控。'
                      : '登入後即可在這裡管理商家、追蹤認領與查看帳號相關活動。'
                    : user
                      ? 'Claims, connected listings, recent activity, and account settings now live in one clearer owner workspace.'
                      : 'Sign in to manage listings, follow claims, and view account activity in one place.'}
                </p>
              </div>
            </div>

            {user ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={claimBusinessHref}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(102,33,22,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px"
                >
                  {locale === 'zh' ? '認領商家' : 'Claim business'}
                </Link>
                <Link
                  href={editProfileHref}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800 active:translate-y-px"
                >
                  {locale === 'zh' ? '編輯帳號' : 'Edit profile'}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <DashboardAccessNotice locale={locale} email={user?.email ?? ''} role={profile?.role ?? 'member'} />
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/70 p-5 shadow-[0_18px_45px_rgba(74,49,27,0.06)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '目前概況' : 'Current snapshot'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-3xl font-semibold text-slate-950">{managedBusinesses.length}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {locale === 'zh' ? '已連結商家' : 'connected listings'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold text-slate-950">{claimableBusinesses.length}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {locale === 'zh' ? '待認領符合項' : 'claim matches'}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950 px-4 py-3 text-sm leading-6 text-white">
                {locale === 'zh' ? `帳號角色：${accountRoleLabel}` : `Account role: ${accountRoleLabel}`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {user ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr_0.9fr_1fr]">
            <DashboardMetricCard
              icon={<Store className="h-5 w-5" />}
              label={locale === 'zh' ? '管理中的商家' : 'Managed listings'}
              value={managedBusinesses.length}
              detail={
                locale === 'zh'
                  ? '已經連結到這個帳號、可以維護資料與圖片的商家。'
                  : 'Listings connected to this account for details, photos, and owner tools.'
              }
            />
            <DashboardMetricCard
              icon={<MessageCircle className="h-5 w-5" />}
              label={locale === 'zh' ? '近期評論' : 'Recent reviews'}
              value={recentReviews.length}
              detail={
                locale === 'zh'
                  ? '來自你已管理商家的新近互動。'
                  : 'Fresh interaction across the listings you manage.'
              }
            />
            <DashboardMetricCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label={locale === 'zh' ? '待認領符合項' : 'Claim matches'}
              value={claimableBusinesses.length}
              detail={
                locale === 'zh'
                  ? '聯絡 Email 與這個帳號相符的未綁定商家。'
                  : 'Unassigned listings with contact email matching this account.'
              }
            />
            <DashboardMetricCard
              icon={<UserRound className="h-5 w-5" />}
              label={locale === 'zh' ? '帳號角色' : 'Account role'}
              value={<span className="text-2xl">{accountRoleLabel}</span>}
              detail={
                locale === 'zh'
                  ? '角色會決定可用的管理與審核工具。'
                  : 'Role controls the owner and review tools available here.'
              }
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <DashboardQuickAction
                href={claimBusinessHref}
                icon={<Building2 className="h-5 w-5" />}
                title={locale === 'zh' ? '認領或新增商家' : 'Claim or add a listing'}
                description={
                  locale === 'zh'
                    ? '搜尋現有資料、送出主理人認領，或建立目前還沒有收錄的新商家。'
                    : 'Search the directory, submit an owner claim, or add a business that is not listed yet.'
                }
                cta={locale === 'zh' ? '開始認領' : 'Start claim'}
                primary
                className="md:row-span-2"
              />
              <DashboardQuickAction
                href={editProfileHref}
                icon={<UserRound className="h-5 w-5" />}
                title={locale === 'zh' ? '整理帳號資料' : 'Tune account details'}
                description={
                  locale === 'zh'
                    ? '更新你的帳號資料，讓後續認領與管理流程更容易核對。'
                    : 'Keep profile details current so claims and management work stay easy to verify.'
                }
                cta={locale === 'zh' ? '開啟設定' : 'Open settings'}
              />
              <DashboardQuickAction
                href={directoryHref}
                icon={<Search className="h-5 w-5" />}
                title={locale === 'zh' ? '查看公開目錄' : 'Review the public directory'}
                description={
                  locale === 'zh'
                    ? '從瀏覽者角度檢查商家頁面、分類與搜尋結果。'
                    : 'Check listings, categories, and search results from a visitor point of view.'
                }
                cta={locale === 'zh' ? '前往目錄' : 'Go to directory'}
              />
            </div>

            <aside className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(74,49,27,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {locale === 'zh' ? '下一步' : 'Next checks'}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    {locale === 'zh' ? '保持商家頁面可用' : 'Keep listings ready'}
                  </h2>
                </div>
                <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                  {plansReadinessLabel}
                </span>
              </div>
              <ul className="mt-5">
                <DashboardChecklistItem
                  icon={<Store className="h-4 w-4" />}
                  title={locale === 'zh' ? '連結商家' : 'Connect listings'}
                  description={
                    managedBusinesses.length > 0
                      ? locale === 'zh'
                        ? '你已經有可管理的商家。'
                        : 'You have at least one listing connected.'
                      : locale === 'zh'
                        ? '完成認領後，管理工具會在這裡出現。'
                        : 'Approved claims will unlock owner tools here.'
                  }
                  active={managedBusinesses.length > 0}
                />
                <DashboardChecklistItem
                  icon={<Camera className="h-4 w-4" />}
                  title={locale === 'zh' ? '維護圖片與資料' : 'Maintain photos and details'}
                  description={
                    managedBusinesses.length > 0
                      ? locale === 'zh'
                        ? '在下方商家區塊補充圖片、資料與方案。'
                        : 'Use the business workspace below for photos, details and plans.'
                      : locale === 'zh'
                        ? '等第一筆商家連結後再補充圖片與資料。'
                        : 'Add richer details once the first listing is connected.'
                  }
                  active={managedBusinesses.length > 0}
                />
                <DashboardChecklistItem
                  icon={<CircleDollarSign className="h-4 w-4" />}
                  title={locale === 'zh' ? '商家方案' : 'Listing plans'}
                  description={
                    listingPlansAvailable
                      ? locale === 'zh'
                        ? '可在下方各商家區塊購買進階商家頁與分類贊助版位。'
                        : 'Buy the Enhanced listing or a Sponsored category spot from each listing below.'
                      : locale === 'zh'
                        ? '線上購買方案尚未開放。'
                        : 'Online plan checkout is not open yet.'
                  }
                  active={listingPlansAvailable && managedBusinesses.length > 0}
                />
              </ul>
            </aside>
          </section>

          {claimableBusinesses.length > 0 ? (
            <section className="space-y-5 rounded-[1.6rem] border border-brand-100 bg-brand-50/50 p-5 shadow-[0_20px_50px_rgba(102,33,22,0.06)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                    {locale === 'zh' ? '待處理' : 'Needs attention'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {locale === 'zh' ? '待你認領的商家' : 'Listings ready to claim'}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {locale === 'zh'
                      ? '我們找到聯絡 Email 與目前帳號相符、但尚未綁定主理人的商家。送出認領後，我們會沿用這筆資料繼續處理。'
                      : 'We found listings whose contact email matches this account but are not yet connected to an owner profile. Use the claim flow to confirm ownership and keep the existing listing data.'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {claimableBusinesses.map((business) => {
                  const businessClaimHref = withLocale(
                    locale,
                    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
                  );

                  return (
                    <div key={business.id} className="space-y-4 border-t border-brand-100 pt-4 first:border-t-0 first:pt-0">
                      <BusinessCard business={business} locale={locale} />
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={businessClaimHref}
                          className="inline-flex items-center rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px"
                        >
                          {locale === 'zh' ? '認領這筆商家' : 'Claim this listing'}
                        </Link>
                        <Link
                          href={withLocale(locale, `/business/${business.slug}`)}
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800 active:translate-y-px"
                        >
                          {locale === 'zh' ? '查看商家頁面' : 'View listing'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {showLeadSummary ? (
            <OwnerLeadSummary
              businesses={managedBusinesses}
              counts={leadCounts}
              inquiries={recentInquiries}
              locale={locale}
            />
          ) : null}

          {managedBusinesses.length > 0 ? (
            <section id="your-businesses" className="space-y-5 rounded-[1.6rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_22px_55px_rgba(74,49,27,0.07)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {locale === 'zh' ? '管理工作區' : 'Management workspace'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {locale === 'zh' ? '你的商家' : 'Your businesses'}
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-right">
                  {locale === 'zh'
                    ? '逐一檢查公開頁面、圖片、推廣設定與必要的帳號操作。'
                    : 'Review public pages, photos, promotion settings, and account actions from each listing block.'}
                </p>
              </div>
              <div className="space-y-3">
                {managedBusinesses.map((business) => (
                  <ManagedBusinessWorkspaceRow
                    key={business.id}
                    business={business}
                    campaign={adCampaignsByBusinessId.get(business.id)}
                    locale={locale}
                    listingPlansAvailable={listingPlansAvailable}
                    listingPlansMockMode={listingPlanAvailability.mode === 'mock'}
                    listingPlanStates={listingPlanStatesByBusinessId.get(business.id) ?? []}
                    checkoutOutcome={business.slug === searchParams.business ? planCheckoutOutcome : undefined}
                    defaultOpen={business.slug === focusBusinessSlug}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_22px_55px_rgba(74,49,27,0.07)] sm:p-6">
              <EmptyState
                title={locale === 'zh' ? '目前還沒有可管理的商家' : 'No managed listings yet'}
                description={
                  locale === 'zh'
                    ? '當商家認領完成，或有商家連結到這個帳號後，這裡就會顯示可管理的項目。'
                    : 'Listings connected to this account will appear here once a claim is approved or a business is assigned to you.'
                }
                actionLabel={locale === 'zh' ? '認領商家' : 'Claim business'}
                actionHref={claimBusinessHref}
              />
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
