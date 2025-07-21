const VERSION = '0.0.1';
const CACHE_NAME = `calisthenics-app-${VERSION}`;
const PATH = "Calistenia";
const APP_SHELL = [
  '${PATH}/',
  '${PATH}/index.html',
  '${PATH}/css/style.css',
  '${PATH}/js/main.js',
  '${PATH}/js/services/api.js',
  '${PATH}/js/services/state.js',
  '${PATH}/js/services/workout-engine.js',
  '${PATH}/js/views/home-view.js',
  '${PATH}/js/views/exercise-view.js',
  '${PATH}/js/views/programs-view.js',
  '${PATH}/js/views/active-workout-view.js',
  '${PATH}/js/views/workout-summary-view.js',
  '${PATH}/js/views/onboarding-view.js',
  '${PATH}/js/views/profile-view.js',
  '${PATH}/js/views/builder-view.js',
  '${PATH}/js/components/header.js',
  '${PATH}/js/utils/chart-helpers.js',
  '${PATH}/data/exercises.json',
  '${PATH}/data/programs.json',
  '${PATH}/manifest.json',
  '${PATH}/assets/icons/favicon-32x32.png',
  '${PATH}/assets/icons/favicon-16x16.png',
  '${PATH}/assets/icons/favicon-192x192.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  
];

self.addEventListener('install', event => {
  console.log('Service Worker Registered');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
