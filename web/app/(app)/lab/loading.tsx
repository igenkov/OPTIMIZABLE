export default function LabLoading() {
  return (
    <div className="p-8 max-w-3xl animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-24 bg-[rgba(255,255,255,0.06)] rounded mb-3" />
        <div className="h-5 w-40 bg-[rgba(255,255,255,0.08)] rounded mb-2" />
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-6 mb-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="h-3 w-28 bg-[rgba(255,255,255,0.06)] rounded mb-2" />
            <div className="h-16 w-20 bg-[rgba(255,255,255,0.08)] rounded" />
          </div>
          <div className="h-8 w-32 bg-[rgba(255,255,255,0.06)] rounded" />
        </div>
        <div className="h-1 bg-[rgba(255,255,255,0.05)] rounded mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="border border-[rgba(255,255,255,0.05)] p-3">
              <div className="h-2.5 w-20 bg-[rgba(255,255,255,0.04)] rounded mb-2" />
              <div className="h-5 w-16 bg-[rgba(255,255,255,0.07)] rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="border border-[rgba(255,255,255,0.07)] p-6">
        <div className="h-3 w-36 bg-[rgba(255,255,255,0.06)] rounded mb-4" />
        {[1,2,3,4].map(i => (
          <div key={i} className="flex justify-between py-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="h-3 w-32 bg-[rgba(255,255,255,0.06)] rounded" />
            <div className="h-3 w-16 bg-[rgba(255,255,255,0.04)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
