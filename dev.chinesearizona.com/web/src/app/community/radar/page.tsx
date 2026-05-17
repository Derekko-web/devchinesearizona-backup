import { permanentRedirect } from 'next/navigation';

import { getArizonaNewsPath } from '@/lib/arizona-news';

type PageProps = {
  searchParams: Promise<{
    lane?: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: PageProps) {
  const { lane } = await searchParams;
  permanentRedirect(getArizonaNewsPath(lane ? `lane=${lane}` : undefined));
}
