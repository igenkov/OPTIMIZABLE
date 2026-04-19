import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Sets the authenticated user's subscription_tier to 'beta' and records
// the cohort join timestamp. Called from the /convert page during beta period.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase
      .from('users')
      .update({
        subscription_tier: 'beta',
        beta_cohort_joined_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
