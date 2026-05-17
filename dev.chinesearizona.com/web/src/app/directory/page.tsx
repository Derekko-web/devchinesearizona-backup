import { permanentRedirect } from 'next/navigation';

import { appendSearch } from '@/lib/routing';

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function buildSearchString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length > 0) {
      search.set(key, value);
    }
  }

  return search.toString();
}

export default async function Page({ searchParams }: PageProps) {
  permanentRedirect(appendSearch('/business', buildSearchString(await searchParams)));
}
