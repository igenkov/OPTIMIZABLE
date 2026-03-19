import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, ShieldAlert, Heart, Info,
  ArrowRight, CheckCircle2, Clipboard, User,
  Calendar, Flame, Droplets, Gauge
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel, getRiskAction,
  getKeyFactors, getPersonalizedExtendedTests, isExcluded,
} from '@/lib/scoring';
import { BIOMARKERS, CORE_PANEL_IDS, TRT_PANEL_IDS } from '@/constants/biomarkers';
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

  const level = riskScore !== null ? getRiskLevel(riskScore) : 'low';
  const color = getRiskColor(level);
  const label = getRiskLabel(level);

  const panel = excluded
    ? BIOMARKERS.filter(b => TRT_PANEL_IDS.includes(b.id))
    : BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));

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
          className="col-span-12 lg:col-span-7 p-8 relative overflow-hidden group"
          style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10">
            <ScoreRing score={riskScore ?? 0} size={130} strokeWidth={12} color={color} />

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[4px]" style={{ color }}>{label}</span>
                <span className="px-2 py-0.5 bg-white/5 text-[9px] font-bold text-white/40 uppercase">Hormonal Profile</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight mb-3">Primary Assessment</h2>
              <p className="text-sm text-white/60 leading-relaxed max-w-md mb-6 font-mono italic">
                {excluded
                  ? 'Your assessment is optimized for active TRT/Anabolic monitoring.'
                  : getRiskAction(level)}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link
                  href={hasReport ? '/lab' : '/lab/upload'}
                  className="px-5 py-3 bg-[#C8A2C8] text-black font-black text-[10px] tracking-widest uppercase hover:bg-[#A882A8] transition-all text-center"
                >
                  {hasReport ? 'Open Lab Results' : 'Upload Bloodwork'}
                </Link>
                <Link
                  href="/protocol"
                  className="px-5 py-3 border border-white/10 text-white font-black text-[10px] tracking-widest uppercase hover:bg-white/5 transition-all text-center"
                >
                  Full Sequence
                </Link>
              </div>
            </div>
          </div>
          <ShieldAlert size={180} className="absolute -right-12 -bottom-12 text-white/[0.02] -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
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

      {/* ROW 2: Factors (4) + Panel (4) + Lab Prep (4) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">

        {/* Contributing Factors */}
        <Card className="col-span-12 lg:col-span-4 p-8" topAccent="rgba(232,196,112,0.4)">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert size={16} className="text-[#E8C470]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Critical Factors</span>
          </div>

          <div className="space-y-6">
            {keyFactors.length > 0 ? keyFactors.slice(0, 4).map((f, i) => (
              <div key={i} className="border-l border-white/10 pl-4 group">
                <h4 className="text-[11px] font-black text-white uppercase tracking-tight mb-1 group-hover:text-[#E8C470] transition-colors">{f.title}</h4>
                <p className="text-[11px] text-white/40 leading-relaxed">{f.explanation}</p>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <CheckCircle2 size={32} className="mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">No Critical Risks</span>
              </div>
            )}
          </div>
        </Card>

        {/* Required Labs */}
        <Card className="col-span-12 lg:col-span-4 p-8" accent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-[#C8A2C8]" />
              <span className="text-[10px] font-black text-white uppercase tracking-[3px]">Required Labs</span>
            </div>
            <span className="text-[9px] font-bold text-[#C8A2C8] bg-[#C8A2C8]/10 px-2 py-0.5">Sequence_01</span>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {panel.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.03] group hover:bg-white/[0.01] px-2 transition-all">
                <span className="text-[11px] font-medium text-white/60 group-hover:text-white">{b.name}</span>
                <CheckCircle2 size={12} className="text-white/10 group-hover:text-[#C8A2C8] transition-colors" />
              </div>
            ))}
          </div>

          {!isPremium && (
            <Link href="/upgrade"
              className="mt-4 block w-full py-2.5 border border-[rgba(200,162,200,0.35)] text-[#C8A2C8] font-bold text-[11px] tracking-[2px] uppercase text-center hover:bg-[rgba(200,162,200,0.07)] transition-colors">
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
