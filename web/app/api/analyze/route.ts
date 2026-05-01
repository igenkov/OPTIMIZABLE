import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BIOMARKERS, NEAR_OPTIMAL_ZONE, NEAR_OPTIMAL_DEFAULT, TRT_PANEL_IDS } from '@/constants/biomarkers';
import { calculateFreeTestosterone } from '@/lib/vermeulen';
import { SYMPTOMS } from '@/constants/symptoms';
import { calculateRiskScore, getRiskLevel, getPersonalizedPanel, isExcluded } from '@/lib/scoring';
import { buildPass1Prompt, buildSynthesisPrompt } from '@/lib/prompts/analysis';
import { normalizePersistedAnalysisMarkers, resolveMarkerId } from '@/lib/marker-ids';

/* ── Server-side marker status computation ── */
function computeMarkerStatus(
  markerId: string,
  value: number,
  stdLow: number, stdHigh: number,
  optLow: number, optHigh: number,
): 'optimal' | 'suboptimal' | 'out_of_range' {
  if (value < stdLow || value > stdHigh) return 'out_of_range';
  const optRange = optHigh - optLow;
  const zone = NEAR_OPTIMAL_ZONE[markerId] ?? NEAR_OPTIMAL_DEFAULT;
  const bufferedLow = optLow - optRange * zone.below;
  const bufferedHigh = optHigh + optRange * zone.above;
  if (value >= bufferedLow && value <= bufferedHigh) return 'optimal';
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

  // FAI (Free Androgen Index): (Total T nmol/L / SHBG nmol/L) × 100
  // Total T is in ng/dL; convert to nmol/L by multiplying by 0.03467. SHBG is already in nmol/L.
  const shbg = panelValues.shbg ? Number(panelValues.shbg.value) : null;
  if (totalT != null && shbg != null && shbg > 0) {
    const totalT_nmol = totalT * 0.03467;
    const fai = (totalT_nmol / shbg) * 100;
    let status: string;
    if (fai < 20) status = 'LOW — significantly reduced androgen availability; SHBG is suppressing bioavailable testosterone';
    else if (fai < 30) status = 'SUBOPTIMAL — below optimal male range; bioavailable androgen fraction is reduced';
    else if (fai <= 150) status = 'OPTIMAL';
    else status = 'HIGH — very low SHBG or elevated total testosterone; free androgen fraction elevated';
    lines.push(`FAI (Free Androgen Index): ${fai.toFixed(1)}% [${status}]`);
  } else {
    lines.push('FAI (Free Androgen Index): not calculable (total testosterone and/or SHBG not submitted)');
  }

  // Non-HDL cholesterol: Total Cholesterol - HDL (both mg/dL)
  const tc = panelValues.total_cholesterol ? Number(panelValues.total_cholesterol.value) : null;
  const hdl = panelValues.hdl ? Number(panelValues.hdl.value) : null;
  if (tc != null && hdl != null) {
    const nonHdl = tc - hdl;
    let status: string;
    if (nonHdl < 130) status = 'OPTIMAL — atherogenic particle burden within low-risk range';
    else if (nonHdl < 160) status = 'SUBOPTIMAL — borderline high atherogenic burden; warrants attention';
    else if (nonHdl < 190) status = 'RISK INDICATOR — elevated atherogenic burden; consistent with increased cardiovascular risk; describe as such, not as a confirmed diagnosis';
    else status = 'HIGH RISK — significantly elevated atherogenic burden; prioritise cardiovascular assessment';
    lines.push(`Non-HDL Cholesterol: ${nonHdl.toFixed(0)} mg/dL [${status}]`);
  } else {
    lines.push('Non-HDL Cholesterol: not calculable (total cholesterol and/or HDL not submitted)');
  }

  // TC/HDL ratio
  if (tc != null && hdl != null && hdl > 0) {
    const tcHdl = tc / hdl;
    let status: string;
    if (tcHdl < 3.5) status = 'OPTIMAL — favourable lipid ratio';
    else if (tcHdl < 4.5) status = 'SUBOPTIMAL — above optimal; warrants lifestyle optimisation';
    else if (tcHdl < 6.0) status = 'RISK INDICATOR — elevated cardiovascular risk ratio; describe as such, not as a confirmed diagnosis';
    else status = 'HIGH RISK — significantly elevated cardiovascular risk ratio; physician assessment warranted';
    lines.push(`TC/HDL Ratio: ${tcHdl.toFixed(2)} [${status}]`);
  } else {
    lines.push('TC/HDL Ratio: not calculable (total cholesterol and/or HDL not submitted)');
  }

  // LDL/HDL ratio
  const ldl = panelValues.ldl ? Number(panelValues.ldl.value) : null;
  if (ldl != null && hdl != null && hdl > 0) {
    const ldlHdl = ldl / hdl;
    let status: string;
    if (ldlHdl < 2.5) status = 'OPTIMAL';
    else if (ldlHdl < 3.5) status = 'SUBOPTIMAL — above optimal atherogenic ratio';
    else if (ldlHdl < 5.0) status = 'RISK INDICATOR — elevated atherogenic ratio; describe as such, not as a confirmed diagnosis';
    else status = 'HIGH RISK — high atherogenic ratio; warrants cardiovascular assessment';
    lines.push(`LDL/HDL Ratio: ${ldlHdl.toFixed(2)} [${status}]`);
  } else {
    lines.push('LDL/HDL Ratio: not calculable (LDL and/or HDL not submitted)');
  }

  // ApoB/ApoA1 ratio (both in mg/dL)
  const apob_r = panelValues.apob ? Number(panelValues.apob.value) : null;
  const apoa1_r = panelValues.apoa1 ? Number(panelValues.apoa1.value) : null;
  if (apob_r != null && apoa1_r != null && apoa1_r > 0) {
    const apobApoa1 = apob_r / apoa1_r;
    let status: string;
    if (apobApoa1 < 0.7) status = 'OPTIMAL — favourable atherogenic particle balance';
    else if (apobApoa1 < 0.9) status = 'SUBOPTIMAL — ApoB particle burden elevated relative to protective ApoA1';
    else if (apobApoa1 < 1.1) status = 'RISK INDICATOR — elevated atherogenic imbalance; one of the strongest CV risk predictors in the literature; describe as such, not as a confirmed diagnosis';
    else status = 'HIGH RISK — significantly elevated atherogenic imbalance; warrants cardiovascular assessment';
    lines.push(`ApoB/ApoA1 Ratio: ${apobApoa1.toFixed(2)} [${status}]`);
  } else {
    lines.push('ApoB/ApoA1 Ratio: not calculable (ApoB and/or ApoA1 not submitted)');
  }

  return lines.join('\n');
}

