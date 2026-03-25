import type { MarkerStatus } from '@/types';

export function getStatusColor(status: MarkerStatus): string {
  switch (status) {
    case 'optimal': return '#4ADE80';
    case 'suboptimal': return '#E8C470';
    case 'out_of_range': return '#E88080';
  }
}

export function StatusBadge({ status }: { status: MarkerStatus }) {
  const color = getStatusColor(status);
  const label = status === 'optimal' ? 'Optimal' : status === 'suboptimal' ? 'Suboptimal' : 'Out of Range';
  return (
    <span
      className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5"
      style={{ color, border: `1px solid ${color}`, background: `${color}20` }}
    >
      {label}
    </span>
  );
}
