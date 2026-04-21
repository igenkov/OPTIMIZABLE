import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, UserCircle, Pulse, ClipboardText,
  ChartBar, Flask, TrendUp,
} from '@phosphor-icons/react';

// -- Step definitions ----------------------------------------------------------

const STEPS = [
  {
    id: '01', icon: UserCircle,    label: 'Personal Details',
    sub: 'Age, body composition, medical history',                       pro: false,
  },
  {
    id: '02', icon: Pulse,      label: 'Lifestyle Assessment',
    sub: 'Sleep, stress, bad habits, physical activity',                 pro: false,
  },
  {
    id: '03', icon: ClipboardText, label: 'Symptoms Audit',
    sub: 'Energy, libido, recovery, cognition',                          pro: false,
  },
  {
    id: '04', icon: ChartBar,     label: 'Risk Score',
    sub: 'Hormonal coefficient + bloodwork panel recommendation',        pro: false, full: true,
  },
  {
    id: '05', icon: Flask,  label: 'Lab Analysis',
    sub: 'Deep AI analysis of bloodwork. Actual hormonal health status', pro: true, glow: true,
  },
  {
    id: '06', icon: TrendUp,    label: 'Optimization',
    sub: '90-day optimization protocol',                                 pro: true,
  },
  {
    id: '07', icon: Pulse,      label: 'Progress Tracking',
    sub: 'Daily progress assessment',                                    pro: true,
  },
];

const freeSteps  = STEPS.filter(s => !s.pro && !s.full);
const riskStep   = STEPS.find(s => s.full)!;
const proSteps   = STEPS.filter(s => s.pro);

// -- Desktop Bento Grid --------------------------------------------------------

