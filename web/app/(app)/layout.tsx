import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tier: 'free' | 'premium' | 'expert' | 'beta' = 'free';
  let cycleInfo: { day: number; phase: 1 | 2 | 3 } | null = null;

  if (user) {
    const [userRes, cycleRes] = await Promise.all([
      supabase.from('users').select('subscription_tier').eq('id', user.id).single(),
      supabase.from('optimization_cycles').select('start_date').eq('user_id', user.id).eq('status', 'active').single(),
    ]);

    tier = (userRes.data?.subscription_tier as typeof tier | null) ?? 'free';

    // During free beta: auto-upgrade free users so all DB-gated checks pass
    if (process.env.NEXT_PUBLIC_BETA_PERIOD === 'true' && tier === 'free') {
      tier = 'beta';
      supabase.from('users').update({ subscription_tier: 'beta', beta_cohort_joined_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
    }

    if (cycleRes.data) {
      const startDate = new Date(cycleRes.data.start_date);
      const today = new Date();
      const day = Math.min(90, Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1));
      const phase: 1 | 2 | 3 = day <= 30 ? 1 : day <= 60 ? 2 : 3;
      cycleInfo = { day, phase };
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tier={tier} cycleInfo={cycleInfo} />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {children}
      </main>
      <MobileNav tier={tier} />
    </div>
  );
}
