import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, ShieldAlert, ShieldCheck, Heart, Info,
  ArrowRight, CheckCircle2, Clipboard, User,
  Calendar, Flame, Droplets, Gauge, FlaskConical
} from 'lucide-react';
import { ExpandableFactors } from '@/components/ui/ExpandableFactors';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel, getRiskAction,
  getKeyFactors, getPersonalizedPanel, getProtectiveFactors, isExcluded,
} from '@/lib/scoring';
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
    supabase.from('analysis_reports').select('health_score,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('users').select('subscription_tier').eq('id', user.id).single(),
  ]);

  const profile = profileRes.data as unknown as Phase1Data | null;
  if (!profile?.age) redirect('/onboarding/phase1');

  const lifestyle = lifestyleRes.data as unknown as Phase2Data | null;
  const medHistory = medHistRes.data as unknown as Phase3Data | null;
  const symptoms = symptomsRes.data as { symptoms_selected: string[] } | null;
  const hasReport = !!reportRes.data;
  const tier = (userRes.data?.subscription_tier as 'free' | 'premium' | 'expert') ?? 'free';
  const isPremium = tier === 'premium' || tier === 'expert';

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

  const bmi = p1.weight_kg && p1.height_cm
    ? (p1.weight_kg / Math.pow(p1.height_cm / 100, 2)).toFixed(1)
    : null;

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-8 max-w-[1600px] mx-auto space-y-6 lg:space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-[#C8A2C8]">
            <Activity size={14} />
            <span className="text-[10px] font-black uppercase tracking-[3px]">Biological Baseline Assessment</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Health Dashboard</h1>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          {hasReport && (
            <Link href="/lab" className="group flex items-center gap-2 text-[10px] font-black text-[#C8A2C8] uppercase tracking-widest">
              View Latest Lab Report <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {/* ROW 1: Risk Score (7) + Biometrics (5) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Risk Score Hero */}
        <Card
          className="col-span-12 lg:col-span-7 relative overflow-hidden"
          topAccent={level === 'critical' ? 'rgba(232,128,128,0.5)' : level === 'high' ? 'rgba(255,140,0,0.5)' : level === 'moderate' ? 'rgba(232,196,112,0.5)' : 'rgba(74,222,128,0.5)'}
        >
          {/* Top CTA — free tier only, above both zones */}
          {!isPremium && (
            <div className="border-b border-white/[0.06] px-6 py-3 flex items-center justify-between gap-4 bg-white/[0.01]">
              <span className="text-[10px] text-white/30 hidden sm:block">Upgrade to reveal your full hormonal health status</span>
              <Link href="/upgrade"
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#C8A2C8] text-black font-black text-[10px] tracking-widest uppercase hover:bg-[#A882A8] transition-all w-full sm:w-auto justify-center">
                Unlock Lab Analysis <ArrowRight size={11} />
              </Link>
            </div>
          )}

          {/* Two zones */}
          <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">

            {/* Zone A — Risk Coefficient */}
            <div className="flex-1 p-8 flex flex-col gap-5">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[4px] text-[#C8A2C8] mb-1.5">Risk Coefficient</div>
                <div className="text-[10px] text-white/40 leading-relaxed">
                  Objective score derived from your profile, lifestyle inputs, and reported symptoms. A predictive indicator — not a clinical assessment.
                </div>
              </div>
              <div className="flex items-center gap-6">
                <ScoreRing score={riskScore ?? 0} size={110} strokeWidth={11} color={color} />
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[3px] mb-1 text-white/30">Risk Level</div>
                  <div className="text-2xl font-black uppercase tracking-tight mb-2" style={{ color }}>{label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Profile', 'Lifestyle', 'Symptoms'].map(src => (
                      <span key={src} className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-white/30">{src}</span>
                    ))}
                  </div>
                  {excluded && (
                    <p className="text-[9px] text-white/30 italic mt-2">TRT/Anabolic monitoring mode.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Zone B — Hormonal Health Status */}
            <div className="flex-1 p-8 flex flex-col gap-5">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[4px] text-[#C8A2C8] mb-1.5">Hormonal Health Status</div>
                <div className="text-[10px] text-white/40 leading-relaxed">
                  Actual hormonal status, derived from your bloodwork results in correlation with your full profile.
                </div>
              </div>

              {/* Free tier — blurred teaser using risk score */}
              {!isPremium && (
                <div style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none' }}>
                  <div className="flex items-center gap-6">
                    <ScoreRing score={riskScore ?? 0} size={110} strokeWidth={11} color={color} />
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[3px] mb-1 text-white/30">Health Status</div>
                      <div className="text-2xl font-black uppercase tracking-tight mb-2" style={{ color }}>{label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Bloodwork', 'Profile', 'Correlation'].map(src => (
                          <span key={src} className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-white/30">{src}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium + has report — real data */}
              {isPremium && hasReport && (
                <div className="flex items-center gap-6">
                  <ScoreRing score={labHealthScore ?? 0} size={110} strokeWidth={11} color={labColor} />
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[3px] mb-1 text-white/30">Health Status</div>
                    <div className="text-2xl font-black uppercase tracking-tight mb-2" style={{ color: labColor }}>{labLabel}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Bloodwork', 'Profile', 'Correlation'].map(src => (
                        <span key={src} className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-white/30">{src}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Premium + no report — awaiting state */}
              {isPremium && !hasReport && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
                  <div className="w-[110px] h-[110px] rounded-full border-[11px] border-white/[0.05] flex items-center justify-center shrink-0">
                    <FlaskConical size={28} className="text-white/15" />
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] font-black text-white/30 uppercase tracking-widest mb-1">Awaiting Bloodwork</div>
                    <div className="text-[10px] text-white/20 leading-relaxed max-w-[180px]">
                      Upload your lab results to compute your actual hormonal health status.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom CTA — premium only */}
          {isPremium && (
            <div className="border-t border-white/[0.06] px-6 py-3">
              <Link href={hasReport ? '/lab' : '/lab/upload'}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#C8A2C8] text-black font-black text-[10px] tracking-widest uppercase hover:bg-[#A882A8] transition-all">
                <FlaskConical size={13} /> {hasReport ? 'LAB' : 'Upload Bloodwork'}
              </Link>
            </div>
          )}
        </Card>

        {/* Biometrics */}
        <Card className="col-span-12 lg:col-span-5 p-8" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="flex items-center gap-2 mb-8">
            <User size={16} className="text-[#C8A2C8]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Biometrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { label: 'Age', val: p1.age, unit: 'yrs', Icon: Calendar },
              { label: 'BMI', val: bmi ?? '—', unit: '', Icon: Activity },
              { label: 'Body Fat', val: p1.body_fat_percent ? `${p1.body_fat_percent}%` : '—', unit: '', Icon: Flame },
              { label: 'Sleep', val: lifestyle?.avg_sleep_hours ? `${lifestyle.avg_sleep_hours}h` : '—', unit: '', Icon: Gauge },
              { label: 'Libido', val: lifestyle?.libido_rating ? `${lifestyle.libido_rating}/5` : '—', unit: '', Icon: Heart },
              { label: 'Exercise', val: lifestyle?.exercise_frequency ?? '—', unit: '', Icon: Activity },
            ] as { label: string; val: string | number | null; unit: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[]).map((stat, i) => (
              <div key={i} className="flex flex-col p-3 bg-white/[0.02] border border-white/5">
                <stat.Icon size={12} className="text-[#C8A2C8]/40 mb-2" />
                <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter mb-1">{stat.label}</span>
                <span className="text-sm font-black text-white tabular-nums">
                  {stat.val ?? '—'}{stat.unit && <span className="text-[9px] text-white/20 font-bold ml-0.5">{stat.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ROW 2: Critical Factors (6) + Balancing Factors (6) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Critical Factors */}
        <Card className="col-span-12 lg:col-span-6 p-8" topAccent="rgba(232,196,112,0.4)">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#E8C470]" />
              <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Critical Factors</span>
            </div>
            {keyFactors.length > 0 && (
              <span className="text-[9px] font-bold text-[#E8C470]/60 bg-[#E8C470]/8 px-2 py-0.5">{keyFactors.length} factor{keyFactors.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ExpandableFactors
            factors={keyFactors}
            emptyIcon={<CheckCircle2 size={32} />}
            emptyLabel="No Critical Risks"
            accentColor="#E8C470"
            borderColor="rgba(232,196,112,0.3)"
          />
        </Card>

        {/* Balancing Factors */}
        <Card className="col-span-12 lg:col-span-6 p-8" topAccent="rgba(74,222,128,0.3)">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#4ade80]" />
              <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Balancing Factors</span>
            </div>
            {!excluded && protectiveFactors.length > 0 && (
              <span className="text-[9px] font-bold text-[#4ade80]/60 bg-[#4ade80]/8 px-2 py-0.5">{protectiveFactors.length} factor{protectiveFactors.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ExpandableFactors
            factors={excluded ? [] : protectiveFactors}
            emptyIcon={<ShieldCheck size={32} />}
            emptyLabel="No Protective Factors"
            accentColor="#4ade80"
            borderColor="rgba(74,222,128,0.3)"
          />
        </Card>
      </div>

      {/* ROW 3: Required Labs (8) + Pre-Draw Protocol (4) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Required Labs */}
        <Card className="col-span-12 lg:col-span-8 p-8" accent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-[#C8A2C8]" />
              <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Required Labs</span>
            </div>
            <span className="text-[9px] font-bold text-[#C8A2C8] bg-[#C8A2C8]/10 px-2 py-0.5">Sequence_01</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {essentialBio.length > 0 && (
              <div>
                <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-widest mb-2">Essential</div>
                {essentialBio.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] group hover:bg-white/[0.01] px-2 transition-all">
                    <span className="text-[11px] font-medium text-white/80 group-hover:text-white">{b.name}</span>
                    <CheckCircle2 size={12} className="text-[#C8A2C8]/30 group-hover:text-[#C8A2C8] transition-colors" />
                  </div>
                ))}
              </div>
            )}
            {recommendedBio.length > 0 && (
              <div>
                <div className="text-[9px] font-black text-[#E8C470] uppercase tracking-widest mb-2">Recommended</div>
                {recommendedBio.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] group hover:bg-white/[0.01] px-2 transition-all">
                    <span className="text-[11px] font-medium text-white/60 group-hover:text-white">{b.name}</span>
                    <CheckCircle2 size={12} className="text-white/10 group-hover:text-[#E8C470]/60 transition-colors" />
                  </div>
                ))}
              </div>
            )}
            {extendedBio.length > 0 && (
              <div>
                <div className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Extended</div>
                {extendedBio.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] group hover:bg-white/[0.01] px-2 transition-all">
                    <span className="text-[11px] font-medium text-white/30 group-hover:text-white/60">{b.name}</span>
                    <CheckCircle2 size={12} className="text-white/5 group-hover:text-white/20 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isPremium && (
            <Link href="/upgrade"
              className="mt-6 block w-full py-2.5 border border-[rgba(200,162,200,0.35)] text-[#C8A2C8] font-bold text-[11px] tracking-[2px] uppercase text-center hover:bg-[rgba(200,162,200,0.07)] transition-colors">
              UNLOCK LAB ACCESS →
            </Link>
          )}
        </Card>

        {/* Pre-Draw Protocol */}
        <Card className="col-span-12 lg:col-span-4 p-8 relative overflow-hidden">
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
