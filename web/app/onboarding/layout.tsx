export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-[#C8A2C8] font-black text-sm tracking-[3px] uppercase mb-8">OPTIMIZABLE</div>
        {children}
      </div>
    </div>
  );
}
