import { hiddenArizonaMetadata } from '@/lib/page-metadata';
import { HiddenArizonaHubPageView } from '@/views/hidden-arizona';

export const metadata = hiddenArizonaMetadata('en');

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
  return <HiddenArizonaHubPageView locale="en" searchParams={await searchParams} />;
}
