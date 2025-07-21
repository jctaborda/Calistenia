const VERSION = '0.0.1';
const CACHE_NAME = `calisthenics-app-${VERSION}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/services/api.js',
  '/js/services/state.js',
  '/js/services/workout-engine.js',
  '/js/views/home-view.js',
  '/js/views/exercise-view.js',
  '/js/views/programs-view.js',
  '/js/views/active-workout-view.js',
  '/js/views/workout-summary-view.js',
  '/js/views/onboarding-view.js',
  '/js/views/profile-view.js',
  '/js/views/builder-view.js',
  '/js/components/header.js',
  '/js/utils/chart-helpers.js',
  '/data/exercises.json',
  '/data/programs.json',
  '/manifest.json',
  '/assets/icons/favicon-32x32.png',
  '/assets/icons/favicon-16x16.png',
  '/assets/icons/favicon-192x192.png',
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
