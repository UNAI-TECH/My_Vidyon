// ============================================================
// File: public/firebase-messaging-sw.js
// Purpose: Service Worker for FCM background push notifications.
// Runs even when My Vidyon desktop app is closed/minimised.
// Shows Windows toast notifications for incoming messages.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyByEo34k2BF82SAjzN2wABZJKqadw1YV6Q",
  authDomain:        "myvidyon-app-15664.firebaseapp.com",
  projectId:         "myvidyon-app-15664",
  storageBucket:     "myvidyon-app-15664.firebasestorage.app",
  messagingSenderId: "891189484070",
  appId:             "1:891189484070:web:1663eea45dbf836cfba4e7",
  measurementId:     "G-4HHDM9MCCL",
});

const messaging = firebase.messaging();

// Handles push messages when app is in background, minimised, or closed
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] My Vidyon background message received:', payload);

  const title = payload.notification?.title || 'My Vidyon';
  const body  = payload.notification?.body  || 'You have a new notification';

  self.registration.showNotification(title, {
    body,
    icon:  '/favicon.ico',
    badge: '/favicon.ico',
    data:  payload.data || {},
  });
});

// Optional: clicking the notification focuses / opens the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
