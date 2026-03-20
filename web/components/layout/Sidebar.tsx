'use client';
import Link from 'next/link';
import Image from 'next/image';
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
    <aside className="hidden lg:flex w-56 shrink-0 border-r border-[rgba(255,255,255,0.07)] bg-[#141414] flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-3">
          <Image src="/logo_trsp.png" alt="Optimizable" width={40} height={40} style={{ objectFit: 'contain' }} className="shrink-0"/>
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
        <div className="px-6 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(200,162,200,0.03)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[9px] text-[#C8A2C8] font-bold tracking-widest uppercase">
              {PHASE_LABELS[cycleInfo.phase]}
            </div>
            <div className="text-[9px] text-[#4A4A4A]">
              Day {cycleInfo.day}
            </div>
          </div>
          <div className="h-0.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C8A2C8] transition-all"
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
                  ? 'text-[#C8A2C8] bg-[rgba(200,162,200,0.08)] border-r-2 border-[#C8A2C8]'
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
          <div className="border border-[rgba(200,162,200,0.3)] bg-[rgba(200,162,200,0.04)] p-3">
            <div className="text-[10px] text-[#9A9A9A] leading-relaxed mb-2">
              Upload bloodwork → AI analysis → 90-day protocol
            </div>
            <Link
              href="/upgrade"
              className="block w-full py-1.5 bg-[#C8A2C8] text-black font-black text-[10px] tracking-widest uppercase text-center hover:bg-[#A882A8] transition-colors"
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
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-[#4A4A4A] hover:text-[#E88080] transition-colors tracking-widest uppercase"
        >
          <LogOut size={14} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
