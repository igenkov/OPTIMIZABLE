'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { User, Droplets, Shield, Scale, Calendar, Activity, Flame, FlaskConical, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from './SignOutButton';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [userRes, cycleRes, checkinsRes] = await Promise.all([
    supabase.from('users').select('subscription_tier').eq('id', user.id).single(),
    supabase.from('optimization_cycles').select('start_date').eq('user_id', user.id).eq('status', 'active').single(),
    supabase.from('daily_checkins').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
  ]);

  const tier = (userRes.data?.subscription_tier as 'free' | 'premium' | 'expert') ?? 'free';
  const isPremium = tier === 'premium' || tier === 'expert';

  // Cycle stats
  let cycleDay = 0;
  let phase: 1 | 2 | 3 = 1;
  let nextLabDays = 0;
  if (cycleRes.data) {
    const start = new Date(cycleRes.data.start_date);
    const today = new Date();
    cycleDay = Math.min(90, Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));
    phase = cycleDay <= 30 ? 1 : cycleDay <= 60 ? 2 : 3;
    const nextLabTarget = new Date(start);
    nextLabTarget.setDate(nextLabTarget.getDate() + phase * 30);
    nextLabDays = Math.max(0, Math.ceil((nextLabTarget.getTime() - today.getTime()) / 86400000));
  }
  const PHASE_LABELS = { 1: 'Foundation', 2: 'Calibration', 3: 'Peak' } as const;

  // Streak
  const dates = (checkinsRes.data ?? []).map(c => c.date);
  let streak = 0;
  if (dates.length) {
    const todayStr = new Date().toISOString().split('T')[0];
    let cursor = todayStr;
    for (const d of dates) {
      if (d === cursor) {
        streak++;
        const dt = new Date(cursor);
        dt.setDate(dt.getDate() - 1);
        cursor = dt.toISOString().split('T')[0];
      } else break;
    }
  }

  const initial = user.email?.charAt(0).toUpperCase() ?? '?';

  const stats = [
    { label: 'Cycle Day',  value: cycleDay ? `Day ${cycleDay}` : '—',       icon: Calendar,     accent: '#00E676' },
    { label: 'Phase',      value: cycleDay ? PHASE_LABELS[phase] : '—',      icon: Activity,     accent: '#64B5F6' },
    { label: 'Streak',     value: streak   ? `${streak} Days` : '—',         icon: Flame,        accent: '#FFB300' },
    { label: 'Next Lab',   value: cycleDay ? `${nextLabDays}d` : '—',        icon: FlaskConical, accent: '#CE93D8' },
  ] as const;

  const menuSections = [
    { title: 'Account', items: [
      { icon: User,     label: 'Edit Personal Details',     href: '/onboarding/phase1' },
      { icon: Droplets, label: 'Retake Symptom Assessment', href: '/onboarding/symptoms' },
    ]},
    { title: 'Legal', items: [
      { icon: Shield,   label: 'Medical Disclaimer',        href: '#disclaimer' },
      { icon: Scale,    label: 'Privacy Policy',            href: '#privacy' },
    ]},
  ];

  return (
    <div className="px-6 lg:px-8 py-6">

      {/* Header */}
      <div className="mb-6">
        <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Command Center</div>
        <h1 className="text-xl font-black tracking-[2px] uppercase text-white">Profile</h1>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 flex flex-col gap-6">

        {/* ── LEFT: Identity + Stats (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* Identity card */}
          <Card topAccent="rgba(0,230,118,0.5)" className="relative overflow-hidden">
            {/* Radial glow */}
            <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(0,230,118,0.06) 0%, transparent 70%)' }} />

            <div className="flex flex-col items-center pt-2 pb-4 relative">
              {/* Avatar with pulsing ring */}
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(0,230,118,0.15)', animationDuration: '2.5s' }} />
                <div className="relative w-16 h-16 rounded-full border-2 border-[#00E676] flex items-center justify-center"
                  style={{ background: 'radial-gradient(circle, rgba(0,230,118,0.15) 0%, rgba(20,20,20,0) 70%), #141414',
                           boxShadow: '0 0 20px rgba(0,230,118,0.18)' }}>
                  <span className="text-2xl font-black text-[#00E676]">{initial}</span>
                </div>
              </div>

              {/* Email */}
              <div className="mb-3">
                <span className="text-sm text-[#E0E0E0] font-mono">{user.email}</span>
              </div>

              {/* Subscription badge */}
              {isPremium ? (
                <div className="px-4 py-1.5 border text-xs font-black tracking-widest uppercase"
                  style={{ borderColor: 'rgba(255,179,0,0.6)', color: '#FFB300',
                           background: 'linear-gradient(90deg, rgba(255,179,0,0.08), rgba(255,179,0,0.04), rgba(255,179,0,0.08))',
                           boxShadow: '0 0 12px rgba(255,179,0,0.1)' }}>
                  ⭐ Premium
                </div>
              ) : (
                <div className="px-4 py-1.5 border border-[rgba(255,255,255,0.1)] text-xs font-black tracking-widest uppercase text-[#9A9A9A] bg-[rgba(255,255,255,0.03)]">
                  Free Tier
                </div>
              )}
            </div>

            {/* Upgrade CTA — free users */}
            {!isPremium && (
              <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
                <Link href="/upgrade"
                  className="block w-full py-2 bg-[#00E676] text-black font-black text-[10px] tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors">
                  UPGRADE TO PREMIUM →
                </Link>
              </div>
            )}
          </Card>

          {/* Stats bento — cycle active only */}
          {cycleDay > 0 && (
            <div>
              <div className="text-[9px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-2">Cycle Stats</div>
              <div className="grid grid-cols-2 gap-2">
                {stats.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="p-3 border border-[rgba(255,255,255,0.06)]"
                      style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.03) 0%, rgba(20,20,20,0) 60%), #141414',
                               borderTopColor: s.accent }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon size={10} style={{ color: s.accent }} />
                        <div className="text-[9px] text-[#4A4A4A] uppercase tracking-[2px]">{s.label}</div>
                      </div>
                      <div className="font-mono font-black text-sm tracking-widest text-white">{s.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Settings + Legal (8 cols) ── */}
        <div className="lg:col-span-8 flex flex-col gap-5">

          {menuSections.map(section => (
            <div key={section.title}>
              <div className="text-[9px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-2">{section.title}</div>
              <Card className="p-0 overflow-hidden">
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.label} href={item.href}
                      className={`group flex items-center gap-4 px-5 py-4 transition-all duration-200
                        hover:bg-[rgba(255,255,255,0.05)] hover:pl-6 border-l-2 border-l-transparent hover:border-l-[#00E676]
                        ${i < section.items.length - 1 ? 'border-b border-[rgba(255,255,255,0.07)]' : ''}`}>
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Icon size={14} className="text-[#9A9A9A] group-hover:text-[#00E676] transition-colors duration-200" />
                      </div>
                      <span className="flex-1 text-sm text-[#E0E0E0] group-hover:text-white transition-colors duration-200">
                        {item.label}
                      </span>
                      <ChevronRight size={14} className="text-[#3A3A3A] group-hover:text-[#00E676] group-hover:translate-x-1 transition-all duration-200" />
                    </a>
                  );
                })}
              </Card>
            </div>
          ))}

          {/* Disclaimer */}
          <div className="border-l-2 border-[#00E676] px-4 py-4"
            style={{ background: 'rgba(0,230,118,0.03)',
                     borderRight: '1px solid rgba(255,255,255,0.05)',
                     borderTop: '1px solid rgba(255,255,255,0.05)',
                     borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-[9px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2 font-mono">
              SYSTEM_NOTICE: [DISCLAIMER]
            </div>
            <p className="text-[11px] text-[#4A4A4A] leading-relaxed font-mono opacity-80">
              Optimizable is a wellness tool for informational purposes only. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making decisions based on this information.
            </p>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[#3A3A3A] font-mono">v1.0.0 · malemaxxing quantified</span>
            <SignOutButton />
          </div>

        </div>
      </div>
    </div>
  );
}
