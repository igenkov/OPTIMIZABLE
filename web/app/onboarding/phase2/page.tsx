'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Moon, Wine, Dumbbell, Heart, ChevronRight, Info, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

function SliderInput({ value, min, max, step, onChange, color = '#C8A2C8' }: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex items-center h-5">
      {/* Track */}
      <div className="absolute w-full h-[3px] bg-white/10 rounded-full" />
      {/* Fill */}
      <div className="absolute h-[3px] rounded-full transition-all duration-150"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
      {/* Input */}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 outline-none
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-[3px]
          [&::-webkit-slider-thumb]:border-black
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.3)]
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
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
    <div className="flex flex-col gap-3 py-4 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn(
              'h-10 border text-xs font-black transition-all',
              value === n
                ? 'bg-[#C8A2C8] border-[#C8A2C8] text-black shadow-[0_0_15px_rgba(200,162,200,0.2)]'
                : 'bg-white/5 border-white/5 text-white/20 hover:border-white/20'
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
    <div className="flex flex-col gap-3 py-4 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cn(
              'px-3 py-1.5 border text-[10px] font-bold transition-all uppercase tracking-wider',
              value === o.value
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-white/5 text-white/20 hover:text-white/40'
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
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('lifestyle').upsert({ user_id: user.id, ...form });
    localStorage.setItem('phase2', JSON.stringify(form));
    router.push('/onboarding/phase3');
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {/* HEADER & PROGRESS */}
      <header className="mb-12">
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-full transition-all duration-500',
              i <= 2 ? 'bg-[#C8A2C8]' : 'bg-white/5',
              i === 2 && 'shadow-[0_0_8px_rgba(200,162,200,0.4)]'
            )} />
          ))}
        </div>
        <div className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-black tracking-[2px] uppercase text-white/40 mb-4">
          Phase 02 / Lifestyle Assessment
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Behavioral Variables</h1>
        <p className="text-sm text-white/40">Environmental and lifestyle factors can cause a significant reduction in your hormonal output.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SLEEP & RECOVERY */}
        <Card className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-6 text-[#C8A2C8]">
            <Moon size={16} />
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
        <Card className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-6 text-[#C8A2C8]">
            <Wine size={16} />
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
              'mt-6 p-4 border transition-all flex items-center justify-between cursor-pointer',
              form.keto_diet ? 'bg-[#C8A2C8]/5 border-[#C8A2C8]/30' : 'bg-transparent border-white/5 opacity-40'
            )}>
            <div className="flex gap-4 items-center">
              <Utensils size={18} className={form.keto_diet ? 'text-[#C8A2C8]' : 'text-white'} />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest">Chronic Keto / Low-Carb</div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Strict adherence for 3+ months</div>
              </div>
            </div>
            <div className={cn('w-2 h-2 rounded-full', form.keto_diet ? 'bg-[#C8A2C8] animate-pulse' : 'bg-white/10')} />
          </div>
        </Card>

        {/* ACTIVITY & STRESS */}
        <Card className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-6 text-[#C8A2C8]">
            <Dumbbell size={16} />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Activity & CNS Stress</h2>
          </div>

          <SegmentedControl label="Training Frequency" value={form.exercise_frequency} onChange={v => set('exercise_frequency', v)}
            options={[{ label: 'None', value: 'none' }, { label: '1-2x', value: '1-2x' }, { label: '3-4x', value: '3-4x' }, { label: '5-6x', value: '5-6x' }, { label: 'Daily', value: 'daily' }]} />

          <div className="py-4 space-y-3 border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Exercise Modalities</span>
            <div className="flex flex-wrap gap-2">
              {['Weightlifting', 'Running', 'HIIT', 'Cycling', 'Swimming', 'Sports', 'Yoga', 'Walking'].map(t => {
                const active = form.exercise_types.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleExercise(t)}
                    className={cn(
                      'px-3 py-1.5 border text-[10px] font-bold transition-all uppercase',
                      active ? 'bg-[#C8A2C8] border-[#C8A2C8] text-black' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                    )}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="py-4 space-y-3 border-b border-white/5">
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
        <Card className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-6 text-[#C8A2C8]">
            <Heart size={16} />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Endocrine Indicators</h2>
          </div>

          <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 mb-6">
            <Info size={14} className="text-white/40 shrink-0" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 leading-tight">Private data used strictly for hormonal calibration. Never shared.</p>
          </div>

          <SegmentedControl label="Morning Erections (Last 4 Weeks)" value={form.morning_erection_frequency} onChange={v => set('morning_erection_frequency', v)}
            options={[{ label: 'Daily', value: 'daily' }, { label: '4-6x/wk', value: '4-6x_week' }, { label: '2-3x/wk', value: '2-3x_week' }, { label: 'Rarely', value: 'rarely' }, { label: 'Never', value: 'never' }]} />
          <RatingGrid label="Subjective Libido" value={form.libido_rating} onChange={v => set('libido_rating', v)} />
          <RatingGrid label="Erectile Function" value={form.erectile_rating} onChange={v => set('erectile_rating', v)} />
        </Card>

        {/* ACTIONS */}
        <div className="pt-4">
          <Button type="submit" loading={loading} fullWidth className="py-5 flex items-center justify-center gap-2">
            {!loading && <>Execute Phase 03 <ChevronRight size={16} /></>}
          </Button>
        </div>
      </form>
    </div>
  );
}
