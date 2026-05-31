// Service Worker with dynamic cache versioning and auto-cleanup
// Cache name includes git commit hash + timestamp for reliable invalidation

const VERSION = 'commit-3ea41c-v2'; // Updated by: npm run update-sw
const CACHE_NAME = `calisthenics-app-${VERSION}`;
const MAX_CACHES_TO_KEEP = 5; // Keep last 5 cache versions for rollback safety

// Build list of app shell resources to cache
const APP_SHELL = [
  './index.html',
  './css/style.css',
  './css/OpenSans.ttf',
  './js/main.js',
  './js/services/api.js',
  './js/services/state.js',
  './js/views/home-view.js',
  './js/views/exercise-details-view.js',
  './js/views/programs-view.js',
  './js/views/program-details-view.js',
  './js/views/active-workout-view.js',
  './js/views/workout-summary-view.js',
  './js/views/onboarding-view.js',
  './js/views/profile-view.js',
  './js/views/builder-view.js',
  './js/components/header.js',
  './js/utils/chart-helpers.js',
  './manifest.json',
  './assets/icons/favicon-32x32.png',
  './assets/icons/favicon-192x192.png',
  // Muscle images - Front view
  './assets/images/muscles/main/muscle-1.svg',
  './assets/images/muscles/main/muscle-2.svg',
  './assets/images/muscles/main/muscle-3.svg',
  './assets/images/muscles/main/muscle-4.svg',
  './assets/images/muscles/main/muscle-5.svg',
  './assets/images/muscles/main/muscle-6.svg',
  './assets/images/muscles/main/muscle-7.svg',
  './assets/images/muscles/main/muscle-8.svg',
  './assets/images/muscles/main/muscle-9.svg',
  './assets/images/muscles/main/muscle-10.svg',
  './assets/images/muscles/main/muscle-11.svg',
  './assets/images/muscles/main/muscle-12.svg',
  './assets/images/muscles/main/muscle-13.svg',
  './assets/images/muscles/main/muscle-14.svg',
  './assets/images/muscles/main/muscle-15.svg',
  './assets/images/muscles/main/muscle-16.svg',
  './assets/images/muscles/main/muscle-17.svg',
  './assets/images/muscles/main/muscle-18.svg',
  './assets/images/muscles/main/muscle-19.svg',
  './assets/images/muscles/main/muscle-20.svg',
  // Muscle images - Back view
  './assets/images/muscles/secondary/muscle-1.svg',
  './assets/images/muscles/secondary/muscle-2.svg',
  './assets/images/muscles/secondary/muscle-3.svg',
  './assets/images/muscles/secondary/muscle-4.svg',
  './assets/images/muscles/secondary/muscle-5.svg',
  './assets/images/muscles/secondary/muscle-6.svg',
  './assets/images/muscles/secondary/muscle-7.svg',
  './assets/images/muscles/secondary/muscle-8.svg',
  './assets/images/muscles/secondary/muscle-9.svg',
  './assets/images/muscles/secondary/muscle-10.svg',
  './assets/images/muscles/secondary/muscle-11.svg',
  './assets/images/muscles/secondary/muscle-12.svg',
  './assets/images/muscles/secondary/muscle-13.svg',
  './assets/images/muscles/secondary/muscle-14.svg',
  './assets/images/muscles/secondary/muscle-15.svg',
  './assets/images/muscles/secondary/muscle-16.svg',
  './assets/images/muscles/secondary/muscle-17.svg',
  './assets/images/muscles/secondary/muscle-18.svg',
  './assets/images/muscles/secondary/muscle-19.svg'
];

// Install event: cache app shell resources
self.addEventListener('install', event => {
  console.log(`[Service Worker] Install - Version: ${VERSION}`);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log(`[Service Worker] Caching app shell (${APP_SHELL.length} resources)`);
        
        // Cache all app shell resources with error handling for each
        const cachedResponses = await Promise.allSettled(
          APP_SHELL.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response.clone());
                }
                throw new Error(`Failed to cache: ${url} (status: ${response.status})`);
              })
              .catch(error => {
                console.warn(`[Service Worker] Warning: Could not cache ${url}:`, error.message);
                // Don't fail install for missing resources - just warn
              })
          )
        );
        
        // Count successes and failures
        const successCount = cachedResponses.filter(r => r.status === 'fulfilled').length;
        const failCount = cachedResponses.filter(r => r.status === 'rejected').length;
        
        console.log(`[Service Worker] App shell cached: ${successCount} success, ${failCount} warnings`);
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Failed to cache app shell:', error);
        throw error;
      }
    })()
  );
});

