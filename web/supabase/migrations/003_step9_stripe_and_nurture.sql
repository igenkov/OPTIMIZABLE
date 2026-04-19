-- Step 9: Stripe integration + email nurture columns
-- Adds payment-related fields to users and email nurture tracking

-- Stripe identifiers on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

-- Email nurture tracking: when each nurture email was sent
CREATE TABLE IF NOT EXISTS email_nurture_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,  -- 'welcome', 'checkin_day3', 'checkin_day7', 'checkin_day12', 'marker_edu_1', etc.
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, email_type)
);

ALTER TABLE email_nurture_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nurture log"
  ON email_nurture_log FOR SELECT
  USING (auth.uid() = user_id);

-- Index for cron queries: find users who need their next nurture email
CREATE INDEX IF NOT EXISTS idx_nurture_user_type ON email_nurture_log(user_id, email_type);
