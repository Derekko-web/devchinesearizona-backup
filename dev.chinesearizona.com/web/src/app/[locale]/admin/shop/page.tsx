import { notFound } from 'next/navigation';

import { isLocale } from '@/lib/i18n';
import { requireStaffPageContext } from '@/lib/page-auth';
import { requireShopAdminContext, requireShopPageContext } from '@/lib/shop-page-auth';
import { shopAdminMetadata } from '@/lib/shop-metadata';
import { withLocale } from '@/lib/routing';
import { getShopAdminPageDataForContext } from '@/lib/shop-service';
import { ShopAdminPageView } from '@/views/shop-pages';
import type { Locale } from '@/lib/types';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return isLocale(locale) ? shopAdminMetadata(locale) : {};
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  await requireStaffPageContext();
  const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/admin/shop'));
  requireShopAdminContext(context);
  const data = await getShopAdminPageDataForContext();
  return await ShopAdminPageView({ locale: typedLocale, data });
}
