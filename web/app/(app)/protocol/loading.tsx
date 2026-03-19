export default function ProtocolLoading() {
  return (
    <div className="p-8 max-w-3xl animate-pulse">
      <div className="mb-6">
        <div className="h-5 w-48 bg-[rgba(255,255,255,0.08)] rounded mb-2" />
        <div className="h-3 w-56 bg-[rgba(255,255,255,0.04)] rounded" />
      </div>
      <div className="flex gap-2 mb-6">
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 border border-[rgba(255,255,255,0.07)] px-4 py-3">
            <div className="h-2.5 w-14 bg-[rgba(255,255,255,0.06)] rounded mb-2" />
            <div className="h-4 w-20 bg-[rgba(255,255,255,0.07)] rounded mb-1" />
            <div className="h-2.5 w-16 bg-[rgba(255,255,255,0.04)] rounded" />
          </div>
        ))}
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-4 mb-6">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-48 bg-[rgba(255,255,255,0.07)] rounded" />
          <div className="h-3 w-24 bg-[rgba(255,255,255,0.04)] rounded" />
        </div>
        <div className="h-1 bg-[rgba(255,255,255,0.05)] rounded" />
      </div>
      <div className="border border-[rgba(200,162,200,0.1)] p-6 mb-5">
        <div className="h-3 w-32 bg-[rgba(200,162,200,0.1)] rounded mb-4" />
        {[1,2,3,4].map(i => (
          <div key={i} className="py-2.5 border-b border-[rgba(255,255,255,0.05)]">
            <div className="h-4 w-40 bg-[rgba(255,255,255,0.07)] rounded mb-1" />
            <div className="h-3 w-56 bg-[rgba(255,255,255,0.04)] rounded" />
          </div>
        ))}
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-6">
        {[1,2,3].map(i => (
          <div key={i} className="mb-5">
            <div className="h-3 w-28 bg-[rgba(255,255,255,0.06)] rounded mb-3" />
            {[1,2].map(j => (
              <div key={j} className="flex gap-3 mb-2">
                <div className="h-3 w-3 bg-[rgba(255,255,255,0.06)] rounded shrink-0 mt-0.5" />
                <div className="h-3 w-full bg-[rgba(255,255,255,0.04)] rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
