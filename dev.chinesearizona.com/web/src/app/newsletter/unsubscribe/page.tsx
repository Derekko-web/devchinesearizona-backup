import type { Metadata } from 'next';

import { NewsletterUnsubscribeView } from '@/views/newsletter-unsubscribe-page';

type PageProps = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export const metadata: Metadata = {
  title: 'Unsubscribe | 取消訂閱',
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: PageProps) {
  const { token, status } = await searchParams;
  return <NewsletterUnsubscribeView token={token} status={status} />;
}
