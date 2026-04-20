import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook — no user session available
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        await supabase.from('users').update({
          subscription_tier: 'premium',
          subscription_status: 'active',
          stripe_subscription_id: session.subscription as string,
        }).eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      // Find user by stripe_customer_id and downgrade
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      if (user) {
        await supabase.from('users').update({
          subscription_tier: 'free',
          subscription_status: 'expired',
          stripe_subscription_id: null,
        }).eq('id', user.id);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      if (user) {
        const active = subscription.status === 'active' || subscription.status === 'trialing';
        await supabase.from('users').update({
          subscription_tier: active ? 'premium' : 'free',
          subscription_status: active ? 'active' : 'expired',
        }).eq('id', user.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
