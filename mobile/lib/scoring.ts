import type { Phase1Data, Phase2Data, Phase3Data } from '../types';
import { SYMPTOM_MAP } from '../constants/symptoms';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface RiskScoreResult {
  score: number;               // 0–100
  risk_level: RiskLevel;
  weighted_score: number;
  key_factors: string[];
}

// ─── Symptom scoring ───────────────────────────────────────────────────────
export function scoreSymptoms(selectedIds: string[]): {
  weighted_score: number;
  symptom_count: number;
} {
  const weighted_score = selectedIds.reduce((acc, id) => {
    const s = SYMPTOM_MAP[id];
    return acc + (s?.correlation_weight ?? 0.5);
  }, 0);
  return { weighted_score, symptom_count: selectedIds.length };
}

// ─── Overall risk score ────────────────────────────────────────────────────
export function calculateRiskScore(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[]
): RiskScoreResult {
  let score = 0;
  const key_factors: string[] = [];

  // Age factor (0–20 points)
  if (phase1.age >= 50) { score += 20; key_factors.push('Age 50+ (higher baseline risk)'); }
  else if (phase1.age >= 40) { score += 14; key_factors.push('Age 40+ (moderate baseline risk)'); }
  else if (phase1.age >= 35) { score += 8; }
  else { score += 3; }

  // BMI factor (0–12 points)
  const bmi = phase1.weight_kg / ((phase1.height_cm / 100) ** 2);
  if (bmi >= 35) { score += 12; key_factors.push('Obesity (high aromatization risk)'); }
  else if (bmi >= 30) { score += 8; key_factors.push('High BMI increases estrogen conversion'); }
  else if (bmi >= 25) { score += 4; }

  // Sleep factor (0–15 points)
  if (phase2.avg_sleep_hours < 5) { score += 15; key_factors.push('Critical sleep deficit (< 5 hours)'); }
  else if (phase2.avg_sleep_hours < 6) { score += 10; key_factors.push('Poor sleep duration (< 6 hours)'); }
  else if (phase2.avg_sleep_hours < 7) { score += 5; key_factors.push('Suboptimal sleep duration'); }
  if (phase2.sleep_quality <= 2) { score += 5; key_factors.push('Very poor sleep quality'); }

  // Alcohol factor (0–10 points)
  if (phase2.alcohol_frequency === 'daily') { score += 10; key_factors.push('Daily alcohol consumption'); }
  else if (phase2.alcohol_frequency === 'frequent') { score += 7; key_factors.push('Frequent alcohol consumption'); }
  else if (phase2.alcohol_frequency === 'moderate') { score += 3; }

  // Exercise factor (0–8 points)
  if (phase2.exercise_frequency === 'none') { score += 8; key_factors.push('No exercise routine'); }
  else if (phase2.exercise_frequency === '1-2x') { score += 4; }

  // Sugar factor (0–8 points)
  if (phase2.sugar_consumption === 'very_high') { score += 8; key_factors.push('Very high sugar intake (insulin resistance risk)'); }
  else if (phase2.sugar_consumption === 'frequent') { score += 5; }

  // Smoking factor (0–5 points)
  if (phase2.smoking_status === 'daily') { score += 5; key_factors.push('Daily smoking'); }
  else if (phase2.smoking_status === 'occasional') { score += 2; }

  // Medical conditions factor (0–10 points)
  const highRiskConditions = ['diabetes', 'obesity', 'sleep_apnea', 'thyroid'];
  const userConditions = phase1.medical_conditions.filter(c =>
    highRiskConditions.some(r => c.toLowerCase().includes(r))
  );
  if (userConditions.length > 0) {
    score += Math.min(userConditions.length * 5, 10);
    key_factors.push(`Medical conditions: ${userConditions.join(', ')}`);
  }

  // Medication factor (0–8 points)
  const suppressiveMeds = ['opioid', 'ssri', 'antidepressant', 'statin', 'corticosteroid', 'finasteride'];
  const suppMeds = phase3.medications.filter(m =>
    suppressiveMeds.some(s => m.toLowerCase().includes(s))
  );
  if (suppMeds.length > 0) {
    score += Math.min(suppMeds.length * 4, 8);
    key_factors.push(`T-suppressing medications: ${suppMeds.join(', ')}`);
  }

  // Steroid history (0–7 points)
  if (phase3.steroid_history === 'past' && phase3.steroid_stopped_ago) {
    const recentStop = ['less_than_6_months', '6-12_months'].includes(phase3.steroid_stopped_ago);
    if (recentStop) { score += 7; key_factors.push('Recent steroid cessation (HPTA still recovering)'); }
    else { score += 3; }
  } else if (phase3.steroid_history === 'current') {
    score += 2;
  }

  // Symptom factor (0–30 points)
  const { weighted_score } = scoreSymptoms(symptomIds);
  const symptomPoints = Math.min(Math.round(weighted_score * 2.5), 30);
  score += symptomPoints;
  if (symptomIds.length >= 8) key_factors.push(`${symptomIds.length} symptoms reported`);

  // Clamp to 0–100
  score = Math.min(100, Math.max(0, score));

  const risk_level: RiskLevel =
    score >= 70 ? 'very_high' :
    score >= 50 ? 'high' :
    score >= 30 ? 'moderate' : 'low';

  return {
    score,
    risk_level,
    weighted_score,
    key_factors,
  };
}

// ─── Bloodwork recommendation logic ───────────────────────────────────────
export function getRecommendedTests(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[]
): { core: string[]; extended: string[] } {
  const core = ['total_t', 'free_t', 'shbg', 'estradiol', 'lh', 'fsh', 'prolactin', 'hematocrit', 'glucose'];
  const extended: string[] = [];

  // Thyroid — fatigue, weight gain, cold sensitivity, or thyroid condition
  const thyroidSymptoms = ['chronic_fatigue', 'tired_after_sleep', 'brain_fog'];
  if (
    phase1.medical_conditions.some(c => c.toLowerCase().includes('thyroid')) ||
    thyroidSymptoms.some(id => symptomIds.includes(id)) ||
    phase2.sugar_consumption === 'very_high'
  ) {
    extended.push('tsh');
  }

  // Cortisol — high stress
  if (phase2.sleep_quality <= 2 || phase2.avg_sleep_hours < 6) {
    extended.push('cortisol');
  }

  // DHT — hair loss, finasteride
  if (
    symptomIds.includes('hair_thinning') ||
    phase3.medications.some(m => m.toLowerCase().includes('finasteride'))
  ) {
    extended.push('dht');
  }

  // Vitamin D — low sun or fatigue
  if (
    symptomIds.includes('chronic_fatigue') ||
    phase2.sedentary_hours > 10
  ) {
    extended.push('vitamin_d');
  }

  // PSA — age 40+
  if (phase1.age >= 40) {
    extended.push('psa');
  }

  return { core, extended };
}

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'very_high': return '#FF5252';
    case 'high':      return '#FF5252';
    case 'moderate':  return '#FFB300';
    case 'low':       return '#00E676';
  }
}

export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'very_high': return 'Very High Risk';
    case 'high':      return 'High Risk';
    case 'moderate':  return 'Moderate Risk';
    case 'low':       return 'Low Risk';
  }
}
