import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook error: ${String(err)}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await downgradeUser(subscription.metadata.user_id);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata.plan === 'lifetime') {
          await upgradeToLifetime(paymentIntent.metadata.user_id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  if (!userId) return;

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

  await supabase
    .from('profiles')
    .update({
      plan: isActive ? 'explorer' : 'free',
      plan_expires_at: isActive ? expiresAt : null,
    })
    .eq('id', userId);
}

async function upgradeToLifetime(userId: string) {
  if (!userId) return;
  await supabase
    .from('profiles')
    .update({ plan: 'lifetime', plan_expires_at: null })
    .eq('id', userId);
}

async function downgradeUser(userId: string) {
  if (!userId) return;
  await supabase
    .from('profiles')
    .update({ plan: 'free', plan_expires_at: null })
    .eq('id', userId);
}
