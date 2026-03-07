import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { SYMPTOMS, SYMPTOM_CATEGORIES } from '../../constants/symptoms';
import { scoreSymptoms } from '../../lib/scoring';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RiskLevel } from '../../lib/scoring';

export default function SymptomsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleSymptom(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleNext() {
    if (selected.length === 0) {
      Alert.alert('No symptoms selected', 'Please select at least one symptom, or select that you have none.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const { weighted_score, symptom_count } = scoreSymptoms(selected);

      const risk_level: RiskLevel =
        weighted_score >= 12 ? 'very_high' :
        weighted_score >= 8  ? 'high' :
        weighted_score >= 4  ? 'moderate' : 'low';

      const data = {
        symptoms_selected: selected,
        symptom_count,
        weighted_score,
        risk_level,
      };

      await supabase.from('symptom_assessments').insert({ user_id: session.user.id, ...data });
      await AsyncStorage.setItem('symptoms', JSON.stringify(data));

      router.push('/(onboarding)/summary');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader
          step={4} totalSteps={5}
          title="Symptom Assessment"
          subtitle="Select every symptom you currently experience. Be honest — this is private and improves your results."
        />

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{selected.length} symptoms selected</Text>
        </View>

        {SYMPTOM_CATEGORIES.map(category => {
          const categorySymptoms = SYMPTOMS.filter(s => s.category === category);
          return (
            <View key={category} style={styles.category}>
              <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
              {categorySymptoms.map(s => {
                const isSelected = selected.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.symptomCard, isSelected && styles.symptomCardActive]}
                    onPress={() => toggleSymptom(s.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.symptomLeft}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[styles.symptomName, isSelected && styles.symptomNameActive]}>
                        {s.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.weightDot, {
                        backgroundColor:
                          s.correlation_weight >= 0.9 ? Colors.red :
                          s.correlation_weight >= 0.75 ? Colors.gold :
                          Colors.green
                      }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your symptom profile is combined with your lifestyle data to generate a personalized risk score and determine which blood tests are most important for you.
          </Text>
        </View>

        <Button
          label={`ANALYZE MY SYMPTOMS (${selected.length}) →`}
          onPress={handleNext}
          loading={loading}
          fullWidth
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  countBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.greenDim,
    borderWidth: 1, borderColor: Colors.borderGreen,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20,
  },
  countText: { fontSize: 12, color: Colors.green, fontWeight: '600', letterSpacing: 0.5 },
  category: { marginBottom: 24 },
  categoryTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.gray3, textTransform: 'uppercase', marginBottom: 10 },
  symptomCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 8,
  },
  symptomCardActive: { borderColor: Colors.borderGreen, backgroundColor: Colors.greenDim },
  symptomLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderWidth: 1, borderColor: Colors.gray3,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxActive: { borderColor: Colors.green, backgroundColor: Colors.green },
  checkmark: { fontSize: 12, color: '#000', fontWeight: '700' },
  symptomName: { flex: 1, fontSize: 13, color: Colors.gray2, lineHeight: 18 },
  symptomNameActive: { color: Colors.white },
  weightDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 8 },
  infoBox: { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 2, borderLeftColor: Colors.green, padding: 12, marginTop: 8 },
  infoText: { fontSize: 12, color: Colors.gray2, lineHeight: 18 },
});
