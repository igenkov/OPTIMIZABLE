'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'Hypothyroidism',
  'Sleep Apnea',
  'Depression/Anxiety',
  'Cardiovascular Disease',
  'Obesity',
  'Testicular Trauma / Varicocele',
  'Hemochromatosis',
  'Pituitary Disorder / Adenoma',
  'Liver Disease / Cirrhosis',
  'Chronic Kidney Disease',
];

const BODY_TYPES = [
  { level: 1, name: 'Ultra Lean',  bf: 9,  color: '#00E676', markers: 'Abs visible without flexing; vascularity on lower stomach.' },
  { level: 2, name: 'Athletic',    bf: 12, color: '#00E676', markers: 'Full 6-pack visible when flexing; clear muscle separation.' },
  { level: 3, name: 'Defined',     bf: 15, color: '#69F0AE', markers: 'Outline of 4-pack visible; V-taper present; no love handles.' },
  { level: 4, name: 'Fit',         bf: 18, color: '#FFD740', markers: 'Flat stomach; abs only visible in good lighting; slight softness.' },
  { level: 5, name: 'Average',     bf: 22, color: '#FFB300', markers: 'No ab definition; slight love handles starting to form.' },
  { level: 6, name: 'Heavy',       bf: 28, color: '#FF8C00', markers: 'Visible belly; soft chest; significant love handles.' },
  { level: 7, name: 'Very Heavy',  bf: 33, color: '#FF5252', markers: 'Significant abdominal protrusion; no visible muscle frame.' },
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
    sessionStorage.setItem('phase1', JSON.stringify(data));
    router.push('/onboarding/phase2');
  }

  const selectedType = BODY_TYPES.find(t => t.level === form.body_type_level);

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 flex-1 ${i === 1 ? 'bg-[#00E676]' : 'bg-[rgba(255,255,255,0.07)]'}`} />
          ))}
        </div>
        <div className="text-xs text-[#9A9A9A] tracking-widest uppercase mb-2">Step 1 of 5</div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Personal Profile</h1>
        <p className="text-sm text-[#9A9A9A]">Your physical stats calibrate your hormone reference ranges.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Units</div>
          <div className="flex gap-3">
            {(['metric', 'imperial'] as const).map(u => (
              <button key={u} type="button"
                onClick={() => setForm(prev => ({ ...prev, unit_preference: u }))}
                className={`flex-1 py-2 text-sm font-semibold border transition-colors
                  ${form.unit_preference === u ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widests text-[#00E676] uppercase mb-4">Physical Stats</div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Age *" type="number" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value}))} placeholder="32" min="18" max="80" />
            <Input label={`Height (${form.unit_preference === 'metric' ? 'cm' : 'in'}) *`} type="number" value={form.height_cm} onChange={e => setForm(p => ({...p, height_cm: e.target.value}))} placeholder={form.unit_preference === 'metric' ? '178' : '70'} />
            <Input label={`Weight (${form.unit_preference === 'metric' ? 'kg' : 'lbs'}) *`} type="number" value={form.weight_kg} onChange={e => setForm(p => ({...p, weight_kg: e.target.value}))} placeholder={form.unit_preference === 'metric' ? '82' : '180'} />
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widests text-[#00E676] uppercase mb-1">Body Type *</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Select the description that most accurately matches your current physique.</p>
          <div className="flex flex-col gap-1.5">
            {BODY_TYPES.map(bt => {
              const isSelected = form.body_type_level === bt.level;
              return (
                <button key={bt.level} type="button" onClick={() => setForm(p => ({ ...p, body_type_level: bt.level }))}
                  className={`flex items-start gap-3 px-4 py-3 border text-left transition-colors
                    ${isSelected ? 'border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)]' : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]'}`}>
                  <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                    <div className={`w-4 h-4 border shrink-0 flex items-center justify-center transition-colors
                      ${isSelected ? 'border-0' : 'border-[#4A4A4A]'}`}
                      style={isSelected ? { background: bt.color } : {}}>
                      {isSelected && <span className="text-black text-[10px] font-black">✓</span>}
                    </div>
                    <div className="text-[10px] font-bold tracking-widest uppercase w-[5.5rem]" style={{ color: bt.color }}>
                      {bt.name}
                    </div>
                  </div>
                  <div className="text-xs text-[#9A9A9A] leading-relaxed">{bt.markers}</div>
                  <div className="shrink-0 text-[10px] text-[#4A4A4A] ml-auto pl-2 whitespace-nowrap">~{bt.bf}%</div>
                </button>
              );
            })}
          </div>

          {/* Muscle override */}
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
            <button type="button" onClick={() => setForm(p => ({ ...p, high_muscle: !p.high_muscle }))}
              className="flex items-start gap-3 w-full text-left">
              <div className={`w-4 h-4 border shrink-0 flex items-center justify-center mt-0.5 transition-colors
                ${form.high_muscle ? 'bg-[#00E676] border-[#00E676]' : 'border-[#4A4A4A]'}`}>
                {form.high_muscle && <span className="text-black text-[10px] font-black">✓</span>}
              </div>
              <div>
                <div className="text-sm text-white font-semibold mb-0.5">I carry significant muscle mass</div>
                <div className="text-xs text-[#4A4A4A] leading-relaxed">
                  Advanced lifter or strength athlete (2+ years consistent training). Higher muscle mass improves androgen receptor density and insulin sensitivity — this is factored into your risk score.
                </div>
              </div>
            </button>
            {form.high_muscle && selectedType && selectedType.level >= 5 && (
              <div className="mt-3 px-3 py-2 bg-[rgba(0,230,118,0.06)] border border-[rgba(0,230,118,0.2)]">
                <p className="text-xs text-[#00E676]">
                  Muscle override active — body fat risk contribution halved for your score.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widests text-[#00E676] uppercase mb-4">Medical Conditions</div>
          <p className="text-xs text-[#9A9A9A] mb-3">Select any you have been diagnosed with:</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button key={c} type="button" onClick={() => toggleCondition(c)}
                className={`px-3 py-1.5 text-xs border transition-colors
                  ${form.medical_conditions.includes(c) ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A] hover:border-[rgba(255,255,255,0.2)]'}`}>
                {c}
              </button>
            ))}
          </div>
        </Card>

        {error && <p className="text-xs text-[#FF5252]">{error}</p>}
        <Button type="submit" loading={loading} fullWidth>Continue →</Button>
      </form>
    </div>
  );
}
