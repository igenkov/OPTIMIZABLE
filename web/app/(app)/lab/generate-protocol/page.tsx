'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Cpu, Flask, ShieldCheck, Lightning, CircleNotch, Check } from '@phosphor-icons/react';

const FOUNDATION_LOGS = [
  'Loading analysis findings...',
  'Mapping root cause hierarchy...',
  'Evaluating lifestyle intervention priority...',
  'Calibrating supplement requirements...',
  'Cross-referencing current medications and supplements...',
  'Building nutrition directives...',
  'Structuring training protocol...',
  'Finalizing 45-day Foundation protocol...',
];

const CALIBRATION_LOGS = [
  'Loading Foundation protocol baseline...',
  'Importing 45-day inquiry responses...',
  'Analysing wellbeing trend data...',
  'Evaluating supplement adherence patterns...',
  'Identifying directives to adjust...',
  'Cross-referencing lifestyle changes...',
  'Recalibrating supplement stack...',
  'Finalizing 45-day Calibration protocol...',
];

export default function GenerateProtocolPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentLog, setCurrentLog] = useState(0);
  const [completedLogs, setCompletedLogs] = useState<string[]>([]);
  const [isCalibration, setIsCalibration] = useState(false);
  const doneRef = useRef(false);

  const LOG_MESSAGES = isCalibration ? CALIBRATION_LOGS : FOUNDATION_LOGS;

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (doneRef.current) return Math.min(prev + 5, 100);
        return Math.min(prev + 1, 90);
      });
    }, 80);

    const logTimer = setInterval(() => {
      setCurrentLog(prev => {
        const msgs = doneRef.current ? CALIBRATION_LOGS : FOUNDATION_LOGS;
        if (prev < msgs.length - 1) {
          setCompletedLogs(logs => [...logs, msgs[prev]]);
          return prev + 1;
        }
        return prev;
      });
    }, 700);

    runProtocolGeneration(progressTimer);

    return () => {
      clearInterval(progressTimer);
      clearInterval(logTimer);
    };
  }, []);

  async function runProtocolGeneration(progressTimer?: ReturnType<typeof setInterval>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Load onboarding data from localStorage
    const phase1 = JSON.parse(localStorage.getItem('phase1') || '{}');
    const phase2 = JSON.parse(localStorage.getItem('phase2') || '{}');
    const phase3 = JSON.parse(localStorage.getItem('phase3') || '{}');
    const symptoms = JSON.parse(localStorage.getItem('symptoms') || '{}');

    // Fetch latest analysis report from DB
    const { data: reportData, error: reportErr } = await supabase
      .from('analysis_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (reportErr || !reportData) {
      if (progressTimer) clearInterval(progressTimer);
      setError('No analysis found. Please upload and analyze your bloodwork first.');
      setPhase('error');
      return;
    }

    // Fetch latest bloodwork panel values for context
    const { data: panelData } = await supabase
      .from('bloodwork_panels')
      .select('values')
      .eq('id', reportData.bloodwork_panel_id)
      .single();

    // Detect calibration mode: foundation report exists + inquiry submitted
    const { data: foundationReport } = await supabase
      .from('protocol_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('phase', 'foundation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: cycleData } = await supabase
      .from('optimization_cycles')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    let inquiryData = null;
    let wellbeingData = null;
    const calibrationMode = !!foundationReport && !!cycleData;

    if (calibrationMode) {
      setIsCalibration(true);

      // Fetch inquiry responses
      const { data: inquiry } = await supabase
        .from('cycle_inquiries')
        .select('*')
        .eq('cycle_id', cycleData.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();
      inquiryData = inquiry;

      // Fetch wellbeing trend data (30-day averages)
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('energy, mood, libido, sleep_quality, mental_clarity, stress')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);
      wellbeingData = checkins;
    }

    const protocolPhase = calibrationMode ? 'calibration' : 'foundation';

    try {
      const res = await fetch('/api/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase1,
          phase2,
          phase3,
          symptoms,
          panelValues: panelData?.values ?? {},
          analysis: reportData,
          ...(calibrationMode && {
            calibrationContext: {
              foundationProtocol: foundationReport,
              inquiryResponses: inquiryData,
              wellbeingTrend: wellbeingData,
            },
          }),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const protocolData = await res.json();

      // Save to protocol_reports with phase tag
      const { error: dbErr } = await supabase.from('protocol_reports').insert({
        user_id: user.id,
        analysis_report_id: reportData.id,
        supplements: protocolData.supplements ?? [],
        eating: protocolData.eating ?? [],
        exercise: protocolData.exercise ?? [],
        sleep: protocolData.sleep ?? [],
        stress: protocolData.stress ?? [],
        habits: protocolData.habits ?? [],
        model_used: protocolData._model ?? null,
        phase: protocolPhase,
      });

      if (dbErr) throw dbErr;

      doneRef.current = true;
      setTimeout(() => router.push('/protocol'), 800);
    } catch (e: unknown) {
      if (progressTimer) clearInterval(progressTimer);
      setError(e instanceof Error ? e.message : 'Protocol generation failed');
      setPhase('error');
    }
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠</div>
          <div className="text-white font-bold mb-2">Protocol Generation Failed</div>
          <div className="text-sm text-[#9A9A9A] mb-6">{error}</div>
          <Button onClick={() => { setPhase('loading'); setProgress(0); setCurrentLog(0); setCompletedLogs([]); doneRef.current = false; runProtocolGeneration(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="relative w-full max-w-2xl">

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#C8A2C8] rounded-full animate-ping" />
            <span className="text-[10px] font-black text-white uppercase tracking-[4px]">Building_Protocol</span>
          </div>
          <span className="text-[12px] font-mono text-[#C8A2C8]">{progress}%</span>
        </div>

        <Card className="relative p-10">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-[#C8A2C8]/20 blur-[40px] rounded-full animate-pulse" />
              <div className="relative w-24 h-24 rounded-xl border border-[#C8A2C8]/30 flex items-center justify-center bg-black">
                <Flask className="text-[#C8A2C8] animate-bounce" size={40} />
                <div className="absolute -inset-2 border border-[#C8A2C8]/10 rounded-xl rotate-45 animate-[spin_10s_linear_infinite]" />
                <div className="absolute -inset-4 border border-[#C8A2C8]/5 rounded-xl -rotate-12 animate-[spin_15s_linear_infinite]" />
              </div>
            </div>

            <h2 className="text-xl font-black text-white uppercase tracking-[2px] mb-2 text-center">
              {isCalibration ? 'Calibrating Your Protocol' : 'Generating Your Protocol'}
            </h2>
            <p className="text-[11px] text-white/40 uppercase tracking-widest mb-8 text-center">
              {isCalibration ? '45-Day Calibration Sequence' : '45-Day Foundation Sequence'}
            </p>

            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-12">
              <div
                className="h-full bg-[#C8A2C8] transition-all duration-300 ease-out shadow-[0_0_15px_rgba(200,162,200,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

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

        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Analysis Loaded', val: '✓', Icon: ShieldCheck },
            { label: 'Protocol Engine', val: 'ACTIVE', Icon: Cpu },
            { label: 'Personalisation', val: '100%', Icon: Lightning },
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
