import { permanentRedirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    city: string;
    category: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { city, category } = await params;
  permanentRedirect(`/business/${city}/${category}`);
}
