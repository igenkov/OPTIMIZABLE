import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { AnalysisReport, OptimizationPlan } from '@/types';

const PHASES = [
  { num: 1 as const, label: 'Foundation', days: '1–30', desc: 'Establish your baseline protocol from your initial bloodwork analysis.' },
  { num: 2 as const, label: 'Calibration', days: '31–60', desc: 'Adjusted protocol based on your 30-day bloodwork progress.' },
  { num: 3 as const, label: 'Peak', days: '61–90', desc: 'Fine-tuned for maximum optimization based on your 60-day results.' },
];

function RecommendationSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">{title}</div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-[#00E676] font-bold shrink-0 text-xs">→</span>
            <span className="text-sm text-[#E0E0E0] leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LockedPhase({ phase, reason }: { phase: typeof PHASES[number]; reason: string }) {
  return (
    <div className="border border-[rgba(255,255,255,0.07)] p-8 text-center">
      <div className="text-2xl mb-3">🔒</div>
      <div className="text-sm font-bold text-white mb-2">Phase {phase.num}: {phase.label}</div>
      <p className="text-xs text-[#9A9A9A] leading-relaxed mb-6 max-w-xs mx-auto">{reason}</p>
      <Link
        href="/lab/upload"
        className="inline-block px-6 py-2 border border-[#00E676] text-[#00E676] font-bold text-xs tracking-widest uppercase hover:bg-[rgba(0,230,118,0.08)] transition-colors"
      >
        UPLOAD BLOODWORK TO UNLOCK →
      </Link>
    </div>
  );
}

