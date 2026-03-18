'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { User, Ruler, Scale, Dumbbell, Check, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONDITIONS = [
  'Type 2 Diabetes', 'Hypertension', 'Hypothyroidism', 'Sleep Apnea',
  'Depression/Anxiety', 'Cardiovascular Disease', 'Obesity',
  'Testicular Trauma', 'Hemochromatosis', 'Pituitary Disorder',
  'Liver Disease', 'Chronic Kidney Disease',
];

const BODY_TYPES = [
  { level: 1, name: 'Ultra Lean',  bf: 9,  color: '#00E676', markers: 'Abs visible without flexing; visible vascularity.' },
  { level: 2, name: 'Athletic',    bf: 12, color: '#00E676', markers: 'Full 6-pack visible when flexing; muscle separation.' },
  { level: 3, name: 'Defined',     bf: 15, color: '#69F0AE', markers: 'Outline of 4-pack visible; V-taper present.' },
  { level: 4, name: 'Fit',         bf: 18, color: '#FFD740', markers: 'Flat stomach; abs only visible in specific lighting.' },
  { level: 5, name: 'Average',     bf: 22, color: '#FFB300', markers: 'No ab definition; slight love handles forming.' },
  { level: 6, name: 'Heavy',       bf: 28, color: '#FF8C00', markers: 'Visible belly; soft chest; significant love handles.' },
  { level: 7, name: 'Very Heavy',  bf: 33, color: '#FF5252', markers: 'Significant abdominal protrusion.' },
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
    if (!form.age || !form.height_cm || !form.weight_kg) { setError('Please fill in age, height, and weight'); return; }
    if (!form.body_type_level) { setError('Please select your body type'); return; }
    setLoading(true);

    const selectedType = BODY_TYPES.find(t => t.level === form.body_type_level)!;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const data = {
      age: Number(form.age),
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      body_fat_percent: selectedType.bf,
      body_type_level: form.body_type_level,
      high_muscle_override: form.high_muscle,
      unit_preference: form.unit_preference,
      medical_conditions: form.medical_conditions,
    };

    if (user) await supabase.from('profiles').upsert({ user_id: user.id, ...data });
    localStorage.setItem('phase1', JSON.stringify(data));
    router.push('/onboarding/phase2');
  }

  const selectedType = BODY_TYPES.find(t => t.level === form.body_type_level);

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {/* HEADER & PROGRESS */}
      <header className="mb-12">
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-full transition-all duration-500',
              i === 1 ? 'bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.4)]' : 'bg-white/5'
            )} />
          ))}
        </div>
        <div className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-black tracking-[2px] uppercase text-white/40 mb-4">
          Phase 01 / Biometric Intake
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Build Your Profile</h1>
        <p className="text-sm text-white/40">Physical data is used to calibrate hormonal reference ranges for your age and body composition.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* PHYSICAL STATS */}
        <Card className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black tracking-[3px] uppercase text-[#00E676]">Physical Stats</h2>
            <div className="flex p-0.5 bg-black border border-white/10">
              {(['metric', 'imperial'] as const).map(u => (
                <button key={u} type="button"
                  onClick={() => setForm(p => ({ ...p, unit_preference: u }))}
                  className={cn(
                    'px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all',
                    form.unit_preference === u ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'
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
                <Scale size={12} /> Weight ({form.unit_preference === 'metric' ? 'kg' : 'lbs'})
              </label>
              <Input type="number" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} placeholder={form.unit_preference === 'metric' ? '85' : '187'} />
            </div>
          </div>
        </Card>

        {/* BODY TYPE */}
        <section className="space-y-4">
          <div>
            <h2 className="text-[10px] font-black tracking-[3px] uppercase text-[#00E676] mb-1">Visual Composition</h2>
            <p className="text-xs text-white/40">Select the physique that most closely matches your current state.</p>
          </div>

          <div className="grid gap-2">
            {BODY_TYPES.map(bt => {
              const isSelected = form.body_type_level === bt.level;
              return (
                <button key={bt.level} type="button"
                  onClick={() => setForm(p => ({ ...p, body_type_level: bt.level }))}
                  className={cn(
                    'group flex items-center gap-4 p-4 border text-left transition-all duration-200 relative overflow-hidden',
                    isSelected ? 'bg-white/[0.04] border-white/20' : 'bg-transparent border-white/5 hover:border-white/10'
                  )}>
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: bt.color }} />}

                  <div className="flex flex-col min-w-[110px]">
                    <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: bt.color }}>{bt.name}</span>
                    <span className="text-lg font-mono font-black text-white/90">
                      ~{bt.bf}% <span className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">BF</span>
                    </span>
                  </div>

                  <div className="flex-1 text-[11px] text-white/40 leading-tight pr-4">{bt.markers}</div>

                  <div className={cn(
                    'w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-[#00E676] border-[#00E676] text-black' : 'border-white/10 text-transparent'
                  )}>
                    <Check size={14} strokeWidth={4} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Muscle override */}
          <div onClick={() => setForm(p => ({ ...p, high_muscle: !p.high_muscle }))}
            className={cn(
              'cursor-pointer p-4 border transition-all flex items-start gap-4',
              form.high_muscle ? 'bg-[#00E676]/5 border-[#00E676]/30' : 'bg-white/[0.02] border-white/5'
            )}>
            <div className={cn(
              'p-2 border',
              form.high_muscle ? 'border-[#00E676] text-[#00E676]' : 'border-white/10 text-white/20'
            )}>
              <Dumbbell size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-white">Significant Muscle Mass</span>
                {form.high_muscle && <span className="text-[9px] font-black text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5">Active</span>}
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Advanced strength training history (2+ years). High lean mass adjusts androgen receptor density calculations in your final score.
              </p>
            </div>
          </div>

          {form.high_muscle && selectedType && selectedType.level >= 5 && (
            <div className="px-4 py-3 bg-[rgba(0,230,118,0.06)] border border-[rgba(0,230,118,0.2)]">
              <p className="text-xs text-[#00E676]">Muscle override active — body fat risk contribution halved for your score.</p>
            </div>
          )}
        </section>

        {/* MEDICAL CONDITIONS */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-[10px] font-black tracking-[3px] uppercase text-[#00E676] mb-1">Clinical Background</h2>
            <p className="text-xs text-white/40">Select any diagnosed conditions that may influence biomarker baselines.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => {
              const active = form.medical_conditions.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCondition(c)}
                  className={cn(
                    'px-4 py-2 text-[11px] font-bold border transition-all uppercase tracking-wider',
                    active
                      ? 'bg-[#00E676] border-[#00E676] text-black'
                      : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                  )}>
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* ACTIONS */}
        <div className="pt-8 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold uppercase tracking-widest">
              <Info size={14} /> {error}
            </div>
          )}
          <Button type="submit" loading={loading} fullWidth className="py-5 flex items-center justify-center gap-2">
            {!loading && <>Execute Phase 02 <ChevronRight size={16} /></>}
          </Button>
          <p className="text-[9px] text-center text-white/20 uppercase tracking-[2px]">
            Data is used for wellness analysis only · Not medical advice
          </p>
        </div>
      </form>
    </div>
  );
}
