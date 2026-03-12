'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

const MESSAGES = [
  'Interpreting your biomarkers...',
  'Calculating hormone ratios...',
  'Analyzing against optimal ranges...',
  'Cross-referencing your lifestyle profile...',
  'Generating your personalized protocol...',
  'Almost done...',
];

export default function LabAnalyzePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'error'>('loading');
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)), 3000);
    runAnalysis();
    return () => clearInterval(interval);
  }, []);

  async function runAnalysis() {
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
      const analysisData = await res.json();

      const { error: dbErr } = await supabase.from('analysis_reports').insert({
        user_id: user.id,
        bloodwork_panel_id: panelId,
        ...analysisData,
      });

      if (dbErr) throw dbErr;

      localStorage.removeItem('pending_panel_id');
      localStorage.removeItem('pending_panel_values');

      router.push('/lab');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setPhase('error');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <div className="text-[#00E676] font-bold tracking-widest uppercase text-sm mb-2">Analyzing</div>
          <div className="text-[#9A9A9A] text-sm">{MESSAGES[msgIdx]}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">⚠</div>
        <div className="text-white font-bold mb-2">Analysis Failed</div>
        <div className="text-sm text-[#9A9A9A] mb-6">{error}</div>
        <Button onClick={() => { setPhase('loading'); setMsgIdx(0); runAnalysis(); }}>Retry</Button>
      </div>
    </div>
  );
}
