import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, UserCircle, Activity, ClipboardList,
  BarChart2, FlaskConical, TrendingUp,
} from 'lucide-react';

// ── Timeline sequence map ─────────────────────────────────────────────────────

function TimelineFlow() {
  return (
    <div className="relative flex items-center justify-center w-full">
      <div className="w-full max-w-2xl relative">

        {/* Vertical center line */}
        <div className="absolute left-1/2 top-2 bottom-2 w-px glow-line -translate-x-1/2 hidden md:block"/>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 relative">

          {/* Step 01 — LEFT */}
          <div className="flex items-center justify-end relative">
            <div className="step-card bg-white/[0.02] border border-white/5 px-3.5 py-2.5 rounded-xl flex items-center gap-3 w-full">
              <div className="w-8 h-8 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[#4A4A4A]">
                <UserCircle size={16}/>
              </div>
              <div>
                <div className="text-[8px] font-bold text-[#3A3A3A] uppercase tracking-widest">Step 01</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white">Personal Profile</div>
                <div className="text-[9px] text-[#4A4A4A] leading-snug mt-0.5">Age, body comp, history</div>
              </div>
            </div>
            <div className="hidden md:block absolute -right-[25px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0e0e0e] border border-white/15 z-10">
              <div className="w-1 h-1 rounded-full bg-white/25 absolute inset-0 m-auto"/>
            </div>
          </div>

          {/* Step 02 — RIGHT */}
          <div className="flex items-center relative">
            <div className="hidden md:block absolute -left-[25px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0e0e0e] border border-white/15 z-10">
              <div className="w-1 h-1 rounded-full bg-white/25 absolute inset-0 m-auto"/>
            </div>
            <div className="step-card bg-white/[0.02] border border-white/5 px-3.5 py-2.5 rounded-xl flex items-center gap-3 w-full">
              <div className="w-8 h-8 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[#4A4A4A]">
                <Activity size={16}/>
              </div>
              <div>
                <div className="text-[8px] font-bold text-[#3A3A3A] uppercase tracking-widest">Step 02</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white">Lifestyle Signals</div>
                <div className="text-[9px] text-[#4A4A4A] leading-snug mt-0.5">Sleep, stress, training</div>
              </div>
            </div>
          </div>

          {/* Step 03 — LEFT */}
          <div className="flex items-center justify-end relative">
            <div className="step-card bg-white/[0.02] border border-white/5 px-3.5 py-2.5 rounded-xl flex items-center gap-3 w-full">
              <div className="w-8 h-8 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[#4A4A4A]">
                <ClipboardList size={16}/>
              </div>
              <div>
                <div className="text-[8px] font-bold text-[#3A3A3A] uppercase tracking-widest">Step 03</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white">Symptom Audit</div>
                <div className="text-[9px] text-[#4A4A4A] leading-snug mt-0.5">Energy, libido, cognition</div>
              </div>
            </div>
            <div className="hidden md:block absolute -right-[25px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0e0e0e] border border-white/15 z-10">
              <div className="w-1 h-1 rounded-full bg-white/25 absolute inset-0 m-auto"/>
            </div>
          </div>

          {/* Empty right cell */}
          <div className="hidden md:block"/>

          {/* MILESTONE — full width centered */}
          <div className="md:col-span-2 flex justify-center py-2 relative">
            <div className="glow-pulse bg-[#0e0e0e] border-2 border-[rgba(200,162,200,0.5)] px-6 py-3 rounded-2xl flex items-center gap-4 z-20">
              <div className="w-10 h-10 bg-[rgba(200,162,200,0.1)] rounded-full flex items-center justify-center text-[#C8A2C8]">
                <BarChart2 size={20}/>
              </div>
              <div>
                <div className="text-[8px] font-black text-[#C8A2C8] uppercase tracking-[3px]">Milestone</div>
                <div className="text-xs font-black uppercase text-white leading-tight">Risk Score & Roadmap</div>
              </div>
            </div>
          </div>

          {/* Empty left cell */}
          <div className="hidden md:block"/>

          {/* Step 05 — RIGHT (PRO) */}
          <div className="flex items-center relative">
            <div className="hidden md:block absolute -left-[25px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0e0e0e] border border-[rgba(200,162,200,0.4)] z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(200,162,200,0.7)] absolute inset-0 m-auto"/>
            </div>
            <div className="step-card pro bg-[rgba(200,162,200,0.03)] border border-[rgba(200,162,200,0.2)] px-3.5 py-2.5 rounded-xl flex items-center gap-3 w-full relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C8A2C8] text-black text-[6px] font-black px-1.5 py-px tracking-tight uppercase">PRO</div>
              <div className="w-8 h-8 shrink-0 bg-[rgba(200,162,200,0.1)] rounded-lg flex items-center justify-center text-[#C8A2C8]">
                <FlaskConical size={16}/>
              </div>
              <div>
                <div className="text-[8px] font-bold text-[rgba(200,162,200,0.5)] uppercase tracking-widest">Step 05</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white">Lab Analysis</div>
                <div className="text-[9px] text-[#4A4A4A] leading-snug mt-0.5">AI deep-dive, 40+ biomarkers</div>
              </div>
            </div>
          </div>

          {/* Step 06 — LEFT (PRO) */}
          <div className="flex items-center justify-end relative">
            <div className="step-card pro bg-[rgba(200,162,200,0.03)] border border-[rgba(200,162,200,0.2)] px-3.5 py-2.5 rounded-xl flex items-center gap-3 w-full relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C8A2C8] text-black text-[6px] font-black px-1.5 py-px tracking-tight uppercase">PRO</div>
              <div className="w-8 h-8 shrink-0 bg-[rgba(200,162,200,0.1)] rounded-lg flex items-center justify-center text-[#C8A2C8]">
                <TrendingUp size={16}/>
              </div>
              <div>
                <div className="text-[8px] font-bold text-[rgba(200,162,200,0.5)] uppercase tracking-widest">Step 06</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white">Track & Optimize</div>
                <div className="text-[9px] text-[#4A4A4A] leading-snug mt-0.5">90-day protocol + daily logs</div>
              </div>
            </div>
            <div className="hidden md:block absolute -right-[25px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0e0e0e] border border-[rgba(200,162,200,0.4)] z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(200,162,200,0.7)] absolute inset-0 m-auto"/>
            </div>
          </div>

          {/* Empty right cell */}
          <div className="hidden md:block"/>

        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
      <div className="flex-1 flex items-center px-6 lg:px-12 py-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-12 gap-8 lg:gap-16 w-full items-center">

          {/* LEFT — text */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-4">
            <div className="text-[10px] font-bold tracking-[3px] text-[#C8A2C8] uppercase mb-4">
              Biological Baseline Assessment
            </div>
            <h1 className="font-black text-white uppercase leading-none mb-5"
              style={{ fontFamily: "var(--font-oswald,'Oswald',sans-serif)", fontSize: 'clamp(2.2rem,3.5vw,3.2rem)', letterSpacing: '0.03em' }}>
              Know Your Numbers.<br/>
              <span className="text-[#C8A2C8]">Optimize<br/>Your Biology.</span>
            </h1>
            <p className="text-[12px] text-[#5A5A5A] leading-relaxed mb-8">
              From a 3-minute assessment to a full clinical bloodwork analysis and 90-day optimization protocol.
            </p>
            <div className="flex flex-col gap-2.5 mb-10">
              <Link href="/onboarding/phase1"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#C8A2C8] text-black font-black text-[10px] tracking-[3px] uppercase hover:bg-[#A882A8] transition-colors">
                Start Free Assessment <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform"/>
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center px-6 py-3.5 border border-[rgba(255,255,255,0.07)] text-[#4A4A4A] font-bold text-[10px] tracking-[3px] uppercase hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all">
                Sign In
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-6 border-t border-[rgba(255,255,255,0.05)]">
              {[
                { val: '25+', label: 'Biomarkers' },
                { val: '90d', label: 'Protocol' },
                { val: '3min', label: 'To score' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-base font-black text-white">{s.val}</div>
                  <div className="text-[8px] text-[#3A3A3A] uppercase tracking-widest mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — timeline sequence map */}
          <div className="hidden lg:flex col-span-8 xl:col-span-8 items-center justify-center">
            <TimelineFlow/>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] px-6 lg:px-12 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-8">
            {['Clinical Grade Analysis','Encrypted & Private','AI-Powered Protocol','90-Day Optimization'].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#C8A2C8] opacity-40"/>
                <span className="text-[9px] text-[#2A2A2A] uppercase tracking-widest">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[#1A1A1A] uppercase tracking-widest">Wellness only · Not medical advice</p>
        </div>
      </footer>
    </div>
  );
}
