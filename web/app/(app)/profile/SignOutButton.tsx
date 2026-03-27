'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem('phase1');
    localStorage.removeItem('phase2');
    localStorage.removeItem('phase3');
    localStorage.removeItem('symptoms');
    router.push('/login');
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-[11px] font-bold tracking-widest uppercase text-[#4A4A4A] hover:text-[#E88080] transition-colors duration-200"
    >
      Sign Out
    </button>
  );
}
