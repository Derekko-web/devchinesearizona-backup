import { notFound } from 'next/navigation';

import { isLocale } from '@/lib/i18n';
import { requireShopPageContext } from '@/lib/shop-page-auth';
import { shopDashboardSectionMetadata } from '@/lib/shop-metadata';
import { withLocale } from '@/lib/routing';
import { getShopDashboardDataForContext } from '@/lib/shop-service';
import {
  ShopDashboardListingsPageView,
  ShopDashboardOffersPageView,
  ShopDashboardOrdersPageView,
  ShopDashboardPayoutsPageView,
} from '@/views/shop-pages';
import type { Locale } from '@/lib/types';

type PageProps = {
  params: Promise<{
    locale: string;
    section: string;
  }>;
};

const validSections = ['listings', 'orders', 'offers', 'payouts'] as const;
type ShopDashboardSection = (typeof validSections)[number];

function isShopDashboardSection(value: string): value is ShopDashboardSection {
  return validSections.includes(value as ShopDashboardSection);
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isShopDashboardSection(section)) {
    return {};
  }

  return shopDashboardSectionMetadata(locale, section);
}

export default async function Page({ params }: PageProps) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isShopDashboardSection(section)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, `/dashboard/shop/${section}`));
  const data = await getShopDashboardDataForContext(context);
  if (!data) {
    notFound();
  }

  if (section === 'listings') {
    return <ShopDashboardListingsPageView locale={typedLocale} data={data} />;
  }

  if (section === 'orders') {
    return <ShopDashboardOrdersPageView locale={typedLocale} data={data} />;
  }

  if (section === 'offers') {
    return <ShopDashboardOffersPageView locale={typedLocale} data={data} />;
  }

  return <ShopDashboardPayoutsPageView locale={typedLocale} data={data} />;
}
