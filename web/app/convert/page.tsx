'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0a0a0a]">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,162,200,0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(74,222,128,0.04) 0%, transparent 50%)',
        }}
      />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <Pulse className="text-[#C8A2C8] animate-pulse" size={40} weight="duotone" />
      </div>
      <p className="relative text-[10px] font-bold uppercase tracking-[0.35em] text-white/35">Loading your results</p>
    </div>
  );

  /* ── Email confirmation sent ── */
  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,162,200,0.1) 0%, transparent 55%)',
          }}
        />
        <div className="relative w-full max-w-sm text-center p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C8A2C8]/20 to-[#C8A2C8]/5 border border-[#C8A2C8]/25 flex items-center justify-center mx-auto mb-8 shadow-[0_8px_32px_rgba(200,162,200,0.12)]">
            <Envelope className="text-[#C8A2C8]" size={32} weight="duotone" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Check Your Email</h1>
          <p className="text-sm text-white/50 leading-relaxed mb-8">
            A confirmation link has been sent to <span className="text-white font-medium">{email}</span>. Confirm your email to activate your account.
          </p>
          <Button onClick={() => router.push('/login')} fullWidth className="py-5 shadow-[0_10px_40px_rgba(200,162,200,0.12)]">
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-12 relative overflow-hidden">
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 90% 50% at 20% 0%, rgba(200,162,200,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 80%, rgba(255,255,255,0.03) 0%, transparent 45%)',
          }}
        />
        <div className="w-full max-w-md relative z-10">
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

          <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_32px_80px_-24px_rgba(0,0,0,0.75)] backdrop-blur-md"
            style={{
              background: 'linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(20,20,20,0.4) 45%, #121212 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderTop: `1px solid ${isBetaSignup ? 'rgba(74,222,128,0.45)' : isPremiumSignup ? 'rgba(200,162,200,0.5)' : 'rgba(255,255,255,0.14)'}`,
            }}>
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
                You will be redirected to checkout after account creation
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
          </div>

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Soft mesh + dot grid background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 0% 0%, rgba(200,162,200,0.07) 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 100% 0%, rgba(74,222,128,0.04) 0%, transparent 45%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(232,196,112,0.04) 0%, transparent 55%)',
        }}
      />

      {/* Risk-color ambient glow - top left */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 w-[720px] h-[520px] pointer-events-none select-none"
        style={{ background: `radial-gradient(ellipse at top left, ${color}18 0%, transparent 70%)` }}
      />

      {/* Lilac ambient - top right */}
      <div
        aria-hidden="true"
        className="fixed top-0 right-0 w-[520px] h-[420px] pointer-events-none select-none"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(200,162,200,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-14">

        {/* BRANDING */}
        <div className="flex items-center justify-between gap-4 mb-10 lg:mb-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src="/logo_trsp.png" alt="Optimizable" width={36} height={36} style={{ objectFit: 'contain' }} />
            </Link>
            <div
              className="text-white font-bold uppercase"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", letterSpacing: '0.15em', fontSize: '14px' }}
            >
              OPTIMIZABLE
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
              Assessment complete
            </span>
          </div>
        </div>

        {/* ── ROW 1: Risk Score + Feature pillars ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

          {/* Risk score card — 7 cols */}
          <div className="group lg:col-span-7 relative overflow-hidden rounded-2xl border border-white/[0.1] ring-1 ring-inset ring-white/[0.04] bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-8 lg:p-10 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-sm">
            {/* Background Pulse decoration */}
            <div className="absolute bottom-0 right-0 pointer-events-none select-none transition-opacity group-hover:opacity-[0.06]" style={{ opacity: 0.04 }}>
              <Pulse size={220} weight="duotone" className="text-white" />
            </div>

            <div className="relative z-10">
              <div className="text-[9px] font-black uppercase tracking-[4px] text-white/35 mb-8">Your Assessment Results</div>

              {excluded ? (
                <div className="flex items-center gap-5">
                  <Warning size={48} className="text-yellow-500 shrink-0" />
                  <div>
                    <div className="text-3xl font-black text-yellow-500 uppercase tracking-tight">Monitoring Required</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mt-2">Exogenous Protocol Detected</div>
                  </div>
                </div>
              ) : riskScore !== null ? (
                <>
                  <div className="flex items-end gap-5 mb-5">
                    <div
                      className="font-black leading-none tracking-tighter"
                      style={{ color, fontSize: 'clamp(72px, 9vw, 116px)' }}
                    >
                      {riskScore}
                    </div>
                    <div className="pb-2">
                      <div className="text-[8px] font-black uppercase tracking-[3px] text-white/25 mb-1.5">Hormonal Risk</div>
                      <div className="text-xl font-black uppercase tracking-tight" style={{ color }}>
                        {getRiskLabel(level)}
                      </div>
                    </div>
                  </div>
                  {criticalCount > 0 && (
                    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 mb-5"
                      style={{ background: 'rgba(232,196,112,0.07)', border: '1px solid rgba(232,196,112,0.2)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E8C470] shrink-0" />
                      <span className="text-[10px] text-[#E8C470] font-bold uppercase tracking-wider">
                        {criticalCount} critical factor{criticalCount !== 1 ? 's' : ''} identified
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-white/30 text-sm mb-5">Complete onboarding to see your risk score</div>
              )}

              <p className="text-[12px] text-white/45 leading-relaxed max-w-lg">
                Your assessment is complete. The next step is understanding what these numbers mean for your body - and building a protocol to optimize them.
              </p>
            </div>
          </div>

          {/* Feature pillars — 5 cols */}
          <div className="lg:col-span-5 grid grid-cols-3 lg:grid-cols-1 gap-3">
            {[
              { Icon: Lightning, label: 'AI-Powered', detail: '40+ biomarkers analyzed', accent: '#C8A2C8' },
              { Icon: Calendar, label: '90-Day Cycle', detail: 'Adaptive protocol phases', accent: '#E8C470' },
              { Icon: ShieldCheck, label: 'Clinical Grade', detail: 'Optimal range targeting', accent: '#4ADE80' },
            ].map(({ Icon, label, detail, accent }, i) => (
              <div key={i}
                className="group/pillar flex flex-col lg:flex-row items-center lg:items-center gap-3 lg:gap-4 rounded-2xl px-4 lg:px-5 py-4 lg:py-5 border border-white/[0.08] bg-white/[0.02] text-center lg:text-left shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover/pillar:scale-105"
                  style={{ background: `${accent}14`, border: `1px solid ${accent}35`, boxShadow: `0 0 20px ${accent}12` }}
                >
                  <Icon size={16} weight="duotone" style={{ color: accent }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-white uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="text-[9px] text-white/40 leading-snug">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW 2: Timeline ── */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
            <div className="h-px w-8 bg-gradient-to-r from-[#C8A2C8]/60 to-transparent" />
            <div className="text-[9px] font-black uppercase tracking-[4px] text-[#C8A2C8]">
              The LAB Optimization Sequence
            </div>
            <span className="hidden sm:inline text-[8px] font-bold uppercase tracking-widest text-white/25">- five phases</span>
          </div>

          {/* Desktop: horizontal 5-col */}
          <div className="hidden lg:grid grid-cols-5 gap-3">
            {TIMELINE.map((step, i) => (
              <div key={i}
                className="group/tl relative flex flex-col rounded-2xl p-5 border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[0_4px_32px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-[10px] font-black text-white/50">
                    {i + 1}
                  </span>
                  <div
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: step.color, boxShadow: `0 0 10px ${step.color}88` }}
                  />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="h-1 w-1 shrink-0 rounded-full"
                    style={{ background: step.color }}
                  />
                  <div className="text-[7px] font-black uppercase tracking-[1.2px] leading-tight" style={{ color: step.color }}>
                    {step.phase}
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-2">
                  <step.Icon size={12} weight="duotone" className="shrink-0 mt-0.5 text-white/40 group-hover/tl:text-white/55 transition-colors" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">{step.title}</h3>
                </div>
                <p className="text-[9px] text-white/40 leading-relaxed mt-auto pt-2">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Mobile: vertical */}
          <div className="lg:hidden space-y-2">
            {TIMELINE.map((step, i) => (
              <div key={i} className="relative flex gap-4 rounded-2xl p-5 border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent">
                {i < TIMELINE.length - 1 && (
                  <div className="absolute left-[31px] top-[3.5rem] bottom-[-0.5rem] w-px bg-gradient-to-b from-white/15 to-white/5" />
                )}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-black/40 text-[11px] font-black text-white/45">
                    {i + 1}
                  </span>
                  <div
                    className="h-[18px] w-[18px] rounded-full flex items-center justify-center"
                    style={{ background: `${step.color}20`, border: `1px solid ${step.color}50` }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: step.color }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[8px] font-black uppercase tracking-[3px] mb-1.5" style={{ color: step.color }}>{step.phase}</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <step.Icon size={14} weight="duotone" className="shrink-0 text-white/35" />
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{step.title}</h3>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW 3: CTA ── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-[#C8A2C8]/25 mb-4 shadow-[0_0_0_1px_rgba(200,162,200,0.08),0_32px_100px_-24px_rgba(0,0,0,0.75)]"
          style={{ background: 'linear-gradient(150deg, rgba(200,162,200,0.1) 0%, rgba(15,15,15,0.98) 45%, #0a0a0a 100%)' }}
        >
          {/* Corner glow + subtle noise */}
          <div
            className="absolute top-0 right-0 w-[min(100%,28rem)] h-72 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(200,162,200,0.2) 0%, transparent 65%)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-48 pointer-events-none opacity-50"
            style={{ background: 'radial-gradient(ellipse at bottom left, rgba(74,222,128,0.08) 0%, transparent 70%)' }}
          />

          <div className="relative z-10 px-6 sm:px-8 lg:px-16 py-10 lg:py-14">
            <div className="text-center mb-8 max-w-lg mx-auto">
              {BETA_PERIOD && (
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#4ADE80]/[0.12] border border-[#4ADE80]/30 mb-5 shadow-[0_0_24px_rgba(74,222,128,0.12)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse shadow-[0_0_8px_#4ADE80]" />
                  <span className="text-[8px] font-black text-[#4ADE80] uppercase tracking-[3px]">Free Early Access - Beta Open</span>
                </div>
              )}
              <h2
                className="font-black text-white uppercase tracking-tighter mb-4 drop-shadow-sm"
                style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", fontSize: 'clamp(1.65rem, 3.2vw, 2.35rem)' }}
              >
                {BETA_PERIOD ? 'Claim Free Beta Access' : 'Start Your Optimization'}
              </h2>
              <p className="text-[12px] text-white/50 leading-relaxed sm:uppercase sm:tracking-wide sm:text-[11px] max-w-md mx-auto">
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
                      className="py-5 flex items-center justify-center gap-2 rounded-xl shadow-[0_10px_40px_rgba(74,222,128,0.2)]">
                      {!loading && <>Claim Early Access <ArrowRight size={16} weight="duotone" /></>}
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
                      className="py-5 flex items-center justify-center gap-2 rounded-xl shadow-[0_12px_44px_rgba(200,162,200,0.2)]">
                      {!loading && <>Get the LAB Package <ArrowRight size={16} weight="duotone" /></>}
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
              <div className="max-w-sm mx-auto space-y-3">
                {BETA_PERIOD ? (
                  /* Beta: single CTA */
                  <button type="button" onClick={() => setMode('signup-beta')}
                    className="flex items-center justify-center gap-3 w-full rounded-xl py-5 bg-[#4ADE80] text-black font-black text-xs tracking-[4px] uppercase hover:bg-[#6ee7a0] transition-all duration-200 shadow-[0_12px_40px_rgba(74,222,128,0.28)] active:scale-[0.99]">
                    Claim Free Early Access <CaretRight size={16} weight="duotone" />
                  </button>
                ) : (
                  /* Paid: two CTAs */
                  <>
                    <button type="button" onClick={() => setMode('signup-premium')}
                      className="flex items-center justify-center gap-3 w-full rounded-xl py-5 bg-gradient-to-b from-[#D4B8D4] to-[#B892B8] text-black font-black text-xs tracking-[4px] uppercase hover:from-[#E0C8E0] hover:to-[#C8A2C8] transition-all duration-200 shadow-[0_12px_44px_rgba(200,162,200,0.3)] active:scale-[0.99]">
                      Get the LAB Package <CaretRight size={16} weight="duotone" />
                    </button>

                    <button type="button" onClick={() => setMode('signup-free')}
                      className="flex items-center justify-center w-full rounded-xl py-3.5 border border-white/[0.12] bg-white/[0.03] text-white/50 text-[10px] font-black tracking-[2px] uppercase hover:border-white/20 hover:text-white/70 hover:bg-white/[0.05] transition-all backdrop-blur-sm">
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
        </div>

        {/* TRUST FOOTER */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex gap-3.5 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E8C470]/20 bg-[#E8C470]/[0.08]">
              <Lightning size={16} weight="duotone" className="text-[#E8C470]" />
            </div>
            <p className="text-[9px] text-white/35 leading-relaxed uppercase font-bold tracking-tight">
              Your data is isolated per-account and used exclusively for your personalized optimization protocol. This is a wellness tool, not a medical device. Cancel anytime.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
