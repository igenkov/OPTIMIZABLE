'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SelectOption = { label: string; value: string };

function Toggle({ label, sublabel, value, onChange }: { label: string; sublabel?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)]">
      <div>
        <span className="text-sm text-[#E0E0E0]">{label}</span>
        {sublabel && <div className="text-xs text-[#4A4A4A] mt-0.5">{sublabel}</div>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ml-4 ${value ? 'bg-[#00E676]' : 'bg-[#1f1f1f] border border-[rgba(255,255,255,0.1)]'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SelectRow({ label, options, value, onChange }: { label: string; options: SelectOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-xs border transition-colors
              ${value === o.value ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A] hover:border-[rgba(255,255,255,0.2)]'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RatingRow({ label, value, onChange, max = 5 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)]">
      <span className="text-sm text-[#E0E0E0]">{label}</span>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-7 h-7 text-xs border transition-colors
              ${value >= n ? 'bg-[#00E676] border-[#00E676] text-black font-bold' : 'border-[rgba(255,255,255,0.1)] text-[#4A4A4A] hover:border-[#00E676]'}`}>
            {n}
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
    setForm(prev => ({
      ...prev,
      exercise_types: prev.exercise_types.includes(t)
        ? prev.exercise_types.filter(x => x !== t)
        : [...prev.exercise_types, t],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('lifestyle').upsert({ user_id: user.id, ...form });
    sessionStorage.setItem('phase2', JSON.stringify(form));
    router.push('/onboarding/phase3');
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 flex-1 ${i <= 2 ? 'bg-[#00E676]' : 'bg-[rgba(255,255,255,0.07)]'}`} />
          ))}
        </div>
        <div className="text-xs text-[#9A9A9A] tracking-widest uppercase mb-2">Step 2 of 5</div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Lifestyle Assessment</h1>
        <p className="text-sm text-[#9A9A9A]">Your daily habits have a direct impact on your hormonal health.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Sleep</div>
          <div className="mb-4">
            <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2">Average Hours per Night</div>
            <input type="range" min="4" max="10" step="0.5" value={form.avg_sleep_hours}
              onChange={e => set('avg_sleep_hours', Number(e.target.value))}
              className="w-full accent-[#00E676]" />
            <div className="text-center text-[#00E676] font-bold mt-1">{form.avg_sleep_hours}h</div>
          </div>
          <RatingRow label="Sleep Quality" value={form.sleep_quality} onChange={v => set('sleep_quality', v)} />
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Habits</div>
          <SelectRow label="Smoking" value={form.smoking_status} onChange={v => set('smoking_status', v)}
            options={[{label:'Never',value:'never'},{label:'Former',value:'former'},{label:'Occasional',value:'occasional'},{label:'Daily',value:'daily'}]} />
          <SelectRow label="Beer / Cider frequency" value={form.beer_frequency} onChange={v => set('beer_frequency', v)}
            options={[{label:'Never',value:'never'},{label:'1-2x/wk',value:'1-2x_week'},{label:'3x/wk',value:'3x_week'},{label:'4-6x/wk',value:'4-6x_week'},{label:'Daily',value:'daily'}]} />
          <SelectRow label="Spirits / Wine frequency" value={form.spirits_wine_frequency} onChange={v => set('spirits_wine_frequency', v)}
            options={[{label:'Never',value:'never'},{label:'1-2x/wk',value:'1-2x_week'},{label:'3x/wk',value:'3x_week'},{label:'4-6x/wk',value:'4-6x_week'},{label:'Daily',value:'daily'}]} />
          <SelectRow label="Coffee per day" value={form.coffee_per_day} onChange={v => set('coffee_per_day', v)}
            options={[{label:'None',value:'none'},{label:'1',value:'1'},{label:'2-3',value:'2-3'},{label:'4-5',value:'4-5'},{label:'6+',value:'6+'}]} />
          <SelectRow label="Sugar consumption" value={form.sugar_consumption} onChange={v => set('sugar_consumption', v)}
            options={[{label:'Rarely',value:'rarely'},{label:'Moderate',value:'moderate'},{label:'Frequent',value:'frequent'},{label:'Very High',value:'very_high'}]} />
          <Toggle label="Chronic low-carb / Keto diet" sublabel="Following a strict low-carb or ketogenic diet for 3+ months" value={form.keto_diet} onChange={v => set('keto_diet', v)} />
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Exercise</div>
          <SelectRow label="Frequency" value={form.exercise_frequency} onChange={v => set('exercise_frequency', v)}
            options={[{label:'None',value:'none'},{label:'1-2x/wk',value:'1-2x'},{label:'3-4x/wk',value:'3-4x'},{label:'5-6x/wk',value:'5-6x'},{label:'Daily',value:'daily'}]} />
          <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 mt-4">Exercise Types</div>
          <div className="flex flex-wrap gap-2">
            {['Weightlifting','Running','HIIT','Cycling','Swimming','Sports','Yoga','Walking'].map(t => (
              <button key={t} type="button" onClick={() => toggleExercise(t)}
                className={`px-3 py-1.5 text-xs border transition-colors
                  ${form.exercise_types.includes(t) ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-1">Hours sitting per day</div>
            <p className="text-xs text-[#4A4A4A] mb-2">Total time seated at work + leisure. Prolonged sitting suppresses testosterone independently — even in men who exercise regularly.</p>
            <input type="range" min="0" max="16" step="1" value={form.sedentary_hours}
              onChange={e => set('sedentary_hours', Number(e.target.value))}
              className="w-full accent-[#00E676]" />
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-[#4A4A4A]">0h</span>
              <span className={`font-bold ${form.sedentary_hours >= 10 ? 'text-[#FF5252]' : form.sedentary_hours >= 7 ? 'text-[#FFB300]' : 'text-[#00E676]'}`}>
                {form.sedentary_hours}h/day
              </span>
              <span className="text-[#4A4A4A]">16h</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Stress</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Chronic stress triggers the "pregnenolone steal" — your body diverts testosterone building blocks to produce stress hormones instead.</p>
          <RatingRow label="Work / Life Stress (1=low, 5=severe)" value={form.stress_level} onChange={v => set('stress_level', v)} />
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Sexual Health</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Private — never shared, used to assess hormone health only.</p>
          <SelectRow label="Morning erections (last 4 weeks)" value={form.morning_erection_frequency} onChange={v => set('morning_erection_frequency', v)}
            options={[{label:'Daily',value:'daily'},{label:'4-6x/wk',value:'4-6x_week'},{label:'2-3x/wk',value:'2-3x_week'},{label:'Rarely',value:'rarely'},{label:'Never',value:'never'}]} />
          <RatingRow label="Libido (1=very low, 5=high)" value={form.libido_rating} onChange={v => set('libido_rating', v)} />
          <RatingRow label="Erectile function (1=poor, 5=excellent)" value={form.erectile_rating} onChange={v => set('erectile_rating', v)} />
        </Card>

        <Button type="submit" loading={loading} fullWidth>Continue →</Button>
      </form>
    </div>
  );
}
