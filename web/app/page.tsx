import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, UserCircle, Activity, ClipboardList,
  BarChart2, FlaskConical, TrendingUp, Lock,
} from 'lucide-react';

const STEPS = [
  {
    n: '01', Icon: UserCircle, tier: 'free',
    title: 'Personal Profile',
    desc: 'Age, body composition, and hormonal history',
  },
  {
    n: '02', Icon: Activity, tier: 'free',
    title: 'Lifestyle Signals',
    desc: 'Sleep quality, stress load, and training volume',
  },
  {
    n: '03', Icon: ClipboardList, tier: 'free',
    title: 'Symptom Audit',
    desc: 'Energy, libido, cognition and recovery markers',
  },
  {
    n: '04', Icon: BarChart2, tier: 'free', milestone: true,
    title: 'Risk Score',
    desc: 'Hormonal risk coefficient + personalized bloodwork panel',
  },
  {
    n: '05', Icon: FlaskConical, tier: 'pro', milestone: true,
    title: 'Lab Deep Analysis',
    desc: 'AI interrogation of 40+ biomarkers vs optimal ranges',
  },
  {
    n: '06', Icon: TrendingUp, tier: 'pro',
    title: 'Protocol + Tracking',
    desc: 'Personalized 90-day stack with daily progress logging',
  },
];

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

      {/* NAV */}
      <nav className="border-b border-[rgba(255,255,255,0.07)] px-6 lg:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C8A2C8"/><stop offset="100%" stopColor="#8E5E8E"/>
              </linearGradient>
            </defs>
            <path d="M17 4A13 13 0 0 1 30 17" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M30 17A13 13 0 0 1 17 30" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7"/>
            <path d="M17 30A13 13 0 0 1 4 17" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.45"/>
            <path d="M4 17A13 13 0 0 1 17 4" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.25"/>
            <line x1="22" y1="12" x2="29" y2="5" stroke="#C8A2C8" strokeWidth="2.5" strokeLinecap="round"/>
            <polyline points="23.5,5 29,5 29,11.5" stroke="#C8A2C8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div>
            <div className="text-white font-bold uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-oswald,'Oswald',sans-serif)", fontSize: '1.15rem' }}>OPTIMIZABLE</div>
            <div className="text-[#4A4A4A] uppercase tracking-[0.18em] mt-0.5"
              style={{ fontFamily: "var(--font-oswald,'Oswald',sans-serif)", fontSize: '0.58rem' }}>MALEMAXXING QUANTIFIED</div>
          </div>
        </div>
        <Link href="/login" className="text-[11px] font-bold text-[#9A9A9A] hover:text-white transition-colors tracking-widest uppercase">
          Sign In
        </Link>
      </nav>

      {/* HERO */}
      <div className="px-6 lg:px-12 pt-16 pb-10 max-w-7xl mx-auto w-full">
        <div className="text-[11px] font-bold tracking-[3px] text-[#C8A2C8] uppercase mb-4">
          Biological Baseline Assessment
        </div>
        <h1 className="font-black text-white uppercase leading-none mb-6 max-w-3xl"
          style={{ fontFamily: "var(--font-oswald,'Oswald',sans-serif)", fontSize: 'clamp(2.8rem,5.5vw,5rem)', letterSpacing: '0.03em' }}>
          Know Your Numbers.<br/>
          <span className="text-[#C8A2C8]">Optimize Your Biology.</span>
        </h1>
        <p className="text-sm text-[#6A6A6A] leading-relaxed mb-8 max-w-lg">
          From a 3-minute assessment to a full clinical bloodwork analysis and 90-day optimization protocol — built for the high-performance male.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link href="/onboarding/phase1"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#C8A2C8] text-black font-black text-[11px] tracking-[3px] uppercase hover:bg-[#A882A8] transition-colors">
            Start Free Assessment <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
          </Link>
          <Link href="/login"
            className="inline-flex items-center justify-center px-8 py-4 border border-[rgba(255,255,255,0.08)] text-[#6A6A6A] font-bold text-[11px] tracking-[3px] uppercase hover:border-[rgba(255,255,255,0.18)] hover:text-white transition-all">
            Sign In
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-10 pb-12 border-b border-[rgba(255,255,255,0.05)]">
          {[
            { val: '25+', label: 'Biomarkers tracked' },
            { val: '90', label: 'Day protocol' },
            { val: '3 min', label: 'To get your score' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-xl font-black text-white">{s.val}</div>
              <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WORKFLOW — The Optimization Sequence */}
      <div className="px-6 lg:px-12 py-12 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center gap-4 mb-14">
          <div className="text-[10px] font-black text-[#4A4A4A] uppercase tracking-[4px] shrink-0">The Optimization Sequence</div>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]"/>
        </div>

        {/* Desktop: stepper row — Mobile: 2-col grid */}
        <div className="hidden lg:block">
          <div className="relative">

            {/* Base line through all circles */}
            <div className="absolute h-px bg-[rgba(255,255,255,0.05)]"
              style={{ top: 28, left: '8.33%', right: '8.33%' }}/>
            {/* Highlighted free-tier segment (steps 1–4 = 66.6% of width) */}
            <div className="absolute h-px"
              style={{ top: 28, left: '8.33%', width: '49.9%', background: 'linear-gradient(to right, rgba(200,162,200,0.3), rgba(200,162,200,0.1))' }}/>
            {/* Pro segment */}
            <div className="absolute h-px"
              style={{ top: 28, left: '58.2%', right: '8.33%', background: 'linear-gradient(to right, rgba(200,162,200,0.2), rgba(200,162,200,0.05))' }}/>

            <div className="grid grid-cols-6 gap-4">
              {STEPS.map((step, i) => {
                const isMilestone = step.milestone;
                const isPro = step.tier === 'pro';
                const isGate = i === 4; // first pro step

                return (
                  <div key={i} className="flex flex-col items-center text-center">

                    {/* Tier label above gate */}
                    <div className="h-5 flex items-center mb-1">
                      {i === 0 && (
                        <span className="text-[7px] font-black text-[#C8A2C8] uppercase tracking-[2px] opacity-60">Free</span>
                      )}
                      {isGate && (
                        <span className="text-[7px] font-black text-black bg-[#C8A2C8] px-2 py-0.5 uppercase tracking-[2px]">Pro</span>
                      )}
                    </div>

                    {/* Circle node on the line */}
                    <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-all
                      ${isMilestone
                        ? 'border-2 border-[#C8A2C8] bg-[#0e0e0e] shadow-[0_0_24px_rgba(200,162,200,0.25)]'
                        : isPro
                        ? 'border border-[rgba(200,162,200,0.3)] bg-[#0e0e0e]'
                        : 'border border-[rgba(255,255,255,0.07)] bg-[#0e0e0e]'
                      }`}>
                      <step.Icon size={20} className={isMilestone ? 'text-[#C8A2C8]' : isPro ? 'text-[rgba(200,162,200,0.5)]' : 'text-[#3A3A3A]'}/>
                    </div>

                    {/* Step content */}
                    <div className={`text-[8px] font-black tracking-[2px] uppercase mb-2 ${isMilestone ? 'text-[#C8A2C8]' : 'text-[#3A3A3A]'}`}>
                      {step.n}
                    </div>
                    <div className={`text-[11px] font-black uppercase tracking-tight leading-tight mb-2 ${isMilestone ? 'text-white' : isPro ? 'text-[#7A7A7A]' : 'text-[#6A6A6A]'}`}>
                      {step.title}
                    </div>
                    <p className="text-[10px] text-[#3A3A3A] leading-relaxed">
                      {step.desc}
                    </p>

                    {/* Lock on pro non-milestone */}
                    {isPro && !isMilestone && (
                      <Lock size={10} className="text-[#2A2A2A] mt-3"/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile: vertical list */}
        <div className="lg:hidden space-y-0">
          {STEPS.map((step, i) => {
            const isMilestone = step.milestone;
            const isPro = step.tier === 'pro';
            return (
              <div key={i} className="flex gap-5 pb-8 relative">
                {/* Vertical connector */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-[rgba(255,255,255,0.05)]"/>
                )}
                {/* Circle */}
                <div className={`relative z-10 w-10 h-10 rounded-full shrink-0 flex items-center justify-center
                  ${isMilestone ? 'border-2 border-[#C8A2C8] bg-[#0e0e0e] shadow-[0_0_16px_rgba(200,162,200,0.2)]' : 'border border-[rgba(255,255,255,0.07)] bg-[#0e0e0e]'}`}>
                  <step.Icon size={16} className={isMilestone ? 'text-[#C8A2C8]' : 'text-[#3A3A3A]'}/>
                </div>
                {/* Text */}
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-black tracking-[2px] uppercase ${isMilestone ? 'text-[#C8A2C8]' : 'text-[#3A3A3A]'}`}>{step.n}</span>
                    {isPro && <span className="text-[7px] font-black text-black bg-[#C8A2C8] px-1.5 py-0.5 uppercase tracking-wide">Pro</span>}
                  </div>
                  <div className={`text-sm font-black uppercase tracking-tight mb-1 ${isMilestone ? 'text-white' : 'text-[#6A6A6A]'}`}>{step.title}</div>
                  <p className="text-[11px] text-[#3A3A3A] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { text: 'Clinical Grade Analysis' },
              { text: 'Encrypted & Private' },
              { text: 'AI-Powered Protocol' },
              { text: '90-Day Optimization' },
            ].map(({ text }, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#C8A2C8] opacity-50"/>
                <span className="text-[10px] text-[#3A3A3A] uppercase tracking-widest">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#2A2A2A] uppercase tracking-widest">
            Wellness information only · Not medical advice
          </p>
        </div>
      </footer>

    </div>
  );
}
