import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, UserCircle, Pulse, ClipboardText,
  ChartBar, Flask, TrendUp,
} from '@phosphor-icons/react/dist/ssr';

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

// -- Step cards: same bento for all viewports; responsive grid (mobile-first) --

function StepBento() {
  return (
    <div
      className="relative overflow-hidden flex flex-col gap-3 w-full min-w-0
        lg:gap-5 lg:rounded-[28px] lg:border lg:border-white/[0.12]
        lg:bg-[linear-gradient(165deg,rgba(255,255,255,0.06)_0%,rgba(200,162,200,0.04)_18%,rgba(12,12,12,0.98)_42%,#0a0a0a_100%)]
        lg:p-6 lg:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.07)]"
    >
      <div
        className="hidden lg:block pointer-events-none absolute inset-0 z-0 rounded-[28px] opacity-50"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 18% 12%, rgba(200, 162, 200, 0.16) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 88% 88%, rgba(200, 162, 200, 0.1) 0%, transparent 50%)',
        }}
        aria-hidden
      />
      <div className="relative z-[1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-3.5">
        {freeSteps.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="group relative overflow-hidden bg-[#111111] border border-white/[0.055] rounded-2xl p-4 flex flex-col gap-3
                hover:border-white/[0.1] transition-all duration-300
                lg:border-white/15 lg:bg-[#131313] lg:shadow-[0_12px_40px_rgba(0,0,0,0.55)] lg:ring-1 lg:ring-inset lg:ring-white/[0.06] lg:hover:border-white/25 lg:hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-9 h-9 sm:w-7 sm:h-7 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center
                    bg-white/[0.035] ring-1 ring-inset ring-white/[0.04] lg:rounded-xl lg:bg-white/[0.09] lg:ring-white/12"
                >
                  <Icon
                    weight="duotone"
                    size={16}
                    className="text-[#6a6a6a] sm:w-[13px] sm:h-[13px] lg:w-[18px] lg:h-[18px] lg:text-[#9A959C]"
                  />
                </div>
                <span className="text-[8px] font-bold tracking-[2px] text-[#2E2E2E] lg:text-[#5A5A5A] uppercase tabular-nums">
                  {step.id}
                </span>
              </div>
              <div>
                <div className="text-[10.5px] font-black uppercase tracking-wide text-white leading-tight">{step.label}</div>
                <p className="text-[8.5px] text-[#5A5A5A] sm:text-[#484848] leading-snug mt-1.5 line-clamp-3 sm:line-clamp-none lg:text-[#6B6B6B]">
                  {step.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const Icon = riskStep.icon;
        return (
          <div
            className="relative z-[1] bg-[#111111] border border-white/[0.07] rounded-2xl px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5
              lg:rounded-2xl lg:border-white/16 lg:bg-[#141414] lg:px-6 lg:py-5 lg:shadow-[0_14px_44px_rgba(0,0,0,0.5)] lg:ring-1 lg:ring-inset lg:ring-white/[0.05]"
          >
            <div className="flex flex-1 min-w-0 items-start gap-4 sm:gap-5">
              <div
                className="w-10 h-10 lg:w-12 lg:h-12 bg-white/[0.035] rounded-xl flex items-center justify-center shrink-0
                  ring-1 ring-inset ring-white/[0.05] lg:bg-white/[0.1] lg:ring-white/12"
              >
                <Icon weight="duotone" size={18} className="text-[#5A5A5A] lg:w-[22px] lg:h-[22px] lg:text-[#A8A3AA]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-bold tracking-[2px] text-[#2E2E2E] lg:text-[#5A5A5A] uppercase block mb-0.5">{riskStep.id}</span>
                <div className="text-[13px] font-black uppercase tracking-wide text-white leading-tight">{riskStep.label}</div>
                <p className="text-[9px] text-[#5A5A5A] sm:text-[#484848] mt-0.5 line-clamp-2 sm:line-clamp-none lg:text-[#6B6B6B]">
                  {riskStep.sub}
                </p>
              </div>
            </div>
            <div className="shrink-0 border border-white/[0.12] rounded-lg px-3 py-1.5 self-start sm:self-center lg:bg-white/[0.04]">
              <span className="text-[8px] font-black uppercase tracking-[2px] text-[#6B6B6B] lg:text-[#888]">Free</span>
            </div>
          </div>
        );
      })()}

      <div
        className="relative z-[1] rounded-2xl border border-[#C8A2C8]/[0.18] bg-[#C8A2C8]/[0.015] p-2
          lg:rounded-2xl lg:border-[#C8A2C8]/35 lg:bg-[linear-gradient(180deg,rgba(200,162,200,0.1)_0%,rgba(200,162,200,0.04)_32%,rgba(10,10,10,0.4)_100%)] lg:p-3 lg:shadow-[0_0_48px_-12px_rgba(200,162,200,0.2)]"
      >
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#C8A2C8]/[0.08] lg:border-[#C8A2C8]/[0.15]">
          <span className="text-[8px] font-black tracking-[3px] text-[#C8A2C8]/60 lg:text-[#C8A2C8]/80 uppercase">Pro Features</span>
          <div className="bg-[#C8A2C8] text-black text-[7px] font-black px-2 py-0.5 rounded tracking-wide uppercase shadow-sm shadow-[#C8A2C8]/30">
            Unlock
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-2.5">
          {proSteps.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`relative rounded-xl p-3 flex flex-col gap-2.5 transition-all duration-300 lg:rounded-[14px] lg:p-3.5 ${
                  step.glow
                    ? 'bg-[#C8A2C8]/[0.07] border border-[#C8A2C8]/30 lg:border-[#C8A2C8]/50 lg:bg-[#C8A2C8]/[0.12] lg:shadow-[0_0_36px_-8px_rgba(200,162,200,0.35),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    : 'bg-[#C8A2C8]/[0.02] border border-[#C8A2C8]/[0.1] hover:border-[#C8A2C8]/20 lg:border-[#C8A2C8]/25 lg:bg-[#C8A2C8]/[0.06] lg:hover:border-[#C8A2C8]/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-7 h-7 lg:w-9 lg:h-9 bg-[#C8A2C8]/[0.09] rounded-lg flex items-center justify-center
                      ring-1 ring-inset ring-[#C8A2C8]/20 lg:ring-[#C8A2C8]/30"
                  >
                    <Icon
                      weight="duotone"
                      size={14}
                      className="text-[#C8A2C8] lg:w-[17px] lg:h-[17px] lg:text-[#D4B8D4]"
                    />
                  </div>
                  <span className="text-[8px] font-bold tracking-[2px] text-[#C8A2C8]/50 lg:text-[#C8A2C8]/70 uppercase tabular-nums">
                    {step.id}
                  </span>
                </div>
                <div>
                  <div className="text-[10.5px] font-black uppercase tracking-wide text-white leading-tight">{step.label}</div>
                  <p className="text-[8.5px] text-[#5A5A5A] sm:text-[#484848] leading-snug mt-1.5 line-clamp-2 sm:line-clamp-none lg:text-[#9A9A9A]">
                    {step.sub}
                  </p>
                </div>
              </div>
            );
          })}
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
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-8 sm:py-10 lg:py-12">
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
