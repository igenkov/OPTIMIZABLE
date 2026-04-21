'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClipboardText, CaretRight, ArrowRight, WarningCircle } from '@phosphor-icons/react';

// ── Types ────────────────────────────────────────────────────────────────────
interface SymptomScore { id: string; label: string; before: number; now: number }
interface SupplementItem { name: string; dose: string; adherence: 'always' | 'mostly' | 'sometimes' | 'never' }
interface DirectiveItem { text: string; adherence: 'always' | 'mostly' | 'sometimes' | 'never' }
interface SubjectiveScores { energy: number; mood: number; libido: number; sleep_quality: number; mental_clarity: number; stress: number }

const SYMPTOM_OPTIONS = [
  { id: 'low_energy',     label: 'Low Energy' },
  { id: 'poor_sleep',     label: 'Poor Sleep' },
  { id: 'low_libido',     label: 'Low Libido' },
  { id: 'brain_fog',      label: 'Brain Fog' },
  { id: 'mood_swings',    label: 'Mood Instability' },
  { id: 'weight_gain',    label: 'Unexplained Weight Gain' },
  { id: 'afternoon_crash', label: 'Afternoon Crash' },
  { id: 'poor_recovery',  label: 'Poor Recovery' },
  { id: 'hair_loss',      label: 'Hair Thinning' },
  { id: 'anxiety',        label: 'Anxiety' },
];

const ADHERENCE_OPTIONS = [
  { val: 'always' as const,    label: 'Always' },
  { val: 'mostly' as const,    label: 'Mostly' },
  { val: 'sometimes' as const, label: 'Sometimes' },
  { val: 'never' as const,     label: 'Never' },
];

