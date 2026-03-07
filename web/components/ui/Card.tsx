import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
  gold?: boolean;
}

export function Card({ accent, gold, children, className = '', ...props }: CardProps) {
  const border = accent
    ? 'border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.05)]'
    : gold
    ? 'border border-[rgba(255,179,0,0.25)] bg-[rgba(255,179,0,0.05)]'
    : 'border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a]';

  return (
    <div className={`p-5 ${border} ${className}`} {...props}>
      {(accent || gold) && (
        <div
          className="h-0.5 -mt-5 -mx-5 mb-4"
          style={{ background: accent ? '#00E676' : '#FFB300' }}
        />
      )}
      {children}
    </div>
  );
}
