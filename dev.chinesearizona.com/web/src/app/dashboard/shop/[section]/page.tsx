import { notFound } from 'next/navigation';

import { requireShopPageContext } from '@/lib/shop-page-auth';
import { shopDashboardSectionMetadata } from '@/lib/shop-metadata';
import { getShopDashboardDataForContext } from '@/lib/shop-service';
import {
  ShopDashboardListingsPageView,
  ShopDashboardOffersPageView,
  ShopDashboardOrdersPageView,
  ShopDashboardPayoutsPageView,
} from '@/views/shop-pages';

type PageProps = {
  params: Promise<{
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
  const { section } = await params;
  return isShopDashboardSection(section) ? shopDashboardSectionMetadata('en', section) : {};
}

export default async function Page({ params }: PageProps) {
  const { section } = await params;
  if (!isShopDashboardSection(section)) {
    notFound();
  }
  const context = await requireShopPageContext('en', `/dashboard/shop/${section}`);
  const data = await getShopDashboardDataForContext(context);
  if (!data) {
    notFound();
  }

  if (section === 'listings') {
    return <ShopDashboardListingsPageView locale="en" data={data} />;
  }

  if (section === 'orders') {
    return <ShopDashboardOrdersPageView locale="en" data={data} />;
  }

  if (section === 'offers') {
    return <ShopDashboardOffersPageView locale="en" data={data} />;
  }

  return <ShopDashboardPayoutsPageView locale="en" data={data} />;
}
