import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  Sun, Moon, Lightning, Coffee, Clock, ShieldCheck,
  CaretRight, Pulse, Fire, Target,
  Flask, ArrowRight, ClipboardText,
} from '@phosphor-icons/react/dist/ssr';
import { PanelCompletenessNote } from '@/components/ui/PanelCompletenessNote';
import { getPersonalizedPanel, isExcluded } from '@/lib/scoring';
import { BIOMARKERS, TRT_PANEL_IDS } from '@/constants/biomarkers';
import { ProgressTracker } from './ProgressTracker';
import type { ProtocolReport, OptimizationPlan, Phase1Data, Phase2Data, Phase3Data } from '@/types';

// Normalize fields that the LLM occasionally returns as objects instead of strings
function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return (val as unknown[]).map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const str = o.directive ?? o.text ?? o.action ?? o.recommendation ?? o.habit ?? o.content;
      if (typeof str === 'string') return str;
      return Object.values(o).filter(v => typeof v === 'string').join(' — ');
    }
    return String(item);
  }).filter(Boolean) as string[];
}

// ── Phase definitions ────────────────────────────────────────────────────────
const PHASES = [
  { num: 1 as const, label: 'Foundation',  days: '1-45',  desc: 'Establish your baseline protocol. Build the habits and supplementation stack your bloodwork demands.', goal: 'Build consistency - the first 45 days set the trajectory.' },
  { num: 2 as const, label: 'Calibration', days: '46-90', desc: 'Refined protocol based on your 45-day inquiry. Adjustments calibrated to your subjective response and adherence patterns.', goal: 'Execute the calibration - your body has data, now act on it.' },
];

// ── Icon engine ──────────────────────────────────────────────────────────────
function getTimingMeta(timing: string) {
  const t = timing.toLowerCase();
  if (t.includes('morning') || t.includes('am') || t.includes('wake'))
    return { Icon: Sun,   color: '#E8C470', bg: 'rgba(232,196,112,0.1)' };
  if (t.includes('evening') || t.includes('night') || t.includes('bed'))
    return { Icon: Moon,  color: '#CE93D8', bg: 'rgba(206,147,216,0.1)' };
  if (t.includes('workout') || t.includes('training') || t.includes('pre-'))
    return { Icon: Lightning,   color: '#C8A2C8', bg: 'rgba(200,162,200,0.1)' };
  return   { Icon: Clock, color: '#64B5F6', bg: 'rgba(100,181,246,0.1)' };
}

