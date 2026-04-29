import Image from 'next/image';

const ONBOARDING_BG =
  'radial-gradient(ellipse 70% 45% at 0% 0%, rgba(200,162,200,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 32% at 100% 12%, rgba(74,222,128,0.06) 0%, transparent 58%)';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0e0e0e]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 min-h-full"
        style={{ background: ONBOARDING_BG }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 px-4 pb-6 pt-8 lg:px-10">
          <Image src="/logo_trsp.png" alt="Optimizable" width={36} height={36} style={{ objectFit: 'contain' }} />
          <span className="text-[#C8A2C8] font-black text-sm tracking-[3px] uppercase">OPTIMIZABLE</span>
        </div>
        {children}
      </div>
    </div>
  );
}