/* ── Server-side ratio data (value + status) ── */
type RatioData = { value: number; status: 'optimal' | 'suboptimal' | 'out_of_range' };

function computeRatioData(
  panelValues: Record<string, { value: number | string; unit: string }>,
): Record<string, RatioData> {
  const data: Record<string, RatioData> = {};

  const insulin = panelValues.fasting_insulin ? Number(panelValues.fasting_insulin.value) : null;
  const glucose = panelValues.glucose ? Number(panelValues.glucose.value) : null;
  if (insulin != null && glucose != null && insulin > 0 && glucose > 0) {
    const v = (insulin * glucose) / 405;
    data['homa_ir'] = {
      value: Math.round(v * 100) / 100,
      status: v <= 1.5 ? 'optimal' : v <= 2.5 ? 'suboptimal' : 'out_of_range',
    };
  }

  const totalT = panelValues.total_t ? Number(panelValues.total_t.value) : null;
  const estradiol = panelValues.estradiol ? Number(panelValues.estradiol.value) : null;
  if (totalT != null && estradiol != null && estradiol > 0) {
    const v = totalT / estradiol;
    data['te_ratio'] = {
      value: Math.round(v * 10) / 10,
      status: (v >= 10 && v <= 25) ? 'optimal' : 'out_of_range',
    };
  }

  const freeT = panelValues.free_t ? Number(panelValues.free_t.value) : null;
  if (freeT != null && totalT != null && totalT > 0) {
    const v = (freeT / (totalT * 10)) * 100;
    data['pct_free_t'] = {
      value: Math.round(v * 100) / 100,
      status: (v >= 0.8 && v <= 3.5) ? 'optimal' : 'out_of_range',
    };
  }

  // FAI
  const shbg = panelValues.shbg ? Number(panelValues.shbg.value) : null;
  if (totalT != null && shbg != null && shbg > 0) {
    const totalT_nmol = totalT * 0.03467;
    const v = (totalT_nmol / shbg) * 100;
    data['fai'] = {
      value: Math.round(v * 10) / 10,
      status: v < 20 ? 'out_of_range' : v < 30 ? 'suboptimal' : v <= 150 ? 'optimal' : 'out_of_range',
    };
  }

  // Non-HDL, TC/HDL, LDL/HDL
  const tc = panelValues.total_cholesterol ? Number(panelValues.total_cholesterol.value) : null;
  const hdl = panelValues.hdl ? Number(panelValues.hdl.value) : null;
  const ldl = panelValues.ldl ? Number(panelValues.ldl.value) : null;

  if (tc != null && hdl != null) {
    const v = tc - hdl;
    data['non_hdl'] = {
      value: Math.round(v),
      status: v < 130 ? 'optimal' : v < 160 ? 'suboptimal' : 'out_of_range',
    };
  }

  if (tc != null && hdl != null && hdl > 0) {
    const v = tc / hdl;
    data['tc_hdl'] = {
      value: Math.round(v * 100) / 100,
      status: v < 3.5 ? 'optimal' : v < 4.5 ? 'suboptimal' : 'out_of_range',
    };
  }

  if (ldl != null && hdl != null && hdl > 0) {
    const v = ldl / hdl;
    data['ldl_hdl'] = {
      value: Math.round(v * 100) / 100,
      status: v < 2.5 ? 'optimal' : v < 3.5 ? 'suboptimal' : 'out_of_range',
    };
  }

  // ApoB/ApoA1
  const apob_r = panelValues.apob ? Number(panelValues.apob.value) : null;
  const apoa1_r = panelValues.apoa1 ? Number(panelValues.apoa1.value) : null;
  if (apob_r != null && apoa1_r != null && apoa1_r > 0) {
    const v = apob_r / apoa1_r;
    data['apob_apoa1'] = {
      value: Math.round(v * 100) / 100,
      status: v < 0.7 ? 'optimal' : v < 0.9 ? 'suboptimal' : 'out_of_range',
    };
  }

  return data;
}

