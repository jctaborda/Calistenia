const VERSION = '0.0.1';
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
  `./js/views/active-workout-view.js`,
  `./js/views/workout-summary-view.js`,
  `./js/views/onboarding-view.js`,
  `./js/views/profile-view.js`,
  `./js/views/builder-view.js`,
  `./js/components/header.js`,
  `./js/utils/chart-helpers.js`,
  `./data/exercises.json`,
  `./data/programs.json`,
  `./manifest.json`,
  `./assets/icons/favicon-32x32.png`,
  `./assets/icons/favicon-192x192.png`
  
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Caching all');
      await cache.addAll(APP_SHELL);
    })(),  
  );
});


self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async () => {
      const r = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      const cache = await caches.open(CACHE_NAME);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key === CACHE_NAME) {
            return undefined;
          }
          return caches.delete(key);
        }),
      ),
    ),
  );
});