import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDICATIONS = [
  'Antidepressants (SSRIs)', 'Opioid painkillers', 'Statins',
  'Blood pressure medication', 'Corticosteroids', 'Finasteride/Dutasteride', 'Other',
];
const SUPPLEMENTS = [
  'Vitamin D', 'Zinc', 'Magnesium', 'Ashwagandha', 'DHEA',
  'Boron', 'Tongkat Ali', 'Fenugreek', 'D-Aspartic Acid', 'Fish Oil', 'Other',
];

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      {[true, false].map(v => (
        <TouchableOpacity
          key={String(v)}
          style={[toggle.btn, value === v && toggle.btnActive]}
          onPress={() => onChange(v)}
        >
          <Text style={[toggle.text, value === v && toggle.textActive]}>{v ? 'Yes' : 'No'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const toggle = StyleSheet.create({
  btn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  btnActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  text: { fontSize: 14, color: Colors.gray2, fontWeight: '600' },
  textActive: { color: Colors.green },
});

function MultiChips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (s: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {options.map(o => (
        <TouchableOpacity key={o} style={[chip.base, selected.includes(o) && chip.active]} onPress={() => onToggle(o)}>
          <Text style={[chip.text, selected.includes(o) && chip.textActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const chip = StyleSheet.create({
  base: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  active: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  text: { fontSize: 12, color: Colors.gray2 },
  textActive: { color: Colors.green, fontWeight: '600' },
});

function SelectRow({ label, options, value, onSelect }: { label: string; options: { label: string; value: string }[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {options.map(o => (
          <TouchableOpacity key={o.value} style={[chip.base, value === o.value && chip.active]} onPress={() => onSelect(o.value)}>
            <Text style={[chip.text, value === o.value && chip.textActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function Phase3Screen() {
  const [takingMeds, setTakingMeds] = useState(false);
  const [medications, setMedications] = useState<string[]>([]);
  const [takingSupps, setTakingSupps] = useState(false);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [steroidHistory, setSteroidHistory] = useState('never');
  const [steroidStoppedAgo, setSteroidStoppedAgo] = useState('');
  const [steroidPct, setSteroidPct] = useState(false);
  const [trtHistory, setTrtHistory] = useState('never');
  const [trtType, setTrtType] = useState('');
  const [previousBloodwork, setPreviousBloodwork] = useState(false);
  const [knownTotalT, setKnownTotalT] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMed = (m: string) => setMedications(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  const toggleSupp = (s: string) => setSupplements(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  async function handleNext() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const data = {
        taking_medications: takingMeds, medications,
        taking_supplements: takingSupps, supplements,
        steroid_history: steroidHistory,
        steroid_stopped_ago: steroidHistory === 'past' ? steroidStoppedAgo : null,
        steroid_pct: steroidHistory === 'past' ? steroidPct : null,
        trt_history: trtHistory,
        trt_type: trtHistory !== 'never' ? trtType : null,
        previous_bloodwork: previousBloodwork,
        known_total_t: knownTotalT ? Number(knownTotalT) : null,
        known_total_t_unit: 'ng/dL',
      };

      await supabase.from('medical_history').upsert({ user_id: session.user.id, ...data });
      await AsyncStorage.setItem('phase3', JSON.stringify(data));

      router.push('/(onboarding)/symptoms');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader step={3} totalSteps={5} title="Medical History" subtitle="Medications and hormonal history are critical for accurate interpretation." />

        <Text style={styles.fieldLabel}>CURRENTLY TAKING MEDICATIONS?</Text>
        <YesNoToggle value={takingMeds} onChange={setTakingMeds} />
        {takingMeds && (
          <>
            <Text style={styles.fieldLabel}>SELECT MEDICATIONS</Text>
            <MultiChips options={MEDICATIONS} selected={medications} onToggle={toggleMed} />
          </>
        )}

        <Text style={styles.fieldLabel}>CURRENTLY TAKING SUPPLEMENTS?</Text>
        <YesNoToggle value={takingSupps} onChange={setTakingSupps} />
        {takingSupps && (
          <>
            <Text style={styles.fieldLabel}>SELECT SUPPLEMENTS</Text>
            <MultiChips options={SUPPLEMENTS} selected={supplements} onToggle={toggleSupp} />
          </>
        )}

        <SelectRow label="ANABOLIC STEROID HISTORY" value={steroidHistory} onSelect={setSteroidHistory} options={[
          { label: 'Never', value: 'never' }, { label: 'Used in the past', value: 'past' }, { label: 'Currently using', value: 'current' },
        ]} />
        {steroidHistory === 'past' && (
          <>
            <SelectRow label="HOW LONG AGO DID YOU STOP?" value={steroidStoppedAgo} onSelect={setSteroidStoppedAgo} options={[
              { label: '< 6 months', value: 'less_than_6_months' }, { label: '6–12 months', value: '6-12_months' },
              { label: '1–2 years', value: '1-2_years' }, { label: '2+ years', value: '2+_years' },
            ]} />
            <Text style={styles.fieldLabel}>DID YOU DO PCT (POST-CYCLE THERAPY)?</Text>
            <YesNoToggle value={steroidPct} onChange={setSteroidPct} />
          </>
        )}

        <SelectRow label="TRT HISTORY" value={trtHistory} onSelect={setTrtHistory} options={[
          { label: 'Never', value: 'never' }, { label: 'Past TRT', value: 'past' }, { label: 'Currently on TRT', value: 'current' },
        ]} />
        {trtHistory !== 'never' && (
          <Input label="TRT TYPE (e.g. injections, gel, patches)" value={trtType} onChangeText={setTrtType} placeholder="e.g. weekly injections" />
        )}

        <Text style={styles.fieldLabel}>PREVIOUS TESTOSTERONE BLOODWORK?</Text>
        <YesNoToggle value={previousBloodwork} onChange={setPreviousBloodwork} />
        {previousBloodwork && (
          <Input label="KNOWN TOTAL TESTOSTERONE (ng/dL, optional)" value={knownTotalT} onChangeText={setKnownTotalT} keyboardType="decimal-pad" placeholder="e.g. 420" />
        )}

        <Button label="CONTINUE →" onPress={handleNext} loading={loading} fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.gray2, textTransform: 'uppercase', marginBottom: 8 },
});
