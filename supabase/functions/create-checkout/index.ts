import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as { plan?: string };
    const plan = body.plan;
    if (plan !== 'explorer' && plan !== 'lifetime') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer (keyed by email)
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Ephemeral key for PaymentSheet saved-card support
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' },
    );

    let paymentIntentClientSecret: string;

    if (plan === 'lifetime') {
      const pi = await stripe.paymentIntents.create({
        amount: 2900, // $29.00
        currency: 'usd',
        customer: customerId,
        metadata: { user_id: user.id, plan: 'lifetime' },
        automatic_payment_methods: { enabled: true },
      });
      paymentIntentClientSecret = pi.client_secret!;
    } else {
      // explorer subscription — $1.99/mo
      const priceId = Deno.env.get('STRIPE_EXPLORER_PRICE_ID') ?? '';
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { user_id: user.id },
        expand: ['latest_invoice.payment_intent'],
      });
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const pi = invoice.payment_intent as Stripe.PaymentIntent;
      paymentIntentClientSecret = pi.client_secret!;
    }

    return new Response(
      JSON.stringify({ paymentIntentClientSecret, customerId, ephemeralKeySecret: ephemeralKey.secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-checkout error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
