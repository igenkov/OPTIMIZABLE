'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { User, Ruler, Scales, Barbell, Check, CaretRight, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const CONDITIONS = [
  'Type 2 Diabetes', 'Insulin Resistance', 'Hypertension', 'Hypothyroidism', 'Sleep Apnea',
  'Depression/Anxiety', 'Cardiovascular Disease', 'Obesity',
  'Testicular Trauma', 'Hemochromatosis', 'Pituitary Disorder',
  'Liver Disease', 'Chronic Kidney Disease',
];

const BODY_TYPES = [
  { level: 1, name: 'Ultra Lean',  bf: 9,  color: '#C8A2C8', markers: 'Abs visible without flexing; visible vascularity.' },
  { level: 2, name: 'Athletic',    bf: 12, color: '#C8A2C8', markers: 'Full 6-pack visible when flexing; muscle separation.' },
  { level: 3, name: 'Defined',     bf: 15, color: '#69F0AE', markers: 'Outline of 4-pack visible; V-taper present.' },
  { level: 4, name: 'Fit',         bf: 18, color: '#FFD740', markers: 'Flat stomach; abs only visible in specific lighting.' },
  { level: 5, name: 'Average',     bf: 22, color: '#E8C470', markers: 'No ab definition; slight love handles forming.' },
  { level: 6, name: 'Heavy',       bf: 28, color: '#FF8C00', markers: 'Visible belly; soft chest; significant love handles.' },
  { level: 7, name: 'Very Heavy',  bf: 33, color: '#E88080', markers: 'Significant abdominal protrusion.' },
];

