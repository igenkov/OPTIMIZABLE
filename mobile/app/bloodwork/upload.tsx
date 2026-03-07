import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BIOMARKERS, CORE_PANEL_IDS, EXTENDED_PANEL_IDS } from '../../constants/biomarkers';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UploadMethod = 'manual' | 'photo' | 'pdf';

export default function BloodworkUploadScreen() {
  const [method, setMethod] = useState<UploadMethod>('manual');
  const [values, setValues] = useState<Record<string, { value: string; unit: string }>>({});
  const [labName, setLabName] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);

  const allPanelIds = [...CORE_PANEL_IDS, ...EXTENDED_PANEL_IDS];
  const panelBiomarkers = BIOMARKERS.filter(b => allPanelIds.includes(b.id));

  function setValue(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: { value: val, unit: BIOMARKERS.find(b => b.id === id)?.unit_primary ?? '' } }));
  }

  async function handlePhotoUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled) {
      Alert.alert(
        'Photo selected',
        'OCR scanning is coming in v1.1. Please enter your values manually below.',
      );
      setMethod('manual');
    }
  }

  async function handlePdfUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) {
      Alert.alert(
        'PDF selected',
        'PDF parsing is coming in v1.1. Please enter your values manually below.',
      );
      setMethod('manual');
    }
  }

  async function handleSubmit() {
    const filledValues = Object.entries(values).filter(([, v]) => v.value.trim() !== '');
    if (filledValues.length < 3) {
      Alert.alert('Not enough data', 'Please enter at least 3 biomarker values to generate analysis.');
      return;
    }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      // Format values for storage
      const formattedValues: Record<string, { marker: string; value: number; unit: string }> = {};
      for (const [id, v] of filledValues) {
        formattedValues[id] = { marker: id, value: Number(v.value), unit: v.unit };
      }

      // Get panel count
      const countRes = await supabase.from('bloodwork_panels').select('id').eq('user_id', session.user.id);
      const panelNumber = (countRes.data?.length ?? 0) + 1;

      // Get or create cycle
      let cycleId = '';
      const cycleRes = await supabase.from('optimization_cycles').select('id').eq('user_id', session.user.id).eq('status', 'active').single();
      if (cycleRes.data) {
        cycleId = cycleRes.data.id;
      } else {
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);
        const newCycleRes = await supabase.from('optimization_cycles').insert({
          user_id: session.user.id,
          start_date: today,
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
          current_day: 1,
        }).select().single();
        cycleId = newCycleRes.data?.id ?? '';
      }

      const panelRes = await supabase.from('bloodwork_panels').insert({
        user_id: session.user.id,
        panel_number: panelNumber,
        cycle_id: cycleId,
        upload_type: method,
        values: formattedValues,
        collection_date: collectionDate,
        lab_name: labName || null,
      }).select().single();

      if (panelRes.error) throw panelRes.error;

      // Store panel ID and navigate to analysis
      await AsyncStorage.setItem('pending_panel_id', panelRes.data.id);
      await AsyncStorage.setItem('pending_panel_values', JSON.stringify(formattedValues));

      router.push('/bloodwork/analysis');
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert('Error', err.message ?? 'Failed to save bloodwork. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>UPLOAD BLOODWORK</Text>
          <Text style={styles.subtitle}>Enter your lab values to get your AI-powered analysis and Testosterone Health Score.</Text>
        </View>

        {/* Method selector */}
        <View style={styles.methodRow}>
          {([
            { key: 'manual', label: '📝 Manual Entry', desc: 'Type values' },
            { key: 'photo', label: '📷 Photo', desc: 'v1.1' },
            { key: 'pdf', label: '📄 PDF', desc: 'v1.1' },
          ] as { key: UploadMethod; label: string; desc: string }[]).map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
              onPress={() => {
                if (m.key === 'photo') handlePhotoUpload();
                else if (m.key === 'pdf') handlePdfUpload();
                else setMethod(m.key);
              }}
            >
              <Text style={styles.methodEmoji}>{m.label.split(' ')[0]}</Text>
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>{m.label.split(' ').slice(1).join(' ')}</Text>
              <Text style={styles.methodDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Collection info */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>COLLECTION INFO</Text>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>Lab Name (optional)</Text>
            <TextInput style={styles.textInput} value={labName} onChangeText={setLabName} placeholder="e.g. Quest Diagnostics" placeholderTextColor={Colors.gray3} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Collection Date</Text>
            <TextInput style={styles.textInput} value={collectionDate} onChangeText={setCollectionDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.gray3} />
          </View>
        </Card>

        {/* Biomarker entry */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>CORE PANEL</Text>
          <Text style={styles.sectionNote}>Enter the values from your lab report. Leave blank if not tested.</Text>
          {panelBiomarkers.filter(b => CORE_PANEL_IDS.includes(b.id)).map(b => (
            <View key={b.id} style={styles.markerRow}>
              <View style={styles.markerInfo}>
                <Text style={styles.markerName}>{b.name}</Text>
                <Text style={styles.markerUnit}>{b.unit_primary}</Text>
              </View>
              <TextInput
                style={styles.markerInput}
                value={values[b.id]?.value ?? ''}
                onChangeText={v => setValue(b.id, v)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={Colors.gray3}
              />
            </View>
          ))}
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>EXTENDED PANEL</Text>
          <Text style={styles.sectionNote}>If you had these tested:</Text>
          {panelBiomarkers.filter(b => EXTENDED_PANEL_IDS.includes(b.id)).map(b => (
            <View key={b.id} style={styles.markerRow}>
              <View style={styles.markerInfo}>
                <Text style={styles.markerName}>{b.name}</Text>
                <Text style={styles.markerUnit}>{b.unit_primary}</Text>
              </View>
              <TextInput
                style={styles.markerInput}
                value={values[b.id]?.value ?? ''}
                onChangeText={v => setValue(b.id, v)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={Colors.gray3}
              />
            </View>
          ))}
        </Card>

        <Card accent style={{ marginBottom: 20 }}>
          <Text style={styles.tipTitle}>IMPORTANT: TIMING NOTE</Text>
          {[
            'Draw blood between 7:00–10:00 AM (testosterone peaks in the morning)',
            'Fast for 10–12 hours beforehand',
            'No heavy exercise for 24 hours prior',
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>→</Text>
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </Card>

        {uploading ? (
          <View style={styles.analyzing}>
            <ActivityIndicator color={Colors.green} size="large" />
            <Text style={styles.analyzingText}>Saving your results...</Text>
          </View>
        ) : (
          <Button label="ANALYZE MY BLOODWORK →" onPress={handleSubmit} fullWidth />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, color: Colors.green },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 1.5, color: Colors.white, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.gray2, lineHeight: 19 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  methodBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg3, alignItems: 'center', gap: 2 },
  methodBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  methodEmoji: { fontSize: 20 },
  methodLabel: { fontSize: 11, fontWeight: '600', color: Colors.gray2, letterSpacing: 0.5 },
  methodLabelActive: { color: Colors.green },
  methodDesc: { fontSize: 10, color: Colors.gray3 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 4 },
  sectionNote: { fontSize: 12, color: Colors.gray3, marginBottom: 14 },
  fieldLabel: { fontSize: 11, letterSpacing: 1.2, color: Colors.gray2, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  textInput: { backgroundColor: Colors.bg4, borderWidth: 1, borderColor: Colors.border, color: Colors.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  markerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  markerInfo: { flex: 1 },
  markerName: { fontSize: 13, color: Colors.gray1, fontWeight: '500' },
  markerUnit: { fontSize: 11, color: Colors.gray3, marginTop: 1 },
  markerInput: { width: 80, backgroundColor: Colors.bg4, borderWidth: 1, borderColor: Colors.border, color: Colors.white, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'right' },
  tipTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.green, marginBottom: 8 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tipDot: { color: Colors.green, fontWeight: '700' },
  tipText: { flex: 1, fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  analyzing: { alignItems: 'center', gap: 12, padding: 24 },
  analyzingText: { fontSize: 14, color: Colors.gray2 },
});
