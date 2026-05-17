import { GoogleAuthStartClient } from '@/components/auth/GoogleAuthStartClient';
import { authMetadata } from '@/lib/page-metadata';

type PageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export const dynamic = 'force-dynamic';
export const metadata = authMetadata('en');

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return <GoogleAuthStartClient locale="en" initialNext={next} />;
}
