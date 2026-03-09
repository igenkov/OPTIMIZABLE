'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SYMPTOMS, SYMPTOM_CATEGORIES } from '@/constants/symptoms';
import { scoreSymptoms } from '@/lib/scoring';

export default function SymptomsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggle(id: string) {
    if (id === 'none') { setSelected(['none']); return; }
    setSelected(prev => {
      const without = prev.filter(x => x !== 'none');
      return without.includes(id) ? without.filter(x => x !== id) : [...without, id];
    });
  }

  async function handleSubmit() {
    if (selected.length === 0) { setError('Please select at least one symptom, or select "None of the above"'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { weighted_score, symptom_count } = scoreSymptoms(selected);
    const data = { symptoms_selected: selected, symptom_count, weighted_score };
    if (user) await supabase.from('symptom_assessments').insert({ user_id: user.id, ...data });
    sessionStorage.setItem('symptoms', JSON.stringify(data));
    router.push('/onboarding/summary');
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 flex-1 ${i <= 4 ? 'bg-[#00E676]' : 'bg-[rgba(255,255,255,0.07)]'}`} />
          ))}
        </div>
        <div className="text-xs text-[#9A9A9A] tracking-widest uppercase mb-2">Step 4 of 5</div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Symptom Assessment</h1>
        <p className="text-sm text-[#9A9A9A]">Select every symptom you currently experience. Be honest — this is private.</p>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.08)] mb-6">
        <span className="text-xs text-[#00E676] font-semibold">{selected.filter(s => s !== 'none').length} symptoms selected</span>
      </div>

      <div className="flex flex-col gap-6 mb-6">
        {SYMPTOM_CATEGORIES.map(cat => {
          const items = SYMPTOMS.filter(s => s.category === cat);
          return (
            <div key={cat}>
              <div className="text-[10px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-3">{cat}</div>
              <div className="flex flex-col gap-2">
                {items.map(s => {
                  const isSelected = selected.includes(s.id);
                  const dotColor = s.correlation_weight >= 0.9 ? '#FF5252' : s.correlation_weight >= 0.75 ? '#FFB300' : '#00E676';
                  return (
                    <button key={s.id} type="button" onClick={() => toggle(s.id)}
                      className={`flex items-center gap-3 px-4 py-3 border text-left transition-colors
                        ${isSelected ? 'border-[rgba(0,230,118,0.4)] bg-[rgba(0,230,118,0.06)]' : 'border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] hover:border-[rgba(255,255,255,0.15)]'}`}>
                      <div className={`w-4 h-4 border shrink-0 flex items-center justify-center
                        ${isSelected ? 'bg-[#00E676] border-[#00E676]' : 'border-[#4A4A4A]'}`}>
                        {isSelected && <span className="text-black text-xs font-black">✓</span>}
                      </div>
                      <span className={`text-sm flex-1 ${isSelected ? 'text-white' : 'text-[#9A9A9A]'}`}>{s.name}</span>
                      {isSelected && s.correlation_weight > 0 && (
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-[#FF5252] mb-4">{error}</p>}
      <Button onClick={handleSubmit} loading={loading} fullWidth>
        Analyze My Symptoms ({selected.filter(s => s !== 'none').length}) →
      </Button>
    </div>
  );
}
