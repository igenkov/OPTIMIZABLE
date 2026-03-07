import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Card } from '../../components/ui/Card';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { analyzeBloodwork } from '../../lib/claude';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Phase1Data, Phase2Data, Phase3Data, AnalysisReport } from '../../types';

type AnalysisStage = 'loading' | 'analyzing' | 'done' | 'error';

const STAGE_MESSAGES = [
  'Loading your profile...',
  'Interpreting your biomarkers...',
  'Calculating Testosterone Health Score...',
  'Generating personalized recommendations...',
  'Building your 90-day protocol...',
];

export default function AnalysisScreen() {
  const [stage, setStage] = useState<AnalysisStage>('loading');
  const [stageMsg, setStageMsg] = useState(STAGE_MESSAGES[0]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { runAnalysis(); }, []);

  async function runAnalysis() {
    try {
      setStage('analyzing');

      // Cycle through loading messages
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
        msgIdx = (msgIdx + 1) % STAGE_MESSAGES.length;
        setStageMsg(STAGE_MESSAGES[msgIdx]);
      }, 2500);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { clearInterval(msgInterval); router.replace('/(auth)/login'); return; }

      // Load all stored data
      const [p1Raw, p2Raw, p3Raw, sympRaw, panelId, panelValuesRaw] = await Promise.all([
        AsyncStorage.getItem('phase1'),
        AsyncStorage.getItem('phase2'),
        AsyncStorage.getItem('phase3'),
        AsyncStorage.getItem('symptoms'),
        AsyncStorage.getItem('pending_panel_id'),
        AsyncStorage.getItem('pending_panel_values'),
      ]);

      if (!p1Raw || !p2Raw || !p3Raw || !sympRaw || !panelValuesRaw) {
        throw new Error('Missing profile data. Please complete onboarding first.');
      }

      const phase1: Phase1Data = JSON.parse(p1Raw);
      const phase2: Phase2Data = JSON.parse(p2Raw);
      const phase3: Phase3Data = JSON.parse(p3Raw);
      const symptoms = JSON.parse(sympRaw);
      const bloodwork = JSON.parse(panelValuesRaw);

      // Get previous panel for comparison if it exists
      const prevPanelsRes = await supabase
        .from('bloodwork_panels')
        .select('values')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(1, 1);

      const previousBloodwork = prevPanelsRes.data?.[0]?.values;

      // Call Claude API
      const analysis = await analyzeBloodwork({
        phase1, phase2, phase3,
        symptoms: { ...symptoms, id: '', user_id: session.user.id, created_at: new Date().toISOString() },
        bloodwork,
        previousBloodwork,
      });

      clearInterval(msgInterval);

      // Save analysis to Supabase
      const { data: savedReport } = await supabase.from('analysis_reports').insert({
        user_id: session.user.id,
        bloodwork_panel_id: panelId,
        health_score: analysis.health_score,
        marker_analysis: analysis.marker_analysis,
        key_ratios: analysis.key_ratios,
        report_summary: analysis.report_summary,
        concerns: analysis.concerns,
        recommendations: analysis.recommendations,
        medical_referral_needed: analysis.medical_referral_needed,
        medical_referral_reason: analysis.medical_referral_reason,
      }).select().single();

      if (savedReport) {
        setReport({ ...analysis, id: savedReport.id, user_id: session.user.id, bloodwork_panel_id: panelId ?? '', created_at: savedReport.created_at });
      } else {
        setReport({ ...analysis, id: '', user_id: session.user.id, bloodwork_panel_id: panelId ?? '', created_at: new Date().toISOString() });
      }

      // Clean up
      await AsyncStorage.removeItem('pending_panel_id');
      await AsyncStorage.removeItem('pending_panel_values');

      setStage('done');

      // If medical referral needed, alert
      if (analysis.medical_referral_needed) {
        Alert.alert(
          '⚠ Medical Consultation Recommended',
          `Based on your results: ${analysis.medical_referral_reason}\n\nWe strongly recommend consulting an endocrinologist. Your profile report can be shared with your doctor.`,
          [{ text: 'Understood' }]
        );
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message ?? 'Analysis failed. Please check your API key and try again.');
      setStage('error');
    }
  }

  if (stage === 'loading' || stage === 'analyzing') {
    return (
      <SafeAreaView style={styles.root}>
        <LinearGradient colors={['rgba(0,230,118,0.06)', 'transparent']} style={styles.glow} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }} />
        <View style={styles.loadingRoot}>
          <View style={styles.loadingRing}>
            <ActivityIndicator color={Colors.green} size="large" />
          </View>
          <Text style={styles.loadingTitle}>ANALYZING YOUR BLOODWORK</Text>
          <Text style={styles.loadingMsg}>{stageMsg}</Text>
          <Text style={styles.loadingNote}>Powered by Claude AI · This may take 15–30 seconds</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.errorRoot}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Button label="TRY AGAIN" onPress={() => { setStage('loading'); setError(''); runAnalysis(); }} fullWidth style={{ marginBottom: 12 }} />
          <Button label="BACK" onPress={() => router.back()} variant="ghost" fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) return null;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['rgba(0,230,118,0.07)', 'transparent']} style={styles.glow} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }} />

        <Text style={styles.tag}>ANALYSIS COMPLETE</Text>
        <Text style={styles.title}>YOUR TESTOSTERONE{'\n'}HEALTH SCORE</Text>

        {/* Score */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <ScoreRing score={report.health_score} size={120} label="SCORE" />
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreDesc}>
                {report.health_score >= 70 ? 'Your hormonal profile is strong. Focus on optimization.' :
                 report.health_score >= 45 ? 'Significant room for improvement. Your protocol will make a real difference.' :
                 'Multiple areas need attention. Your protocol addresses the root causes.'}
              </Text>
              {report.medical_referral_needed && (
                <View style={styles.referralFlag}>
                  <Text style={styles.referralFlagText}>⚠ Specialist recommended</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Key ratios */}
        {report.key_ratios?.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>KEY RATIOS</Text>
            {report.key_ratios.map(r => (
              <View key={r.name} style={styles.ratioRow}>
                <View style={styles.ratioDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ratioName}>{r.name}</Text>
                  <Text style={styles.ratioInterp}>{r.interpretation}</Text>
                </View>
                <Text style={[styles.ratioVal, { color: getStatusColor(r.status) }]}>
                  {typeof r.value === 'number' ? r.value.toFixed(1) : r.value}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Biomarkers */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>BIOMARKER RESULTS</Text>
          {report.marker_analysis?.map(m => (
            <View key={m.marker} style={styles.markerBlock}>
              <View style={styles.markerHeader}>
                <Text style={styles.markerName}>{m.marker.replace(/_/g, ' ').toUpperCase()}</Text>
                <View style={styles.markerRight}>
                  <Text style={[styles.markerVal, { color: getStatusColor(m.status) }]}>{m.value} {m.unit}</Text>
                  <StatusBadge status={m.status} />
                </View>
              </View>
              <Text style={styles.markerExpl}>{m.explanation}</Text>
              <View style={styles.markerDivider} />
            </View>
          ))}
        </Card>

        {/* Report summary */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>ANALYSIS REPORT</Text>
          <Text style={styles.reportText}>{report.report_summary}</Text>
        </Card>

        {/* Concerns */}
        {report.concerns?.filter(c => c.severity !== 'low').length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>PRIORITY CONCERNS</Text>
            {report.concerns.filter(c => c.severity !== 'low').map((c, i) => (
              <View key={i} style={[styles.concernRow, { borderLeftColor: c.severity === 'high' ? Colors.red : Colors.gold }]}>
                <Text style={styles.concernMarker}>{c.marker.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.concernText}>{c.explanation}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Top supplement recommendations */}
        {report.recommendations?.supplements?.length > 0 && (
          <Card accent style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>YOUR SUPPLEMENT PROTOCOL</Text>
            {report.recommendations.supplements.slice(0, 5).map((s, i) => (
              <View key={i} style={styles.suppRow}>
                <View style={styles.suppIcon}><Text style={{ fontSize: 16 }}>💊</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suppName}>{s.name} — {s.dose}</Text>
                  <Text style={styles.suppTiming}>{s.timing}</Text>
                  <Text style={styles.suppReason}>{s.reason}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        <Button label="VIEW FULL PLAN →" onPress={() => router.replace('/(tabs)/plan')} fullWidth style={{ marginBottom: 12 }} />
        <Button label="GO TO DASHBOARD" onPress={() => router.replace('/(tabs)')} variant="secondary" fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, pointerEvents: 'none' },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  loadingRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: Colors.borderGreen, backgroundColor: Colors.greenDim, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  loadingTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 2, color: Colors.white },
  loadingMsg: { fontSize: 14, color: Colors.green, textAlign: 'center' },
  loadingNote: { fontSize: 12, color: Colors.gray3, textAlign: 'center' },
  errorRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },
  errorMsg: { fontSize: 14, color: Colors.gray2, textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 20, paddingBottom: 40 },
  tag: { fontSize: 10, letterSpacing: 3, color: Colors.green, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.white, lineHeight: 30, marginBottom: 20 },
  scoreCard: { marginBottom: 16, padding: 20 },
  scoreRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  scoreDesc: { fontSize: 13, color: Colors.gray2, lineHeight: 20 },
  referralFlag: { marginTop: 10, backgroundColor: Colors.redDim, borderWidth: 1, borderColor: Colors.red + '50', padding: 8 },
  referralFlagText: { fontSize: 12, color: Colors.red, fontWeight: '600' },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 12 },
  ratioRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ratioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green, marginTop: 6, flexShrink: 0 },
  ratioName: { fontSize: 13, fontWeight: '600', color: Colors.white, marginBottom: 2 },
  ratioInterp: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  ratioVal: { fontSize: 16, fontWeight: '700', flexShrink: 0 },
  markerBlock: { marginBottom: 12 },
  markerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  markerName: { fontSize: 11, letterSpacing: 1, color: Colors.gray2, fontWeight: '600', flex: 1 },
  markerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markerVal: { fontSize: 13, fontWeight: '700' },
  markerExpl: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  markerDivider: { height: 1, backgroundColor: Colors.border, marginTop: 10 },
  reportText: { fontSize: 14, color: Colors.gray1, lineHeight: 22 },
  concernRow: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12 },
  concernMarker: { fontSize: 11, fontWeight: '700', color: Colors.white, letterSpacing: 1, marginBottom: 3 },
  concernText: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  suppRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  suppIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.greenDim, borderWidth: 1, borderColor: Colors.borderGreen },
  suppName: { fontSize: 13, fontWeight: '600', color: Colors.white, marginBottom: 1 },
  suppTiming: { fontSize: 11, color: Colors.green, marginBottom: 2 },
  suppReason: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
});
