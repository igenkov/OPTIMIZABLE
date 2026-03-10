import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
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

  const [profileRes, lifestyleRes, medHistRes, symptomsRes, reportRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('lifestyle').select('*').eq('user_id', user.id).single(),
    supabase.from('medical_history').select('*').eq('user_id', user.id).single(),
    supabase.from('symptom_assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('analysis_reports').select('health_score,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
  ]);

  const profile = profileRes.data as unknown as Phase1Data | null;
  if (!profile?.age) redirect('/onboarding/phase1');

  const lifestyle = lifestyleRes.data as unknown as Phase2Data | null;
  const medHistory = medHistRes.data as unknown as Phase3Data | null;
  const symptoms = symptomsRes.data as { symptoms_selected: string[] } | null;
  const hasReport = !!reportRes.data;

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

  const bmi = p1.weight_kg && p1.height_cm
    ? (p1.weight_kg / Math.pow(p1.height_cm / 100, 2)).toFixed(1)
    : null;

  // Build lifestyle flags
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
    flags.push({ severity: 'warn', text: `Hormonal medications: ${medHistory.medication_categories.length} category${medHistory.medication_categories.length > 1 ? 'ies' : 'y'}` });
  }
  if (p1.medical_conditions?.length) {
    flags.push({ severity: 'warn', text: `Diagnosed conditions: ${p1.medical_conditions.join(', ')}` });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[3px] text-[#4A4A4A] uppercase mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Your Health Dashboard</h1>
        <p className="text-xs text-[#4A4A4A]">Based on your onboarding assessment</p>
        {hasReport && (
          <Link href="/results" className="text-xs text-[#00E676] hover:underline mt-1 inline-block">
            View bloodwork analysis →
          </Link>
        )}
      </div>

      {/* Risk Score */}
      {excluded ? (
        <Card className="mb-5 text-center py-8">
          <div className="text-[10px] tracking-[3px] text-[#FFB300] uppercase mb-3">Assessment Paused</div>
          <div className="text-base font-bold text-white mb-2">
            {p3.trt_history === 'current' && p3.steroid_history === 'current'
              ? 'Active TRT + Steroid Use'
              : p3.trt_history === 'current' ? 'Currently on TRT' : 'Active Steroid Use'}
          </div>
          <p className="text-xs text-[#9A9A9A] leading-relaxed max-w-xs mx-auto">
            Hormonal risk score is not applicable while on exogenous androgens. Your monitoring panel is below.
          </p>
        </Card>
      ) : (
        <Card className="mb-5 text-center py-8">
          <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-3">Hormonal Risk Score</div>
          <div className="text-7xl font-black mb-2" style={{ color }}>{riskScore}</div>
          <div className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color }}>{label}</div>
          <div className="text-xs text-[#4A4A4A] mb-5">out of 100</div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden max-w-xs mx-auto mb-5">
            <div className="h-full rounded-full" style={{ width: `${riskScore ?? 0}%`, background: color }} />
          </div>
          <p className="text-xs font-semibold" style={{ color: '#FFB300' }}>{action}</p>
          <p className="text-[10px] text-[#4A4A4A] mt-2 leading-relaxed max-w-xs mx-auto">
            Calculated from self-reported data. Bloodwork is required for objective measurements.
          </p>
        </Card>
      )}

      {/* Contributing Risk Factors */}
      {keyFactors.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] uppercase mb-1" style={{ color }}>
            Contributing Risk Factors
          </div>
          <p className="text-xs text-[#4A4A4A] mb-5">Specific factors from your profile driving your score:</p>
          <div className="flex flex-col gap-4">
            {keyFactors.map((f, i) => (
              <div key={i} className="border-l-2 pl-4" style={{ borderColor: color }}>
                <div className="text-sm font-semibold text-white mb-1">{f.title}</div>
                <div className="text-xs text-[#9A9A9A] leading-relaxed">{f.explanation}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Health Profile Summary */}
      <Card className="mb-5">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Health Profile</div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {([
            { label: 'Age', value: `${p1.age} yrs`, color: undefined },
            { label: 'BMI', value: bmi ?? '—', color: undefined },
            { label: 'Body Fat', value: p1.body_fat_percent ? `~${p1.body_fat_percent}%` : '—', color: undefined },
            { label: 'Sleep', value: lifestyle ? `${lifestyle.avg_sleep_hours}h` : '—', color: lifestyle && lifestyle.avg_sleep_hours < 7 ? '#FFB300' : undefined },
            { label: 'Exercise', value: lifestyle?.exercise_frequency ?? '—', color: undefined },
            { label: 'Stress', value: lifestyle ? `${lifestyle.stress_level}/5` : '—', color: lifestyle && lifestyle.stress_level >= 4 ? '#FF5252' : undefined },
          ] as { label: string; value: string; color?: string }[]).map((stat, i) => (
            <div key={i}>
              <div className="text-[10px] text-[#4A4A4A] uppercase tracking-widest mb-0.5">{stat.label}</div>
              <div className="text-sm font-semibold" style={{ color: stat.color ?? '#E0E0E0' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {flags.length > 0 && (
          <>
            <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              Health Flags
            </div>
            <div className="flex flex-col gap-2">
              {flags.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                    style={{ background: f.severity === 'critical' ? '#FF5252' : '#FFB300' }}
                  />
                  <span className="text-xs text-[#9A9A9A]">{f.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {symptomIds.filter(s => s !== 'none').length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
            <div className="text-[10px] font-bold tracking-[3px] text-[#9A9A9A] uppercase mb-2">
              Reported Symptoms ({symptomIds.filter(s => s !== 'none').length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {symptomIds.filter(s => s !== 'none').map(s => (
                <span key={s} className="px-2 py-0.5 text-[10px] border border-[rgba(255,255,255,0.1)] text-[#9A9A9A]">
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Recommended Bloodwork */}
      {excluded ? (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-2">Monitoring Panel</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Test every 3–6 months while on TRT or active steroid use:</p>
          <div className="flex flex-col gap-1">
            {trtPanel.map(b => (
              <div key={b.id} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.05)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFB300] shrink-0 mt-1.5" />
                <div>
                  <div className="text-sm text-white font-medium">{b.name}</div>
                  <div className="text-xs text-[#4A4A4A] mt-0.5">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2">Recommended Core Panel</div>
            <p className="text-xs text-[#4A4A4A] mb-4">Essential tests for a complete hormonal picture:</p>
            <div className="flex flex-col gap-1">
              {core.map(b => (
                <div key={b.id} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0 mt-1.5" />
                  <div>
                    <div className="text-sm text-white font-medium">{b.name}</div>
                    <div className="text-xs text-[#4A4A4A] mt-0.5">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {extendedTests.length > 0 && (
            <Card className="mb-5">
              <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-2">Additional Tests — Recommended For You</div>
              <p className="text-xs text-[#4A4A4A] mb-4">Based on your specific profile and symptoms:</p>
              <div className="flex flex-col gap-1">
                {extendedTests.map(b => (
                  <div key={b.id} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.05)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFB300] shrink-0 mt-1.5" />
                    <div>
                      <div className="text-sm text-white font-medium">{b.name}</div>
                      <div className="text-xs text-[#4A4A4A] mt-0.5">{b.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pre-draw tips */}
          <Card className="mb-5" accent>
            <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Before Your Blood Draw</div>
            {[
              'Schedule between 7:00–10:00 AM — testosterone peaks in early morning',
              'Fast 10–12 hours beforehand (water is fine)',
              'Avoid heavy exercise for 24 hours prior',
              'No alcohol for 48 hours before the test',
              'Get a normal night of sleep the night before',
            ].map((t, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <span className="text-[#00E676] font-bold shrink-0">{i + 1}.</span>
                <span className="text-xs text-[#9A9A9A] leading-relaxed">{t}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Upgrade CTA */}
      <div className="border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.04)] p-6">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2">
          Next Step: AI Bloodwork Analysis
        </div>
        <p className="text-base font-bold text-white mb-2">Turn Your Lab Results Into a Protocol</p>
        <p className="text-xs text-[#9A9A9A] leading-relaxed mb-5">
          Upload your bloodwork to get a deep AI analysis of every biomarker, a personalized supplement stack,
          and a 90-day optimization protocol built around your specific hormonal profile.
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {[
            'AI analysis of every biomarker against optimal (not just standard) ranges',
            'Personalized supplement stack with exact doses and timing',
            '90-day optimization protocol assigned to your profile',
            'Re-test reminders and progress tracking',
            'Medical referral flags if levels require physician review',
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#00E676] font-bold text-xs shrink-0 mt-0.5">✓</span>
              <span className="text-xs text-[#9A9A9A]">{f}</span>
            </div>
          ))}
        </div>
        <Link
          href="/bloodwork/upload"
          className="block w-full py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors"
        >
          UPLOAD BLOODWORK →
        </Link>
      </div>

    </div>
  );
}
