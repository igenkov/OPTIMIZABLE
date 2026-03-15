'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface CheckIn {
  id?: string;
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  mood: number;
  energy: number;
  libido: number;
  stress: number;
  mental_clarity: number;
  morning_erection: boolean | null;
  exercised: boolean;
  plan_adherence: 'fully' | 'mostly' | 'partially' | 'not_today';
  notes: string;
}

const BLANK: Omit<CheckIn, 'date'> = {
  sleep_hours: 7,
  sleep_quality: 7,
  mood: 7,
  energy: 7,
  libido: 6,
  stress: 5,
  mental_clarity: 7,
  morning_erection: null,
  exercised: false,
  plan_adherence: 'fully',
  notes: '',
};

// SVG sparkline — single metric over 30 days
function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const W = 300; const H = 40; const PAD = 4;
  const points = values.filter((v): v is number => v !== null);
  if (points.length < 2) return <div className="h-10 bg-[rgba(255,255,255,0.03)]" />;

  const xStep = (W - PAD * 2) / (values.length - 1);
  let path = '';
  let first = true;
  values.forEach((v, i) => {
    if (v === null) { first = true; return; }
    const x = PAD + i * xStep;
    const y = H - PAD - ((v - 1) / 9) * (H - PAD * 2);
    path += `${first ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    first = false;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <path d={path.trim()} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Main trend chart — overlay of all metrics
function TrendChart({ checkins }: { checkins: CheckIn[] }) {
  if (checkins.length < 2) return null;
  const W = 600; const H = 140; const PAD = 12;

  const metrics = [
    { key: 'energy' as const, color: '#00E676', label: 'Energy' },
    { key: 'mood' as const, color: '#64B5F6', label: 'Mood' },
    { key: 'libido' as const, color: '#FF5252', label: 'Libido' },
    { key: 'sleep_quality' as const, color: '#FFB300', label: 'Sleep' },
    { key: 'mental_clarity' as const, color: '#CE93D8', label: 'Clarity' },
  ];

  function getPath(key: keyof CheckIn): string {
    const xStep = (W - PAD * 2) / (checkins.length - 1);
    return checkins.map((c, i) => {
      const val = c[key] as number;
      if (!val) return '';
      const x = PAD + i * xStep;
      const y = H - PAD - ((val - 1) / 9) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
  }

  // Y-axis labels
  const yLabels = [10, 7, 4, 1];

  return (
    <div>
      <div className="flex gap-4 mb-3 flex-wrap">
        {metrics.map(m => (
          <div key={m.key} className="flex items-center gap-1.5">
            <div className="w-6 h-0.5" style={{ background: m.color }} />
            <span className="text-[10px] text-[#4A4A4A]">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="relative">
        {/* Y-axis guides */}
        {yLabels.map(v => {
          const y = H - PAD - ((v - 1) / 9) * (H - PAD * 2);
          return (
            <div
              key={v}
              className="absolute left-0 right-0 border-t border-[rgba(255,255,255,0.04)] pointer-events-none"
              style={{ top: `${(y / H) * 100}%` }}
            >
              <span className="text-[8px] text-[#4A4A4A] absolute -top-2 -left-5">{v}</span>
            </div>
          );
        })}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
          {metrics.map(m => (
            <path key={m.key} d={getPath(m.key)} fill="none" stroke={m.color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
          ))}
        </svg>
      </div>
      {/* Morning erection binary row */}
      {checkins.some(c => c.morning_erection !== null) && (
        <div className="mt-2">
          <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-1">Morning Erection</div>
          <div className="flex gap-1">
            {checkins.map((c, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-sm"
                style={{
                  background: c.morning_erection === null
                    ? 'rgba(255,255,255,0.05)'
                    : c.morning_erection
                    ? '#00E676'
                    : 'rgba(255,82,82,0.3)',
                }}
                title={c.morning_erection === null ? 'No data' : c.morning_erection ? 'Yes' : 'No'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Rating selector — dots
function RatingDots({ value, onChange, color = '#00E676' }: { value: number; onChange: (v: number) => void; color?: string }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="w-5 h-5 rounded-full border transition-all"
          style={{
            background: n <= value ? color : 'transparent',
            borderColor: n <= value ? color : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </div>
  );
}

export default function WellbeingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const [todayData, setTodayData] = useState<CheckIn | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cycleRes, todayRes, historyRes] = await Promise.all([
        supabase.from('optimization_cycles').select('id').eq('user_id', user.id).eq('status', 'active').single(),
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).order('date', { ascending: true }).limit(30),
      ]);

      setCycleId(cycleRes.data?.id ?? null);
      setCheckins((historyRes.data ?? []) as CheckIn[]);

      if (todayRes.data) {
        setTodayDone(true);
        setTodayData(todayRes.data as CheckIn);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      cycle_id: cycleId,
      date: today,
      sleep_hours: form.sleep_hours,
      sleep_quality: form.sleep_quality,
      mood: form.mood,
      energy: form.energy,
      libido: form.libido,
      stress: form.stress,
      mental_clarity: form.mental_clarity,
      morning_erection: form.morning_erection,
      exercised: form.exercised,
      plan_adherence: form.plan_adherence,
      notes: form.notes || null,
    };

    const { data, error: err } = await supabase.from('daily_checkins').insert(payload).select().single();
    if (err) { setError(err.message); setSaving(false); return; }

    setTodayDone(true);
    setTodayData(data as CheckIn);
    setCheckins(prev => [...prev, data as CheckIn]);
    setSaving(false);
  }

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-6 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Daily Check-in</div>
        <h1 className="text-xl font-black tracking-[2px] uppercase text-white mb-1">Wellbeing</h1>
        <p className="text-[11px] text-[#4A4A4A]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* 30-day trend graph */}
      {checkins.length >= 2 && (
        <Card className="mb-6">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">
            30-Day Trend
          </div>
          <TrendChart checkins={checkins} />
        </Card>
      )}

      {/* Today done state */}
      {todayDone && todayData ? (
        <Card className="mb-6">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">
            Today's Check-in — Complete
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Energy', value: todayData.energy, color: '#00E676' },
              { label: 'Mood', value: todayData.mood, color: '#64B5F6' },
              { label: 'Libido', value: todayData.libido, color: '#FF5252' },
              { label: 'Sleep Quality', value: todayData.sleep_quality, color: '#FFB300' },
              { label: 'Mental Clarity', value: todayData.mental_clarity, color: '#CE93D8' },
              { label: 'Stress', value: todayData.stress, color: '#9A9A9A' },
            ].map(m => (
              <div key={m.label}>
                <div className="text-[10px] text-[#4A4A4A] uppercase tracking-widest mb-0.5">{m.label}</div>
                <div className="text-lg font-bold" style={{ color: m.color }}>{m.value}<span className="text-[10px] text-[#4A4A4A]">/10</span></div>
              </div>
            ))}
          </div>
          <div className="flex gap-6 text-[11px] text-[#9A9A9A] pt-3 border-t border-[rgba(255,255,255,0.05)]">
            <span>Sleep: {todayData.sleep_hours}h</span>
            <span>Exercise: {todayData.exercised ? '✓ Yes' : '✗ No'}</span>
            {todayData.morning_erection !== null && (
              <span>Morning erection: {todayData.morning_erection ? '✓ Yes' : '✗ No'}</span>
            )}
          </div>
        </Card>
      ) : (
        /* Check-in form */
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Card>
            <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-5">Today's Check-in</div>

            {/* Morning erection — top priority indicator */}
            <div className="mb-5 pb-5 border-b border-[rgba(255,255,255,0.05)]">
              <div className="text-[11px] font-semibold text-[#E0E0E0] mb-3">Morning Erection</div>
              <div className="flex gap-3">
                {[{ val: true, label: 'YES' }, { val: false, label: 'NO' }].map(opt => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => set('morning_erection', opt.val)}
                    className={`flex-1 py-2 text-[11px] font-bold border transition-colors ${
                      form.morning_erection === opt.val
                        ? opt.val
                          ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]'
                          : 'border-[#FF5252] text-[#FF5252] bg-[rgba(255,82,82,0.08)]'
                        : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating metrics */}
            {([
              { key: 'energy' as const, label: 'Energy', color: '#00E676' },
              { key: 'mood' as const, label: 'Mood', color: '#64B5F6' },
              { key: 'libido' as const, label: 'Libido', color: '#FF5252' },
              { key: 'sleep_quality' as const, label: 'Sleep Quality', color: '#FFB300' },
              { key: 'mental_clarity' as const, label: 'Mental Clarity', color: '#CE93D8' },
              { key: 'stress' as const, label: 'Stress Level', color: '#9A9A9A' },
            ]).map(m => (
              <div key={m.key} className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-[#E0E0E0]">{m.label}</div>
                  <div className="text-sm font-bold" style={{ color: m.color }}>{form[m.key]}<span className="text-[10px] text-[#4A4A4A]">/10</span></div>
                </div>
                <RatingDots value={form[m.key]} onChange={v => set(m.key, v)} color={m.color} />
              </div>
            ))}

            {/* Sleep hours */}
            <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-[#E0E0E0]">Sleep Hours</div>
                <div className="text-sm font-bold text-white">{form.sleep_hours}h</div>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={form.sleep_hours}
                onChange={e => set('sleep_hours', Number(e.target.value))}
                className="w-full accent-[#00E676]"
              />
              <div className="flex justify-between text-[9px] text-[#4A4A4A] mt-1">
                <span>3h</span><span>12h</span>
              </div>
            </div>

            {/* Exercised */}
            <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
              <div className="text-[11px] font-semibold text-[#E0E0E0] mb-3">Exercised Today</div>
              <div className="flex gap-3">
                {[{ val: true, label: 'YES' }, { val: false, label: 'NO' }].map(opt => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => set('exercised', opt.val)}
                    className={`flex-1 py-2 text-[11px] font-bold border transition-colors ${
                      form.exercised === opt.val
                        ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]'
                        : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan adherence */}
            <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
              <div className="text-[11px] font-semibold text-[#E0E0E0] mb-3">Protocol Adherence</div>
              <div className="flex gap-2 flex-wrap">
                {([
                  { val: 'fully', label: 'Fully' },
                  { val: 'mostly', label: 'Mostly' },
                  { val: 'partially', label: 'Partially' },
                  { val: 'not_today', label: 'Skipped' },
                ] as const).map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => set('plan_adherence', opt.val)}
                    className={`px-3 py-1.5 text-[11px] border transition-colors ${
                      form.plan_adherence === opt.val
                        ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]'
                        : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="text-[11px] font-semibold text-[#E0E0E0] mb-2">Notes (optional)</div>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Anything notable today..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-[#1f1f1f] border border-[rgba(255,255,255,0.07)] text-white placeholder-[#4A4A4A] focus:border-[#00E676] outline-none resize-none"
              />
            </div>
          </Card>

          {error && <p className="text-[11px] text-[#FF5252]">{error}</p>}
          <Button type="submit" loading={saving} fullWidth>
            SAVE CHECK-IN
          </Button>
        </form>
      )}

      {/* Per-metric sparklines — always visible */}
      {checkins.length >= 3 && (
        <Card className="mt-6">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Metric Trends</div>
          {([
            { key: 'energy' as const, label: 'Energy', color: '#00E676' },
            { key: 'mood' as const, label: 'Mood', color: '#64B5F6' },
            { key: 'libido' as const, label: 'Libido', color: '#FF5252' },
            { key: 'sleep_quality' as const, label: 'Sleep Quality', color: '#FFB300' },
            { key: 'mental_clarity' as const, label: 'Mental Clarity', color: '#CE93D8' },
          ]).map(m => {
            const values = checkins.map(c => (c[m.key] as number) ?? null);
            const latest = values.filter((v): v is number => v !== null).at(-1);
            return (
              <div key={m.key} className="py-2 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#9A9A9A]">{m.label}</span>
                  {latest && (
                    <span className="text-sm font-bold" style={{ color: m.color }}>
                      {latest}<span className="text-[10px] text-[#4A4A4A]">/10</span>
                    </span>
                  )}
                </div>
                <Sparkline values={values} color={m.color} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
