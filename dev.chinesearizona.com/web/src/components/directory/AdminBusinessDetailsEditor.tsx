'use client';

import { useState } from 'react';

import { BusinessBilingualDetailsEditor } from '@/components/directory/BusinessBilingualDetailsEditor';
import type { BusinessBilingualDetails } from '@/lib/business-bilingual';
import type { Locale } from '@/lib/types';

export type AdminDetailsListing = {
  slug: string;
  name: string;
  categorySlug: string;
  city: string;
  details: BusinessBilingualDetails;
};

// Lets an admin fill in bilingual details for any listing (issue #411),
// including unclaimed ones that have no owner to do it.
export function AdminBusinessDetailsEditor({
  listings,
  locale,
}: {
  listings: AdminDetailsListing[];
  locale: Locale;
}) {
  const zh = locale === 'zh';
  const [slug, setSlug] = useState('');
  const selected = listings.find((listing) => listing.slug === slug);

  return (
    <section id="admin-listing-details" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">{zh ? '商家雙語資訊' : 'Listing bilingual details'}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {zh
            ? '為任何商家填寫語言、微信號、微信支付／支付寶與中文菜單或表格。只填寫已確認的資訊。'
            : 'Fill in languages, WeChat ID, WeChat Pay / Alipay and Chinese menus or forms for any listing. Only enter details you have confirmed.'}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="admin-details-listing" className="text-sm font-semibold text-slate-800">
          {zh ? '選擇商家' : 'Choose a listing'}
        </label>
        <select
          id="admin-details-listing"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className="mt-2 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
        >
          <option value="">{zh ? '— 選擇 —' : '— Choose —'}</option>
          {listings.map((listing) => (
            <option key={listing.slug} value={listing.slug}>
              {listing.name} · {listing.city}
            </option>
          ))}
        </select>

        {selected ? (
          <div className="mt-5">
            <BusinessBilingualDetailsEditor
              key={selected.slug}
              businessSlug={selected.slug}
              categorySlug={selected.categorySlug}
              heading={selected.name}
              initialDetails={selected.details}
              locale={locale}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
