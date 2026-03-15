import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
  const tier = userData?.subscription_tier ?? 'free';

  return (
    <div className="px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-[11px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Account</div>
        <h1 className="text-xl font-black tracking-[2px] uppercase text-white">Profile</h1>
      </div>

      {/* Account card */}
      <Card className="mb-5 text-center py-10">
        <div className="w-16 h-16 rounded-full border-2 border-[#00E676] bg-[rgba(0,230,118,0.12)] flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-black text-[#00E676]">{user.email?.charAt(0).toUpperCase()}</span>
        </div>
        <div className="text-sm text-[#E0E0E0] mb-3">{user.email}</div>
        <span className={`inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase border
          ${tier === 'premium' ? 'border-[#FFB300] text-[#FFB300] bg-[rgba(255,179,0,0.08)]' : 'border-[#4A4A4A] text-[#9A9A9A] bg-[#1f1f1f]'}`}>
          {tier === 'premium' ? '⭐ Premium' : 'Free Tier'}
        </span>
      </Card>

      {/* Menu */}
      {[
        { title: 'Account', items: [
          { icon: '👤', label: 'Edit Personal Details', href: '/onboarding/phase1' },
          { icon: '🩸', label: 'Retake Symptom Assessment', href: '/onboarding/symptoms' },
        ]},
        { title: 'Legal', items: [
          { icon: '⚕️', label: 'Medical Disclaimer', href: '#disclaimer' },
          { icon: '🛡️', label: 'Privacy Policy', href: '#privacy' },
        ]},
      ].map(section => (
        <div key={section.title} className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#4A4A4A] uppercase mb-3">{section.title}</div>
          <Card className="p-0 overflow-hidden">
            {section.items.map((item, i) => (
              <a key={item.label} href={item.href}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors
                  ${i < section.items.length - 1 ? 'border-b border-[rgba(255,255,255,0.07)]' : ''}`}>
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span className="flex-1 text-sm text-[#E0E0E0]">{item.label}</span>
                <span className="text-[#4A4A4A] text-xl">›</span>
              </a>
            ))}
          </Card>
        </div>
      ))}

      <div className="border border-[rgba(255,255,255,0.07)] border-l-2 border-l-[#00E676] p-4 mb-6">
        <p className="text-[11px] text-[#4A4A4A] leading-relaxed">
          ⚕️ Optimizable is a wellness tool for informational purposes only. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.
        </p>
      </div>

      <p className="text-center text-[10px] text-[#4A4A4A]">Optimizable v1.0.0 · malemaxxing quantified</p>
    </div>
  );
}
