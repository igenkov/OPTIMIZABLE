import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel, getRiskAction,
  getKeyFactors, getPersonalizedExtendedTests, isExcluded,
} from '@/lib/scoring';
import { BIOMARKERS, CORE_PANEL_IDS, TRT_PANEL_IDS } from '@/constants/biomarkers';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

// ── Reusable glassmorphism card ──────────────────────────────────────────────
function DashboardCard({
  children, className = '', topAccent,
}: {
  children: React.ReactNode; className?: string; topAccent?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden p-5 ${className}`}
      style={{
        background: 'linear-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(20,20,20,0) 55%), #141414',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTopColor: topAccent ?? 'rgba(255,255,255,0.12)',
      }}
    >
      {children}
    </div>
  );
}

// ── Gauge — circle+rotation pattern (mirrors working ScoreRing) ──────────────
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const size = 200;
  const r = 84;
  const sw = 11;
  const fullCirc = +(2 * Math.PI * r).toFixed(2);
  const gaugeLen = +((260 / 360) * fullCirc).toFixed(2);
  const gapLen   = +(fullCirc - gaugeLen).toFixed(2);
  const scoreLen = +((score / 100) * gaugeLen).toFixed(2);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}
        style={{ transform: 'rotate(140deg)', filter: `drop-shadow(0 0 10px ${color}55)` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${gaugeLen} ${gapLen}`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${scoreLen} ${+(fullCirc - scoreLen).toFixed(2)}`} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingBottom: '18px',
      }}>
        <span style={{ color: 'white', fontSize: '52px', fontWeight: 900, lineHeight: 1 }}>{score}</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '4px', letterSpacing: '2px' }}>
          OUT OF 100
        </span>
      </div>
    </div>
  );
}

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
  const extendedTestIds = excluded ? [] : getPersonalizedExtendedTests(p1, p2, p3, symptomIds);

  const level = riskScore !== null ? getRiskLevel(riskScore) : 'low';
  const color = getRiskColor(level);
  const label = getRiskLabel(level);
  const action = getRiskAction(level);

  const core = BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));
  const extendedTests = BIOMARKERS.filter(b => extendedTestIds.includes(b.id));
  const trtPanel = BIOMARKERS.filter(b => TRT_PANEL_IDS.includes(b.id));
  const panel = excluded ? trtPanel : core;

  const bmi = p1.weight_kg && p1.height_cm
    ? (p1.weight_kg / Math.pow(p1.height_cm / 100, 2)).toFixed(1)
    : null;

  const flags: { severity: 'warn' | 'critical'; text: string }[] = [];
  if (lifestyle) {
    if (lifestyle.avg_sleep_hours < 6) flags.push({ severity: 'critical', text: `Sleep: ${lifestyle.avg_sleep_hours}h/night — severely low` });
    else if (lifestyle.avg_sleep_hours < 7) flags.push({ severity: 'warn', text: `Sleep: ${lifestyle.avg_sleep_hours}h/night — below optimal` });
    if (lifestyle.stress_level >= 4) flags.push({ severity: lifestyle.stress_level >= 5 ? 'critical' : 'warn', text: `Stress: ${lifestyle.stress_level}/5` });
    if (lifestyle.smoking_status === 'daily') flags.push({ severity: 'critical', text: 'Daily smoking' });
    else if (lifestyle.smoking_status === 'occasional') flags.push({ severity: 'warn', text: 'Occasional smoking' });
    if (lifestyle.sedentary_hours >= 12) flags.push({ severity: 'critical', text: `Sedentary: ${lifestyle.sedentary_hours}h/day` });
    else if (lifestyle.sedentary_hours >= 8) flags.push({ severity: 'warn', text: `Sedentary: ${lifestyle.sedentary_hours}h/day` });
    if (lifestyle.morning_erection_frequency === 'never') flags.push({ severity: 'critical', text: 'Morning erections: never' });
    else if (lifestyle.morning_erection_frequency === 'rarely') flags.push({ severity: 'warn', text: 'Morning erections: rarely' });
    if (lifestyle.libido_rating <= 2) flags.push({ severity: 'warn', text: `Libido: ${lifestyle.libido_rating}/5` });
  }
  if (medHistory?.medication_categories?.length) {
    flags.push({ severity: 'warn', text: `Hormonal medications: ${medHistory.medication_categories.length} categor${medHistory.medication_categories.length > 1 ? 'ies' : 'y'}` });
  }
  if (p1.medical_conditions?.length) {
    flags.push({ severity: 'warn', text: `Diagnosed conditions: ${p1.medical_conditions.join(', ')}` });
  }

  const activeSymptoms = symptomIds.filter(s => s !== 'none');
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0e0e0e] px-6 lg:px-8 py-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase">Foundation</span>
            <span className="text-[#2a2a2a]">·</span>
            <span className="text-[11px] tracking-[2px] text-[#3a3a3a] uppercase">Onboarding Assessment</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Your Health Dashboard</h1>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#3a3a3a] tracking-[2px] uppercase">{dateStr}</div>
          {hasReport && (
            <Link href="/results" className="text-[11px] text-[#00E676] hover:underline mt-1 inline-block">
              View bloodwork analysis →
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 1: Hero (8 cols) + Profile (4 cols) ── */}
      <div className="grid grid-cols-12 gap-3 mb-3">

        {/* Hero · Risk Score (8 cols) */}
        <DashboardCard
          className="col-span-12 md:col-span-8"
          topAccent={color + '60'}
        >
          <div className="text-[11px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-5">
            Hormonal Risk Score
          </div>

          {excluded ? (
            <div className="flex items-center gap-6 py-4">
              <div className="text-center">
                <div className="text-[11px] font-bold text-[#FFB300] uppercase tracking-widest mb-2">Assessment Paused</div>
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                  {p3.trt_history === 'current' && p3.steroid_history === 'current'
                    ? 'Active TRT + Steroid Use' : p3.trt_history === 'current'
                    ? 'Currently on TRT' : 'Active Steroid Use'}
                </p>
                <p className="text-[11px] text-[#4A4A4A] mt-2">Monitoring panel is shown below.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              {/* Gauge */}
              <ScoreGauge score={riskScore!} color={color} />

              {/* Score details + CTA — anchored to gauge */}
              <div className="flex-1 min-w-0">
                <div className="text-5xl font-black mb-1" style={{ color }}>{riskScore}</div>
                <div className="text-[11px] font-bold tracking-[3px] uppercase mb-1" style={{ color }}>{label}</div>
                <div className="text-[11px] text-[#4A4A4A] mb-4">Hormonal risk score</div>

                <p className="text-[11px] text-[#FFB300] font-semibold mb-5 leading-relaxed">{action}</p>

                {/* CTA anchored here — reduces time-to-action */}
                {isPremium ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={hasReport ? '/lab' : '/lab/upload'}
                      className="inline-block px-5 py-2.5 bg-[#00E676] text-black font-black text-[11px] tracking-[3px] uppercase hover:bg-[#00c864] transition-colors text-center"
                    >
                      {hasReport ? 'VIEW LAB ANALYSIS →' : 'UPLOAD YOUR BLOODWORK →'}
                    </Link>
                    <div className="flex gap-2">
                      <Link href="/protocol"
                        className="flex-1 py-2 border border-[rgba(255,255,255,0.1)] text-white text-[11px] font-bold tracking-[2px] uppercase text-center hover:border-[rgba(255,255,255,0.25)] transition-all">
                        ▦ PROTOCOL
                      </Link>
                      <Link href="/wellbeing"
                        className="flex-1 py-2 border border-[rgba(255,255,255,0.1)] text-white text-[11px] font-bold tracking-[2px] uppercase text-center hover:border-[rgba(255,255,255,0.25)] transition-all">
                        ◷ WELLBEING
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/upgrade"
                    className="inline-block px-5 py-2.5 border border-[rgba(0,230,118,0.4)] text-[#00E676] font-black text-[11px] tracking-[3px] uppercase hover:bg-[rgba(0,230,118,0.08)] transition-colors"
                  >
                    UNLOCK FULL ANALYSIS →
                  </Link>
                )}
              </div>
            </div>
          )}
        </DashboardCard>

        {/* Physical Profile (4 cols) */}
        <DashboardCard className="col-span-12 md:col-span-4" topAccent="rgba(0,230,118,0.4)">
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">
            Physical Profile
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { label: 'Age', value: `${p1.age}`, unit: ' yrs', warn: false, crit: false },
              { label: 'BMI', value: bmi ?? '—', unit: '', warn: false, crit: false },
              { label: 'Body Fat', value: p1.body_fat_percent ? `~${p1.body_fat_percent}%` : '—', unit: '', warn: false, crit: false },
              { label: 'Sleep', value: lifestyle ? `${lifestyle.avg_sleep_hours}h` : '—', unit: '', warn: !!(lifestyle && lifestyle.avg_sleep_hours < 7 && lifestyle.avg_sleep_hours >= 6), crit: !!(lifestyle && lifestyle.avg_sleep_hours < 6) },
              { label: 'Exercise', value: lifestyle?.exercise_frequency ?? '—', unit: '', warn: false, crit: false },
              { label: 'Stress', value: lifestyle ? `${lifestyle.stress_level}/5` : '—', unit: '', warn: !!(lifestyle && lifestyle.stress_level >= 4), crit: !!(lifestyle && lifestyle.stress_level >= 5) },
            ] as { label: string; value: string; unit: string; warn: boolean; crit: boolean }[]).map((stat, i) => (
              <div key={i} className="border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-2 text-center">
                <div className="text-[11px] text-[#4A4A4A] uppercase tracking-widest mb-1">{stat.label}</div>
                <div className="text-sm font-bold leading-tight"
                  style={{ color: stat.crit ? '#FF5252' : stat.warn ? '#FFB300' : '#D0D0D0' }}>
                  {stat.value}{stat.unit}
                </div>
              </div>
            ))}
          </div>

          {flags.length > 0 && (
            <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 mb-3">
              <div className="text-[11px] font-bold tracking-[2px] text-[#FFB300] uppercase mb-2">Health Flags</div>
              <div className="flex flex-col gap-1.5">
                {flags.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]"
                      style={{ background: f.severity === 'critical' ? '#FF5252' : '#FFB300' }} />
                    <span className="text-[11px] text-[#7A7A7A] leading-snug">{f.text}</span>
                  </div>
                ))}
                {flags.length > 4 && (
                  <div className="text-[11px] text-[#4A4A4A] pl-3.5">+{flags.length - 4} more</div>
                )}
              </div>
            </div>
          )}

          {activeSymptoms.length > 0 && (
            <div className={flags.length > 0 ? 'border-t border-[rgba(255,255,255,0.05)] pt-3' : ''}>
              <div className="text-[11px] font-bold tracking-[2px] text-[#9A9A9A] uppercase mb-2">
                Symptoms ({activeSymptoms.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {activeSymptoms.map(s => (
                  <span key={s} className="px-2 py-0.5 text-[11px] border border-[rgba(255,255,255,0.08)] text-[#7A7A7A] bg-[rgba(255,255,255,0.02)]">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Row 2: 3 equal columns (4 cols each) ── */}
      <div className="grid grid-cols-12 gap-3">

        {/* Contributing Risk Factors */}
        <DashboardCard
          className="col-span-12 md:col-span-4"
          topAccent={excluded ? 'rgba(255,179,0,0.4)' : color + '60'}
        >
          <div className="text-[11px] font-bold tracking-[3px] uppercase mb-4"
            style={{ color: excluded ? '#FFB300' : color }}>
            Contributing {excluded ? 'History' : 'Lifestyle Risks'}
          </div>

          {keyFactors.length === 0 ? (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[rgba(0,230,118,0.1)] border border-[rgba(0,230,118,0.25)] flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#00E676]" />
              </div>
              <span className="text-[11px] text-[#9A9A9A]">No major risk factors identified</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {keyFactors.slice(0, 4).map((f, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: `${color}15`, border: `1px solid ${color}35` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white leading-tight mb-0.5">{f.title}</div>
                    <div className="text-[11px] text-[#7A7A7A] leading-relaxed">{f.explanation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prior history section (if relevant) */}
          {(p3.steroid_history !== 'never' || p3.trt_history !== 'never') && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <div className="text-[11px] font-bold tracking-[2px] text-[#FFB300] uppercase mb-2">Prior History</div>
              {p3.steroid_history !== 'never' && (
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFB300] shrink-0 mt-[5px]" />
                  <span className="text-[11px] text-[#7A7A7A]">
                    {p3.steroid_history === 'current' ? 'Active steroid use' : 'Prior steroid use'}
                  </span>
                </div>
              )}
              {p3.trt_history !== 'never' && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFB300] shrink-0 mt-[5px]" />
                  <span className="text-[11px] text-[#7A7A7A]">
                    {p3.trt_history === 'current' ? 'Currently on TRT' : 'Prior TRT use — HPT axis may be recovering'}
                  </span>
                </div>
              )}
            </div>
          )}
        </DashboardCard>

        {/* Recommended Panel */}
        <DashboardCard className="col-span-12 md:col-span-4" topAccent="rgba(0,230,118,0.4)">
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">
            {excluded ? 'Monitoring Panel' : 'Recommended Core Panel'}
          </div>
          <p className="text-[11px] text-[#4A4A4A] mb-4">
            {excluded ? 'Test every 3–6 months while on exogenous androgens' : 'Essential tests for a complete hormonal picture'}
          </p>

          <div className="grid grid-cols-2 gap-x-4 mb-3">
            <div>
              <div className="text-[11px] text-[#4A4A4A] uppercase tracking-[2px] mb-2 pb-1 border-b border-[rgba(255,255,255,0.05)]">
                Hormones
              </div>
              {panel.filter((_, i) => i < Math.ceil(panel.length / 2)).map(b => (
                <div key={b.id} className="flex items-center gap-2 py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <div className="w-1 h-1 rounded-full bg-[#00E676] shrink-0" />
                  <span className="text-[11px] text-[#D0D0D0]">{b.name}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] text-[#4A4A4A] uppercase tracking-[2px] mb-2 pb-1 border-b border-[rgba(255,255,255,0.05)]">
                Metabolic &amp; Other
              </div>
              {panel.filter((_, i) => i >= Math.ceil(panel.length / 2)).map(b => (
                <div key={b.id} className="flex items-center gap-2 py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <div className="w-1 h-1 rounded-full bg-[#00E676] shrink-0" />
                  <span className="text-[11px] text-[#D0D0D0]">{b.name}</span>
                </div>
              ))}
            </div>
          </div>

          {extendedTests.length > 0 && (
            <div className="pt-3 border-t border-[rgba(255,255,255,0.05)]">
              <div className="text-[11px] text-[#FFB300] uppercase tracking-[2px] mb-2">+ Recommended For You</div>
              <div className="grid grid-cols-2 gap-x-4">
                {extendedTests.map(b => (
                  <div key={b.id} className="flex items-center gap-2 py-1">
                    <div className="w-1 h-1 rounded-full bg-[#FFB300] shrink-0" />
                    <span className="text-[11px] text-[#9A9A9A]">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isPremium && (
            <Link href="/upgrade"
              className="mt-4 block w-full py-2.5 border border-[rgba(0,230,118,0.35)] text-[#00E676] font-bold text-[11px] tracking-[2px] uppercase text-center hover:bg-[rgba(0,230,118,0.07)] transition-colors">
              UNLOCK LAB ACCESS →
            </Link>
          )}
        </DashboardCard>

        {/* Before Blood Draw */}
        <DashboardCard className="col-span-12 md:col-span-4" topAccent="rgba(0,230,118,0.4)">
          <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">
            Before Your Blood Draw
          </div>
          {[
            { title: 'Morning Window (7–10AM)', sub: 'Testosterone peaks in early morning' },
            { title: 'Fasting (10–12h)', sub: 'Water is okay' },
            { title: 'Avoid Heavy Exercise', sub: '24 hours prior' },
            { title: 'No Alcohol', sub: '48 hours before the test' },
            { title: 'Normal Sleep', sub: 'The night before' },
          ].map(({ title, sub }, i) => (
            <div key={i} className="flex gap-3 mb-3 last:mb-0">
              <div className="w-7 h-7 shrink-0 rounded-full bg-[rgba(0,230,118,0.08)] border border-[rgba(0,230,118,0.2)] flex items-center justify-center">
                <span className="text-[11px] font-bold text-[#00E676]">{i + 1}</span>
              </div>
              <div className="pt-0.5">
                <div className="text-sm font-semibold text-white leading-tight">{title}</div>
                <div className="text-[11px] text-[#5A5A5A] mt-0.5">{sub}</div>
              </div>
            </div>
          ))}
        </DashboardCard>
      </div>

    </div>
  );
}
