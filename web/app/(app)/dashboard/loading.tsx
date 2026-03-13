export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-2.5 w-48 bg-[rgba(255,255,255,0.05)] rounded mb-2" />
          <div className="h-6 w-56 bg-[rgba(255,255,255,0.08)] rounded" />
        </div>
        <div className="h-2.5 w-32 bg-[rgba(255,255,255,0.04)] rounded" />
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-[rgba(255,255,255,0.05)] bg-[#141414] p-5 h-64">
            <div className="h-2.5 w-32 bg-[rgba(255,255,255,0.05)] rounded mb-4" />
            {i === 1 && (
              <div className="flex flex-col items-center gap-3 mt-4">
                <div className="w-40 h-28 bg-[rgba(255,255,255,0.04)] rounded" />
                <div className="h-2.5 w-24 bg-[rgba(255,255,255,0.04)] rounded" />
              </div>
            )}
            {i !== 1 && (
              <div className="flex flex-col gap-4 mt-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 w-28 bg-[rgba(255,255,255,0.06)] rounded mb-1.5" />
                      <div className="h-2.5 w-full bg-[rgba(255,255,255,0.03)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-[rgba(255,255,255,0.05)] bg-[#141414] p-5 h-56">
            <div className="h-2.5 w-32 bg-[rgba(255,255,255,0.05)] rounded mb-4" />
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-2.5 bg-[rgba(255,255,255,0.04)] rounded" style={{ width: `${70 + j * 5}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
