import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BIOMARKERS } from '@/constants/biomarkers';
import { calculateFreeTestosterone } from '@/lib/vermeulen';
import { SYMPTOMS } from '@/constants/symptoms';
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring';
import { buildPass1Prompt, buildSynthesisPrompt } from '@/lib/prompts/analysis';

/* ── Resolve marker display name → canonical ID ── */
const _nameToId = new Map<string, string>();
BIOMARKERS.forEach(b => {
  _nameToId.set(b.name.toLowerCase(), b.id);
  _nameToId.set(b.id.toLowerCase(), b.id);
});
function resolveMarkerId(marker: string): string {
  return _nameToId.get(marker.toLowerCase()) ?? marker;
}

/* ── Server-side marker status computation ── */
function computeMarkerStatus(
  value: number,
  stdLow: number, stdHigh: number,
  optLow: number, optHigh: number,
): 'optimal' | 'suboptimal' | 'out_of_range' {
  if (value < stdLow || value > stdHigh) return 'out_of_range';
  if (value >= optLow && value <= optHigh) return 'optimal';
  return 'suboptimal';
}

/* ── Server-side concern severity computation ── */
function computeConcernSeverity(
  markerId: string,
  panelValues: Record<string, { value: number | string; unit: string }>,
): 'monitor' | 'address' | 'urgent' | null {
  const pv = panelValues[markerId];
  if (!pv) return null; // lifestyle concern or marker not in panel — keep LLM assessment
  const bm = BIOMARKERS.find(b => b.id === markerId);
  if (!bm) return null;
  const value = Number(pv.value);
  if (isNaN(value)) return null;
  const { standard_range_low: stdLow, standard_range_high: stdHigh } = bm;
  const stdRange = stdHigh - stdLow;
  // >15% beyond standard bounds = urgent
  if (value < stdLow - stdRange * 0.15 || value > stdHigh + stdRange * 0.15) return 'urgent';
  // Outside standard range but not dramatically = address
  if (value < stdLow || value > stdHigh) return 'address';
  // Within standard but outside optimal = monitor
  return 'monitor';
}

/* ── Server-side health score computation ── */
function computeHealthScore(
  markerStatuses: Array<{ status: string }>,
  phase2: Record<string, unknown> | null,
): number {
  let score = 85;

  for (const m of markerStatuses) {
    if (m.status === 'out_of_range') score -= 8;
    else if (m.status === 'suboptimal') score -= 2;
  }

  // Functional marker bonuses
  if (phase2) {
    if (Number(phase2.libido_rating) >= 4) score += 3;
    if (Number(phase2.sleep_quality) >= 4) score += 3;
    if (Number(phase2.erectile_rating) >= 4) score += 2;
    const erections = String(phase2.morning_erection_frequency ?? '');
    if (erections === 'most_days' || erections === 'every_day') score += 2;
  }

  // Floor: all markers within standard range = minimum 55
  const anyOutOfRange = markerStatuses.some(m => m.status === 'out_of_range');
  if (!anyOutOfRange) score = Math.max(score, 55);

  return Math.max(20, Math.min(100, score));
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

/* ── OpenAI Responses API call helper ── */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens = 4096,
): Promise<{ parsed: Record<string, unknown>; model: string }> {
  const body: Record<string, unknown> = {
    model,
    input: prompt,
    max_output_tokens: maxTokens,
    temperature: model.includes('thinking') ? 0.2 : 0.1,
    text: { format: { type: 'json_object' } },
  };
  if (model.includes('thinking')) {
    body.reasoning = { effort: 'high' };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${model}): ${err}`);
  }

  const data = await response.json();
  const raw = data.output_text ?? data.output?.find((o: { type: string }) => o.type === 'message')?.content?.[0]?.text ?? '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return { parsed: JSON.parse(text), model };
}

/* ── Output validation — triggers Pro fallback ── */
const FORBIDDEN = [
  'aggressive', 'severe', 'severely', 'critical', 'bottlenecked',
  'disastrous', 'working harder', 'working overtime',
  'biological narrative', 'wellness strategist', 'warrior',
];
function isValidOutput(text: string): boolean {
  const lower = text.toLowerCase();
  return !FORBIDDEN.some(w => lower.includes(w));
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });

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

    // ── Pass 1: Thinking model ──
    const pass1Prompt = buildPass1Prompt(promptParams);
    let pass1 = await callOpenAI(pass1Prompt, apiKey, 'gpt-5.4-thinking', 3500);
    if (!isValidOutput(JSON.stringify(pass1.parsed))) {
      pass1 = await callOpenAI(pass1Prompt, apiKey, 'gpt-5.4-pro', 2500);
    }

    // ── Pass 2: Standard model ──
    const pass2Prompt = buildSynthesisPrompt({
      ...promptParams,
      pass1Result: JSON.stringify(pass1.parsed),
    });
    let pass2 = await callOpenAI(pass2Prompt, apiKey, 'gpt-5.4', 600);
    if (!isValidOutput(JSON.stringify(pass2.parsed))) {
      pass2 = await callOpenAI(pass2Prompt, apiKey, 'gpt-5.4-pro', 600);
    }

    // Merge both passes into final response
    const analysis = { ...pass1.parsed, ...pass2.parsed };

    // ── Server-side overrides ──

    // 1. Override marker statuses with server-computed values
    if (Array.isArray(analysis.marker_analysis)) {
      for (const m of analysis.marker_analysis as Array<Record<string, unknown>>) {
        const id = resolveMarkerId(String(m.marker));
        const pv = panelValues[id];
        if (!pv) continue;
        const bm = BIOMARKERS.find(b => b.id === id);
        if (!bm) continue;
        const value = Number(pv.value);
        if (isNaN(value)) continue;
        m.status = computeMarkerStatus(
          value,
          bm.standard_range_low, bm.standard_range_high,
          bm.optimal_range_low, bm.optimal_range_high,
        );
      }
    }

    // 2. Override concern severity + filter out optimal-status markers
    if (Array.isArray(analysis.concerns)) {
      analysis.concerns = (analysis.concerns as Array<Record<string, unknown>>)
        .map(c => {
          const id = resolveMarkerId(String(c.marker));
          const computed = computeConcernSeverity(id, panelValues);
          return computed ? { ...c, severity: computed } : c;
        })
        .filter(c => {
          const id = resolveMarkerId(String(c.marker));
          const pv = panelValues[id];
          if (!pv) return true; // keep lifestyle concerns
          const bm = BIOMARKERS.find(b => b.id === id);
          if (!bm) return true;
          const value = Number(pv.value);
          if (isNaN(value)) return true;
          return computeMarkerStatus(
            value,
            bm.standard_range_low, bm.standard_range_high,
            bm.optimal_range_low, bm.optimal_range_high,
          ) !== 'optimal';
        });
    }

    // 3. Compute health score server-side (overrides model's score)
    const markerStatuses = Array.isArray(analysis.marker_analysis)
      ? (analysis.marker_analysis as Array<{ status: string }>)
      : [];
    analysis.health_score = computeHealthScore(markerStatuses, phase2);

    return NextResponse.json({ ...analysis, _model: pass1.model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
