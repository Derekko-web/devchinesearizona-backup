import { Globe2, MessageCircle, Phone, Route } from 'lucide-react';
import Link from 'next/link';

import type { BusinessInquirySummary, BusinessLeadCounts } from '@/lib/business-leads';
import { withLocale } from '@/lib/routing';
import type { Locale, LocalizedText } from '@/lib/types';

function pick(text: LocalizedText, locale: Locale) {
  return locale === 'zh' && text.zh ? text.zh : text.en;
}

export function callHeadline(callClicks: number, locale: Locale): string {
  if (locale === 'zh') {
    return callClicks > 0 ? `本月有 ${callClicks} 人點擊撥打你的電話` : '本月還沒有人點擊撥打電話';
  }

  if (callClicks === 0) {
    return 'No one has tapped Call yet this month';
  }

  return callClicks === 1 ? '1 person tapped to call you this month' : `${callClicks} people tapped to call you this month`;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Phoenix',
  }).format(new Date(value));
}

function CountChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{icon}</span>
      <span className="font-mono text-lg font-semibold text-slate-950">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function countLabels(locale: Locale) {
  return locale === 'zh'
    ? { call: '撥打電話', website: '前往網站', directions: '查看路線', inquiries: '詢價' }
    : { call: 'Call', website: 'Website', directions: 'Directions', inquiries: 'Inquiries' };
}

const emptyCounts = { callClicks: 0, websiteClicks: 0, directionsClicks: 0, inquiries: 0 };

export function OwnerLeadSummary({
  businesses,
  counts,
  inquiries,
  locale,
}: {
  businesses: Array<{ id: string; slug: string; name: LocalizedText }>;
  counts: BusinessLeadCounts[];
  inquiries: BusinessInquirySummary[];
  locale: Locale;
}) {
  const labels = countLabels(locale);
  const countsById = new Map(counts.map((row) => [row.businessId, row]));

  return (
    <section
      id="your-leads"
      className="space-y-5 rounded-[1.6rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_22px_55px_rgba(74,49,27,0.07)] sm:p-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {locale === 'zh' ? '本月客源' : 'Leads this month'}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {locale === 'zh' ? '顧客怎麼聯絡你' : 'How customers reached you'}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {locale === 'zh'
            ? '每位訪客每天每個按鈕只算一次。這些客源都是免費的。'
            : 'Each visitor counts once per button per day. These leads are free.'}
        </p>
      </div>

      <div className="space-y-3">
        {businesses.map((business) => {
          const row = countsById.get(business.id) ?? emptyCounts;
          return (
            <div key={business.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-950">{pick(business.name, locale)}</p>
                <p className="text-sm font-semibold text-brand-800">{callHeadline(row.callClicks, locale)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CountChip icon={<Phone className="h-4 w-4" />} label={labels.call} value={row.callClicks} />
                <CountChip icon={<Globe2 className="h-4 w-4" />} label={labels.website} value={row.websiteClicks} />
                <CountChip icon={<Route className="h-4 w-4" />} label={labels.directions} value={row.directionsClicks} />
                <CountChip icon={<MessageCircle className="h-4 w-4" />} label={labels.inquiries} value={row.inquiries} />
              </div>
            </div>
          );
        })}
      </div>

      {inquiries.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{locale === 'zh' ? '最近的詢價' : 'Recent inquiries'}</h3>
          <InquiryList inquiries={inquiries} locale={locale} showBusiness={businesses.length > 1} />
        </div>
      ) : null}
    </section>
  );
}

export function InquiryList({
  inquiries,
  locale,
  showBusiness,
  showDelivery = false,
}: {
  inquiries: BusinessInquirySummary[];
  locale: Locale;
  showBusiness: boolean;
  showDelivery?: boolean;
}) {
  return (
    <ul className="mt-3 space-y-3">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-950">
              {inquiry.name}
              <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
                {inquiry.inquiryType === 'quote'
                  ? locale === 'zh'
                    ? '報價'
                    : 'Quote'
                  : locale === 'zh'
                    ? '提問'
                    : 'Question'}
              </span>
            </p>
            <time dateTime={inquiry.createdAt} className="text-xs text-slate-500">
              {formatDate(inquiry.createdAt, locale)}
            </time>
          </div>
          {showBusiness && inquiry.business ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
              <Link href={withLocale(locale, `/business/${inquiry.business.slug}`)} className="hover:underline">
                {pick(inquiry.business.name, locale)}
              </Link>
            </p>
          ) : null}
          <p className="mt-1 text-slate-600">
            <a href={`mailto:${inquiry.email}`} className="hover:text-brand-800 hover:underline">
              {inquiry.email}
            </a>
            {inquiry.phone ? <span className="ml-3">{inquiry.phone}</span> : null}
          </p>
          <p className="mt-2 whitespace-pre-line leading-6 text-slate-700">{inquiry.message}</p>
          {showDelivery ? <DeliveryNote inquiry={inquiry} locale={locale} /> : null}
        </li>
      ))}
    </ul>
  );
}

