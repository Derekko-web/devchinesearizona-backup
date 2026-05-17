import { handleDirectoryAdStripeEvent } from '@/lib/directory-ads';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe';
import { handleShopStripeEvent } from '@/lib/shop-payments';

export async function handleStripeWebhookRequest(rawBody: string, signature: string) {
  const stripe = getStripeClient();
  const secret = getStripeWebhookSecret();

  if (!stripe || !secret) {
    throw new Error('Stripe webhook verification is not configured.');
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  await handleShopStripeEvent(event);
  await handleDirectoryAdStripeEvent(event);

  return event;
}
