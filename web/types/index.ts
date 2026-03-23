export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'premium' | 'expert';
  subscription_status: 'active' | 'expired' | 'trial';
  created_at: string;
}

export interface Phase1Data {
  age: number;
  height_cm: number;
  weight_kg: number;
  body_fat_percent?: number;
  body_type_level?: number;
  high_muscle_override?: boolean;
  medical_conditions: string[];
  unit_preference: 'metric' | 'imperial';
}

export interface Phase2Data {
  avg_sleep_hours: number;
  sleep_quality: number;
  smoking_status: string;
  beer_frequency: string;
  spirits_wine_frequency: string;
  coffee_per_day: string;
  sugar_consumption: string;
  keto_diet: boolean;
  exercise_frequency: string;
  exercise_types: string[];
  sedentary_hours: number;
  stress_level: number;
  morning_erection_frequency: string;
  libido_rating: number;
  erectile_rating?: number;
}

export interface Phase3Data {
  taking_medications: boolean;
  medication_categories: string[];
  medications: string[];
  taking_supplements: boolean;
  supplement_categories: string[];
  supplements: string[];
  steroid_history: 'never' | 'past' | 'current';
  steroid_stopped_ago?: 'lt_6mo' | '6_12mo' | '1_3yr' | '3_5yr' | '5plus_yr';
  steroid_cycle_count?: '1' | '2_3' | '4_10' | '10plus';
  steroid_pct?: boolean;
  trt_history: 'never' | 'past' | 'current';
  trt_type?: string;
}

export interface SymptomAssessment {
  id: string;
  user_id: string;
  symptoms_selected: string[];
  symptom_count: number;
  weighted_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  created_at: string;
}

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
  upload_type: 'manual';
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

export interface ReportSummaryStructured {
  bottom_line: string;
  primary_driver: string;
  next_action: string;
}

export interface AnalysisReport {
  id: string;
  user_id: string;
  bloodwork_panel_id: string;
  health_score: number;
  marker_analysis: MarkerAnalysis[];
  key_ratios: KeyRatio[];
  report_summary: string | ReportSummaryStructured;
  concerns: { marker: string; severity: 'low' | 'medium' | 'high'; explanation: string }[];
  medical_referral_needed: boolean;
  medical_referral_reason?: string;
  created_at: string;
}

export interface ProtocolReport {
  id: string;
  user_id: string;
  analysis_report_id: string;
  supplements: SupplementRecommendation[];
  eating: string[];
  exercise: string[];
  sleep: string[];
  stress: string[];
  habits: string[];
  model_used?: string;
  created_at: string;
}

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

export interface DailyCheckin {
  id: string;
  user_id: string;
  cycle_id: string;
  date: string;
  mood: number;            // 1–10
  energy: number;          // 1–10
  sleep_quality: number;   // 1–10
  sleep_hours: number;
  libido: number;          // 1–10
  stress: number;          // 1–10
  mental_clarity: number;  // 1–10
  morning_erection: boolean | null;
  exercised: boolean;
  plan_adherence: 'fully' | 'mostly' | 'partially' | 'not_today';
  notes?: string;
  created_at: string;
}

export interface OptimizationCycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'paused';
  current_day: number;
}
