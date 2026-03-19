'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Zap, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ReportSummaryStructured } from '@/types';

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

const PREVIEW = 2;

function CharacterImage() {
  return (
    <div className="absolute bottom-0 right-0 w-[380px] h-[480px] pointer-events-none select-none hidden md:block">
      <Image
        src="/lab_character.png"
        alt=""
        fill
        className="object-contain object-right-bottom"
      />
      {/* fade left edge into card only — right/top stay crisp */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, #141414 0%, rgba(20,20,20,0.7) 18%, transparent 45%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, #141414 0%, transparent 10%)' }} />
    </div>
  );
}

function CardContent({ children }: { children: React.ReactNode }) {
  return (
    <Card className="col-span-12 lg:col-span-8 border-l-4 border-l-[#C8A2C8] relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(200,162,200,0.04) 0%, rgba(20,20,20,0) 50%), #141414' }}>
      {children}
      <CharacterImage />
    </Card>
  );
}

export function LabAIBriefing({ summary }: { summary: string | ReportSummaryStructured | null }) {
  const [expanded, setExpanded] = useState(false);

  const isStructured = typeof summary === 'object' && summary !== null;
  const s = isStructured ? (summary as ReportSummaryStructured) : null;

  if (s) {
    const sentences = splitSentences(s.bottom_line);
    const overflow = sentences.length > PREVIEW;
    const visible = expanded ? sentences : sentences.slice(0, PREVIEW);

    return (
      <CardContent>
        <div className="flex items-center gap-2 mb-5">
          <Zap size={14} className="text-[#C8A2C8]" />
          <span className="text-[10px] font-black text-white uppercase tracking-[4px]">Executive Briefing</span>
        </div>
        {/* pr-[140px] on sm+ to leave room for character */}
        <div className="space-y-5 md:pr-[340px]">
          <div className="border-l border-[rgba(255,255,255,0.1)] pl-4">
            <span className="text-[9px] font-black text-[#4A4A4A] uppercase tracking-widest block mb-2">Bottom Line</span>
            <div className="space-y-2">
              {visible.map((sentence, i) => (
                <p key={i} className={i === 0
                  ? 'text-sm font-bold text-[#E0E0E0] leading-relaxed'
                  : 'text-[11px] text-[#9A9A9A] leading-relaxed'}>
                  {sentence}
                </p>
              ))}
            </div>
            {overflow && (
              <button onClick={() => setExpanded(v => !v)}
                className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[#C8A2C8] uppercase tracking-widest hover:text-white transition-colors">
                {expanded ? 'Collapse' : `+${sentences.length - PREVIEW} more`}
                <ChevronDown size={11} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border-l border-[rgba(232,196,112,0.4)] pl-4">
              <span className="text-[9px] font-black text-[#E8C470] uppercase tracking-widest block mb-1">Primary Driver</span>
              <p className="text-xs text-[#9A9A9A] font-mono leading-relaxed">{s.primary_driver}</p>
            </div>
            <div className="border-l border-[rgba(200,162,200,0.4)] pl-4">
              <span className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-widest block mb-1">Next Action</span>
              <p className="text-xs text-[#9A9A9A] font-mono leading-relaxed">{s.next_action}</p>
            </div>
          </div>
        </div>
      </CardContent>
    );
  }

  // Plain-string fallback
  const sentences = splitSentences((summary as string) ?? '');
  const lead = sentences[0] ?? '';
  const rest = sentences.slice(1);
  const overflow = rest.length > PREVIEW;
  const visibleRest = expanded ? rest : rest.slice(0, PREVIEW);

  return (
    <CardContent>
      <div className="flex items-center gap-2 mb-5">
        <Zap size={14} className="text-[#C8A2C8]" />
        <span className="text-[10px] font-black text-white uppercase tracking-[4px]">AI Assessment</span>
      </div>
      <div className="border-l border-[rgba(255,255,255,0.1)] pl-4 md:pr-[340px]">
        <p className="text-sm font-bold text-[#E0E0E0] leading-relaxed mb-3">{lead}</p>
        {visibleRest.length > 0 && (
          <ul className="space-y-2">
            {visibleRest.map((sentence, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <span className="mt-[6px] w-1 h-1 rounded-full bg-[#C8A2C8] opacity-40 shrink-0" />
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed">{sentence}</p>
              </li>
            ))}
          </ul>
        )}
        {overflow && (
          <button onClick={() => setExpanded(v => !v)}
            className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[#C8A2C8] uppercase tracking-widest hover:text-white transition-colors">
            {expanded ? 'Collapse' : `+${rest.length - PREVIEW} more`}
            <ChevronDown size={11} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </CardContent>
  );
}
