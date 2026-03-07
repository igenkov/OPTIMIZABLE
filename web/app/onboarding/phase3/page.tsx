'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)]">
      <span className="text-sm text-[#E0E0E0]">{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-[#00E676]' : 'bg-[#1f1f1f] border border-[rgba(255,255,255,0.1)]'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function Phase3Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    taking_medications: false,
    medications: '',
    taking_supplements: false,
    supplements: '',
    steroid_history: 'never' as 'never' | 'past' | 'current',
    steroid_stopped_ago: '',
    steroid_pct: false,
    trt_history: 'never' as 'never' | 'past' | 'current',
    trt_type: '',
    previous_bloodwork: false,
    known_total_t: '',
    known_total_t_unit: 'ng/dL' as 'ng/dL' | 'nmol/L',
  });

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const data = {
      taking_medications: form.taking_medications,
      medications: form.medications.split(',').map(s => s.trim()).filter(Boolean),
      taking_supplements: form.taking_supplements,
      supplements: form.supplements.split(',').map(s => s.trim()).filter(Boolean),
      steroid_history: form.steroid_history,
      steroid_stopped_ago: form.steroid_stopped_ago || null,
      steroid_pct: form.steroid_pct,
      trt_history: form.trt_history,
      trt_type: form.trt_type || null,
      previous_bloodwork: form.previous_bloodwork,
      known_total_t: form.known_total_t ? Number(form.known_total_t) : null,
      known_total_t_unit: form.known_total_t_unit,
    };

    await supabase.from('medical_history').upsert({ user_id: user.id, ...data });
    sessionStorage.setItem('phase3', JSON.stringify(data));
    router.push('/onboarding/symptoms');
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 flex-1 ${i <= 3 ? 'bg-[#00E676]' : 'bg-[rgba(255,255,255,0.07)]'}`} />
          ))}
        </div>
        <div className="text-xs text-[#9A9A9A] tracking-widest uppercase mb-2">Step 3 of 5</div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Medical History</h1>
        <p className="text-sm text-[#9A9A9A]">Medications and hormone history significantly affect your results.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Medications & Supplements</div>
          <Toggle label="Currently taking medications" value={form.taking_medications} onChange={v => set('taking_medications', v)} />
          {form.taking_medications && (
            <Input className="mt-3" label="List medications (comma separated)" value={form.medications} onChange={e => set('medications', e.target.value)} placeholder="e.g. Metformin, Lisinopril" />
          )}
          <Toggle label="Currently taking supplements" value={form.taking_supplements} onChange={v => set('taking_supplements', v)} />
          {form.taking_supplements && (
            <Input className="mt-3" label="List supplements (comma separated)" value={form.supplements} onChange={e => set('supplements', e.target.value)} placeholder="e.g. Vitamin D, Zinc, Creatine" />
          )}
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Steroid History</div>
          <div className="flex gap-2 mb-3">
            {(['never','past','current'] as const).map(v => (
              <button key={v} type="button" onClick={() => set('steroid_history', v)}
                className={`flex-1 py-2 text-xs border transition-colors capitalize
                  ${form.steroid_history === v ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
                {v}
              </button>
            ))}
          </div>
          {form.steroid_history === 'past' && (
            <div className="flex flex-col gap-3 mt-2">
              <Input label="How long ago did you stop?" value={form.steroid_stopped_ago} onChange={e => set('steroid_stopped_ago', e.target.value)} placeholder="e.g. 2 years ago" />
              <Toggle label="Did you do PCT?" value={form.steroid_pct} onChange={v => set('steroid_pct', v)} />
            </div>
          )}
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">TRT History</div>
          <div className="flex gap-2 mb-3">
            {(['never','past','current'] as const).map(v => (
              <button key={v} type="button" onClick={() => set('trt_history', v)}
                className={`flex-1 py-2 text-xs border transition-colors capitalize
                  ${form.trt_history === v ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
                {v}
              </button>
            ))}
          </div>
          {form.trt_history !== 'never' && (
            <Input label="TRT type" value={form.trt_type} onChange={e => set('trt_type', e.target.value)} placeholder="e.g. Testosterone Cypionate injections" />
          )}
        </Card>

        <Card>
          <div className="text-xs font-bold tracking-widest text-[#00E676] uppercase mb-4">Previous Bloodwork</div>
          <Toggle label="Have you had bloodwork before?" value={form.previous_bloodwork} onChange={v => set('previous_bloodwork', v)} />
          {form.previous_bloodwork && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <Input label="Known Total Testosterone" type="number" value={form.known_total_t} onChange={e => set('known_total_t', e.target.value)} placeholder="e.g. 450" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-1.5">Unit</div>
                <div className="flex gap-1">
                  {(['ng/dL','nmol/L'] as const).map(u => (
                    <button key={u} type="button" onClick={() => set('known_total_t_unit', u)}
                      className={`px-3 py-2.5 text-xs border transition-colors
                        ${form.known_total_t_unit === u ? 'border-[#00E676] text-[#00E676]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Button type="submit" loading={loading} fullWidth>Continue →</Button>
      </form>
    </div>
  );
}
