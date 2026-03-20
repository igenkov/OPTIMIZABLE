export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo_trsp.png" alt="Optimizable" width={36} height={36} style={{ objectFit: 'contain' }}/>
          <span className="text-[#C8A2C8] font-black text-sm tracking-[3px] uppercase">OPTIMIZABLE</span>
        </div>
        {children}
      </div>
    </div>
  );
}
