import 'server-only';

import Stripe from 'stripe';

let stripeClient: Stripe | null | undefined;
export const STRIPE_API_VERSION = '2026-03-25.dahlia';

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured()) {
    return null;
  }

  if (stripeClient !== undefined) {
    return stripeClient;
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: STRIPE_API_VERSION,
  });
  return stripeClient;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
