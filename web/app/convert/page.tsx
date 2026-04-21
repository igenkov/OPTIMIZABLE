'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel,
  getKeyFactors, isExcluded,
} from '@/lib/scoring';
import type { KeyFactor } from '@/lib/scoring';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';
import {
  Pulse, Flask, Pill, TrendUp,
  ArrowRight, Warning, Lock, Envelope,
  ShieldCheck, Check, CaretRight, WarningCircle,
  Lightning, Calendar, ChartBar,
} from '@phosphor-icons/react';

/* ──────────────────────────────────────────────
   TIMELINE STEPS — what the LAB package includes
   ────────────────────────────────────────────── */
const TIMELINE = [
  {
    phase: 'STARTS NOW',
    color: '#4ADE80',
    Icon: Pulse,
    title: 'Daily Wellbeing Tracking',
    desc: 'Track energy, mood, libido, sleep, and mental clarity daily. Establishes your subjective baseline before bloodwork arrives.',
  },
  {
    phase: 'WHEN BLOODWORK UPLOADED',
    color: '#C8A2C8',
    Icon: Flask,
    title: 'Full Hormonal Analysis',
    desc: 'AI-powered interrogation of 40+ biomarkers against optimal ranges. Clinical narrative, health scoring, and metabolic risk flags.',
  },
  {
    phase: 'UNLOCKED WITH ANALYSIS',
    color: '#E8C470',
    Icon: Pill,
    title: '90-Day Personalized Protocol',
    desc: 'Supplement architecture, lifestyle directives, and dietary adjustments calibrated to your specific deficiencies and goals.',
  },
  {
    phase: 'AT 45 DAYS',
    color: '#C8A2C8',
    Icon: ChartBar,
    title: 'Mid-Cycle Calibration',
    desc: 'Inquiry assessment refines your protocol based on real progress. Your plan adapts to what your body is telling you.',
  },
  {
    phase: 'AT 90 DAYS',
    color: '#4ADE80',
    Icon: TrendUp,
    title: 'Progress Comparison',
    desc: 'Optional follow-up bloodwork reveals exact biomarker shifts. See what changed and why.',
  },
];

