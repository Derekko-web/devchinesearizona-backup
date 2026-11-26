import { BusinessCard } from '@/components/BusinessCard';
import { CommunityCard } from '@/components/CommunityCard';
import { getPostsByAuthor, getProfileBySlug } from '@/lib/content';
import { getDirectoryBusinesses } from '@/lib/directory';
import { formatLanguageList, profileRoleLabel, t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import { sectionContainer } from '@/views/site-page-shared';

export async function ProfilePageView({ locale, slug }: { locale: Locale; slug: string }) {
  const profile = getProfileBySlug(slug);
  if (!profile) {
    return null;
  }

  const ownedBusinesses = (await getDirectoryBusinesses({}, { limit: 500 })).filter(
    (business) => business.ownerProfileSlug === profile.slug
  );
  const posts = getPostsByAuthor(profile.slug);

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white ${profile.avatarColor}`}>
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">{profile.name}</h1>
              <p className="text-lg text-slate-500" lang="zh">
                {profile.nameZh}
              </p>
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(profile.bio, locale)}</p>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              {locale === 'zh'
                ? '這個頁面主要作為商家擁有權、供稿記錄與平台透明度的公開識別，不是一般瀏覽流程的核心入口。'
                : 'This page mainly exists as a public identity record for ownership, contribution history, and platform transparency rather than as a primary browse destination.'}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>{profileRoleLabel(profile.role, locale)}</span>
              <span>{profile.city}</span>
              <span>{formatLanguageList(profile.languages, locale)}</span>
            </div>
          </div>
        </div>
      </div>

      {ownedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '管理中的商家' : 'Managed businesses'}</h2>
          <div className="space-y-4">
            {ownedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}

      {posts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '近期貼文' : 'Recent posts'}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {posts.map((post) => (
              <CommunityCard key={post.slug} post={post} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
