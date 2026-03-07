import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase, signOut } from '../../lib/supabase';

const MENU_SECTIONS = [
  {
    title: 'ACCOUNT',
    items: [
      { icon: '👤', label: 'Edit Personal Details', action: 'onboarding' },
      { icon: '🩸', label: 'Retake Symptom Assessment', action: 'symptoms' },
      { icon: '💎', label: 'Subscription', action: 'subscription' },
    ],
  },
  {
    title: 'APP SETTINGS',
    items: [
      { icon: '🔔', label: 'Notification Settings', action: 'notifications' },
      { icon: '📏', label: 'Units (metric / imperial)', action: 'units' },
      { icon: '📤', label: 'Export My Data', action: 'export' },
    ],
  },
  {
    title: 'LEGAL',
    items: [
      { icon: '🛡️', label: 'Privacy Policy', action: 'privacy' },
      { icon: '📋', label: 'Terms of Service', action: 'terms' },
      { icon: '⚕️', label: 'Medical Disclaimer', action: 'disclaimer' },
    ],
  },
];

const DISCLAIMER = `Optimizable is a wellness tool for informational and educational purposes only. It does not provide medical advice, diagnosis, or treatment.

Always consult a qualified healthcare professional before making changes to your health, lifestyle, or supplement routine.

All data is encrypted at rest and in transit. We never sell your health data.`;

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('free');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? '');
      const res = await supabase.from('users').select('subscription_tier').eq('id', session.user.id).single();
      if (res.data) setTier(res.data.subscription_tier);
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action: string) {
    switch (action) {
      case 'onboarding': router.push('/(onboarding)/phase1'); break;
      case 'symptoms': router.push('/(onboarding)/symptoms'); break;
      case 'subscription': router.push('/paywall'); break;
      case 'disclaimer':
        Alert.alert('Medical Disclaimer', DISCLAIMER);
        break;
      default:
        Alert.alert('Coming soon', 'This feature will be available in the next update.');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Colors.green} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>PROFILE</Text>

        {/* Account card */}
        <Card style={styles.accountCard}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarLetter}>{email.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.emailText}>{email}</Text>
          <View style={[styles.tierBadge, tier === 'premium' ? styles.tierPremium : styles.tierFree]}>
            <Text style={[styles.tierText, tier === 'premium' ? styles.tierTextPremium : styles.tierTextFree]}>
              {tier === 'premium' ? '⭐ PREMIUM' : 'FREE TIER'}
            </Text>
          </View>
        </Card>

        {/* Notifications toggle */}
        <Card style={{ marginBottom: 16 }}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Daily Check-in Reminders</Text>
              <Text style={styles.toggleSub}>8:00 PM notification</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.bg4, true: Colors.greenDim }}
              thumbColor={notificationsEnabled ? Colors.green : Colors.gray3}
            />
          </View>
        </Card>

        {/* Menu sections */}
        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.action}
                  style={[styles.menuItem, i < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => handleAction(item.action)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Medical disclaimer box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚕️ This app is a wellness tool. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.
          </Text>
        </View>

        <Button
          label="SIGN OUT"
          onPress={handleSignOut}
          variant="ghost"
          loading={signingOut}
          fullWidth
          style={{ marginTop: 8 }}
        />

        <Text style={styles.version}>Optimizable v1.0.0 · malemaxxing quantified</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: 2, color: Colors.white, marginBottom: 20 },
  accountCard: { alignItems: 'center', paddingVertical: 28, marginBottom: 16 },
  avatarRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: Colors.green, backgroundColor: Colors.greenDim, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLetter: { fontSize: 28, fontWeight: '700', color: Colors.green },
  emailText: { fontSize: 14, color: Colors.gray1, marginBottom: 10 },
  tierBadge: { paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1 },
  tierFree: { borderColor: Colors.gray3, backgroundColor: Colors.bg4 },
  tierPremium: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  tierText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  tierTextFree: { color: Colors.gray2 },
  tierTextPremium: { color: Colors.gold },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.white },
  toggleSub: { fontSize: 12, color: Colors.gray2, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Colors.gray3, marginBottom: 8, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { fontSize: 16, width: 24 },
  menuLabel: { flex: 1, fontSize: 14, color: Colors.gray1 },
  menuChevron: { fontSize: 20, color: Colors.gray3 },
  disclaimerBox: { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 2, borderLeftColor: Colors.green, padding: 12, marginBottom: 20 },
  disclaimerText: { fontSize: 11, color: Colors.gray3, lineHeight: 17 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.gray3, marginTop: 16 },
});
