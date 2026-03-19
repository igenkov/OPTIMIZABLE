import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, UserCircle, Activity, ClipboardList,
  BarChart2, FlaskConical, TrendingUp,
  ChevronRight, ChevronLeft, ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Step = {
  n: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  milestone?: boolean;
  pro?: boolean;
};

const ROW1: Step[] = [
  { n: '01', Icon: UserCircle,    title: 'Personal Profile',  desc: 'Age, body composition, hormonal history' },
  { n: '02', Icon: Activity,      title: 'Lifestyle Signals', desc: 'Sleep, stress, training volume' },
  { n: '03', Icon: ClipboardList, title: 'Symptom Audit',     desc: 'Energy, libido, cognition, recovery' },
];
const ROW2: Step[] = [
  { n: '04', Icon: BarChart2,    title: 'Risk Score',       desc: 'Hormonal coefficient + bloodwork roadmap', milestone: true },
  { n: '05', Icon: FlaskConical, title: 'Lab Analysis',     desc: 'AI deep-dive of 40+ biomarkers',           milestone: true, pro: true },
  { n: '06', Icon: TrendingUp,   title: 'Track & Optimize', desc: '90-day protocol + daily progress logs',    pro: true },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepNode({ step }: { step: Step }) {
  const glow = step.milestone ? 'glow-pulse' : '';
  return (
    <div className={`w-16 h-16 rounded-full shrink-0 flex items-center justify-center ${glow} ${
      step.milestone
        ? 'border-2 border-[#C8A2C8] bg-[#0e0e0e]'
        : step.pro
        ? 'border border-[rgba(200,162,200,0.18)] bg-[#141414]'
        : 'border border-[rgba(255,255,255,0.1)] bg-[#141414]'
    }`}>
      <step.Icon size={22} className={
        step.milestone ? 'text-[#C8A2C8]'
        : step.pro     ? 'text-[rgba(200,162,200,0.35)]'
        :                'text-[#3A3A3A]'
      }/>
    </div>
  );
}

function StepLabel({ step }: { step: Step }) {
  return (
    <div className="text-center w-16 shrink-0">
      <div className={`text-[8px] font-black tracking-[2px] uppercase mb-1 ${
        step.milestone ? 'text-[#C8A2C8]' : 'text-[#2E2E2E]'
      }`}>{step.n}</div>
      <div className={`text-[11px] font-black uppercase tracking-tight leading-tight mb-1 ${
        step.milestone ? 'text-white' : 'text-[#4A4A4A]'
      }`}>{step.title}</div>
      <p className={`text-[9.5px] leading-relaxed ${
        step.milestone ? 'text-[#5A5A5A]' : 'text-[#2A2A2A]'
      }`}>{step.desc}</p>
    </div>
  );
}

// Horizontal connector with directional arrow in center
function HConnector({ reverse = false, dim = false, proGate = false }: {
  reverse?: boolean; dim?: boolean; proGate?: boolean;
}) {
  const Arrow = reverse ? ChevronLeft : ChevronRight;
  return (
    <div className="flex-1 flex items-center justify-center relative" style={{ marginTop: '-1px' }}>
      <div className={`w-full h-px ${dim ? 'bg-[rgba(200,162,200,0.18)]' : 'bg-[rgba(255,255,255,0.1)]'}`}/>
      <div className="absolute flex items-center justify-center bg-[#0e0e0e] px-1">
        <Arrow size={13} className={dim ? 'text-[rgba(200,162,200,0.35)]' : 'text-[rgba(255,255,255,0.22)]'}/>
      </div>
      {proGate && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] font-black text-black bg-[#C8A2C8] px-1.5 py-0.5 uppercase tracking-[1.5px] whitespace-nowrap">
          Pro
        </span>
      )}
    </div>
  );
}

function SnakeFlow() {
  return (
    <div className="w-full select-none">
      <div className="text-[8px] font-black text-[#252525] uppercase tracking-[3px] mb-8 text-right">
        The Optimization Sequence
      </div>

      {/* ── ROW 1 nodes : 01 → 02 → 03 ── */}
      <div className="flex items-center">
        <StepNode step={ROW1[0]}/>
        <HConnector/>
        <StepNode step={ROW1[1]}/>
        <HConnector/>
        <StepNode step={ROW1[2]}/>
      </div>

      {/* Labels row 1 */}
      <div className="flex mt-3 mb-1">
        <StepLabel step={ROW1[0]}/>
        <div className="flex-1"/>
        <StepLabel step={ROW1[1]}/>
        <div className="flex-1"/>
        <StepLabel step={ROW1[2]}/>
      </div>

      {/* ── VERTICAL BEND (right side, below node 03 / above node 04) ── */}
      <div className="flex justify-end" style={{ marginRight: '24px' }}>
        <div className="flex flex-col items-center gap-0">
          <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]"/>
          <ChevronDown size={13} className="text-[rgba(255,255,255,0.22)] -mt-0.5"/>
          <div className="w-px h-3 bg-[rgba(255,255,255,0.06)]"/>
        </div>
      </div>

      {/* ── ROW 2 nodes : 06 ← 05 ← 04 (04 on right) ── */}
      <div className="flex items-center flex-row-reverse">
        <StepNode step={ROW2[0]}/>
        <HConnector reverse dim proGate/>
        <StepNode step={ROW2[1]}/>
        <HConnector reverse dim/>
        <StepNode step={ROW2[2]}/>
      </div>

      {/* Labels row 2 — reversed to align with the reversed node order */}
      <div className="flex mt-3 flex-row-reverse">
        <StepLabel step={ROW2[0]}/>
        <div className="flex-1"/>
        <StepLabel step={ROW2[1]}/>
        <div className="flex-1"/>
        <StepLabel step={ROW2[2]}/>
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

          {/* RIGHT — S-shape workflow */}
          <div className="hidden lg:block col-span-8 xl:col-span-8">
            <SnakeFlow/>
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
