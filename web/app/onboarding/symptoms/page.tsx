'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { SYMPTOMS, SYMPTOM_CATEGORIES } from '@/constants/symptoms';
import { scoreSymptoms } from '@/lib/scoring';
import {
  Pulse, Brain, Lightning, Heart, Moon,
  ShieldWarning, CaretRight, Info, Check,
  WarningCircle, Gauge
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, any> = {
  'Energy & Vitality': Lightning,
  'Body Composition': Pulse,
  'Sexual Health': Heart,
  'Mood & Cognition': Brain,
  'Sleep': Moon,
  'Physical Signs': ShieldWarning,
};

export default function SymptomsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('symptoms');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (Array.isArray(data.symptoms_selected)) setSelected(data.symptoms_selected);
    } catch { /* ignore corrupt data */ }
  }, []);

  function toggle(id: string) {
    if (id === 'none') { setSelected(['none']); return; }
    setSelected(prev => {
      const without = prev.filter(x => x !== 'none');
      return without.includes(id) ? without.filter(x => x !== id) : [...without, id];
    });
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      setError('Signal required: Select at least one symptom or "None".');
      return;
    }
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { weighted_score, symptom_count } = scoreSymptoms(selected);
    const data = { symptoms_selected: selected, symptom_count, weighted_score };

    if (user) {
      const { error: dbError } = await supabase.from('symptom_assessments').upsert({ user_id: user.id, ...data });
      if (dbError) { setError('Failed to save data. Please try again.'); setLoading(false); return; }
    }
    localStorage.setItem('symptoms', JSON.stringify(data));
    router.push('/onboarding/summary');
  }

  const activeSymptomCount = selected.filter(s => s !== 'none').length;

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-32 lg:px-6">

      {/* HEADER & PROGRESS */}
      <header className="mb-10 border-b border-white/10 pb-8">
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-sm transition-all duration-500',
              i <= 4 ? 'bg-[#C8A2C8]' : 'bg-white/[0.06]',
              i === 4 && 'shadow-[0_0_12px_rgba(200,162,200,0.35)]'
            )} />
          ))}
        </div>
        <div className="mb-4 inline-flex items-center border border-[#C8A2C8]/25 bg-[#C8A2C8]/10 px-2.5 py-1 text-[10px] font-black tracking-[2px] text-[#C8A2C8] uppercase">
          Phase 04 / Symptomatic Calibration
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Signal Assessment</h1>
        <p className="text-sm text-white/45">
          We use clinical weighting to determine the severity of your symptoms. High-weight signals indicate a potential devaluation of your endocrine system.
        </p>
      </header>

      {/* COUNTER */}
      <div className="mb-8 flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#141414]/50 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-md border transition-all duration-500',
            activeSymptomCount > 0 ? 'border-[#C8A2C8] bg-[#C8A2C8]/10 shadow-[0_0_15px_rgba(200,162,200,0.2)]' : 'border-white/12 bg-white/[0.04]'
          )}>
            <Gauge size={20} className={activeSymptomCount > 0 ? 'text-[#C8A2C8]' : 'text-white/25'} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Signals Logged</div>
            <div className="font-mono text-lg font-black text-white">{activeSymptomCount} Active</div>
          </div>
        </div>
        {activeSymptomCount > 5 && (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3 py-1.5">
            <WarningCircle size={12} className="text-red-400" aria-hidden />
            <span className="text-[9px] font-black uppercase tracking-tighter text-red-400">High Symptom Load</span>
          </div>
        )}
      </div>

      {/* SYMPTOM CATEGORIES */}
      <div className="mb-12 space-y-10">
        {SYMPTOM_CATEGORIES.map(cat => {
          const items = SYMPTOMS.filter(s => s.category === cat && s.id !== 'none');
          const Icon = CATEGORY_ICONS[cat] || Pulse;

          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.07] pb-2 text-[#C8A2C8]">
                <Icon size={14} aria-hidden />
                <h2 className="text-[10px] font-black tracking-[3px] uppercase">{cat}</h2>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {items.map(s => {
                  const isSelected = selected.includes(s.id);
                  const weightColor = s.correlation_weight >= 0.9
                    ? 'bg-[#E88080]'
                    : s.correlation_weight >= 0.75
                    ? 'bg-[#E8C470]'
                    : 'bg-[#C8A2C8]';

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={cn(
                        'group flex items-center gap-4 rounded-lg border p-4 text-left transition-all',
                        isSelected
                          ? 'border-white/[0.18] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                          : 'border-white/[0.07] bg-[#141414]/40 hover:border-white/14'
                      )}
                    >
                      <div className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-all',
                        isSelected ? 'border-[#C8A2C8] bg-[#C8A2C8]' : 'border-white/12 bg-white/[0.04] group-hover:border-white/25'
                      )}>
                        {isSelected && <Check size={12} className="stroke-[4px] text-black" aria-hidden />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className={cn(
                          'text-xs font-bold transition-colors',
                          isSelected ? 'text-white' : 'text-white/45 group-hover:text-white/65'
                        )}>
                          {s.name}
                        </div>
                      </div>

                      {isSelected && s.correlation_weight > 0 && (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/25">Signal</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((bar) => (
                              <div
                                key={bar}
                                className={cn(
                                  'h-3 w-1 rounded-sm',
                                  (bar === 1 || (bar === 2 && s.correlation_weight >= 0.75) || (bar === 3 && s.correlation_weight >= 0.9))
                                    ? weightColor
                                    : 'bg-white/10'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* NONE OF THE ABOVE */}
        <button
          type="button"
          onClick={() => toggle('none')}
          className={cn(
            'w-full rounded-lg border p-4 text-[10px] font-black uppercase tracking-[2px] transition-all',
            selected.includes('none')
              ? 'border-[#C8A2C8]/40 bg-[#C8A2C8]/[0.1] text-white shadow-[inset_0_1px_0_rgba(200,162,200,0.08)]'
              : 'border-white/[0.07] bg-[#141414]/40 text-white/35 hover:border-white/14'
          )}
        >
          None of the above symptoms apply
        </button>
      </div>

      {/* ACTIONS */}
      <div className="space-y-4 border-t border-white/[0.07] pt-8">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] p-3 text-[10px] font-black uppercase tracking-widest text-red-400">
            <ShieldWarning size={14} aria-hidden />
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-white/[0.1] bg-black/30 p-4 backdrop-blur-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-[#C8A2C8]" aria-hidden />
          <p className="text-[10px] font-bold uppercase leading-tight tracking-tighter text-white/45">
            The aggregate of these signals creates your Subjective Health Score, cross-referenced against your biomarker data.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          fullWidth
          className="flex items-center justify-center gap-2 rounded-lg py-5 shadow-[0_10px_36px_rgba(200,162,200,0.2)]"
        >
          {!loading && <>Analyze Clinical Signals <CaretRight size={16} aria-hidden /></>}
        </Button>
      </div>
    </div>
  );
}
