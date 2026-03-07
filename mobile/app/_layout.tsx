import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const OPTIMIZABLE_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0e0e0e',
    card: '#141414',
    border: 'rgba(255,255,255,0.07)',
    primary: '#00E676',
    text: '#FFFFFF',
  },
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    SplashScreen.hideAsync();
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [initialized, session]);

  if (!initialized) return null;

  return (
    <ThemeProvider value={OPTIMIZABLE_THEME}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0e0e0e' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bloodwork/upload" />
        <Stack.Screen name="bloodwork/analysis" />
      </Stack>
    </ThemeProvider>
  );
}