function StepBento() {
  return (
    <div className="flex flex-col gap-2 w-full">

      {/* Row 1 - 3 free steps */}
      <div className="grid grid-cols-3 gap-2">
        {freeSteps.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="group bg-[#111111] border border-white/[0.055] rounded-2xl p-4 flex flex-col gap-3 hover:border-white/[0.1] transition-colors duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="w-7 h-7 bg-white/[0.035] rounded-lg flex items-center justify-center">
                  <Icon size={13} className="text-[#555]" />
                </div>
                <span className="text-[8px] font-bold tracking-[2px] text-[#2E2E2E] uppercase tabular-nums">{step.id}</span>
              </div>
              <div>
                <div className="text-[10.5px] font-black uppercase tracking-wide text-white leading-tight">{step.label}</div>
                <div className="text-[8.5px] text-[#484848] leading-snug mt-1.5">{step.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 - Risk Score (full width) */}
      {(() => {
        const Icon = riskStep.icon;
        return (
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl px-5 py-4 flex items-center gap-5">
            <div className="w-10 h-10 bg-white/[0.035] rounded-xl flex items-center justify-center shrink-0">
              <Icon size={18} className="text-[#5A5A5A]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-bold tracking-[2px] text-[#2E2E2E] uppercase block mb-0.5">{riskStep.id}</span>
              <div className="text-[13px] font-black uppercase tracking-wide text-white leading-tight">{riskStep.label}</div>
              <div className="text-[9px] text-[#484848] mt-0.5">{riskStep.sub}</div>
            </div>
            <div className="shrink-0 border border-white/[0.06] rounded-lg px-3 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-[2px] text-[#444]">Free</span>
            </div>
          </div>
        );
      })()}

      {/* Row 3 - PRO section */}
      <div className="rounded-2xl border border-[#C8A2C8]/[0.18] bg-[#C8A2C8]/[0.015] p-2">
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#C8A2C8]/[0.08]">
          <span className="text-[8px] font-black tracking-[3px] text-[#C8A2C8]/45 uppercase">Pro Features</span>
          <div className="bg-[#C8A2C8] text-black text-[7px] font-black px-2 py-0.5 rounded tracking-wide uppercase">Unlock</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {proSteps.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`rounded-xl p-3 flex flex-col gap-2.5 transition-colors duration-300 ${
                  step.glow
                    ? 'bg-[#C8A2C8]/[0.07] border border-[#C8A2C8]/30'
                    : 'bg-[#C8A2C8]/[0.02] border border-[#C8A2C8]/[0.1] hover:border-[#C8A2C8]/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-7 h-7 bg-[#C8A2C8]/[0.09] rounded-lg flex items-center justify-center">
                    <Icon size={13} className="text-[#C8A2C8]" />
                  </div>
                  <span className="text-[8px] font-bold tracking-[2px] text-[#C8A2C8]/35 uppercase tabular-nums">{step.id}</span>
                </div>
                <div>
                  <div className="text-[10.5px] font-black uppercase tracking-wide text-white leading-tight">{step.label}</div>
                  <div className="text-[8.5px] text-[#484848] leading-snug mt-1.5">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -- Mobile Step List ----------------------------------------------------------

function MobileStepList() {
  return (
    <div className="mt-10 pt-8 border-t border-white/[0.05]">
      <p className="text-[9px] font-black text-[#3A3A3A] uppercase tracking-[3px] mb-5">How it works</p>
      <div className="flex flex-col">
        {STEPS.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex items-center gap-3.5 py-3 border-b border-white/[0.04] last:border-0"
            >
              <span className="text-[9px] font-bold text-[#2E2E2E] w-5 shrink-0 tabular-nums">{step.id}</span>
              <Icon size={12} className={step.pro ? 'text-[#C8A2C8] shrink-0' : 'text-[#484848] shrink-0'} />
              <span className="text-[11px] font-black uppercase tracking-wide text-white flex-1 leading-tight">{step.label}</span>
              {step.pro && (
                <span className="text-[7px] font-black bg-[#C8A2C8] text-black px-1.5 py-0.5 rounded-sm uppercase tracking-wide shrink-0">
                  Pro
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Page ---------------------------------------------------------------------

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('age').eq('user_id', user.id).single();
    if (profile?.age) redirect('/dashboard');
    else redirect('/onboarding/phase1');
  }

  return (
    <div className="min-h-[100dvh] bg-[#0e0e0e] text-white flex flex-col">

      {/* Dot grid background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Lilac ambient light - top right */}
      <div
        aria-hidden="true"
        className="fixed top-0 right-0 w-[500px] h-[400px] pointer-events-none select-none"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(200,162,200,0.05) 0%, transparent 65%)',
        }}
      />

      {/* NAV */}
      <nav className="relative z-10 border-b border-white/[0.05] px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/logo_trsp.png"
            alt="Optimizable"
            width={30}
            height={30}
            style={{ objectFit: 'contain', flexShrink: 0 }}
          />
          <div className="min-w-0">
            <div
              className="text-white font-bold uppercase truncate"
              style={{
                fontFamily: "var(--font-oswald,'Oswald',sans-serif)",
                fontSize: '14px',
                letterSpacing: '0.15em',
              }}
            >
              OPTIMIZABLE
            </div>
            <div
              className="text-[#4A4A4A] uppercase truncate"
              style={{
                fontFamily: "var(--font-oswald,'Oswald',sans-serif)",
                fontSize: '7px',
                letterSpacing: '0.13em',
              }}
            >
              JUST A MAN. PROPERLY
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-5 shrink-0">
          <Link
            href="/how-it-works"
            className="text-[10px] font-bold text-[#5A5A5A] hover:text-white transition-colors duration-200 tracking-[2px] uppercase whitespace-nowrap"
          >
            How It Works
          </Link>
          <Link
            href="/login"
            className="text-[10px] font-bold text-[#5A5A5A] hover:text-white transition-colors duration-200 tracking-[2px] uppercase whitespace-nowrap"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <main className="relative z-10 flex-1 flex items-center px-4 sm:px-6 lg:px-12 py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-24 w-full max-w-7xl mx-auto items-center">

          {/* LEFT - headline + CTAs */}
          <div className="flex flex-col">

            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-5 bg-[#C8A2C8]/50" />
              <span
                className="text-[9px] font-bold tracking-[3px] uppercase"
                style={{ color: '#C8A2C8' }}
              >
                Biological Baseline Assessment
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-black uppercase mb-5"
              style={{ fontFamily: "var(--font-oswald,'Oswald',sans-serif)", letterSpacing: '0.02em' }}
            >
              <span
                className="block text-[#666] leading-snug mb-1"
                style={{ fontSize: 'clamp(0.9rem, 1.4vw, 1.2rem)' }}
              >
                If you don't wake up hard every morning,<br />
                something is off.
              </span>
              <span
                className="block text-white leading-none"
                style={{ fontSize: 'clamp(2rem, 3vw, 2.8rem)' }}
              >
                Find it and{' '}
                <span style={{ color: '#C8A2C8' }}>optimize it!</span>
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-[12px] leading-relaxed mb-8 max-w-xs" style={{ color: '#4E4E4E' }}>
              From a 3-minute assessment to a full clinical bloodwork analysis and 90-day optimization protocol.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/onboarding/phase1"
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-[#C8A2C8] text-black font-black text-[10px] tracking-[3px] uppercase hover:bg-[#b890b8] active:bg-[#a880a8] transition-colors duration-200"
              >
                Start Free Assessment
                <ArrowRight
                  size={12}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-7 py-4 border border-white/[0.07] text-[#5A5A5A] font-bold text-[10px] tracking-[3px] uppercase hover:border-white/[0.16] hover:text-[#999] transition-all duration-200"
              >
                Sign In
              </Link>
            </div>

            {/* Mobile step list - only on small screens */}
            <div className="lg:hidden">
              <MobileStepList />
            </div>
          </div>

          {/* RIGHT - bento step grid (desktop only) */}
          <div className="hidden lg:block">
            <StepBento />
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.04] px-4 sm:px-6 lg:px-12 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {[
              'Clinical Grade Analysis',
              'Encrypted & Private',
              'AI-Powered Protocol',
              '90-Day Optimization',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#C8A2C8]/45" />
                <span className="text-[9px] text-[#363636] uppercase tracking-[2px]">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[#303030] uppercase tracking-[2px]">Wellness only - Not medical advice</p>
        </div>
      </footer>
    </div>
  );
}