const DIRECTIVE_META = {
  eating:   { title: 'Nutrition', Icon: Coffee,   color: '#64B5F6' },
  exercise: { title: 'Training',  Icon: Lightning,      color: '#C8A2C8' },
  sleep:    { title: 'Sleep',     Icon: Moon,     color: '#CE93D8' },
  stress:   { title: 'Stress',    Icon: Pulse, color: '#E8C470' },
  habits:   { title: 'Habits',    Icon: Target,   color: '#9A9A9A' },
} as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ProtocolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const BETA_PERIOD = process.env.NEXT_PUBLIC_BETA_PERIOD === 'true';
  if (!BETA_PERIOD && (!userData?.subscription_tier || userData.subscription_tier === 'free')) redirect('/dashboard');

  const [protoReportsRes, cycleRes, profileRes, lifestyleRes, medHistRes, symptomsRes, analysisRes, inquiryRes] = await Promise.all([
    supabase.from('protocol_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('optimization_cycles').select('id, start_date').eq('user_id', user.id).eq('status', 'active').single(),
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('lifestyle').select('*').eq('user_id', user.id).single(),
    supabase.from('medical_history').select('*').eq('user_id', user.id).single(),
    supabase.from('symptom_assessments').select('symptoms_selected').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('analysis_reports').select('marker_analysis').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('cycle_inquiries').select('id').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).single(),
  ]);
  const inquirySubmitted = !!inquiryRes.data;

  const typedReports = (protoReportsRes.data ?? []) as ProtocolReport[];
  const cycle = cycleRes.data;

  // Compute panel completeness
  const protoP1 = profileRes.data as unknown as Phase1Data | null;
  const protoP2 = (lifestyleRes.data ?? {}) as unknown as Phase2Data;
  const protoP3 = (medHistRes.data ?? { steroid_history: 'never', trt_history: 'never' }) as unknown as Phase3Data;
  const protoSymptomIds: string[] = (symptomsRes.data?.symptoms_selected as string[] | undefined) ?? [];
  let protoRecommendedCount = 0;
  if (protoP1) {
    const excluded = isExcluded(protoP3);
    if (excluded) {
      protoRecommendedCount = TRT_PANEL_IDS.length;
    } else {
      const panel = getPersonalizedPanel(protoP1, protoP2, protoP3, protoSymptomIds);
      protoRecommendedCount = panel.essential.length + panel.recommended.length;
    }
  }
  const protoSubmittedCount = Array.isArray(analysisRes.data?.marker_analysis) ? (analysisRes.data.marker_analysis as unknown[]).length : 0;

  let currentDay = 0;
  let currentPhase: 1 | 2 = 1;
  if (cycle) {
    const startDate = new Date(cycle.start_date);
    currentDay = Math.min(90, Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1));
    currentPhase = currentDay <= 45 ? 1 : 2;
  }

  const phaseDay      = currentDay > 0 ? ((currentDay - 1) % 45) + 1 : 1;
  const phaseProgress = Math.round(((phaseDay - 1) / 45) * 100);
  const daysRemaining = 45 - phaseDay;
  const phase1Progress = currentDay === 0 ? 0 : currentPhase >= 2 ? 100 : phaseProgress;
  const phase2Progress = currentDay === 0 ? 0 : currentPhase === 2 ? phaseProgress : 0;

  // Phase 1 -> day-45 inquiry; Phase 2 -> final bloodwork (optional) at day 90
  let nextMilestoneDate: Date | null = null;
  let nextMilestoneDays = 0;
  let nextMilestoneLabel = '';
  if (cycle) {
    const start = new Date(cycle.start_date);
    nextMilestoneDate = new Date(start);
    if (currentPhase === 1) {
      nextMilestoneDate.setDate(nextMilestoneDate.getDate() + 45);
      nextMilestoneLabel = '45-day inquiry - unlock Calibration protocol';
    } else {
      nextMilestoneDate.setDate(nextMilestoneDate.getDate() + 90);
      nextMilestoneLabel = 'Final bloodwork (optional) - complete the 90-day cycle';
    }
    nextMilestoneDays = Math.max(0, Math.ceil((nextMilestoneDate.getTime() - Date.now()) / 86400000));
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
          <Flask weight="duotone" size={48} className="mx-auto mb-6 text-[rgba(255,255,255,0.1)]" />
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
  const phaseTag = currentPhase === 1 ? 'foundation' : 'calibration';
  const currentReport    = typedReports.find(r => r.phase === phaseTag)
    ?? typedReports[currentPhase - 1]
    ?? typedReports[typedReports.length - 1];
  const recs: OptimizationPlan = currentReport ? {
    supplements: currentReport.supplements ?? [],
    eating:   toStringArray(currentReport.eating),
    exercise: toStringArray(currentReport.exercise),
    sleep:    toStringArray(currentReport.sleep),
    stress:   toStringArray(currentReport.stress),
    habits:   toStringArray(currentReport.habits),
  } : ({} as OptimizationPlan);
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

      {/* Panel completeness note */}
      {protoRecommendedCount > 0 && protoSubmittedCount > 0 && (
        <div className="mb-8">
          <PanelCompletenessNote
            submittedCount={protoSubmittedCount}
            recommendedCount={protoRecommendedCount}
          />
        </div>
      )}

      {/* ── Roadmap graphic ── */}
      <div className="mb-10 overflow-x-auto pb-1 -mx-4 lg:-mx-8 px-4 lg:px-8">
        <div className="min-w-[520px] flex flex-col gap-2">

          {/* Icons + phase bars row */}
          <div className="flex items-center gap-1.5">

            {/* Node: Initial Bloodwork */}
            <div className="shrink-0 w-14 flex justify-center">
              <div className="w-9 h-9 border-2 border-[#4ADE80] bg-[rgba(74,222,128,0.06)] flex items-center justify-center">
                <Flask weight="duotone" size={15} className="text-[#4ADE80]" />
              </div>
            </div>

            {/* Phase 1: Foundation bar */}
            <div className="flex-1 h-9 relative overflow-hidden border border-[rgba(200,162,200,0.2)]"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="absolute inset-y-0 left-0 bg-[rgba(200,162,200,0.1)] transition-all"
                style={{ width: `${phase1Progress}%` }} />
              {currentPhase === 1 && currentDay > 0 && (
                <div className="absolute inset-y-0 w-px bg-[#C8A2C8]"
                  style={{ left: `${phaseProgress}%` }} />
              )}
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <div>
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Foundation</span>
                  <span className="text-[8px] font-mono text-[#4A4A4A] ml-2">1–45</span>
                </div>
                {currentPhase === 1 && currentDay > 0 && (
                  <span className="text-[8px] font-bold text-[#C8A2C8] tabular-nums">Day {currentDay}</span>
                )}
              </div>
            </div>

            {/* Node: 45-Day Inquiry */}
            <div className="shrink-0 w-14 flex justify-center">
              <div className={cn('w-9 h-9 border-2 flex items-center justify-center',
                currentPhase >= 2
                  ? 'border-[#4ADE80] bg-[rgba(74,222,128,0.06)]'
                  : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]'
              )}>
                <ClipboardText weight="duotone" size={15} className={currentPhase >= 2 ? 'text-[#4ADE80]' : 'text-[#3A3A3A]'} />
              </div>
            </div>

            {/* Phase 2: Calibration bar */}
            <div className={cn('flex-1 h-9 relative overflow-hidden border',
              currentPhase >= 2 ? 'border-[rgba(200,162,200,0.2)]' : 'border-[rgba(255,255,255,0.04)]'
            )} style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="absolute inset-y-0 left-0 bg-[rgba(200,162,200,0.1)] transition-all"
                style={{ width: `${phase2Progress}%` }} />
              {currentPhase === 2 && currentDay > 0 && (
                <div className="absolute inset-y-0 w-px bg-[#C8A2C8]"
                  style={{ left: `${phaseProgress}%` }} />
              )}
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <div>
                  <span className={cn('text-[9px] font-black uppercase tracking-widest',
                    currentPhase >= 2 ? 'text-white' : 'text-[#3A3A3A]'
                  )}>Calibration</span>
                  <span className="text-[8px] font-mono text-[#4A4A4A] ml-2">46–90</span>
                </div>
                {currentPhase === 2 && currentDay > 0 && (
                  <span className="text-[8px] font-bold text-[#C8A2C8] tabular-nums">Day {currentDay}</span>
                )}
              </div>
            </div>

            {/* Node: Final Bloodwork */}
            <div className="shrink-0 w-14 flex justify-center">
              <div className="w-9 h-9 border-2 border-[rgba(255,255,255,0.05)] bg-[#141414] flex items-center justify-center">
                <Flask weight="duotone" size={15} className="text-[#2A2A2A]" />
              </div>
            </div>

          </div>

          {/* Labels row */}
          <div className="flex items-start gap-1.5">
            <div className="shrink-0 w-14 text-center">
              <div className="text-[8px] font-bold text-[#4ADE80] uppercase tracking-wide leading-tight">Initial BW</div>
              <div className="text-[8px] font-mono text-[#3A3A3A]">Day 0</div>
            </div>
            <div className="flex-1" />
            <div className="shrink-0 w-14 text-center">
              <div className={cn('text-[8px] font-bold uppercase tracking-wide leading-tight',
                currentPhase >= 2 ? 'text-[#4ADE80]' : 'text-[#4A4A4A]'
              )}>Inquiry</div>
              <div className="text-[8px] font-mono text-[#3A3A3A]">Day 45</div>
            </div>
            <div className="flex-1" />
            <div className="shrink-0 w-14 text-center">
              <div className="text-[8px] font-bold text-[#3A3A3A] uppercase tracking-wide leading-tight">Final BW</div>
              <div className="text-[8px] font-mono text-[#3A3A3A]">Day 90</div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main bento (8/4) ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── LEFT (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">

          {/* Today's mission */}
          <div className="border-l-4 border-[#C8A2C8] px-5 py-4"
            style={{ background: 'rgba(200,162,200,0.04)', borderRadius: '0 6px 6px 0' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Target weight="duotone" size={13} className="text-[#C8A2C8]" />
              <span className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-[3px]">Current Mission</span>
            </div>
            <p className="text-base font-bold text-[#E0E0E0] leading-snug">{currentPhaseData.goal}</p>
          </div>

          {isLocked ? (
            <Card className="text-center py-12">
              <div className="w-12 h-12 rounded-full border border-[rgba(255,255,255,0.07)] flex items-center justify-center mx-auto mb-4">
                <ClipboardText weight="duotone" size={20} className="text-[#3A3A3A]" />
              </div>
              <div className="text-sm font-bold text-white mb-2">Phase {currentPhase}: {currentPhaseData.label}</div>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed mb-6 max-w-xs mx-auto">
                Complete the 45-day inquiry to generate your Calibration protocol. This takes 5-10 minutes and captures how you responded to the Foundation phase.
              </p>
              <Link href="/inquiry"
                className="inline-block px-6 py-2.5 border border-[#C8A2C8] text-[#C8A2C8] font-bold text-xs tracking-widest uppercase hover:bg-[rgba(200,162,200,0.08)] transition-colors">
                Start 45-Day Inquiry
              </Link>
            </Card>
          ) : (
            <>
              {/* Supplement stack */}
              {recs?.supplements?.length > 0 && (
                <Card className="p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Fire weight="duotone" size={15} className="text-[#E88080]" />
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
                            <Icon weight="duotone" size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white uppercase tracking-tight">{s.name}</span>
                                {i < 3 && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-[rgba(232,196,112,0.1)] text-[#E8C470] border border-[rgba(232,196,112,0.2)] font-black uppercase tracking-tight">
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

              {/* Progress Tracker */}
              {cycle && currentReport && (
                <ProgressTracker
                  cycleId={cycle.id}
                  protocolReportId={currentReport.id}
                  currentDay={currentDay}
                  currentPhase={currentPhase}
                  inquirySubmitted={inquirySubmitted}
                />
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
                            <Icon weight="duotone" size={14} />
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-white uppercase tracking-widest">{meta.title}</div>
                            <div className="text-[9px] text-[#4A4A4A]">{items.length} directive{items.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <CaretRight weight="duotone" size={13} className="text-[#3A3A3A] group-open:rotate-90 transition-transform duration-200" />
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
                  <span className="text-xs text-[#4A4A4A] font-bold ml-2">/ 45</span>
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

          {/* Next milestone */}
          {nextMilestoneDate && (
            <Card topAccent={nextMilestoneDays <= 7 ? 'rgba(232,128,128,0.6)' : 'rgba(232,196,112,0.5)'}>
              <div className="flex items-center gap-2 mb-4">
                {currentPhase === 1
                  ? <ClipboardText weight="duotone" size={13} style={{ color: nextMilestoneDays <= 7 ? '#E88080' : '#E8C470' }} />
                  : <Flask weight="duotone" size={13} style={{ color: nextMilestoneDays <= 7 ? '#E88080' : '#E8C470' }} />
                }
                <span className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: nextMilestoneDays <= 7 ? '#E88080' : '#E8C470' }}>
                  {currentPhase === 1 ? '45-Day Inquiry' : 'Final Lab'}
                </span>
              </div>
              <div className="text-4xl font-black text-white mb-1 tabular-nums">{nextMilestoneDays}</div>
              <p className="text-[11px] text-[#4A4A4A] uppercase font-bold tracking-tight mb-4">
                Days remaining
              </p>
              <div className="text-[11px] text-[#9A9A9A] mb-4">
                {nextMilestoneDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {nextMilestoneLabel}
              </div>
              {currentPhase === 1 ? (
                <Link href="/inquiry"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-[rgba(255,255,255,0.08)] text-[#9A9A9A] font-bold text-[10px] tracking-widest uppercase hover:bg-[rgba(255,255,255,0.04)] hover:text-white transition-all">
                  Begin Inquiry <ArrowRight weight="duotone" size={11} />
                </Link>
              ) : (
                <Link href="/lab/upload"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-[rgba(255,255,255,0.08)] text-[#9A9A9A] font-bold text-[10px] tracking-widest uppercase hover:bg-[rgba(255,255,255,0.04)] hover:text-white transition-all">
                  Prepare Submission <ArrowRight weight="duotone" size={11} />
                </Link>
              )}
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
                    <span className="text-[10px] font-black text-white uppercase">Phase {i + 1} Protocol</span>
                    <div className="text-[10px] font-bold text-[#C8A2C8] uppercase tracking-widest">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                <ShieldCheck weight="duotone" size={10} /> Days {p.days}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
