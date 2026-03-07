'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const METRICS = [
  { key: 'mood', label: 'Mood', emojis: ['😩', '😔', '😐', '🙂', '😄'] },
  { key: 'energy', label: 'Energy', emojis: ['💀', '😴', '😐', '⚡', '🔥'] },
  { key: 'sleep_quality', label: 'Sleep Quality', emojis: ['😫', '😟', '😐', '😌', '😴'] },
  { key: 'libido', label: 'Libido', emojis: ['❌', '↓', '○', '↑', '🔝'] },
  { key: 'stress', label: 'Stress Level', emojis: ['😌', '🧘', '😐', '😤', '🤯'] },
] as const;

type MetricKey = 'mood' | 'energy' | 'sleep_quality' | 'libido' | 'stress';

export default function JournalPage() {
  const [ratings, setRatings] = useState<Record<MetricKey, number>>({
    mood: 3, energy: 3, sleep_quality: 3, libido: 3, stress: 3
  });
  const [sleepHours, setSleepHours] = useState(7);
  const [exercised, setExercised] = useState(false);
  const [adherence, setAdherence] = useState<'fully' | 'mostly' | 'partially' | 'not_today'>('mostly');
  const [notes, setNotes] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cycleRes, checkinRes] = await Promise.all([
        supabase.from('optimization_cycles').select('id').eq('user_id', user.id).eq('status', 'active').single(),
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', today).single(),
      ]);

      if (cycleRes.data) setCycleId(cycleRes.data.id);
      if (checkinRes.data) setAlreadyLogged(true);
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (alreadyLogged) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('daily_checkins').insert({
      user_id: user.id, cycle_id: cycleId, date: today,
      ...ratings, sleep_hours: sleepHours, exercised,
      plan_adherence: adherence, notes: notes || null,
    });

    setSaved(true);
    setLoading(false);
  }

  if (alreadyLogged || saved) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-[#00E676] mb-2">Check-in Complete</h2>
          <p className="text-sm text-[#9A9A9A]">{saved ? "Today's check-in saved." : "You've already logged today."} Come back tomorrow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">Daily Check-in</h1>
        <p className="text-xs text-[#4A4A4A]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">How are you feeling?</div>
          {METRICS.map(({ key, label, emojis }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)]">
              <span className="text-sm text-[#E0E0E0] w-32">{label}</span>
              <div className="flex gap-2">
                {emojis.map((emoji, i) => (
                  <button key={i} type="button"
                    onClick={() => setRatings(prev => ({ ...prev, [key]: i + 1 }))}
                    className={`w-10 h-10 flex items-center justify-center text-lg border transition-colors
                      ${ratings[key] === i + 1 ? 'border-[#00E676] bg-[rgba(0,230,118,0.12)]' : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.2)]'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Sleep & Activity</div>
          <div className="mb-4">
            <div className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2">Hours slept</div>
            <input type="range" min="3" max="12" step="0.5" value={sleepHours}
              onChange={e => setSleepHours(Number(e.target.value))}
              className="w-full accent-[#00E676]" />
            <div className="text-center text-[#00E676] font-bold">{sleepHours}h</div>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-[#E0E0E0]">Exercised today?</span>
            <button type="button" onClick={() => setExercised(!exercised)}
              className={`w-12 h-6 rounded-full transition-colors relative ${exercised ? 'bg-[#00E676]' : 'bg-[#1f1f1f] border border-[rgba(255,255,255,0.1)]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${exercised ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Plan Adherence</div>
          <div className="grid grid-cols-2 gap-2">
            {([['fully', 'Fully'], ['mostly', 'Mostly'], ['partially', 'Partially'], ['not_today', 'Not Today']] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setAdherence(val)}
                className={`py-2.5 text-xs border font-semibold transition-colors
                  ${adherence === val ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Notes (optional)</div>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="How was your day? Any observations..."
            className="w-full px-3 py-2 text-sm bg-[#1f1f1f] border border-[rgba(255,255,255,0.07)] text-white placeholder-[#4A4A4A] focus:border-[#00E676] outline-none resize-none"
          />
        </Card>

        <Button type="submit" loading={loading} fullWidth>Save Check-in →</Button>
      </form>
    </div>
  );
}
