// Offline-first service worker: precache the app shell + datasets; cache CDN libraries and the
// TF.js model files on first use so Snap & Value works in low-connectivity zones afterwards.
const VERSION = 'kc-v1'
const SHELL = ['./', 'index.html', 'recycler.html', 'manifest.webmanifest', 'css/app.css', 'js/i18n.js', 'js/db.js', 'js/ai.js', 'js/app.js',
  'data/categories.json', 'data/prices.json', 'data/recyclers.json', 'data/safety.json', 'icons/icon-192.png', 'icons/icon-512.png']

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())) })

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  // map tiles: network only (never cache — huge, and offline map is optional)
  if (url.hostname.endsWith('tile.openstreetmap.org')) return
  // app shell + data: cache-first, refresh in background
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone())); return res }).catch(() => hit)
      return hit || net
    }))
    return
  }
  // CDN libs + model weights (tfjs, mobilenet, qrcode, leaflet, kaggle/tfhub model): cache on first use
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok || res.type === 'opaque') caches.open(VERSION).then((c) => c.put(e.request, res.clone()))
    return res
  }).catch(() => hit)))
})
