import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, UserCircle, Activity, ClipboardList,
  BarChart2, FlaskConical, TrendingUp,
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
  { n: '04', Icon: BarChart2,    title: 'Risk Score',      desc: 'Hormonal coefficient + bloodwork roadmap', milestone: true },
  { n: '05', Icon: FlaskConical, title: 'Lab Analysis',    desc: 'AI deep-dive of 40+ biomarkers', milestone: true, pro: true },
  { n: '06', Icon: TrendingUp,   title: 'Track & Optimize', desc: '90-day protocol + daily progress logs', pro: true },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepNode({ step }: { step: Step }) {
  return (
    <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center
      ${step.milestone
        ? 'border-2 border-[#C8A2C8] bg-[#0e0e0e] shadow-[0_0_20px_rgba(200,162,200,0.25)]'
        : step.pro
        ? 'border border-[rgba(200,162,200,0.2)] bg-[#141414]'
        : 'border border-[rgba(255,255,255,0.08)] bg-[#141414]'
      }`}>
      <step.Icon size={18}
        className={step.milestone ? 'text-[#C8A2C8]' : step.pro ? 'text-[rgba(200,162,200,0.4)]' : 'text-[#3A3A3A]'}/>
    </div>
  );
}

function StepLabel({ step, align = 'center' }: { step: Step; align?: 'left' | 'center' | 'right' }) {
  const ta = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return (
    <div className={ta}>
      <div className={`text-[7px] font-black tracking-[2px] uppercase mb-1.5
        ${step.milestone ? 'text-[#C8A2C8]' : 'text-[#2A2A2A]'}`}>{step.n}</div>
      <div className={`text-[11px] font-black uppercase tracking-tight leading-tight mb-1.5
        ${step.milestone ? 'text-white' : step.pro ? 'text-[#5A5A5A]' : 'text-[#5A5A5A]'}`}>{step.title}</div>
      <p className="text-[9.5px] text-[#2A2A2A] leading-relaxed">{step.desc}</p>
    </div>
  );
}

// Horizontal connector — a flex-1 line at node center height
function HConnector({ dim = false, proGate = false }: { dim?: boolean; proGate?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-[23px] relative">
      <div className={`w-full h-px ${dim ? 'bg-[rgba(200,162,200,0.12)]' : 'bg-[rgba(255,255,255,0.07)]'}`}/>
      {proGate && (
        <span className="absolute top-[13px] text-[7px] font-black text-black bg-[#C8A2C8] px-2 py-0.5 uppercase tracking-[2px]">
          Pro
        </span>
      )}
    </div>
  );
}

function SnakeFlow() {
  return (
    <div className="w-full">
      <div className="text-[8px] font-black text-[#2A2A2A] uppercase tracking-[3px] mb-8 text-right">
        The Optimization Sequence
      </div>

      {/* ── ROW 1 : left → right ── */}
      <div className="flex items-start">
        {ROW1.map((step, i) => (
          <div key={step.n} className={`flex items-start ${i < ROW1.length - 1 ? 'flex-1' : ''}`}>
            {/* Node + label */}
            <div className="flex flex-col items-center gap-3 w-12 shrink-0">
              <StepNode step={step}/>
            </div>
            {/* Connector to next */}
            {i < ROW1.length - 1 && <HConnector/>}
          </div>
        ))}
      </div>

      {/* Labels row 1 */}
      <div className="grid grid-cols-3 gap-2 mt-3 mb-1">
        {ROW1.map(step => <StepLabel key={step.n} step={step}/>)}
      </div>

      {/* ── VERTICAL BEND (right side) ── */}
      <div className="flex justify-end">
        <div className="w-12 flex justify-center py-3">
          <div className="w-px h-8 bg-[rgba(255,255,255,0.07)]"/>
        </div>
      </div>

      {/* ── ROW 2 : right → left (reversed flex) ── */}
      <div className="flex flex-row-reverse items-start">
        {ROW2.map((step, i) => (
          <div key={step.n} className={`flex flex-row-reverse items-start ${i < ROW2.length - 1 ? 'flex-1' : ''}`}>
            {/* Node */}
            <div className="flex flex-col items-center gap-3 w-12 shrink-0">
              <StepNode step={step}/>
            </div>
            {/* Connector */}
            {i < ROW2.length - 1 && (
              <HConnector dim proGate={i === 0}/>
            )}
          </div>
        ))}
      </div>

      {/* Labels row 2 — visually reversed to match node positions */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[...ROW2].reverse().map(step => <StepLabel key={step.n} step={step}/>)}
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
