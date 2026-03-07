'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { AnalysisReport } from '@/types';

const MESSAGES = [
  'Interpreting your biomarkers...',
  'Calculating hormone ratios...',
  'Analyzing against optimal ranges...',
  'Generating your personalized report...',
  'Almost done...',
];

export default function AnalysisPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'error' | 'done'>('loading');
  const [msgIdx, setMsgIdx] = useState(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)), 3000);
    runAnalysis();
    return () => clearInterval(interval);
  }, []);

  async function runAnalysis() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const panelId = sessionStorage.getItem('pending_panel_id');
    const panelValues = sessionStorage.getItem('pending_panel_values');
    if (!panelId || !panelValues) { setError('No pending panel found. Please upload bloodwork first.'); setPhase('error'); return; }

    const phase1 = JSON.parse(sessionStorage.getItem('phase1') || '{}');
    const phase2 = JSON.parse(sessionStorage.getItem('phase2') || '{}');
    const phase3 = JSON.parse(sessionStorage.getItem('phase3') || '{}');
    const symptoms = JSON.parse(sessionStorage.getItem('symptoms') || '{}');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelValues: JSON.parse(panelValues), phase1, phase2, phase3, symptoms }),
      });

      if (!res.ok) throw new Error(await res.text());
      const analysisData = await res.json();

      const { data, error: dbErr } = await supabase.from('analysis_reports').insert({
        user_id: user.id,
        bloodwork_panel_id: panelId,
        ...analysisData,
      }).select().single();

      if (dbErr) throw dbErr;
      setReport(data as AnalysisReport);
      setPhase('done');
      sessionStorage.removeItem('pending_panel_id');
      sessionStorage.removeItem('pending_panel_values');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setPhase('error');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <div className="text-[#00E676] font-bold tracking-widest uppercase text-sm mb-2">Analyzing</div>
          <div className="text-[#9A9A9A] text-sm">{MESSAGES[msgIdx]}</div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠</div>
          <div className="text-white font-bold mb-2">Analysis Failed</div>
          <div className="text-sm text-[#9A9A9A] mb-6">{error}</div>
          <Button onClick={() => { setPhase('loading'); setMsgIdx(0); runAnalysis(); }}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">Analysis Complete</h1>
        <p className="text-xs text-[#4A4A4A]">{new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {report.medical_referral_needed && (
        <div className="border border-[#FF5252] bg-[rgba(255,82,82,0.08)] px-5 py-4 mb-5">
          <div className="text-sm font-bold text-[#FF5252] mb-1">⚠ Medical Consultation Recommended</div>
          <div className="text-xs text-[#FF5252] opacity-80">{report.medical_referral_reason}</div>
        </div>
      )}

      {/* Score */}
      <Card className="mb-5 flex items-center gap-8 py-8">
        <ScoreRing score={report.health_score} size={130} />
        <div>
          <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-2">Testosterone Health Score</div>
          <div className="text-4xl font-black text-white mb-1">{report.health_score}<span className="text-lg text-[#9A9A9A]">/100</span></div>
          <div className="text-xs text-[#9A9A9A]">
            {report.health_score >= 70 ? 'Good — room for optimization' : report.health_score >= 45 ? 'Suboptimal — needs attention' : 'Critical — immediate action recommended'}
          </div>
        </div>
      </Card>

      {/* Key Ratios */}
      {report.key_ratios?.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Key Ratios</div>
          <div className="flex flex-col gap-3">
            {report.key_ratios.map(r => (
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

      {/* Biomarkers */}
      <Card className="mb-5">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Biomarker Dashboard</div>
        {report.marker_analysis?.map(m => (
          <div key={m.marker} className="py-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#9A9A9A] tracking-widest uppercase">{m.marker.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: getStatusColor(m.status) }}>{m.value} {m.unit}</span>
                <StatusBadge status={m.status} />
              </div>
            </div>
            <div className="h-1 bg-[rgba(255,255,255,0.05)] mb-2">
              <div className="h-full transition-all" style={{
                width: `${Math.min(100, (m.value / (m.optimal_range?.high ?? m.value * 1.2)) * 100)}%`,
                background: getStatusColor(m.status)
              }} />
            </div>
            <p className="text-xs text-[#9A9A9A] leading-relaxed">{m.explanation}</p>
          </div>
        ))}
      </Card>

      {/* Report Summary */}
      {report.report_summary && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Analysis Report</div>
          <p className="text-sm text-[#E0E0E0] leading-relaxed">{report.report_summary}</p>
        </Card>
      )}

      {/* Concerns */}
      {report.concerns?.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Areas of Concern</div>
          {report.concerns.map((c, i) => (
            <div key={i} className="pl-3 mb-3 border-l-2" style={{
              borderColor: c.severity === 'high' ? '#FF5252' : c.severity === 'medium' ? '#FFB300' : '#00E676'
            }}>
              <div className="text-xs font-bold text-white tracking-widest uppercase mb-0.5">{c.marker.replace(/_/g, ' ')}</div>
              <div className="text-xs text-[#9A9A9A]">{c.explanation}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Supplement Protocol */}
      {report.recommendations?.supplements?.length > 0 && (
        <Card accent className="mb-6">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Your Supplement Protocol</div>
          {report.recommendations.supplements.map(s => (
            <div key={s.name} className="flex justify-between items-start py-2.5 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{s.name} <span className="text-[#00E676]">{s.dose}</span></div>
                <div className="text-xs text-[#4A4A4A] mt-0.5">{s.timing} · {s.reason}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={() => router.push('/dashboard')} variant="secondary">← Dashboard</Button>
        <Button onClick={() => router.push('/plan')}>View Full Plan →</Button>
      </div>
    </div>
  );
}
