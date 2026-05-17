import { homeMetadata } from '@/lib/page-metadata';
import { HomePageView } from '@/views/home-page';

export async function generateMetadata() {
  return homeMetadata('en');
}

export default function Page() {
  return <HomePageView locale="en" />;
}
