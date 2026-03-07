import { SYMPTOMS } from '../constants/symptoms';
import type { Phase1Data, Phase2Data, Phase3Data } from '../types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export function scoreSymptoms(selectedIds: string[]) {
  const filtered = selectedIds.filter(id => id !== 'none');
  const weighted_score = filtered.reduce((sum, id) => {
    const s = SYMPTOMS.find(s => s.id === id);
    return sum + (s?.correlation_weight ?? 0);
  }, 0);
  return { weighted_score: Math.round(weighted_score * 10) / 10, symptom_count: filtered.length };
}

export function calculateRiskScore(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[]
): number {
  let score = 50;

  // Age factor
  if (phase1.age >= 45) score += 15;
  else if (phase1.age >= 35) score += 8;
  else if (phase1.age >= 30) score += 3;

  // BMI
  if (phase1.height_cm && phase1.weight_kg) {
    const bmi = phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2);
    if (bmi >= 35) score += 12;
    else if (bmi >= 30) score += 8;
    else if (bmi >= 25) score += 4;
  }

  // Body fat
  if (phase1.body_fat_percent) {
    if (phase1.body_fat_percent >= 30) score += 10;
    else if (phase1.body_fat_percent >= 25) score += 5;
  }

  // Sleep
  if (phase2.avg_sleep_hours < 6) score += 12;
  else if (phase2.avg_sleep_hours < 7) score += 6;

  // Alcohol
  if (phase2.alcohol_frequency === 'daily') score += 10;
  else if (phase2.alcohol_frequency === 'frequent') score += 6;

  // Exercise
  if (phase2.exercise_frequency === 'none') score += 10;
  else if (phase2.exercise_frequency === '1-2x') score += 4;
  else if (phase2.exercise_frequency === '5-6x' || phase2.exercise_frequency === 'daily') score -= 5;

  // Sugar
  if (phase2.sugar_consumption === 'very_high') score += 8;
  else if (phase2.sugar_consumption === 'frequent') score += 4;

  // Smoking
  if (phase2.smoking_status === 'daily') score += 8;
  else if (phase2.smoking_status === 'occasional') score += 3;

  // Medical history
  if (phase3.steroid_history === 'past') score += 10;
  if (phase3.steroid_history === 'current') score += 5;
  if (phase3.trt_history !== 'never') score += 5;
  if (phase1.medical_conditions.length > 0) score += 8;

  // Symptoms
  const { weighted_score } = scoreSymptoms(symptomIds);
  score += Math.min(weighted_score * 2, 20);

  return Math.min(Math.round(score), 100);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'very_high';
  if (score >= 60) return 'high';
  if (score >= 45) return 'moderate';
  return 'low';
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'very_high': return '#FF5252';
    case 'high': return '#FFB300';
    case 'moderate': return '#FFB300';
    case 'low': return '#00E676';
  }
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'very_high': return 'Very High Risk';
    case 'high': return 'High Risk';
    case 'moderate': return 'Moderate Risk';
    case 'low': return 'Low Risk';
  }
}
