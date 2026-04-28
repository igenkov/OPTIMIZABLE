import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  UserCircle,
  Barbell,
  Brain,
  ChartBar,
  Flask,
  TrendUp,
  ClockCounterClockwise,
  Drop,
  Microscope,
  Target,
  Pulse,
} from '@phosphor-icons/react/dist/ssr';

// -- Step definitions ----------------------------------------------------------

const STEPS = [
  {
    id: '01',
    icon: UserCircle,
    label: 'Personal Details',
    sub: 'Age, body composition, medical history',
    pro: false,
  },
  {
    id: '02',
    icon: Barbell,
    label: 'Lifestyle Assessment',
    sub: 'Sleep, stress, bad habits, physical activity',
    pro: false,
  },
  {
    id: '03',
    icon: Brain,
    label: 'Symptoms Audit',
    sub: 'Energy, libido, recovery, cognition',
    pro: false,
  },
  {
    id: '04',
    icon: ChartBar,
    label: 'Risk Score',
    sub: 'Hormonal coefficient + bloodwork panel recommendation',
    pro: false,
    full: true,
  },
  {
    id: '05',
    icon: Flask,
    label: 'Lab Analysis',
    sub: 'Deep AI analysis of bloodwork. Actual hormonal health status',
    pro: true,
    glow: true,
  },
  {
    id: '06',
    icon: TrendUp,
    label: 'Optimization',
    sub: '90-day optimization protocol',
    pro: true,
  },
  {
    id: '07',
    icon: ClockCounterClockwise,
    label: 'Progress Tracking',
    sub: 'Daily progress assessment',
    pro: true,
  },
];

const freeSteps = STEPS.filter(s => !s.pro && !s.full);
const riskStep = STEPS.find(s => s.full)!;
const proSteps = STEPS.filter(s => s.pro);
type Step = (typeof STEPS)[number];

const oswald = { fontFamily: "var(--font-oswald,'Oswald',sans-serif)" } as const;

// -- Orbital hero (layout pattern from reference; colors = Optimizable lilac) --

