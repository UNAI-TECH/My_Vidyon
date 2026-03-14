import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/theme';

export default function Index() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (role === 'admin' || role === 'superadmin') return <Redirect href="/(root)/admin" />;
  if (role === 'institution') return <Redirect href="/(root)/institution" />;
  if (role === 'faculty') return <Redirect href="/(root)/faculty" />;
  if (role === 'student') return <Redirect href="/(root)/student" />;
  if (role === 'parent') return <Redirect href="/(root)/parent" />;
  if (role === 'accountant') return <Redirect href="/(root)/accountant" />;
  if (role === 'canteen') return <Redirect href="/(root)/canteen" />;
  
  return <Redirect href="/(auth)/login" />;
}
