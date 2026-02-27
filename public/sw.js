// Service Worker لـ Karas Magdy PWA
const CACHE_NAME = 'karas-magdy-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html', '/manifest.json', '/icon-192.svg']);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/') || e.request.url.includes('socket.io')) return;
  try {
    const u = new URL(e.request.url);
    if (u.origin !== self.location.origin) return;
  } catch (_) { return; }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
  );
});
