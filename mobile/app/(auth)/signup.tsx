import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { signUp } from '../../lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Signup failed', error.message);
    } else {
      Alert.alert(
        'Account created!',
        'Check your email to confirm your account, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['rgba(0,230,118,0.06)', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={styles.logoRing}>
            <Text style={styles.logoText}>O</Text>
          </View>
          <Text style={styles.brand}>OPTIMIZABLE</Text>
          <Text style={styles.tagline}>Start your protocol today.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.heading}>CREATE ACCOUNT</Text>
          <View style={styles.divider} />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Min. 8 characters"
          />
          <Input
            label="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button
            label="CREATE ACCOUNT →"
            onPress={handleSignup}
            loading={loading}
            fullWidth
            style={{ marginTop: 8 }}
          />

          <TouchableOpacity style={styles.switchRow} onPress={() => router.back()}>
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
          All health data is encrypted and never sold.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    pointerEvents: 'none',
  },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.greenDim, marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: '700', color: Colors.green },
  brand: { fontSize: 20, fontWeight: '700', letterSpacing: 6, color: Colors.white },
  tagline: { fontSize: 12, letterSpacing: 2, color: Colors.gray2, marginTop: 4 },
  form: {
    backgroundColor: Colors.bg3, borderWidth: 1,
    borderColor: Colors.border, padding: 24,
  },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: 3, color: Colors.white, marginBottom: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 24 },
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { color: Colors.gray2, fontSize: 13 },
  switchLink: { color: Colors.green, fontWeight: '600' },
  disclaimer: { marginTop: 32, fontSize: 11, color: Colors.gray3, textAlign: 'center', lineHeight: 16 },
});
