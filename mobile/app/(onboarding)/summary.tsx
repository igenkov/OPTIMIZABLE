import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { calculateRiskScore, getRiskColor, getRiskLabel, getRecommendedTests } from '../../lib/scoring';
import { BIOMARKER_MAP } from '../../constants/biomarkers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Phase1Data, Phase2Data, Phase3Data } from '../../types';

export default function SummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'moderate' | 'high' | 'very_high'>('moderate');
  const [keyFactors, setKeyFactors] = useState<string[]>([]);
  const [coreTests, setCoreTests] = useState<string[]>([]);
  const [extendedTests, setExtendedTests] = useState<string[]>([]);

  useEffect(() => {
    async function compute() {
      try {
        const [p1Raw, p2Raw, p3Raw, sympRaw] = await Promise.all([
          AsyncStorage.getItem('phase1'),
          AsyncStorage.getItem('phase2'),
          AsyncStorage.getItem('phase3'),
          AsyncStorage.getItem('symptoms'),
        ]);

        if (!p1Raw || !p2Raw || !p3Raw || !sympRaw) return;

        const phase1: Phase1Data = JSON.parse(p1Raw);
        const phase2: Phase2Data = JSON.parse(p2Raw);
        const phase3: Phase3Data = JSON.parse(p3Raw);
        const symptoms = JSON.parse(sympRaw);

        const result = calculateRiskScore(phase1, phase2, phase3, symptoms.symptoms_selected);
        const tests = getRecommendedTests(phase1, phase2, phase3, symptoms.symptoms_selected);

        setRiskScore(result.score);
        setRiskLevel(result.risk_level);
        setKeyFactors(result.key_factors);
        setCoreTests(tests.core);
        setExtendedTests(tests.extended);
      } finally {
        setLoading(false);
      }
    }
    compute();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={Colors.green} size="large" />
        <Text style={styles.loadingText}>Analyzing your profile...</Text>
      </View>
    );
  }

  const riskColor = getRiskColor(riskLevel);
  const riskLabel = getRiskLabel(riskLevel);

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[`${riskColor}10`, 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.tag}>STEP 5 OF 5 · ASSESSMENT COMPLETE</Text>
        <Text style={styles.heading}>YOUR HORMONAL HEALTH SUMMARY</Text>

        {/* Risk Score */}
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>HORMONE RISK SCORE</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: riskColor }]}>{riskScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
            <View style={[styles.riskBadge, { borderColor: riskColor + '40', backgroundColor: riskColor + '15' }]}>
              <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
              <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel}</Text>
            </View>
          </View>
          <ProgressBar progress={riskScore / 100} color={riskColor} height={6} style={{ marginTop: 12 }} />
          <Text style={styles.scoreNote}>
            Based on your age, lifestyle, symptoms, and medical history. Bloodwork will give us the objective data to confirm and refine this.
          </Text>
        </Card>

        {/* Key Factors */}
        {keyFactors.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>KEY RISK FACTORS IDENTIFIED</Text>
            {keyFactors.map((f, i) => (
              <View key={i} style={styles.factorRow}>
                <View style={styles.factorDot} />
                <Text style={styles.factorText}>{f}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recommended Tests */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>YOUR RECOMMENDED BLOODWORK PANEL</Text>
          <Text style={styles.sectionSub}>Core panel (recommended for all users):</Text>
          {coreTests.map(id => {
            const bm = BIOMARKER_MAP[id];
            if (!bm) return null;
            return (
              <View key={id} style={styles.testRow}>
                <View style={styles.testDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.testName}>{bm.name}</Text>
                  <Text style={styles.testDesc} numberOfLines={2}>{bm.description}</Text>
                </View>
              </View>
            );
          })}
          {extendedTests.length > 0 && (
            <>
              <Text style={[styles.sectionSub, { marginTop: 16 }]}>Extended panel (based on your profile):</Text>
              {extendedTests.map(id => {
                const bm = BIOMARKER_MAP[id];
                if (!bm) return null;
                return (
                  <View key={id} style={styles.testRow}>
                    <View style={[styles.testDot, { backgroundColor: Colors.gold }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.testName}>{bm.name}</Text>
                      <Text style={styles.testDesc} numberOfLines={2}>{bm.description}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </Card>

        {/* Bloodwork guidance */}
        <Card accent style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>BEFORE YOUR BLOOD DRAW</Text>
          {[
            'Schedule for 7:00–10:00 AM — testosterone peaks in the morning.',
            'Fast for 10–12 hours beforehand (water is fine).',
            'Avoid heavy exercise for 24 hours prior.',
            'No alcohol for 48 hours before the test.',
            'Get a normal night\'s sleep the night before.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipNum}>{i + 1}</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Card>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            This assessment is based on your self-reported data and is not a medical diagnosis. The next step is bloodwork to get objective measurements.
          </Text>
        </View>

        <Button
          label="GET MY BLOODWORK DONE →"
          onPress={() => router.replace('/paywall')}
          fullWidth
          style={{ marginTop: 8 }}
        />
        <Text style={styles.pricingNote}>
          Free tier complete. Premium unlocks AI analysis + 90-day protocol.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loadingRoot: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: Colors.gray2, fontSize: 14, letterSpacing: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 250, pointerEvents: 'none' },
  scroll: { padding: 24, paddingBottom: 48 },
  tag: { fontSize: 10, letterSpacing: 2, color: Colors.green, fontWeight: '600', marginBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.white, letterSpacing: 0.5, marginBottom: 24 },
  scoreCard: { marginBottom: 16, padding: 20 },
  scoreLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gray2, fontWeight: '600', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  scoreNum: { fontSize: 52, fontWeight: '700', lineHeight: 56 },
  scoreMax: { fontSize: 20, color: Colors.gray3, marginBottom: 8 },
  riskBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 4 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  scoreNote: { fontSize: 12, color: Colors.gray2, lineHeight: 18, marginTop: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 12 },
  sectionSub: { fontSize: 12, color: Colors.gray2, marginBottom: 10 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  factorDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.red, marginTop: 6, flexShrink: 0 },
  factorText: { flex: 1, fontSize: 13, color: Colors.gray1, lineHeight: 18 },
  testRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  testDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green, marginTop: 6, flexShrink: 0 },
  testName: { fontSize: 14, color: Colors.white, fontWeight: '600', marginBottom: 2 },
  testDesc: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.green, color: '#000', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 20, flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, color: Colors.gray1, lineHeight: 18 },
  disclaimerBox: { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 16 },
  disclaimerText: { fontSize: 12, color: Colors.gray3, lineHeight: 18, textAlign: 'center', fontStyle: 'italic' },
  pricingNote: { textAlign: 'center', color: Colors.gray3, fontSize: 12, marginTop: 12 },
});
