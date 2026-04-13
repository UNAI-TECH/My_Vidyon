import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { LargeSecureStore } from '../lib/storage';
import Constants from 'expo-constants';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Sets up the default Android notification channel.
 * Must be called at app boot — BEFORE any user auth — so the channel exists
 * even when the OS delivers a background/killed-state notification.
 * Safe to call multiple times (no-op on iOS / if channel already exists).
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'My Vidyon Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FAB75A',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  } catch (e) {
    console.warn('[Push] Could not register notification channel:', e);
  }
}

// Register the channel immediately on module import so it's always available
setupAndroidNotificationChannel();


/**
 * Gets or creates a stable device identifier.
 * On Android, uses Application.getAndroidId().
 * Falls back to a UUID persisted in SecureStore.
 */
async function getStableDeviceId(): Promise<string> {
  const STORAGE_KEY = 'my_vidyon_device_id';

  // Try Android-native ID first
  if (Platform.OS === 'android') {
    try {
      const androidId = Application.getAndroidId();
      if (androidId) return androidId;
    } catch {}
  }

  // Fallback: read from storage or generate
  let deviceId = await LargeSecureStore.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    await LargeSecureStore.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Registers the device for push notifications.
 * It requests permissions, gets the token, and saves it to Supabase.
 */
export async function registerForPushNotificationsAsync(userId: string) {
  let token: string | undefined;

  if (Platform.OS === 'web') {
    return null;
  }

  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo && Platform.OS === 'android') {
    console.log('Push Notifications: Remote notifications are not supported in Expo Go for Android (SDK 53+). Please use a development build.');
    return null;
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      console.log('Push permissions not granted, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token: Permission not granted');
      return null;
    }

    // Get the FCM token specifically, as your current edge function is coded for FCM
    try {
        console.log('Attempting to get Device Push Token (FCM)...');
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken.data;
        console.log('Register Success: Got Device Push Token:', token);
    } catch (e: any) {
        console.warn('Could not get device push token (expected on some simulators):', e.message);
        console.log('Skipping push registration as native tokens are required for direct FCM delivery.');
    }
  } else {
    console.log('Push Notifications: Skipping registration (Not a physical device)');
    return null;
  }

  if (token) {
    // Get a stable device identifier for deduplication
    const deviceId = await getStableDeviceId();
    console.log(`[Push] Registering token for device: ${deviceId}`);

    // First, delete any OLD tokens for this user+device combo
    // This ensures that when a token rotates, the old one is removed
    await (supabase
      .from('user_push_tokens') as any)
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    // Then insert the fresh token
    const { error } = await (supabase
      .from('user_push_tokens') as any)
      .upsert({
        user_id: userId,
        fcm_token: token,
        device_id: deviceId,
        platform: Platform.OS,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,fcm_token'
      });

    if (error) {
      console.error('Error saving push token to Supabase:', error);
    } else {
      console.log(`[Push] Token registered successfully for device ${deviceId}`);
    }
  }

  return token;
}

/**
 * Sets up notification listeners.
 * Returning these allow the caller to remove them on unmount.
 */
export function setupNotificationListeners(onResponse?: (data: any) => void) {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification Received (foreground):', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification Response Received:', response);
    const data = response.notification.request.content.data;
    if (onResponse) {
        onResponse(data);
    } else if (data?.action_url) {
        // Default fallback if no handler provided (but usually we'll provide one)
        console.log('Notification clicked with action_url:', data.action_url);
    }
  });

  return { notificationListener, responseListener };
}
