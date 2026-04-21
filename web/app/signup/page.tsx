'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  WarningCircle,
  Lightning
} from '@phosphor-icons/react';

function SocialModule({
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
      className="group relative flex items-center justify-center gap-3 w-full py-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-1 group-hover:bg-[#C8A2C8] transition-all" />
      {children}
      <span className="text-[10px] font-black uppercase tracking-[2px] text-white/60 group-hover:text-white">
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
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-[#C8A2C8]/10 border border-[#C8A2C8]/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(200,162,200,0.1)]">
            <Mail className="text-[#C8A2C8]" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Verification Required</h1>
          <p className="text-sm text-white/40 leading-relaxed mb-8">
            A secure initialization link has been sent to <span className="text-white">{email}</span>. Confirm your identity to unlock your diagnostic results.
          </p>
          <Button onClick={() => router.push('/login')} fullWidth className="py-5">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4 py-12">
      <div className="w-full max-w-md">

        {/* BRANDING */}
        <div className="flex flex-col items-center mb-12">
          <Link href="/" className="relative mb-4 block">
            <Image src="/logo_trsp.png" alt="Optimizable" width={64} height={64} style={{ objectFit: 'contain' }}/>
          </Link>
          <div className="text-white font-bold uppercase tracking-[0.2em] text-2xl"
            style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}>
            OPTIMIZABLE
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-4 bg-white/10" />
            <div className="text-[#4A4A4A] uppercase tracking-[0.3em] text-[0.6rem]"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}>
              Security Gateway
            </div>
            <div className="h-px w-4 bg-white/10" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-[#C8A2C8]/40" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-[#C8A2C8]/40" />

          <div className="border border-white/5 bg-white/[0.02] p-8 md:p-10">
            <header className="mb-10">
              <h1 className="text-lg font-black tracking-tight text-white uppercase mb-1">Create Clinical Profile</h1>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} className="text-[#C8A2C8]" />
                Encrypted Data Initialization
              </p>
            </header>

            {/* Social Auth */}
            <div className="grid grid-cols-1 gap-2 mb-8">
              <SocialModule onClick={() => signInWithProvider('google')} label="Initialize with Google">
                <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </SocialModule>
              <div className="grid grid-cols-2 gap-2">
                <SocialModule onClick={() => signInWithProvider('facebook')} label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" className="shrink-0">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </SocialModule>
                <SocialModule onClick={() => signInWithProvider('twitter')} label="X / Twitter">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/60 shrink-0">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </SocialModule>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] text-white/20 font-black tracking-[4px] uppercase">or email sequence</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Identity (Email)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Access Key (Password)</label>
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none" size={16} />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                  <WarningCircle size={14} />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                className="py-5 flex items-center justify-center gap-2"
              >
                {!loading && <>Establish Profile <ArrowRight size={16} /></>}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <p className="text-center text-[10px] font-black tracking-[2px] text-white/20 uppercase">
            Existing Member?{' '}
            <Link href="/login" className="text-[#C8A2C8] hover:text-white transition-colors ml-2 underline underline-offset-4">
              Authenticate Here
            </Link>
          </p>

          <div className="p-4 bg-white/[0.02] border border-white/5">
            <div className="flex gap-3 items-start">
              <Lightning size={14} className="text-[#E8C470] shrink-0 mt-0.5" />
              <p className="text-[9px] text-white/30 leading-relaxed uppercase font-bold tracking-tight">
                By initializing, you confirm this is a personal health dashboard. Data is encrypted and used only for your 90-day optimization protocol.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
