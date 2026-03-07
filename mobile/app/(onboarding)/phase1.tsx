import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONDITIONS = [
  'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Thyroid disorder',
  'Obesity', 'Cardiovascular disease', 'Liver disease',
  'Kidney disease', 'Sleep apnea', 'Depression/Anxiety', 'None',
];

export default function Phase1Screen() {
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [conditions, setConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleCondition(c: string) {
    if (c === 'None') { setConditions(['None']); return; }
    setConditions(prev => {
      const without = prev.filter(x => x !== 'None');
      return without.includes(c) ? without.filter(x => x !== c) : [...without, c];
    });
  }

  async function handleNext() {
    if (!age || !height || !weight) {
      Alert.alert('Required fields', 'Please enter age, height, and weight.');
      return;
    }
    const ageNum = Number(age);
    if (ageNum < 18 || ageNum > 80) {
      Alert.alert('Invalid age', 'Please enter an age between 18 and 80.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const heightCm = unit === 'metric' ? Number(height) : Number(height) * 2.54;
      const weightKg = unit === 'metric' ? Number(weight) : Number(weight) * 0.453592;

      const data = {
        age: ageNum, height_cm: heightCm, weight_kg: weightKg,
        body_fat_percent: bodyFat ? Number(bodyFat) : null,
        medical_conditions: conditions,
        unit_preference: unit,
      };

      // Save to Supabase
      await supabase.from('profiles').upsert({ user_id: session.user.id, ...data });
      // Cache locally for offline use
      await AsyncStorage.setItem('phase1', JSON.stringify(data));

      router.push('/(onboarding)/phase2');
    } catch (e) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader
          step={1} totalSteps={5}
          title="Personal Details"
          subtitle="This baseline snapshot helps us interpret your results accurately."
        />

        {/* Unit toggle */}
        <View style={styles.unitRow}>
          {(['metric', 'imperial'] as const).map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                {u === 'metric' ? 'kg / cm' : 'lbs / in'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 35" />
        <Input label={`Height (${unit === 'metric' ? 'cm' : 'inches'})`} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder={unit === 'metric' ? 'e.g. 178' : 'e.g. 70'} />
        <Input label={`Weight (${unit === 'metric' ? 'kg' : 'lbs'})`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={unit === 'metric' ? 'e.g. 82' : 'e.g. 180'} />
        <Input label="Body Fat % (optional)" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="e.g. 18" />

        <Text style={styles.sectionLabel}>MEDICAL CONDITIONS</Text>
        <View style={styles.chips}>
          {CONDITIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, conditions.includes(c) && styles.chipActive]}
              onPress={() => toggleCondition(c)}
            >
              <Text style={[styles.chipText, conditions.includes(c) && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Why we ask: Age, body composition, and medical conditions directly affect how testosterone is produced and metabolized — and how we interpret your results.
          </Text>
        </View>

        <Button label="CONTINUE →" onPress={handleNext} loading={loading} fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  unitRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  unitBtn: {
    flex: 1, height: 40, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3,
  },
  unitBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  unitBtnText: { fontSize: 12, color: Colors.gray2, fontWeight: '600', letterSpacing: 1 },
  unitBtnTextActive: { color: Colors.green },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: Colors.gray2, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  chipActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  chipText: { fontSize: 13, color: Colors.gray2 },
  chipTextActive: { color: Colors.green, fontWeight: '600' },
  infoBox: { marginTop: 20, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 2, borderLeftColor: Colors.green, padding: 12 },
  infoText: { fontSize: 12, color: Colors.gray2, lineHeight: 18 },
});
