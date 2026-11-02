import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useQuickLogin, SavedAccount } from '../hooks/useQuickLogin';
import { supabase } from '../lib/supabase';
import { AccountSwitcherModal } from '../components/common/AccountSwitcherModal';

interface AccountSwitcherContextType {
  isSwitcherOpen: boolean;
  openAccountSwitcher: () => void;
  closeAccountSwitcher: () => void;
  savedAccounts: SavedAccount[];
  isSwitching: boolean;
  switchingAccountId: string | null;
  switchError: string | null;
  switchTo: (account: SavedAccount) => Promise<boolean>;
  removeSavedAccount: (id: string) => Promise<void>;
  navigateToAddAccount: () => void;
  refreshAccounts: () => Promise<void>;
}

const AccountSwitcherContext = createContext<AccountSwitcherContextType>({
  isSwitcherOpen: false,
  openAccountSwitcher: () => {},
  closeAccountSwitcher: () => {},
  savedAccounts: [],
  isSwitching: false,
  switchingAccountId: null,
  switchError: null,
  switchTo: async () => false,
  removeSavedAccount: async () => {},
  navigateToAddAccount: () => {},
  refreshAccounts: async () => {},
});

export function getDashboardRouteForRole(role: string): string {
  const normalized = (role || '').toLowerCase().trim();
  if (['admin', 'superadmin', 'ad_manager', 'finance_manager'].includes(normalized)) {
    return '/(root)/admin';
  }
  if ([
    'institution', 
    'admission_officer', 
    'admissions', 
    'reports_manager', 
    'accountant', 
    'finance'
  ].includes(normalized)) {
    return '/(root)/institution';
  }
  if (normalized === 'institution_stakeholder' || normalized === 'stakeholder') {
    return '/(root)/stakeholder';
  }
  if (['faculty', 'teacher', 'staff'].includes(normalized)) {
    return '/(root)/faculty';
  }
  if (normalized === 'student') {
    return '/(root)/student';
  }
  if (normalized === 'parent') {
    return '/(root)/parent';
  }
  if (normalized.includes('canteen')) {
    return '/(root)/canteen';
  }
  return '/';
}

export const AccountSwitcherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { user, session, role, fullName, imageUrl, institutionId, institutionLogo, loading: authLoading } = useAuth();
  const { savedAccounts, saveAccount, switchToAccount, removeAccount, refresh } = useQuickLogin();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const syncedUserIdRef = React.useRef<string | null>(null);

  // Automatically ensure current logged-in user is saved into device storage without re-render loops
  useEffect(() => {
    if (!user || !session || !role || authLoading) return;
    if (syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;

    (async () => {
      try {
        const { data: prof } = (await supabase
          .from('profiles')
          .select('full_name, image_url, avatar_url, profile_image_url')
          .eq('id', user.id)
          .maybeSingle()) as any;

        const actualName = prof?.full_name || fullName || user.email?.split('@')[0] || 'User';
        let actualImg = prof?.image_url || prof?.avatar_url || prof?.profile_image_url || imageUrl || null;

        // If student and image still missing, query students table
        if (!actualImg && role === 'student') {
          const { data: student } = (await supabase
            .from('students')
            .select('image_url')
            .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
            .maybeSingle()) as any;
          if (student?.image_url) {
            actualImg = student.image_url;
          }
        }

        // If institution account and image still missing, use institution logo
        if (!actualImg && (role === 'institution' || role === 'admin')) {
          if (institutionLogo) {
            actualImg = institutionLogo;
          } else if (institutionId && institutionId !== 'global') {
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let instQuery = supabase.from('institutions').select('logo_url');
            if (isUUID(institutionId)) {
              instQuery = instQuery.or(`institution_id.eq.${institutionId},id.eq.${institutionId}`);
            } else {
              instQuery = instQuery.eq('institution_id', institutionId);
            }
            const { data: instData } = await (instQuery as any).maybeSingle();
            if (instData?.logo_url) {
              actualImg = instData.logo_url;
            }
          }
        }

        await saveAccount({
          id: user.id,
          email: user.email || '',
          full_name: actualName,
          role: role,
          institution_id: institutionId,
          image_url: actualImg,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      } catch (e) {
        console.warn('[AccountSwitcher] Sync account failed:', e);
      }
    })();
  }, [user?.id, session?.access_token]);

  const openAccountSwitcher = useCallback(() => {
    setSwitchError(null);
    setSwitchingAccountId(null);
    refresh();
    setIsSwitcherOpen(true);
  }, [refresh]);

  const closeAccountSwitcher = useCallback(() => {
    if (!switchingAccountId) {
      setIsSwitcherOpen(false);
      setSwitchError(null);
    }
  }, [switchingAccountId]);

  const switchTo = useCallback(async (targetAccount: SavedAccount): Promise<boolean> => {
    // If it's already the current active user, simply close the switcher
    if (user && targetAccount.id === user.id) {
      setIsSwitcherOpen(false);
      return true;
    }

    setSwitchingAccountId(targetAccount.id);
    setSwitchError(null);

    try {
      const success = await switchToAccount(targetAccount);

      if (success) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        setIsSwitcherOpen(false);
        setSwitchingAccountId(null);

        // Transition seamlessly to the appropriate role dashboard
        const targetRoute = getDashboardRouteForRole(targetAccount.role);
        router.replace(targetRoute as any);
        return true;
      } else {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch (e) {}
        }
        setSwitchError(`Session expired for ${targetAccount.full_name || targetAccount.email}. Please log in again.`);
        setSwitchingAccountId(null);
        return false;
      }
    } catch (err: any) {
      setSwitchError(err?.message || 'Failed to switch account');
      setSwitchingAccountId(null);
      return false;
    }
  }, [user, switchToAccount, router]);

  const removeSavedAccount = useCallback(async (id: string) => {
    await removeAccount(id);
    refresh();
  }, [removeAccount, refresh]);

  const navigateToAddAccount = useCallback(() => {
    setIsSwitcherOpen(false);
    // Navigate to login screen so the user can enter credentials for another account
    router.push('/(auth)/login');
  }, [router]);

  return (
    <AccountSwitcherContext.Provider
      value={{
        isSwitcherOpen,
        openAccountSwitcher,
        closeAccountSwitcher,
        savedAccounts,
        isSwitching: !!switchingAccountId,
        switchingAccountId,
        switchError,
        switchTo,
        removeSavedAccount,
        navigateToAddAccount,
        refreshAccounts: refresh,
      }}
    >
      {children}
      <AccountSwitcherModal
        visible={isSwitcherOpen}
        onClose={closeAccountSwitcher}
        currentUserId={user?.id || null}
        savedAccounts={savedAccounts}
        switchingAccountId={switchingAccountId}
        switchError={switchError}
        onSelectAccount={switchTo}
        onRemoveAccount={removeSavedAccount}
        onAddAccount={navigateToAddAccount}
      />
    </AccountSwitcherContext.Provider>
  );
};

export const useAccountSwitcher = () => useContext(AccountSwitcherContext);
