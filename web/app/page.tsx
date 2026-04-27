import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, UserCircle, Barbell, Brain,
  ChartBar, Flask, TrendUp, ClockCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';

// -- Step definitions ----------------------------------------------------------

const STEPS = [
  {
    id: '01', icon: UserCircle,    label: 'Personal Details',
    sub: 'Age, body composition, medical history',                       pro: false,
  },
  {
    id: '02', icon: Barbell,      label: 'Lifestyle Assessment',
    sub: 'Sleep, stress, bad habits, physical activity',                 pro: false,
  },
  {
    id: '03', icon: Brain, label: 'Symptoms Audit',
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
    id: '07', icon: ClockCounterClockwise,      label: 'Progress Tracking',
    sub: 'Daily progress assessment',                                    pro: true,
  },
];

const freeSteps  = STEPS.filter(s => !s.pro && !s.full);
const riskStep   = STEPS.find(s => s.full)!;
const proSteps   = STEPS.filter(s => s.pro);
type Step = (typeof STEPS)[number];

// -- Asymmetric bento: one tile layer, varied spans, no nested containers -------

function StepTile({
  step,
  className = '',
  tone = 'neutral',
  emphasis = 'standard',
  meta,
}: {
  step: Step;
  className?: string;
  tone?: 'neutral' | 'lab';
  emphasis?: 'standard' | 'large';
  meta?: string;
}) {
  const Icon = step.icon;
  const isLab = tone === 'lab';
  const isLarge = emphasis === 'large';

  return (
    <article
      className={`group relative overflow-hidden rounded-[18px] border p-4 sm:p-5 transition-all duration-300 ${className} ${
        isLab
          ? 'border-[#C8A2C8]/25 bg-[#C8A2C8]/[0.045] hover:border-[#C8A2C8]/40'
          : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]'
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
          isLab
            ? 'bg-[radial-gradient(circle_at_20%_0%,rgba(200,162,200,0.18),transparent_45%)]'
            : 'bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.08),transparent_42%)]'
        }`}
      />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <Icon
            weight="duotone"
            size={isLarge ? 34 : 28}
            className={`shrink-0 ${isLab ? 'text-[#C8A2C8]' : 'text-[#A79FA7]'} transition-colors duration-300`}
          />
          {meta && (
            <span
              className={`text-[8px] font-black uppercase tracking-[0.2em] ${
                isLab ? 'text-[#C8A2C8]/70' : 'text-[#8B8B8B]'
              }`}
            >
              {meta}
            </span>
          )}
        </div>
        <div>
          <div
            className={`font-black uppercase tracking-wide text-white leading-tight ${
              isLarge ? 'text-[14px] sm:text-[15px]' : 'text-[11px]'
            }`}
          >
            {step.label}
          </div>
          <p
            className={`mt-1.5 leading-snug text-[#777] ${
              isLarge ? 'text-[9.5px] sm:text-[10px]' : 'text-[8.5px]'
            }`}
          >
            {step.sub}
          </p>
        </div>
      </div>
    </article>
  );
}

