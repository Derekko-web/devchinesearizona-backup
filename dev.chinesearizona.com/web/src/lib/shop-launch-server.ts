import 'server-only';

import { isShopPublicLaunchEnabled, isShopRuntimeFallbackAllowed } from '@/lib/shop-launch';
import { getStripeWebhookSecret, isStripeConfigured } from '@/lib/stripe';
import { isSupabaseConfigured, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

export function isShopPublicLaunchReady(): boolean {
  if (isShopRuntimeFallbackAllowed()) {
    return true;
  }

  return (
    isShopPublicLaunchEnabled() &&
    isSupabaseConfigured() &&
    isSupabaseServiceConfigured() &&
    isStripeConfigured() &&
    Boolean(getStripeWebhookSecret())
  );
}

export function getShopLaunchDisabledMessage(locale: Locale): string {
  return locale === 'zh'
    ? '市集尚未正式上線，目前不對外開放。'
    : 'Shop is not live yet and is currently unavailable to the public.';
}
