import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, FlaskConical, ShieldCheck, Zap, Brain } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('age').eq('user_id', user.id).single();
    if (profile?.age) redirect('/dashboard');
    else redirect('/onboarding/phase1');
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col">

      {/* NAV — mirrors sidebar logo exactly */}
      <nav className="border-b border-[rgba(255,255,255,0.07)] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00E676"/>
                <stop offset="100%" stopColor="#007A3D"/>
              </linearGradient>
            </defs>
            <path d="M17 4A13 13 0 0 1 30 17" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M30 17A13 13 0 0 1 17 30" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7"/>
            <path d="M17 30A13 13 0 0 1 4 17" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.45"/>
            <path d="M4 17A13 13 0 0 1 17 4" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.25"/>
            <line x1="22" y1="12" x2="29" y2="5" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round"/>
            <polyline points="23.5,5 29,5 29,11.5" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div>
            <div className="text-white font-bold uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", fontSize: '1.15rem' }}>
              OPTIMIZABLE
            </div>
            <div className="text-[#4A4A4A] uppercase tracking-[0.18em] mt-0.5"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", fontSize: '0.58rem' }}>
              MALEMAXXING QUANTIFIED
            </div>
          </div>
        </div>

        <Link href="/login"
          className="text-[11px] font-bold text-[#9A9A9A] hover:text-white transition-colors tracking-widest uppercase">
          Sign In
        </Link>
      </nav>

      {/* HERO */}
      <div className="flex-1 flex items-center px-8 py-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-12 gap-10 w-full items-center">

          {/* LEFT */}
          <div className="col-span-12 lg:col-span-6">
            <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">
              Biological Baseline Assessment
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tight leading-tight mb-5">
              Know Your Numbers.<br />
              <span className="text-[#00E676]">Optimize Your Biology.</span>
            </h1>
            <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-md">
              Upload your bloodwork, get your hormonal risk score, and follow a personalized 90-day optimization protocol. Built for the high-performance male.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/onboarding/phase1"
                className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-[#00E676] text-black font-black text-[11px] tracking-[3px] uppercase hover:bg-[#00c864] transition-colors">
                Get Free Assessment <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login"
                className="flex items-center justify-center px-8 py-3.5 border border-[rgba(255,255,255,0.1)] text-[#9A9A9A] font-bold text-[11px] tracking-[3px] uppercase hover:border-[rgba(255,255,255,0.2)] hover:text-white transition-all">
                Sign In
              </Link>
            </div>

            <div className="flex items-center gap-8 border-t border-[rgba(255,255,255,0.05)] pt-8">
              {[
                { val: '25', label: 'Biomarkers tracked' },
                { val: '90', label: 'Day protocol' },
                { val: '3min', label: 'Instant scoring' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-lg font-black text-white uppercase">{s.val}</span>
                  <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — mock dashboard preview */}
          <div className="hidden lg:block col-span-6">
            <Card className="p-0 overflow-hidden" topAccent="rgba(0,230,118,0.4)">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                <span className="text-[10px] font-black text-[#00E676] uppercase tracking-[3px]">Health Dashboard Preview</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Live</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Score row */}
                <div className="flex items-center gap-5 p-4 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-1">Hormonal Risk Score</span>
                    <span className="text-4xl font-black text-[#00E676]">84</span>
                    <span className="text-[9px] font-bold text-[#00E676] uppercase tracking-widest">Low Risk</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: 'Free Testosterone', val: '24.2 pg/mL', good: true },
                      { label: 'SHBG', val: '32 nmol/L', good: true },
                      { label: 'Vitamin D', val: '28 ng/mL', good: false },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                        <span className="text-[10px] text-[#7A7A7A]">{m.label}</span>
                        <span className={cn('text-[10px] font-black', m.good ? 'text-[#00E676]' : 'text-[#FF5252]')}>{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Protocol bar */}
                <div className="p-4 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-[#9A9A9A] uppercase tracking-[2px]">90-Day Protocol</span>
                    <span className="text-[9px] text-[#4A4A4A]">Day 42 / 90</span>
                  </div>
                  <div className="h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00E676] rounded-full" style={{ width: '47%' }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(255,255,255,0.07)] px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { Icon: FlaskConical, text: 'Clinical Grade Analysis' },
              { Icon: ShieldCheck, text: 'Encrypted & Private' },
              { Icon: Zap, text: 'Instant Results' },
              { Icon: Brain, text: 'AI-Powered Protocol' },
            ].map(({ Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon size={12} className="text-[#00E676]" />
                <span className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#3A3A3A] uppercase tracking-widest">
            Wellness information only · Not medical advice
          </p>
        </div>
      </footer>
    </div>
  );
}
