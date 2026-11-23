// ============================================================
// File: app/offline.tsx
// Purpose: Dedicated Offline Page for Vidyon ERP.
// ============================================================

import React, { useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusErrorView } from '../src/components/common/StatusErrorView';
import { useAuth } from '../src/hooks/useAuth';
import { getDashboardRouteForRole } from '../src/utils/navigationHelper';

export default function OfflineScreen() {
  const { role } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        const dashboard = getDashboardRouteForRole(role);
        router.replace(dashboard as any);
        return;
      }
      // Attempt a lightweight fetch healthcheck
      const res = await fetch('https://www.google.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
      if (res) {
        const dashboard = getDashboardRouteForRole(role);
        router.replace(dashboard as any);
      }
    } catch (e) {
      console.log('[Offline] Still offline');
    } finally {
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "You're Offline" }} />
      <StatusErrorView
        type="offline"
        primaryActionLabel={isRetrying ? 'Checking Connection...' : 'Try Reconnecting'}
        onPrimaryAction={handleRetry}
      />
    </>
  );
}
