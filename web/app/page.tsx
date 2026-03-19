import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, FlaskConical, ShieldCheck, Zap, Brain } from 'lucide-react';

// ── Mini mock screens ────────────────────────────────────────────────────────

function DashboardMock() {
  return (
    <div className="h-full flex flex-col overflow-hidden"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* chrome */}
      <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, fontWeight: 900, color: '#C8A2C8', letterSpacing: 3, textTransform: 'uppercase' }}>Dashboard</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#3a3a3a','#3a3a3a','#C8A2C8'].map((c,i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />)}
        </div>
      </div>
      {/* score hero */}
      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="58" height="58" viewBox="0 0 58 58">
          <circle cx="29" cy="29" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
          <circle cx="29" cy="29" r="22" fill="none" stroke="#C8A2C8" strokeWidth="5"
            strokeDasharray={`${2*Math.PI*22*0.72} ${2*Math.PI*22}`}
            strokeDashoffset={`${2*Math.PI*22*0.25}`}
            strokeLinecap="round"/>
          <text x="29" y="33" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="sans-serif">72</text>
        </svg>
        <div>
          <div style={{ fontSize: 7, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Hormonal Risk Score</div>
          <div style={{ fontSize: 7, color: '#C8A2C8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'inline-block', padding: '2px 6px', background: 'rgba(200,162,200,0.1)', border: '1px solid rgba(200,162,200,0.2)' }}>Low Risk</div>
        </div>
      </div>
      {/* biomarkers */}
      <div style={{ padding: '10px 14px 6px', flex: 1 }}>
        <div style={{ fontSize: 7, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 7 }}>Key Biomarkers</div>
        {[
          { label: 'Free Testosterone', val: '24.2 pg/mL', color: '#C8A2C8' },
          { label: 'Cortisol', val: '18.1 µg/dL', color: '#E8C470' },
          { label: 'Vitamin D', val: '28 ng/mL', color: '#E88080' },
          { label: 'SHBG', val: '32 nmol/L', color: '#C8A2C8' },
        ].map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 8, color: '#6A6A6A' }}>{m.label}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: m.color }}>{m.val}</span>
          </div>
        ))}
      </div>
      {/* protocol bar */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 7, color: '#C8A2C8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Foundation Phase</span>
          <span style={{ fontSize: 7, color: '#4A4A4A' }}>Day 18 / 90</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: '20%', background: '#C8A2C8', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function LabMock() {
  return (
    <div className="h-full flex flex-col overflow-hidden"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, fontWeight: 900, color: '#C8A2C8', letterSpacing: 3, textTransform: 'uppercase' }}>Biomarker Lab</span>
        <span style={{ fontSize: 7, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 1 }}>Panel_2 · Oct 2024</span>
      </div>
      {/* score row */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
        <div>
          <div style={{ fontSize: 7, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Health Score</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 }}>84<span style={{ fontSize: 9, color: '#4A4A4A', fontWeight: 400 }}>/100</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7, color: '#C8A2C8', background: 'rgba(200,162,200,0.1)', border: '1px solid rgba(200,162,200,0.2)', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>↑ 12 pts vs last</div>
          <div style={{ fontSize: 7, color: '#4A4A4A' }}>2 markers need attention</div>
        </div>
      </div>
      {/* markers */}
      {[
        { name: 'Testosterone Total', val: '612', unit: 'ng/dL', color: '#C8A2C8', label: 'Optimal' },
        { name: 'LH', val: '4.8', unit: 'mIU/mL', color: '#C8A2C8', label: 'Optimal' },
        { name: 'SHBG', val: '52', unit: 'nmol/L', color: '#E8C470', label: 'Suboptimal' },
        { name: 'Estradiol', val: '38', unit: 'pg/mL', color: '#E88080', label: 'Attention' },
        { name: 'TSH', val: '1.9', unit: 'mIU/L', color: '#C8A2C8', label: 'Optimal' },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 8, color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'white' }}>{m.val} <span style={{ color: '#4A4A4A', fontWeight: 400 }}>{m.unit}</span></span>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProtocolMock() {
  return (
    <div className="h-full flex flex-col overflow-hidden"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 8, fontWeight: 900, color: '#C8A2C8', letterSpacing: 3, textTransform: 'uppercase' }}>90-Day Protocol</span>
      </div>
      {/* phases */}
      {[
        { phase: 'Foundation', days: '1–30', pct: 100, done: true },
        { phase: 'Calibration', days: '31–60', pct: 45, active: true },
        { phase: 'Peak Performance', days: '61–90', pct: 0, done: false },
      ].map((p, i) => (
        <div key={i} style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: p.active ? 'rgba(200,162,200,0.03)' : 'transparent' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: p.active ? 5 : 0 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: p.active ? '#C8A2C8' : p.done ? '#3A3A3A' : '#5A5A5A', textTransform: 'uppercase', letterSpacing: 1 }}>{p.phase}</span>
            <span style={{ fontSize: 7, color: p.done ? '#3A3A3A' : '#4A4A4A' }}>Days {p.days}</span>
          </div>
          {p.active && (
            <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${p.pct}%`, background: '#C8A2C8', borderRadius: 99 }} />
            </div>
          )}
        </div>
      ))}
      {/* stack items */}
      <div style={{ padding: '8px 14px 4px' }}>
        <div style={{ fontSize: 7, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 7 }}>Active Stack</div>
        {[
          { name: 'Zinc Picolinate', dose: '30mg', time: 'Night' },
          { name: 'Vitamin D3/K2', dose: '5000IU', time: 'Morning' },
          { name: 'Ashwagandha KSM-66', dose: '600mg', time: 'Evening' },
          { name: 'Magnesium Glycinate', dose: '400mg', time: 'Night' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C8A2C8', opacity: 0.5, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: '#7A7A7A' }}>{item.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#C8A2C8', fontWeight: 700 }}>{item.dose}</span>
              <span style={{ fontSize: 7, color: '#4A4A4A' }}>{item.time}</span>
            </div>
          </div>
        ))}
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
      <nav className="border-b border-[rgba(255,255,255,0.07)] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C8A2C8"/>
                <stop offset="100%" stopColor="#8E5E8E"/>
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
          <div className="col-span-12 lg:col-span-5">
            <div className="text-[11px] font-bold tracking-[3px] text-[#C8A2C8] uppercase mb-3">
              Biological Baseline Assessment
            </div>
            <h1 className="font-black text-white uppercase leading-tight mb-5"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", fontSize: 'clamp(2.4rem, 4vw, 3.6rem)', letterSpacing: '0.04em' }}>
              Know Your Numbers.<br />
              <span className="text-[#C8A2C8]">Optimize Your Biology.</span>
            </h1>
            <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-md">
              Upload your bloodwork, get your hormonal risk score, and follow a personalized 90-day optimization protocol. Built for the high-performance male.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/onboarding/phase1"
                className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-[#C8A2C8] text-black font-black text-[11px] tracking-[3px] uppercase hover:bg-[#A882A8] transition-colors">
                Get Free Assessment <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login"
                className="flex items-center justify-center px-8 py-3.5 border border-[rgba(255,255,255,0.1)] text-[#9A9A9A] font-bold text-[11px] tracking-[3px] uppercase hover:border-[rgba(255,255,255,0.2)] hover:text-white transition-all">
                Sign In
              </Link>
            </div>

            <div className="flex items-center gap-8 border-t border-[rgba(255,255,255,0.05)] pt-8">
              {[
                { val: '25+', label: 'Biomarkers tracked' },
                { val: '90', label: 'Day protocol' },
                { val: '3 min', label: 'Instant scoring' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-lg font-black text-white uppercase">{s.val}</span>
                  <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — stacked screen mockups */}
          <div className="hidden lg:block col-span-7">
            <div className="relative" style={{ height: '460px' }}>

              {/* Shadow glow behind stack */}
              <div className="absolute inset-0 -z-10"
                style={{ background: 'radial-gradient(ellipse at 60% 60%, rgba(200,162,200,0.08) 0%, transparent 70%)' }} />

              {/* BACK — Protocol */}
              <div className="absolute inset-0"
                style={{ transform: 'rotate(5deg) translate(32px, -18px)', zIndex: 10, transformOrigin: 'bottom center' }}>
                <ProtocolMock />
              </div>

              {/* MID — Lab */}
              <div className="absolute inset-0"
                style={{ transform: 'rotate(2.5deg) translate(16px, -9px)', zIndex: 20, transformOrigin: 'bottom center' }}>
                <LabMock />
              </div>

              {/* FRONT — Dashboard */}
              <div className="absolute inset-0" style={{ zIndex: 30 }}>
                <DashboardMock />
              </div>

            </div>
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
                <Icon size={12} className="text-[#C8A2C8]" />
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
