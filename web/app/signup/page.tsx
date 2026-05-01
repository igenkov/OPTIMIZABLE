'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  Fingerprint,
  Lock,
  WarningCircle,
  ShieldCheck,
  UserPlus,
  Envelope,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

function AuthModule({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/[0.08] bg-[#141414]/50 py-2.5 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.04]"
    >
      <div className="absolute inset-y-0 left-0 w-0.5 bg-transparent transition-colors group-hover:bg-[#E8C470]" />
      {children}
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/55 transition-colors group-hover:text-white/85">
        {label}
      </span>
    </button>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Security Protocol: Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
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
        await Promise.all([
          p1.age ? supabase.from('profiles').upsert({ user_id: userId, ...p1 }) : null,
          p2?.avg_sleep_hours !== undefined ? supabase.from('lifestyle').upsert({ user_id: userId, ...p2 }) : null,
          p3?.steroid_history ? supabase.from('medical_history').upsert({ user_id: userId, ...p3 }) : null,
          sym?.symptoms_selected ? supabase.from('symptom_assessments').upsert({ user_id: userId, ...sym }) : null,
        ]);
        localStorage.removeItem('phase1');
        localStorage.removeItem('phase2');
        localStorage.removeItem('phase3');
        localStorage.removeItem('symptoms');
        router.push('/dashboard');
      } else {
        router.push('/onboarding/phase1');
      }
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  async function signInWithProvider(provider: 'google' | 'facebook' | 'twitter') {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (success) {
    return (
      <div
        className={cn(
          'relative flex min-h-[100dvh] flex-col bg-[#0e0e0e]',
          'lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-0 lg:flex-row lg:overflow-hidden'
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 40% at 15% 20%, rgba(200,162,200,0.09) 0%, transparent 50%), radial-gradient(ellipse 40% 35% at 90% 10%, rgba(74,222,128,0.05) 0%, transparent 52%)',
          }}
        />

        <aside className="relative z-10 flex shrink-0 flex-col items-center justify-center border-b border-white/[0.06] px-6 py-8 lg:w-[min(42%,420px)] lg:border-b-0 lg:border-r lg:py-10 lg:pl-10 lg:pr-8">
          <Link href="/" className="mb-3 block lg:mb-4">
            <Image src="/logo_trsp.png" alt="Optimizable" width={52} height={52} style={{ objectFit: 'contain' }} />
          </Link>
          <div
            className="text-center text-xl font-bold uppercase tracking-[0.18em] text-white lg:text-2xl"
            style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}
          >
            OPTIMIZABLE
          </div>
          <div className="mt-2 flex items-center gap-2 lg:mt-3">
            <div className="h-px w-3 bg-white/10 lg:w-4" />
            <div
              className="text-[0.58rem] uppercase tracking-[0.28em] text-white/35 lg:text-[0.62rem]"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}
            >
              Identity Verification
            </div>
            <div className="h-px w-3 bg-white/10 lg:w-4" />
          </div>
        </aside>

        <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 lg:px-10 lg:py-6">
          <div className="w-full max-w-md lg:max-w-[400px]">
            <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.5)">
              <header className="mb-5 border-b border-white/[0.07] pb-4 lg:mb-6">
                <h1 className="mb-1 text-base font-black uppercase tracking-tight text-white lg:text-lg">
                  Verification Required
                </h1>
                <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">
                  <Envelope size={12} className="shrink-0 text-[#C8A2C8]" aria-hidden />
                  Secure Link Dispatched
                </p>
              </header>

              <p className="mb-6 text-[11px] font-medium leading-relaxed text-white/45 lg:mb-7">
                A secure initialization link has been sent to{' '}
                <span className="font-semibold text-white/80">{email}</span>. Confirm your identity to unlock your
                diagnostic workspace.
              </p>

              <Button
                type="button"
                onClick={() => router.push('/login')}
                fullWidth
                className="flex items-center justify-center gap-2 rounded-lg py-3.5 shadow-[0_8px_28px_rgba(200,162,200,0.18)] lg:py-4"
              >
                Return to Authenticate <Fingerprint size={16} aria-hidden />
              </Button>
            </Card>

            <div className="mt-5 flex flex-col items-center gap-3 text-center lg:mt-4 lg:flex-row lg:justify-between lg:gap-4 lg:text-left">
              <p className="max-w-[280px] text-[8px] font-black uppercase leading-relaxed tracking-[0.12em] text-white/22 lg:max-w-none">
                Did not receive mail? Check spam, or wait a few minutes before requesting again from sign in.
              </p>
              <div className="flex shrink-0 items-center gap-1.5 text-white/25">
                <ShieldCheck size={16} className="text-[#4ade80]/70" aria-hidden />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">System Secure</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-[100dvh] flex-col bg-[#0e0e0e]',
        'lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-0 lg:flex-row lg:overflow-hidden'
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 15% 20%, rgba(200,162,200,0.09) 0%, transparent 50%), radial-gradient(ellipse 40% 35% at 90% 10%, rgba(74,222,128,0.05) 0%, transparent 52%)',
        }}
      />

      <aside className="relative z-10 flex shrink-0 flex-col items-center justify-center border-b border-white/[0.06] px-6 py-8 lg:w-[min(42%,420px)] lg:border-b-0 lg:border-r lg:py-10 lg:pl-10 lg:pr-8">
        <Link href="/" className="mb-3 block lg:mb-4">
          <Image src="/logo_trsp.png" alt="Optimizable" width={52} height={52} style={{ objectFit: 'contain' }} />
        </Link>
        <div
          className="text-center text-xl font-bold uppercase tracking-[0.18em] text-white lg:text-2xl"
          style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}
        >
          OPTIMIZABLE
        </div>
        <div className="mt-2 flex items-center gap-2 lg:mt-3">
          <div className="h-px w-3 bg-white/10 lg:w-4" />
          <div
            className="text-[0.58rem] uppercase tracking-[0.28em] text-white/35 lg:text-[0.62rem]"
            style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}
          >
            Profile Initialization
          </div>
          <div className="h-px w-3 bg-white/10 lg:w-4" />
        </div>
      </aside>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 lg:px-10 lg:py-6">
        <div className="w-full max-w-md lg:max-w-[400px]">
          <Card className="rounded-lg p-6 lg:p-7" topAccent="rgba(200,162,200,0.5)">
            <header className="mb-5 border-b border-white/[0.07] pb-4 lg:mb-6">
              <h1 className="mb-1 text-base font-black uppercase tracking-tight text-white lg:text-lg">
                Create Clinical Profile
              </h1>
              <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">
                <ShieldCheck size={12} className="shrink-0 text-[#C8A2C8]" aria-hidden />
                Encrypted Data Initialization
              </p>
            </header>

            <div className="mb-5 grid grid-cols-1 gap-2 lg:mb-5">
              <AuthModule onClick={() => signInWithProvider('google')} label="Initialize with Google">
                <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </AuthModule>
              <div className="grid grid-cols-2 gap-2">
                <AuthModule onClick={() => signInWithProvider('facebook')} label="Facebook">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" className="shrink-0">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </AuthModule>
                <AuthModule onClick={() => signInWithProvider('twitter')} label="X / Twitter">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-white/55">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </AuthModule>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-3 lg:mb-5">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.22em] text-white/25">Credentials</span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-[0.18em] text-white/40">Identity (Email)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-[0.18em] text-white/40">Access Key (Password)</label>
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/15" aria-hidden />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] p-2.5 text-[9px] font-black uppercase leading-snug tracking-wide text-red-400">
                  <WarningCircle size={14} className="shrink-0" aria-hidden />
                  <span>Initialization Failed: {error}</span>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                className="flex items-center justify-center gap-2 rounded-lg py-3.5 shadow-[0_8px_28px_rgba(200,162,200,0.18)] lg:py-4"
              >
                {!loading && (
                  <>
                    Establish Profile <UserPlus size={16} aria-hidden />
                  </>
                )}
              </Button>
            </form>
          </Card>

          <div className="mt-5 flex flex-col gap-4 lg:mt-4">
            <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:justify-between lg:gap-4 lg:text-left">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                Existing Member?{' '}
                <Link
                  href="/login"
                  className="ml-1 text-[#C8A2C8] underline decoration-[#C8A2C8]/35 underline-offset-2 transition-colors hover:text-white"
                >
                  Authenticate Here
                </Link>
              </p>
              <div className="flex items-center gap-1.5 text-white/25">
                <ShieldCheck size={16} className="text-[#4ade80]/70" aria-hidden />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">System Secure</span>
              </div>
            </div>
            <p className="text-center text-[8px] font-black uppercase leading-relaxed tracking-[0.12em] text-white/22 lg:text-left">
              By initializing, you confirm this is a personal health dashboard. Data is encrypted and used only for your
              90-day optimization protocol.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
