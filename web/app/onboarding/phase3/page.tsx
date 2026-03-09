'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const SUPP_CATEGORIES = [
  {
    id: 't_support_basics',
    label: 'Foundational T support',
    sublabel: 'Zinc, Magnesium, Vitamin D, Boron...',
  },
  {
    id: 't_boosters',
    label: 'Testosterone boosters / Adaptogens',
    sublabel: 'Tongkat Ali, Fadogia Agrestis, Ashwagandha, DHEA...',
  },
  {
    id: 'estrogen_modulators',
    label: 'Estrogen modulators',
    sublabel: 'DIM, Calcium D-Glucarate, Chrysin...',
  },
  {
    id: 'dht_reducers',
    label: 'DHT reducers',
    sublabel: 'Saw Palmetto, Beta-sitosterol...',
  },
];

const MED_CATEGORIES = [
  {
    id: 'ssri_snri',
    label: 'Antidepressants',
    sublabel: 'SSRIs / SNRIs (Sertraline, Escitalopram, Venlafaxine...)',
  },
  {
    id: 'statins',
    label: 'Statins',
    sublabel: 'Cholesterol meds (Atorvastatin, Rosuvastatin, Simvastatin...)',
  },
  {
    id: 'opioids',
    label: 'Opioids / Strong painkillers',
    sublabel: 'Oxycodone, Tramadol, Morphine, Buprenorphine...',
  },
  {
    id: 'corticosteroids',
    label: 'Corticosteroids',
    sublabel: 'Prednisone, Dexamethasone, Hydrocortisone...',
  },
  {
    id: 'androgen_blockers',
    label: 'Androgen blockers / 5-ARIs',
    sublabel: 'Finasteride, Dutasteride, Spironolactone...',
  },
];

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
    medication_categories: [] as string[],
    medications: '',
    taking_supplements: false,
    supplement_categories: [] as string[],
    supplements: '',
    steroid_history: 'never' as 'never' | 'past' | 'current',
    steroid_stopped_ago: '' as '' | 'lt_6mo' | '6_12mo' | '1_3yr' | '3_5yr' | '5plus_yr',
    steroid_cycle_count: '' as '' | '1' | '2_3' | '4_10' | '10plus',
    steroid_pct: false,
    trt_history: 'never' as 'never' | 'past' | 'current',
    trt_type: '',
  });

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleSuppCategory(cat: string) {
    setForm(prev => ({
      ...prev,
      supplement_categories: prev.supplement_categories.includes(cat)
        ? prev.supplement_categories.filter(c => c !== cat)
        : [...prev.supplement_categories, cat],
    }));
  }

  function toggleMedCategory(cat: string) {
    setForm(prev => ({
      ...prev,
      medication_categories: prev.medication_categories.includes(cat)
        ? prev.medication_categories.filter(c => c !== cat)
        : [...prev.medication_categories, cat],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const data = {
      taking_medications: form.taking_medications,
      medication_categories: form.medication_categories,
      medications: form.medications.split(',').map(s => s.trim()).filter(Boolean),
      taking_supplements: form.taking_supplements,
      supplement_categories: form.supplement_categories,
      supplements: form.supplements.split(',').map(s => s.trim()).filter(Boolean),
      steroid_history: form.steroid_history,
      steroid_stopped_ago: form.steroid_stopped_ago || null,
      steroid_cycle_count: form.steroid_cycle_count || null,
      steroid_pct: form.steroid_pct,
      trt_history: form.trt_history,
      trt_type: form.trt_type || null,
    };

    if (user) await supabase.from('medical_history').upsert({ user_id: user.id, ...data });
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
          <div className="text-xs font-bold tracking-widests text-[#00E676] uppercase mb-1">Medications & Supplements</div>
          <p className="text-xs text-[#4A4A4A] mb-4">
            These are the medication groups with documented hormonal impact — not every drug affects testosterone, but these specific classes do, and significantly. If you take any, select the category.
          </p>
          <Toggle label="Currently taking medications" value={form.taking_medications} onChange={v => set('taking_medications', v)} />
          {form.taking_medications && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-3">Select all that apply</div>
              <div className="flex flex-col gap-2 mb-4">
                {MED_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleMedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2.5 border transition-colors ${
                      form.medication_categories.includes(cat.id)
                        ? 'border-[#00E676] bg-[rgba(0,230,118,0.08)]'
                        : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${form.medication_categories.includes(cat.id) ? 'text-[#00E676]' : 'text-[#E0E0E0]'}`}>
                      {cat.label}
                    </div>
                    <div className="text-xs text-[#4A4A4A] mt-0.5">{cat.sublabel}</div>
                  </button>
                ))}
              </div>
              <Input
                label="Specific medication names (optional — for your reference)"
                value={form.medications}
                onChange={e => set('medications', e.target.value)}
                placeholder="e.g. Sertraline 50mg, Atorvastatin 20mg"
              />
            </div>
          )}
          <Toggle label="Currently taking supplements" value={form.taking_supplements} onChange={v => set('taking_supplements', v)} />
          {form.taking_supplements && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-3">Select all that apply</div>
              <div className="flex flex-col gap-2 mb-4">
                {SUPP_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleSuppCategory(cat.id)}
                    className={`w-full text-left px-3 py-2.5 border transition-colors ${
                      form.supplement_categories.includes(cat.id)
                        ? 'border-[#00E676] bg-[rgba(0,230,118,0.08)]'
                        : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${form.supplement_categories.includes(cat.id) ? 'text-[#00E676]' : 'text-[#E0E0E0]'}`}>
                      {cat.label}
                    </div>
                    <div className="text-xs text-[#4A4A4A] mt-0.5">{cat.sublabel}</div>
                  </button>
                ))}
              </div>
              <Input
                label="Specific supplement names (optional)"
                value={form.supplements}
                onChange={e => set('supplements', e.target.value)}
                placeholder="e.g. Zinc Picolinate 30mg, Vitamin D3 5000 IU"
              />
            </div>
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
            <div className="flex flex-col gap-3 mt-3">
              <div>
                <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2">How long ago did you stop?</div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'lt_6mo', label: '< 6 months' },
                    { value: '6_12mo', label: '6–12 months' },
                    { value: '1_3yr', label: '1–3 years' },
                    { value: '3_5yr', label: '3–5 years' },
                    { value: '5plus_yr', label: '5+ years' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button" onClick={() => set('steroid_stopped_ago', opt.value)}
                      className={`px-3 py-1.5 text-xs border transition-colors
                        ${form.steroid_stopped_ago === opt.value ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A] hover:border-[rgba(255,255,255,0.2)]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2">How many cycles total?</div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: '1', label: '1 cycle' },
                    { value: '2_3', label: '2–3 cycles' },
                    { value: '4_10', label: '4–10 cycles' },
                    { value: '10plus', label: '10+ cycles' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button" onClick={() => set('steroid_cycle_count', opt.value)}
                      className={`px-3 py-1.5 text-xs border transition-colors
                        ${form.steroid_cycle_count === opt.value ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A] hover:border-[rgba(255,255,255,0.2)]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Did you do PCT (post-cycle therapy)?" value={form.steroid_pct} onChange={v => set('steroid_pct', v)} />
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

        <Button type="submit" loading={loading} fullWidth>Continue →</Button>
      </form>
    </div>
  );
}
