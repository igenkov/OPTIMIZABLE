import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
import { BIOMARKERS } from '@/constants/biomarkers';
import type { AnalysisReport, MarkerAnalysis, MarkerStatus, ReportSummaryStructured } from '@/types';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  hormones: { label: 'Hormonal Axis', color: '#00E676' },
  thyroid:  { label: 'Thyroid Function', color: '#CE93D8' },
  metabolic: { label: 'Metabolic Health', color: '#64B5F6' },
  lipids:   { label: 'Lipid Panel', color: '#FFB300' },
};
const CATEGORY_ORDER = ['hormones', 'thyroid', 'metabolic', 'lipids'];
const BIOMARKER_CATEGORY = new Map(BIOMARKERS.map(b => [b.id, b.category]));

// ── Range Track ──────────────────────────────────────────────────────────────
function RangeTrack({ value, standardRange, optimalRange, status }: {
  value: number;
  standardRange?: { low: number; high: number };
  optimalRange?: { low: number; high: number };
  status: MarkerStatus;
}) {
  if (!standardRange || !optimalRange) return null;
  const max = Math.max(standardRange.high, value) * 1.35;
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));
  const color = getStatusColor(status);

  return (
    <div className="relative h-2 bg-[rgba(255,255,255,0.04)] my-2.5">
      {/* Standard range band */}
      <div className="absolute top-0 h-full bg-[rgba(255,255,255,0.1)]"
        style={{ left: `${pct(standardRange.low)}%`, width: `${Math.max(0, pct(standardRange.high) - pct(standardRange.low))}%` }} />
      {/* Optimal range band */}
      <div className="absolute top-0 h-full bg-[rgba(0,230,118,0.22)]"
        style={{ left: `${pct(optimalRange.low)}%`, width: `${Math.max(0, pct(optimalRange.high) - pct(optimalRange.low))}%` }} />
      {/* Value indicator dot */}
      <div className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-[#141414]"
        style={{ left: `${pct(value)}%`, transform: 'translate(-50%, -50%)', background: color }} />
    </div>
  );
}

