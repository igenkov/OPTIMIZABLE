import { NextRequest, NextResponse } from 'next/server';
import { BIOMARKERS } from '@/constants/biomarkers';

export async function POST(req: NextRequest) {
  try {
    const { panelValues, phase1, phase2, phase3, symptoms } = await req.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

    // Build biomarker context
    const biomarkerContext = BIOMARKERS.map(b => {
      const val = panelValues[b.id];
      if (!val) return null;
      return `${b.name}: ${val.value} ${val.unit} (standard: ${b.standard_range_low}–${b.standard_range_high}, optimal: ${b.optimal_range_low}–${b.optimal_range_high})`;
    }).filter(Boolean).join('\n');

    const prompt = `You are an expert men's health and testosterone optimization physician. Analyze this patient's bloodwork and generate a comprehensive report.

PATIENT PROFILE:
- Age: ${phase1?.age ?? 'unknown'}, BMI: ${phase1?.weight_kg && phase1?.height_cm ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1) : 'unknown'}
- Medical conditions: ${phase1?.medical_conditions?.join(', ') || 'none reported'}
- Sleep: ${phase2?.avg_sleep_hours ?? '?'}h/night, quality ${phase2?.sleep_quality ?? '?'}/5
- Exercise: ${phase2?.exercise_frequency ?? 'unknown'}
- Alcohol: ${phase2?.alcohol_frequency ?? 'unknown'}, Smoking: ${phase2?.smoking_status ?? 'unknown'}
- Steroid history: ${phase3?.steroid_history ?? 'never'}, TRT: ${phase3?.trt_history ?? 'never'}
- Medications: ${phase3?.medications?.join(', ') || 'none'}
- Supplements: ${phase3?.supplements?.join(', ') || 'none'}
- Symptoms: ${symptoms?.symptoms_selected?.join(', ') || 'none reported'}

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
  "report_summary": "<3-4 paragraph comprehensive analysis>",
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
            maxOutputTokens: 8192,
            temperature: 0.1,
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