// Fetch event: network-first strategy with fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    (async () => {
      const request = event.request;
      const url = new URL(request.url);
      
      // Skip non-GET requests
      if (request.method !== 'GET') {
        return fetch(request);
      }
      
      // Skip cross-origin requests
      if (url.origin !== location.origin) {
        return fetch(request);
      }
      
      try {
        // Network-first strategy for most requests
        const networkResponse = await fetch(request);
        
        // If successful, update cache with fresh response
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Network failed, try to serve from cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          console.log(`[Service Worker] Serving from cache: ${url.pathname}`);
          return cachedResponse;
        }
        
        // For navigation requests, return fallback
        if (request.mode === 'navigate') {
          const fallbackResponse = await caches.match('./index.html');
          if (fallbackResponse) {
            return fallbackResponse;
          }
        }
        
        // Return offline error
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })()
  );
});

// Activate event: cleanup old caches and take control
self.addEventListener('activate', event => {
  console.log(`[Service Worker] Activate - Version: ${VERSION}`);
  
  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();
        
        // Identify caches to delete (keep only last N versions)
        const cachesToDelete = [];
        const currentCacheIndex = cacheNames.indexOf(CACHE_NAME);
        
        if (currentCacheIndex !== -1) {
          // Remove current from list, sort remaining
          const otherCaches = cacheNames.filter(name => name !== CACHE_NAME);
          
          if (otherCaches.length > MAX_CACHES_TO_KEEP - 1) {
            // Sort by age (oldest first), delete oldest ones
            otherCaches.sort(); // Lexicographic sort works for timestamp-based names
            
            const deleteCount = otherCaches.length - (MAX_CACHES_TO_KEEP - 1);
            for (let i = 0; i < deleteCount; i++) {
              cachesToDelete.push(otherCaches[i]);
            }
          }
        } else {
          // No current cache, keep only N-1 from all existing
          const sortedCaches = [...cacheNames].sort();
          const deleteCount = Math.max(0, sortedCaches.length - MAX_CACHES_TO_KEEP);
          
          for (let i = 0; i < deleteCount; i++) {
            cachesToDelete.push(sortedCaches[i]);
          }
        }
        
        // Delete old caches
        if (cachesToDelete.length > 0) {
          console.log(`[Service Worker] Cleaning up ${cachesToDelete.length} old cache(s)`);
          
          const deletionResults = await Promise.allSettled(
            cachesToDelete.map(cacheName => {
              console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
          
          const deletedCount = deletionResults.filter(r => r.status === 'fulfilled').length;
          console.log(`[Service Worker] Successfully deleted ${deletedCount} old cache(s)`);
        } else {
          console.log('[Service Worker] No old caches to clean up');
        }
        
        // Claim all clients immediately
        await self.clients.claim();
        console.log('[Service Worker] Activated and controlling all clients');
      } catch (error) {
        console.error('[Service Worker] Activation failed:', error);
      }
    })()
  );
});

// Handle messages from the main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    console.log('[Service Worker] Skip waiting triggered');
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear only the current cache version
    caches.delete(CACHE_NAME)
      .then(success => {
        event.ports[0].postMessage({ success, cacheName: CACHE_NAME });
      })
      .catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
  
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    // Purge all caches except the current one (for recovery scenarios)
    const currentCache = CACHE_NAME;
    caches.keys()
      .then(cacheNames => {
        const toDelete = cacheNames.filter(name => name !== currentCache);
        
        Promise.all(toDelete.map(name => caches.delete(name)))
          .then(() => {
            event.ports[0].postMessage({ 
              success: true, 
              deletedCount: toDelete.length,
              keptCache: currentCache 
            });
          })
          .catch(error => {
            event.ports[0].postMessage({ 
              success: false, 
              error: error.message,
              partiallyDeleted: toDelete.filter(name => !name.startsWith('calisthenics-app'))
            });
          });
      });
  }
});

// Background sync for offline workouts (optional feature)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-workout') {
    event.waitUntil(
      (async () => {
        console.log('[Service Worker] Sync event triggered: workout data ready to sync');
        
        // Get synced workout data from storage
        // Note: This requires additional state management in your app
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_COMPLETE', tag: 'sync-workout' });
        });
      })()
    );
  }
});

// Push notifications for workout reminders (optional feature)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New workout reminder!',
    icon: './assets/icons/favicon-192x192.png',
    badge: './assets/icons/favicon-32x32.png',
    tag: 'workout-reminder',
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification('Calisthenics Mastery', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll();
      
      // Open app to appropriate page based on notification type
      if (clients.length > 0) {
        clients[0].focus();
        if (clients[0].url === '/active-workout') {
          return;
        }
        clients[0].navigate('/active-workout');
      } else {
        self.clients.openWindow('/active-workout');
      }
    })()
  );
});

console.log('[Service Worker] Registered with version:', VERSION);
