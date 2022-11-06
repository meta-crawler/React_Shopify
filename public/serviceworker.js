const CACHE_NAME = 'version-1';
const urlsToCache = [
  '/',
  'index.html',
  'serviceworker.js',
  'static',
];
const self = this;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');

        return cache.addAll(urlsToCache);
      }),
  );
});

self.addEventListener('fetch', (event) => {
  // event.respondWith(
  //   caches.match(event.request)
  //     .then(() => fetch(event.request)
  //       .catch(() => caches.match('offline.html'))),
  // );
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request)),
  );
});

// self.addEventListener('activate', (event) => {
//   // const cacheWhitelist = [];
//   // cacheWhitelist.push(CACHE_NAME);
//   //
//   // event.waitUntil(
//   //   caches.keys().then((cacheNames) => Promise.all(
//   //     cacheNames.map((cacheName) => {
//   //       if (!cacheWhitelist.includes(cacheName)) {
//   //         return caches.delete(cacheName);
//   //       }
//   //     }),
//   //   )),
//   // );
// });
