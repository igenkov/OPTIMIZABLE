'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Activity, ArrowRight, Loader2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    async function verify() {
      if (!sessionId) {
        setStatus('error');
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Poll for subscription activation (webhook may take a moment)
      let attempts = 0;
      const check = async () => {
        const { data } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();

        if (data?.subscription_tier === 'premium' || data?.subscription_tier === 'expert') {
          setStatus('success');
          // Fire welcome email (best-effort, don't block)
          fetch('/api/nurture/welcome', { method: 'POST' }).catch(() => {});
          return;
        }

        attempts++;
        if (attempts < 10) {
          setTimeout(check, 2000);
        } else {
          // Webhook may be delayed - show success anyway (they can refresh)
          setStatus('success');
        }
      };
      check();
    }
    verify();
  }, [sessionId, router]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e]">
        <div className="text-center">
          <Loader2 size={32} className="text-[#C8A2C8] animate-spin mx-auto mb-4" />
          <div className="text-[10px] font-black uppercase tracking-[4px] text-white/40">Activating Subscription...</div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">?</div>
          <div className="text-white font-bold mb-2">Something went wrong</div>
          <div className="text-sm text-[#9A9A9A] mb-6">We could not verify your checkout session. If you were charged, your access will activate shortly.</div>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="max-w-md w-full">
        <Card className="p-10 text-center" style={{ border: '1px solid rgba(200,162,200,0.2)' }}>
          {/* Success icon */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-[#4ADE80]/20 blur-[20px] rounded-full" />
            <div className="relative w-20 h-20 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/30 flex items-center justify-center">
              <Check size={36} className="text-[#4ADE80]" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
            LAB Package Activated
          </h1>
          <p className="text-[11px] text-white/40 uppercase tracking-wide mb-8">
            Your optimization sequence has been initialized
          </p>

          {/* What happens now */}
          <div className="text-left space-y-3 mb-8">
            {[
              'Daily wellbeing tracking is now available',
              'Upload bloodwork when ready for full analysis',
              'Your 90-day protocol begins after analysis',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5">
                <Activity size={12} className="text-[#C8A2C8] shrink-0" />
                <span className="text-[11px] text-white/60">{text}</span>
              </div>
            ))}
          </div>

          <Button onClick={() => router.push('/wellbeing')} fullWidth
            className="py-5 flex items-center justify-center gap-2">
            Start Daily Tracking <ArrowRight size={16} />
          </Button>

          <button type="button" onClick={() => router.push('/dashboard')}
            className="mt-3 text-[10px] font-black text-white/30 uppercase tracking-[2px] hover:text-white/50 transition-colors">
            Go to Dashboard
          </button>
        </Card>
      </div>
    </div>
  );
}
