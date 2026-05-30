import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
import { hiddenArizonaMetadata } from '@/lib/page-metadata';
import { HiddenArizonaHubPageView } from '@/views/hidden-arizona';

export async function generateMetadata() {
  return arizonaOnlyMetadata('en', '/hidden-arizona', () => hiddenArizonaMetadata('en'), 'Hidden Arizona');
}

type PageProps = {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    city?: string;
    tag?: string;
    view?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await requireArizonaOnlySite();
  return await HiddenArizonaHubPageView({ locale: 'en', searchParams: await searchParams });
}
