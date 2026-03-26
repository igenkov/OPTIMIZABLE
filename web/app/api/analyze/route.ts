import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BIOMARKERS } from '@/constants/biomarkers';
import { calculateFreeTestosterone } from '@/lib/vermeulen';
import { SYMPTOMS } from '@/constants/symptoms';
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring';
import { buildPass1Prompt, buildSynthesisPrompt } from '@/lib/prompts/analysis';

/* ── Server-side concern severity computation ── */
function computeConcernSeverity(
  marker: string,
  panelValues: Record<string, { value: number | string; unit: string }>,
): 'monitor' | 'address' | 'urgent' | null {
  const pv = panelValues[marker];
  if (!pv) return null; // lifestyle concern or marker not in panel — keep LLM assessment
  const bm = BIOMARKERS.find(b => b.id === marker);
  if (!bm) return null;
  const value = Number(pv.value);
  if (isNaN(value)) return null;
  const { standard_range_low: stdLow, standard_range_high: stdHigh } = bm;
  const stdRange = stdHigh - stdLow;
  // >15% beyond standard bounds = urgent (genuinely out of range, not borderline)
  if (value < stdLow - stdRange * 0.15 || value > stdHigh + stdRange * 0.15) return 'urgent';
  // Outside standard range but not dramatically so = address
  if (value < stdLow || value > stdHigh) return 'address';
  // Within standard but outside optimal = monitor
  return 'monitor';
}

/* ── Server-side ratio computation ── */
function computeRatios(
  panelValues: Record<string, { value: number | string; unit: string }>,
  vermeulenCalculated: boolean,
): string {
  const lines: string[] = [];

  // HOMA-IR: (fasting_insulin mU/L × fasting_glucose mg/dL) / 405
  const insulin = panelValues.fasting_insulin ? Number(panelValues.fasting_insulin.value) : null;
  const glucose = panelValues.glucose ? Number(panelValues.glucose.value) : null;
  if (insulin != null && glucose != null && insulin > 0 && glucose > 0) {
    const homaIr = (insulin * glucose) / 405;
    let status: string;
    if (homaIr <= 1.5) status = 'OPTIMAL';
    else if (homaIr <= 2.5) status = 'SUBOPTIMAL — early insulin sensitivity decline';
    else if (homaIr <= 5.0) status = 'RISK INDICATOR — consistent with insulin resistance pattern; describe as such, not as a confirmed diagnosis';
    else status = 'HIGH RISK — consistent with significant insulin resistance pattern; describe as such, not as a confirmed diagnosis';
    lines.push(`HOMA-IR: ${homaIr.toFixed(2)} [${status}]`);
  } else {
    lines.push('HOMA-IR: not calculable (fasting glucose and/or fasting insulin not submitted)');
  }

  // T:E2 Ratio: total_t (ng/dL) / estradiol (pg/mL) — do NOT convert units before dividing
  const totalT = panelValues.total_t ? Number(panelValues.total_t.value) : null;
  const estradiol = panelValues.estradiol ? Number(panelValues.estradiol.value) : null;
  if (totalT != null && estradiol != null && estradiol > 0) {
    const teRatio = totalT / estradiol;
    let status: string;
    if (teRatio < 10) status = 'LOW — relative estrogen excess; testosterone-to-estrogen conversion may be occurring';
    else if (teRatio <= 25) status = 'OPTIMAL — do NOT claim active testosterone-to-estrogen conversion as a primary driver';
    else status = 'HIGH — investigate context (very high total T or very low estradiol)';
    lines.push(`T:E2 Ratio: ${teRatio.toFixed(1)} [${status}]`);
  } else {
    lines.push('T:E2 Ratio: not calculable (total testosterone and/or estradiol not submitted)');
  }

  // % Free Testosterone: free_t (pg/mL) / (total_t (ng/dL) × 10) × 100
  const freeT = panelValues.free_t ? Number(panelValues.free_t.value) : null;
  if (freeT != null && totalT != null && totalT > 0) {
    const pctFreeT = (freeT / (totalT * 10)) * 100;
    let status: string;
    if (pctFreeT < 0.8) status = 'LOW — significant binding suppression; free androgen availability reduced';
    else if (pctFreeT <= 3.5) status = 'OPTIMAL';
    else status = 'HIGH — low SHBG or elevated free fraction';
    const calcNote = vermeulenCalculated ? ' [CALCULATED via Vermeulen — estimated]' : '';
    lines.push(`% Free Testosterone: ${pctFreeT.toFixed(2)}%${calcNote} [${status}]`);
  } else {
    lines.push('% Free Testosterone: not calculable (free testosterone and/or total testosterone not submitted)');
  }

  return lines.join('\n');
}

/* ── Gemini call helper with model fallback ── */
async function callGemini(
  prompt: string,
  apiKey: string,
  maxTokens = 12288,
): Promise<{ parsed: Record<string, unknown>; model: string }> {
  const models = ['gemini-2.5-pro', 'gemini-2.5-flash'] as const;
  let response!: Response;
  let usedModel: string = models[0];

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
            thinkingConfig: { thinkingBudget: 8192 },
            maxOutputTokens: maxTokens,
            temperature: 1,
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
      return `[${b.id}] ${b.name}: ${val.value} ${val.unit} (standard: ${b.standard_range_low}–${b.standard_range_high}, optimal: ${b.optimal_range_low}–${b.optimal_range_high})`;
    }).filter(Boolean).join('\n');

    // Pre-compute ratios server-side — LLM must not recalculate these
    const computedRatiosContext = computeRatios(panelValues, !!vermeulenNote);

    const bmi = phase1?.weight_kg && phase1?.height_cm
      ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1)
      : 'unknown';

    const promptParams = {
      riskScore, riskLevel, bmi,
      phase1, phase2, phase3,
      symptomNames, biomarkerContext, vermeulenNote, computedRatiosContext,
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

    // Override concern severity with server-computed values for biomarkers
    if (Array.isArray(analysis.concerns)) {
      analysis.concerns = analysis.concerns.map((c: { marker: string; severity: string; explanation: string }) => {
        const computed = computeConcernSeverity(c.marker, panelValues);
        return computed ? { ...c, severity: computed } : c;
      });
    }

    return NextResponse.json({ ...analysis, _model: pass1.model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
