'use client';

import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';

interface Factor {
  title: string;
  explanation: string;
}

interface ExpandableFactorsProps {
  factors: Factor[];
  emptyIcon: React.ReactNode;
  emptyLabel: string;
  accentColor: string; // e.g. '#E8C470' or '#4ade80'
  borderColor: string; // e.g. 'rgba(232,196,112,0.3)' or 'rgba(74,222,128,0.3)'
}

export function ExpandableFactors({
  factors,
  emptyIcon,
  emptyLabel,
  accentColor,
  borderColor,
}: ExpandableFactorsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (factors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 opacity-20">
        {emptyIcon}
        <span className="text-[10px] font-black uppercase tracking-widest mt-2">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {factors.map((f, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="border-b border-white/[0.05] last:border-b-0"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 py-3 px-1 text-left group hover:bg-white/[0.02] transition-colors rounded"
            >
              <span
                className="text-[11px] font-black uppercase tracking-tight transition-colors"
                style={{ color: isOpen ? accentColor : 'rgba(255,255,255,0.85)' }}
              >
                {f.title}
              </span>
              <CaretDown
                size={13}
                className="shrink-0 transition-transform duration-200"
                style={{
                  color: accentColor,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  opacity: isOpen ? 1 : 0.4,
                }}
              />
            </button>

            {isOpen && (
              <p
                className="text-[11px] leading-relaxed pb-3 px-1"
                style={{ color: 'rgba(255,255,255,0.45)', borderLeft: `2px solid ${borderColor}`, paddingLeft: '0.75rem', marginLeft: '0.25rem' }}
              >
                {f.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
