import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BIOMARKERS } from '@/constants/biomarkers';
import { calculateFreeTestosterone } from '@/lib/vermeulen';
import { SYMPTOMS } from '@/constants/symptoms';
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring';
import { buildPass1Prompt, buildSynthesisPrompt } from '@/lib/prompts/analysis';

/* ── Gemini call helper with model fallback ── */
async function callGemini(
  prompt: string,
  apiKey: string,
  maxTokens = 12288,
): Promise<{ parsed: Record<string, unknown>; model: string }> {
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
            maxOutputTokens: maxTokens,
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
    throw new Error(`Gemini API error (${usedModel}): ${err}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return { parsed: JSON.parse(text), model: usedModel };
}

/* ── Main route ── */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { panelValues, phase1, phase2, phase3, symptoms } = await req.json();

    const symptomIds: string[] = symptoms?.symptoms_selected ?? [];
    const riskScore = (phase1 && phase2 && phase3)
      ? calculateRiskScore(phase1, phase2, phase3, symptomIds)
      : null;
    const riskLevel = riskScore != null ? getRiskLevel(riskScore) : null;

    const symptomNames = symptomIds
      .filter(id => id !== 'none')
      .map(id => SYMPTOMS.find(s => s.id === id)?.name ?? id)
      .join(', ') || 'none';

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

    // Vermeulen fallback — MUST run before biomarkerContext is built
    let vermeulenNote = '';
    if (!panelValues.free_t && panelValues.total_t && panelValues.shbg) {
      const totalT = Number(panelValues.total_t.value);
      const shbg = Number(panelValues.shbg.value);
      const albumin = panelValues.albumin ? Number(panelValues.albumin.value) : 4.3;
      const calcFreeT = calculateFreeTestosterone(totalT, shbg, albumin);
      if (calcFreeT > 0) {
        panelValues.free_t = { marker: 'free_t', value: calcFreeT, unit: 'pg/mL' };
        vermeulenNote = `\nNote: Free Testosterone was NOT directly measured. The value ${calcFreeT} pg/mL was CALCULATED using the Vermeulen/Sodergard equation from Total T (${totalT} ng/dL) + SHBG (${shbg} nmol/L)${panelValues.albumin ? ` + Albumin (${albumin} g/dL)` : ' + population-average Albumin (4.3 g/dL)'}. Flag this as "[CALCULATED]" in your analysis — it is an estimate, not a direct measurement. Recommend the patient get Free T directly measured on their next panel for confirmation.`;
      }
    }

    // Build biomarker context (after Vermeulen so calculated free_t is included)
    const biomarkerContext = BIOMARKERS.map(b => {
      const val = panelValues[b.id];
      if (!val) return null;
      return `${b.name}: ${val.value} ${val.unit} (standard: ${b.standard_range_low}–${b.standard_range_high}, optimal: ${b.optimal_range_low}–${b.optimal_range_high})`;
    }).filter(Boolean).join('\n');

    const bmi = phase1?.weight_kg && phase1?.height_cm
      ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1)
      : 'unknown';

    const promptParams = {
      riskScore, riskLevel, bmi,
      phase1, phase2, phase3,
      symptomNames, biomarkerContext, vermeulenNote,
    };

    // ── Pass 1: Detailed marker analysis ──
    const pass1Prompt = buildPass1Prompt(promptParams);
    const pass1 = await callGemini(pass1Prompt, apiKey, 12288);

    // ── Pass 2: Executive summary + health score ──
    const pass2Prompt = buildSynthesisPrompt({
      ...promptParams,
      pass1Result: JSON.stringify(pass1.parsed),
    });
    const pass2 = await callGemini(pass2Prompt, apiKey, 4096);

    // Merge both passes into final response
    const analysis = { ...pass1.parsed, ...pass2.parsed };

    return NextResponse.json({ ...analysis, _model: pass1.model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
