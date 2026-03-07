import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Button } from '../components/ui/Button';

// RevenueCat integration
let Purchases: typeof import('react-native-purchases').default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = require('react-native-purchases').default;
} catch {}

const PREMIUM_FEATURES = [
  { icon: '🔬', title: 'AI Bloodwork Analysis', desc: 'Upload your labs and get a color-coded dashboard with plain-language explanations.' },
  { icon: '📋', title: '90-Day Optimization Plan', desc: 'Personalized daily protocol: sleep, nutrition, supplements, exercise, and habits.' },
  { icon: '📈', title: 'Progress Tracking', desc: 'Daily check-ins, trend graphs, and quarterly bloodwork comparisons.' },
  { icon: '🔄', title: '30-Day Re-Test Comparisons', desc: 'Side-by-side before/after analysis with updated protocol adjustments.' },
  { icon: '📄', title: 'Doctor\'s Request PDF', desc: 'Printable sheet with exact clinical codes to bring to your doctor.' },
  { icon: '📚', title: 'Full Knowledge Base', desc: 'Plain-language articles on every biomarker and optimization strategy.' },
];

export default function PaywallScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    const key = Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
    if (Purchases && key) {
      Purchases.configure({ apiKey: key });
    }
  }, []);

  async function handleSubscribe() {
    setLoading(true);
    try {
      if (!Purchases) {
        // Dev mode — skip paywall and go to tabs
        router.replace('/(tabs)');
        return;
      }
      const offerings = await Purchases.getOfferings();
      const pkg = selectedPlan === 'annual'
        ? offerings.current?.annual
        : offerings.current?.monthly;

      if (!pkg) {
        Alert.alert('Unavailable', 'Subscription options are not available right now. Please try again later.');
        return;
      }

      await Purchases.purchasePackage(pkg);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) {
        Alert.alert('Purchase failed', err.message ?? 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      if (!Purchases) { router.replace('/(tabs)'); return; }
      const info = await Purchases.restorePurchases();
      if (info.activeSubscriptions.length > 0) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('No subscription found', 'No active subscription was found to restore.');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={['rgba(0,230,118,0.08)', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.tag}>UNLOCK PREMIUM</Text>
          <Text style={styles.heading}>GET YOUR EDGE BACK.</Text>
          <Text style={styles.sub}>
            Your profile and symptom data are ready. Now get the analysis, protocol, and tracking to act on them.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {PREMIUM_FEATURES.map(f => (
            <View key={f.title} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardActive]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>BEST VALUE</Text>
            </View>
            <Text style={styles.planPrice}>$59.99<Text style={styles.planPer}>/year</Text></Text>
            <Text style={styles.planNote}>$5.00/mo — save 50%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={styles.planPrice}>$9.99<Text style={styles.planPer}>/mo</Text></Text>
            <Text style={styles.planNote}>Cancel anytime</Text>
          </TouchableOpacity>
        </View>

        <Button
          label={`START MY PROTOCOL →`}
          onPress={handleSubscribe}
          loading={loading}
          fullWidth
          style={{ marginBottom: 12 }}
        />

        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore previous purchase</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Subscriptions auto-renew unless cancelled 24 hours before the renewal date.
          Basic assessment is always free. This app does not provide medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, pointerEvents: 'none' },
  scroll: { padding: 24, paddingBottom: 40 },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  closeBtnText: { fontSize: 16, color: Colors.gray2 },
  header: { alignItems: 'center', paddingVertical: 24 },
  tag: { fontSize: 10, letterSpacing: 3, color: Colors.green, fontWeight: '700', marginBottom: 8 },
  heading: { fontSize: 28, fontWeight: '700', color: Colors.white, letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.gray2, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  features: { marginBottom: 24, gap: 16 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: { fontSize: 20, width: 28 },
  featureTitle: { fontSize: 14, fontWeight: '600', color: Colors.white, marginBottom: 2 },
  featureDesc: { fontSize: 12, color: Colors.gray2, lineHeight: 17 },
  plans: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  planCard: {
    flex: 1, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
    padding: 16, alignItems: 'center', position: 'relative', overflow: 'hidden',
  },
  planCardActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  planBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.gold, paddingHorizontal: 8, paddingVertical: 3,
  },
  planBadgeText: { fontSize: 9, fontWeight: '700', color: '#000', letterSpacing: 0.5 },
  planPrice: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  planPer: { fontSize: 13, color: Colors.gray2, fontWeight: '400' },
  planNote: { fontSize: 11, color: Colors.gray2, textAlign: 'center' },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { fontSize: 13, color: Colors.gray2, textDecorationLine: 'underline' },
  disclaimer: { fontSize: 10, color: Colors.gray3, textAlign: 'center', lineHeight: 16, marginTop: 12 },
});
