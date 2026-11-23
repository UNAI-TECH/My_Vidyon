// ============================================================
// File: app/+not-found.tsx
// Purpose: Expo Router catch-all 404 route displaying user-friendly
// "Page Not Found" campus screen with authentic Vidyon theme.
// ============================================================

import React from 'react';
import { Stack } from 'expo-router';
import { StatusErrorView } from '../src/components/common/StatusErrorView';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Page Not Found' }} />
      <StatusErrorView type="not-found" />
    </>
  );
}
