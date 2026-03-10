'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function SocialButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-3 w-full py-2.5 border border-[rgba(255,255,255,0.1)] text-sm text-[#E0E0E0] hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
    >
      {children}
    </button>
  );
}

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
      const userId = data.session.user.id;
      const p1Raw = localStorage.getItem('phase1');
      const p2Raw = localStorage.getItem('phase2');
      const p3Raw = localStorage.getItem('phase3');
      const symRaw = localStorage.getItem('symptoms');
      if (p1Raw) {
        const p1 = JSON.parse(p1Raw);
        const p2 = p2Raw ? JSON.parse(p2Raw) : null;
        const p3 = p3Raw ? JSON.parse(p3Raw) : null;
        const sym = symRaw ? JSON.parse(symRaw) : null;
        const results = await Promise.all([
          p1.age && supabase.from('profiles').upsert({ user_id: userId, ...p1 }),
          p2?.avg_sleep_hours !== undefined && supabase.from('lifestyle').upsert({ user_id: userId, ...p2 }),
          p3?.steroid_history && supabase.from('medical_history').upsert({ user_id: userId, ...p3 }),
          sym?.symptoms_selected && supabase.from('symptom_assessments').insert({ user_id: userId, ...sym }),
        ]);
        const saveError = results.find(r => r && typeof r === 'object' && 'error' in r && r.error);
        if (saveError && typeof saveError === 'object' && 'error' in saveError) {
          setError(`Save failed: ${(saveError.error as { message: string }).message}`);
          setLoading(false);
          return;
        }
        router.push('/dashboard');
      } else {
        router.push('/onboarding/phase1');
      }
      router.refresh();
    } else {
      setLoading(false);
      alert('Check your email and click the confirmation link, then sign in.');
      router.push('/login');
    }
  }

  async function signInWithProvider(provider: 'google' | 'facebook' | 'twitter') {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-[#00E676] font-black text-2xl tracking-[4px] uppercase mb-1">OPTIMIZABLE</div>
          <div className="text-xs text-[#4A4A4A] tracking-widest">malemaxxing, quantified</div>
        </div>

        <div className="border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] p-8">
          <h1 className="text-base font-bold tracking-widests uppercase text-white mb-2">Create Account</h1>
          <p className="text-xs text-[#9A9A9A] mb-6">Start your optimization journey</p>

          {/* Social login */}
          <div className="flex flex-col gap-2 mb-6">
            <SocialButton onClick={() => signInWithProvider('google')}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </SocialButton>
            <SocialButton onClick={() => signInWithProvider('facebook')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </SocialButton>
            <SocialButton onClick={() => signInWithProvider('twitter')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Continue with X
            </SocialButton>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]" />
            <span className="text-[10px] text-[#4A4A4A] tracking-widest uppercase">or email</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]" />
          </div>

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
