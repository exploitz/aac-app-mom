// Offline-first service worker: pre-cache the app shell, serve cache-first.
// Bump VERSION on every deploy so clients pick up new files.
const VERSION = 'v7';
const CACHE = `ourvoice-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/audio.js',
  './js/board.js',
  './js/backup.js',
  './js/db.js',
  './js/editor.js',
  './js/log.js',
  './js/model.js',
  './js/predict.js',
  './js/seed.js',
  './js/speech.js',
  './js/symbols.js',
  './js/tools.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  // no-cache: bypass the HTTP cache so a new version never pre-caches stale
  // files (GitHub Pages serves with max-age=600).
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)),
  );
});
