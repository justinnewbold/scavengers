// Scavengers Service Worker
// Version: 2.0.0

const CACHE_NAME = 'scavengers-v2';
const STATIC_CACHE = 'scavengers-static-v2';
const DYNAMIC_CACHE = 'scavengers-dynamic-v2';
const OFFLINE_CACHE = 'scavengers-offline-v2';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/icons/icon.svg',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/hunts',
  '/api/achievements',
  '/api/templates',
];

// Offline fallback responses
const OFFLINE_FALLBACKS = {
  '/api/hunts': { hunts: [], offline: true },
  '/api/achievements': { achievements: [], offline: true },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Activate immediately without waiting
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle page navigation with network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed:', error);
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Update cache in background
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - cache update is best-effort
  }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  const options = {
    body: event.data?.text() || 'New notification from Scavengers',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Scavengers', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync (for offline submissions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncSubmissions());
  }
});

async function syncSubmissions() {
  console.log('[SW] Syncing pending submissions...');

  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-submissions', 'readonly');
    const store = tx.objectStore('pending-submissions');
    const submissions = await store.getAll();

    for (const submission of submissions) {
      try {
        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.data),
        });

        if (response.ok) {
          // Remove from pending
          const deleteTx = db.transaction('pending-submissions', 'readwrite');
          await deleteTx.objectStore('pending-submissions').delete(submission.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync submission:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}

// Simple IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scavengers-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-submissions')) {
        db.createObjectStore('pending-submissions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached-hunts')) {
        db.createObjectStore('cached-hunts', { keyPath: 'id' });
      }
    };
  });
}

// Periodic background sync for updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-hunts') {
    event.waitUntil(updateCachedHunts());
  }
});

async function updateCachedHunts() {
  try {
    const response = await fetch('/api/hunts?public=true&limit=20');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put('/api/hunts?public=true&limit=20', response);
    }
  } catch (error) {
    console.log('[SW] Failed to update cached hunts:', error);
  }
}
