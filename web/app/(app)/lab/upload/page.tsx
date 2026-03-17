'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Activity, TestTube2, Calendar, Cpu,
  ShieldCheck, ArrowRight, AlertCircle, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BIOMARKERS, CORE_PANEL_IDS, EXTENDED_PANEL_IDS } from '@/constants/biomarkers';
import type { UnitAlternative } from '@/constants/biomarkers';

function BiomarkerRow({
  id, name, unitPrimary, unitAlternatives, selectedUnit, value,
  rangeLow, rangeHigh, onChange, onUnitChange,
}: {
  id: string; name: string; unitPrimary: string;
  unitAlternatives: UnitAlternative[]; selectedUnit: string;
  value: string; rangeLow: number; rangeHigh: number;
  onChange: (id: string, val: string) => void;
  onUnitChange: (id: string, unit: string) => void;
}) {
  const activeAlt = unitAlternatives.find(a => a.unit === selectedUnit);
  const factor = activeAlt ? activeAlt.toCanonical : 1;
  const displayLow = +(rangeLow / factor).toPrecision(4);
  const displayHigh = +(rangeHigh / factor).toPrecision(4);
  const hasAlts = unitAlternatives.length > 0;

  return (
    <div className="group flex items-center justify-between py-4 px-4 border-b border-white/[0.03] hover:bg-white/[0.01] transition-all">
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-[#00E676] transition-colors">
          {name}
        </span>
        {hasAlts ? (
          <select
            value={selectedUnit}
            onChange={e => onUnitChange(id, e.target.value)}
            className="mt-0.5 bg-transparent border-0 text-[9px] font-mono text-white/40 uppercase tracking-widest outline-none cursor-pointer hover:text-[#00E676] transition-colors pr-1"
          >
            <option value={unitPrimary}>{unitPrimary}</option>
            {unitAlternatives.map(a => (
              <option key={a.unit} value={a.unit}>{a.unit}</option>
            ))}
          </select>
        ) : (
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{unitPrimary}</span>
        )}
      </div>
      <div className="relative">
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(id, e.target.value)}
          placeholder={`${displayLow}–${displayHigh}`}
          className="w-32 px-4 py-2.5 text-right text-sm font-mono bg-black border border-white/10 text-[#00E676] placeholder-white/10 focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676]/20 outline-none transition-all"
        />
        {value && <div className="absolute inset-0 bg-[#00E676]/5 pointer-events-none animate-pulse" />}
      </div>
    </div>
  );
}

