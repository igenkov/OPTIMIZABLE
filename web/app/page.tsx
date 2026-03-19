import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, FlaskConical, ShieldCheck, Zap, Brain } from 'lucide-react';

// ── Shared mini UI primitives ─────────────────────────────────────────────────
const S = {
  card: { background: '#141414', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
  header: { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 } as React.CSSProperties,
  label: { fontSize: 7, fontWeight: 900, color: '#C8A2C8', letterSpacing: 3, textTransform: 'uppercase' } as React.CSSProperties,
  sublabel: { fontSize: 6, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2 } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' } as React.CSSProperties,
};

// ── Dashboard mock ────────────────────────────────────────────────────────────
function DashboardMock() {
  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.label}>Dashboard</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8A2C8', opacity: 0.6 }} />
          <span style={{ ...S.sublabel, color: '#3A3A3A' }}>Day 18 / 90</span>
        </div>
      </div>

      {/* Score + ring */}
      <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
          <circle cx="28" cy="28" r="22" fill="none" stroke="#C8A2C8" strokeWidth="5"
            strokeDasharray={`${2*Math.PI*22*0.72} ${2*Math.PI*22}`}
            strokeDashoffset={`${2*Math.PI*22*0.25}`} strokeLinecap="round"/>
          <text x="28" y="32" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="sans-serif">72</text>
        </svg>
        <div>
          <div style={{ fontSize: 6, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>Hormonal Risk Score</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: 4 }}>72 <span style={{ fontSize: 8, color: '#4A4A4A', fontWeight: 400 }}>/100</span></div>
          <span style={{ fontSize: 6, color: '#C8A2C8', background: 'rgba(200,162,200,0.1)', border: '1px solid rgba(200,162,200,0.2)', padding: '2px 5px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>Low Risk</span>
        </div>
      </div>

      {/* Biometric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: 1, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
        {[
          { label: 'Free T', val: '24.2', unit: 'pg/mL', color: '#C8A2C8' },
          { label: 'Cortisol', val: '18.1', unit: 'µg/dL', color: '#E8C470' },
          { label: 'Vitamin D', val: '28', unit: 'ng/mL', color: '#E88080' },
          { label: 'SHBG', val: '32', unit: 'nmol/L', color: '#C8A2C8' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#141414', padding: '7px 10px' }}>
            <div style={{ fontSize: 6, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: m.color }}>{m.val}</div>
            <div style={{ fontSize: 6, color: '#4A4A4A' }}>{m.unit}</div>
          </div>
        ))}
      </div>

      {/* Biomarkers */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '7px 12px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={S.sublabel}>Key Markers</span>
        </div>
        {[
          { label: 'Testosterone Total', val: '612 ng/dL', color: '#C8A2C8' },
          { label: 'LH / FSH', val: '4.8 / 5.2', color: '#C8A2C8' },
          { label: 'Estradiol', val: '38 pg/mL', color: '#E88080' },
        ].map((m, i) => (
          <div key={i} style={S.row}>
            <span style={{ fontSize: 7.5, color: '#6A6A6A' }}>{m.label}</span>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: m.color }}>{m.val}</span>
          </div>
        ))}
      </div>

      {/* Phase bar */}
      <div style={{ padding: '7px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 7, color: '#C8A2C8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Foundation Phase</span>
          <span style={{ fontSize: 7, color: '#4A4A4A' }}>Day 18</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: '20%', background: '#C8A2C8', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

// ── Lab mock ──────────────────────────────────────────────────────────────────
function LabMock() {
  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.label}>Biomarker Lab</span>
        <span style={{ ...S.sublabel, color: '#3A3A3A' }}>Panel_2 · Oct 2024</span>
      </div>

      {/* Health score */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 6, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Health Score</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1 }}>84<span style={{ fontSize: 8, color: '#4A4A4A', fontWeight: 400 }}>/100</span></div>
        </div>
        <span style={{ fontSize: 7, color: '#C8A2C8', background: 'rgba(200,162,200,0.08)', border: '1px solid rgba(200,162,200,0.2)', padding: '3px 7px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>↑ 12 pts</span>
      </div>

      {/* Markers */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {[
          { name: 'Testosterone Total', val: '612', unit: 'ng/dL', color: '#C8A2C8', status: 'Optimal' },
          { name: 'Free Testosterone', val: '24.2', unit: 'pg/mL', color: '#C8A2C8', status: 'Optimal' },
          { name: 'SHBG', val: '52', unit: 'nmol/L', color: '#E8C470', status: 'Elevated' },
          { name: 'Estradiol', val: '38', unit: 'pg/mL', color: '#E88080', status: 'High' },
          { name: 'Cortisol AM', val: '18.1', unit: 'µg/dL', color: '#E8C470', status: 'Moderate' },
          { name: 'TSH', val: '1.9', unit: 'mIU/L', color: '#C8A2C8', status: 'Optimal' },
        ].map((m, i) => (
          <div key={i} style={{ ...S.row }}>
            <span style={{ fontSize: 7.5, color: '#7A7A7A' }}>{m.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: 'white' }}>{m.val} <span style={{ color: '#4A4A4A', fontWeight: 400 }}>{m.unit}</span></span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <span style={{ fontSize: 6, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 2 }}>2 markers need attention</span>
      </div>
    </div>
  );
}

// ── Protocol mock ─────────────────────────────────────────────────────────────
function ProtocolMock() {
  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.label}>90-Day Protocol</span>
        <span style={{ ...S.sublabel, color: '#3A3A3A' }}>Calibration Phase</span>
      </div>

      {/* Phases */}
      {[
        { phase: 'Foundation', days: '1–30', pct: 100, state: 'done' },
        { phase: 'Calibration', days: '31–60', pct: 45, state: 'active' },
        { phase: 'Peak Performance', days: '61–90', pct: 0, state: 'locked' },
      ].map((p) => (
        <div key={p.phase} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: p.state === 'active' ? 'rgba(200,162,200,0.03)' : 'transparent', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: p.state === 'active' ? 5 : 0 }}>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: p.state === 'active' ? '#C8A2C8' : p.state === 'done' ? '#3A3A3A' : '#4A4A4A', textTransform: 'uppercase', letterSpacing: 1 }}>{p.phase}</span>
            <span style={{ fontSize: 6, color: p.state === 'done' ? '#3A3A3A' : '#4A4A4A' }}>Days {p.days}</span>
          </div>
          {p.state === 'active' && (
            <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${p.pct}%`, background: '#C8A2C8', borderRadius: 99 }} />
            </div>
          )}
        </div>
      ))}

      {/* Stack */}
      <div style={{ padding: '7px 12px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <span style={S.sublabel}>Active Stack</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {[
          { name: 'Zinc Picolinate', dose: '30mg', time: 'Night' },
          { name: 'Vitamin D3/K2', dose: '5000IU', time: 'AM' },
          { name: 'Ashwagandha KSM-66', dose: '600mg', time: 'PM' },
          { name: 'Magnesium Glycinate', dose: '400mg', time: 'Night' },
          { name: 'Tongkat Ali', dose: '200mg', time: 'AM' },
        ].map((item, i) => (
          <div key={i} style={S.row}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C8A2C8', opacity: 0.4, flexShrink: 0 }} />
              <span style={{ fontSize: 7.5, color: '#7A7A7A' }}>{item.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 7.5, color: '#C8A2C8', fontWeight: 700 }}>{item.dose}</span>
              <span style={{ fontSize: 7, color: '#4A4A4A' }}>{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
      <div className="flex-1 flex items-center px-8 py-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-12 gap-8 w-full items-center">

          {/* LEFT */}
          <div className="col-span-12 lg:col-span-5">
            <div className="text-[11px] font-bold tracking-[3px] text-[#C8A2C8] uppercase mb-3">
              Biological Baseline Assessment
            </div>
            <h1 className="font-black text-white uppercase leading-tight mb-5"
              style={{ fontFamily: "var(--font-oswald,'Oswald',sans-serif)", fontSize: 'clamp(2.4rem,4vw,3.6rem)', letterSpacing: '0.04em' }}>
              Know Your Numbers.<br/>
              <span className="text-[#C8A2C8]">Optimize Your Biology.</span>
            </h1>
            <p className="text-sm text-[#9A9A9A] leading-relaxed mb-8 max-w-md">
              Upload your bloodwork, get your hormonal risk score, and follow a personalized 90-day optimization protocol. Built for the high-performance male.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/onboarding/phase1"
                className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-[#C8A2C8] text-black font-black text-[11px] tracking-[3px] uppercase hover:bg-[#A882A8] transition-colors">
                Get Free Assessment <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
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

          {/* RIGHT — stacked screens */}
          <div className="hidden lg:block col-span-7">
            {/* glow */}
            <div className="relative" style={{ height: '480px' }}>
              <div className="absolute inset-0 -z-10 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 55% 55%, rgba(200,162,200,0.09) 0%, transparent 65%)' }}/>

              {/* BACK — Protocol: right side, z:10 */}
              <div className="absolute" style={{
                left: '42%', top: 0, right: '-8px', bottom: 0,
                zIndex: 10,
                transform: 'rotate(3.5deg)',
                transformOrigin: 'bottom left',
                filter: 'brightness(0.65)',
              }}>
                <ProtocolMock/>
              </div>

              {/* MID — Lab: center-right, z:20 */}
              <div className="absolute" style={{
                left: '22%', top: '16px', right: 0, bottom: 0,
                zIndex: 20,
                transform: 'rotate(1.5deg)',
                transformOrigin: 'bottom left',
                filter: 'brightness(0.82)',
              }}>
                <LabMock/>
              </div>

              {/* FRONT — Dashboard: left, full height, z:30 */}
              <div className="absolute" style={{
                left: 0, top: '32px', right: '28%', bottom: 0,
                zIndex: 30,
              }}>
                <DashboardMock/>
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
                <Icon size={12} className="text-[#C8A2C8]"/>
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
