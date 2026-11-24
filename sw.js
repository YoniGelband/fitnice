// Service worker: a small script the browser runs in the background, separate
// from the page. It keeps a copy of the app's files on the phone so Fitnice
// opens with no internet. It never touches your exercise or sweets data.

const CACHE = 'fitnice-v1';

// Every file the app needs. A test (tests/sw.test.js) fails if a file in
// js/ is missing from this list.
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/dom.js',
  'js/entry-dialog.js',
  'js/format.js',
  'js/stats.js',
  'js/storage.js',
  'js/timer.js',
  'js/toast.js',
  'js/ui-exercise.js',
  'js/ui-settings.js',
  'js/ui-summary.js',
  'js/ui-sweets.js',
];

// First visit: download and keep every file.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

// Clear out copies kept under an older cache name.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// Every request for one of our files: answer from the kept copy at once, and
// quietly fetch a newer copy for next time. So the app opens instantly and
// offline, and an update shows up the second time it is opened.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const kept = await cache.match(request, { ignoreSearch: true });

      const fresh = fetch(request, { cache: 'no-cache' }).then((response) => {
        // Failing to keep a copy must not fail the request itself.
        if (response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      });

      if (kept) {
        event.waitUntil(fresh.catch(() => {}));
        return kept;
      }
      return fresh;
    })(),
  );
});
