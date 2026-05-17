import 'server-only';

import { notFound, redirect } from 'next/navigation';

import { buildAuthPath } from '@/lib/auth';
import { getServerUserFromCookies } from '@/lib/server-auth';
import {
  getOrCreateShopContextForUser,
  type ShopContext,
} from '@/lib/shop-service';
import type { Locale } from '@/lib/types';

export async function getOptionalShopContext(): Promise<ShopContext | null> {
  const user = await getServerUserFromCookies();
  if (!user) {
    return null;
  }

  return getOrCreateShopContextForUser(user);
}

export async function requireShopPageContext(
  locale: Locale,
  nextPath: string
): Promise<ShopContext> {
  const user = await getServerUserFromCookies();
  if (!user) {
    redirect(buildAuthPath(locale, nextPath));
  }

  const context = await getOrCreateShopContextForUser(user);
  if (!context) {
    redirect(buildAuthPath(locale, nextPath));
  }

  return context;
}

export function requireShopAdminContext(context: ShopContext) {
  if (!['moderator', 'admin'].includes(context.role)) {
    notFound();
  }

  return context;
}
