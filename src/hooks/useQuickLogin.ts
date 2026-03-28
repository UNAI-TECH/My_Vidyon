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
      // Always fetch the absolutely latest token from persistent storage right before 
      // authenticating, because the background sync in useAuth might have updated it!
      const stored = await LargeSecureStore.getItem(STORAGE_KEY);
      let activeRefreshToken = account.refresh_token;
      let activeAccessToken = account.access_token;

      if (stored) {
        const current: SavedAccount[] = JSON.parse(stored);
        const fresh = current.find(a => a.id === account.id);
        if (fresh?.refresh_token && fresh?.access_token) {
          activeRefreshToken = fresh.refresh_token;
          activeAccessToken = fresh.access_token;
        }
      }

      setIsLoading(true);

      // We rely completely on Supabase GoTrue's native `setSession` to restore the account.
      // If the access_token is expired, GoTrue will automatically use the refresh_token in the background.
      const { data, error } = await supabase.auth.setSession({
        access_token: activeAccessToken,
        refresh_token: activeRefreshToken,
      });

      if (error) {
        console.warn('[QuickLogin] Session restore failed natively:', error.message);
        await removeAccount(account.id);
        return false;
      }

      // If successful, GoTrue emitted SIGNED_IN securely and handles everything else!
      setSwitchingAccount(false);
      return true;
    } catch (err) {
      console.error('[QuickLogin] switch error:', err);
      return false;
    } finally {
      setIsLoading(false);
      setSwitchingAccount(false);
    }
  };

  const removeAccount = async (id: string) => {
    try {
      const stored = await LargeSecureStore.getItem(STORAGE_KEY);
      const current: SavedAccount[] = stored ? JSON.parse(stored) : [];

      // Expire session key on the backend
      const accountToRemove = current.find(a => a.id === id);
      if (accountToRemove && accountToRemove.access_token) {
        fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accountToRemove.access_token}`
          }
        }).catch(err => console.warn('Failed to invalidate session on backend:', err));
      }

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
