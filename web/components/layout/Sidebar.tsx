'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/bloodwork/upload', label: 'Upload Bloodwork', icon: '⚗' },
  { href: '/results', label: 'Results', icon: '◎' },
  { href: '/plan', label: 'My Plan', icon: '▦' },
  { href: '/journal', label: 'Daily Journal', icon: '◷' },
  { href: '/profile', label: 'Profile', icon: '◉' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-56 shrink-0 border-r border-[rgba(255,255,255,0.07)] bg-[#141414] flex flex-col min-h-screen">
      <div className="p-6 border-b border-[rgba(255,255,255,0.07)]">
        <div className="text-[#00E676] font-black text-sm tracking-[3px] uppercase">OPTIMIZABLE</div>
        <div className="text-[10px] text-[#4A4A4A] tracking-widest mt-0.5">malemaxxing, quantified</div>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map(item => {
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
