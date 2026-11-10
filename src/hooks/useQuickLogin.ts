import { LargeSecureStore } from '../lib/storage';
import { useState, useEffect } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

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
        let valid = parsed.filter(a => a.access_token && a.refresh_token);
        
        // Sanitize & resolve real profile photos / institution logos for each account
        const ids = valid.map(a => a.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            const [profilesRes, studentsRes, instsRes] = await Promise.all([
              supabase
                .from('profiles')
                .select('id, image_url, avatar_url, profile_image_url')
                .in('id', ids),
              supabase
                .from('students')
                .select('id, email, profile_id, user_id, image_url')
                .in('profile_id', ids),
              supabase
                .from('institutions')
                .select('id, institution_id, logo_url'),
            ]);

            const dbProfiles = (profilesRes.data || []) as any[];
            const dbStudents = (studentsRes.data || []) as any[];
            const dbInstitutions = (instsRes.data || []) as any[];

            let hasChange = false;
            valid = valid.map(acc => {
              const p = dbProfiles.find((dp: any) => dp.id === acc.id);
              let trueImg = p?.image_url || p?.avatar_url || p?.profile_image_url || null;

              // Check student table if profile didn't have an image
              if (!trueImg) {
                const s = dbStudents.find((ds: any) => ds.profile_id === acc.id || ds.user_id === acc.id || ds.email === acc.email);
                if (s?.image_url) {
                  trueImg = s.image_url;
                }
              }

              // Fallback to institution logo for institution / school admin accounts
              if (!trueImg && (acc.role === 'institution' || acc.role === 'admin') && acc.institution_id && acc.institution_id !== 'global') {
                const inst = dbInstitutions.find((di: any) => di.id === acc.institution_id || di.institution_id === acc.institution_id);
                if (inst?.logo_url) {
                  trueImg = inst.logo_url;
                }
              }

              if (acc.image_url !== trueImg) {
                hasChange = true;
                return { ...acc, image_url: trueImg };
              }
              return acc;
            });

            if (hasChange) {
              await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(valid));
            }
          } catch (syncErr) {
            // Ignore offline/network issues
          }
        }

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

      console.log('[QuickLogin] Attempting setSession for:', account.email);
      
      // Use a timeout to prevent permanent hangs if Supabase is slow or stuck
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth request timed out')), 8000)
      );

      const authPromise = supabase.auth.setSession({
        access_token: activeAccessToken,
        refresh_token: activeRefreshToken,
      });

      const { data, error }: any = await Promise.race([authPromise, timeoutPromise]);

      if (error) {
        console.error('[QuickLogin] Session restore error:', error.message);
        await removeAccount(account.id);
        return false;
      }

      console.log('[QuickLogin] setSession success for:', account.email);
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
