import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
  gold?: boolean;
  topAccent?: string;
}

export function Card({ accent, gold, topAccent, children, className = '', style, ...props }: CardProps) {
  const topBorderColor = accent
    ? 'rgba(200,162,200,0.6)'
    : gold
    ? 'rgba(255,179,0,0.6)'
    : topAccent ?? 'rgba(255,255,255,0.12)';

  return (
    <div
      className={`relative overflow-hidden p-5 ${className}`}
      style={{
        background: 'linear-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(20,20,20,0) 55%), #141414',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTopColor: topBorderColor,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
