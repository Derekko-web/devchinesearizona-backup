import Link from 'next/link';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';

import { countActiveDirectoryFilters } from '@/lib/directory';
import { withLocale } from '@/lib/routing';
import type { BusinessCategory, Locale, SortOption } from '@/lib/types';

type DirectoryFiltersProps = {
  locale: Locale;
  categories: BusinessCategory[];
  cities: string[];
  values: {
    q?: string;
    city?: string;
    category?: string;
    minRating?: number;
    sort?: SortOption;
  };
};

type SelectFieldProps = {
  id: string;
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
};

function SelectField({ id, label, name, defaultValue, children }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-12 text-sm leading-5 text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

export function DirectoryFilters({
  locale,
  categories,
  cities,
  values,
}: DirectoryFiltersProps) {
  const resetHref = withLocale(locale, '/directory');
  const hasActiveFilters = countActiveDirectoryFilters(values) > 0;
  const distanceNeedsCity = values.sort === 'distance' && !values.city;

  return (
    <form
      action={resetHref}
      method="get"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label htmlFor="q" className="mb-2 block text-sm font-semibold text-slate-800">
          {locale === 'zh' ? '搜尋關鍵字' : 'Search'}
        </label>
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            id="q"
            name="q"
            defaultValue={values.q}
            placeholder={locale === 'zh' ? '例如：房仲、牛肉麵、醫師' : 'realtor, doctor, beef noodle...'}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="city"
          name="city"
          label={locale === 'zh' ? '城市' : 'City'}
          defaultValue={values.city ?? ''}
        >
          <option value="">{locale === 'zh' ? '不限城市' : 'Any city'}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="category"
          name="category"
          label={locale === 'zh' ? '分類' : 'Category'}
          defaultValue={values.category ?? ''}
        >
          <option value="">{locale === 'zh' ? '不限分類' : 'Any category'}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name[locale]}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="minRating"
          name="minRating"
          label={locale === 'zh' ? '最低評分' : 'Minimum rating'}
          defaultValue={values.minRating ? String(values.minRating) : ''}
        >
          <option value="">{locale === 'zh' ? '不限評分' : 'Any rating'}</option>
          <option value="4">4.0+</option>
          <option value="4.5">4.5+</option>
        </SelectField>

        <div className="space-y-2">
          <SelectField
            id="sort"
            name="sort"
            label={locale === 'zh' ? '排序' : 'Sort'}
            defaultValue={values.sort ?? 'featured'}
          >
            <option value="featured">{locale === 'zh' ? '精選優先' : 'Featured'}</option>
            <option value="rating">{locale === 'zh' ? '評分最高' : 'Highest rated'}</option>
            <option value="reviewed">{locale === 'zh' ? '評論最多' : 'Most reviewed'}</option>
            <option value="alphabetical">{locale === 'zh' ? '依字母排序' : 'A-Z'}</option>
            <option value="distance" disabled={!values.city}>
              {locale === 'zh'
                ? values.city
                  ? '距離最近'
                  : '距離最近（先選城市）'
                : values.city
                  ? 'Nearest first'
                  : 'Nearest first (choose city)'}
            </option>
            <option value="newest">{locale === 'zh' ? '最近更新' : 'Newest'}</option>
          </SelectField>
          {distanceNeedsCity ? (
            <p className="text-xs text-amber-700">
              {locale === 'zh'
                ? '距離排序需要先選城市，系統才知道要以哪個地區為基準。'
                : 'Distance sorting works once a city is selected, so we know which area to measure from.'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex min-w-0 flex-1 items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          {locale === 'zh' ? '套用篩選' : 'Apply filters'}
        </button>
        <Link
          href={resetHref}
          className={[
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
            hasActiveFilters
              ? 'border-brand-200 bg-brand-50 text-brand-900 hover:border-brand-300 hover:bg-brand-100'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {locale === 'zh' ? '清除篩選' : 'Clear filters'}
        </Link>
      </div>
    </form>
  );
}
