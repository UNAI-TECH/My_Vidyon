import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
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
        console.log('Attempting to get Device Push Token...');
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken.data;
        console.log('Register Success: Got Device Push Token:', token);
    } catch (e: any) {
        console.warn('Could not get device push token (expected on some simulators):', e.message);
        // Fallback to Expo token if device token fails
        try {
            console.log('Attempting fallback to Expo Push Token...');
            const expoToken = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            });
            token = expoToken.data;
            console.log('Register Success: Got Expo Push Token:', token);
        } catch (fallbackError: any) {
            console.warn('Push Notifications: Failed to get any push token. On Android, this usually means google-services.json is missing or Firebase is not configured. Redirect to: https://docs.expo.dev/push-notifications/fcm-credentials/');
        }
    }
  } else {
    console.log('Push Notifications: Skipping registration (Not a physical device)');
    return null;
  }

  if (token) {
    // Save/Upsert to user_push_tokens table
    const { error } = await (supabase
      .from('user_push_tokens') as any)
      .upsert({
        user_id: userId,
        fcm_token: token,
        platform: Platform.OS,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,fcm_token'
      });

    if (error) {
      console.error('Error saving push token to Supabase:', error);
    }
  }

  return token;
}

/**
 * Sets up notification listeners.
 * Returning these allow the caller to remove them on unmount.
 */
export function setupNotificationListeners() {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification Received (foreground):', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification Response Received:', response);
    // Handle navigation here if action_url is present in data
    const data = response.notification.request.content.data;
    if (data?.action_url) {
        // You might want to use router.push(data.action_url) here
    }
  });

  return { notificationListener, responseListener };
}
