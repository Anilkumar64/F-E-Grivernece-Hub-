/**
 * Service Worker for E-Grievance PWA
 * Handles offline caching, push notifications, and background sync
 */

const CACHE_NAME = 'egrievance-v1';
const STATIC_CACHE = 'egrievance-static-v1';
const DYNAMIC_CACHE = 'egrievance-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png'
];

const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STATIC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Clearing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cacheKey = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      const responseClone = networkResponse.clone();
      await cache.put(cacheKey, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request, trying cache:', request.url, error);
    
    // Fallback to cache
    const cachedResponse = await caches.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // Return error for other requests
    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cache is still valid
    const dateHeader = cachedResponse.headers.get('date');
    if (dateHeader) {
      const cacheDate = new Date(dateHeader);
      const now = new Date();
      const age = now - cacheDate;
      
      if (age < STATIC_CACHE_TTL) {
        return cachedResponse;
      }
    }
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      const responseClone = networkResponse.clone();
      
      // Add cache timestamp
      const headers = new Headers(networkResponse.headers);
      headers.set('date', new Date().toUTCString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });
      
      await cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for static request, returning cache:', request.url);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.grievanceId || '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ],
    requireInteraction: data.priority === 'high',
    silent: false,
    tag: data.grievanceId || 'notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    const grievanceId = event.notification.data.primaryKey;
    const url = grievanceId ? `/track-grievance/${grievanceId}` : '/notifications';
    
    event.waitUntil(
      self.clients.openWindow(url)
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open notifications
    event.waitUntil(
      self.clients.openWindow('/notifications')
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-grievances') {
    event.waitUntil(syncOfflineGrievances());
  }
});

// Sync offline grievances
async function syncOfflineGrievances() {
  try {
    const offlineGrievances = await getOfflineGrievances();
    
    for (const grievance of offlineGrievances) {
      try {
        const response = await fetch('/api/grievances', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${grievance.token}`
          },
          body: JSON.stringify(grievance.data)
        });

        if (response.ok) {
          await removeOfflineGrievance(grievance.id);
        }
      } catch (error) {
        console.error('Failed to sync grievance:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineGrievances() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EgrievanceOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['grievances'], 'readonly');
      const store = transaction.objectStore('grievances');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('grievances')) {
        db.createObjectStore('grievances', { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineGrievance(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EgrievanceOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['grievances'], 'readwrite');
      const store = transaction.objectStore('grievances');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Periodic background sync for fresh data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-data') {
    event.waitUntil(refreshData());
  }
});

async function refreshData() {
  try {
    // Refresh critical data like notifications and grievance counts
    const cache = await caches.open(DYNAMIC_CACHE);
    const urlsToRefresh = [
      '/api/notifications/mine',
      '/api/grievances/my-count',
      '/api/user/me'
    ];

    for (const url of urlsToRefresh) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.log('Failed to refresh:', url, error);
      }
    }
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}
