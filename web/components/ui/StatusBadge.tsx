import type { MarkerStatus } from '@/types';

export function getStatusColor(status: MarkerStatus): string {
  switch (status) {
    case 'optimal': return '#00E676';
    case 'suboptimal': return '#FFB300';
    case 'attention': return '#FF5252';
  }
}

export function StatusBadge({ status }: { status: MarkerStatus }) {
  const color = getStatusColor(status);
  const label = status === 'optimal' ? 'Optimal' : status === 'suboptimal' ? 'Suboptimal' : 'Attention';
  return (
    <span
      className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5"
      style={{ color, border: `1px solid ${color}`, background: `${color}20` }}
    >
      {label}
    </span>
  );
}
