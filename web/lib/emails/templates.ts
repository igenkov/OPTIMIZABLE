/**
 * Email nurture templates.
 *
 * Each template returns { subject, html } for use with Resend.
 * Templates use inline styles for email-client compatibility.
 */

const BRAND = '#C8A2C8';
const BG = '#0e0e0e';
const TEXT = '#cccccc';
const MUTED = '#666666';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="margin-bottom:32px;">
    <span style="color:white;font-weight:800;font-size:18px;letter-spacing:0.15em;text-transform:uppercase;">OPTIMIZABLE</span>
  </div>
  ${content}
  <div style="margin-top:48px;padding-top:24px;border-top:1px solid #222;">
    <p style="color:${MUTED};font-size:11px;line-height:1.5;">
      You are receiving this because you signed up at optimizable.app.<br>
      <a href="{{unsubscribe_url}}" style="color:${BRAND};text-decoration:none;">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 28px;background:${BRAND};color:#000;font-weight:800;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;margin-top:8px;">${text}</a>`;
}

export function welcomeEmail(appUrl: string) {
  return {
    subject: 'Your optimization sequence has started',
    html: layout(`
      <h1 style="color:white;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 12px;">Welcome to OPTIMIZABLE</h1>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 24px;">
        Your daily tracking is now active. Each day, log your energy, mood, sleep, and other vitals to build your baseline. By the time your bloodwork arrives, your data will tell a story.
      </p>
      <p style="color:${MUTED};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">First step</p>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 24px;">
        Complete today's wellbeing check-in. It takes under 60 seconds.
      </p>
      ${button('Log Today\'s Check-In', `${appUrl}/wellbeing`)}
    `),
  };
}

export function checkinReminderEmail(appUrl: string, dayNumber: number) {
  const messages: Record<number, { subject: string; body: string }> = {
    3: {
      subject: 'Day 3 - Your baseline is forming',
      body: 'Three days of data is enough to start seeing patterns. Keep the streak going - consistency is what makes your protocol accurate.',
    },
    7: {
      subject: 'Day 7 - One week of tracking complete',
      body: 'A full week of data gives us a meaningful baseline for energy, mood, and recovery patterns. When your bloodwork arrives, we will overlay these subjective signals with objective biomarkers.',
    },
    12: {
      subject: 'Day 12 - Your data is building momentum',
      body: 'Twelve days of consistent tracking creates a reliable baseline. If you have not scheduled your bloodwork yet, now is a good time. Your subjective data is waiting for the objective confirmation.',
    },
  };

  const msg = messages[dayNumber] ?? {
    subject: `Day ${dayNumber} - Keep tracking`,
    body: 'Your daily check-in keeps your optimization data current. Log today\'s metrics to maintain your streak.',
  };

  return {
    subject: msg.subject,
    html: layout(`
      <h1 style="color:white;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 12px;">${msg.subject}</h1>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 24px;">${msg.body}</p>
      ${button('Log Today\'s Check-In', `${appUrl}/wellbeing`)}
    `),
  };
}

export function endOfBetaEmail(appUrl: string, discountCode: string, discountPercent: number) {
  return {
    subject: `Beta is ending - your ${discountPercent}% lifetime discount is inside`,
    html: layout(`
      <h1 style="color:white;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 12px;">You Got In Early.</h1>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 16px;">
        OPTIMIZABLE's free beta period is ending. As an early access member, you helped shape the product - and that deserves more than a thank you.
      </p>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 24px;">
        Use the code below to lock in a <strong style="color:white;">${discountPercent}% lifetime discount</strong> before your grace period expires. This rate never changes, no matter what LAB costs at launch.
      </p>
      <div style="padding:20px 24px;background:#1a1a1a;border:1px solid #333;margin-bottom:24px;text-align:center;">
        <p style="color:${MUTED};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 8px;">Your Lifetime Discount Code</p>
        <p style="color:${BRAND};font-size:22px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;margin:0;">${discountCode}</p>
      </div>
      <p style="color:${MUTED};font-size:12px;line-height:1.6;margin:0 0 24px;">
        Apply this code at checkout. The discount is applied permanently to your subscription - no expiry, no conditions.
      </p>
      ${button('Subscribe With My Discount', `${appUrl}/upgrade`)}
      <p style="color:${MUTED};font-size:11px;line-height:1.5;margin-top:16px;">
        If you do not subscribe before your grace period ends, your access will transition to the free tier. Your risk score and assessment results remain available.
      </p>
    `),
  };
}

export function bloodworkNudgeEmail(appUrl: string) {
  return {
    subject: 'Your tracking data is ready for the next step',
    html: layout(`
      <h1 style="color:white;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 12px;">Time to Complete the Picture</h1>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 24px;">
        You have been tracking your wellbeing consistently. Your subjective data is solid - but your body is telling a deeper story in your blood.
      </p>
      <p style="color:${TEXT};font-size:14px;line-height:1.7;margin:0 0 24px;">
        Upload your lab results and we will generate a full hormonal analysis correlated with your tracking data. Your 90-day protocol starts the moment we have your bloodwork.
      </p>
      ${button('Upload Bloodwork', `${appUrl}/lab/upload`)}
    `),
  };
}
