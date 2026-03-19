import { LargeSecureStore } from '../lib/storage';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Direct API config — needed to bypass the Supabase client's internal session checks
const SUPABASE_URL = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';

export interface SavedAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
  institution_id: string | null;
  image_url: string | null;
  access_token: string;
  refresh_token: string;
  lastLogin: number;
}

const STORAGE_KEY = 'my_vidyon_saved_accounts';

export function useQuickLogin() {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const stored = await LargeSecureStore.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedAccount[];
        // Filter out old-format accounts that don't have tokens
        const valid = parsed.filter(a => a.access_token && a.refresh_token);
        if (valid.length !== parsed.length) {
          await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(valid));
        }
        setSavedAccounts(valid.sort((a, b) => b.lastLogin - a.lastLogin));
      }
    } catch (e) {
      console.error('Error loading saved accounts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAccount = async (account: Omit<SavedAccount, 'lastLogin'>) => {
    try {
      const stored = await LargeSecureStore.getItem(STORAGE_KEY);
      const current: SavedAccount[] = stored ? JSON.parse(stored) : [];
      const existingIndex = current.findIndex(a => a.id === account.id);

      const newAccount: SavedAccount = {
        ...account,
        lastLogin: Date.now()
      };

      if (existingIndex !== -1) {
        current[existingIndex] = newAccount;
      } else {
        current.push(newAccount);
      }

      const limited = current
        .sort((a, b) => b.lastLogin - a.lastLogin)
        .slice(0, 5);

      await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(limited));
      setSavedAccounts(limited);
    } catch (e) {
      console.error('Error saving account:', e);
    }
  };

  const switchToAccount = async (account: SavedAccount): Promise<boolean> => {
    setSwitchingAccount(true);
    try {
      // Step 1: Call the Supabase Auth REST API directly to exchange
      // the refresh_token for a fresh access_token + refresh_token pair.
      // This bypasses the Supabase JS client's internal session checks
      // which throw "Auth session missing!" when there's no active session.
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ refresh_token: account.refresh_token }),
        }
      );

      const tokenData = await response.json();

      if (!response.ok || !tokenData.access_token) {
        console.warn('Token refresh failed:', tokenData.error_description || tokenData.msg);
        await removeAccount(account.id);
        return false;
      }

      // Step 2: Now that we have fresh, valid tokens, use setSession
      // to install them in the Supabase client.
      const { data, error } = await supabase.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });

      if (error || !data.session) {
        console.warn('setSession failed after token refresh:', error?.message);
        await removeAccount(account.id);
        return false;
      }

      // Step 3: Persist the rotated tokens for next quick-login
      await saveAccount({
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        role: account.role,
        institution_id: account.institution_id,
        image_url: account.image_url,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      return true;
    } catch (e) {
      console.error('Error switching account:', e);
      return false;
    } finally {
      setSwitchingAccount(false);
    }
  };

  const removeAccount = async (id: string) => {
    try {
      const stored = await LargeSecureStore.getItem(STORAGE_KEY);
      const current: SavedAccount[] = stored ? JSON.parse(stored) : [];
      const updated = current.filter(a => a.id !== id);
      await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch (e) {
      console.error('Error removing account:', e);
    }
  };

  return {
    savedAccounts,
    isLoading,
    switchingAccount,
    saveAccount,
    switchToAccount,
    removeAccount,
    refresh: loadAccounts
  };
}
