import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { supabase, getTodayCheckin, saveCheckin, getActiveCycle, getCheckins } from '../../lib/supabase';
import type { DailyCheckin } from '../../types';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const ADHERENCE_OPTS = [
  { value: 'fully',    label: 'Fully' },
  { value: 'mostly',   label: 'Mostly' },
  { value: 'partially',label: 'Partly' },
  { value: 'not_today',label: 'Not Today' },
] as const;

function RatingRow({ label, value, onValue, color = Colors.green }: { label: string; value: number; onValue: (n: number) => void; color?: string }) {
  return (
    <View style={rr.container}>
      <Text style={rr.label}>{label}</Text>
      <View style={rr.dots}>
        {[1,2,3,4,5].map(n => (
          <TouchableOpacity key={n} onPress={() => onValue(n)} style={[rr.dot, { backgroundColor: n <= value ? color : Colors.bg3, borderColor: n <= value ? color : Colors.border }]}>
            <Text style={[rr.dotNum, { color: n <= value ? '#000' : Colors.gray3 }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const rr = StyleSheet.create({
  container: { marginBottom: 18 },
  label: { fontSize: 11, letterSpacing: 1.2, color: Colors.gray2, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dotNum: { fontSize: 14, fontWeight: '700' },
});

function MiniChart({ data, color = Colors.green, height = 50 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 280;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / (max - min + 0.001)) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={w} height={height} style={{ overflow: 'visible' }}>
      <Polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - ((v - min) / (max - min + 0.001)) * (height - 6) - 3;
        return <Circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </Svg>
  );
}

export default function JournalScreen() {
  const [loading, setLoading] = useState(true);
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [libido, setLibido] = useState(3);
  const [stress, setStress] = useState(3);
  const [exercised, setExercised] = useState(false);
  const [adherence, setAdherence] = useState<'fully'|'mostly'|'partially'|'not_today'>('mostly');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<DailyCheckin[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const [todayRes, cycleRes] = await Promise.all([
        getTodayCheckin(uid),
        getActiveCycle(uid),
      ]);

      if (todayRes.data) setAlreadyLogged(true);

      if (cycleRes.data) {
        const checkinsRes = await getCheckins(uid, cycleRes.data.id);
        if (checkinsRes.data) setHistory(checkinsRes.data as DailyCheckin[]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const cycleRes = await getActiveCycle(session.user.id);
      const cycle_id = cycleRes.data?.id ?? '';

      await saveCheckin(session.user.id, {
        cycle_id,
        date: new Date().toISOString().split('T')[0],
        mood, energy, sleep_quality: sleepQuality, sleep_hours: sleepHours,
        libido, stress, exercised, exercise_type: exercised ? 'General' : null,
        plan_adherence: adherence, notes: notes || null,
      });

      setAlreadyLogged(true);
      Alert.alert('Logged!', 'Great work. Your check-in is saved.');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to save check-in.');
    } finally {
      setSaving(false);
    }
  }

  const energyData = history.map(c => c.energy);
  const moodData = history.map(c => c.mood);
  const sleepData = history.map(c => c.sleep_quality);
  const libidoData = history.map(c => c.libido);

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Colors.green} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>DAILY CHECK-IN</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

        {alreadyLogged ? (
          <Card accent style={{ marginBottom: 20 }}>
            <Text style={styles.doneTitle}>✓ Already checked in today</Text>
            <Text style={styles.doneText}>Come back tomorrow for your next check-in.</Text>
          </Card>
        ) : (
          <Card style={{ marginBottom: 20 }}>
            {/* Mood */}
            <Text style={rr.label}>MOOD</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
              {MOODS.map((emoji, i) => (
                <TouchableOpacity key={i} onPress={() => setMood(i + 1)} style={[styles.moodBtn, mood === i + 1 && styles.moodBtnActive]}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <RatingRow label="Energy Level" value={energy} onValue={setEnergy} />
            <RatingRow label="Sleep Quality" value={sleepQuality} onValue={setSleepQuality} />

            <View style={rr.container}>
              <Text style={rr.label}>Hours Slept</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[5,6,7,8,9,10].map(h => (
                  <TouchableOpacity key={h} style={[styles.hrBtn, sleepHours === h && styles.hrBtnActive]} onPress={() => setSleepHours(h)}>
                    <Text style={[styles.hrBtnText, sleepHours === h && styles.hrBtnTextActive]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <RatingRow label="Libido" value={libido} onValue={setLibido} color={Colors.gold} />
            <RatingRow label="Stress (1=calm, 5=high)" value={stress} onValue={setStress} color={Colors.red} />

            <View style={rr.container}>
              <Text style={rr.label}>Exercised today?</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[true, false].map(v => (
                  <TouchableOpacity key={String(v)} style={[styles.hrBtn, exercised === v && styles.hrBtnActive]} onPress={() => setExercised(v)}>
                    <Text style={[styles.hrBtnText, exercised === v && styles.hrBtnTextActive]}>{v ? 'Yes' : 'No'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={rr.container}>
              <Text style={rr.label}>Plan adherence</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {ADHERENCE_OPTS.map(a => (
                  <TouchableOpacity key={a.value} style={[styles.hrBtn, adherence === a.value && styles.hrBtnActive]} onPress={() => setAdherence(a.value)}>
                    <Text style={[styles.hrBtnText, adherence === a.value && styles.hrBtnTextActive]}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={rr.label}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput} value={notes} onChangeText={setNotes}
              placeholder="Anything to log..." placeholderTextColor={Colors.gray3}
              multiline numberOfLines={3}
            />

            <Button label="SAVE CHECK-IN →" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 16 }} />
          </Card>
        )}

        {/* Trend charts */}
        {history.length > 1 && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.chartsTitle}>30-DAY TRENDS</Text>
            {[
              { label: 'Energy', data: energyData, color: Colors.green },
              { label: 'Mood', data: moodData, color: Colors.gold },
              { label: 'Sleep Quality', data: sleepData, color: '#00B0FF' },
              { label: 'Libido', data: libidoData, color: Colors.red },
            ].map(({ label, data, color }) => (
              <View key={label} style={styles.chartRow}>
                <View style={styles.chartLabelRow}>
                  <Text style={[styles.chartLabel, { color }]}>{label}</Text>
                  <Text style={styles.chartAvg}>avg {(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)}/5</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <MiniChart data={data} color={color} />
                </ScrollView>
                <View style={styles.chartDivider} />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: 2, color: Colors.white, marginBottom: 4 },
  date: { fontSize: 12, color: Colors.gray2, marginBottom: 20 },
  doneTitle: { fontSize: 14, fontWeight: '700', color: Colors.green, marginBottom: 4 },
  doneText: { fontSize: 13, color: Colors.gray2 },
  moodBtn: { flex: 1, height: 48, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  moodBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  hrBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3 },
  hrBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  hrBtnText: { fontSize: 13, color: Colors.gray2, fontWeight: '500' },
  hrBtnTextActive: { color: Colors.green, fontWeight: '700' },
  notesInput: { backgroundColor: Colors.bg4, borderWidth: 1, borderColor: Colors.border, color: Colors.white, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 72 },
  chartsTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 16 },
  chartRow: { marginBottom: 16 },
  chartLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  chartLabel: { fontSize: 12, fontWeight: '600' },
  chartAvg: { fontSize: 11, color: Colors.gray3 },
  chartDivider: { height: 1, backgroundColor: Colors.border, marginTop: 12 },
});
