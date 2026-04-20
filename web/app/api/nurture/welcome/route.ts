import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getResend, EMAIL_FROM } from '@/lib/resend';
import { welcomeEmail } from '@/lib/emails/templates';

// Sends welcome email immediately after premium signup.
// Called from the client after account creation + checkout initiation.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if welcome already sent
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: existing } = await admin
      .from('email_nurture_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('email_type', 'welcome')
      .single();

    if (existing) {
      return NextResponse.json({ already_sent: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const email = welcomeEmail(appUrl);

    const { error: sendErr } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: email.subject,
      html: email.html,
    });

    if (sendErr) {
      return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    }

    await admin.from('email_nurture_log').insert({
      user_id: user.id,
      email_type: 'welcome',
    });

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
