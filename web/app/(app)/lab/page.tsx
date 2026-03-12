import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
import type { AnalysisReport } from '@/types';

function Delta({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-[#4A4A4A]">—</span>;
  return (
    <span className={`text-xs font-bold ${diff > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
      {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

function ScoreDelta({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-sm text-[#4A4A4A]">no change</span>;
  return (
    <span className={`text-sm font-bold ${diff > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
      {diff > 0 ? '+' : ''}{diff} pts vs previous panel
    </span>
  );
}

export default async function LabPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check premium access
  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const tier = userData?.subscription_tier ?? 'free';
  if (tier === 'free') redirect('/dashboard');

  // Fetch all reports ordered oldest-first (for panel numbering)
  const { data: reports } = await supabase
    .from('analysis_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const typedReports = (reports ?? []) as AnalysisReport[];
  const latest = typedReports.length > 0 ? typedReports[typedReports.length - 1] : null;
  const previous = typedReports.length > 1 ? typedReports[typedReports.length - 2] : null;

  // Build previous marker map for comparison
  const prevMarkers: Record<string, number> = {};
  if (previous?.marker_analysis) {
    for (const m of previous.marker_analysis) prevMarkers[m.marker] = m.value;
  }

  // No reports yet — empty state
  if (!latest) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">LAB</h1>
          <p className="text-xs text-[#4A4A4A]">Your biomarker analysis hub</p>
        </div>
        <div className="border border-[rgba(255,255,255,0.07)] p-12 text-center">
          <div className="text-4xl mb-4">⚗</div>
          <div className="text-white font-bold mb-2 tracking-wide">No Analysis Yet</div>
          <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-sm mx-auto">
            Upload your bloodwork to get a deep AI analysis of every biomarker, your Testosterone Health Score,
            and a personalized supplement protocol.
          </p>
          <Link
            href="/lab/upload"
            className="inline-block px-8 py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors"
          >
            UPLOAD YOUR BLOODWORK →
          </Link>
        </div>

        <div className="mt-6 border border-[rgba(255,255,255,0.05)] p-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Before Your Draw</div>
          {[
            'Schedule between 7:00–10:00 AM — testosterone peaks in early morning',
            'Fast for 10–12 hours (water is fine)',
            'No heavy exercise for 24 hours prior',
            'No alcohol for 48 hours before the test',
          ].map((t, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="text-[#00E676] font-bold shrink-0">{i + 1}.</span>
              <span className="text-xs text-[#9A9A9A]">{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const panelNumber = typedReports.length;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">LAB</h1>
          <p className="text-xs text-[#4A4A4A]">
            Panel {panelNumber} · {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/lab/upload"
          className="px-5 py-2 border border-[#00E676] text-[#00E676] font-bold text-xs tracking-widest uppercase hover:bg-[rgba(0,230,118,0.08)] transition-colors"
        >
          + NEW PANEL
        </Link>
      </div>

      {/* Medical referral alert */}
      {latest.medical_referral_needed && (
        <div className="border border-[#FF5252] bg-[rgba(255,82,82,0.08)] px-5 py-4 mb-5">
          <div className="text-sm font-bold text-[#FF5252] mb-1">⚠ Medical Consultation Recommended</div>
          <div className="text-xs text-[#FF5252] opacity-80">{latest.medical_referral_reason}</div>
        </div>
      )}

      {/* Health Score */}
      <Card className="mb-5 flex items-center gap-8 py-8">
        <ScoreRing score={latest.health_score} size={130} />
        <div>
          <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-2">Testosterone Health Score</div>
          <div className="text-4xl font-black text-white mb-1">
            {latest.health_score}<span className="text-lg text-[#9A9A9A]">/100</span>
          </div>
          <div className="text-xs text-[#9A9A9A] mb-2">
            {latest.health_score >= 70 ? 'Good — room for optimization' : latest.health_score >= 45 ? 'Suboptimal — needs attention' : 'Critical — immediate action recommended'}
          </div>
          {previous && <ScoreDelta current={latest.health_score} previous={previous.health_score} />}
        </div>
      </Card>

      {/* Key Ratios */}
      {latest.key_ratios?.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Key Ratios</div>
          <div className="flex flex-col gap-3">
            {latest.key_ratios.map(r => (
              <div key={r.name} className="flex items-start justify-between py-2 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-0.5">{r.name}</div>
                  <div className="text-xs text-[#9A9A9A]">{r.interpretation}</div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <span className="text-lg font-bold" style={{ color: getStatusColor(r.status) }}>
                    {typeof r.value === 'number' ? r.value.toFixed(1) : r.value}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Biomarker Dashboard */}
      <Card className="mb-5">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Biomarker Dashboard</div>
        {latest.marker_analysis?.map(m => (
          <div key={m.marker} className="py-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#9A9A9A] tracking-widest uppercase">
                {m.marker.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-3">
                {previous && <Delta current={m.value} previous={prevMarkers[m.marker]} />}
                <span className="text-sm font-bold" style={{ color: getStatusColor(m.status) }}>
                  {m.value} {m.unit}
                </span>
                <StatusBadge status={m.status} />
              </div>
            </div>
            <div className="h-1 bg-[rgba(255,255,255,0.05)] mb-2">
              <div className="h-full transition-all" style={{
                width: `${Math.min(100, (m.value / (m.optimal_range?.high ?? m.value * 1.2)) * 100)}%`,
                background: getStatusColor(m.status),
              }} />
            </div>
            <p className="text-xs text-[#9A9A9A] leading-relaxed">{m.explanation}</p>
          </div>
        ))}
      </Card>

      {/* Report Summary */}
      {latest.report_summary && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Analysis Report</div>
          <p className="text-sm text-[#E0E0E0] leading-relaxed">{latest.report_summary}</p>
        </Card>
      )}

      {/* Areas of Concern */}
      {latest.concerns?.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Areas of Concern</div>
          {latest.concerns.map((c, i) => (
            <div key={i} className="pl-3 mb-3 border-l-2" style={{
              borderColor: c.severity === 'high' ? '#FF5252' : c.severity === 'medium' ? '#FFB300' : '#00E676',
            }}>
              <div className="text-xs font-bold text-white tracking-widest uppercase mb-0.5">
                {c.marker.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-[#9A9A9A]">{c.explanation}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Supplement Protocol */}
      {latest.recommendations?.supplements?.length > 0 && (
        <Card accent className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Supplement Protocol</div>
          {latest.recommendations.supplements.map(s => (
            <div key={s.name} className="flex justify-between items-start py-2.5 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {s.name} <span className="text-[#00E676]">{s.dose}</span>
                </div>
                <div className="text-xs text-[#4A4A4A] mt-0.5">{s.timing} · {s.reason}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Protocol link */}
      <div className="flex gap-4 mb-8">
        <Link
          href="/protocol"
          className="flex-1 py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors"
        >
          VIEW YOUR PROTOCOL →
        </Link>
      </div>

      {/* Historical panels */}
      {typedReports.length > 1 && (
        <div>
          <div className="text-[10px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-3">Panel History</div>
          <div className="flex flex-col gap-2">
            {[...typedReports].reverse().map((r, i) => {
              const num = typedReports.length - i;
              const isLatest = i === 0;
              const phaseLabel = num === 1 ? 'Initial' : num === 2 ? '30-Day' : num === 3 ? '60-Day' : `Panel ${num}`;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-4 py-3 border ${isLatest ? 'border-[#00E676] bg-[rgba(0,230,118,0.04)]' : 'border-[rgba(255,255,255,0.07)]'}`}
                >
                  <div>
                    <span className="text-xs font-bold text-white">Panel {num}</span>
                    <span className="text-xs text-[#4A4A4A] ml-2">· {phaseLabel}</span>
                    <span className="text-xs text-[#4A4A4A] ml-2">
                      · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{r.health_score}<span className="text-xs text-[#4A4A4A]">/100</span></span>
                    {isLatest && <span className="text-[9px] text-[#00E676] font-bold tracking-widest uppercase">Current</span>}
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
