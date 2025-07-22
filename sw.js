const VERSION = '0.0.1';
const CACHE_NAME = `calisthenics-app-${VERSION}`;
const PATH = "Calistenia";
const APP_SHELL = [
  `${PATH}/index.html`,
  `${PATH}/css/style.css`,
  `${PATH}/js/main.js`,
  `${PATH}/js/services/api.js`,
  `${PATH}/js/services/state.js`,
  `${PATH}/js/services/workout-engine.js`,
  `${PATH}/js/views/home-view.js`,
  `${PATH}/js/views/exercise-view.js`,
  `${PATH}/js/views/programs-view.js`,
  `${PATH}/js/views/active-workout-view.js`,
  `${PATH}/js/views/workout-summary-view.js`,
  `${PATH}/js/views/onboarding-view.js`,
  `${PATH}/js/views/profile-view.js`,
  `${PATH}/js/views/builder-view.js`,
  `${PATH}/js/components/header.js`,
  `${PATH}/js/utils/chart-helpers.js`,
  `${PATH}/data/exercises.json`,
  `${PATH}/data/programs.json`,
  `${PATH}/manifest.json`,
  `${PATH}/assets/icons/favicon-32x32.png`,
  `{PATH}/assets/icons/favicon-192x192.png`
  
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