export default async function ProtocolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check premium access
  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const tier = userData?.subscription_tier ?? 'free';
  if (tier === 'free') redirect('/dashboard');

  // Fetch reports oldest-first so index matches phase
  const { data: reports } = await supabase
    .from('analysis_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const typedReports = (reports ?? []) as AnalysisReport[];

  // Fetch active cycle to calculate current day
  const { data: cycle } = await supabase
    .from('optimization_cycles')
    .select('start_date')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  let currentDay = 0;
  let currentPhase: 1 | 2 | 3 = 1;
  if (cycle) {
    const startDate = new Date(cycle.start_date);
    const today = new Date();
    currentDay = Math.min(90, Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1));
    currentPhase = currentDay <= 30 ? 1 : currentDay <= 60 ? 2 : 3;
  }

  // Active phase is determined by number of reports submitted
  // Phase 1 = report[0], Phase 2 = report[1], Phase 3 = report[2]
  const activeReport = typedReports.length > 0 ? typedReports[currentPhase - 1] ?? typedReports[typedReports.length - 1] : null;

  // No bloodwork yet
  if (typedReports.length === 0) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">90-Day Protocol</h1>
          <p className="text-xs text-[#4A4A4A]">Your personalized optimization roadmap</p>
        </div>
        <div className="border border-[rgba(255,255,255,0.07)] p-12 text-center">
          <div className="text-4xl mb-4">▦</div>
          <div className="text-white font-bold mb-2">Protocol Not Yet Generated</div>
          <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-sm mx-auto">
            Your personalized 90-day protocol is generated from your bloodwork analysis.
            Upload your initial bloodwork in the LAB to get started.
          </p>
          <Link
            href="/lab/upload"
            className="inline-block px-8 py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors"
          >
            GO TO LAB →
          </Link>
        </div>
      </div>
    );
  }

  const phaseDay = currentDay > 0 ? ((currentDay - 1) % 30) + 1 : 1;
  const phaseProgress = Math.round(((phaseDay - 1) / 30) * 100);

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-1">90-Day Protocol</h1>
        <p className="text-xs text-[#4A4A4A]">Your personalized malemaxxing optimization roadmap</p>
      </div>

      {/* Phase timeline */}
      <div className="flex gap-2 mb-6">
        {PHASES.map(p => {
          const isActive = p.num === currentPhase;
          const isUnlocked = typedReports.length >= p.num;
          return (
            <div
              key={p.num}
              className={`flex-1 px-4 py-3 border transition-colors ${
                isActive
                  ? 'border-[#00E676] bg-[rgba(0,230,118,0.08)]'
                  : isUnlocked
                  ? 'border-[rgba(255,255,255,0.15)]'
                  : 'border-[rgba(255,255,255,0.05)] opacity-40'
              }`}
            >
              <div className={`text-[10px] font-bold tracking-widest uppercase mb-0.5 ${isActive ? 'text-[#00E676]' : 'text-[#4A4A4A]'}`}>
                Phase {p.num}
              </div>
              <div className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-[#9A9A9A]'}`}>{p.label}</div>
              <div className="text-[9px] text-[#4A4A4A] mt-0.5">Days {p.days}</div>
              {!isUnlocked && <div className="text-[9px] text-[#4A4A4A] mt-1">🔒 Locked</div>}
            </div>
          );
        })}
      </div>

      {/* Current phase progress */}
      {currentDay > 0 && (
        <div className="mb-6 p-4 border border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-white">
              Phase {currentPhase}: {PHASES[currentPhase - 1].label} — Day {phaseDay} of 30
            </div>
            <div className="text-xs text-[#4A4A4A]">{30 - phaseDay} days remaining</div>
          </div>
          <div className="h-1 bg-[rgba(255,255,255,0.05)]">
            <div className="h-full bg-[#00E676] transition-all" style={{ width: `${phaseProgress}%` }} />
          </div>
          {currentPhase < 3 && (
            <div className="text-[10px] text-[#4A4A4A] mt-2">
              At day {currentPhase * 30}: submit your bloodwork to unlock Phase {currentPhase + 1}
            </div>
          )}
        </div>
      )}

      {/* Phase content */}
      {PHASES.map(p => {
        const phaseReport = typedReports[p.num - 1];
        const isCurrentPhase = p.num === currentPhase;
        const isUnlocked = !!phaseReport;

        if (!isCurrentPhase) return null; // Only show the active phase content below header

        if (!isUnlocked) {
          return (
            <LockedPhase
              key={p.num}
              phase={p}
              reason={p.num === 2
                ? 'Complete your 30-day bloodwork panel to unlock the Calibration protocol. This protocol will be personalized based on your actual progress and biomarker improvements.'
                : 'Complete your 60-day bloodwork panel to unlock the Peak protocol. This final phase is fine-tuned specifically to push you to your maximum optimization.'
              }
            />
          );
        }

        const recs: OptimizationPlan = phaseReport.recommendations;

        return (
          <div key={p.num}>
            <div className="mb-5">
              <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">
                Phase {p.num}: {p.label}
              </div>
              <p className="text-xs text-[#9A9A9A]">{p.desc}</p>
            </div>

            {/* Supplements */}
            {recs?.supplements?.length > 0 && (
              <Card accent className="mb-5">
                <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Supplement Stack</div>
                {recs.supplements.map(s => (
                  <div key={s.name} className="py-2.5 border-b border-[rgba(255,255,255,0.05)]">
                    <div className="text-sm font-semibold text-white">
                      {s.name} <span className="text-[#00E676]">{s.dose}</span>
                    </div>
                    <div className="text-xs text-[#4A4A4A] mt-0.5">{s.timing} · {s.reason}</div>
                  </div>
                ))}
              </Card>
            )}

            <Card className="mb-5">
              <RecommendationSection title="Nutrition" items={recs?.eating} />
              <RecommendationSection title="Training" items={recs?.exercise} />
              <RecommendationSection title="Sleep" items={recs?.sleep} />
              <RecommendationSection title="Stress Management" items={recs?.stress} />
              <RecommendationSection title="Habits" items={recs?.habits} />
            </Card>
          </div>
        );
      })}

      {/* Locked future phases preview */}
      {PHASES.filter(p => p.num !== currentPhase).map(p => {
        const isUnlocked = typedReports.length >= p.num;
        if (isUnlocked && p.num < currentPhase) {
          // Past completed phase — show compact summary
          const phaseReport = typedReports[p.num - 1];
          return (
            <div key={p.num} className="mb-4 border border-[rgba(255,255,255,0.07)] px-5 py-4 opacity-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#9A9A9A] tracking-widest uppercase">
                    Phase {p.num}: {p.label} — Completed
                  </div>
                </div>
                <div className="text-xs text-[#4A4A4A]">
                  Score: {phaseReport.health_score}/100
                </div>
              </div>
            </div>
          );
        }
        if (!isUnlocked) {
          return (
            <div key={p.num} className="mb-4 border border-[rgba(255,255,255,0.05)] px-5 py-4 opacity-40">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#4A4A4A] tracking-widest uppercase">
                  Phase {p.num}: {p.label} — Days {p.days}
                </div>
                <div className="text-[10px] text-[#4A4A4A]">🔒 Submit {p.num === 2 ? '30-day' : '60-day'} bloodwork to unlock</div>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
