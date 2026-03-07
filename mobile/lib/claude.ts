import type { BloodworkValue, AnalysisReport, OptimizationPlan, Phase1Data, Phase2Data, Phase3Data, SymptomAssessment } from '../types';
import { BIOMARKERS } from '../constants/biomarkers';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const API_URL = 'https://api.anthropic.com/v1/messages';

interface AnalysisInput {
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  symptoms: SymptomAssessment;
  bloodwork: Record<string, BloodworkValue>;
  previousBloodwork?: Record<string, BloodworkValue>;
  checkinStats?: Record<string, number>;
}

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function analyzeBloodwork(input: AnalysisInput): Promise<AnalysisReport> {
  const biomarkerRefText = BIOMARKERS.map(b =>
    `${b.name} (${b.short_name}): unit=${b.unit_primary}, standard=[${b.standard_range_low}–${b.standard_range_high}], optimal=[${b.optimal_range_low}–${b.optimal_range_high}]`
  ).join('\n');

  const bloodworkText = Object.entries(input.bloodwork)
    .map(([k, v]) => `${k}: ${v.value} ${v.unit}`)
    .join('\n');

  const previousText = input.previousBloodwork
    ? '\nPREVIOUS PANEL:\n' + Object.entries(input.previousBloodwork).map(([k, v]) => `${k}: ${v.value} ${v.unit}`).join('\n')
    : '';

  const checkinText = input.checkinStats
    ? '\nDAILY CHECK-IN AVERAGES (last 30 days):\n' + Object.entries(input.checkinStats).map(([k, v]) => `${k}: ${v.toFixed(1)}`).join('\n')
    : '';

  const prompt = `You are a hormone health analysis engine for the Optimizable app. Analyze the following user data and return a structured JSON response.

IMPORTANT: You are NOT providing medical advice. This is for informational and wellness purposes only.

USER PROFILE:
Age: ${input.phase1.age}
Height: ${input.phase1.height_cm} cm
Weight: ${input.phase1.weight_kg} kg
Body fat: ${input.phase1.body_fat_percent ?? 'not provided'}%
Medical conditions: ${input.phase1.medical_conditions.join(', ') || 'none'}

LIFESTYLE:
Sleep: ${input.phase2.avg_sleep_hours} hours/night, quality ${input.phase2.sleep_quality}/5
Alcohol: ${input.phase2.alcohol_frequency}
Exercise: ${input.phase2.exercise_frequency}, types: ${input.phase2.exercise_types.join(', ')}
Stress level: (inferred from profile)
Libido: ${input.phase2.libido_rating}/10

MEDICAL HISTORY:
Medications: ${input.phase3.medications.join(', ') || 'none'}
Supplements: ${input.phase3.supplements.join(', ') || 'none'}
Steroid history: ${input.phase3.steroid_history}
TRT history: ${input.phase3.trt_history}

SYMPTOMS (${input.symptoms.symptom_count} total, risk: ${input.symptoms.risk_level}):
${input.symptoms.symptoms_selected.join(', ')}

BIOMARKER REFERENCE RANGES:
${biomarkerRefText}

CURRENT BLOODWORK:
${bloodworkText}
${previousText}
${checkinText}

Return a JSON object with EXACTLY this structure (no markdown, pure JSON):
{
  "health_score": <number 0-100, weighted composite>,
  "marker_analysis": [
    {
      "marker": "<marker_id>",
      "value": <number>,
      "unit": "<unit>",
      "status": "<optimal|suboptimal|attention>",
      "explanation": "<2-3 sentence plain-language explanation specific to this user>"
    }
  ],
  "key_ratios": [
    {
      "name": "<ratio name>",
      "value": <number>,
      "interpretation": "<plain language>",
      "status": "<optimal|suboptimal|attention>"
    }
  ],
  "report_summary": "<3-4 paragraph plain-language summary of overall hormonal picture>",
  "concerns": [
    {
      "marker": "<marker_id>",
      "severity": "<low|medium|high>",
      "explanation": "<what this means and why it matters>"
    }
  ],
  "recommendations": {
    "eating": ["<specific actionable recommendation>"],
    "exercise": ["<specific actionable recommendation>"],
    "supplements": [
      {
        "name": "<supplement name>",
        "dose": "<dosage>",
        "timing": "<when to take>",
        "reason": "<why recommended based on bloodwork>"
      }
    ],
    "sleep": ["<specific recommendation>"],
    "stress": ["<specific recommendation>"],
    "habits": ["<specific recommendation>"]
  },
  "medical_referral_needed": <true|false>,
  "medical_referral_reason": "<reason if true, null if false>"
}`;

  const raw = await callClaude(prompt);

  // Strip any markdown code fences if present
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(jsonStr);

  return {
    id: '',
    user_id: '',
    bloodwork_panel_id: '',
    created_at: new Date().toISOString(),
    ...parsed,
  } as AnalysisReport;
}

export async function generateOptimizationPlan(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptoms: SymptomAssessment,
  analysis: AnalysisReport
): Promise<OptimizationPlan> {
  const prompt = `You are generating a 90-day optimization plan for a user of the Optimizable app.

USER PROFILE:
Age: ${phase1.age}, Weight: ${phase1.weight_kg}kg
Sleep: ${phase2.avg_sleep_hours}h/night (quality ${phase2.sleep_quality}/5)
Exercise: ${phase2.exercise_frequency}, ${phase2.exercise_types.join(', ')}
Alcohol: ${phase2.alcohol_frequency}, Sugar: ${phase2.sugar_consumption}
Supplements currently taking: ${phase3.supplements.join(', ') || 'none'}
Medications: ${phase3.medications.join(', ') || 'none'}

HEALTH SCORE: ${analysis.health_score}/100
KEY CONCERNS: ${analysis.concerns.map(c => c.marker).join(', ')}
MEDICAL REFERRAL NEEDED: ${analysis.medical_referral_needed}

Based on the bloodwork analysis, create a specific, actionable 90-day plan.

Return ONLY pure JSON (no markdown):
{
  "eating": ["<5-7 specific dietary recommendations based on bloodwork>"],
  "exercise": ["<4-6 specific exercise recommendations>"],
  "supplements": [
    {
      "name": "<supplement>",
      "dose": "<dose>",
      "timing": "<morning/evening/with food/before bed>",
      "reason": "<why based on labs>"
    }
  ],
  "sleep": ["<3-5 sleep optimization recommendations>"],
  "stress": ["<3-4 stress management recommendations>"],
  "habits": ["<4-6 habit change recommendations>"]
}`;

  const raw = await callClaude(prompt);
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(jsonStr) as OptimizationPlan;
}
