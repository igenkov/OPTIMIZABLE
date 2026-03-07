import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { supabase } from '../../lib/supabase';
import type { AnalysisReport, OptimizationCycle } from '../../types';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [latestReport, setLatestReport] = useState<AnalysisReport | null>(null);
  const [cycle, setCycle] = useState<OptimizationCycle | null>(null);
  const [streak, setStreak] = useState(0);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const uid = session.user.id;
      setFirstName(session.user.email?.split('@')[0] ?? '');

      const [reportsRes, cycleRes, checkinsRes] = await Promise.all([
        supabase.from('analysis_reports').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('optimization_cycles').select('*').eq('user_id', uid).eq('status', 'active').single(),
        supabase.from('daily_checkins').select('date').eq('user_id', uid).order('date', { ascending: false }).limit(30),
      ]);

      if (reportsRes.data) setLatestReport(reportsRes.data as AnalysisReport);
      if (cycleRes.data) setCycle(cycleRes.data as OptimizationCycle);
      if (checkinsRes.data) setStreak(calcStreak(checkinsRes.data.map((c: { date: string }) => c.date)));
    } finally {
      setLoading(false);
    }
  }

  function calcStreak(dates: string[]): number {
    if (!dates.length) return 0;
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let current = today;
    for (const d of dates) {
      if (d === current) {
        streak++;
        const dt = new Date(current);
        dt.setDate(dt.getDate() - 1);
        current = dt.toISOString().split('T')[0];
      } else break;
    }
    return streak;
  }

  const daysLeft = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.end_date).getTime() - Date.now()) / 86400000))
    : null;

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient colors={['rgba(0,230,118,0.05)', 'transparent']} style={styles.glow} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>OPTIMIZABLE</Text>
            <Text style={styles.name}>{firstName || 'Your Dashboard'}</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakNum}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}
        </View>

        {/* Score + Quick Stats */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <ScoreRing
              score={latestReport?.health_score ?? 0}
              size={110}
              label="SCORE"
              sublabel={latestReport ? `Last updated ${new Date(latestReport.created_at).toLocaleDateString()}` : 'No data yet'}
            />
            <View style={styles.statsCols}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{cycle?.current_day ?? 0}</Text>
                <Text style={styles.statLbl}>Day of cycle</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{daysLeft ?? '—'}</Text>
                <Text style={styles.statLbl}>Days to retest</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: Colors.green }]}>{streak}</Text>
                <Text style={styles.statLbl}>Day streak</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Latest results preview */}
        {latestReport ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>LATEST BIOMARKERS</Text>
            {latestReport.marker_analysis?.slice(0, 5).map(m => (
              <View key={m.marker} style={styles.markerRow}>
                <Text style={styles.markerName}>{m.marker.replace(/_/g, ' ').toUpperCase()}</Text>
                <View style={styles.markerRight}>
                  <Text style={styles.markerVal}>{m.value} {m.unit}</Text>
                  <StatusBadge status={m.status} compact />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => router.push('/(tabs)/results')} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View Full Report →</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card accent style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>GET STARTED</Text>
            <Text style={styles.emptyText}>
              Upload your bloodwork to get your AI-powered analysis, Testosterone Health Score, and 90-day protocol.
            </Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/bloodwork/upload')}>
              <Text style={styles.uploadBtnText}>UPLOAD BLOODWORK →</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Today's top actions */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>TODAY'S PROTOCOL</Text>
          {latestReport?.recommendations ? (
            <>
              {(latestReport.recommendations.supplements ?? []).slice(0, 3).map((s, i) => (
                <View key={i} style={styles.actionRow}>
                  <Text style={styles.actionDot}>→</Text>
                  <Text style={styles.actionText}>{s.name} — {s.dose} ({s.timing})</Text>
                </View>
              ))}
              {(latestReport.recommendations.exercise ?? []).slice(0, 1).map((e, i) => (
                <View key={i} style={styles.actionRow}>
                  <Text style={styles.actionDot}>→</Text>
                  <Text style={styles.actionText}>{e}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyText}>Complete onboarding and upload bloodwork to get your daily protocol.</Text>
          )}
        </Card>

        {/* Quick check-in CTA */}
        <TouchableOpacity style={styles.checkinCta} onPress={() => router.push('/(tabs)/journal')}>
          <Text style={styles.checkinCtaText}>📓 Log Today's Check-In</Text>
          <Text style={styles.checkinCtaArrow}>→</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loadingRoot: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 250, pointerEvents: 'none' },
  scroll: { padding: 20, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 10, letterSpacing: 3, color: Colors.green, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: Colors.white, marginTop: 2 },
  streakBadge: { alignItems: 'center', backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: 'rgba(255,179,0,0.25)', padding: 10 },
  streakFire: { fontSize: 18 },
  streakNum: { fontSize: 20, fontWeight: '700', color: Colors.gold },
  streakLabel: { fontSize: 9, color: Colors.gold, letterSpacing: 1 },
  scoreCard: { marginBottom: 16, padding: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statsCols: { flex: 1, gap: 12 },
  statBox: {},
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.white },
  statLbl: { fontSize: 10, color: Colors.gray3, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 12 },
  markerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border },
  markerName: { fontSize: 12, color: Colors.gray2, letterSpacing: 0.5, flex: 1 },
  markerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markerVal: { fontSize: 13, color: Colors.white, fontWeight: '600' },
  viewAllBtn: { marginTop: 12, alignItems: 'flex-end' },
  viewAllText: { fontSize: 12, color: Colors.green, fontWeight: '600' },
  emptyText: { fontSize: 13, color: Colors.gray2, lineHeight: 19 },
  uploadBtn: { marginTop: 14, backgroundColor: Colors.green, height: 44, alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#000', letterSpacing: 1 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionDot: { color: Colors.green, fontWeight: '700', fontSize: 12 },
  actionText: { flex: 1, fontSize: 13, color: Colors.gray1, lineHeight: 18 },
  checkinCta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.borderGreen, padding: 16 },
  checkinCtaText: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  checkinCtaArrow: { fontSize: 16, color: Colors.green },
});