function StepBento() {
  return (
    <div className="w-full min-w-0">
      <div className="mb-4 sm:mb-5 flex items-center gap-3 lg:max-w-[92%]">
        <div className="h-px flex-1 bg-gradient-to-r from-[#C8A2C8]/50 to-transparent" />
        <span className="text-[8px] uppercase tracking-[0.18em] text-[#7D667D]">Clinical Flow</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 lg:-ml-8 lg:pr-4 lg:gap-3.5">
        <StepTile
          step={freeSteps[0]}
          className="sm:col-span-3 lg:col-span-3 lg:min-h-[140px]"
        />
        <StepTile
          step={freeSteps[1]}
          className="sm:col-span-3 lg:col-span-3 lg:min-h-[140px] xl:translate-y-4"
        />
        <StepTile
          step={freeSteps[2]}
          className="sm:col-span-4 lg:col-span-4 lg:min-h-[132px]"
        />

        <div className="hidden lg:block lg:col-span-2" aria-hidden="true" />

        <StepTile
          step={riskStep}
          meta="Free"
          emphasis="large"
          className="sm:col-span-6 lg:col-span-5 lg:min-h-[154px]"
        />
      </div>

      <div className="mt-6 sm:mt-7 lg:mt-11 lg:ml-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[8px] font-black tracking-[0.2em] text-[#C8A2C8]/70 uppercase">Lab</span>
          <span className="text-[7px] font-black tracking-[0.16em] text-[#C8A2C8] uppercase">Unlock</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 lg:gap-3.5">
          <StepTile
            step={proSteps[0]}
            tone="lab"
            emphasis="large"
            className="sm:col-span-4 lg:col-span-4 lg:min-h-[164px]"
          />
          <StepTile
            step={proSteps[1]}
            tone="lab"
            className="sm:col-span-2 lg:col-span-2 lg:min-h-[164px] xl:translate-y-5"
          />
          <div className="hidden lg:block lg:col-span-2" aria-hidden="true" />
          <StepTile
            step={proSteps[2]}
            tone="lab"
            className="sm:col-span-4 lg:col-span-4 lg:min-h-[132px]"
          />
        </div>
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
        className="fixed inset-0 pointer-events-none select-none lg:hidden"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none hidden lg:block"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.038) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Lilac ambient light — base + stronger on lg so the right column reads (clinical / not neon) */}
      <div
        aria-hidden="true"
        className="fixed top-0 right-0 w-[min(100vw,520px)] h-[min(100vh,420px)] pointer-events-none select-none lg:hidden"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(200,162,200,0.05) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="hidden lg:block fixed top-0 right-0 w-[min(92vw,900px)] h-[min(75vh,580px)] pointer-events-none select-none"
        style={{
          background: 'radial-gradient(ellipse 85% 70% at 100% 0%, rgba(200,162,200,0.12) 0%, rgba(200,162,200,0.04) 45%, transparent 70%)',
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

      {/* HERO + steps (bento is visible on all sizes; 2-col from lg) */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-8 sm:py-10 lg:py-8">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-24 items-start">

          <section className="flex flex-col min-w-0" aria-label="Overview">
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="h-px w-5 bg-[#C8A2C8]/50 shrink-0" />
              <span
                className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] sm:tracking-[3px] uppercase leading-tight"
                style={{ color: '#C8A2C8' }}
              >
                <span className="sm:hidden">Hormone baseline</span>
                <span className="hidden sm:inline">Biological Baseline Assessment</span>
              </span>
            </div>

            <h1
              className="font-black uppercase leading-[1.1] sm:leading-snug mb-4 sm:mb-5"
              style={{
                fontFamily: "var(--font-oswald,'Oswald',sans-serif)",
                letterSpacing: '0.02em',
                fontSize: 'clamp(1.625rem, 5.5vw + 0.5rem, 2rem)',
              }}
            >
              <span className="block text-white">If you don&apos;t</span>
              <span className="block text-white">wake up hard,</span>
              <span className="block text-white">something is wrong.</span>
              <span className="block mt-1" style={{ color: '#C8A2C8' }}>Find it. Optimize it.</span>
            </h1>

            <p className="text-[13px] sm:text-[12px] leading-relaxed mb-6 sm:mb-8 max-w-md text-[#6A6A6A] sm:text-[#4E4E4E]">
              <span className="md:hidden">Quick check-in, lab insights when you need them, and a clear 90-day plan.</span>
              <span className="hidden md:inline">From a 3-minute assessment to a full clinical bloodwork analysis and 90-day optimization protocol.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <Link
                href="/onboarding/phase1"
                className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 bg-[#C8A2C8] text-black font-black text-[10px] tracking-[3px] uppercase rounded-sm hover:bg-[#b890b8] active:bg-[#a880a8] transition-colors duration-200"
              >
                Start Free Assessment
                <ArrowRight
                  size={12}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center justify-center px-7 py-3.5 sm:py-4 border border-white/[0.1] rounded-sm text-[#5A5A5A] font-bold text-[10px] tracking-[3px] uppercase hover:border-white/[0.16] hover:text-[#999] transition-all duration-200"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-6 sm:mt-7 border border-white/[0.08] bg-white/[0.015] rounded-sm p-3.5 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-[#C8A2C8]/55 to-transparent" />
                <span className="text-[8px] font-black tracking-[0.18em] text-[#C8A2C8]/75 uppercase">Signal Snapshot</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[7px] uppercase tracking-[0.16em] text-[#5D5D5D]">Assessment</p>
                  <p className="text-[15px] font-black text-white leading-none mt-1">3 Min</p>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-[0.16em] text-[#5D5D5D]">Protocol</p>
                  <p className="text-[15px] font-black text-white leading-none mt-1">90 Day</p>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-[0.16em] text-[#5D5D5D]">Tracking</p>
                  <p className="text-[15px] font-black text-white leading-none mt-1">Daily</p>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 w-full lg:pl-0" aria-labelledby="how-it-works-heading">
            <h2
              id="how-it-works-heading"
              className="text-[9px] font-black text-[#3A3A3A] uppercase tracking-[3px] mb-4
                lg:mb-5 lg:tracking-[0.2em] lg:text-[#C8A2C8]/[0.55]"
            >
              How it works
            </h2>
            <StepBento />
          </section>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.04] px-4 sm:px-6 lg:px-12 py-5 sm:py-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-3 gap-y-2.5 sm:gap-x-8 sm:gap-y-2 text-left sm:text-center">
            {[
              'Clinical grade analysis',
              'Encrypted & private',
              'AI protocol',
              '90-day track',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2 sm:justify-center">
                <div className="w-1 h-1 rounded-full bg-[#C8A2C8]/45 shrink-0" />
                <span className="text-[8px] sm:text-[9px] text-[#4A4A4A] sm:text-[#363636] uppercase tracking-[0.12em] sm:tracking-[2px] leading-tight">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[8px] sm:text-[9px] text-[#303030] uppercase tracking-[2px] text-center">Wellness only — not medical advice</p>
        </div>
      </footer>
    </div>
  );
}
