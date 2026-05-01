'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Pulse, TestTube, Calendar, Cpu,
  ShieldCheck, ArrowRight, WarningCircle, Info, CaretDown,
  Flask, CheckCircle
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { PanelCompletenessNote } from '@/components/ui/PanelCompletenessNote';
import { BIOMARKERS, CORE_PANEL_IDS, EXTENDED_PANEL_IDS } from '@/constants/biomarkers';
import type { UnitAlternative } from '@/constants/biomarkers';
import { getPersonalizedPanel } from '@/lib/scoring';
import type { PersonalizedPanel } from '@/lib/scoring';
import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

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
  const isFilled = value.trim() !== '';

  return (
    <div className={cn(
      "group flex items-center justify-between py-3.5 px-4 border-b border-white/[0.04] transition-all",
      isFilled && "bg-[#C8A2C8]/[0.02]"
    )}>
      <div className="flex flex-col min-w-0 flex-1 pr-4">
        <span className={cn(
          "text-[11px] font-black uppercase tracking-tight transition-colors truncate",
          isFilled ? "text-[#C8A2C8]" : "text-white/80 group-hover:text-white"
        )}>
          {name}
        </span>
        {hasAlts ? (
          <select
            value={selectedUnit}
            onChange={e => onUnitChange(id, e.target.value)}
            className="mt-0.5 bg-transparent border-0 text-[9px] font-mono text-white/35 uppercase tracking-widest outline-none cursor-pointer hover:text-[#C8A2C8] transition-colors pr-1 w-fit"
          >
            <option value={unitPrimary}>{unitPrimary}</option>
            {unitAlternatives.map(a => (
              <option key={a.unit} value={a.unit}>{a.unit}</option>
            ))}
          </select>
        ) : (
          <span className="text-[9px] font-mono text-white/25 uppercase tracking-widest">{unitPrimary}</span>
        )}
      </div>
      <div className="relative">
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(id, e.target.value)}
          placeholder={`${displayLow}–${displayHigh}`}
          className={cn(
            "w-[110px] px-3 py-2 text-right text-sm font-mono bg-[#0e0e0e] border outline-none transition-all rounded-sm",
            isFilled
              ? "border-[#C8A2C8]/40 text-[#C8A2C8] focus:border-[#C8A2C8] focus:ring-1 focus:ring-[#C8A2C8]/20"
              : "border-white/10 text-white/60 placeholder:text-white/15 focus:border-[#C8A2C8]/60"
          )}
        />
        {isFilled && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle size={12} className="text-[#C8A2C8]/50" weight="fill" />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2.5">
        <Icon size={15} className={iconColor} weight="duotone" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{title}</h2>
      </div>
      {subtitle && (
        <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">{subtitle}</span>
      )}
    </div>
  );
}

