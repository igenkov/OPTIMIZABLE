import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
import {
  Pulse, Lightning, Drop, Flask,
  ArrowUpRight, CaretRight, TestTube, ClipboardText, Clock,
  Info, Clipboard, ArrowRight,
} from '@phosphor-icons/react/dist/ssr';
import { LabAIBriefing } from './LabAIBriefing';
import { PanelActions } from './PanelActions';
import { cn } from '@/lib/utils';
import { PanelCompletenessNote } from '@/components/ui/PanelCompletenessNote';
import { getPersonalizedPanel, isExcluded } from '@/lib/scoring';
import { BIOMARKERS, TRT_PANEL_IDS } from '@/constants/biomarkers';
import type { AnalysisReport, MarkerAnalysis, MarkerStatus, Phase1Data, Phase2Data, Phase3Data } from '@/types';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }> }> = {
  hormones:  { label: 'Hormonal Axis',    color: '#C8A2C8', Icon: Pulse  },
  thyroid:   { label: 'Thyroid Function', color: '#CE93D8', Icon: TestTube },
  metabolic: { label: 'Metabolic Health', color: '#64B5F6', Icon: Lightning       },
  lipids:    { label: 'Lipid Panel',      color: '#E8C470', Icon: Drop  },
};
const CATEGORY_ORDER = ['hormones', 'thyroid', 'metabolic', 'lipids'];
const BIOMARKER_CATEGORY = new Map(BIOMARKERS.map(b => [b.id, b.category]));
const BIOMARKER_NAME = new Map(BIOMARKERS.map(b => [b.id, b.name]));

