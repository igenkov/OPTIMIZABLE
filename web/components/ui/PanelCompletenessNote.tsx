import { Info, CheckCircle2 } from 'lucide-react';

interface PanelCompletenessNoteProps {
  submittedCount: number;
  recommendedCount: number;
  context?: 'upload' | 'result';
}

export function PanelCompletenessNote({
  submittedCount,
  recommendedCount,
  context = 'result',
}: PanelCompletenessNoteProps) {
  const isComplete = submittedCount >= recommendedCount;

  // Result pages: hide when panel is complete
  if (context === 'result' && isComplete) return null;

  // Upload page: green state when all recommended markers are filled
  if (context === 'upload' && isComplete) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-[rgba(74,222,128,0.04)] border border-[rgba(74,222,128,0.15)]">
        <CheckCircle2 size={14} className="text-[#4ade80] shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-black text-[#4ade80] uppercase tracking-[2px]">
            Full Panel - {submittedCount} of {recommendedCount} markers
          </span>
          <p className="text-[10px] text-white/40 leading-relaxed mt-1">
            All recommended biomarkers filled. This will produce the most accurate analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-[rgba(232,196,112,0.04)] border border-[rgba(232,196,112,0.15)]">
      <Info size={14} className="text-[#E8C470] shrink-0 mt-0.5" />
      <div>
        <span className="text-[10px] font-black text-[#E8C470] uppercase tracking-[2px]">
          {context === 'upload'
            ? `${submittedCount} of ${recommendedCount} recommended markers`
            : `Partial Panel - ${submittedCount} of ${recommendedCount}`}
        </span>
        <p className="text-[10px] text-white/40 leading-relaxed mt-1">
          Your recommended biomarker panel is designed to give a complete picture of your hormonal system.
          {context === 'upload'
            ? ' Filling all recommended markers produces the most accurate analysis.'
            : ' Missing markers reduce the precision of this analysis, and the output may not fully reflect your actual status.'}
        </p>
      </div>
    </div>
  );
}
