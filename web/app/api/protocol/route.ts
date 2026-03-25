import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildProtocolPrompt } from '@/lib/prompts/protocol';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phase1, phase2, phase3, symptoms, analysis } = await req.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

    const bmi = phase1?.weight_kg && phase1?.height_cm
      ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1)
      : 'unknown';

    // Pass the full analysis JSON — marker_analysis, key_ratios, concerns,
    // report_summary, health_score, medical_referral_needed/reason
    const prompt = buildProtocolPrompt({
      phase1,
      phase2,
      phase3,
      symptomIds: symptoms?.symptoms_selected ?? [],
      bmi,
      analysisJson: JSON.stringify(analysis, null, 2),
    });

    const models = ['gemini-2.5-pro', 'gemini-2.5-flash'] as const;
    let response!: Response;
    let model: string = models[0];
    for (const m of models) {
      model = m;
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
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
        },
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

    return NextResponse.json({ ...protocol, _model: model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
