'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────
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
  sleep_hours: 7, sleep_quality: 7, mood: 7, energy: 7,
  libido: 6, stress: 5, mental_clarity: 7,
  morning_erection: null, exercised: false,
  plan_adherence: 'fully', notes: '',
};

// ── Metric config ────────────────────────────────────────────────────────────
const METRICS = [
  { key: 'energy'         as const, label: 'Energy',        color: '#00E676' },
  { key: 'mood'           as const, label: 'Mood',          color: '#64B5F6' },
  { key: 'libido'         as const, label: 'Libido',        color: '#FF5252' },
  { key: 'sleep_quality'  as const, label: 'Sleep',         color: '#FFB300' },
  { key: 'mental_clarity' as const, label: 'Clarity',       color: '#CE93D8' },
] as const;

type MetricKey = typeof METRICS[number]['key'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcStreak(checkins: CheckIn[]): number {
  if (!checkins.length) return 0;
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let cursor = new Date(today);
  for (const c of sorted) {
    const d = cursor.toISOString().split('T')[0];
    if (c.date === d) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function calc7DayDelta(checkins: CheckIn[], key: MetricKey): { delta: number; avg: number } | null {
  if (checkins.length < 2) return null;
  const recent = checkins.slice(-7).map(c => c[key] as number).filter(Boolean);
  const prior  = checkins.slice(-14, -7).map(c => c[key] as number).filter(Boolean);
  if (!recent.length || !prior.length) return null;
  const avg  = recent.reduce((s, v) => s + v, 0) / recent.length;
  const prev = prior.reduce((s, v) => s + v, 0) / prior.length;
  return { delta: +(avg - prev).toFixed(1), avg: +avg.toFixed(1) };
}

// ── Sparkline (mini SVG) ─────────────────────────────────────────────────────
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const pts = values.slice(-14);
  if (pts.length < 2) return <div className="h-8 bg-[rgba(255,255,255,0.03)]" />;
  const W = 120; const H = 32; const PAD = 2;
  const min = Math.min(...pts); const max = Math.max(...pts);
  const range = max - min || 1;
  const xStep = (W - PAD * 2) / (pts.length - 1);
  const path = pts.map((v, i) => {
    const x = +(PAD + i * xStep).toFixed(1);
    const y = +(H - PAD - ((v - min) / range) * (H - PAD * 2)).toFixed(1);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <filter id={`glow-${color.replace('#','')}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"
        filter={`url(#glow-${color.replace('#','')})`} opacity="0.9" />
    </svg>
  );
}

// ── Recharts custom tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 border border-[rgba(255,255,255,0.1)]"
      style={{ background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(8px)', minWidth: 140 }}>
      <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[10px] text-[#9A9A9A]">{p.name}</span>
          </div>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Bio slider ───────────────────────────────────────────────────────────────
function ColorSlider({ value, onChange, color, min = 1, max = 10 }: {
  value: number; onChange: (v: number) => void; color: string; min?: number; max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex items-center h-4">
      {/* Background track */}
      <div className="absolute w-full h-[2px] bg-white/5 rounded-full" />
      {/* Progress fill */}
      <div className="absolute h-[2px] rounded-full transition-all duration-150 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}50` }} />
      <input
        type="range" min={min} max={max} step="1" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 outline-none
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-[3px]
          [&::-webkit-slider-thumb]:border-black
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-[3px]
          [&::-moz-range-thumb]:border-black
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

// ── Metric bento card ─────────────────────────────────────────────────────────
function MetricCard({ metric, checkins }: { metric: typeof METRICS[number]; checkins: CheckIn[] }) {
  const values = checkins.map(c => c[metric.key] as number).filter(Boolean);
  const latest = values.at(-1);
  const delta = calc7DayDelta(checkins, metric.key);

  return (
    <div className="p-3 border border-[rgba(255,255,255,0.06)]"
      style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.03) 0%, rgba(20,20,20,0) 60%), #141414' }}>
      <div className="text-[9px] text-[#4A4A4A] uppercase tracking-[3px] mb-1">{metric.label}</div>
      <div className="text-2xl font-black leading-none mb-1" style={{ color: metric.color }}>
        {latest ?? '—'}<span className="text-[10px] text-[#4A4A4A] font-normal">/10</span>
      </div>
      {delta && (
        <div className="text-[10px] mb-2" style={{ color: delta.delta > 0 ? '#00E676' : delta.delta < 0 ? '#FF5252' : '#4A4A4A' }}>
          {delta.delta > 0 ? '+' : ''}{delta.delta} <span className="text-[#4A4A4A]">7d avg</span>
        </div>
      )}
      <MiniSparkline values={values} color={metric.color} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WellbeingPage() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const [todayData, setTodayData] = useState<CheckIn | null>(null);
  const [form, setForm]           = useState({ ...BLANK });
  const [checkins, setCheckins]   = useState<CheckIn[]>([]);
  const [cycleId, setCycleId]     = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

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
      if (todayRes.data) { setTodayDone(true); setTodayData(todayRes.data as CheckIn); }
      setLoading(false);
    }
    load();
  }, []);

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  // Form completion progress
  const answered = [
    form.morning_erection !== null,
    form.energy !== BLANK.energy || form.mood !== BLANK.mood,
    form.sleep_quality !== BLANK.sleep_quality,
    form.mental_clarity !== BLANK.mental_clarity,
    form.exercised !== BLANK.exercised,
    form.plan_adherence !== 'fully' || true, // always counts
  ].filter(Boolean).length;
  const formProgress = Math.round((answered / 5) * 100);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id, cycle_id: cycleId, date: today,
      sleep_hours: form.sleep_hours, sleep_quality: form.sleep_quality,
      mood: form.mood, energy: form.energy, libido: form.libido,
      stress: form.stress, mental_clarity: form.mental_clarity,
      morning_erection: form.morning_erection, exercised: form.exercised,
      plan_adherence: form.plan_adherence, notes: form.notes || null,
    };
    const { data, error: err } = await supabase.from('daily_checkins').insert(payload).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    setTodayDone(true);
    setTodayData(data as CheckIn);
    setCheckins(prev => [...prev, data as CheckIn]);
    setSaving(false);
  }

  // Build chart data
  const chartData = checkins.map(c => ({
    date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Energy: c.energy, Mood: c.mood, Libido: c.libido,
    Sleep: c.sleep_quality, Clarity: c.mental_clarity,
  }));

  const toggleLine = useCallback((key: string) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const streak = calcStreak(checkins);

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-6 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="px-6 lg:px-8 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Daily Check-in</div>
          <h1 className="text-xl font-black tracking-[2px] uppercase text-white mb-1">Wellbeing</h1>
          <p className="text-[11px] text-[#4A4A4A]">{dateStr}</p>
        </div>
        {streak > 0 && (
          <div className="text-right">
            <div className="text-2xl font-black text-white">{streak}</div>
            <div className="text-[9px] text-[#00E676] uppercase tracking-widest">day streak</div>
          </div>
        )}
      </div>

      {/* ── Main 5/7 grid ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── LEFT: Form (5 cols) ── */}
        <div className="col-span-12 lg:col-span-5">

          {todayDone && todayData ? (
            /* Completed state — Digital Receipt */
            <Card topAccent="rgba(0,230,118,0.5)" className="relative overflow-hidden">
              {/* Stamp watermark */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-4 border-[rgba(0,230,118,0.08)] rounded-full flex items-center justify-center -rotate-12 pointer-events-none">
                <span className="text-[rgba(0,230,118,0.08)] font-black text-[9px] tracking-[4px] uppercase">Logged</span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 rounded-full border border-[rgba(0,230,118,0.4)] bg-[rgba(0,230,118,0.1)] flex items-center justify-center shrink-0"
                  style={{ boxShadow: '0 0 15px rgba(0,230,118,0.15)' }}>
                  <svg className="w-5 h-5 text-[#00E676]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-white uppercase tracking-wider">Mission Accomplished</div>
                  <div className="text-[10px] font-mono text-[#4A4A4A]">BIO_DATA_SECURED // {today}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Energy',    value: todayData.energy,        color: '#00E676' },
                  { label: 'Mood',      value: todayData.mood,          color: '#64B5F6' },
                  { label: 'Libido',    value: todayData.libido,        color: '#FF5252' },
                  { label: 'Sleep',     value: todayData.sleep_quality, color: '#FFB300' },
                  { label: 'Clarity',   value: todayData.mental_clarity,color: '#CE93D8' },
                  { label: 'Stress',    value: todayData.stress,        color: '#9A9A9A' },
                ].map(m => (
                  <div key={m.label} className="text-center p-2 border border-[rgba(255,255,255,0.05)]">
                    <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-0.5">{m.label}</div>
                    <div className="text-lg font-black" style={{ color: m.color }}>
                      {m.value}<span className="text-[9px] text-[#4A4A4A] font-normal">/10</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-5 text-[10px] text-[#9A9A9A] pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <span>Sleep: {todayData.sleep_hours}h</span>
                <span>Exercise: {todayData.exercised ? '✓' : '✗'}</span>
                {todayData.morning_erection !== null && (
                  <span>ME: {todayData.morning_erection ? '✓' : '✗'}</span>
                )}
              </div>
              {streak >= 3 && (
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)] text-center">
                  <div className="text-[11px] font-bold text-[#FFB300]">🔥 {streak}-day streak</div>
                  <div className="text-[10px] text-[#4A4A4A]">Keep it going tomorrow</div>
                </div>
              )}
            </Card>
          ) : (
            /* Check-in form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">

              {/* Form progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Check-in progress</div>
                  <div className="text-[9px] text-[#00E676] font-bold">{formProgress}%</div>
                </div>
                <div className="h-0.5 bg-[rgba(255,255,255,0.05)]">
                  <div className="h-full bg-[#00E676] transition-all duration-300" style={{ width: `${formProgress}%` }} />
                </div>
              </div>

              {/* ── Physical Biomarkers ── */}
              <Card>
                <div className="text-[9px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-4">Physical Biomarkers</div>

                {/* Morning Erection */}
                <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold text-[#E0E0E0]">Morning Erection</div>
                    <div className="text-[10px] text-[#4A4A4A]">Key T indicator</div>
                  </div>
                  <div className="flex gap-2">
                    {[{ val: true, label: 'YES' }, { val: false, label: 'NO' }].map(opt => (
                      <button key={String(opt.val)} type="button" onClick={() => set('morning_erection', opt.val)}
                        className={`flex-1 py-2.5 text-[11px] font-black tracking-widest border transition-all ${
                          form.morning_erection === opt.val
                            ? opt.val
                              ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.1)]'
                              : 'border-[#FF5252] text-[#FF5252] bg-[rgba(255,82,82,0.08)]'
                            : 'border-[rgba(255,255,255,0.07)] text-[#4A4A4A] hover:border-[rgba(255,255,255,0.15)]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy + Libido */}
                {[
                  { key: 'energy' as const, label: 'Energy', color: '#00E676' },
                  { key: 'libido' as const, label: 'Libido', color: '#FF5252' },
                ].map(m => (
                  <div key={m.key} className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-semibold text-[#E0E0E0]">{m.label}</div>
                      <div className="text-sm font-black tabular-nums" style={{ color: m.color }}>
                        {form[m.key]}<span className="text-[10px] text-[#4A4A4A] font-normal">/10</span>
                      </div>
                    </div>
                    <ColorSlider value={form[m.key]} onChange={v => set(m.key, v)} color={m.color} />
                    <div className="flex justify-between text-[9px] text-[#3A3A3A] mt-1"><span>1</span><span>10</span></div>
                  </div>
                ))}

                {/* Sleep Hours */}
                <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold text-[#E0E0E0]">Sleep Hours</div>
                    <div className="text-sm font-black text-white">{form.sleep_hours}h</div>
                  </div>
                  <ColorSlider value={form.sleep_hours} onChange={v => set('sleep_hours', v)} color="#FFB300" min={3} max={12} />
                  <div className="flex justify-between text-[9px] text-[#3A3A3A] mt-1"><span>3h</span><span>12h</span></div>
                </div>

                {/* Sleep Quality */}
                <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold text-[#E0E0E0]">Sleep Quality</div>
                    <div className="text-sm font-black tabular-nums" style={{ color: '#FFB300' }}>
                      {form.sleep_quality}<span className="text-[10px] text-[#4A4A4A] font-normal">/10</span>
                    </div>
                  </div>
                  <ColorSlider value={form.sleep_quality} onChange={v => set('sleep_quality', v)} color="#FFB300" />
                  <div className="flex justify-between text-[9px] text-[#3A3A3A] mt-1"><span>1</span><span>10</span></div>
                </div>

                {/* Exercised */}
                <div>
                  <div className="text-[11px] font-semibold text-[#E0E0E0] mb-2">Exercised Today</div>
                  <div className="flex gap-2">
                    {[{ val: true, label: 'YES' }, { val: false, label: 'NO' }].map(opt => (
                      <button key={String(opt.val)} type="button" onClick={() => set('exercised', opt.val)}
                        className={`flex-1 py-2.5 text-[11px] font-black tracking-widest border transition-all ${
                          form.exercised === opt.val
                            ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.1)]'
                            : 'border-[rgba(255,255,255,0.07)] text-[#4A4A4A] hover:border-[rgba(255,255,255,0.15)]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* ── Cognitive / Mental State ── */}
              <Card>
                <div className="text-[9px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-4">Cognitive / Mental State</div>
                {[
                  { key: 'mood'           as const, label: 'Mood',          color: '#64B5F6' },
                  { key: 'mental_clarity' as const, label: 'Mental Clarity', color: '#CE93D8' },
                  { key: 'stress'         as const, label: 'Stress Level',  color: '#9A9A9A' },
                ].map(m => (
                  <div key={m.key} className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)] last:border-0 last:mb-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-semibold text-[#E0E0E0]">{m.label}</div>
                      <div className="text-sm font-black tabular-nums" style={{ color: m.color }}>
                        {form[m.key]}<span className="text-[10px] text-[#4A4A4A] font-normal">/10</span>
                      </div>
                    </div>
                    <ColorSlider value={form[m.key]} onChange={v => set(m.key, v)} color={m.color} />
                    <div className="flex justify-between text-[9px] text-[#3A3A3A] mt-1"><span>1</span><span>10</span></div>
                  </div>
                ))}
              </Card>

              {/* Protocol Adherence + Notes */}
              <Card>
                <div className="text-[9px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-4">Protocol</div>
                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-[#E0E0E0] mb-2">Adherence</div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { val: 'fully',    label: 'Fully' },
                      { val: 'mostly',   label: 'Mostly' },
                      { val: 'partially',label: 'Partially' },
                      { val: 'not_today',label: 'Skipped' },
                    ] as const).map(opt => (
                      <button key={opt.val} type="button" onClick={() => set('plan_adherence', opt.val)}
                        className={`py-2 text-[11px] font-bold border transition-all ${
                          form.plan_adherence === opt.val
                            ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]'
                            : 'border-[rgba(255,255,255,0.07)] text-[#4A4A4A] hover:border-[rgba(255,255,255,0.12)]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#E0E0E0] mb-2">Notes (optional)</div>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Anything notable today..." rows={2}
                    className="w-full px-3 py-2 text-sm bg-[#1f1f1f] border border-[rgba(255,255,255,0.07)] text-white placeholder-[#4A4A4A] focus:border-[#00E676] outline-none resize-none" />
                </div>
              </Card>

              {error && <p className="text-[11px] text-[#FF5252]">{error}</p>}
              <Button type="submit" loading={saving} fullWidth>SAVE CHECK-IN</Button>
            </form>
          )}
        </div>

        {/* ── RIGHT: Visualization dashboard (7 cols) ── */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">

          {/* Recharts Trend Chart */}
          {checkins.length >= 2 ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase">30-Day Trend</div>
                <div className="text-[9px] text-[#4A4A4A]">{checkins.length} check-ins</div>
              </div>

              {/* Toggleable legend */}
              <div className="flex flex-wrap gap-2 mb-4">
                {METRICS.map(m => (
                  <button key={m.key} type="button" onClick={() => toggleLine(m.label)}
                    className="flex items-center gap-1.5 px-2 py-1 border transition-all"
                    style={{
                      borderColor: hiddenLines.has(m.label) ? 'rgba(255,255,255,0.06)' : `${m.color}50`,
                      background: hiddenLines.has(m.label) ? 'transparent' : `${m.color}0d`,
                      opacity: hiddenLines.has(m.label) ? 0.35 : 1,
                    }}>
                    <div className="w-4 h-0.5" style={{ background: m.color }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: m.color }}>{m.label}</span>
                  </button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    {METRICS.map(m => (
                      <filter key={m.key} id={`line-glow-${m.key}`}>
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    ))}
                  </defs>
                  <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#3A3A3A', fontSize: 8 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#3A3A3A', fontSize: 8 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                  {METRICS.map(m => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.label}
                      stroke={m.color}
                      strokeWidth={2.5}
                      dot={false}
                      strokeOpacity={hiddenLines.has(m.label) ? 0.05 : 0.9}
                      activeDot={{ r: 4, strokeWidth: 0, fill: m.color }}
                      filter={hiddenLines.has(m.label) ? 'none' : `url(#line-glow-${m.key})`}
                      animationDuration={1000}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Morning erection binary row */}
              {checkins.some(c => c.morning_erection !== null) && (
                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-1.5">Morning Erection (30-day)</div>
                  <div className="flex gap-0.5">
                    {checkins.map((c, i) => (
                      <div key={i} className="flex-1 h-2"
                        style={{
                          background: c.morning_erection === null ? 'rgba(255,255,255,0.04)' : c.morning_erection ? '#00E676' : 'rgba(255,82,82,0.3)',
                        }}
                        title={c.morning_erection === null ? 'No data' : c.morning_erection ? 'Yes' : 'No'} />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">30-Day Trend</div>
              <div className="flex items-center justify-center h-32 text-center">
                <div>
                  <div className="text-[11px] text-[#4A4A4A] mb-1">Not enough data yet</div>
                  <div className="text-[10px] text-[#3A3A3A]">Complete 2+ check-ins to see trends</div>
                </div>
              </div>
            </Card>
          )}

          {/* Metric Bento Grid */}
          {checkins.length >= 3 && (
            <div>
              <div className="text-[9px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-2">Performance Metrics</div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {METRICS.map(m => (
                  <MetricCard key={m.key} metric={m} checkins={checkins} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
