import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Auth helpers ──────────────────────────────────────────────────────────
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

// ─── Profile helpers ───────────────────────────────────────────────────────
export async function upsertProfile(userId: string, data: Record<string, unknown>) {
  return supabase.from('profiles').upsert({ user_id: userId, ...data });
}

export async function upsertLifestyle(userId: string, data: Record<string, unknown>) {
  return supabase.from('lifestyle').upsert({ user_id: userId, ...data });
}

export async function upsertMedicalHistory(userId: string, data: Record<string, unknown>) {
  return supabase.from('medical_history').upsert({ user_id: userId, ...data });
}

export async function saveSymptomAssessment(userId: string, data: Record<string, unknown>) {
  return supabase.from('symptom_assessments').insert({ user_id: userId, ...data });
}

export async function getUserSubscription(userId: string) {
  return supabase
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();
}

// ─── Bloodwork helpers ─────────────────────────────────────────────────────
export async function saveBloodworkPanel(userId: string, data: Record<string, unknown>) {
  return supabase.from('bloodwork_panels').insert({ user_id: userId, ...data }).select().single();
}

export async function getBloodworkPanels(userId: string) {
  return supabase
    .from('bloodwork_panels')
    .select('*')
    .eq('user_id', userId)
    .order('collection_date', { ascending: false });
}

export async function saveAnalysisReport(userId: string, data: Record<string, unknown>) {
  return supabase.from('analysis_reports').insert({ user_id: userId, ...data }).select().single();
}

export async function getAnalysisReports(userId: string) {
  return supabase
    .from('analysis_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

// ─── Cycle & Plan helpers ──────────────────────────────────────────────────
export async function getActiveCycle(userId: string) {
  return supabase
    .from('optimization_cycles')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
}

export async function createCycle(userId: string, startDate: string) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 90);
  return supabase
    .from('optimization_cycles')
    .insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      current_day: 1,
    })
    .select()
    .single();
}

// ─── Daily check-in helpers ────────────────────────────────────────────────
export async function saveCheckin(userId: string, data: Record<string, unknown>) {
  return supabase.from('daily_checkins').insert({ user_id: userId, ...data });
}

export async function getCheckins(userId: string, cycleId: string) {
  return supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .order('date', { ascending: true });
}

export async function getTodayCheckin(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
}
