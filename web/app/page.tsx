import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, Activity, Brain, Fingerprint,
  ArrowRight, Zap, FlaskConical
} from 'lucide-react';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative">

      {/* BACKGROUND */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_center,rgba(0,230,118,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* NAV */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00E676] flex items-center justify-center rounded-sm">
            <Zap size={18} className="text-black fill-black" />
          </div>
          <span className="text-[11px] font-black tracking-[5px] uppercase">Optimizable</span>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Analysis Engine Online</span>
          </div>
          <Link href="/login" className="text-[10px] font-black text-white/60 hover:text-[#00E676] transition-colors tracking-widest uppercase border-b border-white/10 pb-1">
            Sign In
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 grid grid-cols-12 gap-12 items-center">

        <div className="col-span-12 lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
            <Fingerprint size={12} className="text-[#00E676]" />
            <span className="text-[10px] font-black text-[#00E676] uppercase tracking-[2px]">Quantitative Biological Optimization</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
            Know Your <br />
            <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)', WebkitTextFillColor: 'transparent' }}>Numbers.</span><br />
            <span className="text-[#00E676]">Own Your Edge.</span>
          </h1>

          <p className="text-lg text-white/40 max-w-xl leading-relaxed mb-10 font-medium">
            The world&apos;s most advanced hormonal analysis interface. Transform raw bloodwork into a 90-day biological protocol. Quantified health for the high-performance male.
          </p>

          <Link href="/onboarding/phase1" className="group inline-flex items-center gap-3 px-10 py-5 bg-[#00E676] text-black font-black text-xs tracking-[3px] uppercase hover:bg-white transition-all shadow-[0_0_30px_rgba(0,230,118,0.2)]">
            Start Free Assessment <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="mt-12 flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-xl font-black text-white/60 uppercase">99.8%</span>
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Model Accuracy</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-xl font-black text-white/60 uppercase">24</span>
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Biomarkers Tracked</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-xl font-black text-white/60 uppercase">3-Min</span>
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Instant Scoring</span>
            </div>
          </div>
        </div>

        {/* PREVIEW CARD */}
        <div className="hidden lg:block col-span-5 relative">
          <Card className="p-1 rotate-2 hover:rotate-0 transition-transform duration-700" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
            <div className="bg-[#0e0e0e] p-6 border border-white/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-[#00E676] uppercase tracking-[3px]">Health Index</span>
                  <span className="text-3xl font-black text-white">84<span className="text-sm text-white/20">/100</span></span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-[#00E676] border-t-white/10 flex items-center justify-center">
                  <Activity size={16} className="text-[#00E676]" />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Free Testosterone', val: '24.2 pg/mL', status: 'Optimal' },
                  { label: 'SHBG', val: '32 nmol/L', status: 'In Range' },
                  { label: 'Vitamin D', val: '28 ng/mL', status: 'Low' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{m.label}</span>
                    <span className={cn('text-[10px] font-black uppercase', m.status === 'Low' ? 'text-red-400' : 'text-[#00E676]')}>{m.val}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="text-[9px] font-black text-white/20 uppercase tracking-[4px] mb-4 text-center">Protocol Sequence</div>
                <div className="flex justify-between gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(step => (
                    <div key={step} className={cn('flex-1 h-1 rounded-full', step < 4 ? 'bg-[#00E676]' : 'bg-white/10')} />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00E676]/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-black/50 relative z-50">
        <div className="max-w-7xl mx-auto px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap justify-center gap-10">
            {[
              { label: 'Analysis', Icon: FlaskConical, text: 'Clinical Grade' },
              { label: 'Privacy', Icon: ShieldCheck, text: '256-bit Encrypted' },
              { label: 'Speed', Icon: Zap, text: 'Instant Results' },
              { label: 'Expertise', Icon: Brain, text: 'AI-Optimized' },
            ].map(({ label, Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <Icon size={14} className="text-[#00E676]" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
                  <span className="text-[9px] font-bold text-white/30 uppercase">{text}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[2px] text-center md:text-right max-w-[200px]">
            This is wellness information. Not a substitute for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
