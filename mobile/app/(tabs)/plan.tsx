import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { supabase } from '../../lib/supabase';
import type { AnalysisReport, OptimizationCycle } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = [
  { key: 'eating',      icon: '🥗', label: 'Nutrition' },
  { key: 'exercise',    icon: '🏋️', label: 'Exercise' },
  { key: 'supplements', icon: '💊', label: 'Supplements' },
  { key: 'sleep',       icon: '😴', label: 'Sleep' },
  { key: 'stress',      icon: '🧘', label: 'Stress' },
  { key: 'habits',      icon: '🎯', label: 'Habits' },
];

export default function PlanScreen() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [cycle, setCycle] = useState<OptimizationCycle | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('eating');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const [rRes, cRes] = await Promise.all([
        supabase.from('analysis_reports').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('optimization_cycles').select('*').eq('user_id', uid).eq('status', 'active').single(),
      ]);

      if (rRes.data) setReport(rRes.data as AnalysisReport);
      if (cRes.data) setCycle(cRes.data as OptimizationCycle);

      const savedChecked = await AsyncStorage.getItem(`plan_checked_${new Date().toISOString().split('T')[0]}`);
      if (savedChecked) setChecked(JSON.parse(savedChecked));
    } finally {
      setLoading(false);
    }
  }

  async function toggleItem(key: string) {
    const updated = checked.includes(key) ? checked.filter(x => x !== key) : [...checked, key];
    setChecked(updated);
    await AsyncStorage.setItem(`plan_checked_${new Date().toISOString().split('T')[0]}`, JSON.stringify(updated));
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={Colors.green} /></View>;
  }

  const plan = report?.recommendations;
  const currentItems = plan ? (plan[activeCategory as keyof typeof plan] ?? []) : [];

  const totalItems = plan
    ? Object.values(plan).flat().length
    : 0;
  const checkedToday = checked.length;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>YOUR PROTOCOL</Text>
        {cycle && (
          <Text style={styles.cycleDay}>Day {cycle.current_day} of 90</Text>
        )}
      </View>

      {totalItems > 0 && (
        <View style={styles.progressSection}>
          <ProgressBar
            progress={checkedToday / Math.max(totalItems, 1)}
            label={`${checkedToday} / ${totalItems} completed today`}
            showPercent
          />
        </View>
      )}

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catTab, activeCategory === cat.key && styles.catTabActive]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, activeCategory === cat.key && styles.catLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!plan ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No protocol yet</Text>
            <Text style={styles.emptyText}>
              Upload your bloodwork results to generate your personalized 90-day optimization plan.
            </Text>
          </Card>
        ) : activeCategory === 'supplements' ? (
          (plan.supplements ?? []).map((s, i) => {
            const key = `sup_${i}`;
            return (
              <TouchableOpacity key={key} style={[styles.itemCard, checked.includes(key) && styles.itemCardChecked]} onPress={() => toggleItem(key)} activeOpacity={0.8}>
                <View style={[styles.checkbox, checked.includes(key) && styles.checkboxDone]}>
                  {checked.includes(key) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, checked.includes(key) && styles.itemTitleDone]}>{s.name}</Text>
                  <Text style={styles.itemDose}>{s.dose} · {s.timing}</Text>
                  <Text style={styles.itemReason}>{s.reason}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          (currentItems as string[]).map((item, i) => {
            const key = `${activeCategory}_${i}`;
            return (
              <TouchableOpacity key={key} style={[styles.itemCard, checked.includes(key) && styles.itemCardChecked]} onPress={() => toggleItem(key)} activeOpacity={0.8}>
                <View style={[styles.checkbox, checked.includes(key) && styles.checkboxDone]}>
                  {checked.includes(key) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.itemText, checked.includes(key) && styles.itemTextDone]}>{item}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: 2, color: Colors.white },
  cycleDay: { fontSize: 12, color: Colors.green, fontWeight: '600', letterSpacing: 1 },
  progressSection: { paddingHorizontal: 20, marginBottom: 8 },
  catScroll: { maxHeight: 68 },
  catRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 8 },
  catTab: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3, minWidth: 72 },
  catTabActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  catIcon: { fontSize: 16, marginBottom: 2 },
  catLabel: { fontSize: 10, color: Colors.gray2, fontWeight: '600', letterSpacing: 0.5 },
  catLabelActive: { color: Colors.green },
  scroll: { padding: 16, paddingBottom: 32 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  emptyText: { fontSize: 13, color: Colors.gray2, textAlign: 'center', lineHeight: 19 },
  itemCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 8, alignItems: 'flex-start' },
  itemCardChecked: { borderColor: Colors.borderGreen, backgroundColor: Colors.greenDim, opacity: 0.7 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: Colors.gray3, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxDone: { borderColor: Colors.green, backgroundColor: Colors.green },
  checkmark: { fontSize: 13, color: '#000', fontWeight: '700' },
  itemText: { flex: 1, fontSize: 14, color: Colors.gray1, lineHeight: 20 },
  itemTextDone: { color: Colors.gray3, textDecorationLine: 'line-through' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: Colors.white, marginBottom: 2 },
  itemTitleDone: { color: Colors.gray3, textDecorationLine: 'line-through' },
  itemDose: { fontSize: 12, color: Colors.green, fontWeight: '500', marginBottom: 4 },
  itemReason: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
});
