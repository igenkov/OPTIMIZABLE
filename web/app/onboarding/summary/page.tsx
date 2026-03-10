'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel, getRiskAction,
  getKeyFactors, getPersonalizedExtendedTests, isExcluded,
} from '@/lib/scoring';
import type { KeyFactor } from '@/lib/scoring';
import { BIOMARKERS, CORE_PANEL_IDS, TRT_PANEL_IDS } from '@/constants/biomarkers';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

export default function SummaryPage() {
  const router = useRouter();
  const [riskScore, setRiskScore] = useState<number | null>(0);
  const [excluded, setExcluded] = useState(false);
  const [excludedReason, setExcludedReason] = useState<'trt' | 'steroids' | 'both'>('trt');
  const [keyFactors, setKeyFactors] = useState<KeyFactor[]>([]);
  const [extendedTestIds, setExtendedTestIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const p1Raw = localStorage.getItem('phase1');
    const p2Raw = localStorage.getItem('phase2');
    const p3Raw = localStorage.getItem('phase3');
    const symRaw = localStorage.getItem('symptoms');
    const p1 = JSON.parse(p1Raw || '{}') as Phase1Data;
    const p2 = JSON.parse(p2Raw || '{}') as Phase2Data;
    const p3 = JSON.parse(p3Raw || '{}') as Phase3Data;
    const sym = JSON.parse(symRaw || '{}');
    const symptomIds: string[] = sym.symptoms_selected || [];

    createClient().auth.getUser().then(async ({ data }) => {
      const loggedIn = !!data.user;
      setIsLoggedIn(loggedIn);
      if (loggedIn && p1Raw && p1.age) {
        const supabase = createClient();
        const userId = data.user!.id;
        const { data: profile } = await supabase.from('profiles').select('age').eq('user_id', userId).single();
        if (!profile?.age) {
          await Promise.all([
            supabase.from('profiles').upsert({ user_id: userId, ...p1 }),
            p2Raw && p2.avg_sleep_hours !== undefined && supabase.from('lifestyle').upsert({ user_id: userId, ...p2 }),
            p3Raw && p3.steroid_history && supabase.from('medical_history').upsert({ user_id: userId, ...p3 }),
            symRaw && sym.symptoms_selected && supabase.from('symptom_assessments').insert({ user_id: userId, ...sym }),
          ]);
        }
      }
    });

    if (p1.age && p2.avg_sleep_hours !== undefined && p3.steroid_history) {
      if (isExcluded(p3)) {
        setExcluded(true);
        if (p3.trt_history === 'current' && p3.steroid_history === 'current') setExcludedReason('both');
        else if (p3.steroid_history === 'current') setExcludedReason('steroids');
        else setExcludedReason('trt');
      } else {
        setRiskScore(calculateRiskScore(p1, p2, p3, symptomIds));
        setKeyFactors(getKeyFactors(p1, p2, p3, symptomIds));
        setExtendedTestIds(getPersonalizedExtendedTests(p1, p2, p3, symptomIds));
      }
    }
    setLoaded(true);
  }, []);

  const level = riskScore !== null ? getRiskLevel(riskScore) : 'low';
  const color = getRiskColor(level);
  const label = getRiskLabel(level);
  const action = getRiskAction(level);
  const core = BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));
  const extendedTests = BIOMARKERS.filter(b => extendedTestIds.includes(b.id));
  const trtPanel = BIOMARKERS.filter(b => TRT_PANEL_IDS.includes(b.id));

  if (!loaded) return <div className="text-[#9A9A9A] text-sm">Analyzing your profile...</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-1 flex-1 bg-[#00E676]" />
          ))}
        </div>
        <div className="text-xs text-[#9A9A9A] tracking-widest uppercase mb-2">Step 5 of 5</div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Your Hormonal Health Assessment</h1>
        <p className="text-sm text-[#9A9A9A]">Based on your profile, lifestyle, medical history, and symptoms.</p>
      </div>

      {/* Excluded state — active TRT or steroid user */}
      {excluded ? (
        <>
          <Card className="mb-5">
            <div className="text-[10px] tracking-[3px] text-[#FFB300] uppercase mb-4">Assessment Paused</div>
            <div className="text-base font-bold text-white mb-3">
              {excludedReason === 'both' ? 'Active TRT + Steroid Use' : excludedReason === 'steroids' ? 'Active Steroid Use' : 'Active TRT Use'}
            </div>
            <p className="text-sm text-[#9A9A9A] leading-relaxed mb-4">
              {excludedReason === 'steroids'
                ? 'You are currently using anabolic steroids. Exogenous androgens fully suppress your natural HPT axis — the hormonal risk score is not meaningful while this is active.'
                : 'You are currently on TRT. Exogenous testosterone replaces your natural production, making a self-reported risk score inapplicable. What matters now is proper monitoring — not a score.'
              }
            </p>
            <p className="text-xs text-[#4A4A4A] leading-relaxed">
              The monitoring panel below contains the markers your prescribing physician or hormone specialist should be tracking on a regular basis. Get these tested and bring the results to your next appointment.
            </p>
          </Card>

          {/* TRT Monitoring Panel */}
          <Card className="mb-5">
            <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-2">Your Monitoring Bloodwork Panel</div>
            <p className="text-xs text-[#4A4A4A] mb-4">
              These markers should be tested every 3–6 months while on TRT or during active steroid use. They track efficacy, safety, and suppression.
            </p>
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

          {/* Actionable next steps */}
          <Card className="mb-6" accent>
            <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Next Steps</div>
            {[
              'Test between 7–10 AM, fasted — TRT users should test at trough (before your next dose/injection)',
              'Target Total T 700–900 ng/dL and Free T in upper-normal range — not just "in range"',
              'Estradiol should stay 20–30 pg/mL — too high causes water retention and mood issues',
              'Hematocrit above 54% is a safety threshold — donate blood or reduce dose',
              'PSA should be tested annually; a sharp rise from baseline warrants prostate evaluation',
              'LH near zero confirms full HPT axis suppression — expected on TRT',
            ].map((t, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <span className="text-[#00E676] font-bold shrink-0">{i + 1}.</span>
                <span className="text-xs text-[#9A9A9A] leading-relaxed">{t}</span>
              </div>
            ))}
          </Card>
        </>
      ) : (
        /* Risk Score */
        <Card className="mb-5 text-center py-10">
          <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-4">Hormonal Risk Score</div>
          <div className="text-8xl font-black mb-3" style={{ color }}>{riskScore}</div>
          <div className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color }}>{label}</div>
          <div className="text-xs text-[#4A4A4A] mb-6">out of 100</div>
          <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${riskScore ?? 0}%`, background: color }} />
          </div>
          <p className="text-xs text-[#FFB300] font-semibold mt-5 mb-1">{action}</p>
          <p className="text-[10px] text-[#4A4A4A] leading-relaxed">
            This score is calculated from your self-reported data. It is not a medical diagnosis — bloodwork is required for objective measurements.
          </p>
        </Card>
      )}

      {/* Key Concern Areas */}
      {keyFactors.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] uppercase mb-1" style={{ color }}>
            Key Risk Factors Identified
          </div>
          <p className="text-xs text-[#4A4A4A] mb-5">
            These specific factors from your profile are contributing to your risk score:
          </p>
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

      {/* Core Panel — only for non-excluded users */}
      {!excluded && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2">Recommended Core Bloodwork Panel</div>
          <p className="text-xs text-[#4A4A4A] mb-4">These tests are essential for a complete hormonal picture:</p>
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
      )}

      {/* Personalized Extended Panel — only for non-excluded users */}
      {!excluded && extendedTests.length > 0 && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-2">Additional Tests — Recommended For You</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Based on your specific profile and symptoms, we also recommend:</p>
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

      {/* Pre-bloodwork tips — only for non-excluded users */}
      {!excluded && (
        <Card className="mb-6" accent>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Before Your Blood Draw</div>
          {[
            'Schedule your draw between 7:00–10:00 AM — testosterone peaks in early morning',
            'Fast for 10–12 hours beforehand (water is fine)',
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
      )}

      {isLoggedIn ? (
        <Button onClick={() => router.push('/dashboard')} fullWidth>
          Go to My Dashboard →
        </Button>
      ) : (
        <div className="border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.04)] p-6">
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2">Save Your Results</div>
          <p className="text-sm text-white font-semibold mb-1">Your assessment isn't saved yet.</p>
          <p className="text-xs text-[#9A9A9A] leading-relaxed mb-5">
            Create a free account to save your risk score, bloodwork panel, and access your 90-day optimization dashboard. Takes 30 seconds.
          </p>
          <Link href="/signup"
            className="block w-full py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors mb-3">
            CREATE FREE ACCOUNT →
          </Link>
          <Link href="/login"
            className="block w-full py-2.5 border border-[rgba(255,255,255,0.1)] text-[#9A9A9A] text-xs font-semibold tracking-widest uppercase text-center hover:border-[rgba(255,255,255,0.25)] transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
