const CACHE_NAME = 'anmin478-v2.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-16x16.png',
  './icons/icon-32x32.png',
  './icons/icon-48x48.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future requests
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Network fetch failed', error);
            
            // Return offline fallback for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // For other requests, we could return a fallback response
            return new Response('オフラインです', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
              })
            });
          });
      })
  );
});

// Background sync for data persistence
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync user data when back online
      syncUserData()
    );
  }
});

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  let title = '安眠478';
  let options = {
    body: '瞑想の時間です 🧘‍♀️',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    tag: 'meditation-reminder',
    data: {
      url: './'
    },
    actions: [
      {
        action: 'start',
        title: '開始',
        icon: './icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: '後で',
        icon: './icons/icon-72x72.png'
      }
    ],
    vibrate: [200, 100, 200],
    silent: false,
    requireInteraction: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
    } catch (e) {
      console.log('Service Worker: Push data parse failed');
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click', event.action);
  
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ includeUncontrolled: true, type: 'window' })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          let url = './';
          if (event.action === 'start') {
            url = './?action=start';
          }
          return clients.openWindow(url);
        }
      })
  );
});

// Periodic background sync (for future features)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync', event.tag);
  
  if (event.tag === 'daily-reminder') {
    event.waitUntil(
      // Check if user should be reminded to meditate
      checkMeditationReminder()
    );
  }
});

// Helper functions
async function syncUserData() {
  try {
    // Sync meditation statistics and settings
    console.log('Service Worker: Syncing user data...');
    
    // Get stored data
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    // Future: sync with backend service
    console.log('Service Worker: User data synced');
  } catch (error) {
    console.log('Service Worker: Sync failed', error);
  }
}

async function checkMeditationReminder() {
  try {
    // Check if user should be reminded to meditate
    const lastSession = localStorage.getItem('lastMeditationSession');
    const now = new Date().getTime();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    if (!lastSession || parseInt(lastSession) < oneDayAgo) {
      // Show reminder notification
      await self.registration.showNotification('安眠478', {
        body: '今日の瞑想はいかがですか？ 🌙',
        icon: './icons/icon-192x192.png',
        tag: 'daily-reminder',
        actions: [
          { action: 'start', title: '始める' },
          { action: 'later', title: '後で' }
        ]
      });
    }
  } catch (error) {
    console.log('Service Worker: Reminder check failed', error);
  }
}

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection', event.reason);
});

console.log('Service Worker: Script loaded');