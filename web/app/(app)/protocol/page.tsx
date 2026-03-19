import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  Sun, Moon, Zap, Coffee, Clock, ShieldCheck,
  ChevronRight, Activity, Flame, Target,
  FlaskConical, ArrowRight,
} from 'lucide-react';
import type { AnalysisReport, OptimizationPlan } from '@/types';

// ── Phase definitions ────────────────────────────────────────────────────────
const PHASES = [
  { num: 1 as const, label: 'Foundation',  days: '1–30',  desc: 'Establish your baseline protocol.',             goal: 'Build consistency — the first 30 days set the trajectory.' },
  { num: 2 as const, label: 'Calibration', days: '31–60', desc: 'Adjusted protocol based on 30-day progress.',   goal: 'Fine-tune based on real results — your body has adapted.' },
  { num: 3 as const, label: 'Peak',        days: '61–90', desc: 'Maximum optimization based on 60-day results.', goal: 'Execute the peak window — maximize output.' },
];

// ── Icon engine ──────────────────────────────────────────────────────────────
function getTimingMeta(timing: string) {
  const t = timing.toLowerCase();
  if (t.includes('morning') || t.includes('am') || t.includes('wake'))
    return { Icon: Sun,   color: '#FFB300', bg: 'rgba(255,179,0,0.1)' };
  if (t.includes('evening') || t.includes('night') || t.includes('bed'))
    return { Icon: Moon,  color: '#CE93D8', bg: 'rgba(206,147,216,0.1)' };
  if (t.includes('workout') || t.includes('training') || t.includes('pre-'))
    return { Icon: Zap,   color: '#C8A2C8', bg: 'rgba(200,162,200,0.1)' };
  return   { Icon: Clock, color: '#64B5F6', bg: 'rgba(100,181,246,0.1)' };
}

