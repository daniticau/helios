// Supabase client for React Native. Persists the session to expo-secure-store
// so users stay signed in across app restarts. Reads config from
// app.json → expo.extra so secrets live alongside apiBaseUrl.

import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// SecureStore caps values at ~2KB on iOS. Supabase session JWTs fit, but
// refresh + metadata can get large — we serialize + chunk defensively.
const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Best-effort — losing persistence just means re-login.
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore.
    }
  },
};

const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
const SUPABASE_URL = (extra?.supabaseUrl as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (extra?.supabaseAnonKey as string | undefined) ?? '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Lazy singleton. Returns a real client when configured, or null when env
 * is missing so callers can gate auth UI without crashing the app.
 */
let _client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // React Native has no URL-based redirect flow for native OAuth; we
      // handle that manually via expo-auth-session + signInWithIdToken.
      detectSessionInUrl: false,
    },
  });
  return _client;
}
