import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ProgressBar } from '../ui/ProgressBar';

interface OnboardingHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
}

export function OnboardingHeader({ step, totalSteps, title, subtitle }: OnboardingHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepRow}>
        <Text style={styles.stepText}>STEP {step} OF {totalSteps}</Text>
        <Text style={styles.stepTag}>ONBOARDING</Text>
      </View>
      <ProgressBar progress={step / totalSteps} height={2} style={{ marginBottom: 20 }} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stepText: { fontSize: 11, letterSpacing: 1.5, color: Colors.green, fontWeight: '600' },
  stepTag: { fontSize: 10, letterSpacing: 1.5, color: Colors.gray3, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: Colors.white, letterSpacing: 0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.gray2, lineHeight: 20 },
});
