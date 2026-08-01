// Offline-first service worker: pre-cache the app shell, serve cache-first.
// Bump VERSION on every deploy so clients pick up new files.
const VERSION = 'v2';
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
  './js/model.js',
  './js/seed.js',
  './js/speech.js',
  './js/symbols.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
