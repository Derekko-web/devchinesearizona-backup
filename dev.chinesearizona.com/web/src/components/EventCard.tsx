import { Calendar, MapPin, Ticket } from 'lucide-react';
import Image from 'next/image';

import { descriptiveImageAlt, formatDateTime, t } from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import type { Event, Locale } from '@/lib/types';
import { TrackedLink } from '@/components/TrackedLink';

type EventCardProps = {
  event: Event;
  locale: Locale;
};

export function EventCard({ event, locale }: EventCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-44 w-full bg-slate-200">
        <Image
          src={event.heroImage}
          alt={descriptiveImageAlt(t(event.title, locale), 'event', locale)}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-600">
            {event.verifiedOrganizer ? (locale === 'zh' ? '已驗證主辦' : 'Verified Organizer') : event.organizer}
          </div>
          <h3 className="text-xl font-bold text-slate-900">{t(event.title, locale)}</h3>
          <p className="text-sm leading-6 text-slate-600">{t(event.excerpt, locale)}</p>
        </div>

        <div className="space-y-2 text-sm text-slate-500">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            {formatDateTime(event.startDate, locale)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {event.venueName}, {event.city}
          </p>
          {event.ticketUrl ? (
            <p className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-slate-400" />
              {locale === 'zh' ? '提供活動頁面' : 'Ticket / RSVP link available'}
            </p>
          ) : null}
        </div>

        <TrackedLink
          href={withLocale(locale, `/community/events/${event.slug}`)}
          eventType="event_click"
          entitySlug={event.slug}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {locale === 'zh' ? '查看活動' : 'View event'}
        </TrackedLink>
      </div>
    </article>
  );
}
