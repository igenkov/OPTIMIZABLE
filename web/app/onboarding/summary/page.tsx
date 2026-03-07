'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { calculateRiskScore, getRiskLevel, getRiskColor, getRiskLabel } from '@/lib/scoring';
import { BIOMARKERS, CORE_PANEL_IDS, EXTENDED_PANEL_IDS } from '@/constants/biomarkers';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

export default function SummaryPage() {
  const router = useRouter();
  const [riskScore, setRiskScore] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p1 = JSON.parse(sessionStorage.getItem('phase1') || '{}') as Phase1Data;
    const p2 = JSON.parse(sessionStorage.getItem('phase2') || '{}') as Phase2Data;
    const p3 = JSON.parse(sessionStorage.getItem('phase3') || '{}') as Phase3Data;
    const sym = JSON.parse(sessionStorage.getItem('symptoms') || '{}');
    if (p1.age && p2.avg_sleep_hours !== undefined && p3.steroid_history) {
      const score = calculateRiskScore(p1, p2, p3, sym.symptoms_selected || []);
      setRiskScore(score);
    }
    setLoaded(true);
  }, []);

  const level = getRiskLevel(riskScore);
  const color = getRiskColor(level);
  const label = getRiskLabel(level);
  const core = BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));
  const extended = BIOMARKERS.filter(b => EXTENDED_PANEL_IDS.includes(b.id));

  if (!loaded) return <div className="text-[#9A9A9A] text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-1 flex-1 bg-[#00E676]" />
          ))}
        </div>
        <div className="text-xs text-[#9A9A9A] tracking-widest uppercase mb-2">Step 5 of 5</div>
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">Your Risk Assessment</h1>
        <p className="text-sm text-[#9A9A9A]">Based on your profile, lifestyle, and symptoms.</p>
      </div>

      <Card className="mb-5 text-center py-10">
        <div className="text-[10px] tracking-[3px] text-[#9A9A9A] uppercase mb-4">Hormone Risk Score</div>
        <div className="text-8xl font-black mb-3" style={{ color }}>{riskScore}</div>
        <div className="text-sm font-bold tracking-widest uppercase" style={{ color }}>{label}</div>
        <div className="mt-6 h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${riskScore}%`, background: color }} />
        </div>
      </Card>

      <Card className="mb-5">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Recommended Core Panel</div>
        <p className="text-xs text-[#9A9A9A] mb-4">These tests are essential for everyone in your risk category:</p>
        <div className="flex flex-col gap-2">
          {core.map(b => (
            <div key={b.id} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0" />
              <div>
                <div className="text-sm text-white font-medium">{b.name}</div>
                <div className="text-xs text-[#4A4A4A]">{b.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(level === 'high' || level === 'very_high') && (
        <Card className="mb-5">
          <div className="text-[10px] font-bold tracking-[3px] text-[#FFB300] uppercase mb-4">Extended Panel Recommended</div>
          <div className="flex flex-col gap-2">
            {extended.map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFB300] shrink-0" />
                <div>
                  <div className="text-sm text-white font-medium">{b.name}</div>
                  <div className="text-xs text-[#4A4A4A]">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card accent className="mb-6">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Before Your Blood Draw</div>
        {['Draw blood between 7:00–10:00 AM (testosterone peaks in the morning)',
          'Fast for 10–12 hours beforehand',
          'No heavy exercise for 24 hours prior',
          'Avoid alcohol for 48 hours before'].map((t, i) => (
          <div key={i} className="flex gap-3 mb-2">
            <span className="text-[#00E676] font-bold shrink-0">→</span>
            <span className="text-xs text-[#9A9A9A] leading-relaxed">{t}</span>
          </div>
        ))}
      </Card>

      <Button onClick={() => router.push('/dashboard')} fullWidth>
        Go to Dashboard →
      </Button>
    </div>
  );
}