export default function LabUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPanelId = searchParams.get('edit');
  const editReportId = searchParams.get('reportId');
  const isEditMode = !!editPanelId;

  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [labName, setLabName] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<PersonalizedPanel | null>(null);
  const [additionalExpanded, setAdditionalExpanded] = useState(false);

  // Load onboarding data → personalized panel tiers
  useEffect(() => {
    async function loadPanel() {
      try {
        const p1Raw = localStorage.getItem('phase1');
        const p2Raw = localStorage.getItem('phase2');
        const p3Raw = localStorage.getItem('phase3');
        const symRaw = localStorage.getItem('symptoms');
        if (p1Raw && p2Raw && p3Raw) {
          const p1 = JSON.parse(p1Raw) as Phase1Data;
          const p2 = JSON.parse(p2Raw) as Phase2Data;
          const p3 = JSON.parse(p3Raw) as Phase3Data;
          const sym = symRaw ? JSON.parse(symRaw) : {};
          const symptomIds: string[] = sym.symptoms_selected || [];
          setPanel(getPersonalizedPanel(p1, p2, p3, symptomIds));
          return;
        }
      } catch { /* localStorage corrupt — fall through to Supabase */ }

      // Fallback: fetch from Supabase so tiers always match the dashboard
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [profRes, lifRes, medRes, symRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).single(),
          supabase.from('lifestyle').select('*').eq('user_id', user.id).single(),
          supabase.from('medical_history').select('*').eq('user_id', user.id).single(),
          supabase.from('symptom_assessments').select('symptoms_selected').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
        ]);
        if (!profRes.data) return;
        const p1 = profRes.data as unknown as Phase1Data;
        const p2 = (lifRes.data ?? {}) as unknown as Phase2Data;
        const p3 = (medRes.data ?? { steroid_history: 'never', trt_history: 'never' }) as unknown as Phase3Data;
        const symptomIds: string[] = (symRes.data?.symptoms_selected as string[]) ?? [];
        setPanel(getPersonalizedPanel(p1, p2, p3, symptomIds));
      } catch { /* silently fall back to static panel */ }
    }
    loadPanel();
  }, []);

  // Pre-populate form when editing an existing panel
  useEffect(() => {
    if (!editPanelId) return;
    async function loadPanel() {
      const supabase = createClient();
      const { data } = await supabase
        .from('bloodwork_panels')
        .select('values, lab_name, collection_date')
        .eq('id', editPanelId)
        .single();
      if (!data) return;
      const loaded: Record<string, string> = {};
      for (const [id, v] of Object.entries(data.values as Record<string, { value: number }>)) {
        loaded[id] = String(v.value);
      }
      setValues(loaded);
      if (data.lab_name) setLabName(data.lab_name);
      if (data.collection_date) setCollectionDate(data.collection_date);
    }
    loadPanel();
  }, [editPanelId]);

  // Personalized tiers or static fallback
  const essentialBio = panel
    ? panel.essential.map(m => BIOMARKERS.find(b => b.id === m.id)!).filter(Boolean)
    : BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));
  const recommendedBio = panel
    ? panel.recommended.map(m => BIOMARKERS.find(b => b.id === m.id)!).filter(Boolean)
    : [];
  const extendedBio = panel
    ? panel.extended.map(m => BIOMARKERS.find(b => b.id === m.id)!).filter(Boolean)
    : BIOMARKERS.filter(b => EXTENDED_PANEL_IDS.includes(b.id));
  const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');
  const recommendedCount = panel ? panel.essential.length + panel.recommended.length : 0;
  const additionalBio = panel
    ? BIOMARKERS.filter(b => !panel.allIds.includes(b.id))
    : BIOMARKERS.filter(b => !CORE_PANEL_IDS.includes(b.id) && !EXTENDED_PANEL_IDS.includes(b.id));

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

    // EDIT MODE — update existing panel, re-run analysis on same report
    if (isEditMode && editPanelId && editReportId) {
      const { error: updateErr } = await supabase
        .from('bloodwork_panels')
        .update({ values: formattedValues, collection_date: collectionDate, lab_name: labName || null })
        .eq('id', editPanelId);
      if (updateErr) { setError(updateErr.message); setUploading(false); return; }
      localStorage.setItem('pending_panel_id', editPanelId);
      localStorage.setItem('pending_panel_values', JSON.stringify(formattedValues));
      localStorage.setItem('pending_edit_report_id', editReportId);
      router.push('/lab/analyze');
      return;
    }

    // NEW PANEL — insert fresh panel + start/continue optimization cycle
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

    // Determine phase_type: if no panel exists for this cycle, 'initial'; otherwise 'final'
    const existingPanels = await supabase.from('bloodwork_panels').select('id').eq('cycle_id', cycleId);
    const phaseType = (existingPanels.data?.length ?? 0) === 0 ? 'initial' : 'final';

    const panelRes = await supabase.from('bloodwork_panels').insert({
      user_id: user.id, panel_number: panelNumber, cycle_id: cycleId,
      upload_type: 'manual', values: formattedValues,
      collection_date: collectionDate, lab_name: labName || null,
      phase_type: phaseType,
    }).select().single();

    if (panelRes.error) { setError(panelRes.error.message); setUploading(false); return; }

    localStorage.setItem('pending_panel_id', panelRes.data.id);
    localStorage.setItem('pending_panel_values', JSON.stringify(formattedValues));
    router.push('/lab/analyze');
  }

  return (
    <div className="relative min-h-full">
      {/* Subtle gradient wash - matching login/signup pages */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 15% 20%, rgba(200,162,200,0.06) 0%, transparent 50%), radial-gradient(ellipse 40% 35% at 90% 10%, rgba(74,222,128,0.03) 0%, transparent 52%)',
        }}
      />

      <div className="relative z-10 px-5 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto space-y-8">
        {/* HEADER */}
        <header className="border-b border-white/[0.06] pb-6">
          <div className="flex items-center gap-2 mb-2 text-[#C8A2C8]">
            <Cpu size={13} weight="duotone" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em]">Lab Data Entry</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tight"
              style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}>
              {isEditMode ? 'Edit Panel Data' : 'Enter Panel Data'}
            </h1>
            <div className="flex items-center gap-3 text-[9px] font-mono text-white/25 uppercase tracking-wider">
              <span>{filled.length} Values Entered</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT: BIOMARKER ARRAYS */}
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {/* ESSENTIAL PANEL */}
            <section>
              <SectionHeader
                icon={Pulse}
                iconColor="text-[#C8A2C8]"
                title="Essential Biomarkers"
                subtitle="Reference ranges shown"
              />
              <Card className="p-0 overflow-hidden" topAccent="rgba(200,162,200,0.4)"
                style={{ background: 'rgba(20,20,20,0.6)', borderColor: 'rgba(200,162,200,0.08)' }}>
                <div>
                  {essentialBio.map(b => (
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

            {/* RECOMMENDED PANEL */}
            {recommendedBio.length > 0 && (
              <section>
                <SectionHeader
                  icon={TestTube}
                  iconColor="text-[#E8C470]"
                  title="Recommended Biomarkers"
                />
                <Card className="p-0 overflow-hidden" topAccent="rgba(232,196,112,0.4)"
                  style={{ background: 'rgba(20,20,20,0.5)', borderColor: 'rgba(232,196,112,0.08)' }}>
                  <div>
                    {recommendedBio.map(b => (
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
            )}

            {/* EXTENDED PANEL */}
            {extendedBio.length > 0 && (
              <section>
                <SectionHeader
                  icon={Flask}
                  iconColor="text-white/30"
                  title="Extended Variables"
                />
                <Card className="p-0 overflow-hidden"
                  style={{ background: 'rgba(20,20,20,0.4)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div>
                    {extendedBio.map(b => (
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
            )}

            {/* ADDITIONAL MARKERS — registry markers outside the personalized panel */}
            {additionalBio.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setAdditionalExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-1 mb-3 group"
                >
                  <div className="flex items-center gap-2.5">
                    <TestTube size={15} className="text-white/20 group-hover:text-white/35 transition-colors" weight="duotone" />
                    <h2 className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em] group-hover:text-white/40 transition-colors">
                      Additional Markers
                    </h2>
                    <span className="text-[9px] font-mono text-white/15">({additionalBio.length})</span>
                  </div>
                  <CaretDown
                    size={14}
                    className={cn(
                      'text-white/20 transition-all group-hover:text-white/35',
                      additionalExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {additionalExpanded && (
                  <>
                    <p className="text-[9px] text-white/30 uppercase tracking-tighter px-1 mb-3 leading-relaxed">
                      Markers outside your personalized panel. Enter any values your lab report includes — they will be factored into the analysis.
                    </p>
                    <Card className="p-0 overflow-hidden"
                      style={{ background: 'rgba(20,20,20,0.3)', borderColor: 'rgba(255,255,255,0.04)' }}>
                      <div>
                        {additionalBio.map(b => (
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
                  </>
                )}
              </section>
            )}
          </div>

          {/* RIGHT: SIDEBAR CONTEXT */}
          <div className="col-span-12 lg:col-span-4 space-y-5">

            <Card className="p-5" topAccent="rgba(200,162,200,0.4)">
              <div className="flex items-center gap-2.5 mb-5">
                <Calendar className="text-[#C8A2C8]" size={16} weight="duotone" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.15em]">Entry Metadata</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-[0.18em]">Laboratory Source</label>
                  <input
                    value={labName}
                    onChange={e => setLabName(e.target.value)}
                    placeholder="e.g. QUEST DIAGNOSTICS"
                    className="w-full bg-[#0e0e0e] border border-white/10 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-[#C8A2C8]/60 transition-all rounded-sm placeholder:text-white/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-[0.18em]">Collection Date</label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={e => setCollectionDate(e.target.value)}
                    className="w-full bg-[#0e0e0e] border border-white/10 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-[#C8A2C8]/60 transition-all rounded-sm"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5"
              style={{ background: 'rgba(20,20,20,0.5)', borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5 mb-5">
                <ShieldCheck className="text-white/30" size={16} weight="duotone" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">Validation Status</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wide">Markers Entered</span>
                  <span className="text-sm font-mono font-bold text-white">{filled.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wide">Minimum Required</span>
                  <span className={cn(
                    "text-sm font-mono font-bold",
                    filled.length >= 3 ? "text-[#C8A2C8]" : "text-white/30"
                  )}>
                    {filled.length >= 3 ? 'PASSED' : '3'}
                  </span>
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2.5 p-3 bg-red-500/[0.06] border border-red-500/20 rounded-sm">
                    <WarningCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-400 font-bold leading-snug uppercase tracking-wide">{error}</p>
                  </div>
                )}
              </div>
            </Card>

            {recommendedCount > 0 && (
              <PanelCompletenessNote
                submittedCount={filled.length}
                recommendedCount={recommendedCount}
                context="upload"
              />
            )}

            <Button
              type="submit"
              loading={uploading}
              disabled={filled.length < 3}
              fullWidth
              className="py-4 flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(200,162,200,0.15)]"
            >
              {uploading ? (
                'Processing...'
              ) : isEditMode ? (
                <><span>Save & Re-analyze</span><ArrowRight size={16} /></>
              ) : (
                <><span>Confirm & Analyze</span><ArrowRight size={16} /></>
              )}
            </Button>

            <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.04] rounded-sm">
              <Info size={14} className="text-white/25 shrink-0 mt-0.5" weight="duotone" />
              <p className="text-[9px] text-white/30 uppercase leading-relaxed tracking-tighter">
                Enter values exactly as they appear on your lab report. Reference ranges are automatically adjusted based on your biological profile during analysis.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
