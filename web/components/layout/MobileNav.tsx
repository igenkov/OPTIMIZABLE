'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FlaskConical, ClipboardList, HeartPulse, UserCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FREE_NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

const PREMIUM_NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/lab', label: 'Lab', Icon: FlaskConical },
  { href: '/protocol', label: 'Protocol', Icon: ClipboardList },
  { href: '/wellbeing', label: 'Vitality', Icon: HeartPulse },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

export function MobileNav({ tier }: { tier: 'free' | 'premium' | 'expert' }) {
  const pathname = usePathname();
  const isPremium = tier === 'premium' || tier === 'expert';
  const nav = isPremium ? PREMIUM_NAV : FREE_NAV;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#141414] border-t border-[rgba(255,255,255,0.07)] flex safe-area-pb">
      {nav.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
            style={{ color: active ? '#00E676' : '#4A4A4A' }}
          >
            <item.Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00E676] shadow-[0_0_6px_rgba(0,230,118,0.6)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
