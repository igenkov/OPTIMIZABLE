'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      // Email confirmation disabled — session is live, go straight to onboarding
      router.push('/onboarding/phase1');
      router.refresh();
    } else {
      // Email confirmation required — show message
      setError('');
      setLoading(false);
      alert('Check your email and click the confirmation link, then sign in.');
      router.push('/login');
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
          <h1 className="text-base font-bold tracking-widest uppercase text-white mb-2">Create Account</h1>
          <p className="text-xs text-[#9A9A9A] mb-6">Start your optimization journey</p>

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
              placeholder="Min. 6 characters"
              required
            />
            {error && <p className="text-xs text-[#FF5252]">{error}</p>}
            <Button type="submit" loading={loading} fullWidth className="mt-2">
              Create Account →
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#4A4A4A] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00E676] hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[10px] text-[#4A4A4A] mt-4 leading-relaxed">
          By creating an account you agree to our Terms of Service. This app provides wellness information only, not medical advice.
        </p>
      </div>
    </div>
  );
}