function getRatioKey(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('homa')) return 'homa_ir';
  if (lower.includes(':e2') || lower.includes('/e2') || lower.includes('te2')) return 'te_ratio';
  if (lower.includes('free androgen') || lower.includes(' fai')) return 'fai';
  if (lower.includes('non-hdl') || lower.includes('non hdl')) return 'non_hdl';
  if (lower.includes('tc/hdl') || lower.includes('tc:hdl') || lower.includes('total cholesterol/hdl')) return 'tc_hdl';
  if (lower.includes('ldl/hdl') || lower.includes('ldl:hdl')) return 'ldl_hdl';
  if (lower.includes('apob/apoa') || lower.includes('apob:apoa') || lower.includes('apob apoa')) return 'apob_apoa1';
  if (lower.includes('free t') || lower.includes('free test')) return 'pct_free_t';
  return null;
}

/* ── JSON repair helper ── */
function repairJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  
  // Try to fix unterminated strings by truncating at the last complete property
  // Find the last complete "key": "value" or "key": number pattern
  const lastCompleteMatch = cleaned.match(/,\s*"[^"]+"\s*:\s*(?:"[^"]*"|\d+(?:\.\d+)?|true|false|null)\s*(?=,|$)/g);
  if (lastCompleteMatch && lastCompleteMatch.length > 0) {
    const lastMatch = lastCompleteMatch[lastCompleteMatch.length - 1];
    const lastIndex = cleaned.lastIndexOf(lastMatch) + lastMatch.length;
    if (lastIndex < cleaned.length) {
      cleaned = cleaned.slice(0, lastIndex);
    }
  }
  
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // Ensure the JSON is properly closed
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  
  for (let i = 0; i < openBraces - closeBraces; i++) cleaned += '}';
  for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += ']';
  
  return cleaned;
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
    temperature: 0.2,
    text: { format: { type: 'json_object' } },
  };

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
  
  // Try multiple possible response formats from OpenAI Responses API
  let raw = '';
  let formatUsed = 'unknown';
  
  // Format 1: Direct output_text
  if (data.output_text) {
    raw = data.output_text;
    formatUsed = 'output_text';
  }
  // Format 2: output array with message type
  else if (data.output && Array.isArray(data.output)) {
    const message = data.output.find((o: { type: string }) => o.type === 'message');
    if (message?.content?.[0]?.text) {
      raw = message.content[0].text;
      formatUsed = 'output[0].content[0].text';
    } else if (message?.content?.text) {
      raw = message.content.text;
      formatUsed = 'output[0].content.text';
    }
  }
  // Format 3: choices array (older completion format fallback)
  else if (data.choices?.[0]?.message?.content) {
    raw = data.choices[0].message.content;
    formatUsed = 'choices[0].message.content';
  }
  // Format 4: content directly as string
  else if (typeof data.content === 'string') {
    raw = data.content;
    formatUsed = 'content';
  }
  
  // Log extraction details
  console.log(`OpenAI response: format=${formatUsed}, rawLength=${raw.length}, model=${model}`);
  
  // Check for truncation indicators
  const message = data.output?.find?.((o: { type: string }) => o.type === 'message');
  const finishReason = message?.status || message?.finish_reason || data.choices?.[0]?.finish_reason;
  if (finishReason && finishReason !== 'completed') {
    console.warn(`OpenAI finish reason: ${finishReason} - response may be incomplete`);
  }
  
  // If still empty, log what we got for debugging
  if (!raw) {
    console.error('Unexpected OpenAI response structure:', JSON.stringify(data).slice(0, 1000));
    throw new Error('Empty response from OpenAI API');
  }
  
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  
  // Try parsing, repair if needed
  try {
    return { parsed: JSON.parse(text), model };
  } catch (parseErr) {
    const repaired = repairJSON(text);
    try {
      return { parsed: JSON.parse(repaired), model };
    } catch (repairErr) {
      // Log the problematic text for debugging - show around the error position
      console.error('JSON parse failed. Original length:', text.length);
      
      // Log the last 100 chars to see exactly where it was cut
      console.error('Last 200 characters of response:', text.slice(-200));
      console.error('Response ends with:', JSON.stringify(text.slice(-50)));
      
      // Try to extract error position from the error message
      const posMatch = String(parseErr).match(/position\s+(\d+)/);
      const errorPos = posMatch ? parseInt(posMatch[1], 10) : text.length;
      
      if (errorPos > 0 && errorPos < text.length) {
        const contextStart = Math.max(0, errorPos - 100);
        const contextEnd = Math.min(text.length, errorPos + 100);
        console.error(`Context around position ${errorPos}:`, text.slice(contextStart, contextEnd));
      }
      
      // Check if this looks like truncation (ends mid-value)
      const endsMidString = text.slice(-100).match(/"[^"]*$/);
      if (endsMidString) {
        console.error('Response appears truncated - ends inside a quoted string');
      }
      
      throw new Error(`JSON parse error at position ${errorPos}: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}. Response length: ${text.length}`);
    }
  }
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

    const { panelValues, phase1: p1Client, phase2: p2Client, phase3: p3Client, symptoms: symClient } = await req.json();

    // Backfill empty/missing profile data from Supabase — never run the LLM blind
    const isEmpty = (obj: unknown) => !obj || typeof obj !== 'object' || Object.keys(obj as object).length === 0;
    let phase1 = p1Client;
    let phase2 = p2Client;
    let phase3 = p3Client;
    let symptoms = symClient;

    if (isEmpty(phase1) || isEmpty(phase2) || isEmpty(phase3) || isEmpty(symptoms)) {
      const [profRes, lifRes, medRes, symRes] = await Promise.all([
        isEmpty(phase1) ? supabase.from('profiles').select('*').eq('user_id', user.id).single() : null,
        isEmpty(phase2) ? supabase.from('lifestyle').select('*').eq('user_id', user.id).single() : null,
        isEmpty(phase3) ? supabase.from('medical_history').select('*').eq('user_id', user.id).single() : null,
        isEmpty(symptoms) ? supabase.from('symptom_assessments').select('symptoms_selected').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single() : null,
      ]);
      if (isEmpty(phase1) && profRes?.data) phase1 = profRes.data;
      if (isEmpty(phase2) && lifRes?.data) phase2 = lifRes.data;
      if (isEmpty(phase3) && medRes?.data) phase3 = medRes.data;
      if (isEmpty(symptoms) && symRes?.data) symptoms = symRes.data;
    }

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
    // Round values to 1 decimal to avoid noisy conversion artifacts (e.g. 591.54942)
    const round1 = (v: unknown) => { const n = Number(v); return isNaN(n) ? v : Math.round(n * 10) / 10; };
    const biomarkerContext = BIOMARKERS.map(b => {
      const val = panelValues[b.id];
      if (!val) return null;
      return `[${b.id}] ${b.name}: ${round1(val.value)} ${val.unit} (standard: ${b.standard_range_low}–${b.standard_range_high}, optimal: ${b.optimal_range_low}–${b.optimal_range_high})`;
    }).filter(Boolean).join('\n');

    // Pre-compute ratios server-side — LLM must not recalculate these
    const computedRatiosContext = computeRatios(panelValues, !!vermeulenNote);

    const bmi = phase1?.weight_kg && phase1?.height_cm
      ? (phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2)).toFixed(1)
      : 'unknown';

    // Compute panel completeness — identify missing recommended markers
    let missingMarkerContext = '';
    if (phase1 && phase2 && phase3) {
      const p3Safe = phase3 ?? { steroid_history: 'never', trt_history: 'never' };
      const excluded = isExcluded(p3Safe);
      const recommendedIds = excluded
        ? TRT_PANEL_IDS
        : (() => {
            const panel = getPersonalizedPanel(phase1, phase2, p3Safe, symptomIds);
            return [...panel.essential, ...panel.recommended].map(m => m.id);
          })();
      const submittedIds = Object.keys(panelValues);
      const missingIds = recommendedIds.filter(id => !submittedIds.includes(id));
      if (missingIds.length > 0) {
        const missingNames = missingIds.map(id => {
          const b = BIOMARKERS.find(bm => bm.id === id);
          return b ? `${b.name} [${b.id}]` : id;
        }).join(', ');
        missingMarkerContext = `\n\nPANEL COMPLETENESS:\nSubmitted ${submittedIds.length} of ${recommendedIds.length} recommended biomarkers.\nMissing from recommended panel: ${missingNames}\nWhen interpreting submitted markers, acknowledge clinically relevant gaps where a missing marker would have clarified or changed the interpretation (e.g. "Without SHBG data, we cannot determine how much of your total testosterone is bioavailable"). Do not add a generic disclaimer - mention each gap only in the specific clinical context where it matters.`;
      }
    }

    const promptParams = {
      riskScore, riskLevel, bmi,
      phase1, phase2, phase3,
      symptomNames, biomarkerContext, vermeulenNote, computedRatiosContext,
      missingMarkerContext,
    };

    // ── Pass 1: Thinking model ──
    const pass1Prompt = buildPass1Prompt(promptParams);
    let pass1 = await callOpenAI(pass1Prompt, apiKey, 'gpt-5.4', 5000);
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

    // Canonical marker ids on persisted JSON (display names break downstream joins)
    normalizePersistedAnalysisMarkers(analysis as Record<string, unknown>);

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
          id, value,
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
            id, value,
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

    // 4. Override key_ratio value + status server-side; remove hallucinated uncalculable ratios
    const ratioData = computeRatioData(panelValues);
    if (Array.isArray(analysis.key_ratios)) {
      analysis.key_ratios = (analysis.key_ratios as Array<Record<string, unknown>>)
        .filter(r => {
          const key = getRatioKey(String(r.name ?? ''));
          // Known ratio but couldn't be computed → LLM hallucinated it, drop it
          if (key && !ratioData[key]) return false;
          return true;
        })
        .map(r => {
          const key = getRatioKey(String(r.name ?? ''));
          if (key && ratioData[key]) {
            return { ...r, value: ratioData[key].value, status: ratioData[key].status };
          }
          return r;
        });
    }

    return NextResponse.json({ ...analysis, _model: pass1.model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
