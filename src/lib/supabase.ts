import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { LargeSecureStore } from './storage';
import { Database } from '../types/supabase';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const SUPABASE_PROJECT_ID =
  process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID ||
  process.env.VITE_SUPABASE_PROJECT_ID ||
  (SUPABASE_URL ? SUPABASE_URL.split('//')[1]?.split('.')[0] : '') ||
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase Configuration Error] EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are missing from process.env.\n' +
    'If you recently created or edited your .env file, you must restart the Expo development server (npx expo start -c) to reload environment variables.'
  );
}

// Fallback dummy values to prevent createClient from throwing uncaught "supabaseUrl is required"
// during initial module evaluation before bundler restart
const safeSupabaseUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const safeSupabaseAnonKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';

// On Web/Desktop, use window.localStorage directly (synchronous) so Supabase's
// native multi-tab BroadcastChannel and storage event listeners keep all tabs in sync.
// On Mobile (Android/iOS), use LargeSecureStore (chunked SecureStore).
const authStorage =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : LargeSecureStore;

export const supabase = createClient<Database>(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
