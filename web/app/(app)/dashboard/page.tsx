import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import type { AnalysisReport, OptimizationCycle } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [reportRes, cycleRes, checkinRes] = await Promise.all([
    supabase.from('analysis_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('optimization_cycles').select('*').eq('user_id', user.id).eq('status', 'active').single(),
    supabase.from('daily_checkins').select('date').eq('user_id', user.id).order('date', { ascending: false }),
  ]);

  const report = reportRes.data as AnalysisReport | null;
  const cycle = cycleRes.data as OptimizationCycle | null;

  // Calculate streak
  let streak = 0;
  if (checkinRes.data) {
    const dates = checkinRes.data.map(c => c.date);
    const today = new Date().toISOString().split('T')[0];
    let check = today;
    for (const d of dates) {
      if (d === check) { streak++; const dt = new Date(check); dt.setDate(dt.getDate() - 1); check = dt.toISOString().split('T')[0]; }
      else break;
    }
  }

  const cycleDay = cycle ? Math.floor((Date.now() - new Date(cycle.start_date).getTime()) / 86400000) + 1 : null;
  const daysToRetest = cycle ? Math.max(0, 90 - (cycleDay ?? 0)) : null;

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚗</div>
          <h1 className="text-2xl font-bold text-white tracking-wide mb-3">Welcome to Optimizable</h1>
          <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
            Upload your lab results to get your AI-powered analysis, Testosterone Health Score, and personalized 90-day optimization plan.
          </p>
          <Link href="/bloodwork/upload"
            className="inline-block px-8 py-3 bg-[#00E676] text-black font-bold text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors">
            UPLOAD BLOODWORK →
          </Link>
        </div>
      </div>
    );
  }

  const topMarkers = report.marker_analysis?.slice(0, 5) ?? [];
  const supplements = (report.recommendations?.supplements ?? []).slice(0, 3);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">Dashboard</h1>
        <p className="text-xs text-[#4A4A4A]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="md:col-span-1 flex flex-col items-center justify-center py-6">
          <ScoreRing score={report.health_score} size={120} />
          <div className="text-[10px] tracking-[2px] text-[#9A9A9A] uppercase mt-3">Health Score</div>
        </Card>
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          {[
            { label: 'Cycle Day', value: cycleDay ? `${cycleDay}/90` : '—', sub: 'Current cycle' },
            { label: 'Days to Retest', value: daysToRetest !== null ? daysToRetest : '—', sub: 'Until next panel' },
            { label: 'Check-in Streak', value: `${streak}d`, sub: 'Consecutive days' },
          ].map(stat => (
            <Card key={stat.label} className="flex flex-col justify-center">
              <div className="text-[10px] tracking-[2px] text-[#9A9A9A] uppercase mb-2">{stat.label}</div>
              <div className="text-3xl font-black text-[#00E676] mb-1">{stat.value}</div>
              <div className="text-[10px] text-[#4A4A4A]">{stat.sub}</div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Biomarker Preview */}
        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Latest Biomarkers</div>
          {topMarkers.map(m => (
            <div key={m.marker} className="flex items-center justify-between py-2.5 border-b border-[rgba(255,255,255,0.05)]">
              <span className="text-xs text-[#E0E0E0] font-medium">{m.marker.replace(/_/g, ' ').toUpperCase()}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: getStatusColor(m.status) }}>{m.value} {m.unit}</span>
                <StatusBadge status={m.status} />
              </div>
            </div>
          ))}
          <Link href="/results" className="block mt-4 text-xs text-[#00E676] hover:underline">View full results →</Link>
        </Card>

        {/* Today's Protocol */}
        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Today's Protocol</div>
          {supplements.length > 0 ? (
            <>
              <div className="text-[10px] text-[#4A4A4A] tracking-widest uppercase mb-3">Supplements</div>
              {supplements.map(s => (
                <div key={s.name} className="py-2.5 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{s.name}</span>
                    <span className="text-xs text-[#00E676]">{s.dose}</span>
                  </div>
                  <div className="text-xs text-[#4A4A4A] mt-0.5">{s.timing}</div>
                </div>
              ))}
              <Link href="/plan" className="block mt-4 text-xs text-[#00E676] hover:underline">View full plan →</Link>
            </>
          ) : (
            <p className="text-xs text-[#4A4A4A]">Upload bloodwork to generate your personalized protocol.</p>
          )}
        </Card>

        {/* Check-in CTA */}
        <Card accent className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Daily Check-in</div>
              <p className="text-xs text-[#9A9A9A]">Log today's energy, mood, and sleep to track your progress.</p>
            </div>
            <Link href="/journal"
              className="px-5 py-2 border border-[#00E676] text-[#00E676] text-xs font-bold tracking-widest uppercase hover:bg-[rgba(0,230,118,0.1)] transition-colors shrink-0 ml-4">
              LOG TODAY →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