/* ──────────────────────────────────────────────
   PLANS
   ────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'monthly' as const,
    label: 'Monthly',
    price: '$19',
    period: '/mo',
    tag: null,
  },
  {
    id: '90day' as const,
    label: 'Full Cycle',
    price: '$49',
    period: '/90 days',
    tag: 'Save 14%',
  },
];

const BETA_PERIOD = process.env.NEXT_PUBLIC_BETA_PERIOD === 'true';

export default function ConvertPage() {
  const router = useRouter();
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [keyFactors, setKeyFactors] = useState<KeyFactor[]>([]);
  const [excluded, setExcluded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Signup form state
  const [mode, setMode] = useState<'pitch' | 'signup-premium' | 'signup-free' | 'signup-beta'>('pitch');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | '90day'>('90day');
  const [confirmSent, setConfirmSent] = useState(false);

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
    } catch { /* corrupted localStorage */ }
    const symptomIds: string[] = (sym.symptoms_selected as string[]) || [];

    if (p1.age && p2.avg_sleep_hours !== undefined && p3.steroid_history) {
      if (isExcluded(p3)) {
        setExcluded(true);
      } else {
        setRiskScore(calculateRiskScore(p1, p2, p3, symptomIds));
        setKeyFactors(getKeyFactors(p1, p2, p3, symptomIds));
      }
    }

    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true);
    });

    setLoaded(true);
  }, []);

  /* ── Signup + checkout flow ── */
  async function handleSignup(tier: 'premium' | 'free' | 'beta') {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      const userId = data.session.user.id;

      // Persist onboarding data to DB
      const p1Raw = localStorage.getItem('phase1');
      const p2Raw = localStorage.getItem('phase2');
      const p3Raw = localStorage.getItem('phase3');
      const symRaw = localStorage.getItem('symptoms');
      if (p1Raw) {
        const p1 = JSON.parse(p1Raw);
        const p2 = p2Raw ? JSON.parse(p2Raw) : null;
        const p3 = p3Raw ? JSON.parse(p3Raw) : null;
        const sym = symRaw ? JSON.parse(symRaw) : null;
        await Promise.all([
          p1.age ? supabase.from('profiles').upsert({ user_id: userId, ...p1 }) : null,
          p2?.avg_sleep_hours !== undefined ? supabase.from('lifestyle').upsert({ user_id: userId, ...p2 }) : null,
          p3?.steroid_history ? supabase.from('medical_history').upsert({ user_id: userId, ...p3 }) : null,
          sym?.symptoms_selected ? supabase.from('symptom_assessments').upsert({ user_id: userId, ...sym }) : null,
        ]);
        localStorage.removeItem('phase1');
        localStorage.removeItem('phase2');
        localStorage.removeItem('phase3');
        localStorage.removeItem('symptoms');
      }

      if (tier === 'premium') {
        // Initiate Stripe checkout
        try {
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: selectedPlan }),
          });
          const { url, error: checkoutErr } = await res.json();
          if (checkoutErr) throw new Error(checkoutErr);
          window.location.href = url;
          return;
        } catch (e) {
          // Checkout failed but account was created - redirect to dashboard
          setError(e instanceof Error ? e.message : 'Payment setup failed. You can upgrade later from your dashboard.');
          setLoading(false);
          setTimeout(() => router.push('/dashboard'), 3000);
          return;
        }
      } else if (tier === 'beta') {
        // Beta path — no payment, just set tier
        await fetch('/api/beta-signup', { method: 'POST' });
        router.push('/dashboard');
        router.refresh();
      } else {
        // Free path - go straight to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } else {
      // Email confirmation required
      setConfirmSent(true);
      setLoading(false);
    }
  }

  /* ── Logged-in user beta claim ── */
  async function handleLoggedInBetaSignup() {
    setLoading(true);
    try {
      await fetch('/api/beta-signup', { method: 'POST' });
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Could not claim early access. Please try again.');
      setLoading(false);
    }
  }

  /* ── Logged-in user checkout ── */
  async function handleLoggedInCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const { url, error: checkoutErr } = await res.json();
      if (checkoutErr) throw new Error(checkoutErr);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setLoading(false);
    }
  }

  const level = riskScore !== null ? getRiskLevel(riskScore) : 'low';
  const color = getRiskColor(level);
  const criticalCount = keyFactors.length;

  if (!loaded) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0e0e0e]">
      <Pulse className="text-[#C8A2C8] animate-pulse" size={40} />
    </div>
  );

  /* ── Email confirmation sent ── */
  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-[#C8A2C8]/10 border border-[#C8A2C8]/20 flex items-center justify-center mx-auto mb-8">
            <Envelope className="text-[#C8A2C8]" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Check Your Email</h1>
          <p className="text-sm text-white/40 leading-relaxed mb-8">
            A confirmation link has been sent to <span className="text-white">{email}</span>. Confirm your email to activate your account.
          </p>
          <Button onClick={() => router.push('/login')} fullWidth className="py-5">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  /* ── Signup form (premium, free, or beta) ── */
  if (mode === 'signup-premium' || mode === 'signup-free' || mode === 'signup-beta') {
    const isPremiumSignup = mode === 'signup-premium';
    const isBetaSignup = mode === 'signup-beta';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4 py-12">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="flex flex-col items-center mb-10">
            <Link href="/" className="relative mb-4 block">
              <Image src="/logo_trsp.png" alt="Optimizable" width={48} height={48} style={{ objectFit: 'contain' }} />
            </Link>
            <div className="text-white font-bold uppercase tracking-[0.2em] text-xl"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}>
              OPTIMIZABLE
            </div>
          </div>

          <Card className="p-8 md:p-10">
            <header className="mb-8">
              {isBetaSignup && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#4ADE80]/10 border border-[#4ADE80]/20 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span className="text-[8px] font-black text-[#4ADE80] uppercase tracking-[3px]">Free Early Access</span>
                </div>
              )}
              <h1 className="text-lg font-black tracking-tight text-white uppercase mb-1">
                {isBetaSignup ? 'Join the Beta' : isPremiumSignup ? 'Create Account & Start LAB' : 'Save Results for Free'}
              </h1>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} className="text-[#C8A2C8]" />
                {isBetaSignup ? 'Full Access - No Payment Required' : isPremiumSignup ? 'Account + Payment Setup' : 'Free Profile - Risk Score Saved'}
              </p>
            </header>

            {/* Plan selector for premium path only */}
            {isPremiumSignup && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {PLANS.map(plan => (
                  <button key={plan.id} type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-4 border text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'border-[#C8A2C8]/50 bg-[#C8A2C8]/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}>
                    {plan.tag && (
                      <div className="absolute -top-2 right-3 px-2 py-0.5 bg-[#C8A2C8] text-black text-[7px] font-black uppercase tracking-widest">
                        {plan.tag}
                      </div>
                    )}
                    <div className={`w-3 h-3 border mb-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'bg-[#C8A2C8] border-[#C8A2C8]' : 'border-white/20'
                    }`}>
                      {selectedPlan === plan.id && <Check size={8} className="text-black stroke-[4px]" />}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-[2px] text-white/30 mb-1">{plan.label}</div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-black text-white">{plan.price}</span>
                      <span className="text-[9px] text-white/40 font-bold uppercase">{plan.period}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSignup(isBetaSignup ? 'beta' : isPremiumSignup ? 'premium' : 'free'); }} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none" size={16} />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                  <WarningCircle size={14} /> {error}
                </div>
              )}

              <Button type="submit" loading={loading} fullWidth className="py-5 flex items-center justify-center gap-2">
                {!loading && (
                  isBetaSignup
                    ? <>Claim Early Access <ArrowRight size={16} /></>
                    : isPremiumSignup
                    ? <>Continue to Payment <ArrowRight size={16} /></>
                    : <>Save Results <ArrowRight size={16} /></>
                )}
              </Button>
            </form>

            {isPremiumSignup && (
              <p className="text-[9px] text-white/20 text-center mt-4 uppercase tracking-wide">
                You will be redirected to secure checkout after account creation
              </p>
            )}
            {isBetaSignup && (
              <p className="text-[9px] text-white/20 text-center mt-4 uppercase tracking-wide">
                Full access - no credit card required during beta
              </p>
            )}

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <button type="button" onClick={() => setMode('pitch')}
                className="text-[10px] font-black text-white/30 uppercase tracking-[2px] hover:text-[#C8A2C8] transition-colors">
                Back to Overview
              </button>
            </div>
          </Card>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-[2px] hover:text-white transition-colors">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main conversion pitch screen ── */
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">

        {/* BRANDING */}
        <div className="flex items-center gap-3 mb-12">
          <Link href="/">
            <Image src="/logo_trsp.png" alt="Optimizable" width={36} height={36} style={{ objectFit: 'contain' }} />
          </Link>
          <div className="text-white font-bold uppercase tracking-[0.15em] text-sm"
            style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}>
            OPTIMIZABLE
          </div>
        </div>

        {/* RISK SCORE SUMMARY */}
        <Card className="mb-10 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Pulse size={100} />
          </div>
          <div className="relative z-10">
            <div className="text-[9px] font-black uppercase tracking-[4px] text-white/40 mb-4">Your Assessment Results</div>
            <div className="flex items-center gap-6 mb-4">
              {excluded ? (
                <div className="flex items-center gap-3">
                  <Warning size={28} className="text-yellow-500" />
                  <div>
                    <div className="text-2xl font-black text-yellow-500 uppercase tracking-tight">Monitoring Required</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest">Exogenous Protocol Detected</div>
                  </div>
                </div>
              ) : riskScore !== null ? (
                <>
                  <div className="text-6xl font-black tracking-tighter" style={{ color }}>{riskScore}</div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[3px] text-white/30 mb-1">Hormonal Risk</div>
                    <div className="text-xl font-black uppercase tracking-tight" style={{ color }}>
                      {getRiskLabel(level)}
                    </div>
                    {criticalCount > 0 && (
                      <div className="text-[10px] text-[#E8C470] font-bold mt-1">
                        {criticalCount} critical factor{criticalCount !== 1 ? 's' : ''} identified
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-white/40 text-sm">Complete onboarding to see your risk score</div>
              )}
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed max-w-lg">
              Your assessment is complete. The next step is understanding what these numbers mean for your body - and building a protocol to optimize them.
            </p>
          </div>
        </Card>

        {/* WHAT YOU GET — TIMELINE */}
        <div className="mb-12">
          <div className="text-[9px] font-black uppercase tracking-[4px] text-[#C8A2C8] mb-6">
            The LAB Optimization Sequence
          </div>

          <div className="space-y-1">
            {TIMELINE.map((step, i) => (
              <div key={i} className="relative flex gap-5 p-5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                {/* Timeline connector */}
                {i < TIMELINE.length - 1 && (
                  <div className="absolute left-[29px] top-[56px] bottom-[-4px] w-px bg-white/5" />
                )}

                <div className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: `${step.color}20`, border: `1px solid ${step.color}40` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: step.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[8px] font-black uppercase tracking-[3px] mb-1.5" style={{ color: step.color }}>
                    {step.phase}
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <step.Icon size={14} className="text-white/30 shrink-0" />
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{step.title}</h3>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FEATURE HIGHLIGHTS */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          {[
            { Icon: Lightning, label: 'AI-Powered', detail: '40+ biomarkers analyzed' },
            { Icon: Calendar, label: '90-Day Cycle', detail: 'Adaptive protocol phases' },
            { Icon: ShieldCheck, label: 'Clinical Grade', detail: 'Optimal range targeting' },
          ].map(({ Icon, label, detail }, i) => (
            <div key={i} className="p-4 border border-white/5 bg-white/[0.02] text-center">
              <Icon size={18} className="text-[#C8A2C8]/40 mx-auto mb-2" />
              <div className="text-[9px] font-black text-white uppercase tracking-widest mb-1">{label}</div>
              <div className="text-[9px] text-white/30">{detail}</div>
            </div>
          ))}
        </div>

        {/* CTA SECTION */}
        <Card className="p-8 md:p-10 relative overflow-hidden" style={{ border: '1px solid rgba(200,162,200,0.2)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C8A2C8]/5 rounded-full -mr-24 -mt-24 blur-3xl" />

          <div className="relative z-10">
            <div className="text-center mb-8">
              {BETA_PERIOD && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4ADE80]/10 border border-[#4ADE80]/20 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span className="text-[8px] font-black text-[#4ADE80] uppercase tracking-[3px]">Free Early Access - Beta Open</span>
                </div>
              )}
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                {BETA_PERIOD ? 'Claim Free Beta Access' : 'Start Your Optimization'}
              </h2>
              <p className="text-[11px] text-white/40 uppercase tracking-wide max-w-md mx-auto">
                {BETA_PERIOD
                  ? 'Full LAB access at no cost during beta. Daily tracking starts now - upload bloodwork when ready.'
                  : 'Daily tracking begins immediately. Upload bloodwork at your own pace - your data creates the pull.'}
              </p>
            </div>

            {isLoggedIn ? (
              /* Logged-in user */
              <div className="max-w-sm mx-auto">
                {BETA_PERIOD ? (
                  /* Beta: one-click claim */
                  <>
                    {error && (
                      <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase">
                        <WarningCircle size={14} /> {error}
                      </div>
                    )}
                    <Button onClick={handleLoggedInBetaSignup} loading={loading} fullWidth
                      className="py-5 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(74,222,128,0.1)]">
                      {!loading && <>Claim Early Access <ArrowRight size={16} /></>}
                    </Button>
                    <div className="text-center mt-4">
                      <Link href="/dashboard" className="text-[10px] font-black text-white/30 uppercase tracking-[2px] hover:text-white/50 transition-colors">
                        Already claimed? Go to Dashboard
                      </Link>
                    </div>
                  </>
                ) : (
                  /* Paid: plan selector + checkout */
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {PLANS.map(plan => (
                        <button key={plan.id} type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`relative p-4 border text-left transition-all ${
                            selectedPlan === plan.id
                              ? 'border-[#C8A2C8]/50 bg-[#C8A2C8]/5'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                          }`}>
                          {plan.tag && (
                            <div className="absolute -top-2 right-3 px-2 py-0.5 bg-[#C8A2C8] text-black text-[7px] font-black uppercase tracking-widest">
                              {plan.tag}
                            </div>
                          )}
                          <div className="text-[9px] font-black uppercase tracking-[2px] text-white/30 mb-1">{plan.label}</div>
                          <span className="text-xl font-black text-white">{plan.price}</span>
                          <span className="text-[9px] text-white/40 font-bold uppercase ml-0.5">{plan.period}</span>
                        </button>
                      ))}
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase">
                        <WarningCircle size={14} /> {error}
                      </div>
                    )}
                    <Button onClick={handleLoggedInCheckout} loading={loading} fullWidth
                      className="py-5 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(200,162,200,0.15)]">
                      {!loading && <>Get the LAB Package <ArrowRight size={16} /></>}
                    </Button>
                    <div className="text-center mt-4">
                      <Link href="/dashboard" className="text-[10px] font-black text-white/30 uppercase tracking-[2px] hover:text-white/50 transition-colors">
                        Continue with free account
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Not logged in */
              <div className="max-w-sm mx-auto space-y-4">
                {BETA_PERIOD ? (
                  /* Beta: single CTA */
                  <button type="button" onClick={() => setMode('signup-beta')}
                    className="flex items-center justify-center gap-3 w-full py-5 bg-[#4ADE80] text-black font-black text-xs tracking-[4px] uppercase hover:bg-[#22c55e] transition-all shadow-[0_10px_30px_rgba(74,222,128,0.15)]">
                    Claim Free Early Access <CaretRight size={16} />
                  </button>
                ) : (
                  /* Paid: two CTAs */
                  <>
                    <button type="button" onClick={() => setMode('signup-premium')}
                      className="flex items-center justify-center gap-3 w-full py-5 bg-[#C8A2C8] text-black font-black text-xs tracking-[4px] uppercase hover:bg-[#A882A8] transition-all shadow-[0_10px_30px_rgba(200,162,200,0.15)]">
                      Get the LAB Package <CaretRight size={16} />
                    </button>

                    <button type="button" onClick={() => setMode('signup-free')}
                      className="flex items-center justify-center w-full py-3 border border-white/10 text-white/40 text-[10px] font-black tracking-[2px] uppercase hover:border-white/20 hover:text-white/60 transition-all">
                      Not ready? Save your results for free
                    </button>
                  </>
                )}

                {BETA_PERIOD && (
                  <button type="button" onClick={() => setMode('signup-free')}
                    className="flex items-center justify-center w-full py-2.5 text-white/25 text-[9px] font-black tracking-[2px] uppercase hover:text-white/40 transition-all">
                    Just save my results for free
                  </button>
                )}
              </div>
            )}

            {!isLoggedIn && (
              <div className="text-center mt-6">
                <Link href="/login" className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-[2px] hover:text-white transition-colors">
                  Already have an account? Sign in
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* TRUST FOOTER */}
        <div className="mt-8 p-4 bg-white/[0.02] border border-white/5">
          <div className="flex gap-3 items-start">
            <Lightning size={14} className="text-[#E8C470] shrink-0 mt-0.5" />
            <p className="text-[9px] text-white/30 leading-relaxed uppercase font-bold tracking-tight">
              Your data is encrypted and used exclusively for your personalized optimization protocol. This is a wellness tool, not a medical device. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
