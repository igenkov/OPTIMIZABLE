'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Pulse, ClipboardText, Flask, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

const ADHERENCE_OPTIONS = [
  { val: 'fully' as const,      label: 'Fully',     color: '#4ADE80' },
  { val: 'mostly' as const,     label: 'Mostly',    color: '#C8A2C8' },
  { val: 'partially' as const,  label: 'Partially', color: '#E8C470' },
  { val: 'not_today' as const,  label: 'Skipped',   color: '#E88080' },
];

interface Props {
  cycleId: string;
  protocolReportId: string;
  currentDay: number;
  currentPhase: 1 | 2;
  inquirySubmitted: boolean;
}

export function ProgressTracker({ cycleId, protocolReportId, currentDay, currentPhase, inquirySubmitted }: Props) {
  const [todayAdherence, setTodayAdherence] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adherenceRate, setAdherenceRate] = useState<number | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check today's adherence
      const { data: todayData } = await supabase
        .from('protocol_adherence')
        .select('adherence')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      if (todayData) setTodayAdherence(todayData.adherence);

      // Calculate adherence rate
      const { data: allAdherence } = await supabase
        .from('protocol_adherence')
        .select('adherence')
        .eq('cycle_id', cycleId);
      if (allAdherence?.length) {
        const good = allAdherence.filter(a => a.adherence === 'fully' || a.adherence === 'mostly').length;
        setAdherenceRate(Math.round((good / allAdherence.length) * 100));
        setTotalEntries(allAdherence.length);
      }
    }
    load();
  }, [cycleId, today]);

  async function saveAdherence(val: string) {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (todayAdherence) {
      await supabase.from('protocol_adherence')
        .update({ adherence: val })
        .eq('user_id', user.id)
        .eq('date', today);
    } else {
      await supabase.from('protocol_adherence').insert({
        user_id: user.id,
        cycle_id: cycleId,
        protocol_report_id: protocolReportId,
        date: today,
        adherence: val,
      });
    }
    setTodayAdherence(val);
    setSaving(false);
  }

  const showInquiryPrompt = currentPhase === 1 && currentDay >= 42 && !inquirySubmitted;
  const showFinalPrompt = currentPhase === 2 && currentDay >= 80;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.01)' }}>
        <Pulse size={15} className="text-[#C8A2C8]" />
        <div>
          <div className="text-xs font-black text-white uppercase tracking-[2px]">Progress Tracker</div>
          <div className="text-[9px] text-[#4A4A4A] uppercase tracking-wide">Protocol adherence and milestones</div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Today's adherence */}
        <div>
          <div className="text-[9px] font-black text-[#9A9A9A] uppercase tracking-[3px] mb-3">Today&apos;s Adherence</div>
          <div className="grid grid-cols-4 gap-2">
            {ADHERENCE_OPTIONS.map(opt => (
              <button key={opt.val} type="button" disabled={saving}
                onClick={() => saveAdherence(opt.val)}
                className={`py-2.5 text-[10px] font-bold border transition-all ${
                  todayAdherence === opt.val
                    ? 'text-black'
                    : 'border-[rgba(255,255,255,0.07)] text-[#4A4A4A] hover:border-[rgba(255,255,255,0.15)]'
                }`}
                style={todayAdherence === opt.val ? {
                  borderColor: opt.color,
                  background: opt.color,
                } : undefined}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Adherence rate */}
        {adherenceRate !== null && (
          <div className="flex items-center gap-4 p-3 border border-[rgba(255,255,255,0.05)]"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div>
              <div className="text-2xl font-black text-white tabular-nums">{adherenceRate}%</div>
              <div className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Adherence Rate</div>
            </div>
            <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${adherenceRate}%`,
                  background: adherenceRate >= 80 ? '#4ADE80' : adherenceRate >= 50 ? '#E8C470' : '#E88080',
                }} />
            </div>
            <div className="text-[10px] text-[#4A4A4A] tabular-nums">{totalEntries}d logged</div>
          </div>
        )}

        {/* Milestone prompts */}
        {showInquiryPrompt && (
          <Link href="/inquiry"
            className="flex items-center justify-between p-4 border border-[#C8A2C8] bg-[rgba(200,162,200,0.06)] hover:bg-[rgba(200,162,200,0.1)] transition-colors group">
            <div className="flex items-center gap-3">
              <ClipboardText size={16} className="text-[#C8A2C8]" />
              <div>
                <div className="text-[11px] font-black text-white uppercase tracking-tight">45-Day Inquiry Ready</div>
                <div className="text-[10px] text-[#4A4A4A]">Complete to generate your Calibration protocol</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#C8A2C8] group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {showFinalPrompt && (
          <Link href="/lab/upload"
            className="flex items-center justify-between p-4 border border-[#E8C470] bg-[rgba(232,196,112,0.06)] hover:bg-[rgba(232,196,112,0.1)] transition-colors group">
            <div className="flex items-center gap-3">
              <Flask size={16} className="text-[#E8C470]" />
              <div>
                <div className="text-[11px] font-black text-white uppercase tracking-tight">Final Bloodwork (Optional)</div>
                <div className="text-[10px] text-[#4A4A4A]">Upload to see your 90-day progress comparison</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#E8C470] group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    </Card>
  );
}