export default function Phase1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    age: '', height_cm: '', weight_kg: '',
    unit_preference: 'metric' as 'metric' | 'imperial',
    body_type_level: 0,
    high_muscle: false,
    medical_conditions: [] as string[],
  });

  // Load saved data from localStorage so users can edit previous answers
  useEffect(() => {
    const saved = localStorage.getItem('phase1');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      const isImperial = data.unit_preference === 'imperial';
      setForm({
        age: String(data.age ?? ''),
        height_cm: isImperial ? String(Math.round(data.height_cm / 2.54)) : String(data.height_cm ?? ''),
        weight_kg: isImperial ? String(Math.round(data.weight_kg * 2.2046)) : String(data.weight_kg ?? ''),
        unit_preference: data.unit_preference ?? 'metric',
        body_type_level: data.body_type_level ?? 0,
        high_muscle: data.high_muscle_override ?? false,
        medical_conditions: data.medical_conditions ?? [],
      });
    } catch { /* ignore corrupt data */ }
  }, []);

  // Convert display values in-place when switching units
  function toggleUnit(newUnit: 'metric' | 'imperial') {
    if (newUnit === form.unit_preference) return;
    const toImperial = newUnit === 'imperial';
    const h = Number(form.height_cm);
    const w = Number(form.weight_kg);
    setForm(p => ({
      ...p,
      unit_preference: newUnit,
      height_cm: h ? String(toImperial ? Math.round(h / 2.54) : Math.round(h * 2.54)) : '',
      weight_kg: w ? String(toImperial ? Math.round(w * 2.2046) : Math.round((w / 2.2046) * 10) / 10) : '',
    }));
  }

  function toggleCondition(c: string) {
    setForm(prev => ({
      ...prev,
      medical_conditions: prev.medical_conditions.includes(c)
        ? prev.medical_conditions.filter(x => x !== c)
        : [...prev.medical_conditions, c],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.age || !form.height_cm || !form.weight_kg) { setError('Please fill in age, height, and weight'); return; }
    const ageNum = Number(form.age);
    if (ageNum < 18 || ageNum > 80) { setError('Age must be between 18 and 80'); return; }
    if (!form.body_type_level) { setError('Please select your body type'); return; }
    setLoading(true);

    const selectedType = BODY_TYPES.find(t => t.level === form.body_type_level)!;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isImperial = form.unit_preference === 'imperial';
    const height_cm = isImperial ? Math.round(Number(form.height_cm) * 2.54) : Number(form.height_cm);
    const weight_kg = isImperial ? Math.round(Number(form.weight_kg) / 2.2046 * 10) / 10 : Number(form.weight_kg);

    const data = {
      age: Number(form.age),
      height_cm,
      weight_kg,
      body_fat_percent: selectedType.bf,
      body_type_level: form.body_type_level,
      high_muscle_override: form.high_muscle,
      unit_preference: form.unit_preference,
      medical_conditions: form.medical_conditions,
    };

    if (user) {
      const { error: dbError } = await supabase.from('profiles').upsert({ user_id: user.id, ...data });
      if (dbError) { setError('Failed to save profile. Please try again.'); setLoading(false); return; }
    }
    localStorage.setItem('phase1', JSON.stringify(data));
    router.push('/onboarding/phase2');
  }

  const selectedType = BODY_TYPES.find(t => t.level === form.body_type_level);

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-24 lg:px-6">
      {/* HEADER & PROGRESS */}
      <header className="mb-10 border-b border-white/10 pb-8">
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-sm transition-all duration-500',
              i === 1 ? 'bg-[#C8A2C8] shadow-[0_0_12px_rgba(200,162,200,0.35)]' : 'bg-white/[0.06]'
            )} />
          ))}
        </div>
        <div className="mb-4 inline-flex items-center border border-[#C8A2C8]/25 bg-[#C8A2C8]/10 px-2.5 py-1 text-[10px] font-black tracking-[2px] text-[#C8A2C8] uppercase">
          Phase 01 / Biometric Intake
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Build Your Profile</h1>
        <p className="text-sm text-white/45">Physical data is used to calibrate hormonal reference ranges for your age and body composition.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* PHYSICAL STATS */}
        <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="mb-6 flex items-center justify-between gap-2 sm:gap-4">
            <h2 className="shrink-0 text-[10px] font-black tracking-[3px] text-[#C8A2C8] uppercase">Physical Stats</h2>
            <div className="flex min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 p-0.5 backdrop-blur-sm sm:max-w-none sm:flex-none">
              {(['metric', 'imperial'] as const).map(u => (
                <button key={u} type="button"
                  onClick={() => toggleUnit(u)}
                  className={cn(
                    'min-w-0 flex-1 rounded-[5px] px-2 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all sm:flex-none sm:px-3',
                    form.unit_preference === u ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-white/25 hover:text-white/45'
                  )}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Age
              </label>
              <Input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="25" min="18" max="80" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Ruler size={12} /> Height ({form.unit_preference === 'metric' ? 'cm' : 'in'})
              </label>
              <Input type="number" value={form.height_cm} onChange={e => setForm(p => ({ ...p, height_cm: e.target.value }))} placeholder={form.unit_preference === 'metric' ? '180' : '71'} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Scales size={12} /> Weight ({form.unit_preference === 'metric' ? 'kg' : 'lbs'})
              </label>
              <Input type="number" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} placeholder={form.unit_preference === 'metric' ? '85' : '187'} />
            </div>
          </div>
        </Card>

        {/* BODY TYPE */}
        <section className="space-y-4">
          <div>
            <h2 className="mb-1 text-[10px] font-black tracking-[3px] text-[#C8A2C8] uppercase">Visual Composition</h2>
            <p className="text-xs text-white/45">Select the physique that most closely matches your current state.</p>
          </div>

          <div className="grid gap-2">
            {BODY_TYPES.map(bt => {
              const isSelected = form.body_type_level === bt.level;
              return (
                <button key={bt.level} type="button"
                  onClick={() => setForm(p => ({ ...p, body_type_level: bt.level }))}
                  className={cn(
                    'group relative flex items-center gap-4 overflow-hidden rounded-lg border p-4 text-left transition-all duration-200',
                    isSelected
                      ? 'border-white/[0.18] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                      : 'border-white/[0.07] bg-[#141414]/60 hover:border-white/12 hover:bg-white/[0.02]'
                  )}>
                  {isSelected && <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg" style={{ backgroundColor: bt.color }} />}

                  <div className="flex flex-col min-w-[110px]">
                    <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: bt.color }}>{bt.name}</span>
                    <span className="text-lg font-mono font-black text-white/90">
                      ~{bt.bf}% <span className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">BF</span>
                    </span>
                  </div>

                  <div className="flex-1 text-[11px] text-white/40 leading-tight pr-4">{bt.markers}</div>

                  <div className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border transition-all',
                    isSelected ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black' : 'border-white/12 text-transparent'
                  )}>
                    <Check size={14} strokeWidth={4} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Muscle override */}
          <div className="border-t border-white/[0.07] pt-4">
            <p className="mb-3 text-[9px] font-black uppercase tracking-[2px] text-white/25">Optional modifier</p>
          <div onClick={() => setForm(p => ({ ...p, high_muscle: !p.high_muscle }))}
            className={cn(
              'flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-all',
              form.high_muscle
                ? 'border-[#C8A2C8]/35 bg-[#C8A2C8]/[0.07] shadow-[inset_0_1px_0_rgba(200,162,200,0.12)]'
                : 'border-white/[0.07] bg-[#141414]/40 hover:border-white/12'
            )}>
            <div className={cn(
              'rounded-md border p-2',
              form.high_muscle ? 'border-[#C8A2C8] text-[#C8A2C8]' : 'border-white/12 text-white/25'
            )}>
              <Barbell size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-white">Significant Muscle Mass</span>
                {form.high_muscle && <span className="rounded-md bg-[#C8A2C8]/12 px-1.5 py-0.5 text-[9px] font-black text-[#C8A2C8]">Active</span>}
              </div>
              <p className="text-[11px] leading-relaxed text-white/45">
                Advanced strength training history (2+ years). High lean mass adjusts androgen receptor density calculations in your final score.
              </p>
            </div>
          </div>

          {form.high_muscle && selectedType && selectedType.level >= 5 && (
            <div className="mt-2 rounded-lg border border-[rgba(200,162,200,0.22)] bg-[rgba(200,162,200,0.06)] px-4 py-3">
              <p className="text-xs text-[#C8A2C8]">Muscle override active — body fat risk contribution halved for your score.</p>
            </div>
          )}
          </div>
        </section>

        {/* MEDICAL CONDITIONS */}
        <section className="space-y-4 pt-1">
          <div>
            <h2 className="mb-1 text-[10px] font-black tracking-[3px] text-[#C8A2C8] uppercase">Clinical Background</h2>
            <p className="text-xs text-white/45">Select any diagnosed conditions that may influence biomarker baselines.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button"
              onClick={() => setForm(p => ({ ...p, medical_conditions: [] }))}
              className={cn(
                'rounded-lg border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all',
                form.medical_conditions.length === 0
                  ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_8px_24px_rgba(200,162,200,0.18)]'
                  : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18 hover:text-white/60'
              )}>
              None
            </button>
            {CONDITIONS.map(c => {
              const active = form.medical_conditions.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCondition(c)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all',
                    active
                      ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                      : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18 hover:text-white/60'
                  )}>
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* ACTIONS */}
        <div className="space-y-4 border-t border-white/[0.07] pt-8">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] p-3 text-[11px] font-bold tracking-widest text-red-400 uppercase">
              <Info size={14} /> {error}
            </div>
          )}
          <Button type="submit" loading={loading} fullWidth className="flex items-center justify-center gap-2 rounded-lg py-5 shadow-[0_10px_36px_rgba(200,162,200,0.2)]">
            {!loading && <>Execute Phase 02 <CaretRight size={16} /></>}
          </Button>
          <p className="text-[9px] text-center text-white/20 uppercase tracking-[2px]">
            Data is used for wellness analysis only · Not medical advice
          </p>
        </div>
      </form>
    </div>
  );
}