function DeliveryNote({ inquiry, locale }: { inquiry: BusinessInquirySummary; locale: Locale }) {
  if (inquiry.notifiedTo) {
    const target =
      inquiry.notifiedTo === 'owner' ? (locale === 'zh' ? '商家' : 'owner') : locale === 'zh' ? '管理員' : 'admin';
    return (
      <p className="mt-2 text-xs font-semibold text-emerald-700">
        {locale === 'zh' ? `已寄給${target}` : `Emailed to ${target}`}
      </p>
    );
  }

  return (
    <p className="mt-2 text-xs font-semibold text-amber-700">
      {locale === 'zh' ? '尚未寄出，請手動轉給商家' : 'Not emailed. Forward it by hand'}
      {inquiry.notifyError ? <span className="ml-1 font-mono font-normal">({inquiry.notifyError})</span> : null}
    </p>
  );
}

export function AdminLeadOverview({
  counts,
  inquiries,
  locale,
}: {
  counts: BusinessLeadCounts[];
  inquiries: BusinessInquirySummary[];
  locale: Locale;
}) {
  const labels = countLabels(locale);
  const totals = counts.reduce(
    (sum, row) => ({
      callClicks: sum.callClicks + row.callClicks,
      websiteClicks: sum.websiteClicks + row.websiteClicks,
      directionsClicks: sum.directionsClicks + row.directionsClicks,
      inquiries: sum.inquiries + row.inquiries,
    }),
    emptyCounts
  );

  return (
    <section id="admin-leads" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '商家客源（本月）' : 'Listing leads this month'}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {locale === 'zh'
            ? '每個商家頁面的撥打、網站、路線點擊與詢價。每位訪客每天每個按鈕只算一次。用這些數字向商家證明價值。'
            : 'Call, Website, and Directions clicks plus inquiries for each listing. Each visitor counts once per button per day. Use these numbers to show businesses what the listing does for them.'}
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CountChip icon={<Phone className="h-4 w-4" />} label={labels.call} value={totals.callClicks} />
            <CountChip icon={<Globe2 className="h-4 w-4" />} label={labels.website} value={totals.websiteClicks} />
            <CountChip icon={<Route className="h-4 w-4" />} label={labels.directions} value={totals.directionsClicks} />
            <CountChip icon={<MessageCircle className="h-4 w-4" />} label={labels.inquiries} value={totals.inquiries} />
          </div>
          {counts.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              {locale === 'zh' ? '本月還沒有點擊或詢價。' : 'No clicks or inquiries yet this month.'}
            </p>
          ) : (
            <div className="mt-5 max-h-[36rem] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">{locale === 'zh' ? '商家' : 'Listing'}</th>
                    <th className="px-2 py-2 text-right font-semibold">{labels.call}</th>
                    <th className="px-2 py-2 text-right font-semibold">{labels.website}</th>
                    <th className="px-2 py-2 text-right font-semibold">{labels.directions}</th>
                    <th className="py-2 pl-2 text-right font-semibold">{labels.inquiries}</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((row) => (
                    <tr key={row.businessId} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        <Link
                          href={withLocale(locale, `/business/${row.slug}`)}
                          className="font-semibold text-slate-900 hover:text-brand-800 hover:underline"
                        >
                          {pick(row.name, locale)}
                        </Link>
                        {!row.claimed ? (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            {locale === 'zh' ? '未認領' : 'Unclaimed'}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">{row.callClicks}</td>
                      <td className="px-2 py-2 text-right font-mono">{row.websiteClicks}</td>
                      <td className="px-2 py-2 text-right font-mono">{row.directionsClicks}</td>
                      <td className="py-2 pl-2 text-right font-mono">{row.inquiries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-900">{locale === 'zh' ? '最近的詢價' : 'Recent inquiries'}</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {inquiries.length}
            </span>
          </div>
          {inquiries.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              {locale === 'zh' ? '還沒有詢價。' : 'No inquiries yet.'}
            </p>
          ) : (
            <div className="max-h-[36rem] overflow-y-auto pr-1">
              <InquiryList inquiries={inquiries} locale={locale} showBusiness showDelivery />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
