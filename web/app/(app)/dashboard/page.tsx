import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Pulse, ShieldWarning, ShieldCheck, Heart, Info,
  ArrowRight, CheckCircle, Clipboard, User,
  Calendar, Fire, Drop, Gauge, Flask
} from '@phosphor-icons/react/dist/ssr';
import { ExpandableFactors } from '@/components/ui/ExpandableFactors';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel,
  getKeyFactors, getPersonalizedPanel, getProtectiveFactors, isExcluded,
} from '@/lib/scoring';
import { PanelCompletenessNote } from '@/components/ui/PanelCompletenessNote';
import { BIOMARKERS, TRT_PANEL_IDS } from '@/constants/biomarkers';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, lifestyleRes, medHistRes, symptomsRes, reportRes, userRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('lifestyle').select('*').eq('user_id', user.id).single(),
    supabase.from('medical_history').select('*').eq('user_id', user.id).single(),
    supabase.from('symptom_assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('analysis_reports').select('health_score,created_at,marker_analysis').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('users').select('subscription_tier').eq('id', user.id).single(),
  ]);

  const profile = profileRes.data as unknown as Phase1Data | null;
  if (!profile?.age) redirect('/onboarding/phase1');

  const lifestyle = lifestyleRes.data as unknown as Phase2Data | null;
  const medHistory = medHistRes.data as unknown as Phase3Data | null;
  const symptoms = symptomsRes.data as { symptoms_selected: string[] } | null;
  const hasReport = !!reportRes.data;
  const tier = (userRes.data?.subscription_tier as 'free' | 'premium' | 'expert' | 'beta') ?? 'free';
  const BETA_PERIOD = process.env.NEXT_PUBLIC_BETA_PERIOD === 'true';
  const isPremium = BETA_PERIOD || tier === 'premium' || tier === 'expert' || tier === 'beta';

  const p1 = profile;
  const p2 = lifestyle ?? {} as Phase2Data;
  const p3 = medHistory ?? { steroid_history: 'never', trt_history: 'never' } as Phase3Data;
  const symptomIds: string[] = symptoms?.symptoms_selected ?? [];

  const excluded = isExcluded(p3);
  const riskScore = excluded ? null : calculateRiskScore(p1, p2, p3, symptomIds);
  const keyFactors = excluded ? [] : getKeyFactors(p1, p2, p3, symptomIds);
  const protectiveFactors = excluded ? [] : getProtectiveFactors(p1, p2);

  const level = riskScore !== null ? getRiskLevel(riskScore) : 'low';
  const color = getRiskColor(level);
  const label = getRiskLabel(level);

  const labHealthScore = (reportRes.data?.health_score as number | null) ?? null;
  const labColor = labHealthScore !== null
    ? labHealthScore >= 70 ? '#4ade80' : labHealthScore >= 50 ? '#E8C470' : '#E88080'
    : color;
  const labLabel = labHealthScore !== null
    ? labHealthScore >= 70 ? 'Optimal' : labHealthScore >= 50 ? 'Functional' : 'Suboptimal'
    : '—';

  const personalizedPanel = excluded ? null : getPersonalizedPanel(p1, p2, p3, symptomIds);
  const essentialBio = excluded
    ? BIOMARKERS.filter(b => TRT_PANEL_IDS.includes(b.id))
    : personalizedPanel!.essential.map(m => BIOMARKERS.find(b => b.id === m.id)!).filter(Boolean);
  const recommendedBio = excluded
    ? []
    : personalizedPanel!.recommended.map(m => BIOMARKERS.find(b => b.id === m.id)!).filter(Boolean);
  const extendedBio = excluded
    ? []
    : personalizedPanel!.extended.map(m => BIOMARKERS.find(b => b.id === m.id)!).filter(Boolean);

  const dashRecommendedCount = essentialBio.length + recommendedBio.length;
  const dashSubmittedCount = hasReport ? (Array.isArray(reportRes.data?.marker_analysis) ? (reportRes.data.marker_analysis as unknown[]).length : 0) : 0;

  const bmi = p1.weight_kg && p1.height_cm
    ? (p1.weight_kg / Math.pow(p1.height_cm / 100, 2)).toFixed(1)
    : null;

  return (
    <div className="relative px-4 lg:px-10 py-6 lg:py-8 max-w-[1600px] mx-auto space-y-6 lg:space-y-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 0% 0%, rgba(200,162,200,0.08) 0%, transparent 55%), radial-gradient(ellipse 45% 25% at 100% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)',
        }}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-[#C8A2C8]/20 bg-[#C8A2C8]/10 text-[#C8A2C8]">
            <Pulse weight="duotone" size={16} />
            <span className="text-[11px] font-black uppercase tracking-[3px]">Biological Baseline Assessment</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold text-white uppercase tracking-tighter">Health Dashboard</h1>
          <p className="text-[11px] text-white/45 uppercase tracking-wide">Clinical clarity for your next best action</p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          {hasReport && (
            <Link href="/lab" className="group inline-flex items-center gap-2 px-3 py-1.5 border border-[#C8A2C8]/25 bg-[#C8A2C8]/10 text-[11px] font-black text-[#C8A2C8] uppercase tracking-widest hover:bg-[#C8A2C8]/15 transition-colors">
              View Latest Lab Report <ArrowRight weight="duotone" size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {/* ROW 1: Risk + lab hero (wider) + Biometrics */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Risk Score Hero — overflow visible so long labels are not clipped by Card */}
        <Card
          className="relative col-span-12 min-w-0 lg:col-span-8"
          topAccent={level === 'critical' ? 'rgba(232,128,128,0.5)' : level === 'high' ? 'rgba(255,140,0,0.5)' : level === 'moderate' ? 'rgba(232,196,112,0.5)' : 'rgba(74,222,128,0.5)'}
          style={{
            borderRadius: '18px',
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
            overflow: 'visible',
          }}
        >
          {/* Top CTA — free tier only, above both zones */}
          {!isPremium && (
            <div className="border-b border-white/[0.08] px-6 py-3 flex items-center justify-between gap-4 bg-white/[0.02]">
              <span className="text-[11px] text-white/30 hidden sm:block">Upgrade to reveal your full hormonal health status</span>
              <Link href="/upgrade"
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#C8A2C8] text-black font-black text-[11px] tracking-widest uppercase hover:bg-[#d4b8d4] transition-colors w-full sm:w-auto justify-center rounded-lg shadow-[0_10px_30px_rgba(200,162,200,0.2)]">
                Unlock Lab Analysis <ArrowRight weight="duotone" size={13} />
              </Link>
            </div>
          )}

          {/* Two zones: equal columns, min-w-0, vertical score stacks so narrow card width never clips rings vs labels */}
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2">
            {/* Zone A — Risk Coefficient */}
            <div className="min-w-0 border-b border-white/[0.08] bg-white/[0.01] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:pr-8">
              <div className="mb-4 min-w-0">
                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[4px] text-[#C8A2C8]">Risk Coefficient</div>
                <div className="text-[11px] leading-relaxed text-white/40">
                  Objective score derived from your profile, lifestyle inputs, and reported symptoms. A predictive indicator — not a clinical assessment.
                </div>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
                <div className="shrink-0 [&>div]:mx-auto sm:[&>div]:mx-0">
                  <ScoreRing score={riskScore ?? 0} size={110} strokeWidth={11} color={color} />
                </div>
                <div className="w-full min-w-0 text-center sm:text-left">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[3px] text-white/30">Risk Level</div>
                  <div
                    className="mb-2 break-words text-xl font-black uppercase leading-tight tracking-tight sm:text-2xl"
                    style={{ color }}
                  >
                    {label}
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    {['Profile', 'Lifestyle', 'Symptoms'].map(src => (
                      <span key={src} className="border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/35">{src}</span>
                    ))}
                  </div>
                  {excluded && (
                    <p className="mt-2 text-[10px] italic text-white/30">TRT/Anabolic monitoring mode.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Zone B — Hormonal Health Status */}
            <div className="min-w-0 bg-white/[0.015] p-6 sm:p-8 lg:pl-8">
              <div className="mb-4 min-w-0">
                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[4px] text-[#C8A2C8]">Hormonal Health Status</div>
                <div className="text-[11px] leading-relaxed text-white/40">
                  Actual hormonal status, derived from your bloodwork results in correlation with your full profile.
                </div>
              </div>

              {/* Free tier — blurred teaser using risk score */}
              {!isPremium && (
                <div style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none' }}>
                  <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
                    <div className="shrink-0 [&>div]:mx-auto sm:[&>div]:mx-0">
                      <ScoreRing score={riskScore ?? 0} size={110} strokeWidth={11} color={color} />
                    </div>
                    <div className="w-full min-w-0 text-center sm:text-left">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[3px] text-white/30">Health Status</div>
                      <div className="mb-2 break-words text-xl font-black uppercase leading-tight tracking-tight sm:text-2xl" style={{ color }}>{label}</div>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                        {['Bloodwork', 'Profile', 'Correlation'].map(src => (
                          <span key={src} className="border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/35">{src}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium + has report — real data */}
              {isPremium && hasReport && (
                <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
                  <div className="shrink-0 [&>div]:mx-auto sm:[&>div]:mx-0">
                    <ScoreRing score={labHealthScore ?? 0} size={110} strokeWidth={11} color={labColor} />
                  </div>
                  <div className="w-full min-w-0 text-center sm:text-left">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[3px] text-white/30">Health Status</div>
                    <div
                      className="mb-2 break-words text-xl font-black uppercase leading-tight tracking-tight sm:text-2xl"
                      style={{ color: labColor }}
                    >
                      {labLabel}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      {['Bloodwork', 'Profile', 'Correlation'].map(src => (
                        <span key={src} className="border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/35">{src}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Premium + no report — awaiting state */}
              {isPremium && !hasReport && (
                <div className="flex min-w-0 flex-col items-center gap-4 py-1 sm:flex-row sm:items-start sm:justify-start sm:gap-6">
                  <div className="flex h-[110px] w-[110px] shrink-0 items-center justify-center rounded-full border-[11px] border-white/[0.05]">
                    <Flask weight="duotone" size={30} className="text-white/15" />
                  </div>
                  <div className="min-w-0 max-w-[280px] text-center sm:flex-1 sm:pt-1 sm:text-left">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-widest text-white/30">Awaiting Bloodwork</div>
                    <div className="text-[11px] leading-relaxed text-white/20">
                      Upload your lab results to compute your actual hormonal health status.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom CTA — premium only */}
          {isPremium && (
            <div className="border-t border-white/[0.08] px-6 py-3 bg-white/[0.01]">
              <Link href={hasReport ? '/lab' : '/lab/upload'}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#C8A2C8] text-black font-black text-[11px] tracking-widest uppercase hover:bg-[#d4b8d4] transition-colors shadow-[0_10px_30px_rgba(200,162,200,0.22)]">
                <Flask weight="duotone" size={15} /> {hasReport ? 'LAB' : 'Upload Bloodwork'}
              </Link>
            </div>
          )}
        </Card>

        {/* Biometrics */}
        <Card className="col-span-12 min-w-0 lg:col-span-4 p-8" style={{ background: 'rgba(255,255,255,0.015)', borderRadius: '18px', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2 mb-8">
            <User weight="duotone" size={18} className="text-[#C8A2C8]" />
            <span className="text-[11px] font-black text-white uppercase tracking-[3px]">Biometrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { label: 'Age', val: p1.age, unit: 'yrs', Icon: Calendar },
              { label: 'BMI', val: bmi ?? '—', unit: '', Icon: Pulse },
              { label: 'Body Fat', val: p1.body_fat_percent ? `${p1.body_fat_percent}%` : '—', unit: '', Icon: Fire },
              { label: 'Sleep', val: lifestyle?.avg_sleep_hours ? `${lifestyle.avg_sleep_hours}h` : '—', unit: '', Icon: Gauge },
              { label: 'Libido', val: lifestyle?.libido_rating ? `${lifestyle.libido_rating}/5` : '—', unit: '', Icon: Heart },
              { label: 'Exercise', val: lifestyle?.exercise_frequency ?? '—', unit: '', Icon: Pulse },
            ] as { label: string; val: string | number | null; unit: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[]).map((stat, i) => (
              <div key={i} className="flex flex-col p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                <stat.Icon size={14} className="text-[#C8A2C8]/40 mb-2" />
                <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter mb-1">{stat.label}</span>
                <span className="text-sm font-black text-white tabular-nums">
                  {stat.val ?? '—'}{stat.unit && <span className="text-[10px] text-white/20 font-bold ml-0.5">{stat.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Panel completeness note */}
      {isPremium && hasReport && dashRecommendedCount > 0 && (
        <PanelCompletenessNote
          submittedCount={dashSubmittedCount}
          recommendedCount={dashRecommendedCount}
        />
      )}

      {/* ROW 2: Critical Factors (6) + Balancing Factors (6) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Critical Factors */}
        <Card className="col-span-12 lg:col-span-6 p-8" topAccent="rgba(232,196,112,0.4)" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShieldWarning weight="duotone" size={18} className="text-[#E8C470]" />
              <span className="text-[11px] font-black text-white uppercase tracking-[3px]">Critical Factors</span>
            </div>
            {keyFactors.length > 0 && (
              <span className="text-[10px] font-bold text-[#E8C470]/70 bg-[#E8C470]/12 px-2 py-0.5 rounded">{keyFactors.length} factor{keyFactors.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ExpandableFactors
            factors={keyFactors}
            emptyIcon={<CheckCircle weight="duotone" size={34} />}
            emptyLabel="No Critical Risks"
            accentColor="#E8C470"
            borderColor="rgba(232,196,112,0.3)"
          />
        </Card>

        {/* Balancing Factors */}
        <Card className="col-span-12 lg:col-span-6 p-8" topAccent="rgba(74,222,128,0.3)" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck weight="duotone" size={18} className="text-[#4ade80]" />
              <span className="text-[11px] font-black text-white uppercase tracking-[3px]">Balancing Factors</span>
            </div>
            {!excluded && protectiveFactors.length > 0 && (
              <span className="text-[10px] font-bold text-[#4ade80]/70 bg-[#4ade80]/12 px-2 py-0.5 rounded">{protectiveFactors.length} factor{protectiveFactors.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ExpandableFactors
            factors={excluded ? [] : protectiveFactors}
            emptyIcon={<ShieldCheck weight="duotone" size={34} />}
            emptyLabel="No Protective Factors"
            accentColor="#4ade80"
            borderColor="rgba(74,222,128,0.3)"
          />
        </Card>
      </div>

      {/* ROW 3: Required Labs (8) + Pre-Draw Protocol (4) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Required Labs */}
        <Card className="col-span-12 lg:col-span-8 p-8" accent style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Drop weight="duotone" size={18} className="text-[#C8A2C8]" />
              <span className="text-[11px] font-black text-white uppercase tracking-[3px]">Required Labs</span>
            </div>
            <span className="text-[10px] font-bold text-[#C8A2C8] bg-[#C8A2C8]/12 px-2 py-0.5 rounded">Initial Bloodwork</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {essentialBio.length > 0 && (
              <div>
                <div className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-widest mb-2">Essential</div>
                {essentialBio.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors rounded">
                    <span className="text-[11px] font-medium text-white/80 group-hover:text-white">{b.name}</span>
                    <CheckCircle weight="duotone" size={14} className="text-[#C8A2C8]/30 group-hover:text-[#C8A2C8] transition-colors" />
                  </div>
                ))}
              </div>
            )}
            {recommendedBio.length > 0 && (
              <div>
                <div className="text-[10px] font-black text-[#E8C470] uppercase tracking-widest mb-2">Recommended</div>
                {recommendedBio.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors rounded">
                    <span className="text-[11px] font-medium text-white/60 group-hover:text-white">{b.name}</span>
                    <CheckCircle weight="duotone" size={14} className="text-white/10 group-hover:text-[#E8C470]/60 transition-colors" />
                  </div>
                ))}
              </div>
            )}
            {extendedBio.length > 0 && (
              <div>
                <div className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">Extended</div>
                {extendedBio.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors rounded">
                    <span className="text-[11px] font-medium text-white/30 group-hover:text-white/60">{b.name}</span>
                    <CheckCircle weight="duotone" size={14} className="text-white/5 group-hover:text-white/20 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isPremium && (
            <Link href="/upgrade"
              className="mt-6 block w-full py-2.5 rounded-lg border border-[rgba(200,162,200,0.35)] text-[#C8A2C8] font-bold text-[11px] tracking-[2px] uppercase text-center hover:bg-[rgba(200,162,200,0.07)] transition-colors">
              UNLOCK LAB ACCESS →
            </Link>
          )}
        </Card>

        {/* Pre-Draw Protocol */}
        <Card className="col-span-12 lg:col-span-4 p-8 relative overflow-hidden" style={{ borderRadius: '18px' }}>
          <div className="flex items-center gap-2 mb-6">
            <Info weight="duotone" size={18} className="text-white/40" />
            <span className="text-[11px] font-black text-white uppercase tracking-[3px]">Pre-Draw Protocol</span>
          </div>

          <div className="space-y-4">
            {[
              { t: '7AM–10AM Window', d: 'T-levels peak in early morning.' },
              { t: '12H Fasting', d: 'Water only. Prevents glucose spikes.' },
              { t: 'Rest Recovery', d: 'No heavy lifting 24h prior.' },
              { t: 'Sexual Abstinence', d: 'No ejaculation 24h prior. Preserves baseline LH and testosterone levels.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="text-[11px] font-black text-white/25 tabular-nums w-6">0{i + 1}</div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-white uppercase tracking-tight">{step.t}</div>
                  <div className="text-[11px] text-white/40">{step.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
              <Clipboard weight="duotone" size={22} className="text-[#C8A2C8]" />
              <div>
                <span className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-widest block">Ready to start?</span>
                <span className="text-[11px] text-white/40">Download the lab requisition form in your profile.</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
