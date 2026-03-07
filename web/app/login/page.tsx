'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Check if onboarding was completed
      const { data: profile } = await supabase.from('profiles').select('age').eq('user_id', data.user.id).single();
      if (profile?.age) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding/phase1');
      }
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-[#00E676] font-black text-2xl tracking-[4px] uppercase mb-1">OPTIMIZABLE</div>
          <div className="text-xs text-[#4A4A4A] tracking-widest">malemaxxing, quantified</div>
        </div>

        <div className="border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] p-8">
          <h1 className="text-base font-bold tracking-widest uppercase text-white mb-6">Sign In</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && <p className="text-xs text-[#FF5252]">{error}</p>}
            <Button type="submit" loading={loading} fullWidth className="mt-2">
              Sign In →
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#4A4A4A] mt-6">
          No account?{' '}
          <Link href="/signup" className="text-[#00E676] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
