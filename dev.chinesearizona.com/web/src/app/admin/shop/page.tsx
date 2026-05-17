import { requireStaffPageContext } from '@/lib/page-auth';
import { requireShopAdminContext, requireShopPageContext } from '@/lib/shop-page-auth';
import { shopAdminMetadata } from '@/lib/shop-metadata';
import { getShopAdminPageDataForContext } from '@/lib/shop-service';
import { ShopAdminPageView } from '@/views/shop-pages';

export const metadata = shopAdminMetadata('en');
export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireStaffPageContext();
  const context = await requireShopPageContext('en', '/admin/shop');
  requireShopAdminContext(context);
  const data = await getShopAdminPageDataForContext();
  return await ShopAdminPageView({ locale: 'en', data });
}
