import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SelectOption = { label: string; value: string };

function SelectRow({ label, options, value, onSelect }: {
  label: string;
  options: SelectOption[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={sel.container}>
      <Text style={sel.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sel.row}>
        {options.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[sel.chip, value === o.value && sel.chipActive]}
            onPress={() => onSelect(o.value)}
          >
            <Text style={[sel.chipText, value === o.value && sel.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const sel = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.gray2, textTransform: 'uppercase', marginBottom: 8 },
  row: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  chipActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  chipText: { fontSize: 13, color: Colors.gray2 },
  chipTextActive: { color: Colors.green, fontWeight: '600' },
});

function RatingRow({ label, value, onValue, min = 1, max = 5, tintColor = Colors.green }: {
  label: string; value: number; onValue: (n: number) => void; min?: number; max?: number; tintColor?: string;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.gray2, textTransform: 'uppercase' }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: tintColor }}>{value}</Text>
      </View>
      <Slider
        minimumValue={min} maximumValue={max} step={1}
        value={value} onValueChange={onValue}
        minimumTrackTintColor={tintColor}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={tintColor}
      />
    </View>
  );
}

const EXERCISE_TYPES = ['Weight Training', 'Running', 'Cycling', 'Sports', 'Walking', 'Swimming', 'HIIT', 'Mixed'];

export default function Phase2Screen() {
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [smoking, setSmoking] = useState('never');
  const [alcohol, setAlcohol] = useState('rarely');
  const [coffee, setCoffee] = useState('2-3');
  const [sugar, setSugar] = useState('moderate');
  const [exerciseFreq, setExerciseFreq] = useState('3-4x');
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);
  const [sedentary, setSedentary] = useState(6);
  const [sexFreq, setSexFreq] = useState('1-2x_week');
  const [libido, setLibido] = useState(5);
  const [erectile, setErectile] = useState(8);
  const [loading, setLoading] = useState(false);

  function toggleExType(t: string) {
    setExerciseTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function handleNext() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const data = {
        avg_sleep_hours: sleepHours, sleep_quality: sleepQuality,
        smoking_status: smoking, alcohol_frequency: alcohol,
        coffee_per_day: coffee, sugar_consumption: sugar,
        exercise_frequency: exerciseFreq, exercise_types: exerciseTypes,
        sedentary_hours: sedentary, sexual_frequency: sexFreq,
        libido_rating: libido, erectile_rating: erectile,
      };

      await supabase.from('lifestyle').upsert({ user_id: session.user.id, ...data });
      await AsyncStorage.setItem('phase2', JSON.stringify(data));

      router.push('/(onboarding)/phase3');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader step={2} totalSteps={5} title="Way of Life" subtitle="Your daily habits are among the most powerful levers for hormonal health." />

        <RatingRow label={`Sleep: ${sleepHours}h/night`} value={sleepHours} onValue={setSleepHours} min={3} max={12} />
        <RatingRow label="Sleep Quality" value={sleepQuality} onValue={setSleepQuality} min={1} max={5} />

        <SelectRow label="Smoking" value={smoking} onSelect={setSmoking} options={[
          { label: 'Never', value: 'never' }, { label: 'Former', value: 'former' },
          { label: 'Occasional', value: 'occasional' }, { label: 'Daily', value: 'daily' },
        ]} />
        <SelectRow label="Alcohol" value={alcohol} onSelect={setAlcohol} options={[
          { label: 'Never', value: 'never' }, { label: 'Rarely', value: 'rarely' },
          { label: 'Moderate', value: 'moderate' }, { label: 'Frequent', value: 'frequent' },
          { label: 'Daily', value: 'daily' },
        ]} />
        <SelectRow label="Coffee / Day" value={coffee} onSelect={setCoffee} options={[
          { label: 'None', value: 'none' }, { label: '1 cup', value: '1' },
          { label: '2–3 cups', value: '2-3' }, { label: '4–5 cups', value: '4-5' },
          { label: '6+', value: '6+' },
        ]} />
        <SelectRow label="Sugar Intake" value={sugar} onSelect={setSugar} options={[
          { label: 'Rarely', value: 'rarely' }, { label: 'Moderate', value: 'moderate' },
          { label: 'Frequent', value: 'frequent' }, { label: 'Very High', value: 'very_high' },
        ]} />
        <SelectRow label="Exercise Frequency" value={exerciseFreq} onSelect={setExerciseFreq} options={[
          { label: 'None', value: 'none' }, { label: '1–2×/wk', value: '1-2x' },
          { label: '3–4×/wk', value: '3-4x' }, { label: '5–6×/wk', value: '5-6x' },
          { label: 'Daily', value: 'daily' },
        ]} />

        <Text style={styles.sectionLabel}>EXERCISE TYPES</Text>
        <View style={styles.chips}>
          {EXERCISE_TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, exerciseTypes.includes(t) && styles.chipActive]} onPress={() => toggleExType(t)}>
              <Text style={[styles.chipText, exerciseTypes.includes(t) && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
        <RatingRow label={`Sedentary: ${sedentary}h/day`} value={sedentary} onValue={setSedentary} min={1} max={16} tintColor={sedentary > 8 ? Colors.red : Colors.green} />

        <Text style={styles.privacy}>The following questions are private, encrypted, and help us understand your hormonal feedback loop.</Text>

        <SelectRow label="Sexual Activity" value={sexFreq} onSelect={setSexFreq} options={[
          { label: 'Rarely', value: 'rarely' }, { label: '1–2×/mo', value: '1-2x_month' },
          { label: '1–2×/wk', value: '1-2x_week' }, { label: '3–4×/wk', value: '3-4x_week' },
          { label: 'Daily', value: 'daily' },
        ]} />
        <RatingRow label={`Libido: ${libido}/10`} value={libido} onValue={setLibido} min={1} max={10} tintColor={libido < 4 ? Colors.red : Colors.green} />
        <RatingRow label={`Erectile Function: ${erectile}/10`} value={erectile} onValue={setErectile} min={1} max={10} tintColor={erectile < 5 ? Colors.red : Colors.green} />

        <Button label="CONTINUE →" onPress={handleNext} loading={loading} fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.gray2, textTransform: 'uppercase', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  chipActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  chipText: { fontSize: 13, color: Colors.gray2 },
  chipTextActive: { color: Colors.green, fontWeight: '600' },
  privacy: { fontSize: 12, color: Colors.gray3, marginBottom: 20, padding: 12, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 2, borderLeftColor: Colors.gold, backgroundColor: Colors.goldDim },
});
