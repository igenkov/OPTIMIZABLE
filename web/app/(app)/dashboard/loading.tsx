export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-32 bg-[rgba(255,255,255,0.06)] rounded mb-3" />
        <div className="h-5 w-48 bg-[rgba(255,255,255,0.08)] rounded mb-2" />
        <div className="h-3 w-40 bg-[rgba(255,255,255,0.04)] rounded" />
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-8 mb-5 text-center">
        <div className="h-3 w-36 bg-[rgba(255,255,255,0.06)] rounded mx-auto mb-4" />
        <div className="h-20 w-20 bg-[rgba(255,255,255,0.08)] rounded mx-auto mb-4" />
        <div className="h-1.5 max-w-xs bg-[rgba(255,255,255,0.05)] rounded mx-auto" />
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-6 mb-5">
        <div className="h-3 w-40 bg-[rgba(255,255,255,0.06)] rounded mb-5" />
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="border-l-2 border-[rgba(255,255,255,0.07)] pl-4">
              <div className="h-4 w-36 bg-[rgba(255,255,255,0.07)] rounded mb-2" />
              <div className="h-3 w-full bg-[rgba(255,255,255,0.04)] rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-6">
        <div className="h-3 w-32 bg-[rgba(255,255,255,0.06)] rounded mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i}>
              <div className="h-2.5 w-12 bg-[rgba(255,255,255,0.04)] rounded mb-1.5" />
              <div className="h-4 w-16 bg-[rgba(255,255,255,0.07)] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
