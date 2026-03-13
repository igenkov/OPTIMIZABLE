'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type CycleInfo = { day: number; phase: 1 | 2 | 3 } | null;

const PHASE_LABELS = { 1: 'Foundation', 2: 'Calibration', 3: 'Peak' };

const FREE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/profile', label: 'Profile', icon: '◉' },
];

const PREMIUM_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/lab', label: 'LAB', icon: '⚗' },
  { href: '/protocol', label: 'Protocol', icon: '▦' },
  { href: '/wellbeing', label: 'Wellbeing', icon: '◷' },
  { href: '/profile', label: 'Profile', icon: '◉' },
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
    <aside className="w-56 shrink-0 border-r border-[rgba(255,255,255,0.07)] bg-[#141414] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.07)]">
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
              <span className="text-base w-5 text-center">{item.icon}</span>
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
          className="w-full text-left px-3 py-2 text-xs text-[#4A4A4A] hover:text-[#FF5252] transition-colors tracking-widest uppercase"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
