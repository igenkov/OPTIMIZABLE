'use client';
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 max-w-xl">
      <div className="border border-[rgba(255,82,82,0.3)] bg-[rgba(255,82,82,0.05)] p-6">
        <div className="text-xs font-bold text-[#FF5252] tracking-widest uppercase mb-2">Dashboard Error</div>
        <div className="text-sm text-white mb-2">{error.message}</div>
        <pre className="text-[10px] text-[#4A4A4A] whitespace-pre-wrap break-all mb-4">{error.stack}</pre>
        <button onClick={reset} className="px-4 py-2 border border-[rgba(255,255,255,0.15)] text-xs text-white hover:border-white transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
