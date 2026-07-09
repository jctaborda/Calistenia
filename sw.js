// Service Worker with dynamic cache versioning and auto-cleanup
// Cache name includes git commit hash + timestamp for reliable invalidation

// Use build-time version if available, otherwise generate dynamically
// This is injected by scripts/update-sw-version.js during build
const VERSION = 'commit-46cc2bc';
const CACHE_NAME = `calisthenics-app-${VERSION}`;
const MAX_CACHES_TO_KEEP = 5; // Keep last 5 cache versions for rollback safety

// Build list of app shell resources to cache
const APP_SHELL = [
  'index.html',
  'css/style.css',
  // Core JS modules for offline support (excluding main.js - fetched fresh)
  'js/constants.js',
  'js/services/state.js',
  'js/services/database.js',
  'js/services/data-cache.js',
  'js/services/cache-utils.js',
  'js/i18n.js',
  'js/services/logger.js',
  'js/services/validation.js',
  'js/services/toast-service.js',
  'js/services/event-delegation.js',
  'js/services/confirmation-modal.js',
  'js/utils/helpers.js',
  'js/utils/array.js',
  'js/utils/dom-optimizer.js',
  'manifest.json',
  'data/data.json',
  'data/data-es.json',
  'data/skill-modules.json',
  'data/skill-modules-es.json',
  // Muscle images - Front view
  'assets/images/muscles/main/muscle-1.svg',
  'assets/images/muscles/main/muscle-2.svg',
  'assets/images/muscles/main/muscle-3.svg',
  'assets/images/muscles/main/muscle-4.svg',
  'assets/images/muscles/main/muscle-5.svg',
  'assets/images/muscles/main/muscle-6.svg',
  'assets/images/muscles/main/muscle-7.svg',
  'assets/images/muscles/main/muscle-8.svg',
  'assets/images/muscles/main/muscle-9.svg',
  'assets/images/muscles/main/muscle-10.svg',
  'assets/images/muscles/main/muscle-11.svg',
  'assets/images/muscles/main/muscle-12.svg',
  'assets/images/muscles/main/muscle-13.svg',
  'assets/images/muscles/main/muscle-14.svg',
  'assets/images/muscles/main/muscle-15.svg',
  'assets/images/muscles/main/muscle-16.svg',
  'assets/images/muscles/main/muscle-17.svg',
  'assets/images/muscles/main/muscle-18.svg',
  'assets/images/muscles/main/muscle-19.svg',
  'assets/images/muscles/main/muscle-20.svg',
  // Muscle images - Back view
  'assets/images/muscles/secondary/muscle-1.svg',
  'assets/images/muscles/secondary/muscle-2.svg',
  'assets/images/muscles/secondary/muscle-3.svg',
  'assets/images/muscles/secondary/muscle-4.svg',
  'assets/images/muscles/secondary/muscle-5.svg',
  'assets/images/muscles/secondary/muscle-6.svg',
  'assets/images/muscles/secondary/muscle-7.svg',
  'assets/images/muscles/secondary/muscle-8.svg',
  'assets/images/muscles/secondary/muscle-9.svg',
  'assets/images/muscles/secondary/muscle-10.svg',
  'assets/images/muscles/secondary/muscle-11.svg',
  'assets/images/muscles/secondary/muscle-12.svg',
  'assets/images/muscles/secondary/muscle-13.svg',
  'assets/images/muscles/secondary/muscle-14.svg',
  'assets/images/muscles/secondary/muscle-15.svg',
  'assets/images/muscles/secondary/muscle-16.svg',
  'assets/images/muscles/secondary/muscle-17.svg',
  'assets/images/muscles/secondary/muscle-18.svg',
  'assets/images/muscles/secondary/muscle-19.svg',
  'assets/images/muscles/secondary/muscle-20.svg',
  // Exercise thumbnails for offline support (29 thumbnails)
  'assets/images/exercises/0017-kiJ4Z2K.jpg',
  'assets/images/exercises/0259-x6KpKpq.jpg',
  'assets/images/exercises/0276-iny3m5y.jpg',
  'assets/images/exercises/0279-i5cEhka.jpg',
  'assets/images/exercises/0283-soIB2rj.jpg',
  'assets/images/exercises/0471-rQxwMxO.jpg',
  'assets/images/exercises/0472-I3tsCnC.jpg',
  'assets/images/exercises/0493-B1EVP9F.jpg',
  'assets/images/exercises/0514-LIlE5Tn.jpg',
  'assets/images/exercises/0630-RJgzwny.jpg',
  'assets/images/exercises/0631-yJUHKTn.jpg',
  'assets/images/exercises/0638-HjdqmZa.jpg',
  'assets/images/exercises/0652-lBDjFxJ.jpg',
  'assets/images/exercises/0662-I4hDWkc.jpg',
  'assets/images/exercises/0687-XVDdcoj.jpg',
  'assets/images/exercises/1160-dK9394r.jpg',
  'assets/images/exercises/1273-wigSg76.jpg',
  'assets/images/exercises/1306-Snj1wSv.jpg',
  'assets/images/exercises/1326-T2mxWqc.jpg',
  'assets/images/exercises/3193-Vvwjz6N.jpg',
  'assets/images/exercises/3293-72BC5Za.jpg',
  'assets/images/exercises/3294-A9qxk2F.jpg',
  'assets/images/exercises/3296-PkCN2lv.jpg',
  'assets/images/exercises/3297-GaSzzuh.jpg',
  'assets/images/exercises/3298-BL3GHeY.jpg',
  'assets/images/exercises/3302-XooAdhl.jpg',
  'assets/images/exercises/3304-MSfvriJ.jpg',
  'assets/images/exercises/3360-0Yz8WdV.jpg',
  'assets/images/exercises/3699-yRpV5TC.jpg'
];

