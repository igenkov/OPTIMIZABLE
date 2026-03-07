import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import type { AnalysisReport } from '@/types';

export default async function ResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: reports } = await supabase
    .from('analysis_reports').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const list = (reports ?? []) as AnalysisReport[];
  const report = list[0];

  if (!report) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">⚗</div>
          <h2 className="text-xl font-bold text-white mb-3">No Results Yet</h2>
          <p className="text-sm text-[#9A9A9A] mb-6">Upload your bloodwork to get your AI-powered analysis.</p>
          <Link href="/bloodwork/upload"
            className="px-6 py-3 bg-[#00E676] text-black font-bold text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors">
            UPLOAD BLOODWORK →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">Results</h1>
          <p className="text-xs text-[#4A4A4A]">{list.length} panel{list.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/bloodwork/upload"
          className="px-4 py-2 border border-[#00E676] text-[#00E676] text-xs font-bold tracking-widest uppercase hover:bg-[rgba(0,230,118,0.1)] transition-colors">
          + New Panel
        </Link>
      </div>

      {/* Panel tabs */}
      {list.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {list.map((r, i) => (
            <div key={r.id} className={`shrink-0 px-4 py-2 border text-xs font-semibold
              ${i === 0 ? 'border-[#00E676] text-[#00E676] bg-[rgba(0,230,118,0.08)]' : 'border-[rgba(255,255,255,0.07)] text-[#9A9A9A]'}`}>
              Panel {list.length - i}
              <div className="text-[10px] text-[#4A4A4A] mt-0.5">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Score */}
      <Card className="mb-5 flex items-center gap-8 py-8">
        <ScoreRing score={report.health_score} size={130} />
        <div className="flex-1">
          <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-2">Testosterone Health Score</div>
          <div className="text-3xl font-black text-white mb-1">{report.health_score}/100</div>
          <div className="text-xs text-[#9A9A9A] mb-3">{new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          {list.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9A9A9A]">vs. previous:</span>
              <span className={`text-sm font-bold ${report.health_score >= list[1].health_score ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                {report.health_score >= list[1].health_score ? '+' : ''}{report.health_score - list[1].health_score} pts
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Biomarkers */}
      <Card className="mb-5">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Biomarker Dashboard</div>
        {report.marker_analysis?.map(m => (
          <div key={m.marker} className="py-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#9A9A9A] tracking-wider uppercase">{m.marker.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: getStatusColor(m.status) }}>{m.value} {m.unit}</span>
                <StatusBadge status={m.status} />
              </div>
            </div>
            <div className="h-1 bg-[rgba(255,255,255,0.05)] mb-2">
              <div className="h-full" style={{
                width: `${Math.min(100, (m.value / (m.optimal_range?.high ?? m.value * 1.2)) * 100)}%`,
                background: getStatusColor(m.status)
              }} />
            </div>
            <p className="text-xs text-[#9A9A9A] leading-relaxed">{m.explanation}</p>
          </div>
        ))}
      </Card>

      {report.report_summary && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Analysis Report</div>
          <p className="text-sm text-[#E0E0E0] leading-relaxed">{report.report_summary}</p>
        </Card>
      )}

      {report.concerns?.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Areas of Concern</div>
          {report.concerns.map((c, i) => (
            <div key={i} className="pl-3 mb-3 border-l-2"
              style={{ borderColor: c.severity === 'high' ? '#FF5252' : c.severity === 'medium' ? '#FFB300' : '#00E676' }}>
              <div className="text-xs font-bold text-white tracking-widest uppercase mb-0.5">{c.marker.replace(/_/g, ' ')}</div>
              <div className="text-xs text-[#9A9A9A]">{c.explanation}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
