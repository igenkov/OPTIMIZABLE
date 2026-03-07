import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { AnalysisReport } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  eating: 'Nutrition', exercise: 'Exercise', supplements: 'Supplements',
  sleep: 'Sleep', stress: 'Stress Management', habits: 'Habits',
};

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: report } = await supabase
    .from('analysis_reports').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single();

  const r = report as AnalysisReport | null;

  if (!r) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">▦</div>
          <h2 className="text-xl font-bold text-white mb-3">No Plan Yet</h2>
          <p className="text-sm text-[#9A9A9A] mb-6">Upload bloodwork to generate your personalized 90-day plan.</p>
          <Link href="/bloodwork/upload"
            className="px-6 py-3 bg-[#00E676] text-black font-bold text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors">
            UPLOAD BLOODWORK →
          </Link>
        </div>
      </div>
    );
  }

  const plan = r.recommendations;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">My Optimization Plan</h1>
        <p className="text-xs text-[#4A4A4A]">Generated {new Date(r.created_at).toLocaleDateString()}</p>
      </div>

      {/* Supplements */}
      {plan?.supplements?.length > 0 && (
        <Card accent className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Supplements</div>
          {plan.supplements.map(s => (
            <div key={s.name} className="py-3 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className="text-sm text-[#00E676] ml-2">{s.dose}</span>
                </div>
                <span className="text-xs text-[#4A4A4A] shrink-0 ml-4">{s.timing}</span>
              </div>
              <p className="text-xs text-[#9A9A9A] mt-1">{s.reason}</p>
            </div>
          ))}
        </Card>
      )}

      {/* Other categories */}
      {(['eating', 'exercise', 'sleep', 'stress', 'habits'] as const).map(cat => {
        const items = plan?.[cat] ?? [];
        if (!items.length) return null;
        return (
          <Card key={cat} className="mb-5">
            <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">{CATEGORY_LABELS[cat]}</div>
            {items.map((item: string, i: number) => (
              <div key={i} className="flex gap-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
                <span className="text-[#00E676] font-bold shrink-0 mt-0.5">→</span>
                <span className="text-sm text-[#E0E0E0] leading-relaxed">{item}</span>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}
