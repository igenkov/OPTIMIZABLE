import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { AnalysisReport, OptimizationPlan } from '@/types';

// ── Phase definitions ────────────────────────────────────────────────────────
const PHASES = [
  { num: 1 as const, label: 'Foundation', days: '1–30', desc: 'Establish your baseline protocol from your initial bloodwork analysis.', goal: 'Build consistency — the first 30 days set the trajectory for everything that follows.' },
  { num: 2 as const, label: 'Calibration', days: '31–60', desc: 'Adjusted protocol based on your 30-day bloodwork progress.', goal: 'Fine-tune based on real results — your body has adapted; now we dial in.' },
  { num: 3 as const, label: 'Peak', days: '61–90', desc: 'Fine-tuned for maximum optimization based on your 60-day results.', goal: 'Execute the peak window — you have the foundation; now maximize output.' },
];

// ── Timing icon ──────────────────────────────────────────────────────────────
function timingIcon(timing: string): { icon: string; color: string; bg: string } {
  const t = timing.toLowerCase();
  if (t.includes('morning') || t.includes('am') || t.includes('breakfast') || t.includes('wake'))
    return { icon: '☀', color: '#FFB300', bg: 'rgba(255,179,0,0.1)' };
  if (t.includes('evening') || t.includes('night') || t.includes('pm') || t.includes('bed') || t.includes('sleep'))
    return { icon: '☾', color: '#CE93D8', bg: 'rgba(206,147,216,0.1)' };
  if (t.includes('workout') || t.includes('pre-') || t.includes('exercise') || t.includes('training'))
    return { icon: '⚡', color: '#00E676', bg: 'rgba(0,230,118,0.1)' };
  if (t.includes('meal') || t.includes('food') || t.includes('eat') || t.includes('lunch'))
    return { icon: '◈', color: '#64B5F6', bg: 'rgba(100,181,246,0.1)' };
  return { icon: '◷', color: '#9A9A9A', bg: 'rgba(255,255,255,0.05)' };
}

// ── Directive categories ─────────────────────────────────────────────────────
const DIRECTIVE_CATEGORIES = [
  { key: 'eating'   as const, title: 'Nutrition',         icon: '◈', color: '#64B5F6' },
  { key: 'exercise' as const, title: 'Training',          icon: '⚡', color: '#00E676' },
  { key: 'sleep'    as const, title: 'Sleep',             icon: '☾', color: '#CE93D8' },
  { key: 'stress'   as const, title: 'Stress Management', icon: '◯', color: '#FFB300' },
  { key: 'habits'   as const, title: 'Habits',            icon: '→', color: '#9A9A9A' },
] as const;

