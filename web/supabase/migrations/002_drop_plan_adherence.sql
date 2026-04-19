-- Step 8j: Drop plan_adherence from daily_checkins
-- Safe to run after code no longer reads or writes this column

ALTER TABLE daily_checkins
  DROP COLUMN IF EXISTS plan_adherence;
