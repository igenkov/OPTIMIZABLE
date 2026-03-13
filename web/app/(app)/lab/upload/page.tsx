'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BIOMARKERS, CORE_PANEL_IDS, EXTENDED_PANEL_IDS } from '@/constants/biomarkers';

function BiomarkerRow({ id, name, unit, value, onChange }: { id: string; name: string; unit: string; value: string; onChange: (id: string, val: string) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)]">
      <div>
        <div className="text-sm text-[#E0E0E0] font-medium">{name}</div>
        <div className="text-xs text-[#4A4A4A]">{unit}</div>
      </div>
      <input
        type="number"
        step="any"
        value={value}
        onChange={e => onChange(id, e.target.value)}
        placeholder="—"
        className="w-24 px-3 py-2 text-right text-sm bg-[#1f1f1f] border border-[rgba(255,255,255,0.07)] text-white placeholder-[#4A4A4A] focus:border-[#00E676] outline-none"
      />
    </div>
  );
}

export default function LabUploadPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [labName, setLabName] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const core = BIOMARKERS.filter(b => CORE_PANEL_IDS.includes(b.id));
  const extended = BIOMARKERS.filter(b => EXTENDED_PANEL_IDS.includes(b.id));
  const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (filled.length < 3) { setError('Please enter at least 3 biomarker values.'); return; }

    // Validate collection date
    const today = new Date().toISOString().split('T')[0];
    if (collectionDate > today) { setError('Collection date cannot be in the future.'); return; }
    const fiveYearsAgo = new Date(); fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (new Date(collectionDate) < fiveYearsAgo) { setError('Collection date cannot be more than 5 years ago.'); return; }

    // Validate biomarker values
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
      formattedValues[id] = { marker: id, value: Number(v), unit: b?.unit_primary ?? '' };
    }

    const countRes = await supabase.from('bloodwork_panels').select('id').eq('user_id', user.id);
    const panelNumber = (countRes.data?.length ?? 0) + 1;

    let cycleId = '';
    const cycleRes = await supabase.from('optimization_cycles').select('id').eq('user_id', user.id).eq('status', 'active').single();
    if (cycleRes.data) {
      cycleId = cycleRes.data.id;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const end = new Date(); end.setDate(end.getDate() + 90);
      const newCycle = await supabase.from('optimization_cycles').insert({
        user_id: user.id, start_date: today,
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

  function handleBiomarkerChange(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }));
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <div className="text-xs text-[#4A4A4A] tracking-widest uppercase mb-2">
          LAB → Upload Panel
        </div>
        <h1 className="text-lg font-bold tracking-[3px] uppercase text-white mb-2">Enter Bloodwork Values</h1>
        <p className="text-sm text-[#9A9A9A]">
          Enter the values from your lab report. The AI will analyze every biomarker against optimal ranges and generate your personalized protocol.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-4">Collection Info</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Lab Name (optional)" value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. Quest Diagnostics" />
            <Input label="Collection Date" type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} />
          </div>
        </Card>

        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Core Panel</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Leave blank if not tested.</p>
          {core.map(b => <BiomarkerRow key={b.id} id={b.id} name={b.name} unit={b.unit_primary} value={values[b.id] ?? ''} onChange={handleBiomarkerChange} />)}
        </Card>

        <Card>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-1">Extended Panel</div>
          <p className="text-xs text-[#4A4A4A] mb-4">Enter any additional markers you had tested:</p>
          {extended.map(b => <BiomarkerRow key={b.id} id={b.id} name={b.name} unit={b.unit_primary} value={values[b.id] ?? ''} onChange={handleBiomarkerChange} />)}
        </Card>

        <Card accent>
          <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-3">Draw Timing Reminder</div>
          {['Draw blood between 7:00–10:00 AM (testosterone peaks in the morning)',
            'Fast for 10–12 hours beforehand',
            'No heavy exercise for 24 hours prior'].map((t, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="text-[#00E676] font-bold shrink-0">→</span>
              <span className="text-xs text-[#9A9A9A]">{t}</span>
            </div>
          ))}
        </Card>

        <div className="text-xs text-[#9A9A9A] mb-2">
          {filled.length} value{filled.length !== 1 ? 's' : ''} entered (minimum 3 required)
        </div>

        {error && <p className="text-xs text-[#FF5252]">{error}</p>}
        <Button type="submit" loading={uploading} fullWidth disabled={filled.length < 3}>
          {uploading ? 'Saving...' : 'ANALYZE →'}
        </Button>
      </form>
    </div>
  );
}
