import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('age').eq('user_id', user.id).single();
    if (profile?.age) redirect('/dashboard');
    else redirect('/onboarding/phase1');
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
      <nav className="flex items-center justify-between px-10 py-6 border-b border-[rgba(255,255,255,0.05)]">
        <div className="text-[#00E676] font-black text-sm tracking-[4px] uppercase">OPTIMIZABLE</div>
        <Link href="/login" className="text-xs text-[#9A9A9A] hover:text-white transition-colors tracking-widest uppercase">
          Already a member?
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="inline-block px-4 py-1.5 border border-[rgba(0,230,118,0.3)] bg-[rgba(0,230,118,0.06)] text-[#00E676] text-[10px] font-bold tracking-[3px] uppercase mb-8">
            Malemaxxing, Quantified
          </div>
          <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-6">
            Know Your Numbers.<br />
            <span className="text-[#00E676]">Optimize Your Biology.</span>
          </h1>
          <p className="text-[#9A9A9A] text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            AI-powered testosterone health analysis. Upload your bloodwork, get your score, and follow a personalized 90-day optimization protocol.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding/phase1"
              className="px-8 py-4 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase hover:bg-[#00c864] transition-colors">
              GET YOUR FREE ASSESSMENT →
            </Link>
            <Link href="/login"
              className="px-8 py-4 border border-[rgba(255,255,255,0.15)] text-white text-sm font-bold tracking-widest uppercase hover:border-[rgba(255,255,255,0.3)] transition-colors">
              SIGN IN
            </Link>
          </div>
          <p className="text-[10px] text-[#4A4A4A] mt-8">
            No account required · 3 minutes · Wellness information only · Not medical advice
          </p>
        </div>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.05)] px-10 py-6">
        <div className="flex flex-wrap justify-center gap-8">
          {['◎ Testosterone Health Score', '⚗ AI Bloodwork Analysis', '▦ 90-Day Protocol', '◷ Daily Tracking'].map(f => (
            <span key={f} className="text-xs text-[#4A4A4A] tracking-wide">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
