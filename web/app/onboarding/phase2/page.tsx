'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Moon, Wine, Barbell, Heart, CaretRight, Info, ForkKnife } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

function SliderInput({ value, min, max, step, onChange, color = '#C8A2C8' }: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex items-center h-5">
      {/* Track */}
      <div className="absolute h-[3px] w-full rounded-sm bg-white/10" />
      {/* Fill */}
      <div className="absolute h-[3px] rounded-sm transition-all duration-150"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
      {/* Input */}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 outline-none
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-md
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-[3px]
          [&::-webkit-slider-thumb]:border-black
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.3)]
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-md
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-[3px]
          [&::-moz-range-thumb]:border-black
          [&::-moz-range-thumb]:outline-none"
      />
    </div>
  );
}

function RatingGrid({ label, value, onChange, max = 5 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.07] py-4 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn(
              'h-10 rounded-lg border text-xs font-black transition-all',
              value === n
                ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18'
            )}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }: { label: string; options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.07] py-4 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all',
              value === o.value
                ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18 hover:text-white/60'
            )}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Phase2Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    avg_sleep_hours: 7,
    sleep_quality: 3,
    smoking_status: 'never',
    beer_frequency: 'never',
    spirits_wine_frequency: 'never',
    coffee_per_day: '1',
    sugar_consumption: 'moderate',
    keto_diet: false,
    exercise_frequency: '3-4x',
    exercise_types: [] as string[],
    sedentary_hours: 8,
    stress_level: 3,
    morning_erection_frequency: '4-6x_week',
    libido_rating: 3,
    erectile_rating: 3,
  });

  // Pre-populate from localStorage so users can edit previous answers
  useEffect(() => {
    const saved = localStorage.getItem('phase2');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setForm(prev => ({ ...prev, ...data }));
    } catch { /* ignore corrupt data */ }
  }, []);

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleExercise(t: string) {
    setForm(p => ({
      ...p,
      exercise_types: p.exercise_types.includes(t)
        ? p.exercise_types.filter(x => x !== t)
        : [...p.exercise_types, t],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: dbError } = await supabase.from('lifestyle').upsert({ user_id: user.id, ...form });
      if (dbError) { setError('Failed to save data. Please try again.'); setLoading(false); return; }
    }
    localStorage.setItem('phase2', JSON.stringify(form));
    router.push('/onboarding/phase3');
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-24 lg:px-6">

      {/* HEADER & PROGRESS */}
      <header className="mb-10 border-b border-white/10 pb-8">
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-sm transition-all duration-500',
              i <= 2 ? 'bg-[#C8A2C8]' : 'bg-white/[0.06]',
              i === 2 && 'shadow-[0_0_12px_rgba(200,162,200,0.35)]'
            )} />
          ))}
        </div>
        <div className="mb-4 inline-flex items-center border border-[#C8A2C8]/25 bg-[#C8A2C8]/10 px-2.5 py-1 text-[10px] font-black tracking-[2px] text-[#C8A2C8] uppercase">
          Phase 02 / Lifestyle Assessment
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Behavioral Variables</h1>
        <p className="text-sm text-white/45">Environmental and lifestyle factors can cause a significant reduction in your hormonal output.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SLEEP & RECOVERY */}
        <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="mb-6 flex items-center gap-2 text-[#C8A2C8]">
            <Moon size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Sleep & Recovery</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Duration (Avg/Night)</span>
                <span className="text-xl font-mono font-black text-[#C8A2C8]">{form.avg_sleep_hours}h</span>
              </div>
              <SliderInput min={4} max={10} step={0.5} value={form.avg_sleep_hours} onChange={v => set('avg_sleep_hours', v)} />
            </div>
            <RatingGrid label="Sleep Quality (Restfulness)" value={form.sleep_quality} onChange={v => set('sleep_quality', v)} />
          </div>
        </Card>

        {/* HABITUAL INPUTS */}
        <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="mb-6 flex items-center gap-2 text-[#C8A2C8]">
            <Wine size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Habitual Inputs</h2>
          </div>

          <SegmentedControl label="Smoking Status" value={form.smoking_status} onChange={v => set('smoking_status', v)}
            options={[{ label: 'Never', value: 'never' }, { label: 'Former', value: 'former' }, { label: 'Occasional', value: 'occasional' }, { label: 'Daily', value: 'daily' }]} />
          <SegmentedControl label="Ethanol: Beer / Cider" value={form.beer_frequency} onChange={v => set('beer_frequency', v)}
            options={[{ label: 'Never', value: 'never' }, { label: '1-2x/wk', value: '1-2x_week' }, { label: '3x/wk', value: '3x_week' }, { label: '4-6x/wk', value: '4-6x_week' }, { label: 'Daily', value: 'daily' }]} />
          <SegmentedControl label="Ethanol: Spirits / Wine" value={form.spirits_wine_frequency} onChange={v => set('spirits_wine_frequency', v)}
            options={[{ label: 'Never', value: 'never' }, { label: '1-2x/wk', value: '1-2x_week' }, { label: '3x/wk', value: '3x_week' }, { label: '4-6x/wk', value: '4-6x_week' }, { label: 'Daily', value: 'daily' }]} />
          <SegmentedControl label="Caffeine Units / Day" value={form.coffee_per_day} onChange={v => set('coffee_per_day', v)}
            options={[{ label: 'None', value: 'none' }, { label: '1', value: '1' }, { label: '2-3', value: '2-3' }, { label: '4-5', value: '4-5' }, { label: '6+', value: '6+' }]} />
          <SegmentedControl label="Refined Sugar Intake" value={form.sugar_consumption} onChange={v => set('sugar_consumption', v)}
            options={[{ label: 'Rarely', value: 'rarely' }, { label: 'Moderate', value: 'moderate' }, { label: 'Frequent', value: 'frequent' }, { label: 'Extreme', value: 'very_high' }]} />

          <div onClick={() => set('keto_diet', !form.keto_diet)}
            className={cn(
              'mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-all',
              form.keto_diet
                ? 'border-[#C8A2C8]/35 bg-[#C8A2C8]/[0.07] shadow-[inset_0_1px_0_rgba(200,162,200,0.12)]'
                : 'border-white/[0.07] bg-[#141414]/40 opacity-40 hover:opacity-60'
            )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                'rounded-md border p-2',
                form.keto_diet ? 'border-[#C8A2C8] text-[#C8A2C8]' : 'border-white/12 text-white'
              )}>
                <ForkKnife size={18} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest">Chronic Keto / Low-Carb</div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Strict adherence for 3+ months</div>
              </div>
            </div>
            <div className={cn('size-2 shrink-0 rounded-md', form.keto_diet ? 'animate-pulse bg-[#C8A2C8]' : 'bg-white/10')} />
          </div>
        </Card>

        {/* ACTIVITY & STRESS */}
        <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="mb-6 flex items-center gap-2 text-[#C8A2C8]">
            <Barbell size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Pulse & CNS Stress</h2>
          </div>

          <SegmentedControl label="Training Frequency" value={form.exercise_frequency} onChange={v => set('exercise_frequency', v)}
            options={[{ label: 'None', value: 'none' }, { label: '1-2x', value: '1-2x' }, { label: '3-4x', value: '3-4x' }, { label: '5-6x', value: '5-6x' }, { label: 'Daily', value: 'daily' }]} />

          <div className="space-y-3 border-b border-white/[0.07] py-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Exercise Modalities</span>
            <div className="flex flex-wrap gap-2">
              {['Weightlifting', 'Running', 'HIIT', 'Cycling', 'Swimming', 'Sports', 'Yoga', 'Walking'].map(t => {
                const active = form.exercise_types.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleExercise(t)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase transition-all',
                      active
                        ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                        : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18'
                    )}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 border-b border-white/[0.07] py-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sedentary Hours / Day</span>
              <span className={cn(
                'text-xl font-mono font-black',
                form.sedentary_hours >= 10 ? 'text-[#E88080]' : form.sedentary_hours >= 7 ? 'text-[#E8C470]' : 'text-[#C8A2C8]'
              )}>{form.sedentary_hours}h</span>
            </div>
            <SliderInput min={0} max={16} step={1} value={form.sedentary_hours} onChange={v => set('sedentary_hours', v)}
              color={form.sedentary_hours >= 10 ? '#E88080' : form.sedentary_hours >= 7 ? '#E8C470' : '#C8A2C8'} />
          </div>

          <RatingGrid label="Subjective Stress (Work/Life)" value={form.stress_level} onChange={v => set('stress_level', v)} />
        </Card>

        {/* ENDOCRINE INDICATORS */}
        <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="mb-6 flex items-center gap-2 text-[#C8A2C8]">
            <Heart size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Endocrine Indicators</h2>
          </div>

          <div className="mb-6 flex items-start gap-2 rounded-lg border border-white/[0.1] bg-black/30 p-3 backdrop-blur-sm">
            <Info size={14} className="mt-0.5 shrink-0 text-white/40" aria-hidden />
            <p className="text-[9px] font-bold uppercase leading-tight tracking-widest text-white/45">Private data used strictly for hormonal calibration. Never shared.</p>
          </div>

          <SegmentedControl label="Morning Erections (Last 4 Weeks)" value={form.morning_erection_frequency} onChange={v => set('morning_erection_frequency', v)}
            options={[{ label: 'Daily', value: 'daily' }, { label: '4-6x/wk', value: '4-6x_week' }, { label: '2-3x/wk', value: '2-3x_week' }, { label: 'Rarely', value: 'rarely' }, { label: 'Never', value: 'never' }]} />
          <RatingGrid label="Subjective Libido" value={form.libido_rating} onChange={v => set('libido_rating', v)} />
          <RatingGrid label="Erectile Function" value={form.erectile_rating} onChange={v => set('erectile_rating', v)} />
        </Card>

        {/* ACTIONS */}
        <div className="space-y-4 border-t border-white/[0.07] pt-8">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] p-3 text-[11px] font-bold tracking-widest text-red-400 uppercase">
              <Info size={14} aria-hidden /> {error}
            </div>
          )}
          <Button type="submit" loading={loading} fullWidth className="flex items-center justify-center gap-2 rounded-lg py-5 shadow-[0_10px_36px_rgba(200,162,200,0.2)]">
            {!loading && <>Execute Phase 03 <CaretRight size={16} aria-hidden /></>}
          </Button>
        </div>
      </form>
    </div>
  );
}
