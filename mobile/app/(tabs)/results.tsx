import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Card } from '../../components/ui/Card';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { StatusBadge, getStatusColor } from '../../components/ui/StatusBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { supabase } from '../../lib/supabase';
import type { AnalysisReport } from '../../types';

export default function ResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (res.data) setReports(res.data as AnalysisReport[]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Colors.green} /></View>;

  const report = reports[activeIdx];

  if (reports.length === 0) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyRoot}>
          <Text style={styles.emptyIcon}>⚗</Text>
          <Text style={styles.emptyTitle}>No Bloodwork Yet</Text>
          <Text style={styles.emptyText}>
            Upload your lab results to get your AI-powered analysis, Testosterone Health Score, and personalized optimization plan.
          </Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/bloodwork/upload')}>
            <Text style={styles.uploadBtnText}>UPLOAD BLOODWORK →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Panel selector */}
      {reports.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.panelScroll} contentContainerStyle={styles.panelRow}>
          {reports.map((r, i) => (
            <TouchableOpacity key={r.id} style={[styles.panelTab, activeIdx === i && styles.panelTabActive]} onPress={() => setActiveIdx(i)}>
              <Text style={[styles.panelTabText, activeIdx === i && styles.panelTabTextActive]}>
                Panel {reports.length - i}
              </Text>
              <Text style={styles.panelTabDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Score header */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <ScoreRing score={report.health_score} size={100} label="SCORE" />
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>TESTOSTERONE HEALTH SCORE</Text>
              <Text style={styles.panelDate}>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
              {report.medical_referral_needed && (
                <View style={styles.referralBanner}>
                  <Text style={styles.referralText}>⚠ Medical consultation recommended</Text>
                </View>
              )}
            </View>
          </View>
          {/* Score vs previous */}
          {reports.length > 1 && activeIdx < reports.length - 1 && (
            <View style={styles.deltaRow}>
              <Text style={styles.deltaLabel}>vs. previous panel:</Text>
              <Text style={[styles.deltaVal, { color: report.health_score >= reports[activeIdx + 1].health_score ? Colors.green : Colors.red }]}>
                {report.health_score >= reports[activeIdx + 1].health_score ? '+' : ''}
                {(report.health_score - reports[activeIdx + 1].health_score).toFixed(0)} pts
              </Text>
            </View>
          )}
        </Card>

        {/* Key Ratios */}
        {report.key_ratios?.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>KEY RATIOS</Text>
            {report.key_ratios.map(r => (
              <View key={r.name} style={styles.ratioRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ratioName}>{r.name}</Text>
                  <Text style={styles.ratioInterp} numberOfLines={2}>{r.interpretation}</Text>
                </View>
                <View style={styles.ratioRight}>
                  <Text style={[styles.ratioVal, { color: getStatusColor(r.status) }]}>{typeof r.value === 'number' ? r.value.toFixed(1) : r.value}</Text>
                  <StatusBadge status={r.status} compact />
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Biomarker dashboard */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>BIOMARKER DASHBOARD</Text>
          {report.marker_analysis?.map(m => {
            const pct = Math.min(1, m.value / (m.optimal_range?.high ?? m.value * 1.2));
            return (
              <View key={m.marker} style={styles.markerBlock}>
                <View style={styles.markerHeader}>
                  <Text style={styles.markerName}>{m.marker.replace(/_/g, ' ').toUpperCase()}</Text>
                  <View style={styles.markerRight}>
                    <Text style={[styles.markerVal, { color: getStatusColor(m.status) }]}>
                      {m.value} {m.unit}
                    </Text>
                    <StatusBadge status={m.status} />
                  </View>
                </View>
                <ProgressBar progress={pct} color={getStatusColor(m.status)} height={3} />
                <Text style={styles.markerExpl} numberOfLines={3}>{m.explanation}</Text>
              </View>
            );
          })}
        </Card>

        {/* Report Summary */}
        {report.report_summary && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>ANALYSIS REPORT</Text>
            <Text style={styles.reportText}>{report.report_summary}</Text>
          </Card>
        )}

        {/* Concerns */}
        {report.concerns?.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>AREAS OF CONCERN</Text>
            {report.concerns.map((c, i) => (
              <View key={i} style={[styles.concernRow, {
                borderLeftColor: c.severity === 'high' ? Colors.red : c.severity === 'medium' ? Colors.gold : Colors.green
              }]}>
                <Text style={styles.concernMarker}>{c.marker.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.concernText}>{c.explanation}</Text>
              </View>
            ))}
          </Card>
        )}

        <TouchableOpacity style={styles.uploadNewBtn} onPress={() => router.push('/bloodwork/upload')}>
          <Text style={styles.uploadNewText}>+ Upload New Panel</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.gray2, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  uploadBtn: { backgroundColor: Colors.green, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center' },
  uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#000', letterSpacing: 1 },
  panelScroll: { maxHeight: 64 },
  panelRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 10 },
  panelTab: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  panelTabActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  panelTabText: { fontSize: 12, color: Colors.gray2, fontWeight: '600' },
  panelTabTextActive: { color: Colors.green },
  panelTabDate: { fontSize: 10, color: Colors.gray3, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  scoreCard: { marginBottom: 16, padding: 20 },
  scoreRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  panelTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: Colors.gray2, marginBottom: 4 },
  panelDate: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  referralBanner: { marginTop: 8, backgroundColor: Colors.redDim, borderWidth: 1, borderColor: Colors.red + '40', padding: 8 },
  referralText: { fontSize: 12, color: Colors.red, fontWeight: '600' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  deltaLabel: { fontSize: 12, color: Colors.gray2 },
  deltaVal: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 12 },
  ratioRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ratioName: { fontSize: 13, fontWeight: '600', color: Colors.white, marginBottom: 2 },
  ratioInterp: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  ratioRight: { alignItems: 'flex-end', gap: 4 },
  ratioVal: { fontSize: 16, fontWeight: '700' },
  markerBlock: { marginBottom: 16 },
  markerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  markerName: { fontSize: 11, letterSpacing: 1, color: Colors.gray2, fontWeight: '600', flex: 1 },
  markerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markerVal: { fontSize: 13, fontWeight: '700' },
  markerExpl: { fontSize: 12, color: Colors.gray2, lineHeight: 17, marginTop: 6 },
  reportText: { fontSize: 14, color: Colors.gray1, lineHeight: 22 },
  concernRow: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12 },
  concernMarker: { fontSize: 11, fontWeight: '700', color: Colors.white, letterSpacing: 1, marginBottom: 3 },
  concernText: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  uploadNewBtn: { borderWidth: 1, borderColor: Colors.borderGreen, backgroundColor: Colors.greenDim, padding: 14, alignItems: 'center', marginBottom: 8 },
  uploadNewText: { fontSize: 13, fontWeight: '700', color: Colors.green, letterSpacing: 0.5 },
});
