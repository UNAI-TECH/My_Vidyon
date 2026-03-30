import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../../src/theme';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { AlertModal } from '../../src/components/common/AlertModal';
import { useERPRealtime } from '../../src/hooks/useERPRealtime';

export default function RootLayout() {
  const auth = useAuth();
  const { session, role, loading, user, institutionId, institutionUuid } = auth;
  
  // Activate global real-time sync hook
  useERPRealtime();
  const [activeNotification, setActiveNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!session || !user) return;

    const channel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        (payload: any) => {
          const newAnnouncement = payload.new;
          
          // Check if user is in audience
          const isTargeted = 
            (!newAnnouncement.institution_id || newAnnouncement.institution_id === institutionId) &&
            (!newAnnouncement.category || newAnnouncement.category === 'all' || newAnnouncement.category === role);

          // We show to the sender too just for testing purposes or remove if not needed
          // const isSender = newAnnouncement.created_by === user.id;

          if (isTargeted) {
            setActiveNotification({
              visible: true,
              title: newAnnouncement.title || 'New Announcement',
              message: newAnnouncement.content,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, user, institutionId, institutionUuid]);

  useEffect(() => {
    // Initialize Google Mobile Ads SDK with Expo Go safety
    try {
      // Dynamic require to prevent crash in Expo Go during import evaluation
      const mobileAds = require('react-native-google-mobile-ads').default;
      
      if (typeof mobileAds === 'function') {
        mobileAds()
          .initialize()
          .then((adapterStatuses: any) => {
            if (__DEV__) {
              console.log('[AdMob] SDK Initialized', adapterStatuses);
            }
          })
          .catch((err: any) => {
            if (__DEV__) console.warn('[AdMob] Initialization Error:', err);
          });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[AdMob] Native module not found or failed to load. Skipping init (Expo Go).');
      }
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="student" />
        <Stack.Screen name="faculty" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="institution" />
        <Stack.Screen name="accountant" />
        <Stack.Screen name="parent" />
        <Stack.Screen name="canteen" />
      </Stack>

      <AlertModal 
        visible={activeNotification.visible}
        title={activeNotification.title}
        message={activeNotification.message}
        type="info"
        onClose={() => setActiveNotification({ ...activeNotification, visible: false })}
      />
    </>
  );
}