// ── Locked phase ─────────────────────────────────────────────────────────────
function LockedPhase({ phase, reason }: { phase: typeof PHASES[number]; reason: string }) {
  return (
    <Card className="col-span-8 text-center py-12">
      <div className="text-3xl mb-4">🔒</div>
      <div className="text-sm font-bold text-white mb-2">Phase {phase.num}: {phase.label}</div>
      <p className="text-[11px] text-[#9A9A9A] leading-relaxed mb-6 max-w-xs mx-auto">{reason}</p>
      <Link href="/lab/upload"
        className="inline-block px-6 py-2.5 border border-[#00E676] text-[#00E676] font-bold text-xs tracking-widest uppercase hover:bg-[rgba(0,230,118,0.08)] transition-colors">
        UPLOAD BLOODWORK TO UNLOCK →
      </Link>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ProtocolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const tier = userData?.subscription_tier ?? 'free';
  if (tier === 'free') redirect('/dashboard');

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
    const today = new Date();
    currentDay = Math.min(90, Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1));
    currentPhase = currentDay <= 30 ? 1 : currentDay <= 60 ? 2 : 3;
  }

  const phaseDay = currentDay > 0 ? ((currentDay - 1) % 30) + 1 : 1;
  const phaseProgress = Math.round(((phaseDay - 1) / 30) * 100);
  const daysRemaining = 30 - phaseDay;

  // Next lab trigger date
  let nextLabDate: Date | null = null;
  let nextLabDays = 0;
  if (cycle && currentPhase < 3) {
    const startDate = new Date(cycle.start_date);
    nextLabDate = new Date(startDate);
    nextLabDate.setDate(nextLabDate.getDate() + currentPhase * 30);
    const today = new Date();
    nextLabDays = Math.max(0, Math.ceil((nextLabDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (typedReports.length === 0) {
    return (
      <div className="px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Optimization Roadmap</div>
          <h1 className="text-xl font-black tracking-[2px] uppercase text-white">90-Day Protocol</h1>
        </div>
        <div className="max-w-2xl">
          <Card className="text-center py-10">
            <div className="text-4xl mb-4">▦</div>
            <div className="text-white font-bold mb-2">Protocol Not Yet Generated</div>
            <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-sm mx-auto">
              Your personalized 90-day protocol is generated from your bloodwork analysis.
              Upload your initial bloodwork in the LAB to get started.
            </p>
            <Link href="/lab/upload"
              className="inline-block px-8 py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors">
              GO TO LAB →
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const currentPhaseData = PHASES[currentPhase - 1];
  const currentReport = typedReports[currentPhase - 1] ?? typedReports[typedReports.length - 1];
  const recs: OptimizationPlan = currentReport?.recommendations ?? ({} as OptimizationPlan);
  const isLocked = !currentReport;

  return (
    <div className="px-6 lg:px-8 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Personalized Optimization Roadmap</div>
          <h1 className="text-xl font-black tracking-[2px] uppercase text-white">90-Day Protocol</h1>
        </div>
        <Link href="/lab"
          className="px-4 py-2 border border-[rgba(255,255,255,0.1)] text-[#9A9A9A] font-bold text-xs tracking-widest uppercase hover:border-[rgba(255,255,255,0.25)] hover:text-white transition-all">
          ← LAB
        </Link>
      </div>

      {/* ── Phase Pathway (horizontal stepper) ── */}
      <div className="grid grid-cols-3 gap-0 mb-5 relative">
        {/* Background connector line */}
        <div className="absolute top-4 left-[16.5%] right-[16.5%] h-px bg-[rgba(255,255,255,0.07)]" />
        {/* Progress line (completed phases) */}
        {currentPhase > 1 && (
          <div className="absolute top-4 h-px bg-[#00E676]"
            style={{
              left: '16.5%',
              width: currentPhase === 3 ? 'calc(67% - 0px)' : 'calc(33.5% - 0px)',
              opacity: 0.6,
            }} />
        )}

        {PHASES.map(p => {
          const isCompleted = p.num < currentPhase && typedReports.length >= p.num;
          const isActive = p.num === currentPhase;
          const isUnlocked = typedReports.length >= p.num;
          return (
            <div key={p.num} className="flex flex-col items-center relative z-10">
              {/* Circle */}
              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-all"
                style={{
                  borderColor: isActive ? '#00E676' : isCompleted ? '#00E676' : 'rgba(255,255,255,0.1)',
                  background: isActive ? 'rgba(0,230,118,0.15)' : isCompleted ? 'rgba(0,230,118,0.08)' : '#141414',
                  boxShadow: isActive ? '0 0 12px rgba(0,230,118,0.3)' : 'none',
                }}>
                {isCompleted
                  ? <span className="text-[11px] text-[#00E676] font-black">✓</span>
                  : <span className="text-[11px] font-black" style={{ color: isActive ? '#00E676' : '#3A3A3A' }}>{p.num}</span>
                }
              </div>
              {/* Labels */}
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: isActive ? '#00E676' : isCompleted ? '#9A9A9A' : '#3A3A3A' }}>
                  {p.label}
                </div>
                <div className="text-[9px] text-[#4A4A4A] tracking-widest">Days {p.days}</div>
                {isActive && currentDay > 0 && (
                  <div className="text-[9px] font-bold text-[#00E676] mt-0.5 tracking-widest uppercase">Day {currentDay}</div>
                )}
                {!isUnlocked && (
                  <div className="text-[9px] text-[#3A3A3A] mt-0.5">🔒 Locked</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Focus — top of phase content */}
      <div className="flex items-start gap-3 px-4 py-3 mb-4 border-l-2 border-[#00E676]"
        style={{ background: 'rgba(0,230,118,0.04)' }}>
        <div className="shrink-0 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
        </div>
        <div>
          <div className="text-[9px] font-bold tracking-[3px] text-[#00E676] uppercase mb-0.5">Today's Focus</div>
          <p className="text-[11px] text-[#D0D0D0] leading-relaxed">{currentPhaseData.goal}</p>
        </div>
      </div>

      {/* ── Main Bento Grid (8 / 4) ── */}
      <div className="grid grid-cols-12 gap-3">

        {/* ── LEFT COLUMN (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">

          {isLocked ? (
            <LockedPhase
              phase={currentPhaseData}
              reason={currentPhase === 2
                ? 'Complete your 30-day bloodwork panel to unlock the Calibration protocol. This protocol will be personalized based on your actual progress and biomarker improvements.'
                : 'Complete your 60-day bloodwork panel to unlock the Peak protocol. This final phase is fine-tuned specifically to push you to your maximum optimization.'}
            />
          ) : (
            <>
              {/* Supplement Stack — medication cards */}
              {recs?.supplements?.length > 0 && (
                <Card accent>
                  <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">
                    Supplement Stack — Phase {currentPhase}
                  </div>
                  <div className="flex flex-col gap-1">
                    {recs.supplements.map((s, i) => {
                      const { icon, color, bg } = timingIcon(s.timing);
                      const isHighPriority = i < 3;
                      return (
                        <div key={s.name}
                          className="flex items-start gap-3 py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0">
                          {/* Timing icon */}
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
                            style={{ background: bg, color }}>
                            {icon}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-sm font-bold text-white">{s.name}</span>
                              <span className="text-sm font-black" style={{ color: '#00E676' }}>{s.dose}</span>
                              {isHighPriority && (
                                <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-[rgba(255,179,0,0.1)] text-[#FFB300]">
                                  HIGH PRIORITY
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-semibold mb-0.5" style={{ color }}>{s.timing}</div>
                            <div className="text-[11px] text-[#5A5A5A] leading-relaxed">{s.reason}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Lifestyle Directives — icon-based sections */}
              <Card>
                <div className="text-[10px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-4">Lifestyle Directives</div>
                <div className="flex flex-col gap-0">
                  {DIRECTIVE_CATEGORIES.map(cat => {
                    const items: string[] = recs?.[cat.key] ?? [];
                    if (!items.length) return null;
                    return (
                      <details key={cat.key} className="group border-b border-[rgba(255,255,255,0.04)] last:border-0">
                        <summary className="flex items-center justify-between py-3 cursor-pointer list-none">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                              style={{ background: `${cat.color}15`, color: cat.color }}>
                              {cat.icon}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-white">{cat.title}</div>
                              <div className="text-[10px] text-[#4A4A4A]">{items.length} directive{items.length > 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <div className="text-[#3A3A3A] group-open:text-[#7A7A7A] transition-colors text-lg leading-none">›</div>
                        </summary>
                        <div className="pb-3 pl-9 flex flex-col gap-2">
                          {items.map((item, i) => (
                            <div key={i} className="flex gap-2.5 items-start">
                              <span className="font-bold shrink-0 mt-0.5 text-xs" style={{ color: cat.color }}>→</span>
                              <span className="text-[11px] text-[#D0D0D0] leading-relaxed">{item}</span>
                              {i === 0 && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 shrink-0 mt-0.5"
                                  style={{ background: `${cat.color}15`, color: cat.color }}>
                                  KEY
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">

          {/* Phase Countdown */}
          {currentDay > 0 && (
            <Card topAccent="rgba(0,230,118,0.5)">
              <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Phase Progress</div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-3xl font-black text-white leading-none">{phaseDay}</div>
                  <div className="text-[10px] text-[#4A4A4A] mt-0.5">of 30 days</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-white">{daysRemaining}</div>
                  <div className="text-[10px] text-[#4A4A4A]">days left</div>
                </div>
              </div>
              <div className="h-1.5 bg-[rgba(255,255,255,0.05)] mb-2">
                <div className="h-full bg-[#00E676] transition-all" style={{ width: `${phaseProgress}%` }} />
              </div>
              <div className="text-[10px] text-[#4A4A4A]">
                Phase {currentPhase}: {currentPhaseData.label}
              </div>
            </Card>
          )}

          {/* Next Lab Trigger */}
          {nextLabDate && (
            <Card topAccent="rgba(255,179,0,0.5)">
              <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-3">Next Lab Trigger</div>
              <div className="text-3xl font-black text-white leading-none mb-1">{nextLabDays}</div>
              <div className="text-[10px] text-[#4A4A4A] mb-3">days until Phase {currentPhase + 1} bloodwork</div>
              <div className="text-[11px] text-[#9A9A9A] mb-3">
                {nextLabDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — submit bloodwork to unlock{' '}
                <span className="text-white font-semibold">{PHASES[currentPhase].label}</span> protocol
              </div>
              <Link href="/lab/upload"
                className="block w-full py-2 border border-[rgba(255,179,0,0.4)] text-[#FFB300] font-bold text-[10px] tracking-widest uppercase text-center hover:bg-[rgba(255,179,0,0.07)] transition-colors">
                SUBMIT BLOODWORK →
              </Link>
            </Card>
          )}

          {/* Current Focus Goal */}
          <Card>
            <div className="text-[10px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-3">Phase Goal</div>
            <div className="text-[10px] font-bold text-[#00E676] uppercase tracking-widest mb-1">
              {currentPhaseData.label}
            </div>
            <p className="text-[11px] text-[#9A9A9A] leading-relaxed mb-3">{currentPhaseData.desc}</p>
            {recs?.supplements?.length > 0 && (
              <div className="pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-1.5">Stack summary</div>
                <div className="text-2xl font-black text-white">{recs.supplements.length}</div>
                <div className="text-[10px] text-[#4A4A4A]">supplements prescribed</div>
              </div>
            )}
          </Card>

          {/* Past completed phases (compact) */}
          {PHASES.filter(p => p.num < currentPhase && typedReports.length >= p.num).map(p => {
            const phaseReport = typedReports[p.num - 1];
            return (
              <div key={p.num} className="px-4 py-3 border border-[rgba(255,255,255,0.05)] opacity-40"
                style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.02) 0%, rgba(20,20,20,0) 55%), #141414' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-[#9A9A9A] tracking-widest uppercase">
                      Phase {p.num}: {p.label}
                    </div>
                    <div className="text-[9px] text-[#4A4A4A] mt-0.5">Completed</div>
                  </div>
                  <div className="text-sm font-black text-[#4A4A4A]">{phaseReport.health_score}<span className="text-[9px]">/100</span></div>
                </div>
              </div>
            );
          })}

          {/* Locked future phases */}
          {PHASES.filter(p => p.num > currentPhase).map(p => (
            <div key={p.num} className="px-4 py-3 border border-[rgba(255,255,255,0.04)] opacity-35"
              style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.02) 0%, rgba(20,20,20,0) 55%), #141414' }}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-[#3A3A3A] tracking-widest uppercase">
                  Phase {p.num}: {p.label}
                </div>
                <div className="text-[9px] text-[#3A3A3A]">🔒 Days {p.days}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
