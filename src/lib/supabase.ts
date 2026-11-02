import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { LargeSecureStore } from './storage';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';

// On Web/Desktop, use window.localStorage directly (synchronous) so Supabase's
// native multi-tab BroadcastChannel and storage event listeners keep all tabs in sync.
// On Mobile (Android/iOS), use LargeSecureStore (chunked SecureStore).
const authStorage =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : LargeSecureStore;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
