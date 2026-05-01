'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Cpu, Dna, ShieldCheck, Lightning, CircleNotch, Check } from '@phosphor-icons/react';
import { resolveMarkerId } from '@/lib/marker-ids';

const LOG_MESSAGES = [
  'Initializing neural biomarker engine...',
  'Establishing secure clinical handshake...',
  'Mapping values to optimal physiological ranges...',
  'Calculating Free Testosterone Index...',
  'Analyzing LH/FSH signaling efficiency...',
  'Running hormonal homeostasis simulation...',
  'Identifying micronutrient deficiencies...',
  'Cross-referencing metabolic health markers...',
  'Mapping hormonal correlations...',
  'Finalizing diagnostic report...',
];

export default function LabAnalyzePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentLog, setCurrentLog] = useState(0);
  const [completedLogs, setCompletedLogs] = useState<string[]>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    // Progress bar: animate to 90, then hold until analysis completes
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (doneRef.current) return Math.min(prev + 5, 100);
        return Math.min(prev + 1, 90);
      });
    }, 60);

    // Terminal log cycling
    const logTimer = setInterval(() => {
      setCurrentLog(prev => {
        if (prev < LOG_MESSAGES.length - 1) {
          setCompletedLogs(logs => [...logs, LOG_MESSAGES[prev]]);
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    runAnalysis(progressTimer);

    return () => {
      clearInterval(progressTimer);
      clearInterval(logTimer);
    };
  }, []);

  async function runAnalysis(progressTimer?: ReturnType<typeof setInterval>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const panelId = localStorage.getItem('pending_panel_id');
    const panelValues = localStorage.getItem('pending_panel_values');
    if (!panelId || !panelValues) {
      setError('No pending panel found. Please upload your bloodwork first.');
      setPhase('error');
      return;
    }

    const phase1 = JSON.parse(localStorage.getItem('phase1') || '{}');
    const phase2 = JSON.parse(localStorage.getItem('phase2') || '{}');
    const phase3 = JSON.parse(localStorage.getItem('phase3') || '{}');
    const symptoms = JSON.parse(localStorage.getItem('symptoms') || '{}');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelValues: JSON.parse(panelValues), phase1, phase2, phase3, symptoms }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { _model: _m, ...analysisData } = await res.json();

      const editReportId = localStorage.getItem('pending_edit_report_id');
      if (editReportId) {
        const { error: dbErr } = await supabase
          .from('analysis_reports')
          .update({ ...analysisData })
          .eq('id', editReportId);
        if (dbErr) throw dbErr;
        localStorage.removeItem('pending_edit_report_id');
      } else {
        const { error: dbErr } = await supabase.from('analysis_reports').insert({
          user_id: user.id,
          bloodwork_panel_id: panelId,
          ...analysisData,
        });
        if (dbErr) throw dbErr;
      }

      localStorage.removeItem('pending_panel_id');
      localStorage.removeItem('pending_panel_values');

      // Cycle completion: if this panel is a 'final' panel, close the cycle
      const { data: panelRow } = await supabase
        .from('bloodwork_panels').select('phase_type, cycle_id')
        .eq('id', panelId).single();

      if (panelRow?.phase_type === 'final' && panelRow.cycle_id) {
        // Fetch initial report for comparison
        const { data: initialReport } = await supabase
          .from('analysis_reports')
          .select('health_score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        const finalScore = analysisData.health_score ?? null;
        const initialScore = initialReport?.health_score ?? 0;

        // Build comparison snapshot
        const snapshot = {
          initial_score: initialScore,
          final_score: finalScore,
          wellbeing_start_avg: {},
          wellbeing_end_avg: {},
          top_improved: [] as { marker: string; delta: number }[],
          top_unresolved: [] as { marker: string; delta: number }[],
        };

        // Compute top improved / unresolved markers if both panels exist
        if (initialReport && analysisData.marker_analysis) {
          const { data: initialAnalysis } = await supabase
            .from('analysis_reports')
            .select('marker_analysis')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (initialAnalysis?.marker_analysis) {
            const initialMap: Record<string, number> = {};
            for (const m of initialAnalysis.marker_analysis as { marker: string; value: number }[]) {
              initialMap[resolveMarkerId(m.marker)] = m.value;
            }
            const deltas: { marker: string; delta: number }[] = [];
            for (const m of analysisData.marker_analysis as { marker: string; value: number }[]) {
              const id = resolveMarkerId(m.marker);
              if (initialMap[id] != null) {
                deltas.push({ marker: id, delta: m.value - initialMap[id] });
              }
            }
            deltas.sort((a, b) => b.delta - a.delta);
            snapshot.top_improved = deltas.filter(d => d.delta > 0).slice(0, 5);
            snapshot.top_unresolved = deltas.filter(d => d.delta <= 0).slice(0, 5);
          }
        }

        await supabase.from('optimization_cycles').update({
          status: 'complete',
          comparison_snapshot: snapshot,
          completed_at: new Date().toISOString(),
        }).eq('id', panelRow.cycle_id);
      }

      // Signal progress bar to complete, then redirect
      doneRef.current = true;
      setTimeout(() => router.push('/lab'), 800);
    } catch (e: unknown) {
      if (progressTimer) clearInterval(progressTimer);
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setPhase('error');
    }
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠</div>
          <div className="text-white font-bold mb-2">Analysis Failed</div>
          <div className="text-sm text-[#9A9A9A] mb-6">{error}</div>
          <Button onClick={() => { setPhase('loading'); setProgress(0); setCurrentLog(0); setCompletedLogs([]); doneRef.current = false; runAnalysis(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="relative w-full max-w-2xl">

        {/* TOP STATUS BAR */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#C8A2C8] rounded-full animate-ping" />
            <span className="text-[10px] font-black text-white uppercase tracking-[4px]">Processing_Sequence</span>
          </div>
          <span className="text-[12px] font-mono text-[#C8A2C8]">{progress}%</span>
        </div>

        {/* MAIN SCANNING CARD */}
        <Card className="relative p-10">
          {/* Background grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 flex flex-col items-center">
            {/* Animated icon */}
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-[#C8A2C8]/20 blur-[40px] rounded-full animate-pulse" />
              <div className="relative w-24 h-24 rounded-xl border border-[#C8A2C8]/30 flex items-center justify-center bg-black">
                <Dna className="text-[#C8A2C8] animate-bounce" size={40} />
                <div className="absolute -inset-2 border border-[#C8A2C8]/10 rounded-xl rotate-45 animate-[spin_10s_linear_infinite]" />
                <div className="absolute -inset-4 border border-[#C8A2C8]/5 rounded-xl -rotate-12 animate-[spin_15s_linear_infinite]" />
              </div>
            </div>

            <h2 className="text-xl font-black text-white uppercase tracking-[2px] mb-2 text-center">
              Analyzing Biological Markers
            </h2>
            <p className="text-[11px] text-white/40 uppercase tracking-widest mb-8 text-center">
              AI Engine: Neural-V4-Clinical
            </p>

            {/* PROGRESS BAR */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-12">
              <div
                className="h-full bg-[#C8A2C8] transition-all duration-300 ease-out shadow-[0_0_15px_rgba(200,162,200,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* TERMINAL LOGS */}
            <div className="w-full font-mono text-[10px] space-y-2 h-32 overflow-hidden">
              {completedLogs.slice(-4).map((log, i) => (
                <div key={i} className="flex items-center gap-3 text-white/40">
                  <Check size={10} className="text-[#C8A2C8]" />
                  <span className="uppercase tracking-tighter">{log}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-[#C8A2C8] animate-pulse">
                <CircleNotch size={10} className="animate-spin" />
                <span className="uppercase tracking-tighter">{LOG_MESSAGES[currentLog]}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* BOTTOM METRICS */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Data Integrity', val: '99.9%', Icon: ShieldCheck },
            { label: 'Neural Load', val: '42.4 TFLOPS', Icon: Cpu },
            { label: 'Bio-Sync', val: 'ACTIVE', Icon: Lightning },
          ].map(({ label, val, Icon }, i) => (
            <div key={i} className="flex flex-col items-center p-4 bg-white/[0.02] border border-white/5">
              <Icon size={14} className="text-white/20 mb-2" />
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</span>
              <span className="text-[11px] font-mono text-white mt-1">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
