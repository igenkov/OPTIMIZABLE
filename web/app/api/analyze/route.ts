import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BIOMARKERS } from '@/constants/biomarkers';

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
You are a Lead Clinical Wellness Strategist specializing in male hormonal optimization and functional endocrinology. Your objective is to synthesize patient data into a "Biological Narrative" that identifies root causes, not just surface-level results.

### ANALYSIS FRAMEWORK (perform internally before generating output)
1. BIOMARKER CROSS-REFERENCE: Identify discordant values (e.g., High Total T + High SHBG → low free T despite normal total). Flag patterns, not just individual outliers.
2. CONTEXTUAL OVERLAY: Interrogate lifestyle data against bloodwork. How does this patient's specific combination of sleep, alcohol, stress, and habits explain the biomarker pattern?
3. HABIT INTERFERENCE: Identify habits that negate positive biomarkers (e.g., high muscle mass but 10 sedentary hours/day driving insulin resistance and aromatization).
4. PROTOCOL HIERARCHY: Rank interventions by projected impact on Free Testosterone and SHBG — prioritize highest leverage first.

### SPECIFIC CLINICAL LOGIC TO APPLY
- SHBG FOCUS: If SHBG > 35 nmol/L, investigate keto diet, excessive coffee, or chronic low-carb status as metabolic drivers.
- HOPS SENSITIVITY: Explicitly link beer/cider consumption to estrogen/testosterone balance — 8-prenylnaringenin in hops is one of the most potent dietary phytoestrogens.
- MUSCLE MASS ADAPTATION: If high_muscle_override is noted, do not interpret elevated BMI as overweight. Instead look for inflammation or overtraining markers.
- STEROID/TRT HISTORY: Account for long-term HPTA axis suppression duration based on the "stopped ago" timeline and cycle count. No PCT = higher ongoing suppression risk.
- PREGNENOLONE STEAL: High stress + poor sleep = dual drain on testosterone precursor. Flag this chain explicitly when both are present.
- INSULIN-AROMATASE LOOP: High sugar + sedentary hours = elevated insulin → increased aromatase activity → testosterone converted to estrogen. Make this chain explicit when relevant.

### OUTPUT INSTRUCTIONS
Map your analysis to the JSON structure below. Specifically:
- "report_summary": Return as a JSON object with exactly 3 fields: "bottom_line" (1–2 sentences: overall hormonal status verdict — biological age vs chronological age), "primary_driver" (1–2 sentences: the dominant root-cause explaining the biomarker pattern — how their specific habit/health combination produces these results), "next_action" (1 sentence: the single highest-leverage intervention ranked by projected impact on Free T and SHBG).
- "recommendations": Tier interventions as Daily / Weekly / Monthly within each category.
- "concerns": Use as Red Flags — anything requiring urgent attention or medical consultation.
- "medical_referral_needed": true if any marker or symptom pattern warrants physician review.



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
- ${sanArr(symptoms?.symptoms_selected)}

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 12288,
            temperature: 0.2,
            topP: 0.9,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const geminiData = await response.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const analysis = JSON.parse(text);

    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
