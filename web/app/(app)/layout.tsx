import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tier: 'free' | 'premium' | 'expert' = 'free';
  let cycleInfo: { day: number; phase: 1 | 2 | 3 } | null = null;

  if (user) {
    const [userRes, cycleRes] = await Promise.all([
      supabase.from('users').select('subscription_tier').eq('id', user.id).single(),
      supabase.from('optimization_cycles').select('start_date').eq('user_id', user.id).eq('status', 'active').single(),
    ]);

    tier = (userRes.data?.subscription_tier as typeof tier) ?? 'free';

    if (cycleRes.data) {
      const startDate = new Date(cycleRes.data.start_date);
      const today = new Date();
      const day = Math.min(90, Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1));
      const phase: 1 | 2 | 3 = day <= 30 ? 1 : day <= 60 ? 2 : 3;
      cycleInfo = { day, phase };
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar tier={tier} cycleInfo={cycleInfo} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
