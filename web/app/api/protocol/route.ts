import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phase1, phase2, phase3, symptoms, panelValues, analysis } = await req.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

    const symptomIds: string[] = symptoms?.symptoms_selected ?? [];

    // Summarise the analysis findings for the protocol prompt
    const summary = analysis?.report_summary ?? {};
    const bottomLine = typeof summary === 'string' ? summary : (summary.bottom_line ?? '');
    const primaryDriver = typeof summary === 'string' ? '' : (summary.primary_driver ?? '');
    const concerns = (analysis?.concerns ?? [])
      .map((c: { marker: string; severity: string; explanation: string }) =>
        `- [${c.severity.toUpperCase()}] ${c.marker.replace(/_/g, ' ')}: ${c.explanation}`)
      .join('\n') || 'none';

    const bmi = phase1?.weight_kg && phase1?.height_cm
      ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1)
      : 'unknown';

    const prompt = `### ROLE
You are a Clinical Protocol Specialist. The bloodwork analysis is already complete — your job is to translate the findings into a precise, personalised 45-day Foundation protocol. Do NOT re-analyse the bloodwork. Do NOT introduce new concerns. Build directly from the findings provided.

### MANDATORY RULES
1. LIFESTYLE BEFORE SUPPLEMENTS: Root-cause interventions (diet, exercise, sleep, habits) are primary. Supplements are adjuncts only. If the root cause is caffeine driving SHBG, the primary intervention is caffeine reduction — not a supplement. Never lead with a supplement when a lifestyle change directly addresses the cause.
2. SPECIFICITY: Every directive must include quantities, frequencies, and timing. "Reduce coffee" is unacceptable. "Reduce coffee from ${san(phase2?.coffee_per_day)} to 1 cup, consumed before 10 AM" is acceptable.
3. BORON RULE: Do not recommend Boron. It has limited evidence, contested mechanism, and is not a clinically appropriate first-line intervention for SHBG management.
4. SUPPLEMENT LIMIT: Maximum 4 supplements. Each must directly address a specific finding from the analysis below. Prioritise deficiencies and axis-support over general "optimisers".
5. NO DUPLICATION: If the patient already takes a supplement listed in their current supplements, do not recommend it again — acknowledge the existing use and adjust dose/timing if needed.
6. CONNECT TO FINDINGS: Every recommendation must explicitly reference the specific finding it addresses (e.g. "to address your SHBG at 50.3 nmol/L driven by caffeine" not "to support testosterone levels").

### PATIENT PROFILE
- Age: ${phase1?.age ?? 'unknown'}, BMI: ${bmi}${phase1?.body_fat_percent ? `, Body fat: ${phase1.body_fat_percent}%` : ''}
- Medical conditions: ${sanArr(phase1?.medical_conditions)}
- Sleep: ${phase2?.avg_sleep_hours ?? '?'}h/night, quality ${phase2?.sleep_quality ?? '?'}/5
- Exercise: ${phase2?.exercise_frequency ?? 'unknown'}${phase2?.exercise_types?.length ? ` (${sanArr(phase2.exercise_types)})` : ''}
- Sedentary hours/day: ${phase2?.sedentary_hours ?? 'unknown'}
- Stress level: ${phase2?.stress_level ?? 'unknown'}/5
- Coffee/day: ${phase2?.coffee_per_day ?? 'unknown'}
- Sugar consumption: ${phase2?.sugar_consumption ?? 'unknown'}
- Beer/cider: ${phase2?.beer_frequency ?? 'unknown'}
- Spirits/wine: ${phase2?.spirits_wine_frequency ?? 'unknown'}
- Smoking: ${phase2?.smoking_status ?? 'unknown'}
- Libido: ${phase2?.libido_rating ?? 'unknown'}/5, Erectile function: ${phase2?.erectile_rating ?? 'unknown'}/5
- Morning erections: ${phase2?.morning_erection_frequency ?? 'unknown'}
- Keto/low-carb: ${phase2?.keto_diet ? 'yes' : 'no'}
- Steroid history: ${phase3?.steroid_history ?? 'never'}${phase3?.steroid_history === 'past' ? ` — stopped ${phase3?.steroid_stopped_ago ?? 'unknown'}, ${phase3?.steroid_cycle_count ?? 'unknown'} cycle(s), PCT: ${phase3?.steroid_pct ? 'yes' : 'no'}` : ''}
- TRT history: ${phase3?.trt_history ?? 'never'}
- Medications: ${sanArr(phase3?.medications)}
- Current supplements: ${sanArr(phase3?.supplements)}
- Symptoms: ${symptomIds.join(', ') || 'none'}

### ANALYSIS FINDINGS (build from these — do not re-derive)
Bottom line: ${bottomLine}
Primary driver: ${primaryDriver}

Areas of concern:
${concerns}

### OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code fences):
{
  "supplements": [
    {
      "name": "<supplement name>",
      "dose": "<exact dose with unit>",
      "timing": "<specific time, with or without food>",
      "reason": "<references the specific finding it addresses, with the patient's actual values>"
    }
  ],
  "eating": ["<specific dietary directive with quantities, referencing their current intake>"],
  "exercise": ["<specific protocol referencing their current routine and findings>"],
  "sleep": ["<specific directive referencing their current sleep data>"],
  "stress": ["<specific technique with frequency and duration>"],
  "habits": ["<specific habit change referencing their actual current habits and findings>"]
}`;

    const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    let response!: Response;
    let usedModel = models[0];
    for (const model of models) {
      usedModel = model;
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 4096,
              temperature: 0.1,
              topP: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      if (response.status !== 503) break;
    }

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const geminiData = await response.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const protocol = JSON.parse(text);

    return NextResponse.json({ ...protocol, _model: usedModel });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