function HeroOrbital() {
  return (
    <div className="relative mx-auto mt-12 flex aspect-square w-full max-w-[350px] items-center justify-center md:max-w-[450px] lg:mt-0 lg:max-w-[500px]">
      <div className="home-orb-glow absolute inset-0 opacity-55" aria-hidden />

      <svg
        className="pointer-events-none absolute inset-0 size-full text-white"
        viewBox="0 0 500 500"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path className="home-connecting-line opacity-50" d="M 120 120 Q 250 20 380 120" />
        <path className="home-connecting-line opacity-50" d="M 120 380 Q 250 480 380 380" />
        <path className="home-connecting-line opacity-50" d="M 120 120 Q 20 250 120 380" />
        <path className="home-connecting-line opacity-50" d="M 380 120 Q 480 250 380 380" />

        <path className="home-connecting-line" d="M 250 250 L 120 120" />
        <path className="home-connecting-line" d="M 250 250 L 60 250" />
        <path className="home-connecting-line" d="M 250 250 L 120 380" />
        <path className="home-connecting-line" d="M 250 250 L 380 120" />
        <path className="home-connecting-line" d="M 250 250 L 440 250" />
        <path className="home-connecting-line" d="M 250 250 L 380 380" />

        <circle className="home-connecting-line opacity-30" cx="250" cy="250" r="100" strokeDasharray="4 4" fill="none" />
        <circle className="home-connecting-line opacity-20" cx="250" cy="250" r="180" strokeDasharray="2 6" fill="none" />
      </svg>

      <div className="relative z-10 flex size-24 items-center justify-center rounded-full border border-[#C8A2C8]/40 bg-white/[0.03] shadow-[0_0_50px_rgba(200,162,200,0.32)] backdrop-blur-md md:size-32">
        <div className="absolute size-12 rounded-full bg-gradient-to-br from-[#C8A2C8] to-[#a880a8] opacity-75 blur-md md:size-16" aria-hidden />
        <Image
          src="/logo_trsp.png"
          alt=""
          width={96}
          height={96}
          className="relative z-10 size-16 object-contain drop-shadow-[0_0_8px_rgba(200,162,200,0.45)] md:size-20"
        />
      </div>

      <div className="protocol-node-dim absolute top-[20%] left-[22%] z-10 flex w-[80px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center space-y-1 rounded-xl p-2 md:w-[85px] lg:w-[110px]">
        <ChartBar
          weight="duotone"
          className="size-3 shrink-0 text-[#777] md:size-4"
        />
        <span className="text-center text-[6px] font-black uppercase leading-tight tracking-widest text-[#777] md:text-[7px] lg:text-[8px]">
          Hormonal
          <br />
          Risk Score
        </span>
      </div>

      <div className="protocol-node-dim absolute top-[28%] left-[82%] z-10 flex w-[85px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center space-y-1.5 rounded-xl p-2 lg:w-[115px] lg:p-3">
        <Drop
          weight="duotone"
          className="size-3 shrink-0 text-[#777] md:size-4 lg:size-5"
        />
        <span className="text-center text-[6px] font-black uppercase leading-tight tracking-widest text-[#777] md:text-[7px] lg:text-[8px]">
          Personalized
          <br />
          Bloodwork
        </span>
      </div>

      <div className="protocol-node absolute top-[55%] left-[8%] z-10 flex w-[90px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center space-y-1.5 rounded-xl p-2 lg:w-[125px] lg:space-y-2 lg:p-3">
        <TrendUp
          weight="duotone"
          className="size-3 shrink-0 text-[#C8A2C8] md:size-4 lg:size-5"
        />
        <span className="text-center text-[7px] font-black uppercase leading-tight tracking-widest text-white md:text-[8px] lg:text-[9px]">
          Progress
          <br />
          Tracking
        </span>
      </div>

      <div className="protocol-node absolute top-[45%] left-[88%] z-10 flex w-[95px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center space-y-1.5 rounded-xl p-2.5 lg:w-[135px] lg:space-y-2 lg:p-3.5">
        <Microscope
          weight="duotone"
          className="size-3 shrink-0 text-[#C8A2C8] md:size-4 lg:size-5"
        />
        <span className="text-center text-[7px] font-black uppercase leading-tight tracking-widest text-white md:text-[8px] lg:text-[9px]">
          Bloodwork
          <br />
          Analysis
        </span>
      </div>

      <div className="protocol-node absolute top-[82%] left-[28%] z-10 flex w-[100px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center space-y-1.5 rounded-xl p-3 lg:w-[145px] lg:space-y-2 lg:p-4">
        <Target
          weight="duotone"
          className="size-4 shrink-0 text-[#C8A2C8] md:size-5 lg:size-6"
        />
        <span className="text-center text-[7px] font-black uppercase leading-tight tracking-widest text-white md:text-[8px] lg:text-[9.5px]">
          90-Day
          <br />
          Optimization
        </span>
      </div>

      <div className="protocol-node absolute top-[72%] left-[78%] z-10 flex w-[85px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center space-y-1.5 rounded-xl p-2 lg:w-[120px] lg:space-y-2 lg:p-3">
        <Pulse
          weight="duotone"
          className="size-3 shrink-0 text-[#C8A2C8] md:size-4 lg:size-5"
        />
        <span className="text-center text-[7px] font-black uppercase leading-tight tracking-widest text-white md:text-[8px] lg:text-[9px]">
          Daily
          <br />
          Wellbeing
        </span>
      </div>

      <div
        className="absolute top-1/4 right-1/4 size-1.5 animate-pulse rounded-full bg-[#C8A2C8] shadow-[0_0_10px_rgba(200,162,200,0.8)]"
        aria-hidden
      />
      <div
        className="absolute bottom-1/3 left-1/3 size-1.5 animate-ping rounded-full bg-[#b890b8] opacity-80"
        aria-hidden
      />
      <div className="absolute top-1/2 left-1/4 size-2 rounded-full bg-white/15" aria-hidden />
    </div>
  );
}

