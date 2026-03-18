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
import {
  Activity, FlaskConical, ClipboardList,
  ChevronRight, AlertTriangle, Clock,
  Lock, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  if (!loaded) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Activity className="text-[#00E676] animate-pulse" size={40} />
      <div className="text-[10px] font-black uppercase tracking-[4px] text-white/40">Synthesizing Profile...</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-32">

      {/* HEADER */}
      <header className="mb-12">
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-1 flex-1 rounded-full bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.4)]" />
          ))}
        </div>
        <div className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-black tracking-[2px] uppercase text-[#00E676] mb-4">
          Analysis Complete / Final Synthesis
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Diagnostic Report</h1>
        <p className="text-white/40 text-sm">Aggregated results based on biometric profile, lifestyle telemetry, and clinical signal history.</p>
      </header>

      {/* MAIN SCORE OR EXCLUSION */}
      {excluded ? (
        <Card className="mb-6 p-8" style={{ border: '1px solid rgba(234,179,8,0.2)', background: 'rgba(234,179,8,0.02)' }}>
          <div className="flex items-center gap-3 text-yellow-500 mb-6">
            <AlertTriangle size={24} />
            <h2 className="text-lg font-black uppercase tracking-tight">Monitoring Protocol Required</h2>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 mb-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 text-center">Current Status</div>
            <div className="text-xl font-black text-white text-center uppercase tracking-tighter">
              {excludedReason === 'both' ? 'Exogenous Overload' : excludedReason === 'steroids' ? 'Active AAS Cycle' : 'Exogenous Replacement (TRT)'}
            </div>
          </div>
          <p className="text-sm text-white/60 leading-relaxed text-center italic">
            "Natural risk scoring is inapplicable during exogenous administration. Objective monitoring of safety markers is the priority sequence."
          </p>
        </Card>
      ) : (
        <Card className="mb-6 p-10 relative overflow-hidden text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity size={120} />
          </div>

          <div className="relative z-10">
            <div className="text-[10px] tracking-[4px] text-white/40 uppercase mb-6 font-black">Hormonal Risk Coefficient</div>

            <div className="flex items-center justify-center mb-4">
              <div className="text-9xl font-black tracking-tighter" style={{ color }}>{riskScore}</div>
              <div className="text-left ml-4">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Scale</div>
                <div className="text-xs font-mono text-white/40">0—100</div>
              </div>
            </div>

            <div className={cn(
              'inline-block px-4 py-1 text-[10px] font-black uppercase tracking-[3px] mb-8 border',
              level === 'high' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
              level === 'moderate' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
              'border-[#00E676]/50 text-[#00E676] bg-[#00E676]/10'
            )}>
              {label} Risk Detected
            </div>

            <div className="max-w-sm mx-auto p-4 bg-white/5 border border-white/5">
              <p className="text-[11px] font-bold text-white/60 uppercase tracking-tight leading-relaxed">
                <span className="text-[#FFB300] mr-2 underline underline-offset-4 decoration-yellow-500/30">Immediate Action:</span>
                {action}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* KEY FACTORS */}
      {!excluded && keyFactors.length > 0 && (
        <div className="mb-10 space-y-4">
          <div className="flex items-center gap-2 text-white/40 px-1">
            <ClipboardList size={14} />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Telemetry Findings</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {keyFactors.map((f, i) => (
              <div key={i} className="p-4 bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                <div className="text-xs font-bold text-white mb-1 uppercase tracking-tight">{f.title}</div>
                <p className="text-[11px] text-white/40 leading-relaxed italic">{f.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BLOODWORK PANELS */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center gap-2 text-white/40 px-1">
          <FlaskConical size={14} />
          <h2 className="text-[10px] font-black tracking-[3px] uppercase">Recommended Laboratory Sequence</h2>
        </div>

        <Card className="p-0 overflow-hidden" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00E676]">
              {excluded ? 'Monitoring Panel' : 'Core Hormonal Panel'}
            </span>
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Essential Biomarkers</span>
          </div>
          <div className="divide-y divide-white/5">
            {(excluded ? trtPanel : core).map(b => (
              <div key={b.id} className="p-4 flex gap-4 items-start hover:bg-white/[0.02] transition-colors group">
                <div className={cn(
                  'mt-1 w-2 h-2 rounded-full shrink-0',
                  excluded ? 'bg-yellow-500' : 'bg-[#00E676]'
                )} />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white group-hover:text-[#00E676] transition-colors uppercase tracking-tight">{b.name}</div>
                  <div className="text-[10px] text-white/30 font-medium leading-relaxed mt-1 uppercase tracking-tighter">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {!excluded && extendedTests.length > 0 && (
          <Card className="p-0 overflow-hidden" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB300]">Extended Calibration</span>
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Personalized Add-ons</span>
            </div>
            <div className="divide-y divide-white/5">
              {extendedTests.map(b => (
                <div key={b.id} className="p-4 flex gap-4 items-start hover:bg-white/[0.02] transition-colors group">
                  <div className="mt-1 w-2 h-2 rounded-full bg-[#FFB300] shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-[#FFB300] transition-colors uppercase tracking-tight">{b.name}</div>
                    <div className="text-[10px] text-white/30 font-medium leading-relaxed mt-1 uppercase tracking-tighter">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* PRE-DRAW INSTRUCTIONS */}
      <Card className="mb-12 p-6 space-y-4" style={{ border: '1px solid rgba(0,230,118,0.2)', background: 'rgba(0,230,118,0.02)' }}>
        <div className="flex items-center gap-2 text-[#00E676]">
          <Clock size={16} />
          <h2 className="text-[10px] font-black tracking-[3px] uppercase">Pre-Draw Protocol</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Time Window', val: '07:00 – 10:00 AM', detail: 'Hormonal peak window' },
            { label: 'Metabolic State', val: 'Fasted (10-12 HR)', detail: 'Water only' },
            { label: 'Physical State', val: 'Rest Day', detail: 'No heavy lifting 24hr prior' },
            { label: 'Sleep Hygiene', val: 'Normal Duration', detail: 'Aim for 7+ hours prior' },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-black/20 border border-white/5">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{item.label}</div>
              <div className="text-xs font-bold text-white uppercase tracking-tight">{item.val}</div>
              <div className="text-[9px] text-[#00E676]/40 font-bold uppercase tracking-tighter mt-1">{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      {isLoggedIn ? (
        <Button
          onClick={() => router.push('/dashboard')}
          fullWidth
          className="py-5 flex items-center justify-center gap-2"
        >
          Access Command Dashboard <ArrowRight size={16} />
        </Button>
      ) : (
        <div className="relative overflow-hidden p-8 border border-[#00E676]/30" style={{ background: 'rgba(0,230,118,0.05)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
            <Lock size={80} />
          </div>

          <div className="relative z-10">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Save Results to Profile</h2>
            <p className="text-xs text-white/40 mb-8 max-w-sm uppercase font-bold leading-relaxed tracking-tighter">
              Save your risk coefficient, laboratory recommendations, and unlock the 90-day optimization sequence.
            </p>

            <div className="space-y-3">
              <Link href="/signup"
                className="flex items-center justify-center w-full py-4 bg-[#00E676] text-black font-black text-xs tracking-[4px] uppercase hover:bg-[#00c864] transition-all">
                Create Clinical Account <ChevronRight size={16} className="ml-1" />
              </Link>
              <Link href="/login"
                className="flex items-center justify-center w-full py-3 border border-white/10 text-white/40 text-[10px] font-black tracking-[2px] uppercase hover:border-white/20 transition-all">
                Existing Member Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
