'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, FlaskConical, ClipboardList, HeartPulse, UserCircle, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type CycleInfo = { day: number; phase: 1 | 2 | 3 } | null;

const PHASE_LABELS = { 1: 'Foundation', 2: 'Calibration', 3: 'Peak' };

const FREE_NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

const PREMIUM_NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/lab', label: 'LAB', Icon: FlaskConical },
  { href: '/protocol', label: 'Protocol', Icon: ClipboardList },
  { href: '/wellbeing', label: 'Wellbeing', Icon: HeartPulse },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

export function Sidebar({ tier, cycleInfo }: { tier: 'free' | 'premium' | 'expert'; cycleInfo: CycleInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPremium = tier === 'premium' || tier === 'expert';
  const nav = isPremium ? PREMIUM_NAV : FREE_NAV;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const phaseDay = cycleInfo ? ((cycleInfo.day - 1) % 30) : 0;
  const phaseProgress = Math.round((phaseDay / 30) * 100);

  return (
    <aside className="w-56 shrink-0 border-r border-[rgba(255,255,255,0.07)] bg-[#141414] flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.07)]">
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
            <div
              className="text-white font-bold uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", fontSize: "1.15rem" }}
            >
              OPTIMIZABLE
            </div>
            <div
              className="text-[#4A4A4A] uppercase tracking-[0.18em] mt-0.5"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)", fontSize: "0.58rem" }}
            >
              MALEMAXXING QUANTIFIED
            </div>
          </div>
        </div>
      </div>

      {/* Phase progress bar — premium only */}
      {isPremium && cycleInfo && (
        <div className="px-6 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(0,230,118,0.03)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[9px] text-[#00E676] font-bold tracking-widest uppercase">
              {PHASE_LABELS[cycleInfo.phase]}
            </div>
            <div className="text-[9px] text-[#4A4A4A]">
              Day {cycleInfo.day}
            </div>
          </div>
          <div className="h-0.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00E676] transition-all"
              style={{ width: `${phaseProgress}%` }}
            />
          </div>
          <div className="text-[9px] text-[#4A4A4A] mt-1">
            {30 - phaseDay} days until next panel
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors
                ${active
                  ? 'text-[#00E676] bg-[rgba(0,230,118,0.08)] border-r-2 border-[#00E676]'
                  : 'text-[#9A9A9A] hover:text-white hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              <item.Icon size={16} className="shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade CTA — free users */}
      {!isPremium && (
        <div className="px-4 pb-3 pt-2 border-t border-[rgba(255,255,255,0.07)]">
          <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-2 px-1">Unlock LAB</div>
          <div className="border border-[rgba(0,230,118,0.3)] bg-[rgba(0,230,118,0.04)] p-3">
            <div className="text-[10px] text-[#9A9A9A] leading-relaxed mb-2">
              Upload bloodwork → AI analysis → 90-day protocol
            </div>
            <Link
              href="/upgrade"
              className="block w-full py-1.5 bg-[#00E676] text-black font-black text-[10px] tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors"
            >
              UPGRADE →
            </Link>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.07)]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-[#4A4A4A] hover:text-[#FF5252] transition-colors tracking-widest uppercase"
        >
          <LogOut size={14} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
