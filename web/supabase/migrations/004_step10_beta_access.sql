-- Step 10: Beta early access
-- Adds beta_cohort_joined_at timestamp to users table.
-- subscription_tier already allows arbitrary TEXT, so 'beta' is a valid value
-- with no DDL change required for that column.

ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_cohort_joined_at TIMESTAMPTZ;
