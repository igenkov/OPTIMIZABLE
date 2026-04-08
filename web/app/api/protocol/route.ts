import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildProtocolPrompt } from '@/lib/prompts/protocol';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phase1: p1Client, phase2: p2Client, phase3: p3Client, symptoms: symClient, analysis } = await req.json();

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });

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

    const FORBIDDEN = ['aggressive', 'severe', 'bottlenecked', 'disastrous', 'warrior', 'biohack'];

    async function callOpenAI(model: string): Promise<{ protocol: Record<string, unknown>; model: string }> {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          input: prompt,
          max_output_tokens: 4000,
          temperature: 0.3,
          text: { format: { type: 'json_object' } },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error (${model}): ${err}`);
      }
      const data = await res.json();
      const raw = data.output_text ?? data.output?.find((o: { type: string }) => o.type === 'message')?.content?.[0]?.text ?? '';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return { protocol: JSON.parse(text), model };
    }

    let result = await callOpenAI('gpt-5.4');
    if (FORBIDDEN.some(w => JSON.stringify(result.protocol).toLowerCase().includes(w))) {
      result = await callOpenAI('gpt-5.4-pro');
    }

    const { protocol, model } = result;

    // Normalize string array fields — LLM occasionally returns objects instead
    // of plain strings (e.g. {directive: "...", reason: "..."}) which crashes React
    const toStringArray = (val: unknown): string[] => {
      if (!Array.isArray(val)) return [];
      return val.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          // Try common keys the model uses when it returns objects
          const str = o.directive ?? o.text ?? o.action ?? o.recommendation ?? o.habit ?? o.content;
          if (typeof str === 'string') return str;
          return Object.values(o).filter(v => typeof v === 'string').join(' — ');
        }
        return String(item);
      }).filter(Boolean);
    };

    const normalized = {
      ...protocol,
      eating:   toStringArray(protocol.eating),
      exercise: toStringArray(protocol.exercise),
      sleep:    toStringArray(protocol.sleep),
      stress:   toStringArray(protocol.stress),
      habits:   toStringArray(protocol.habits),
    };

    return NextResponse.json({ ...normalized, _model: model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
