'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel, getRiskAction,
  getKeyFactors, getPersonalizedPanel, getProtectiveFactors, isExcluded,
} from '@/lib/scoring';
import type { KeyFactor, PersonalizedPanel, ProtectiveFactor } from '@/lib/scoring';
import { BIOMARKERS, TRT_PANEL_IDS } from '@/constants/biomarkers';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';
import {
  Pulse, Flask, ClipboardText,
  CaretRight, CaretDown, Warning, Clock,
  Lock, ArrowRight, ShieldCheck
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export default function SummaryPage() {
  const router = useRouter();
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [excluded, setExcluded] = useState(false);
  const [excludedReason, setExcludedReason] = useState<'trt' | 'steroids' | 'both'>('trt');
  const [keyFactors, setKeyFactors] = useState<KeyFactor[]>([]);
  const [protectiveFactors, setProtectiveFactors] = useState<ProtectiveFactor[]>([]);
  const [panel, setPanel] = useState<PersonalizedPanel | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openKeyFactors, setOpenKeyFactors] = useState<Set<number>>(new Set());
  const [openBalancing, setOpenBalancing] = useState<Set<number>>(new Set());

  function toggleSet(set: Set<number>, setFn: (s: Set<number>) => void, i: number) {
    const next = new Set(set);
    next.has(i) ? next.delete(i) : next.add(i);
    setFn(next);
  }

  useEffect(() => {
    const p1Raw = localStorage.getItem('phase1');
    const p2Raw = localStorage.getItem('phase2');
    const p3Raw = localStorage.getItem('phase3');
    const symRaw = localStorage.getItem('symptoms');
    let p1 = {} as Phase1Data;
    let p2 = {} as Phase2Data;
    let p3 = {} as Phase3Data;
    let sym: Record<string, unknown> = {};
    try {
      if (p1Raw) p1 = JSON.parse(p1Raw);
      if (p2Raw) p2 = JSON.parse(p2Raw);
      if (p3Raw) p3 = JSON.parse(p3Raw);
      if (symRaw) sym = JSON.parse(symRaw);
    } catch { /* corrupted localStorage — fall through with empty data */ }
    const symptomIds_: string[] = (sym.symptoms_selected as string[]) || [];

    createClient().auth.getUser().then(async ({ data }) => {
      const loggedIn = !!data.user;
      setIsLoggedIn(loggedIn);
      if (loggedIn && p1Raw && p1.age) {
        try {
          const supabase = createClient();
          const userId = data.user!.id;
          await Promise.all([
            supabase.from('profiles').upsert({ user_id: userId, ...p1 }),
            p2Raw && p2.avg_sleep_hours !== undefined && supabase.from('lifestyle').upsert({ user_id: userId, ...p2 }),
            p3Raw && p3.steroid_history && supabase.from('medical_history').upsert({ user_id: userId, ...p3 }),
            symRaw && sym.symptoms_selected && supabase.from('symptom_assessments').upsert({ user_id: userId, ...sym }),
          ]);
        } catch { /* DB write failed — data persists in localStorage, user can retry on next visit */ }
      }
    });

    if (p1.age && p2.avg_sleep_hours !== undefined && p3.steroid_history) {
      if (isExcluded(p3)) {
        setExcluded(true);
        if (p3.trt_history === 'current' && p3.steroid_history === 'current') setExcludedReason('both');
        else if (p3.steroid_history === 'current') setExcludedReason('steroids');
        else setExcludedReason('trt');
      } else {
        setRiskScore(calculateRiskScore(p1, p2, p3, symptomIds_));
        setKeyFactors(getKeyFactors(p1, p2, p3, symptomIds_));
        setProtectiveFactors(getProtectiveFactors(p1, p2));
        setPanel(getPersonalizedPanel(p1, p2, p3, symptomIds_));
      }
    }
    setLoaded(true);
  }, []);

  const level = riskScore !== null ? getRiskLevel(riskScore) : 'low';
  const color = getRiskColor(level);
  const label = getRiskLabel(level);
  const action = getRiskAction(level);
  const trtPanel = BIOMARKERS.filter(b => TRT_PANEL_IDS.includes(b.id));

  if (!loaded) return (
    <div className="relative mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-[#141414]/60 px-8 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Pulse className="mx-auto mb-5 animate-pulse text-[#C8A2C8]" size={36} aria-hidden />
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Synthesizing Profile...</div>
      </div>
    </div>
  );

  if (riskScore === null && !excluded) return (
    <div className="relative mx-auto max-w-3xl px-4 pb-32 pt-12 text-center lg:px-6">
      <div className="mx-auto mb-8 flex max-w-md flex-col items-center gap-4 rounded-lg border border-[#E8C470]/25 bg-[#E8C470]/[0.06] px-6 py-8 backdrop-blur-sm">
        <Warning size={28} className="text-[#E8C470]" aria-hidden />
        <h2 className="text-lg font-black uppercase tracking-tight text-white">Incomplete Profile Data</h2>
      </div>
      <p className="mx-auto mb-10 max-w-md text-sm leading-relaxed text-white/45">
        Complete all four phases of the onboarding assessment to generate your diagnostic report.
      </p>
      <Button onClick={() => router.push('/onboarding/phase1')} fullWidth className="mx-auto max-w-md rounded-lg py-4 shadow-[0_10px_36px_rgba(200,162,200,0.18)]">
        Start Assessment <ArrowRight size={16} className="ml-2" aria-hidden />
      </Button>
    </div>
  );

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-24 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 65% 42% at 0% 0%, rgba(200,162,200,0.08) 0%, transparent 52%), radial-gradient(ellipse 45% 28% at 100% 8%, rgba(74,222,128,0.05) 0%, transparent 55%)',
        }}
      />

      {/* HEADER */}
      <header className="mb-8 border-b border-white/10 pb-8 lg:mb-10">
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="h-1 flex-1 rounded-sm bg-[#C8A2C8] shadow-[0_0_10px_rgba(200,162,200,0.25)]"
            />
          ))}
        </div>
        <div className="mb-4 inline-flex items-center border border-[#C8A2C8]/25 bg-[#C8A2C8]/10 px-2.5 py-1 text-[10px] font-black tracking-[2px] text-[#C8A2C8] uppercase">
          Onboarding Complete / Final Assessment
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Diagnostic Report</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/45">
          Aggregated results, based on biometric profile, lifestyle habits, clinical history, symptoms audit:
        </p>
      </header>

      {/* ROW 1: Score + Signals */}
      <div className="mb-8 grid grid-cols-1 gap-5 lg:mb-10 lg:grid-cols-12 lg:gap-6">

        {/* Score / Exclusion */}
        <div className="lg:col-span-7">
          {excluded ? (
            <Card className="h-full rounded-lg p-6 lg:p-8" topAccent="rgba(232,196,112,0.55)" style={{ background: 'linear-gradient(165deg, rgba(232,196,112,0.06) 0%, rgba(20,20,20,0) 55%), #141414' }}>
              <div className="mb-6 flex items-center gap-3 text-[#E8C470]">
                <Warning size={24} aria-hidden />
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Monitoring Protocol Required</h2>
              </div>
              <div className="mb-6 rounded-lg border border-white/[0.08] bg-black/30 px-4 py-4 backdrop-blur-sm">
                <div className="mb-1 text-center text-[10px] font-black uppercase tracking-widest text-white/40">Current Status</div>
                <div className="text-center text-xl font-black uppercase tracking-tighter text-white">
                  {excludedReason === 'both' ? 'Exogenous Overload' : excludedReason === 'steroids' ? 'Active AAS Cycle' : 'Exogenous Replacement (TRT)'}
                </div>
              </div>
              <p className="text-center text-sm italic leading-relaxed text-white/55">
                &quot;Natural risk scoring is inapplicable during exogenous administration. Objective monitoring of safety markers is the priority sequence.&quot;
              </p>
            </Card>
          ) : (
            <Card className="relative h-full overflow-hidden rounded-lg p-6 text-center lg:p-10" topAccent={color}>
              <div className="relative z-10">
                <div className="mb-5 text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Hormonal Risk Coefficient</div>
                <div className="mb-4 flex flex-wrap items-end justify-center gap-3 sm:gap-4">
                  <div className="text-6xl font-black tracking-tighter sm:text-7xl md:text-8xl" style={{ color }}>{riskScore}</div>
                  <div className="mb-1 text-left">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Scales</div>
                    <div className="font-mono text-xs text-white/45">0—100</div>
                  </div>
                </div>
                <div className={cn(
                  'mb-6 inline-flex border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]',
                  level === 'critical' ? 'border-[#E88080]/50 bg-[#E88080]/10 text-[#E88080]' :
                  level === 'high' ? 'border-[#E88080]/40 bg-[#E88080]/[0.08] text-[#E88080]' :
                  level === 'moderate' ? 'border-[#E8C470]/45 bg-[#E8C470]/10 text-[#E8C470]' :
                  'border-[#C8A2C8]/45 bg-[#C8A2C8]/10 text-[#C8A2C8]'
                )}>
                  {label} Detected
                </div>
                <div className="mx-auto max-w-md rounded-lg border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
                  <p className="text-left text-[11px] font-bold uppercase leading-relaxed tracking-tight text-white/60">
                    <span className="mr-2 text-[#E8C470] underline decoration-[#E8C470]/35 underline-offset-4">Immediate Action:</span>
                    {action}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Key factors + Balancing factors */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {!excluded && keyFactors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#E8C470]/25 pb-2 text-[#E8C470]">
                <ClipboardText size={14} aria-hidden />
                <h2 className="text-[10px] font-black tracking-[3px] uppercase">Critical Factors</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {keyFactors.map((f, i) => {
                  const open = openKeyFactors.has(i);
                  return (
                    <div key={i} className="overflow-hidden rounded-lg border border-[#E8C470]/20 bg-[#141414]/40 transition-colors hover:border-[#E8C470]/35">
                      <button
                        type="button"
                        onClick={() => toggleSet(openKeyFactors, setOpenKeyFactors, i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C470]/40"
                      >
                        <span className="text-xs font-bold uppercase tracking-tight text-white">{f.title}</span>
                        <CaretDown size={14} className={cn('shrink-0 text-[#E8C470] transition-transform duration-200', open ? '' : '-rotate-90')} aria-hidden />
                      </button>
                      {open && (
                        <p className="border-t border-[#E8C470]/15 px-4 pb-3 pt-2 text-[11px] italic leading-relaxed text-white/65">{f.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!excluded && protectiveFactors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#4ade80]/30 pb-2 text-[#4ade80]">
                <ShieldCheck size={14} aria-hidden />
                <h2 className="text-[10px] font-black tracking-[3px] uppercase">Balancing Factors</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {protectiveFactors.map((f, i) => {
                  const open = openBalancing.has(i);
                  return (
                    <div key={i} className="overflow-hidden rounded-lg border border-[#4ade80]/30 bg-[#141414]/40 transition-colors hover:border-[#4ade80]/45">
                      <button
                        type="button"
                        onClick={() => toggleSet(openBalancing, setOpenBalancing, i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]/35"
                      >
                        <span className="text-xs font-bold uppercase tracking-tight text-white">{f.title}</span>
                        <CaretDown size={14} className={cn('shrink-0 text-[#4ade80] transition-transform duration-200', open ? '' : '-rotate-90')} aria-hidden />
                      </button>
                      {open && (
                        <p className="border-t border-[#4ade80]/20 px-4 pb-3 pt-2 text-[11px] italic leading-relaxed text-white/65">{f.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: BLOODWORK PANELS */}
      <div className="mb-8 lg:mb-10">
        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.07] pb-2 text-[#C8A2C8]">
          <Flask size={14} aria-hidden />
          <h2 className="text-[10px] font-black tracking-[3px] uppercase">Recommended Laboratory Sequence</h2>
        </div>

        {excluded ? (
          <Card className="overflow-hidden rounded-lg p-0" topAccent="rgba(232,196,112,0.45)">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/25 px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E8C470]">Monitoring Panel</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter text-white/35">Safety Biomarkers</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {trtPanel.map(b => (
                <div key={b.id} className="group flex items-start gap-4 p-4 transition-colors hover:bg-white/[0.02]">
                  <div className="mt-1.5 size-1.5 shrink-0 rounded-sm bg-[#E8C470]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[#E8C470]">{b.name}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase leading-relaxed tracking-tighter text-white/35">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : panel && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
              {/* ESSENTIAL */}
              {panel.essential.length > 0 && (
                <Card className="overflow-hidden rounded-lg p-0" topAccent="rgba(200,162,200,0.55)">
                  <div className="flex items-center justify-between border-b border-[#C8A2C8]/15 bg-[#C8A2C8]/[0.06] px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#C8A2C8]">Essential</span>
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-white/35">Required</span>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {panel.essential.map(m => {
                      const bio = BIOMARKERS.find(b => b.id === m.id);
                      if (!bio) return null;
                      return (
                        <div key={m.id} className="group flex items-start gap-3 p-3 transition-colors hover:bg-white/[0.02]">
                          <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#C8A2C8]" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[#C8A2C8]">{bio.name}</div>
                            {m.reasons.length > 0 && (
                              <div className="mt-0.5 truncate text-[9px] font-medium leading-relaxed tracking-tight text-[#C8A2C8]/55">{m.reasons.join(' · ')}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* RECOMMENDED */}
              {panel.recommended.length > 0 && (
                <Card className="overflow-hidden rounded-lg p-0" topAccent="rgba(232,196,112,0.5)">
                  <div className="flex items-center justify-between border-b border-[#E8C470]/15 bg-[#E8C470]/[0.06] px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E8C470]">Recommended</span>
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-white/35">Advised</span>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {panel.recommended.map(m => {
                      const bio = BIOMARKERS.find(b => b.id === m.id);
                      if (!bio) return null;
                      return (
                        <div key={m.id} className="group flex items-start gap-3 p-3 transition-colors hover:bg-white/[0.02]">
                          <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#E8C470]" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[#E8C470]">{bio.name}</div>
                            {m.reasons.length > 0 && (
                              <div className="mt-0.5 truncate text-[9px] font-medium leading-relaxed tracking-tight text-[#E8C470]/55">{m.reasons.join(' · ')}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* EXTENDED */}
              {panel.extended.length > 0 && (
                <Card className="overflow-hidden rounded-lg p-0" topAccent="rgba(255,255,255,0.14)">
                  <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Extended</span>
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-white/35">Additional</span>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {panel.extended.map(m => {
                      const bio = BIOMARKERS.find(b => b.id === m.id);
                      if (!bio) return null;
                      return (
                        <div key={m.id} className="group flex items-start gap-3 p-3 transition-colors hover:bg-white/[0.02]">
                          <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/25" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold uppercase tracking-tight text-white/65 transition-colors group-hover:text-white">{bio.name}</div>
                            {m.reasons.length > 0 && (
                              <div className="mt-0.5 truncate text-[9px] font-medium leading-relaxed tracking-tight text-white/30">{m.reasons.join(' · ')}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* DISCLAIMER */}
            <div className="mt-5 rounded-lg border border-[#E88080]/25 bg-[#E88080]/[0.06] px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] italic leading-relaxed text-[#E8A0A0]/90">
                The endocrine system is a complex dynamic system where all markers work in correlation.
                Essential markers are required for a meaningful result - recommended and extended markers
                significantly improve diagnostic precision.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ROW 3: Pre-draw + CTA */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">

        {/* PRE-DRAW */}
        <Card className="space-y-5 rounded-lg p-6 lg:col-span-7 lg:p-7" topAccent="rgba(200,162,200,0.5)">
          <div className="flex items-center gap-2 text-[#C8A2C8]">
            <Clock size={16} aria-hidden />
            <h2 className="text-[10px] font-black tracking-[3px] uppercase">Pre-Draw Protocol</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Time Window', val: '07:00 – 10:00 AM', detail: 'Hormonal peak window' },
              { label: 'Metabolic State', val: 'Fasted (10-12 HR)', detail: 'Water only' },
              { label: 'Physical State', val: 'Rest Day', detail: 'No heavy lifting 24hr prior' },
              { label: 'Sleep Hygiene', val: 'Normal Duration', detail: 'Aim for 7+ hours prior' },
              { label: 'Sexual Pulse', val: 'Abstain 24HR Prior', detail: 'Preserves baseline LH and testosterone levels' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-3">
                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">{item.label}</div>
                <div className="text-xs font-bold uppercase tracking-tight text-white">{item.val}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-tighter text-[#C8A2C8]/45">{item.detail}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-[#C8A2C8]/25 bg-[#C8A2C8]/[0.06] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:col-span-5 lg:p-8">
          <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-[0.07]" aria-hidden>
            <Lock size={72} />
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <h2 className="mb-2 text-xl font-black uppercase tracking-tighter text-white">
                {isLoggedIn ? 'Unlock the Full Optimization Sequence' : 'What Happens Next'}
              </h2>
              <p className="text-xs font-bold uppercase leading-relaxed tracking-tighter text-white/45">
                Start daily tracking now, upload bloodwork when ready, and get a personalized 90-day protocol built from your data.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/convert"
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#C8A2C8] py-4 text-xs font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-[#A882A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A2C8]/50"
              >
                See What&apos;s Included <CaretRight size={16} aria-hidden />
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="flex w-full items-center justify-center rounded-lg border border-white/[0.12] py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45 transition-colors hover:border-white/22 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center rounded-lg border border-white/[0.12] py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45 transition-colors hover:border-white/22 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Existing Member Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
