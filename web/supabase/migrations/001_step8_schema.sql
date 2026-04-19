-- Step 8: Protocol flow overhaul + Two-tracker model
-- Issues 11 + 12 schema additions

-- 1. Add phase_type to bloodwork_panels
ALTER TABLE bloodwork_panels
  ADD COLUMN IF NOT EXISTS phase_type TEXT CHECK (phase_type IN ('initial', 'final'));

-- Backfill: first panel per cycle = 'initial', rest = 'final'
UPDATE bloodwork_panels bp
SET phase_type = CASE
  WHEN bp.panel_number = (
    SELECT MIN(bp2.panel_number)
    FROM bloodwork_panels bp2
    WHERE bp2.cycle_id = bp.cycle_id
  ) THEN 'initial'
  ELSE 'final'
END
WHERE bp.phase_type IS NULL;

-- 2. Add phase to protocol_reports
ALTER TABLE protocol_reports
  ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN ('foundation', 'calibration'));

-- Backfill: first report per user = 'foundation', second = 'calibration'
UPDATE protocol_reports pr
SET phase = CASE
  WHEN pr.created_at = (
    SELECT MIN(pr2.created_at)
    FROM protocol_reports pr2
    WHERE pr2.user_id = pr.user_id
  ) THEN 'foundation'
  ELSE 'calibration'
END
WHERE pr.phase IS NULL;

-- 3. Add comparison_snapshot and completed_at to optimization_cycles
ALTER TABLE optimization_cycles
  ADD COLUMN IF NOT EXISTS comparison_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- status already allows 'active'; ensure 'complete' is valid
-- (text column with no enum constraint in Supabase by default)

-- 4. New table: protocol_adherence
CREATE TABLE IF NOT EXISTS protocol_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES optimization_cycles(id) ON DELETE CASCADE,
  protocol_report_id UUID NOT NULL REFERENCES protocol_reports(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  adherence TEXT NOT NULL CHECK (adherence IN ('fully', 'mostly', 'partially', 'not_today')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- RLS
ALTER TABLE protocol_adherence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own adherence" ON protocol_adherence
  FOR ALL USING (auth.uid() = user_id);

-- 5. New table: cycle_inquiries (45-day inquiry responses)
CREATE TABLE IF NOT EXISTS cycle_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES optimization_cycles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  symptom_reassessment JSONB,
  supplement_adherence JSONB,
  directive_adherence JSONB,
  subjective_scores JSONB,
  new_symptoms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cycle_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own inquiries" ON cycle_inquiries
  FOR ALL USING (auth.uid() = user_id);
