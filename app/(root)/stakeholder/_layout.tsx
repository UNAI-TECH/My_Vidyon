// ============================================================
// File: app/(root)/stakeholder/_layout.tsx
// Purpose: Navigation layout for Institution Stakeholder screens
// ============================================================

import React from 'react';
import { Stack } from 'expo-router';

import { theme } from '../../../src/theme';

export default function StakeholderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
