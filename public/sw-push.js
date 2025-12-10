// Push notification service worker for GeoEstate Tanzania
// Compatible with iOS 16.4+, Android, and Desktop browsers

const APP_NAME = 'GeoEstate Tanzania';
const DEFAULT_ICON = '/icon-192x192.png';
const BADGE_ICON = '/icon-192x192.png';

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push event received');

  let data = {
    title: APP_NAME,
    body: 'You have a new notification',
    icon: DEFAULT_ICON,
    badge: BADGE_ICON,
    url: '/'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false,
    tag: data.tag || 'geoestate-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification click:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then(() => client.focus());
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notification closed');
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: DEFAULT_ICON,
      badge: BADGE_ICON,
      vibrate: [200, 100, 200],
      ...options
    });
  }
});

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW Push] Service worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW Push] Service worker activated');
  event.waitUntil(clients.claim());
});
