import type { AdvertiseInquirySummary } from '@/lib/advertise-inquiries';
import type { Locale } from '@/lib/types';

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Phoenix',
  }).format(new Date(value));
}

// Advertising inquiries from /advertise on every site (#474). Until email is
// set up, this list is the only place they show up, so check it daily.
export function AdminAdvertiseInquiriesPanel({
  inquiries,
  locale,
}: {
  inquiries: AdvertiseInquirySummary[];
  locale: Locale;
}) {
  const zh = locale === 'zh';

  return (
    <section id="admin-advertise-inquiries" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">{zh ? '廣告合作詢問' : 'Advertising inquiries'}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {zh
            ? '來自各網站「廣告合作」頁的表單。我們向商家承諾一個工作天內回覆。尚未設定 Email 通知時，新詢問只會出現在這裡。'
            : 'From the "Talk to us" form on each site’s /advertise page. We promise businesses a reply within one business day. Until email is set up, new inquiries only show up here.'}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {inquiries.length === 0 ? (
          <p className="text-sm text-slate-500">{zh ? '目前還沒有廣告詢問。' : 'No advertising inquiries yet.'}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="space-y-1.5 py-4 first:pt-0 last:pb-0" data-testid="admin-advertise-inquiry">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {inquiry.businessName}
                    <span className="ml-2 text-sm font-normal text-slate-500">{inquiry.name}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(inquiry.createdAt, locale)} · {inquiry.siteName}
                  </p>
                </div>
                <p className="break-words text-sm text-slate-800">
                  <span className="text-slate-500">{zh ? '聯絡方式：' : 'Reach them at: '}</span>
                  {inquiry.contact}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="text-slate-500">{zh ? '方案：' : 'Plan: '}</span>
                  {inquiry.planName ?? (zh ? '尚未決定' : 'Not sure yet')}
                  <span className="text-slate-400"> · {inquiry.locale === 'zh' ? '中文' : 'English'}</span>
                </p>
                {inquiry.message ? (
                  <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-700">{inquiry.message}</p>
                ) : null}
                <p className="text-xs text-slate-400">
                  {inquiry.notifiedAt
                    ? zh
                      ? '已寄 Email 通知'
                      : 'Emailed to the admin'
                    : zh
                      ? '未寄 Email 通知（Email 尚未設定）'
                      : 'Not emailed (email is off)'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
