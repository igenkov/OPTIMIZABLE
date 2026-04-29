import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
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
      <HomeVideoBackground />

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

      <header className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-black/50 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
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
              <div className="font-display truncate text-sm font-bold uppercase tracking-[0.15em] text-white">
                OPTIMIZABLE
              </div>
              <div className="font-display truncate text-[7px] uppercase tracking-[0.13em] text-dim">
                JUST A MAN. PROPERLY
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-5 sm:gap-6">
            <Link
              href="/how-it-works"
              className="font-display text-sm font-bold uppercase tracking-wide text-label transition-colors duration-300 hover:text-white"
            >
              How It Works
            </Link>
            <Link
              href="/login"
              className="font-display text-sm font-bold uppercase tracking-wide text-label transition-colors duration-300 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-8 pt-[4.75rem] sm:px-6 sm:pb-10 sm:pt-28 lg:px-8 lg:pt-32">
        <section className="mx-auto w-full max-w-2xl">
          <div className="relative z-10 mx-auto text-center">
            <div className="home-reveal mb-4 inline-flex items-center gap-2 rounded-full border border-lilac/20 bg-lilac/[0.07] px-3 py-1.5 sm:mb-5">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-lilac" aria-hidden />
              <span className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-lilac">
                Assessment pipeline active
              </span>
            </div>

            <h1
              className="home-reveal home-reveal-delay-1 mx-auto mb-3 max-w-[min(100%,36ch)] font-display font-bold uppercase tracking-[0.03em] text-white sm:mb-4"
              style={{
                fontSize: 'clamp(1.2rem, 4.2vw + 0.35rem, 2.2rem)',
                lineHeight: 1.12,
              }}
            >
              If you don&apos;t wake up hard, something is off. Optimize it!
            </h1>
            <p className="home-reveal home-reveal-delay-1 mx-auto mb-6 max-w-md text-[12px] leading-relaxed text-muted sm:mb-8 sm:text-[14px]">
              From a 3-minute assessment to your full hormonal system insights
            </p>

            <div className="home-reveal home-reveal-delay-2 flex max-w-md flex-col gap-3 sm:mx-auto sm:flex-row sm:justify-center sm:gap-5">
              <Link
                href="/onboarding/phase1"
                className="font-display group inline-flex items-center justify-center gap-2.5 rounded-full bg-lilac px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-[0_12px_40px_rgba(200,162,200,0.22)] transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] sm:px-10 sm:py-4"
              >
                Get started
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/how-it-works"
                className="font-display inline-flex items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.03] px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted backdrop-blur-[6px] transition-colors duration-200 hover:bg-white/[0.06] hover:text-white sm:px-10 sm:py-4"
              >
                How it works
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] bg-surface-deep/80 py-8 backdrop-blur-md sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo_trsp.png" alt="" width={24} height={24} className="opacity-60" />
            <span className="font-display text-sm font-black uppercase tracking-tight text-white/50">
              Optimizable
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2 sm:text-center">
            {['Clinical grade analysis', 'Encrypted & private', 'AI protocol', '90-day track'].map((text, i) => (
              <div key={i} className="flex items-center gap-2 sm:justify-center">
                <div className="size-1 shrink-0 rounded-full bg-lilac/45" />
                <span className="font-display text-[8px] uppercase leading-tight tracking-[0.12em] text-dim sm:text-[9px] sm:tracking-[2px]">
                  {text}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-[8px] uppercase tracking-[0.15em] text-dim sm:text-[9px] lg:text-right">
            Wellness only — not medical advice
          </p>
        </div>
      </footer>
    </div>
  );
}
