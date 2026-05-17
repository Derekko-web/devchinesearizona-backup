import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { MissionControlConvexProvider } from '@/components/mission-control/ConvexClientProvider';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function MissionControlLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MissionControlConvexProvider>{children}</MissionControlConvexProvider>;
}