// Install event: cache app shell resources
self.addEventListener('install', event => {
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
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
        
        
        // Activate the new service worker so it can take control of clients
        // on the next page load. The main.js update flow also provides a
        // manual "update and reload" prompt that uses postMessage(SKIP_WAITING).
        self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Failed to cache app shell:', error);
        throw error;
      }
    })()
  );
});

// Fetch event: optimized offline-first strategy
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
        // Strategy 1: HTML and CSS -> Cache-first
        if (request.destination === 'document' || request.destination === 'style') {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          const network = await fetch(request);
          if (network.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, network.clone());
          }
          return network;
        }
        
        // Strategy 2: JS modules -> Network-first (don't cache modules to avoid corruption)
        // ES modules need to be fetched fresh to avoid caching issues
        if (request.destination === 'script') {
          const network = await fetch(request);
          if (network.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, network.clone());
          }
          return network;
        }
        
        // Strategy 3: Images and fonts -> Cache-first
        if (request.destination === 'image' || request.destination === 'font') {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          const network = await fetch(request);
          if (network.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, network.clone());
          }
          return network;
        }
        
        // Strategy 4: Data JSON files -> Cache-first with network fallback
        // App will read from IndexedDB, but SW caches files for offline access
        if (isDataJson(request)) {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return fetch(request);
        }
        
        // Strategy 5: Everything else -> Network-first with cache fallback
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
          return cachedResponse;
        }
        
        // For navigation requests, return fallback
        if (request.mode === 'navigate') {
          const fallbackResponse = await caches.match('index.html');
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

/**
 * Check if request is for a data JSON file
 * These are cached for offline access but app reads from IndexedDB
 */
function isDataJson(request) {
  return /\/data\/(data|skill-modules).*\.json$/.test(request.url);
}

// Activate event: cleanup old caches and take control
self.addEventListener('activate', event => {
  
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
          
          const deletionResults = await Promise.allSettled(
            cachesToDelete.map(cacheName => {
              return caches.delete(cacheName);
            })
          );
          
          const deletedCount = deletionResults.filter(r => r.status === 'fulfilled').length;
        } else {
        }
        
        // Take control of all open clients
        // Only claim if there are no other active workers
        try {
          await self.clients.claim();
        } catch (e) {
          // Ignore claim errors — another worker may be active
        }
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
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    const port = event.ports?.[0];
    if (port) {
      port.postMessage({ version: VERSION });
    }
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Guard port existence
    const port = event.ports?.[0];
    if (!port) return;
    
    // Clear only the current cache version
    caches.delete(CACHE_NAME)
      .then(success => {
        port.postMessage({ success, cacheName: CACHE_NAME });
      })
      .catch(error => {
        port.postMessage({ success: false, error: error.message });
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

  // Handle scheduled notifications from the main app
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delaySeconds, workoutData, streakData, routineData, notificationType } = event.data;
    
    // Schedule notification using setTimeout
    const notificationHandler = setTimeout(() => {
      let title = '';
      let body = '';
      let data = {};

      switch (notificationType) {
        case 'rest-timer':
          title = 'Rest Complete!';
          body = `Time to start: ${workoutData?.exerciseName || 'Next exercise'}`;
          data = { type: 'rest-complete' };
          break;
        case 'streak-reminder':
          title = 'Workout Streak Reminder';
          body = streakData?.currentStreak 
            ? `Current streak: ${streakData.currentStreak} day${streakData.currentStreak !== 1 ? 's' : ''}!` 
            : 'Keep up the good work!';
          data = { type: 'streak-reminder' };
          break;
        case 'routine-reminder':
          title = 'Scheduled Workout Time!';
          body = routineData?.name || 'Your scheduled workout';
          data = { 
            type: 'scheduled-workout', 
            routineId: routineData?.id 
          };
          break;
        default:
          return;
      }

      const options = {
        body: body,
        icon: 'assets/icons/favicon-192x192.png',
        badge: 'assets/icons/favicon-32x32.png',
        tag: `${notificationType}-${Date.now()}`,
        requireInteraction: false,
        data: data
      };

      self.registration.showNotification(title, options);
      clearTimeout(notificationHandler);
    }, delaySeconds * 1000);

    // Store the timeout ID so it can be cancelled if needed
    if (!self.scheduledNotifications) {
      self.scheduledNotifications = [];
    }
    self.scheduledNotifications.push({
      id: Date.now(),
      handler: notificationHandler,
      type: notificationType
    });
  }
});

// Push notifications for workout reminders (optional feature)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New workout reminder!',
    icon: 'assets/icons/favicon-192x192.png',
    badge: 'assets/icons/favicon-32x32.png',
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
      
      // Handle different notification types
      const notificationData = event.notification.data || {};
      const notificationType = notificationData.type;
      
      let targetHash = '#home';
      
      if (notificationType === 'rest-complete') {
        targetHash = '#active-workout';
      } else if (notificationType === 'scheduled-workout' && notificationData.routineId) {
        targetHash = `#routine-details/routine/${notificationData.routineId}`;
      }
      
      // Open app to appropriate page based on notification type
      if (clients.length > 0) {
        const client = clients.find(c => c.url.includes('index.html')) || clients[0];
        client.focus();
        
        // Navigate to the appropriate hash
        if (typeof client.navigate === 'function') {
          client.navigate(targetHash);
        } else {
          await client.postMessage({ type: 'NAVIGATE', hash: targetHash });
        }
      } else {
        // Use full URL instead of hash fragment
        self.clients.openWindow('/index.html' + targetHash);
      }
    })()
  );
});

