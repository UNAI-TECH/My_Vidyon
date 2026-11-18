// ============================================================
// File: src/lib/firebase-web.ts
// Purpose: Firebase Web Push (FCM) for Electron/Web platform ONLY.
// This file is dynamically imported — it is NEVER bundled into
// the Android or iOS build. All usage is guarded by Platform.OS checks.
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyByEo34k2BF82SAjzN2wABZJKqadw1YV6Q",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "myvidyon-app-15664.firebaseapp.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "myvidyon-app-15664",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "myvidyon-app-15664.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "891189484070",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:891189484070:web:1663eea45dbf836cfba4e7",
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-4HHDM9MCCL",
};

const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || "BPdh1wZhukPVTnpBBEGcXpBcR_Sy2RkzaBhdCyHKAYaoRK5k92ysOmVRsjfTOHssajuanAMONLYJuzdeMur9fVw";

let messaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    if (!messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (e) {
    console.warn('[WebPush] Firebase messaging init failed:', e);
    return null;
  }
}

/**
 * Requests notification permission, registers the service worker,
 * and returns the FCM web push token (or null on failure/denial).
 */
export async function getWebPushToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const msg = getFirebaseMessaging();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[WebPush] Notification permission denied by user');
      return null;
    }

    // Register the background service worker
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    console.log('[WebPush] FCM web token obtained successfully');
    return token;
  } catch (e) {
    console.warn('[WebPush] Failed to get web push token:', e);
    return null;
  }
}

/**
 * Listens for foreground messages (when the app is open/focused).
 * Background messages are handled by the service worker automatically.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function setupWebForegroundListener(
  onMessageCallback: (payload: any) => void
): () => void {
  const msg = getFirebaseMessaging();
  if (!msg) return () => {};

  const unsubscribe = onMessage(msg, (payload) => {
    console.log('[WebPush] Foreground message received:', payload);

    // Show OS notification manually — FCM doesn't auto-show when app is in foreground
    if (Notification.permission === 'granted' && payload.notification) {
      new Notification(payload.notification.title || 'My Vidyon', {
        body: payload.notification.body || '',
        icon: '/favicon.ico',
      });
    }

    onMessageCallback(payload);
  });

  return unsubscribe;
}