// ── Range Track ──────────────────────────────────────────────────────────────
function RangeTrack({ value, standardRange, optimalRange, status }: {
  value: number;
  standardRange?: { low: number; high: number };
  optimalRange?: { low: number; high: number };
  status: MarkerStatus;
}) {
  if (!standardRange || !optimalRange) return null;
  const max = Math.max(standardRange.high, value) * 1.2;
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));
  const color = getStatusColor(status);

  return (
    <div className="relative h-1 w-full bg-[rgba(255,255,255,0.05)] my-4 rounded-full">
      <div className="absolute top-0 h-full bg-[rgba(255,255,255,0.1)] rounded-full"
        style={{ left: `${pct(standardRange.low)}%`, width: `${pct(standardRange.high) - pct(standardRange.low)}%` }} />
      <div className="absolute top-0 h-full bg-[rgba(200,162,200,0.3)] border-x border-[rgba(200,162,200,0.5)]"
        style={{ left: `${pct(optimalRange.low)}%`, width: `${pct(optimalRange.high) - pct(optimalRange.low)}%`,
                 boxShadow: '0 0 8px rgba(200,162,200,0.2)' }} />
      <div className="absolute w-3 h-3 rounded-full border-2 border-[#0A0A0A] shadow-lg"
        style={{ left: `${pct(value)}%`, top: '50%', transform: 'translate(-50%, -50%)', background: color }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function LabPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const BETA_PERIOD = process.env.NEXT_PUBLIC_BETA_PERIOD === 'true';
  if (!BETA_PERIOD && (!userData?.subscription_tier || userData.subscription_tier === 'free')) redirect('/dashboard');

  const [reportsRes, profileRes, lifestyleRes, medHistRes, symptomsRes, panelsRes] = await Promise.all([
    supabase.from('analysis_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('lifestyle').select('*').eq('user_id', user.id).single(),
    supabase.from('medical_history').select('*').eq('user_id', user.id).single(),
    supabase.from('symptom_assessments').select('symptoms_selected').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('bloodwork_panels').select('id, phase_type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
  ]);
  const latestPanelPhase = (panelsRes.data?.phase_type as string | undefined) ?? 'initial';

  const typedReports = (reportsRes.data ?? []) as AnalysisReport[];

  // Compute panel completeness + personalized panel for follow-up tiers
  const labP1 = profileRes.data as unknown as Phase1Data | null;
  const labP2 = (lifestyleRes.data ?? {}) as unknown as Phase2Data;
  const labP3 = (medHistRes.data ?? { steroid_history: 'never', trt_history: 'never' }) as unknown as Phase3Data;
  const labSymptomIds: string[] = (symptomsRes.data?.symptoms_selected as string[] | undefined) ?? [];
  let labRecommendedCount = 0;
  let labPanel: ReturnType<typeof getPersonalizedPanel> | null = null;
  if (labP1) {
    const excluded = isExcluded(labP3);
    if (excluded) {
      labRecommendedCount = TRT_PANEL_IDS.length;
    } else {
      labPanel = getPersonalizedPanel(labP1, labP2, labP3, labSymptomIds);
      labRecommendedCount = labPanel.essential.length + labPanel.recommended.length;
    }
  }
  const latest   = typedReports[typedReports.length - 1] ?? null;
  const previous = typedReports.length > 1 ? typedReports[typedReports.length - 2] : null;

  const prevMarkers: Record<string, number> = {};
  if (previous?.marker_analysis) {
    for (const m of previous.marker_analysis) prevMarkers[m.marker] = m.value;
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!latest) {
    return (
      <div className="px-4 lg:px-8 py-5 lg:py-6 space-y-5 lg:space-y-6">

        {/* Header — matches non-empty state */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.05)]">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#C8A2C8]">
              <Flask size={13} />
              <span className="text-[10px] font-black uppercase tracking-[3px]">Biomarker Analysis · Panel_01</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Biomarker Lab</h1>
          </div>
          <Link href="/lab/upload"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C8A2C8] text-black font-black text-[10px] tracking-[2px] uppercase hover:bg-[#A882A8] transition-all">
            <Flask size={13} /> Submit First Panel
          </Link>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-5">

          {/* Left — what you get + upload CTA */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-5">

            {/* Upload prompt */}
            <Card className="p-8" topAccent="rgba(200,162,200,0.3)">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[4px] text-[#C8A2C8]">No Panel Submitted</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">Your Lab Analysis Awaits</h2>
              <p className="text-[12px] text-white/40 leading-relaxed mb-8 max-w-md">
                Upload your bloodwork results to receive a full AI-powered analysis — every biomarker mapped against standard and optimal reference ranges, correlated with your personal profile.
              </p>

              {/* What you'll get */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { label: 'Hormonal Health Score', desc: 'Overall status 0–100' },
                  { label: 'Biomarker Deep-Dive', desc: 'Per-marker range tracks' },
                  { label: 'Areas of Concern', desc: 'Prioritized action items' },
                  { label: 'Key Ratios', desc: 'T/E2, free T, SHBG patterns' },
                  { label: 'AI Clinical Briefing', desc: 'Full profile correlation' },
                  { label: '90-Day Protocol', desc: 'Based on your actual results' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 p-3 bg-white/[0.02] border border-white/[0.05]">
                    <div className="w-1 h-1 rounded-full bg-[#C8A2C8] mt-1.5 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black text-white uppercase tracking-tight">{item.label}</div>
                      <div className="text-[9px] text-white/30 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/lab/upload"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#C8A2C8] text-black font-black text-[10px] tracking-widest uppercase hover:bg-[#A882A8] transition-all">
                Upload Bloodwork <ArrowRight size={13} />
              </Link>
              <p className="text-center text-[9px] text-white/20 mt-2">Accepts standard lab PDF or manual entry</p>
            </Card>
          </div>

          {/* Right — Pre-Draw Protocol */}
          <Card className="col-span-12 lg:col-span-5 p-8 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <Info size={16} className="text-white/40" />
              <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Pre-Draw Protocol</span>
            </div>

            <div className="space-y-4">
              {[
                { t: '7AM–10AM Window', d: 'T-levels peak in early morning.' },
                { t: '12H Fasting', d: 'Water only. Prevents glucose spikes.' },
                { t: 'Rest Recovery', d: 'No heavy lifting 24h prior.' },
                { t: 'Sexual Abstinence', d: 'No ejaculation 24h prior. Preserves baseline LH and testosterone levels.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-[10px] font-black text-white/20 tabular-nums">0{i + 1}</div>
                  <div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight">{step.t}</div>
                    <div className="text-[11px] text-white/40">{step.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5">
                <Clipboard size={20} className="text-[#C8A2C8]" />
                <div>
                  <span className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-widest block">Ready to start?</span>
                  <span className="text-[10px] text-white/40">Download the lab requisition form in your profile.</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const grouped: Record<string, MarkerAnalysis[]> = {};
  for (const m of latest.marker_analysis ?? []) {
    const cat = BIOMARKER_CATEGORY.get(m.marker) ?? 'metabolic';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }

  const summary = latest.report_summary;

  return (
    <div className="px-4 lg:px-8 py-5 lg:py-6 space-y-5 lg:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.05)]">
        <div>
          <div className="flex items-center gap-2 mb-2 text-[#C8A2C8]">
            <Clock size={13} />
            <span className="text-[10px] font-black uppercase tracking-[3px]">
              Panel_{typedReports.length} · {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Biomarker Lab</h1>
        </div>
        <Link href="/lab/upload"
          className="flex items-center gap-2 px-5 py-2.5 border border-[#C8A2C8] text-[#C8A2C8] font-black text-[10px] tracking-[2px] uppercase hover:bg-[rgba(200,162,200,0.08)] transition-all">
          <Flask size={13} /> New Panel Submission
        </Link>
      </div>

      {/* Medical referral alert */}
      {latest.medical_referral_needed && (
        <div className="border border-[#E88080] bg-[rgba(232,128,128,0.06)] px-5 py-4">
          <div className="text-sm font-bold text-[#E88080] mb-1">⚠ Medical Consultation Recommended</div>
          <div className="text-[11px] text-[#E88080] opacity-80">{latest.medical_referral_reason}</div>
        </div>
      )}

      {/* Panel completeness note */}
      {labRecommendedCount > 0 && (
        <PanelCompletenessNote
          submittedCount={latest.marker_analysis?.length ?? 0}
          recommendedCount={labRecommendedCount}
        />
      )}

      {/* ── FOLD 1: Executive Bento ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Score card */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center py-10 px-6"
          topAccent={latest.health_score >= 70 ? 'rgba(74,222,128,0.5)' : latest.health_score >= 45 ? 'rgba(232,196,112,0.5)' : 'rgba(232,128,128,0.5)'}>
          <ScoreRing score={latest.health_score} size={160} strokeWidth={12} />
          <div className="mt-5 text-center">
            <div className="text-[10px] font-black text-[#4A4A4A] uppercase tracking-[3px] mb-1">Health Score</div>
            <div className="text-5xl font-black text-white tabular-nums mb-2">{latest.health_score}</div>
            <div className="text-[11px] text-[#9A9A9A] mb-3">
              {latest.health_score >= 70 ? 'Good — room for optimization'
                : latest.health_score >= 45 ? 'Suboptimal — needs attention'
                : 'Critical — immediate action required'}
            </div>
            {previous && (
              <span className={cn(
                'text-[11px] font-bold px-3 py-1 inline-block',
                latest.health_score >= previous.health_score
                  ? 'bg-[rgba(200,162,200,0.1)] text-[#C8A2C8]'
                  : 'bg-[rgba(232,128,128,0.1)] text-[#E88080]',
              )}>
                {latest.health_score >= previous.health_score ? '↑' : '↓'} {Math.abs(latest.health_score - previous.health_score)} pts vs last
              </span>
            )}
          </div>
        </Card>

        {/* AI Briefing */}
        <LabAIBriefing summary={summary} />
      </div>

      {/* ── Key Ratios ── */}
      {latest.key_ratios?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {latest.key_ratios.map(r => (
            <Card key={r.name} className="text-center py-4 px-3">
              <div className="text-xl font-black mb-0.5" style={{ color: getStatusColor(r.status) }}>
                {typeof r.value === 'number' ? r.value.toFixed(1) : r.value}
              </div>
              <div className="text-[10px] font-bold text-white tracking-wide uppercase mb-0.5">{r.name}</div>
              <div className="text-[10px] text-[#4A4A4A] leading-snug mb-2">{r.interpretation}</div>
              <StatusBadge status={r.status} />
            </Card>
          ))}
        </div>
      )}

      {/* ── Areas of Concern ── */}
      {latest.concerns?.length > 0 && (
        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#E88080] uppercase mb-3">Areas of Concern</div>
          {latest.concerns.map((c, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]"
                style={{ background: c.severity === 'urgent' ? '#E88080' : c.severity === 'address' ? '#E8C470' : '#C8A2C8' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white tracking-widest uppercase mb-0.5">
                  {c.marker.replace(/_/g, ' ')}
                </div>
                <div className="text-[11px] text-[#9A9A9A]">{c.explanation}</div>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 shrink-0"
                style={{
                  color: c.severity === 'urgent' ? '#E88080' : c.severity === 'address' ? '#E8C470' : '#C8A2C8',
                  background: c.severity === 'urgent' ? 'rgba(232,128,128,0.1)' : c.severity === 'address' ? 'rgba(232,196,112,0.1)' : 'rgba(200,162,200,0.1)',
                }}>
                {c.severity === 'urgent' ? 'Out of Range' : c.severity === 'address' ? 'Suboptimal' : 'Monitor'}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* ── Recommended Next Tests ── */}
      {(() => {
        if (!labPanel) return null;
        const submitted = new Set(latest.marker_analysis?.map(m => m.marker) ?? []);
        const essentialGaps = labPanel.essential.filter(m => !submitted.has(m.id));
        const recommendedGaps = labPanel.recommended.filter(m => !submitted.has(m.id));
        const extendedGaps = labPanel.extended.filter(m => !submitted.has(m.id)).slice(0, 5);
        if (essentialGaps.length === 0 && recommendedGaps.length === 0 && extendedGaps.length === 0) return null;

        const tiers = [
          {
            key: 'must',
            label: 'Tier 1 - Must Do',
            sublabel: 'Directly resolve open clinical questions from this analysis',
            color: '#E88080',
            bg: 'rgba(232,128,128,0.06)',
            border: 'rgba(232,128,128,0.2)',
            markers: essentialGaps,
          },
          {
            key: 'rec',
            label: 'Tier 2 - Strongly Recommended',
            sublabel: 'Refine findings or rule out key differentials',
            color: '#E8C470',
            bg: 'rgba(232,196,112,0.06)',
            border: 'rgba(232,196,112,0.2)',
            markers: recommendedGaps,
          },
          {
            key: 'ext',
            label: 'Tier 3 - Optional',
            sublabel: 'Add depth and specificity to the picture',
            color: '#C8A2C8',
            bg: 'rgba(200,162,200,0.04)',
            border: 'rgba(200,162,200,0.12)',
            markers: extendedGaps,
          },
        ].filter(t => t.markers.length > 0);

        return (
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.01)' }}>
              <TestTube size={16} className="text-[#C8A2C8]" />
              <div>
                <div className="text-xs font-black text-white uppercase tracking-widest">Recommended Next Tests</div>
                <div className="text-[9px] text-[#4A4A4A] uppercase tracking-wide">Based on your profile and current results</div>
              </div>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {tiers.map(tier => (
                <div key={tier.key} className="px-5 py-4"
                  style={{ background: tier.bg, borderLeft: `2px solid ${tier.color}20` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-black uppercase tracking-[2px] px-2 py-0.5"
                      style={{ color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}30` }}>
                      {tier.label}
                    </span>
                    <span className="text-[9px] text-[#4A4A4A]">{tier.sublabel}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {tier.markers.map(m => (
                      <div key={m.id} className="flex items-start gap-2.5">
                        <div className="w-1 h-1 rounded-full shrink-0 mt-[5px]" style={{ background: tier.color }} />
                        <div>
                          <span className="text-[11px] font-bold text-white">
                            {BIOMARKER_NAME.get(m.id) ?? m.id.replace(/_/g, ' ')}
                          </span>
                          {m.reasons[0] && (
                            <span className="text-[10px] text-[#4A4A4A] ml-2">{m.reasons[0]}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* ── FOLD 2: Biomarker Deep-Dive ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardText size={14} className="text-[#4A4A4A]" />
          <span className="text-[10px] font-black text-[#4A4A4A] uppercase tracking-[4px]">Categorized Deep-Dive</span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(cat => {
            const meta = CATEGORY_META[cat] ?? { label: cat, color: '#9A9A9A', Icon: Pulse };
            const markers = grouped[cat];
            const needsAttention = markers.filter(m => m.status !== 'optimal').length;
            const { Icon } = meta;

            return (
              <Card key={cat} className="p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded" style={{ background: `${meta.color}14`, color: meta.color }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-widest">{meta.label}</div>
                      <div className="text-[9px] text-[#4A4A4A] uppercase">{markers.length} biomarkers tracked</div>
                    </div>
                  </div>
                  {needsAttention > 0 && (
                    <span className="text-[9px] font-black text-[#E8C470] bg-[rgba(232,196,112,0.1)] px-2 py-1 border border-[rgba(232,196,112,0.2)] uppercase">
                      {needsAttention} action required
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 px-5 py-2 border-b border-[rgba(255,255,255,0.03)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-1 bg-[rgba(255,255,255,0.1)] rounded-full" />
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Standard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-1 bg-[rgba(200,162,200,0.3)] rounded-full" />
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Optimal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#9A9A9A]" />
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Your value</span>
                  </div>
                </div>

                <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {markers.map(m => {
                    const prevValue = prevMarkers[m.marker];
                    const diff = prevValue !== undefined ? m.value - prevValue : null;
                    return (
                      <details key={m.marker} className="group">
                        <summary className="flex flex-col px-5 py-4 cursor-pointer list-none hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="text-[11px] font-black text-white uppercase tracking-tight">
                                {m.marker.replace(/_/g, ' ')}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-black text-white tabular-nums font-mono">{Number.isFinite(m.value) ? Math.round(m.value * 10) / 10 : m.value}</span>
                                <span className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-tight">{m.unit}</span>
                                {diff !== null && diff !== 0 && (
                                  <span className={cn('text-[10px] font-mono font-bold', diff > 0 ? 'text-[#C8A2C8]' : 'text-[#E88080]')}>
                                    {diff > 0 ? '↑' : '↓'}{Math.abs(diff).toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={m.status} />
                              <CaretRight size={13} className="text-[#3A3A3A] group-open:rotate-90 transition-transform duration-200" />
                            </div>
                          </div>
                          <RangeTrack value={m.value} standardRange={m.standard_range} optimalRange={m.optimal_range} status={m.status} />
                        </summary>
                        <div className="px-5 pb-4 bg-[rgba(0,0,0,0.2)]">
                          <p className="text-[11px] text-[#9A9A9A] leading-relaxed italic border-l border-[rgba(200,162,200,0.3)] pl-3 py-1 mb-3">
                            &ldquo;{m.explanation}&rdquo;
                          </p>
                          <div className="flex gap-6">
                            <div>
                              <div className="text-[8px] font-black text-[#4A4A4A] uppercase tracking-widest mb-1">Standard</div>
                              <span className="text-[10px] font-mono text-[#9A9A9A]">{m.standard_range?.low}–{m.standard_range?.high} {m.unit}</span>
                            </div>
                            <div>
                              <div className="text-[8px] font-black text-[rgba(200,162,200,0.5)] uppercase tracking-widest mb-1">Optimal</div>
                              <span className="text-[10px] font-mono text-[#C8A2C8]">{m.optimal_range?.low}–{m.optimal_range?.high} {m.unit}</span>
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Protocol CTA ── */}
      <div className="pt-2 border-t border-[rgba(255,255,255,0.05)]">
        {latestPanelPhase === 'final' ? (
          <Link href="/protocol"
            className="group flex items-center justify-between w-full p-6 bg-[#C8A2C8] text-black hover:bg-[#A882A8] transition-colors">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[3px] opacity-60 mb-1">Cycle Complete</div>
              <div className="text-xl font-black uppercase tracking-tighter">View 90-Day Progress</div>
            </div>
            <ArrowUpRight size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
        ) : (
          <Link href="/lab/generate-protocol"
            className="group flex items-center justify-between w-full p-6 bg-[#C8A2C8] text-black hover:bg-[#A882A8] transition-colors">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[3px] opacity-60 mb-1">Next Sequence</div>
              <div className="text-xl font-black uppercase tracking-tighter">Generate Foundation Protocol</div>
            </div>
            <ArrowUpRight size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
        )}
      </div>

      {/* ── Panel History ── */}
      <div>
        <div className="text-[10px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-3">Panel History</div>
        <div className="flex flex-col gap-2">
          {[...typedReports].reverse().map((r, i) => {
            const num = typedReports.length - i;
            const isLatest = i === 0;
            const phaseLabel = num === 1 ? 'Initial Panel' : 'Final Panel (90-Day)';
            return (
              <div key={r.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 border transition-all ${isLatest ? 'border-[#C8A2C8]' : 'border-[rgba(255,255,255,0.06)] opacity-60 hover:opacity-100'}`}
                style={{ background: isLatest ? 'rgba(200,162,200,0.04)' : 'linear-gradient(165deg, rgba(255,255,255,0.02) 0%, rgba(20,20,20,0) 55%), #141414' }}>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white">Panel {num}</span>
                  <span className="text-[11px] text-[#4A4A4A] ml-2">· {phaseLabel}</span>
                  <span className="text-[11px] text-[#4A4A4A] ml-1 hidden sm:inline">
                    · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-sm font-black text-white">
                    {r.health_score}<span className="text-[10px] text-[#4A4A4A]">/100</span>
                  </span>
                  <PanelActions panelId={r.bloodwork_panel_id} reportId={r.id} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
