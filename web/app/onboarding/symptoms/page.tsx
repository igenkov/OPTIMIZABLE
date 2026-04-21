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
    <div className="max-w-2xl mx-auto pb-32">

      {/* HEADER & PROGRESS */}
      <header className="mb-12">
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn(
              'h-1 flex-1 rounded-full transition-all duration-500',
              i <= 4 ? 'bg-[#C8A2C8]' : 'bg-white/5',
              i === 4 && 'shadow-[0_0_8px_rgba(200,162,200,0.4)]'
            )} />
          ))}
        </div>
        <div className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-black tracking-[2px] uppercase text-white/40 mb-4">
          Phase 04 / Symptomatic Calibration
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Signal Assessment</h1>
        <p className="text-white/40 text-sm">
          We use clinical weighting to determine the severity of your symptoms. High-weight signals indicate a potential devaluation of your endocrine system.
        </p>
      </header>

      {/* COUNTER */}
      <div className="flex items-center justify-between mb-8 p-4 bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 flex items-center justify-center border transition-all duration-500',
            activeSymptomCount > 0 ? 'border-[#C8A2C8] bg-[#C8A2C8]/10 shadow-[0_0_15px_rgba(200,162,200,0.2)]' : 'border-white/10 bg-white/5'
          )}>
            <Gauge size={20} className={activeSymptomCount > 0 ? 'text-[#C8A2C8]' : 'text-white/20'} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Signals Logged</div>
            <div className="text-lg font-mono font-black text-white">{activeSymptomCount} Active</div>
          </div>
        </div>
        {activeSymptomCount > 5 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20">
            <WarningCircle size={12} className="text-red-500" />
            <span className="text-[9px] font-black uppercase tracking-tighter text-red-500">High Symptom Load</span>
          </div>
        )}
      </div>

      {/* SYMPTOM CATEGORIES */}
      <div className="space-y-10 mb-12">
        {SYMPTOM_CATEGORIES.map(cat => {
          const items = SYMPTOMS.filter(s => s.category === cat && s.id !== 'none');
          const Icon = CATEGORY_ICONS[cat] || Pulse;

          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-2 text-white/40 border-b border-white/5 pb-2">
                <Icon size={14} />
                <h2 className="text-[10px] font-black tracking-[3px] uppercase">{cat}</h2>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {items.map(s => {
                  const isSelected = selected.includes(s.id);
                  const weightColor = s.correlation_weight >= 0.9
                    ? 'bg-red-500'
                    : s.correlation_weight >= 0.75
                    ? 'bg-yellow-500'
                    : 'bg-[#C8A2C8]';

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={cn(
                        'group flex items-center gap-4 p-4 border transition-all text-left',
                        isSelected
                          ? 'bg-white/10 border-white/20'
                          : 'bg-transparent border-white/5 hover:border-white/15'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 border flex items-center justify-center transition-all shrink-0',
                        isSelected ? 'bg-[#C8A2C8] border-[#C8A2C8]' : 'border-white/10 bg-white/5 group-hover:border-white/30'
                      )}>
                        {isSelected && <Check size={12} className="text-black stroke-[4px]" />}
                      </div>

                      <div className="flex-1">
                        <div className={cn(
                          'text-xs font-bold transition-colors',
                          isSelected ? 'text-white' : 'text-white/40 group-hover:text-white/60'
                        )}>
                          {s.name}
                        </div>
                      </div>

                      {isSelected && s.correlation_weight > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Signal</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((bar) => (
                              <div
                                key={bar}
                                className={cn(
                                  'w-1 h-3',
                                  (bar === 1 || (bar === 2 && s.correlation_weight >= 0.75) || (bar === 3 && s.correlation_weight >= 0.9))
                                    ? weightColor
                                    : 'bg-white/5'
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
            'w-full p-4 border transition-all text-[10px] font-black uppercase tracking-[2px]',
            selected.includes('none')
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-transparent border-white/5 text-white/20'
          )}
        >
          None of the above symptoms apply
        </button>
      </div>

      {/* ACTIONS */}
      <div className="pt-8 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
            <ShieldWarning size={14} />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10">
          <Info size={18} className="text-[#C8A2C8] shrink-0" />
          <p className="text-[10px] text-white/40 leading-tight uppercase font-bold tracking-tighter">
            The aggregate of these signals creates your Subjective Health Score, cross-referenced against your biomarker data.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          fullWidth
          className="py-5 flex items-center justify-center gap-2"
        >
          {!loading && <>Analyze Clinical Signals <CaretRight size={16} /></>}
        </Button>
      </div>
    </div>
  );
}
