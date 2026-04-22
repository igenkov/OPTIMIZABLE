import Image from 'next/image';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <div className="flex items-center gap-3 px-4 lg:px-10 pt-8 pb-6">
        <Image src="/logo_trsp.png" alt="Optimizable" width={36} height={36} style={{ objectFit: 'contain' }}/>
        <span className="text-[#C8A2C8] font-black text-sm tracking-[3px] uppercase">OPTIMIZABLE</span>
      </div>
      {children}
    </div>
  );
}
