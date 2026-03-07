'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const CONDITIONS = ['Type 2 Diabetes', 'Hypertension', 'Hypothyroidism', 'Sleep Apnea', 'Depression/Anxiety', 'Cardiovascular Disease', 'Obesity'];

export default function Phase1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    age: '', height_cm: '', weight_kg: '', body_fat_percent: '',
    unit_preference: 'metric' as 'metric' | 'imperial',
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
    if (!form.age || !form.height_cm || !form.weight_kg) { setError('Please fill in all required fields'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const data = {
      age: Number(form.age),
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      body_fat_percent: form.body_fat_percent ? Number(form.body_fat_percent) : null,
      unit_preference: form.unit_preference,
      medical_conditions: form.medical_conditions,
    };

    await supabase.from('profiles').upsert({ user_id: user.id, ...data });
    sessionStorage.setItem('phase1', JSON.stringify(data));
    router.push('/onboarding/phase2');
  }

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
        <p className="text-sm text-[#9A9A9A]">Your physical stats are used to calculate BMI and calibrate your hormone reference ranges.</p>
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
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Physical Stats</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Age *" type="number" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value}))} placeholder="32" min="18" max="80" />
            <Input label={`Height (${form.unit_preference === 'metric' ? 'cm' : 'in'}) *`} type="number" value={form.height_cm} onChange={e => setForm(p => ({...p, height_cm: e.target.value}))} placeholder={form.unit_preference === 'metric' ? '178' : '70'} />
            <Input label={`Weight (${form.unit_preference === 'metric' ? 'kg' : 'lbs'}) *`} type="number" value={form.weight_kg} onChange={e => setForm(p => ({...p, weight_kg: e.target.value}))} placeholder={form.unit_preference === 'metric' ? '82' : '180'} />
            <Input label="Body Fat % (optional)" type="number" value={form.body_fat_percent} onChange={e => setForm(p => ({...p, body_fat_percent: e.target.value}))} placeholder="18" min="5" max="60" />
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Medical Conditions</div>
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
