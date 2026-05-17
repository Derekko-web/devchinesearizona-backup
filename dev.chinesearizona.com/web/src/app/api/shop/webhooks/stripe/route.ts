import { NextRequest, NextResponse } from 'next/server';

import { handleStripeWebhookRequest } from '@/lib/stripe-webhooks';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ message: 'Missing Stripe signature.' }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    const event = await handleStripeWebhookRequest(rawBody, signature);
    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to process Stripe webhook.',
      },
      { status: 400 }
    );
  }
}