// ── Executive Briefing ───────────────────────────────────────────────────────
function ExecutiveBriefing({ summary }: { summary: string | ReportSummaryStructured }) {
  const isStructured = typeof summary === 'object' && summary !== null;

  if (isStructured) {
    const s = summary as ReportSummaryStructured;
    return (
      <div className="flex flex-col gap-3">
        {([
          { label: 'THE BOTTOM LINE', text: s.bottom_line, color: '#E0E0E0', border: 'rgba(255,255,255,0.2)' },
          { label: 'PRIMARY DRIVER',  text: s.primary_driver, color: '#FFB300', border: '#FFB300' },
          { label: 'NEXT ACTION',     text: s.next_action, color: '#00E676', border: '#00E676' },
        ] as { label: string; text: string; color: string; border: string }[]).map(item => (
          <div key={item.label} className="border-l-2 pl-3 py-0.5"
            style={{ borderColor: item.border }}>
            <div className="text-[9px] font-bold tracking-[3px] uppercase mb-1" style={{ color: item.color }}>
              {item.label}
            </div>
            <p className="text-[11px] text-[#D0D0D0] leading-relaxed font-mono">{item.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // Legacy: plain string — still display styled
  return (
    <div className="border-l-2 border-[#00E676] pl-3">
      <div className="text-[9px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2">AI Assessment</div>
      <p className="text-[11px] text-[#D0D0D0] leading-relaxed font-mono">{summary as string}</p>
    </div>
  );
}

// ── Score delta ──────────────────────────────────────────────────────────────
function ScoreDelta({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-[11px] text-[#4A4A4A]">no change</span>;
  return (
    <span className={`text-[11px] font-bold ${diff > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
      {diff > 0 ? '+' : ''}{diff} pts vs previous panel
    </span>
  );
}

function Delta({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-[10px] text-[#4A4A4A]">—</span>;
  return (
    <span className={`text-[10px] font-bold ${diff > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
      {diff > 0 ? '↑' : '↓'}{Math.abs(diff).toFixed(1)}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function LabPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const tier = userData?.subscription_tier ?? 'free';
  if (tier === 'free') redirect('/dashboard');

  const { data: reports } = await supabase
    .from('analysis_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const typedReports = (reports ?? []) as AnalysisReport[];
  const latest = typedReports.length > 0 ? typedReports[typedReports.length - 1] : null;
  const previous = typedReports.length > 1 ? typedReports[typedReports.length - 2] : null;

  const prevMarkers: Record<string, number> = {};
  if (previous?.marker_analysis) {
    for (const m of previous.marker_analysis) prevMarkers[m.marker] = m.value;
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!latest) {
    return (
      <div className="px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Biomarker Analysis</div>
          <h1 className="text-xl font-black tracking-[2px] uppercase text-white">LAB</h1>
        </div>
        <div className="max-w-2xl space-y-3">
          <Card className="text-center py-10">
            <div className="text-4xl mb-4">⚗</div>
            <div className="text-white font-bold mb-2 tracking-wide">No Analysis Yet</div>
            <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-sm mx-auto">
              Upload your bloodwork to get a deep AI analysis of every biomarker, your Testosterone Health Score,
              and a personalized supplement protocol.
            </p>
            <Link href="/lab/upload"
              className="inline-block px-8 py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors">
              UPLOAD YOUR BLOODWORK →
            </Link>
          </Card>
          <Card accent>
            <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Before Your Draw</div>
            {[
              'Schedule between 7:00–10:00 AM — testosterone peaks in early morning',
              'Fast for 10–12 hours (water is fine)',
              'No heavy exercise for 24 hours prior',
              'No alcohol for 48 hours before the test',
            ].map((t, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <span className="text-[#00E676] font-bold shrink-0">{i + 1}.</span>
                <span className="text-[11px] text-[#9A9A9A]">{t}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  const panelNumber = typedReports.length;

  // Group markers by category
  const grouped: Record<string, MarkerAnalysis[]> = {};
  for (const m of latest.marker_analysis ?? []) {
    const cat = BIOMARKER_CATEGORY.get(m.marker) ?? 'metabolic';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }

  return (
    <div className="px-6 lg:px-8 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">
            Panel {panelNumber} · {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <h1 className="text-xl font-black tracking-[2px] uppercase text-white">LAB</h1>
        </div>
        <Link href="/lab/upload"
          className="px-5 py-2 border border-[#00E676] text-[#00E676] font-bold text-xs tracking-widest uppercase hover:bg-[rgba(0,230,118,0.08)] transition-colors">
          + NEW PANEL
        </Link>
      </div>

      {/* Medical referral alert */}
      {latest.medical_referral_needed && (
        <div className="border border-[#FF5252] bg-[rgba(255,82,82,0.08)] px-5 py-4 mb-4">
          <div className="text-sm font-bold text-[#FF5252] mb-1">⚠ Medical Consultation Recommended</div>
          <div className="text-[11px] text-[#FF5252] opacity-80">{latest.medical_referral_reason}</div>
        </div>
      )}

      {/* ── FOLD 1: Executive Briefing (bento 2-col) ── */}
      <div className="grid grid-cols-12 gap-3 mb-4">

        {/* Health Score */}
        <Card className="col-span-12 md:col-span-5 flex flex-col items-center justify-center py-8 gap-3 text-center"
          topAccent="rgba(0,230,118,0.5)">
          <ScoreRing score={latest.health_score} size={130} />
          <div>
            <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-1">Testosterone Health Score</div>
            <div className="text-4xl font-black text-white mb-1">
              {latest.health_score}<span className="text-lg text-[#9A9A9A]">/100</span>
            </div>
            <div className="text-[11px] text-[#9A9A9A] mb-2">
              {latest.health_score >= 70
                ? 'Good — room for optimization'
                : latest.health_score >= 45
                ? 'Suboptimal — needs attention'
                : 'Critical — immediate action recommended'}
            </div>
            {previous && <ScoreDelta current={latest.health_score} previous={previous.health_score} />}
          </div>
        </Card>

        {/* AI Executive Briefing */}
        <Card className="col-span-12 md:col-span-7" topAccent="rgba(0,230,118,0.35)"
          style={{ background: 'linear-gradient(165deg, rgba(0,230,118,0.05) 0%, rgba(20,20,20,0) 55%), #141414' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            <div className="text-[9px] font-bold tracking-[3px] text-[#00E676] uppercase">AI Assessment Active</div>
          </div>
          <ExecutiveBriefing summary={latest.report_summary} />
        </Card>
      </div>

      {/* ── Key Ratios (horizontal cards) ── */}
      {latest.key_ratios?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
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
        <Card className="mb-4">
          <div className="text-[10px] font-bold tracking-[3px] text-[#FF5252] uppercase mb-3">Areas of Concern</div>
          <div className="flex flex-col">
            {latest.concerns.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]"
                  style={{ background: c.severity === 'high' ? '#FF5252' : c.severity === 'medium' ? '#FFB300' : '#00E676' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-white tracking-widest uppercase mb-0.5">
                    {c.marker.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-[#9A9A9A]">{c.explanation}</div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 shrink-0"
                  style={{
                    color: c.severity === 'high' ? '#FF5252' : c.severity === 'medium' ? '#FFB300' : '#00E676',
                    background: c.severity === 'high' ? 'rgba(255,82,82,0.1)' : c.severity === 'medium' ? 'rgba(255,179,0,0.1)' : 'rgba(0,230,118,0.1)',
                  }}>
                  {c.severity}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── FOLD 2: Biomarker Deep-Dive (categorized) ── */}
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-3">Biomarker Deep-Dive</div>
        <div className="flex flex-col gap-3">
          {CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(cat => {
            const config = CATEGORY_CONFIG[cat] ?? { label: cat, color: '#9A9A9A' };
            const attentionCount = grouped[cat].filter(m => m.status !== 'optimal').length;
            return (
              <Card key={cat}>
                {/* Category header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ background: config.color }} />
                    <div className="text-[11px] font-bold tracking-[3px] uppercase" style={{ color: config.color }}>
                      {config.label}
                    </div>
                  </div>
                  <div className="text-[10px]" style={{ color: attentionCount > 0 ? '#FFB300' : '#4A4A4A' }}>
                    {attentionCount > 0 ? `${attentionCount} need attention` : 'All optimal'}
                  </div>
                </div>

                {/* Range legend */}
                <div className="flex items-center gap-4 mb-3 pb-3 border-b border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-1.5 bg-[rgba(255,255,255,0.1)]" />
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Standard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-1.5 bg-[rgba(0,230,118,0.22)]" />
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Optimal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#9A9A9A]" />
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Your Value</span>
                  </div>
                </div>

                {/* Markers — expandable rows */}
                {grouped[cat].map(m => (
                  <details key={m.marker} className="group border-b border-[rgba(255,255,255,0.04)] last:border-0">
                    <summary className="flex items-start gap-2 py-3 cursor-pointer list-none">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-semibold text-[#D0D0D0] tracking-wide uppercase">
                            {m.marker.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <Delta current={m.value} previous={prevMarkers[m.marker]} />
                            <span className="text-sm font-bold tabular-nums" style={{ color: getStatusColor(m.status) }}>
                              {m.value}
                            </span>
                            <span className="text-[10px] text-[#4A4A4A]">{m.unit}</span>
                            <StatusBadge status={m.status} />
                          </div>
                        </div>
                        <RangeTrack
                          value={m.value}
                          standardRange={m.standard_range}
                          optimalRange={m.optimal_range}
                          status={m.status}
                        />
                      </div>
                      <div className="text-[#3A3A3A] group-open:text-[#7A7A7A] transition-colors text-lg leading-none pt-2 shrink-0">›</div>
                    </summary>
                    {/* Expanded: explanation + ranges */}
                    <div className="pb-3 pl-1">
                      <p className="text-[11px] text-[#9A9A9A] leading-relaxed mb-2">{m.explanation}</p>
                      <div className="flex gap-5 text-[10px]">
                        <span className="text-[#4A4A4A]">Standard: {m.standard_range?.low}–{m.standard_range?.high} {m.unit}</span>
                        <span style={{ color: 'rgba(0,230,118,0.5)' }}>Optimal: {m.optimal_range?.low}–{m.optimal_range?.high} {m.unit}</span>
                      </div>
                    </div>
                  </details>
                ))}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Supplement Protocol ── */}
      {latest.recommendations?.supplements?.length > 0 && (
        <Card accent className="mb-4">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Supplement Protocol</div>
          {latest.recommendations.supplements.map(s => (
            <div key={s.name} className="flex justify-between items-start py-2.5 border-b border-[rgba(255,255,255,0.05)] last:border-0">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {s.name} <span className="text-[#00E676]">{s.dose}</span>
                </div>
                <div className="text-[11px] text-[#4A4A4A] mt-0.5">{s.timing} · {s.reason}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Protocol CTA */}
      <div className="flex gap-4 mb-8">
        <Link href="/protocol"
          className="flex-1 py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors">
          VIEW YOUR PROTOCOL →
        </Link>
      </div>

      {/* Panel History */}
      {typedReports.length > 1 && (
        <div>
          <div className="text-[10px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-3">Panel History</div>
          <div className="flex flex-col gap-2">
            {[...typedReports].reverse().map((r, i) => {
              const num = typedReports.length - i;
              const isLatest = i === 0;
              const phaseLabel = num === 1 ? 'Initial' : num === 2 ? '30-Day' : num === 3 ? '60-Day' : `Panel ${num}`;
              return (
                <div key={r.id}
                  className={`flex items-center justify-between px-4 py-3 border ${isLatest ? 'border-[#00E676]' : 'border-[rgba(255,255,255,0.07)]'}`}
                  style={{ background: isLatest ? 'rgba(0,230,118,0.04)' : 'linear-gradient(165deg, rgba(255,255,255,0.02) 0%, rgba(20,20,20,0) 55%), #141414' }}>
                  <div>
                    <span className="text-xs font-bold text-white">Panel {num}</span>
                    <span className="text-[11px] text-[#4A4A4A] ml-2">· {phaseLabel}</span>
                    <span className="text-[11px] text-[#4A4A4A] ml-2">
                      · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{r.health_score}<span className="text-[10px] text-[#4A4A4A]">/100</span></span>
                    {isLatest && <span className="text-[10px] text-[#00E676] font-bold tracking-widest uppercase">Current</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