const DIRECTIVE_META = {
  eating:   { title: 'Nutrition', Icon: Coffee,   color: '#64B5F6' },
  exercise: { title: 'Training',  Icon: Zap,      color: '#C8A2C8' },
  sleep:    { title: 'Sleep',     Icon: Moon,     color: '#CE93D8' },
  stress:   { title: 'Stress',    Icon: Activity, color: '#FFB300' },
  habits:   { title: 'Habits',    Icon: Target,   color: '#9A9A9A' },
} as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ProtocolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  if (userData?.subscription_tier === 'free') redirect('/dashboard');

  const { data: reports } = await supabase
    .from('analysis_reports').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const typedReports = (reports ?? []) as AnalysisReport[];

  const { data: cycle } = await supabase
    .from('optimization_cycles').select('start_date').eq('user_id', user.id)
    .eq('status', 'active').single();

  let currentDay = 0;
  let currentPhase: 1 | 2 | 3 = 1;
  if (cycle) {
    const startDate = new Date(cycle.start_date);
    currentDay = Math.min(90, Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1));
    currentPhase = currentDay <= 30 ? 1 : currentDay <= 60 ? 2 : 3;
  }

  const phaseDay      = currentDay > 0 ? ((currentDay - 1) % 30) + 1 : 1;
  const phaseProgress = Math.round(((phaseDay - 1) / 30) * 100);
  const daysRemaining = 30 - phaseDay;

  let nextLabDate: Date | null = null;
  let nextLabDays = 0;
  if (cycle && currentPhase < 3) {
    const start = new Date(cycle.start_date);
    nextLabDate = new Date(start);
    nextLabDate.setDate(nextLabDate.getDate() + currentPhase * 30);
    nextLabDays = Math.max(0, Math.ceil((nextLabDate.getTime() - Date.now()) / 86400000));
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (typedReports.length === 0) {
    return (
      <div className="px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="text-[11px] font-bold tracking-[3px] text-[#C8A2C8] uppercase mb-1">Optimization Roadmap</div>
          <h1 className="text-xl font-black tracking-[2px] uppercase text-white">90-Day Protocol</h1>
        </div>
        <Card className="text-center py-20">
          <FlaskConical size={48} className="mx-auto mb-6 text-[rgba(255,255,255,0.1)]" />
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Protocol Offline</h2>
          <p className="text-sm text-[#9A9A9A] mb-8 max-w-sm mx-auto leading-relaxed">
            Upload your initial bloodwork to generate your personalized 90-day biological optimization roadmap.
          </p>
          <Link href="/lab/upload"
            className="inline-block px-8 py-3 bg-[#C8A2C8] text-black font-black text-sm tracking-widest uppercase hover:bg-[#A882A8] transition-colors">
            Initialize Lab Sequence →
          </Link>
        </Card>
      </div>
    );
  }

  const currentPhaseData = PHASES[currentPhase - 1];
  const currentReport    = typedReports[currentPhase - 1] ?? typedReports[typedReports.length - 1];
  const recs: OptimizationPlan = currentReport?.recommendations ?? ({} as OptimizationPlan);
  const isLocked = !currentReport;

  return (
    <div className="px-4 lg:px-8 py-5 lg:py-6">

      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#C8A2C8] animate-pulse" />
            <span className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-[4px]">Active_Protocol</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">90-Day Cycle</h1>
        </div>
      </div>

      {/* ── Phase stepper ── */}
      <div className="grid grid-cols-3 gap-4 mb-10 relative">
        <div className="absolute top-5 left-0 right-0 h-px bg-[rgba(255,255,255,0.05)] z-0" />
        {PHASES.map(p => {
          const isActive = p.num === currentPhase;
          const isDone   = p.num < currentPhase;
          return (
            <div key={p.num} className="relative z-10 flex flex-col items-center">
              <div className={cn(
                'w-10 h-10 rounded-full border-2 flex items-center justify-center mb-3 bg-[#141414] transition-all duration-300',
                isActive ? 'border-[#C8A2C8] shadow-[0_0_20px_rgba(200,162,200,0.2)]'
                         : isDone  ? 'border-[rgba(200,162,200,0.35)]'
                                   : 'border-[rgba(255,255,255,0.06)]',
              )}>
                {isDone
                  ? <ShieldCheck size={16} className="text-[#C8A2C8]" />
                  : <span className={cn('text-xs font-black', isActive ? 'text-[#C8A2C8]' : 'text-[#3A3A3A]')}>{p.num}</span>
                }
              </div>
              <span className={cn('text-[10px] font-black uppercase tracking-widest mb-0.5', isActive ? 'text-white' : 'text-[#3A3A3A]')}>
                {p.label}
              </span>
              <span className="text-[9px] font-mono text-[#3A3A3A] uppercase">Days {p.days}</span>
              {isActive && currentDay > 0 && (
                <span className="text-[9px] font-bold text-[#C8A2C8] mt-0.5 tracking-widest">Day {currentDay}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Main bento (8/4) ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── LEFT (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">

          {/* Today's mission */}
          <div className="border-l-4 border-[#C8A2C8] px-5 py-4"
            style={{ background: 'rgba(200,162,200,0.04)', borderRadius: '0 6px 6px 0' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Target size={13} className="text-[#C8A2C8]" />
              <span className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-[3px]">Current Mission</span>
            </div>
            <p className="text-base font-bold text-[#E0E0E0] leading-snug">{currentPhaseData.goal}</p>
          </div>

          {isLocked ? (
            <Card className="text-center py-12">
              <div className="w-12 h-12 rounded-full border border-[rgba(255,255,255,0.07)] flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={20} className="text-[#3A3A3A]" />
              </div>
              <div className="text-sm font-bold text-white mb-2">Phase {currentPhase}: {currentPhaseData.label}</div>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed mb-6 max-w-xs mx-auto">
                {currentPhase === 2
                  ? 'Complete your 30-day bloodwork panel to unlock the Calibration protocol.'
                  : 'Complete your 60-day bloodwork panel to unlock the Peak protocol.'}
              </p>
              <Link href="/lab/upload"
                className="inline-block px-6 py-2.5 border border-[#C8A2C8] text-[#C8A2C8] font-bold text-xs tracking-widest uppercase hover:bg-[rgba(200,162,200,0.08)] transition-colors">
                Upload Bloodwork to Unlock →
              </Link>
            </Card>
          ) : (
            <>
              {/* Supplement stack */}
              {recs?.supplements?.length > 0 && (
                <Card className="p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Flame size={15} className="text-[#FF5252]" />
                      <span className="text-xs font-black text-white uppercase tracking-[2px]">Chemical Foundation</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                    {recs.supplements.map((s, i) => {
                      const { Icon, color, bg } = getTimingMeta(s.timing);
                      return (
                        <div key={i} className="px-5 py-4 flex items-start gap-4 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                          <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.06)]"
                            style={{ background: bg, color }}>
                            <Icon size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white uppercase tracking-tight">{s.name}</span>
                                {i < 3 && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-[rgba(255,179,0,0.1)] text-[#FFB300] border border-[rgba(255,179,0,0.2)] font-black uppercase tracking-tight">
                                    Priority
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-sm font-black text-[#C8A2C8]">{s.dose}</span>
                            </div>
                            <div className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-widest mb-2">{s.timing}</div>
                            <p className="text-[11px] text-[#5A5A5A] leading-relaxed italic border-l border-[rgba(255,255,255,0.05)] pl-3">
                              &ldquo;{s.reason}&rdquo;
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Lifestyle directives — 2-col expandable grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.entries(DIRECTIVE_META) as [keyof typeof DIRECTIVE_META, typeof DIRECTIVE_META[keyof typeof DIRECTIVE_META]][]).map(([key, meta]) => {
                  const items: string[] = (recs as unknown as Record<string, string[]>)[key] ?? [];
                  if (!items.length) return null;
                  const { Icon } = meta;
                  return (
                    <details key={key} className="group border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all"
                      style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.02) 0%, rgba(20,20,20,0) 60%), #141414' }}>
                      <summary className="px-4 py-3.5 flex items-center justify-between cursor-pointer list-none">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded flex items-center justify-center"
                            style={{ background: `${meta.color}14`, color: meta.color }}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-white uppercase tracking-widest">{meta.title}</div>
                            <div className="text-[9px] text-[#4A4A4A]">{items.length} directive{items.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <ChevronRight size={13} className="text-[#3A3A3A] group-open:rotate-90 transition-transform duration-200" />
                      </summary>
                      <div className="px-4 pb-4 pt-2 flex flex-col gap-2.5 border-t border-[rgba(255,255,255,0.04)]">
                        {items.map((text, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <span className="font-black text-xs shrink-0 mt-0.5" style={{ color: meta.color }}>/</span>
                            <span className="text-[11px] text-[#9A9A9A] leading-relaxed">{text}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

          {/* Phase progress */}
          {currentDay > 0 && (
            <Card topAccent="rgba(200,162,200,0.5)">
              <div className="text-[10px] font-black text-[#4A4A4A] uppercase tracking-[3px] mb-5">Phase Monitoring</div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-4xl font-black text-white tabular-nums leading-none">{phaseDay}</span>
                  <span className="text-xs text-[#4A4A4A] font-bold ml-2">/ 30</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-[#C8A2C8] uppercase">Day {currentDay} Total</div>
                  <div className="text-[10px] text-[#4A4A4A]">{daysRemaining}d remaining</div>
                </div>
              </div>
              <div className="h-1 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[#C8A2C8] rounded-full transition-all"
                  style={{ width: `${phaseProgress}%`, boxShadow: '0 0 8px rgba(200,162,200,0.5)' }} />
              </div>
              <p className="text-[10px] text-[#4A4A4A] uppercase font-bold tracking-tight">
                Stage: {currentPhaseData.label}
              </p>
            </Card>
          )}

          {/* Next lab trigger */}
          {nextLabDate && (
            <Card topAccent={nextLabDays <= 7 ? 'rgba(255,82,82,0.6)' : 'rgba(255,179,0,0.5)'}>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical size={13} style={{ color: nextLabDays <= 7 ? '#FF5252' : '#FFB300' }} />
                <span className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: nextLabDays <= 7 ? '#FF5252' : '#FFB300' }}>
                  Next Lab Trigger
                </span>
              </div>
              <div className="text-4xl font-black text-white mb-1 tabular-nums">{nextLabDays}</div>
              <p className="text-[11px] text-[#4A4A4A] uppercase font-bold tracking-tight mb-4">
                Days until calibration window
              </p>
              <div className="text-[11px] text-[#9A9A9A] mb-4">
                {nextLabDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — unlock{' '}
                <span className="text-white font-semibold">{PHASES[currentPhase].label}</span> protocol
              </div>
              <Link href="/lab/upload"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-[rgba(255,255,255,0.08)] text-[#9A9A9A] font-bold text-[10px] tracking-widest uppercase hover:bg-[rgba(255,255,255,0.04)] hover:text-white transition-all">
                Prepare Submission <ArrowRight size={11} />
              </Link>
            </Card>
          )}

          {/* Phase goal */}
          <Card>
            <div className="text-[10px] font-black text-[#4A4A4A] uppercase tracking-[3px] mb-3">Phase Goal</div>
            <div className="text-[10px] font-bold text-[#C8A2C8] uppercase tracking-widest mb-1">{currentPhaseData.label}</div>
            <p className="text-[11px] text-[#9A9A9A] leading-relaxed mb-3">{currentPhaseData.desc}</p>
            {recs?.supplements?.length > 0 && (
              <div className="pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-1">Stack summary</div>
                <div className="text-2xl font-black text-white">{recs.supplements.length}</div>
                <div className="text-[10px] text-[#4A4A4A]">supplements prescribed</div>
              </div>
            )}
          </Card>

          {/* Biological history */}
          {typedReports.slice(0, currentPhase - 1).length > 0 && (
            <div>
              <div className="text-[9px] font-black text-[#4A4A4A] uppercase tracking-[4px] mb-2">Biological History</div>
              <div className="flex flex-col gap-2">
                {typedReports.slice(0, currentPhase - 1).map((r, i) => (
                  <div key={i}
                    className="px-4 py-3 border border-[rgba(255,255,255,0.05)] flex items-center justify-between opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
                    style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.02) 0%, rgba(20,20,20,0) 55%), #141414' }}>
                    <span className="text-[10px] font-black text-white uppercase">Phase {i + 1} Baseline</span>
                    <div className="font-mono text-sm font-black text-[#C8A2C8]">
                      {r.health_score ?? '--'}<span className="text-[9px] text-[#4A4A4A]">/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked future phases */}
          {PHASES.filter(p => p.num > currentPhase).map(p => (
            <div key={p.num}
              className="px-4 py-3 border border-[rgba(255,255,255,0.04)] flex items-center justify-between opacity-30"
              style={{ background: '#141414' }}>
              <div className="text-[10px] font-bold text-[#3A3A3A] tracking-widest uppercase">
                Phase {p.num}: {p.label}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-[#3A3A3A]">
                <ShieldCheck size={10} /> Days {p.days}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
