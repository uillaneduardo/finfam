/**
 * FinFam Progressive Web App (PWA) Service Worker
 */

const CACHE_NAME = 'finfam-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 1. Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('PWA Cache AddAll Warning:', err);
    })
  );
  self.skipWaiting();
});

// 2. Service Worker Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 3. Network First Fetch strategy for dynamic app assets, skipping /api
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Never intercept API routes
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Helper to ensure target URL is a safe internal relative path
function getSafeRelativeUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return '/';
  const trimmed = inputUrl.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.toLowerCase().startsWith('/\\')) {
    return trimmed;
  }
  return '/';
}

// 4. Push Notification Event
self.addEventListener('push', (event) => {
  let payload = { title: 'FinFam', body: 'Você possui uma nova atualização financeira.', url: '/' };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const safeUrl = getSafeRelativeUrl(payload.url);
  const options = {
    body: payload.body || payload.message || 'Você possui uma nova atualização financeira.',
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon.svg',
    vibrate: [100, 50, 100],
    tag: payload.tag || `finfam-push-${payload.notificationId || Date.now()}`,
    data: {
      url: safeUrl,
      notificationId: payload.notificationId,
      module: payload.module
    }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'FinFam', options)
  );
});

// 5. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data ? event.notification.data.url : '/';
  const targetUrl = getSafeRelativeUrl(rawUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

