import { CalendarDays, ExternalLink, MapPin, ShieldAlert, UserRound } from 'lucide-react';
import Image from 'next/image';

import { BusinessCard } from '@/components/BusinessCard';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import {
  getEventBySlug,
  getProfileBySlug,
  getCommunityPostBySlug,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { getDirectoryBusinessBySlug } from '@/lib/directory';
import { descriptiveImageAlt, formatDate, formatDateTime, t } from '@/lib/i18n';
import { JsonLd } from '@/lib/schema';
import type { Business, CommunityPostType, Locale } from '@/lib/types';
import { sectionContainer } from '@/views/site-page-shared';

export async function EventDetailPageView({ locale, slug }: { locale: Locale; slug: string }) {
  const event = getEventBySlug(slug);
  if (!event) {
    return null;
  }

  const relatedBusinesses = (
    await Promise.all(event.relatedBusinessSlugs.map((relatedSlug) => getDirectoryBusinessBySlug(relatedSlug)))
  ).filter((business): business is Business => Boolean(business));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title.en,
    description: event.excerpt.en,
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    image: [event.heroImage],
    location: {
      '@type': 'Place',
      name: event.venueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address,
        addressLocality: event.city,
        addressRegion: 'AZ',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer,
    },
  };

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={jsonLd} />
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-72 w-full bg-slate-200">
          <Image
            src={event.heroImage}
            alt={descriptiveImageAlt(t(event.title, locale), 'event', locale)}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-8 p-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-600">
              {event.verifiedOrganizer ? (locale === 'zh' ? '已驗證主辦單位' : 'Verified organizer') : event.organizer}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(event.title, locale)}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(event.excerpt, locale)}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-5">
              {event.description.map((paragraph, index) => (
                <p key={`${event.slug}-${index}`} className="text-base leading-8 text-slate-700">
                  {t(paragraph, locale)}
                </p>
              ))}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {locale === 'zh' ? '活動資訊' : 'Event details'}
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{formatDateTime(event.startDate, locale)}</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{event.venueName}, {event.address}</span>
                </li>
                <li className="flex items-start gap-2">
                  <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{event.organizer}</span>
                </li>
              </ul>
              <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">{t(event.languageNote, locale)}</p>
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  {locale === 'zh' ? '查看官方活動頁' : 'Open official event page'}
                </a>
              ) : null}
            </aside>
          </div>
        </div>
      </article>

      {relatedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '相關商家' : 'Related businesses'}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {relatedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CommunityPostDetailPageView({
  locale,
  type,
  slug,
}: {
  locale: Locale;
  type: CommunityPostType;
  slug: string;
}) {
  const post = getCommunityPostBySlug(type, slug);
  if (!post) {
    return null;
  }

  const author = getProfileBySlug(post.authorSlug);
  const noindex = shouldNoIndexCommunityPost(post);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {type === 'classified'
                ? locale === 'zh'
                  ? '分類資訊'
                  : 'Classified'
                : locale === 'zh'
                  ? '社群看板'
                  : 'Community Board'}
            </span>
            {noindex ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5" />
                {locale === 'zh' ? '未建立信任，暫不收錄搜尋' : 'Untrusted content, temporarily noindex'}
              </span>
            ) : null}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(post.title, locale)}</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">{t(post.excerpt, locale)}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span>{formatDate(post.updatedAt, locale)}</span>
            <span>{post.city}</span>
            {post.price ? <span>{post.price}</span> : null}
          </div>
          <div className="space-y-4 pt-4">
            {post.body.map((paragraph, index) => (
              <p key={`${post.slug}-${index}`} className="text-base leading-8 text-slate-700">
                {t(paragraph, locale)}
              </p>
            ))}
            {post.linkUrl ? (
              <a
                href={post.linkUrl}
                target="_blank"
                rel="ugc nofollow noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                {locale === 'zh' ? '開啟外部連結（ugc / nofollow）' : 'Open external link (ugc / nofollow)'}
              </a>
            ) : null}
          </div>
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {locale === 'zh' ? '作者資訊' : 'Author'}
          </h2>
          {author ? (
            <div className="mt-4 space-y-3">
              <p className="font-semibold text-brand-700">
                <span lang="en">{author.name}</span> · <span lang="zh">{author.nameZh}</span>
              </p>
              <p className="text-sm text-slate-600">{t(author.bio, locale)}</p>
            </div>
          ) : null}
        </div>

        <ReportIssueForm entitySlug={post.slug} locale={locale} />
      </div>
    </div>
  );
}