// ── Color slider (reused from wellbeing) ─────────────────────────────────────
function ColorSlider({ value, onChange, color, min = 1, max = 10 }: {
  value: number; onChange: (v: number) => void; color: string; min?: number; max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex items-center h-4">
      <div className="absolute w-full h-[2px] bg-white/5 rounded-full" />
      <div className="absolute h-[2px] rounded-full transition-all duration-150 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}50` }} />
      <input type="range" min={min} max={max} step="1" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 outline-none
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-black
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-black" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InquiryPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [currentDay, setCurrentDay] = useState(0);

  // Step 1: Symptom reassessment
  const [symptoms, setSymptoms] = useState<SymptomScore[]>([]);

  // Step 2: Supplement adherence
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);

  // Step 3: Directive adherence
  const [directives, setDirectives] = useState<DirectiveItem[]>([]);

  // Step 4: Subjective scores (retrospective averages)
  const [scores, setScores] = useState<SubjectiveScores>({
    energy: 5, mood: 5, libido: 5, sleep_quality: 5, mental_clarity: 5, stress: 5,
  });

  // Step 5: New symptoms + notes
  const [newSymptoms, setNewSymptoms] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Get active cycle
      const { data: cycle } = await supabase
        .from('optimization_cycles').select('id, start_date')
        .eq('user_id', user.id).eq('status', 'active').single();
      if (!cycle) { router.push('/protocol'); return; }
      setCycleId(cycle.id);

      const startDate = new Date(cycle.start_date);
      const day = Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1;
      setCurrentDay(day);

      // Check if already submitted
      const { data: existing } = await supabase
        .from('cycle_inquiries').select('id')
        .eq('cycle_id', cycle.id).limit(1).single();
      if (existing) { router.push('/lab/generate-protocol'); return; }

      // Load original symptoms from onboarding
      const { data: symData } = await supabase
        .from('symptom_assessments').select('symptoms_selected')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      const originalIds: string[] = (symData?.symptoms_selected as string[]) ?? [];
      const symScores = SYMPTOM_OPTIONS
        .filter(s => originalIds.includes(s.id))
        .map(s => ({ id: s.id, label: s.label, before: 7, now: 5 }));
      setSymptoms(symScores);

      // Load Foundation protocol for supplement + directive lists
      const { data: proto } = await supabase
        .from('protocol_reports').select('supplements, eating, exercise, sleep, stress, habits')
        .eq('user_id', user.id).eq('phase', 'foundation')
        .order('created_at', { ascending: false }).limit(1).single();

      if (proto) {
        const suppItems = (proto.supplements as { name: string; dose: string }[] ?? []).map(s => ({
          name: s.name, dose: s.dose, adherence: 'mostly' as const,
        }));
        setSupplements(suppItems);

        const allDirectives = [
          ...(proto.eating as string[] ?? []),
          ...(proto.exercise as string[] ?? []),
          ...(proto.sleep as string[] ?? []),
          ...(proto.stress as string[] ?? []),
          ...(proto.habits as string[] ?? []),
        ].map(text => ({ text, adherence: 'mostly' as const }));
        setDirectives(allDirectives);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit() {
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const symptomReassessment: Record<string, { before: number; now: number }> = {};
    for (const s of symptoms) symptomReassessment[s.id] = { before: s.before, now: s.now };

    const supplementAdherence: Record<string, string> = {};
    for (const s of supplements) supplementAdherence[s.name] = s.adherence;

    const directiveAdherence: Record<string, string> = {};
    for (const d of directives) directiveAdherence[d.text.slice(0, 80)] = d.adherence;

    const { error: err } = await supabase.from('cycle_inquiries').insert({
      user_id: user.id,
      cycle_id: cycleId,
      symptom_reassessment: symptomReassessment,
      supplement_adherence: supplementAdherence,
      directive_adherence: directiveAdherence,
      subjective_scores: scores,
      new_symptoms: newSymptoms || null,
      notes: notes || null,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    router.push('/lab/generate-protocol');
  }

  if (loading) {
    return (
      <div className="px-6 py-6 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#C8A2C8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = [
    { label: 'Symptom Re-assessment', desc: 'Compare to your baseline' },
    { label: 'Supplement Adherence', desc: 'Per-item consistency' },
    { label: 'Directive Adherence', desc: 'Lifestyle changes' },
    { label: 'Subjective Scores', desc: 'Retrospective averages' },
    { label: 'New Symptoms & Notes', desc: 'Anything that changed' },
  ];

  return (
    <div className="px-4 lg:px-8 py-5 lg:py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6 pb-5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardText size={14} className="text-[#C8A2C8]" />
          <span className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-[3px]">Day {currentDay} - 45-Day Inquiry</span>
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Protocol Assessment</h1>
        <p className="text-[11px] text-[#4A4A4A] mt-1">
          This assessment captures how you responded to the Foundation phase. Your answers generate the Calibration protocol.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {steps.map((s, i) => (
          <button key={i} type="button" onClick={() => i <= step && setStep(i)}
            className="flex-1 group">
            <div className="h-1 mb-1.5 transition-all"
              style={{ background: i <= step ? '#C8A2C8' : 'rgba(255,255,255,0.06)' }} />
            <div className="text-[8px] font-bold uppercase tracking-wide transition-colors"
              style={{ color: i === step ? '#C8A2C8' : i < step ? '#4A4A4A' : '#2A2A2A' }}>
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* Step 0: Symptom re-assessment */}
      {step === 0 && (
        <Card>
          <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-[3px] mb-1">{steps[0].label}</div>
          <p className="text-[11px] text-[#4A4A4A] mb-5">
            At the start you reported these concerns. How would you rate each now?
          </p>
          {symptoms.length === 0 ? (
            <p className="text-[11px] text-[#4A4A4A]">No symptoms were recorded during onboarding.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {symptoms.map((s, i) => (
                <div key={s.id} className="pb-4 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">{s.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] text-[#4A4A4A]">Before: {s.before}/10</span>
                      <span className="text-[10px] font-bold text-[#C8A2C8]">Now: {s.now}/10</span>
                    </div>
                  </div>
                  <ColorSlider value={s.now} onChange={v => {
                    const next = [...symptoms];
                    next[i] = { ...next[i], now: v };
                    setSymptoms(next);
                  }} color="#C8A2C8" />
                  <div className="flex justify-between text-[9px] text-[#3A3A3A] mt-1"><span>Resolved</span><span>Severe</span></div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep(1)}>
              <span className="flex items-center gap-2">Continue <CaretRight size={14} /></span>
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Supplement adherence */}
      {step === 1 && (
        <Card>
          <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-[3px] mb-1">{steps[1].label}</div>
          <p className="text-[11px] text-[#4A4A4A] mb-5">
            How consistently did you take each prescribed supplement?
          </p>
          {supplements.length === 0 ? (
            <p className="text-[11px] text-[#4A4A4A]">No supplements were prescribed in the Foundation protocol.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {supplements.map((s, i) => (
                <div key={i} className="pb-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[11px] font-bold text-white uppercase tracking-tight">{s.name}</span>
                      <span className="text-[10px] text-[#4A4A4A] ml-2">{s.dose}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ADHERENCE_OPTIONS.map(opt => (
                      <button key={opt.val} type="button"
                        onClick={() => {
                          const next = [...supplements];
                          next[i] = { ...next[i], adherence: opt.val };
                          setSupplements(next);
                        }}
                        className={`py-1.5 text-[10px] font-bold border transition-all ${
                          s.adherence === opt.val
                            ? 'border-[#C8A2C8] text-[#C8A2C8] bg-[rgba(200,162,200,0.08)]'
                            : 'border-[rgba(255,255,255,0.07)] text-[#4A4A4A] hover:border-[rgba(255,255,255,0.12)]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)}>
              <span className="flex items-center gap-2">Continue <CaretRight size={14} /></span>
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Directive adherence */}
      {step === 2 && (
        <Card>
          <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-[3px] mb-1">{steps[2].label}</div>
          <p className="text-[11px] text-[#4A4A4A] mb-5">
            How well did you follow each lifestyle directive?
          </p>
          {directives.length === 0 ? (
            <p className="text-[11px] text-[#4A4A4A]">No lifestyle directives were prescribed.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {directives.map((d, i) => (
                <div key={i} className="pb-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <p className="text-[11px] text-[#9A9A9A] mb-2 leading-relaxed">{d.text}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ADHERENCE_OPTIONS.map(opt => (
                      <button key={opt.val} type="button"
                        onClick={() => {
                          const next = [...directives];
                          next[i] = { ...next[i], adherence: opt.val };
                          setDirectives(next);
                        }}
                        className={`py-1.5 text-[10px] font-bold border transition-all ${
                          d.adherence === opt.val
                            ? 'border-[#C8A2C8] text-[#C8A2C8] bg-[rgba(200,162,200,0.08)]'
                            : 'border-[rgba(255,255,255,0.07)] text-[#4A4A4A] hover:border-[rgba(255,255,255,0.12)]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>
              <span className="flex items-center gap-2">Continue <CaretRight size={14} /></span>
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Subjective scores */}
      {step === 3 && (
        <Card>
          <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-[3px] mb-1">{steps[3].label}</div>
          <p className="text-[11px] text-[#4A4A4A] mb-5">
            Rate your average experience over the past 45 days (not just today).
          </p>
          <div className="flex flex-col gap-4">
            {([
              { key: 'energy' as const,        label: 'Energy',         color: '#C8A2C8' },
              { key: 'mood' as const,          label: 'Mood',           color: '#64B5F6' },
              { key: 'libido' as const,        label: 'Libido',         color: '#E88080' },
              { key: 'sleep_quality' as const, label: 'Sleep Quality',  color: '#E8C470' },
              { key: 'mental_clarity' as const,label: 'Mental Clarity', color: '#CE93D8' },
              { key: 'stress' as const,        label: 'Stress Level',   color: '#9A9A9A' },
            ]).map(m => (
              <div key={m.key} className="pb-4 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-white">{m.label}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: m.color }}>
                    {scores[m.key]}<span className="text-[10px] text-[#4A4A4A] font-normal">/10</span>
                  </span>
                </div>
                <ColorSlider value={scores[m.key]} onChange={v => setScores(prev => ({ ...prev, [m.key]: v }))} color={m.color} />
                <div className="flex justify-between text-[9px] text-[#3A3A3A] mt-1"><span>1</span><span>10</span></div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)}>
              <span className="flex items-center gap-2">Continue <CaretRight size={14} /></span>
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: New symptoms + notes */}
      {step === 4 && (
        <Card>
          <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-[3px] mb-1">{steps[4].label}</div>
          <p className="text-[11px] text-[#4A4A4A] mb-5">
            Any new symptoms, side effects, or significant changes since starting the protocol?
          </p>
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#E0E0E0] mb-2">New Symptoms or Side Effects</div>
            <textarea value={newSymptoms} onChange={e => setNewSymptoms(e.target.value)}
              placeholder="e.g. occasional headaches in week 3, slight nausea after zinc..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[#1f1f1f] border border-[rgba(255,255,255,0.07)] text-white placeholder-[#4A4A4A] focus:border-[#C8A2C8] outline-none resize-none" />
          </div>
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#E0E0E0] mb-2">Additional Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anything else relevant - stress events, travel, injuries, major life changes..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[#1f1f1f] border border-[rgba(255,255,255,0.07)] text-white placeholder-[#4A4A4A] focus:border-[#C8A2C8] outline-none resize-none" />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 flex gap-2 mb-4">
              <WarningCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-500 font-bold">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={handleSubmit} loading={saving}>
              <span className="flex items-center gap-2">Submit & Generate Calibration Protocol <ArrowRight size={14} /></span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
