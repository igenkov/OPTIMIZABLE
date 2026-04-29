import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { HomeVideoBackground } from '@/components/home/HomeVideoBackground';

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
    <div className="relative flex min-h-[100dvh] flex-col bg-bg text-white">
      <HomeVideoBackground overlayOpacityClassName="bg-bg/45" />

      {/* Dot grid — lab paper texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2] select-none lg:hidden"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in oklch, white 2.8%, transparent) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2] hidden select-none lg:block"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in oklch, white 3.8%, transparent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 z-[2] h-[min(100vh,420px)] w-[min(100vw,520px)] select-none lg:hidden"
        style={{
          background:
            'radial-gradient(ellipse at top right, color-mix(in oklch, var(--color-lilac) 5%, transparent) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 z-[2] hidden h-[min(75vh,580px)] w-[min(92vw,900px)] select-none lg:block"
        style={{
          background:
            'radial-gradient(ellipse 85% 70% at 100% 0%, color-mix(in oklch, var(--color-lilac) 12%, transparent) 0%, color-mix(in oklch, var(--color-lilac) 4%, transparent) 45%, transparent 70%)',
        }}
      />

      <header className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-black/[0.12] shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm supports-[backdrop-filter]:bg-black/[0.06]">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo_trsp.png"
              alt="Optimizable"
              width={30}
              height={30}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            <div className="min-w-0">
              <div className="font-display truncate text-sm font-bold uppercase tracking-[0.15em] text-white">
                OPTIMIZABLE
              </div>
              <div className="font-display truncate text-[7px] uppercase tracking-[0.13em] text-dim">
                JUST A MAN. PROPERLY
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-3 sm:gap-6">
            <Link
              href="/how-it-works"
              className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-label transition-colors duration-300 hover:text-white sm:text-sm sm:tracking-wide"
            >
              How It Works
            </Link>
            <Link
              href="/login"
              className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-label transition-colors duration-300 hover:text-white sm:text-sm sm:tracking-wide"
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-start px-4 pb-6 pt-[4.75rem] sm:px-6 sm:pb-8 sm:pt-24 lg:px-8 lg:pb-10 lg:pt-28">
        <section className="mx-auto grid w-full max-w-7xl items-start gap-6 py-3 sm:gap-7 sm:px-6 sm:py-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-8">
          <div className="relative z-10 flex min-w-0 flex-col items-start text-left">
            <p className="home-reveal mb-4 font-display text-[10px] font-black uppercase tracking-[0.14em] text-lilac sm:mb-5">
              Men&apos;s hormonal health
            </p>

            <div
              className="home-reveal home-reveal-delay-1 mb-6 max-w-[min(100%,23ch)] font-display sm:mb-7"
              style={{ fontSize: 'clamp(1.4rem, 2.95vw + 0.58rem, 2.5rem)' }}
            >
              <h1 className="font-bold uppercase tracking-[0.03em] leading-[1.08] text-white">
                <span className="block">If you don&apos;t</span>
                <span className="block">
                  <span className="text-lilac">wake up hard</span>,{' '}
                </span>
                <span className="block">something is off.</span>
              </h1>
              <p
                className="mt-3 font-bold uppercase tracking-[0.06em] text-muted"
                style={{ fontSize: '0.6em', lineHeight: 1.25 }}
              >
                Find it and optimize it!
              </p>
            </div>
            <p className="home-reveal home-reveal-delay-1 mb-6 max-w-[65ch] text-[13px] leading-relaxed text-muted sm:mb-7 sm:text-[14px] sm:leading-[1.72]">
              From a 3-minute assessment to your full hormonal system insights
            </p>

            <div className="home-reveal home-reveal-delay-2 mb-6 grid w-full max-w-xl grid-cols-2 gap-2.5 sm:mb-7 sm:grid-cols-3 sm:gap-3">
              {[
                { value: '3 min', label: 'Assessment' },
                { value: '24+', label: 'Hormonal markers' },
                { value: '1 plan', label: 'Clear next step' },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className={`rounded-md border border-white/[0.11] bg-surface-deep/40 px-3 py-2 backdrop-blur-[2px] sm:px-3.5 ${idx === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                  <p className="font-display text-[11px] font-black tracking-[0.04em] text-white [font-variant-numeric:tabular-nums] sm:text-[12px]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-dim sm:text-[10px]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="home-reveal home-reveal-delay-2 flex max-w-prose flex-col gap-4 sm:flex-row sm:gap-5">
              <Link
                href="/onboarding/phase1"
                className="font-display group inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-lilac px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_12px_40px_rgba(200,162,200,0.22)] transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:px-8 sm:text-[11px] sm:tracking-[0.18em]"
              >
                Start Your Free Assessment
                <CaretRight
                  size={14}
                  weight="bold"
                  className="shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/how-it-works"
                className="font-display inline-flex w-full items-center justify-center rounded-lg border border-white/[0.18] bg-white/[0.03] px-8 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted backdrop-blur-[6px] transition-colors duration-200 hover:bg-white/[0.06] hover:text-white sm:w-auto sm:px-10 sm:text-[11px] sm:tracking-[0.18em]"
              >
                How it works
              </Link>
            </div>
            <p className="home-reveal home-reveal-delay-2 mt-4 text-[10px] uppercase tracking-[0.12em] text-dim sm:mt-5">
              Built around lab interpretation logic, not supplement marketing.
            </p>
          </div>

          <div className="hidden min-h-[1px] lg:block" aria-hidden />
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] bg-surface-deep/80 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-6 sm:gap-y-1 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:justify-start">
            {['Clinical grade analysis', 'Encrypted & private', 'AI protocol', '90-day track'].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="size-1 shrink-0 rounded-full bg-lilac/45" />
                <span className="font-display text-[8px] uppercase leading-none tracking-[0.12em] text-dim sm:text-[9px] sm:tracking-[2px]">
                  {text}
                </span>
              </div>
            ))}
          </div>
          <p className="shrink-0 text-center text-[8px] uppercase tracking-[0.15em] text-dim sm:text-[9px] sm:text-right">
            Wellness only — not medical advice
          </p>
        </div>
      </footer>
    </div>
  );
}