// -- Asymmetric bento ------------------------------------------------------------

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
      className={`group relative overflow-hidden rounded-[18px] border p-4 transition-all duration-300 sm:p-5 lg:p-4 ${className} ${
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
            className={`font-black uppercase tracking-wide leading-tight text-white ${
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
    <div id="clinical-flow" className="min-w-0 w-full scroll-mt-28">
      <div className="mb-4 flex items-center gap-3 sm:mb-5 lg:max-w-[92%]">
        <div className="h-px flex-1 bg-gradient-to-r from-[#C8A2C8]/50 to-transparent" />
        <span className="text-[8px] uppercase tracking-[0.18em] text-[#7D667D]">Clinical Flow</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <StepTile
          step={riskStep}
          meta="Free"
          emphasis="large"
          className="lg:min-h-[192px]"
        />

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[8px] font-black tracking-[0.2em] text-[#C8A2C8]/70 uppercase">Lab</span>
            <span className="text-[7px] font-black tracking-[0.16em] text-[#C8A2C8] uppercase">
              Unlock
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 lg:gap-3.5">
            <StepTile
              step={proSteps[0]}
              tone="lab"
              emphasis="large"
              className="sm:col-span-4 lg:col-span-4 lg:min-h-[132px]"
            />
            <StepTile
              step={proSteps[1]}
              tone="lab"
              className="sm:col-span-2 lg:col-span-2 lg:min-h-[132px]"
            />
            <StepTile
              step={proSteps[2]}
              tone="lab"
              className="sm:col-span-6 lg:col-span-6 lg:min-h-[96px]"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-7">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-[8px] font-black tracking-[0.2em] text-[#77717a]">Baseline</span>
          <span className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 lg:gap-3.5">
          <StepTile
            step={freeSteps[0]}
            className="sm:col-span-3 lg:col-span-2 lg:min-h-[120px]"
          />
          <StepTile
            step={freeSteps[1]}
            className="sm:col-span-3 lg:col-span-2 lg:min-h-[120px]"
          />
          <StepTile
            step={freeSteps[2]}
            className="sm:col-span-6 lg:col-span-2 lg:min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
}

// -- Page ----------------------------------------------------------------------

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('age').eq('user_id', user.id).single();
    if (profile?.age) redirect('/dashboard');
    else redirect('/onboarding/phase1');
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0e0e0e] text-white">
      {/* Dot grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 select-none lg:hidden"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden select-none lg:block"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.038) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 h-[min(100vh,420px)] w-[min(100vw,520px)] select-none lg:hidden"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(200,162,200,0.05) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 hidden h-[min(75vh,580px)] w-[min(92vw,900px)] select-none lg:block"
        style={{
          background:
            'radial-gradient(ellipse 85% 70% at 100% 0%, rgba(200,162,200,0.12) 0%, rgba(200,162,200,0.04) 45%, transparent 70%)',
        }}
      />

      <header className="fixed top-0 z-50 w-full border-b border-white/[0.05] bg-black/40 shadow-[0_0_40px_-15px_rgba(200,162,200,0.28)] backdrop-blur-2xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo_trsp.png"
              alt="Optimizable"
              width={30}
              height={30}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            <div className="min-w-0">
              <div
                className="truncate font-bold uppercase text-white"
                style={{ ...oswald, fontSize: '14px', letterSpacing: '0.15em' }}
              >
                OPTIMIZABLE
              </div>
              <div
                className="truncate uppercase text-[#4A4A4A]"
                style={{ ...oswald, fontSize: '7px', letterSpacing: '0.13em' }}
              >
                JUST A MAN. PROPERLY
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/how-it-works"
              className="text-sm font-bold uppercase tracking-wide text-[#5A5A5A] transition-colors duration-300 hover:text-white"
            >
              How It Works
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            <Link
              href="/login"
              className="hidden text-sm font-bold uppercase tracking-wide text-[#5A5A5A] transition-colors duration-300 hover:text-white sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/onboarding/phase1"
              className="rounded-full bg-[#C8A2C8] px-5 py-2 text-center text-[10px] font-black uppercase tracking-wide text-black transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:px-6"
              style={oswald}
            >
              Start Free Assessment
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden pb-12 pt-[4.75rem] sm:pb-14 sm:pt-28 lg:pb-16 lg:pt-32">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-12">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8A2C8]/20 bg-[#C8A2C8]/[0.07] px-3 py-1.5">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-[#C8A2C8]" aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C8A2C8]" style={oswald}>
                Assessment pipeline active
              </span>
            </div>

            <h1
              className="mb-8 font-bold tracking-[-0.02em] text-white"
              style={{ ...oswald, fontSize: 'clamp(2rem, 5vw + 0.75rem, 3.65rem)', lineHeight: 1.1 }}
            >
              Clinical insight into your hormones—a 90-day path to optimization.
            </h1>

            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <Link
                href="/onboarding/phase1"
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#C8A2C8] px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-[0_0_30px_rgba(200,162,200,0.35)] transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:px-10"
                style={oswald}
              >
                Get started
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.03] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b8b8b8] backdrop-blur-md transition-colors duration-200 hover:bg-white/[0.06] hover:text-white sm:px-10"
                style={oswald}
              >
                How it works
              </Link>
            </div>
          </div>

          <HeroOrbital />
        </section>

        <section className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:mt-6 lg:px-8">
          <StepBento />
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.05] bg-[#0a0a0a]/75 py-8 backdrop-blur-md sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo_trsp.png" alt="" width={24} height={24} className="opacity-60" />
            <span className="text-sm font-black uppercase tracking-tight text-white/50" style={oswald}>
              Optimizable
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2 sm:text-center">
            {['Clinical grade analysis', 'Encrypted & private', 'AI protocol', '90-day track'].map((text, i) => (
              <div key={i} className="flex items-center gap-2 sm:justify-center">
                <div className="size-1 shrink-0 rounded-full bg-[#C8A2C8]/45" />
                <span className="text-[8px] uppercase leading-tight tracking-[0.12em] text-[#4A4A4A] sm:text-[9px] sm:tracking-[2px]">
                  {text}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-[8px] uppercase tracking-[0.15em] text-[#303030] sm:text-[9px] lg:text-right">
            Wellness only — not medical advice
          </p>
        </div>
      </footer>
    </div>
  );
}
