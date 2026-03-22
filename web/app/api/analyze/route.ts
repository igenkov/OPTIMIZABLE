import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BIOMARKERS } from '@/constants/biomarkers';
import { SYMPTOMS } from '@/constants/symptoms';
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring';

// Strip control characters and limit length to prevent prompt injection
function san(val: unknown, maxLen = 150): string {
  if (val == null) return '';
  return String(val).replace(/[\u0000-\u001F\u007F-\u009F`]/g, '').trim().slice(0, maxLen);
}
function sanArr(arr: unknown[] | null | undefined, maxLen = 80): string {
  if (!Array.isArray(arr) || !arr.length) return 'none';
  return arr.map(v => san(v, maxLen)).filter(Boolean).join(', ') || 'none';
}

export async function POST(req: NextRequest) {
  try {
    // Auth check — reject unauthenticated requests
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { panelValues, phase1, phase2, phase3, symptoms } = await req.json();

    // Calculate onboarding risk score for context
    const symptomIds: string[] = symptoms?.symptoms_selected ?? [];
    const riskScore = (phase1 && phase2 && phase3)
      ? calculateRiskScore(phase1, phase2, phase3, symptomIds)
      : null;
    const riskLevel = riskScore != null ? getRiskLevel(riskScore) : null;

    // Map symptom IDs to human-readable names
    const symptomNames = symptomIds
      .filter(id => id !== 'none')
      .map(id => SYMPTOMS.find(s => s.id === id)?.name ?? id)
      .join(', ') || 'none';

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

    // Build biomarker context
    const biomarkerContext = BIOMARKERS.map(b => {
      const val = panelValues[b.id];
      if (!val) return null;
      return `${b.name}: ${val.value} ${val.unit} (standard: ${b.standard_range_low}–${b.standard_range_high}, optimal: ${b.optimal_range_low}–${b.optimal_range_high})`;
    }).filter(Boolean).join('\n');

    const bmi = phase1?.weight_kg && phase1?.height_cm
      ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1)
      : 'unknown';

    const prompt = `### ROLE
You are a Senior Consultant Endocrinologist and Clinical Pathologist. Your objective is to provide an objective, data-driven analysis of a patient's endocrine status. You prioritize physiological accuracy and neutral, clinical terminology.

### DICTION CONSTRAINTS (MANDATORY)
- FORBIDDEN: "aggressive", "severe", "bottlenecked", "disastrous", "biological narrative", "wellness strategist", "warrior", "synthesis".
- MANDATORY: "clinically significant", "physiologically consistent", "suboptimal", "homeostasis", "bioavailability", "discordant".
- TONE: Professional, objective, and diagnostic. Use the passive voice to maintain a third-party clinical perspective.

### FEW-SHOT TONE REFERENCE
- BAD: "Your SHBG is aggressively bottlenecking your T. This is a disaster for your health."
- GOOD: "Elevated SHBG is reducing testosterone bioavailability. This pattern is physiologically consistent with the reported high caffeine intake."

### ANALYSIS FRAMEWORK (perform internally before generating output)
1. BIOMARKER CROSS-REFERENCE: Identify discordant values (e.g., High Total T + High SHBG = low free T despite normal total). Flag patterns, not individual outliers.
2. CONTEXTUAL OVERLAY: Interrogate lifestyle data against bloodwork. How does this patient's specific combination of sleep, alcohol, stress, and habits explain the biomarker pattern?
3. HABIT INTERFERENCE: Identify habits that negate positive biomarkers (e.g., high muscle mass but 10 sedentary hours/day driving insulin resistance and aromatization).
4. PROTOCOL HIERARCHY: Rank interventions by projected impact on Free Testosterone and SHBG — prioritize highest leverage first.

### SPECIFIC CLINICAL LOGIC TO APPLY
- SHBG/INSULIN DYNAMICS: Insulin is a potent suppressor of SHBG. Sedentary behavior and high sugar (hyperinsulinemia) typically LOWER SHBG. If SHBG is HIGH despite these factors, investigate high caffeine (>3 cups), low-carb/keto diet, or hepatic stress as the primary driver. Do not assume sedentary + high sugar = high SHBG — this is physiologically incorrect.
- HOPS SENSITIVITY: Explicitly link beer/cider consumption to estrogen/testosterone balance — 8-prenylnaringenin in hops is one of the most potent dietary phytoestrogens.
- MUSCLE MASS ADAPTATION: If high_muscle_override is noted, do not interpret elevated BMI as overweight. Instead look for inflammation or overtraining markers.
- STEROID/TRT HISTORY: Account for long-term HPTA axis suppression duration based on the "stopped ago" timeline and cycle count. No PCT = higher ongoing suppression risk.
- PREGNENOLONE STEAL: High stress + poor sleep = dual drain on testosterone precursor. Flag this chain explicitly when both are present.
- INSULIN-AROMATASE LOOP: High sugar + sedentary hours = elevated insulin = increased aromatase activity = testosterone converted to estrogen. Make this chain explicit when relevant.
- SLEEP FRAGMENTATION: If sleep quality is <=2/5 regardless of total hours, flag disrupted sleep architecture as an independent LH pulse suppressor. High duration + low quality is a hallmark of obstructive sleep apnea — recommend screening. Do not assume adequate hours = adequate hormonal recovery.
- EXERCISE MODALITY: Differentiate resistance training (Weightlifting, HIIT) from aerobic/low-intensity exercise (Walking, Yoga, Cycling). Resistance training increases androgen receptor density and stimulates acute GH + T release. Absence of resistance training in an otherwise active patient may explain suboptimal androgen utilization despite normal levels.
- VASCULAR ED PATTERN: If libido is preserved (>=4/5) but erectile function or morning erections are poor, suspect vascular rather than hormonal etiology. Prioritize lipid panel and glucose interpretation. If the patient also smokes, flag this as an urgent vascular combination — smoking is an independent endothelial toxin that accelerates penile microvasculature narrowing.
- SMOKING-ENDOCRINE: Smoking is a direct Leydig cell toxin. When present alongside poor erectile markers, explicitly connect to vascular endothelial damage. When present alongside elevated cortisol, note the compounding HPT axis suppression via dual oxidative stress pathways.
- PHARMACOLOGICAL INTERFERENCE: Interpret biomarkers through the lens of the patient's medication categories:
  * SSRIs/SNRIs: Serotonin-boosting medications elevate prolactin. If prolactin is elevated, explicitly connect SSRI use to serotonin increase to prolactin rise to GnRH suppression to reduced LH/FSH to lower testosterone. Do not attribute elevated prolactin solely to stress or pituitary pathology when SSRIs are present.
  * Opioids: Flag opioid-induced androgen deficiency (OPIAD) when opioids are present alongside suppressed LH/FSH. Opioids directly suppress hypothalamic GnRH pulse frequency — this is the most common pharmacological cause of secondary hypogonadism and is underdiagnosed.
  * Corticosteroids: Exogenous corticosteroids suppress CRH and ACTH, but also directly suppress GnRH/LH secretion. If cortisol or morning cortisol appears normal while on corticosteroids, note that exogenous supply masks endogenous HPA status — and the HPT axis is still suppressed.
  * Statins: Cholesterol is the direct molecular precursor to all steroid hormones including testosterone. Statins also deplete CoQ10, which powers mitochondrial energy in Leydig cells. If CoQ10 is low or testosterone is borderline, explicitly connect statin use as a contributing factor.
  * 5-Alpha Reductase Inhibitors (finasteride, dutasteride) / Androgen Blockers: These reduce DHT — the most potent androgen. If DHT is low, connect to 5-ARI use. If libido or erectile function is poor despite normal testosterone, flag DHT suppression as the likely mechanism. Note that post-finasteride syndrome can persist after discontinuation.
- AROMATASE SIGNAL: If the patient reports fat_gain + gynecomastia + low_libido, and labs show High-Normal Estradiol but Low-Normal Testosterone, prioritize Adipose-Derived Aromatization as the root cause over testicular failure. Excess adipose tissue upregulates aromatase, converting testosterone to estrogen in a self-reinforcing loop. The correct protocol is estrogen management + fat loss — NOT direct testosterone augmentation, which would simply provide more substrate for aromatization.
- SYMPTOM CONFLICT RECONCILIATION: If the patient reports both hair_loss (a High DHT signal) and muscle_loss (a Low T signal), do not treat these as contradictory. This combination typically indicates an androgen receptor sensitivity issue or elevated 5-alpha reductase activity depleting the testosterone pool while concentrating it as scalp-active DHT. When this pattern appears, explicitly reconcile it and recommend DHT + Free T testing together.

### OUTPUT INSTRUCTIONS
Map your analysis to the JSON structure below. Specifically:
- "report_summary": Return as a JSON object with exactly 3 fields:
  * "bottom_line": 1-2 sentences. Objective verdict on hormonal status — biological age vs chronological age.
  * "primary_driver": 1-2 sentences. Identify the dominant physiological mechanism explaining the biomarker pattern.
  * "next_action": 1 sentence. Highest-leverage clinical or lifestyle intervention.
- "recommendations": Tier interventions as Daily / Weekly / Monthly within each category.
- "concerns": Use as Red Flags — anything requiring urgent attention or medical consultation.
- "medical_referral_needed": true if any marker or symptom pattern warrants physician review.

### PATIENT DATA FOR ANALYSIS

ONBOARDING RISK ASSESSMENT:
- Initial risk score: ${riskScore != null ? `${riskScore}/100 — ${riskLevel} risk` : 'N/A (current TRT or steroid use — scoring excluded)'}
- This score was calculated from demographics, lifestyle, medical history, and reported symptoms BEFORE bloodwork. Use it as the prior probability when interpreting biomarker results.

CLINICAL DIRECTIVE:
Interpret every biomarker value through the lens of this patient's complete onboarding profile. Do not analyze markers in isolation. Explicitly reference the onboarding inputs that explain or amplify each result. For example: if SHBG is elevated, reference caffeine intake, keto diet, or hepatic status; if estradiol is high, reference beer consumption and body fat level; if LH/FSH are suppressed, reference steroid history and medication categories; if cortisol is elevated, reference stress level and sleep data; if glucose or insulin is abnormal, reference sedentary hours, sugar consumption, and insulin resistance/diabetes conditions.

PATIENT PROFILE:
- Age: ${phase1?.age ?? 'unknown'}
- BMI: ${bmi}${phase1?.body_fat_percent ? `, Body fat: ${phase1.body_fat_percent}%` : ''}${phase1?.high_muscle_override ? ' (high muscle mass — elevated BMI reflects muscle, not fat)' : ''}
- Medical conditions: ${sanArr(phase1?.medical_conditions)}

LIFESTYLE:
- Sleep: ${phase2?.avg_sleep_hours ?? '?'}h/night, quality ${phase2?.sleep_quality ?? '?'}/5
- Exercise: ${phase2?.exercise_frequency ?? 'unknown'}${phase2?.exercise_types?.length ? ` (${sanArr(phase2.exercise_types)})` : ''}
- Sedentary hours/day: ${phase2?.sedentary_hours ?? 'unknown'}
- Stress level: ${phase2?.stress_level ?? 'unknown'}/5
- Beer/cider: ${phase2?.beer_frequency ?? 'unknown'} (note: hops phytoestrogens have greater hormonal impact than other alcohol)
- Spirits/wine: ${phase2?.spirits_wine_frequency ?? 'unknown'}
- Smoking: ${phase2?.smoking_status ?? 'unknown'}
- Coffee/day: ${phase2?.coffee_per_day ?? 'unknown'}
- Sugar consumption: ${phase2?.sugar_consumption ?? 'unknown'}
- Keto/low-carb diet: ${phase2?.keto_diet ? 'yes (SHBG elevation risk)' : 'no'}

SEXUAL HEALTH:
- Morning erections: ${phase2?.morning_erection_frequency ?? 'unknown'}
- Libido: ${phase2?.libido_rating ?? 'unknown'}/5
- Erectile function: ${phase2?.erectile_rating ?? 'unknown'}/5

MEDICAL HISTORY:
- Steroid history: ${phase3?.steroid_history ?? 'never'}${phase3?.steroid_history === 'past' ? ` — stopped ${phase3?.steroid_stopped_ago ?? 'unknown'}, ${phase3?.steroid_cycle_count ?? 'unknown'} cycle(s), PCT: ${phase3?.steroid_pct ? 'yes' : 'no'}` : ''}
- TRT history: ${phase3?.trt_history ?? 'never'}${phase3?.trt_history !== 'never' && phase3?.trt_type ? ` (${phase3.trt_type})` : ''}
- Medication categories: ${sanArr(phase3?.medication_categories)}
- Medications: ${sanArr(phase3?.medications)}
- Supplement categories: ${sanArr(phase3?.supplement_categories)}
- Supplements: ${sanArr(phase3?.supplements)}

SYMPTOMS:
- ${symptomNames}

BLOODWORK VALUES:
${biomarkerContext}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "health_score": <integer 0-100>,
  "marker_analysis": [
    {
      "marker": "<biomarker_id>",
      "value": <number>,
      "unit": "<unit>",
      "status": "<optimal|suboptimal|attention>",
      "explanation": "<2-3 sentence clinical explanation>",
      "standard_range": {"low": <number>, "high": <number>},
      "optimal_range": {"low": <number>, "high": <number>}
    }
  ],
  "key_ratios": [
    {
      "name": "<ratio name>",
      "value": <number>,
      "interpretation": "<interpretation>",
      "status": "<optimal|suboptimal|attention>"
    }
  ],
  "report_summary": {
    "bottom_line": "<1-2 sentence overall verdict>",
    "primary_driver": "<1-2 sentences dominant root cause>",
    "next_action": "<1 sentence highest-leverage intervention>"
  },
  "concerns": [
    {
      "marker": "<marker_id>",
      "severity": "<low|medium|high>",
      "explanation": "<explanation>"
    }
  ],
  "recommendations": {
    "eating": ["<recommendation>"],
    "exercise": ["<recommendation>"],
    "supplements": [
      {
        "name": "<supplement name>",
        "dose": "<dose>",
        "timing": "<when to take>",
        "reason": "<why recommended>"
      }
    ],
    "sleep": ["<recommendation>"],
    "stress": ["<recommendation>"],
    "habits": ["<recommendation>"]
  },
  "medical_referral_needed": <true|false>,
  "medical_referral_reason": "<reason if true, null if false>"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 12288,
            temperature: 0.1,
            topP: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const geminiData = await response.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // Strip markdown code fences if model wraps output despite prompt instruction
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const analysis = JSON.parse(text);

    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
