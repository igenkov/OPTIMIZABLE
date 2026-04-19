import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend, EMAIL_FROM } from '@/lib/resend';
import {
  welcomeEmail,
  checkinReminderEmail,
  bloodworkNudgeEmail,
} from '@/lib/emails/templates';

// Cron-triggered nurture email dispatcher.
// Protected by a shared secret so only the cron service can call it.
// Schedule: once daily (e.g. Vercel Cron at 09:00 UTC).

const NURTURE_SCHEDULE = [
  { day: 0, type: 'welcome' },
  { day: 3, type: 'checkin_day3' },
  { day: 7, type: 'checkin_day7' },
  { day: 12, type: 'checkin_day12' },
  { day: 21, type: 'bloodwork_nudge' },
] as const;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const now = new Date();
  let sent = 0;

  // Fetch all users with their signup date
  const { data: users, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, created_at')
    .in('subscription_tier', ['premium', 'expert', 'beta']);

  if (fetchErr || !users) {
    return NextResponse.json({ error: fetchErr?.message ?? 'No users found' }, { status: 500 });
  }

  for (const user of users) {
    const signupDate = new Date(user.created_at);
    const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

    for (const step of NURTURE_SCHEDULE) {
      if (daysSinceSignup !== step.day) continue;

      // Check if already sent
      const { data: existing } = await supabase
        .from('email_nurture_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_type', step.type)
        .single();

      if (existing) continue;

      // Build email
      let email: { subject: string; html: string };
      switch (step.type) {
        case 'welcome':
          email = welcomeEmail(appUrl);
          break;
        case 'checkin_day3':
          email = checkinReminderEmail(appUrl, 3);
          break;
        case 'checkin_day7':
          email = checkinReminderEmail(appUrl, 7);
          break;
        case 'checkin_day12':
          email = checkinReminderEmail(appUrl, 12);
          break;
        case 'bloodwork_nudge':
          email = bloodworkNudgeEmail(appUrl);
          break;
      }

      // Send
      const { error: sendErr } = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: email.subject,
        html: email.html,
      });

      if (!sendErr) {
        await supabase.from('email_nurture_log').insert({
          user_id: user.id,
          email_type: step.type,
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ sent });
}
