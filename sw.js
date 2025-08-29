const VERSION = '0.0.4';
const CACHE_NAME = `calisthenics-app-${VERSION}`;
const PATH = "Calistenia";
const APP_SHELL = [
  `./index.html`,
  `./css/style.css`,
  `./js/main.js`,
  `./js/services/api.js`,
  `./js/services/state.js`,
  `./js/services/workout-engine.js`,
  `./js/views/home-view.js`,
  `./js/views/exercise-view.js`,
  `./js/views/programs-view.js`,
  `./js/views/program-details-view.js`,
  `./js/views/active-workout-view.js`,
  `./js/views/workout-summary-view.js`,
  `./js/views/onboarding-view.js`,
  `./js/views/profile-view.js`,
  `./js/views/builder-view.js`,
  `./js/components/header.js`,
  `./js/utils/chart-helpers.js`,
  `./manifest.json`,
  `./assets/icons/favicon-32x32.png`,
  `./assets/icons/favicon-192x192.png`
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        //console.log('[Service Worker] Caching app shell');
        await cache.addAll(APP_SHELL);
        //console.log('[Service Worker] App shell cached successfully');
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Failed to cache app shell:', error);
      }
    })(),  
  );
});


self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async () => {
      const request = e.request;
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
        // Network first strategy: try to fetch from network first
        //console.log(`[Service Worker] Attempting network fetch: ${request.url}`);
        const networkResponse = await fetch(request);
        
        // If successful, update cache and return response
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          //console.log(`[Service Worker] Caching fresh resource: ${request.url}`);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Network failed, try to serve from cache
        console.log(`[Service Worker] Network failed, trying cache: ${request.url}`);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          //console.log(`[Service Worker] Serving from cache: ${request.url}`);
          return cachedResponse;
        }
        
        // If not in cache either, return a fallback or error
        //console.log(`[Service Worker] No cache available for: ${request.url}`);
        
        // For navigation requests, return a fallback page
        if (request.mode === 'navigate') {
          const fallbackResponse = await caches.match('./index.html');
          if (fallbackResponse) {
            return fallbackResponse;
          }
        }
        
        // For other requests, return a basic error response
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })(),
  );
});

self.addEventListener("activate", (e) => {
  console.log('[Service Worker] Activate');
  e.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const keyList = await caches.keys();
        await Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              //console.log('[Service Worker] Deleting old cache:', key);
              return caches.delete(key);
            }
          }),
        );
        
        // Take control of all clients immediately
        await self.clients.claim();
        //console.log('[Service Worker] Activated and controlling clients');
      } catch (error) {
        console.error('[Service Worker] Activation failed:', error);
      }
    })(),
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});