export default function LabUploadPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [labName, setLabName] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const core = BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));
  const extended = BIOMARKERS.filter(b => EXTENDED_PANEL_IDS.includes(b.id));
  const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (filled.length < 3) { setError('Data Insufficient: Minimum 3 biomarkers required.'); return; }

    const today = new Date().toISOString().split('T')[0];
    if (collectionDate > today) { setError('Collection date cannot be in the future.'); return; }
    const fiveYearsAgo = new Date(); fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (new Date(collectionDate) < fiveYearsAgo) { setError('Collection date cannot be more than 5 years ago.'); return; }

    for (const [id, v] of filled) {
      const num = Number(v);
      if (isNaN(num) || num < 0 || num > 100000) {
        const name = BIOMARKERS.find(b => b.id === id)?.name ?? id;
        setError(`Invalid value for ${name}: must be a positive number.`);
        return;
      }
    }

    setUploading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const formattedValues: Record<string, { marker: string; value: number; unit: string }> = {};
    for (const [id, v] of filled) {
      const b = BIOMARKERS.find(b => b.id === id);
      const selectedUnit = selectedUnits[id] ?? b?.unit_primary ?? '';
      const alt = b?.unit_alternatives?.find(a => a.unit === selectedUnit);
      const canonicalValue = alt ? Number(v) * alt.toCanonical : Number(v);
      formattedValues[id] = { marker: id, value: canonicalValue, unit: b?.unit_primary ?? '' };
    }

    const countRes = await supabase.from('bloodwork_panels').select('id').eq('user_id', user.id);
    const panelNumber = (countRes.data?.length ?? 0) + 1;

    let cycleId = '';
    const cycleRes = await supabase.from('optimization_cycles').select('id').eq('user_id', user.id).eq('status', 'active').single();
    if (cycleRes.data) {
      cycleId = cycleRes.data.id;
    } else {
      const startToday = new Date().toISOString().split('T')[0];
      const end = new Date(); end.setDate(end.getDate() + 90);
      const newCycle = await supabase.from('optimization_cycles').insert({
        user_id: user.id, start_date: startToday,
        end_date: end.toISOString().split('T')[0], status: 'active', current_day: 1,
      }).select().single();
      cycleId = newCycle.data?.id ?? '';
    }

    const panelRes = await supabase.from('bloodwork_panels').insert({
      user_id: user.id, panel_number: panelNumber, cycle_id: cycleId,
      upload_type: 'manual', values: formattedValues,
      collection_date: collectionDate, lab_name: labName || null,
    }).select().single();

    if (panelRes.error) { setError(panelRes.error.message); setUploading(false); return; }

    localStorage.setItem('pending_panel_id', panelRes.data.id);
    localStorage.setItem('pending_panel_values', JSON.stringify(formattedValues));
    router.push('/lab/analyze');
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto space-y-10">

      {/* HEADER */}
      <div className="border-b border-white/5 pb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2 text-[#00E676]">
            <Cpu size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[4px]">Data_Injection_Sequence</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Enter Panel Data</h1>
        </div>
        <div className="hidden md:flex flex-col items-end opacity-20">
          <span className="text-[10px] font-mono">ENCRYPTION: AES-256</span>
          <span className="text-[10px] font-mono">STATUS: TERMINAL_ACTIVE</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-10">

        {/* LEFT: BIOMARKER ARRAYS */}
        <div className="col-span-12 lg:col-span-8 space-y-12">

          {/* CORE PANEL */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#00E676]" />
                <h2 className="text-[10px] font-black text-white uppercase tracking-[3px]">Primary Biomarkers</h2>
              </div>
              <span className="text-[9px] font-mono text-white/20 uppercase">Placeholders = Ref Ranges</span>
            </div>
            <Card className="p-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                {core.map(b => (
                  <BiomarkerRow
                    key={b.id}
                    id={b.id}
                    name={b.name}
                    unitPrimary={b.unit_primary}
                    unitAlternatives={b.unit_alternatives ?? []}
                    selectedUnit={selectedUnits[b.id] ?? b.unit_primary}
                    value={values[b.id] ?? ''}
                    rangeLow={b.standard_range_low}
                    rangeHigh={b.standard_range_high}
                    onChange={(id, val) => setValues(prev => ({ ...prev, [id]: val }))}
                    onUnitChange={(id, unit) => setSelectedUnits(prev => ({ ...prev, [id]: unit }))}
                  />
                ))}
              </div>
            </Card>
          </section>

          {/* EXTENDED PANEL */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2">
              <TestTube2 size={16} className="text-white/20" />
              <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[3px]">Extended Variables</h2>
            </div>
            <Card className="p-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                {extended.map(b => (
                  <BiomarkerRow
                    key={b.id}
                    id={b.id}
                    name={b.name}
                    unitPrimary={b.unit_primary}
                    unitAlternatives={b.unit_alternatives ?? []}
                    selectedUnit={selectedUnits[b.id] ?? b.unit_primary}
                    value={values[b.id] ?? ''}
                    rangeLow={b.standard_range_low}
                    rangeHigh={b.standard_range_high}
                    onChange={(id, val) => setValues(prev => ({ ...prev, [id]: val }))}
                    onUnitChange={(id, unit) => setSelectedUnits(prev => ({ ...prev, [id]: unit }))}
                  />
                ))}
              </div>
            </Card>
          </section>
        </div>

        {/* RIGHT: SIDEBAR CONTEXT */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          <Card className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-[#00E676]" size={18} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Entry Metadata</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Laboratory Source</label>
                <input
                  value={labName}
                  onChange={e => setLabName(e.target.value)}
                  placeholder="e.g. QUEST DIAGNOSTICS"
                  className="w-full bg-black border border-white/10 px-4 py-3 text-xs font-mono text-white outline-none focus:border-[#00E676] transition-all placeholder-white/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Collection Date</label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  className="w-full bg-black border border-white/10 px-4 py-3 text-xs font-mono text-white outline-none focus:border-[#00E676] transition-all"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-white/20" size={18} />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">System Readiness</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-white/30 uppercase">Detected Points:</span>
                <span className="text-white font-bold">{filled.length}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-white/30 uppercase">Requirement:</span>
                <span className={cn(filled.length >= 3 ? 'text-[#00E676]' : 'text-red-500/50')}>
                  {filled.length >= 3 ? 'PASSED' : 'MIN 3'}
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 flex gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-500 font-bold leading-tight uppercase tracking-tighter">{error}</p>
                </div>
              )}
            </div>
          </Card>

          <Button
            type="submit"
            loading={uploading}
            disabled={filled.length < 3}
            fullWidth
            className="py-5 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,230,118,0.1)]"
          >
            {uploading ? 'Analyzing Data...' : <><span>Confirm & Process</span><ArrowRight size={16} /></>}
          </Button>

          <div className="flex items-start gap-3 p-4" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <Info size={14} className="text-white/20 shrink-0 mt-0.5" />
            <p className="text-[9px] text-white/30 uppercase leading-relaxed tracking-tighter">
              Ensure you have entered values exactly as they appear on your PDF. Reference ranges are automatically adjusted based on your biological profile in the next step.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
