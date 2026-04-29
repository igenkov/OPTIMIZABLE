'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Pill, Database, ShieldWarning, CaretRight, Check, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const SUPP_CATEGORIES = [
  { id: 't_support_basics', label: 'Foundational Support', sublabel: 'Zinc, Mg, Vit D, Boron' },
  { id: 't_boosters', label: 'Adaptogens', sublabel: 'Tongkat Ali, Ashwagandha, DHEA' },
  { id: 'estrogen_modulators', label: 'Estrogen Control', sublabel: 'DIM, Calcium D-Glucarate' },
  { id: 'dht_reducers', label: 'DHT Reducers', sublabel: 'Saw Palmetto, Beta-sitosterol' },
];

const MED_CATEGORIES = [
  { id: 'ssri_snri', label: 'Antidepressants', sublabel: 'SSRIs / SNRIs' },
  { id: 'statins', label: 'Statins', sublabel: 'Cholesterol Management' },
  { id: 'opioids', label: 'Analgesics', sublabel: 'Opioids / Pain Management' },
  { id: 'corticosteroids', label: 'Corticosteroids', sublabel: 'Anti-inflammatories' },
  { id: 'androgen_blockers', label: '5-ARIs', sublabel: 'Hair loss / Prostate meds' },
];

export default function Phase3Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  // Pre-populate from localStorage — medications/supplements stored as arrays, convert back to strings
  useEffect(() => {
    const saved = localStorage.getItem('phase3');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setForm(prev => ({
        ...prev,
        ...data,
        medications: Array.isArray(data.medications) ? data.medications.join(', ') : (data.medications ?? ''),
        supplements: Array.isArray(data.supplements) ? data.supplements.join(', ') : (data.supplements ?? ''),
        steroid_stopped_ago: data.steroid_stopped_ago ?? '',
        steroid_cycle_count: data.steroid_cycle_count ?? '',
        trt_type: data.trt_type ?? '',
      }));
    } catch { /* ignore corrupt data */ }
  }, []);

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleCategory(listKey: 'medication_categories' | 'supplement_categories', id: string) {
    setForm(p => ({
      ...p,
      [listKey]: p[listKey].includes(id)
        ? p[listKey].filter(x => x !== id)
        : [...p[listKey], id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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

    if (user) {
      const { error: dbError } = await supabase.from('medical_history').upsert({ user_id: user.id, ...data });
      if (dbError) { setError('Failed to save data. Please try again.'); setLoading(false); return; }
    }
    localStorage.setItem('phase3', JSON.stringify(data));
    router.push('/onboarding/symptoms');
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-24 lg:px-6">

      {/* HEADER & PROGRESS */}
      <header className="mb-10 border-b border-white/10 pb-8">
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-sm transition-all duration-500',
              i <= 3 ? 'bg-[#C8A2C8]' : 'bg-white/[0.06]',
              i === 3 && 'shadow-[0_0_12px_rgba(200,162,200,0.35)]'
            )} />
          ))}
        </div>
        <div className="mb-4 inline-flex items-center border border-[#C8A2C8]/25 bg-[#C8A2C8]/10 px-2.5 py-1 text-[10px] font-black tracking-[2px] text-[#C8A2C8] uppercase">
          Phase 03 / Clinical Baseline
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Medical History</h1>
        <p className="text-sm text-white/45">Pharmacological interventions and exogenous hormones significantly alter HPTA function.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* PHARMACOLOGY */}
        <Card className="space-y-8 rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="flex items-center gap-2 text-[#C8A2C8]">
            <Pill size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Pharmacology</h2>
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <button type="button"
              onClick={() => setForm(p => p.taking_medications
                ? { ...p, taking_medications: false, medication_categories: [], medications: '' }
                : { ...p, taking_medications: true }
              )}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border p-4 transition-all',
                form.taking_medications
                  ? 'border-[#C8A2C8]/35 bg-[#C8A2C8]/[0.07] text-white shadow-[inset_0_1px_0_rgba(200,162,200,0.12)]'
                  : 'border-white/[0.07] bg-[#141414]/40 text-white/40 hover:border-white/12'
              )}>
              <span className="text-xs font-black uppercase tracking-widest">Currently taking medications</span>
              <div className={cn('size-2 shrink-0 rounded-md', form.taking_medications ? 'bg-[#C8A2C8]' : 'bg-white/10')} />
            </button>

            {form.taking_medications && (
              <div className="grid grid-cols-1 gap-2">
                {MED_CATEGORIES.map(cat => {
                  const active = form.medication_categories.includes(cat.id);
                  return (
                    <button key={cat.id} type="button"
                      onClick={() => toggleCategory('medication_categories', cat.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                        active
                          ? 'border-[#C8A2C8]/40 bg-[#C8A2C8]/[0.08] shadow-[inset_0_1px_0_rgba(200,162,200,0.08)]'
                          : 'border-white/[0.07] bg-[#141414]/40 hover:border-white/12'
                      )}>
                      <div>
                        <div className={cn('text-[10px] font-black uppercase tracking-widest', active ? 'text-white' : 'text-white/40')}>{cat.label}</div>
                        <div className="text-[10px] font-bold uppercase tracking-tighter text-white/25">{cat.sublabel}</div>
                      </div>
                      {active && <Check size={14} className="shrink-0 text-[#C8A2C8]" aria-hidden />}
                    </button>
                  );
                })}
                <Input className="mt-2" placeholder="Specific medication names (optional)" value={form.medications}
                  onChange={e => set('medications', e.target.value)} />
              </div>
            )}
          </div>

          {/* Supplements */}
          <div className="space-y-4 border-t border-white/[0.07] pt-6">
            <button type="button"
              onClick={() => setForm(p => p.taking_supplements
                ? { ...p, taking_supplements: false, supplement_categories: [], supplements: '' }
                : { ...p, taking_supplements: true }
              )}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border p-4 transition-all',
                form.taking_supplements
                  ? 'border-[#C8A2C8]/35 bg-[#C8A2C8]/[0.07] text-white shadow-[inset_0_1px_0_rgba(200,162,200,0.12)]'
                  : 'border-white/[0.07] bg-[#141414]/40 text-white/40 hover:border-white/12'
              )}>
              <span className="text-xs font-black uppercase tracking-widest">Currently taking supplements</span>
              <div className={cn('size-2 shrink-0 rounded-md', form.taking_supplements ? 'bg-[#C8A2C8]' : 'bg-white/10')} />
            </button>

            {form.taking_supplements && (
              <div className="grid grid-cols-1 gap-2">
                {SUPP_CATEGORIES.map(cat => {
                  const active = form.supplement_categories.includes(cat.id);
                  return (
                    <button key={cat.id} type="button"
                      onClick={() => toggleCategory('supplement_categories', cat.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                        active
                          ? 'border-[#C8A2C8]/40 bg-[#C8A2C8]/[0.08] shadow-[inset_0_1px_0_rgba(200,162,200,0.08)]'
                          : 'border-white/[0.07] bg-[#141414]/40 hover:border-white/12'
                      )}>
                      <div>
                        <div className={cn('text-[10px] font-black uppercase tracking-widest', active ? 'text-white' : 'text-white/40')}>{cat.label}</div>
                        <div className="text-[10px] font-bold uppercase tracking-tighter text-white/25">{cat.sublabel}</div>
                      </div>
                      {active && <Check size={14} className="shrink-0 text-[#C8A2C8]" aria-hidden />}
                    </button>
                  );
                })}
                <Input className="mt-2" placeholder="Specific supplement names (optional)" value={form.supplements}
                  onChange={e => set('supplements', e.target.value)} />
              </div>
            )}
          </div>
        </Card>

        {/* ANABOLIC EXPOSURE */}
        <Card className="space-y-8 rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.55)">
          <div className="flex items-center gap-2 text-[#C8A2C8]">
            <Database size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Anabolic Exposure</h2>
          </div>

          {/* Steroid History */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Anabolic Steroid History</span>
            <div className="grid grid-cols-3 gap-2">
              {(['never', 'past', 'current'] as const).map(v => (
                <button key={v} type="button" onClick={() => setForm(p => ({
                  ...p,
                  steroid_history: v,
                  ...(v !== 'past' ? { steroid_stopped_ago: '' as const, steroid_cycle_count: '' as const, steroid_pct: false } : {}),
                }))}
                  className={cn(
                    'rounded-lg border py-2.5 text-[10px] font-black uppercase tracking-widest transition-all capitalize',
                    form.steroid_history === v
                      ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                      : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18'
                  )}>
                  {v}
                </button>
              ))}
            </div>

            {form.steroid_history === 'past' && (
              <div className="space-y-6 border-t border-white/[0.07] pt-6">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Cessation Timeline</span>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'lt_6mo', label: '< 6 mo' },
                      { value: '6_12mo', label: '6–12 mo' },
                      { value: '1_3yr', label: '1–3 yr' },
                      { value: '3_5yr', label: '3–5 yr' },
                      { value: '5plus_yr', label: '5+ yr' },
                    ] as const).map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('steroid_stopped_ago', opt.value)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase transition-all',
                          form.steroid_stopped_ago === opt.value
                            ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                            : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Accumulated Exposure</span>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: '1', label: '1 Cycle' },
                      { value: '2_3', label: '2–3 Cycles' },
                      { value: '4_10', label: '4–10 Cycles' },
                      { value: '10plus', label: '10+ Cycles' },
                    ] as const).map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('steroid_cycle_count', opt.value)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase transition-all',
                          form.steroid_cycle_count === opt.value
                            ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                            : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={() => set('steroid_pct', !form.steroid_pct)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-[10px] font-black uppercase tracking-widest transition-all',
                    form.steroid_pct
                      ? 'border-[#C8A2C8]/35 bg-[#C8A2C8]/[0.1] text-[#C8A2C8]'
                      : 'border-white/[0.07] bg-[#141414]/40 text-white/25 hover:border-white/12'
                  )}>
                  Post-Cycle Therapy (PCT) Completed
                  <Check size={14} className={cn('shrink-0 transition-opacity', form.steroid_pct ? 'opacity-100' : 'opacity-0')} aria-hidden />
                </button>
              </div>
            )}
          </div>

          {/* TRT History */}
          <div className="space-y-4 border-t border-white/[0.07] pt-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">TRT / Hormone Replacement</span>
            <div className="grid grid-cols-3 gap-2">
              {(['never', 'past', 'current'] as const).map(v => (
                <button key={v} type="button" onClick={() => setForm(p => ({
                  ...p,
                  trt_history: v,
                  ...(v === 'never' ? { trt_type: '' } : {}),
                }))}
                  className={cn(
                    'rounded-lg border py-2.5 text-[10px] font-black uppercase tracking-widest transition-all capitalize',
                    form.trt_history === v
                      ? 'border-[#C8A2C8] bg-[#C8A2C8] text-black shadow-[0_6px_20px_rgba(200,162,200,0.15)]'
                      : 'border-white/[0.08] bg-[#141414]/50 text-white/40 hover:border-white/18'
                  )}>
                  {v}
                </button>
              ))}
            </div>
            {form.trt_history !== 'never' && (
              <Input placeholder="TRT Protocol (e.g. 100mg Test C / week)" value={form.trt_type}
                onChange={e => set('trt_type', e.target.value)} />
            )}
          </div>
        </Card>

        {/* ACTIONS */}
        <div className="space-y-4 border-t border-white/[0.07] pt-8">
          {(form.steroid_history === 'current' || form.trt_history === 'current') ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border border-[#E8C470]/30 bg-[#E8C470]/[0.06] p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[#E8C470]">
                  <Warning size={16} aria-hidden />
                  <span className="text-[10px] font-black uppercase tracking-[3px]">Evaluation Not Applicable</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Current exogenous hormone use introduces too many confounding variables for accurate baseline assessment. Testosterone, LH, FSH, and estradiol values are all directly driven by the exogenous compound — not your endogenous axis.
                </p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  This platform is designed for natural hormonal evaluation. For TRT monitoring or PED cycle management, a certified endocrinologist or sports medicine physician with hormone expertise is the appropriate resource.
                </p>
              </div>
              <button type="button" onClick={() => router.push('/')}
                className="w-full rounded-lg border border-white/[0.12] py-5 text-[11px] font-black uppercase tracking-[3px] text-white/40 transition-all hover:border-white/22 hover:text-white">
                Return to Home
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-white/[0.1] bg-black/30 p-4 backdrop-blur-sm">
                <ShieldWarning size={18} className="mt-0.5 shrink-0 text-[#E8C470]" aria-hidden />
                <p className="text-[10px] font-bold uppercase leading-tight tracking-tighter text-white/45">
                  Clinical accuracy: pharmacological data is essential for interpreting total vs. free testosterone and SHBG levels.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] p-3 text-[11px] font-bold tracking-widest text-red-400 uppercase">
                  <ShieldWarning size={14} aria-hidden /> {error}
                </div>
              )}
              <Button type="submit" loading={loading} fullWidth className="flex items-center justify-center gap-2 rounded-lg py-5 shadow-[0_10px_36px_rgba(200,162,200,0.2)]">
                {!loading && <>Execute Symptom Log <CaretRight size={16} aria-hidden /></>}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
