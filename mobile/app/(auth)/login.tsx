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
import { signIn } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error.message);
    }
    // Navigation is handled by the auth state listener in _layout.tsx
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
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoRing}>
            <Text style={styles.logoText}>O</Text>
          </View>
          <Text style={styles.brand}>OPTIMIZABLE</Text>
          <Text style={styles.tagline}>Malemaxxing, Quantified.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.heading}>SIGN IN</Text>
          <View style={styles.divider} />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button
            label="SIGN IN →"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={{ marginTop: 8 }}
          />

          <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text style={styles.switchLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
          This app does not provide medical advice.
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
  scroll: {
    flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40,
  },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.greenDim,
    marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: '700', color: Colors.green },
  brand: {
    fontSize: 20, fontWeight: '700', letterSpacing: 6,
    color: Colors.white,
  },
  tagline: { fontSize: 12, letterSpacing: 2, color: Colors.gray2, marginTop: 4 },
  form: {
    backgroundColor: Colors.bg3,
    borderWidth: 1, borderColor: Colors.border,
    padding: 24,
  },
  heading: {
    fontSize: 18, fontWeight: '700', letterSpacing: 3,
    color: Colors.white, marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 24 },
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { color: Colors.gray2, fontSize: 13 },
  switchLink: { color: Colors.green, fontWeight: '600' },
  disclaimer: {
    marginTop: 32, fontSize: 11, color: Colors.gray3,
    textAlign: 'center', lineHeight: 16,
  },
});
