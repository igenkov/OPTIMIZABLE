// ─── Auth & User ───────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'premium' | 'expert';
  subscription_status: 'active' | 'expired' | 'trial';
  created_at: string;
}

// ─── Onboarding Phases ─────────────────────────────────────────────────────
export interface Phase1Data {
  age: number;
  height_cm: number;
  weight_kg: number;
  body_fat_percent?: number;
  medical_conditions: string[];
  unit_preference: 'metric' | 'imperial';
}

export interface Phase2Data {
  avg_sleep_hours: number;
  sleep_quality: 1 | 2 | 3 | 4 | 5;
  smoking_status: 'never' | 'former' | 'occasional' | 'daily';
  cigarettes_per_day?: number;
  alcohol_frequency: 'never' | 'rarely' | 'moderate' | 'frequent' | 'daily';
  drinks_per_session?: number;
  coffee_per_day: 'none' | '1' | '2-3' | '4-5' | '6+';
  sugar_consumption: 'rarely' | 'moderate' | 'frequent' | 'very_high';
  exercise_frequency: 'none' | '1-2x' | '3-4x' | '5-6x' | 'daily';
  exercise_types: string[];
  sedentary_hours: number;
  sexual_frequency: 'rarely' | '1-2x_month' | '1-2x_week' | '3-4x_week' | 'daily';
  libido_rating: number;
  erectile_rating?: number;
}

export interface Phase3Data {
  taking_medications: boolean;
  medications: string[];
  taking_supplements: boolean;
  supplements: string[];
  steroid_history: 'never' | 'past' | 'current';
  steroid_stopped_ago?: string;
  steroid_pct?: boolean;
  trt_history: 'never' | 'past' | 'current';
  trt_type?: string;
  previous_bloodwork: boolean;
  known_total_t?: number;
  known_total_t_unit?: 'ng/dL' | 'nmol/L';
}

export interface SymptomAssessment {
  id: string;
  user_id: string;
  symptoms_selected: string[];
  symptom_count: number;
  weighted_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'very_high';
  created_at: string;
}

// ─── Bloodwork ─────────────────────────────────────────────────────────────
export interface BloodworkValue {
  marker: string;
  value: number;
  unit: string;
}

export interface BloodworkPanel {
  id: string;
  user_id: string;
  panel_number: number;
  cycle_id?: string;
  upload_type: 'photo' | 'pdf' | 'manual';
  file_url?: string;
  values: Record<string, BloodworkValue>;
  collection_date: string;
  lab_name?: string;
  created_at: string;
}

export type MarkerStatus = 'optimal' | 'suboptimal' | 'attention';

export interface MarkerAnalysis {
  marker: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  explanation: string;
  standard_range: { low: number; high: number };
  optimal_range: { low: number; high: number };
}

export interface KeyRatio {
  name: string;
  value: number;
  interpretation: string;
  status: MarkerStatus;
}

export interface AnalysisReport {
  id: string;
  user_id: string;
  bloodwork_panel_id: string;
  comparison_panel_id?: string;
  health_score: number;
  marker_analysis: MarkerAnalysis[];
  key_ratios: KeyRatio[];
  report_summary: string;
  concerns: { marker: string; severity: 'low' | 'medium' | 'high'; explanation: string }[];
  recommendations: OptimizationPlan;
  medical_referral_needed: boolean;
  medical_referral_reason?: string;
  created_at: string;
}

// ─── Optimization Plan ─────────────────────────────────────────────────────
export interface OptimizationPlan {
  eating: string[];
  exercise: string[];
  supplements: SupplementRecommendation[];
  sleep: string[];
  stress: string[];
  habits: string[];
}

export interface SupplementRecommendation {
  name: string;
  dose: string;
  timing: string;
  reason: string;
}

// ─── Daily Check-in ────────────────────────────────────────────────────────
export interface DailyCheckin {
  id: string;
  user_id: string;
  cycle_id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  sleep_quality: 1 | 2 | 3 | 4 | 5;
  sleep_hours: number;
  libido: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  exercised: boolean;
  exercise_type?: string;
  plan_adherence: 'fully' | 'mostly' | 'partially' | 'not_today';
  notes?: string;
  created_at: string;
}

// ─── Optimization Cycle ────────────────────────────────────────────────────
export interface OptimizationCycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'paused';
  current_day: number;
}

// ─── Biomarker Reference ───────────────────────────────────────────────────
export interface BiomarkerReference {
  id: string;
  name: string;
  short_name: string;
  unit_primary: string;
  unit_secondary?: string;
  conversion_factor?: number;
  standard_range_low: number;
  standard_range_high: number;
  optimal_range_low: number;
  optimal_range_high: number;
  age_adjusted: boolean;
  description: string;
  high_explanation: string;
  low_explanation: string;
  category: 'hormones' | 'metabolic' | 'thyroid' | 'other';
}

// ─── Symptom Definition ────────────────────────────────────────────────────
export interface SymptomDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  correlation_weight: number;
  related_biomarkers: string[];
}
