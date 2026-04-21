'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SquaresFour, Flask, ClipboardText, Heartbeat, UserCircle } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

const FREE_NAV: { href: string; label: string; Icon: Icon }[] = [
  { href: '/dashboard', label: 'Home', Icon: SquaresFour },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

const PREMIUM_NAV: { href: string; label: string; Icon: Icon }[] = [
  { href: '/dashboard', label: 'Home', Icon: SquaresFour },
  { href: '/lab', label: 'Lab', Icon: Flask },
  { href: '/protocol', label: 'Protocol', Icon: ClipboardText },
  { href: '/wellbeing', label: 'Vitality', Icon: Heartbeat },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

export function MobileNav({ tier }: { tier: 'free' | 'premium' | 'expert' | 'beta' }) {
  const pathname = usePathname();
  const isPremium = tier === 'premium' || tier === 'expert' || tier === 'beta';
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
            style={{ color: active ? '#C8A2C8' : '#4A4A4A' }}
          >
            <item.Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C8A2C8] shadow-[0_0_6px_rgba(200,162,200,0.6)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
