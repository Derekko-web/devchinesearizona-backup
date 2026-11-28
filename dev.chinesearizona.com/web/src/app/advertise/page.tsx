import { hasOnlineCheckout } from '@/lib/advertise';
import { getFoundingSpotsLeft } from '@/lib/listing-plans';
import { advertiseMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { AdvertisePageView } from '@/views/advertise-page';

type PageProps = {
  searchParams: Promise<{
    plan?: string;
  }>;
};

export async function generateMetadata() {
  const site = await getCurrentSiteProfile();
  return advertiseMetadata('en', site);
}

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  const foundingSpotsLeft = hasOnlineCheckout(site) ? await getFoundingSpotsLeft() : undefined;
  return (
    <AdvertisePageView
      locale="en"
      site={site}
      searchParams={await searchParams}
      foundingSpotsLeft={foundingSpotsLeft}
    />
  );
}
