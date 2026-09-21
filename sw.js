// Offline-first service worker.
//  - App shell (html/js/css): network-first so updates land on the first online load; cache fallback offline.
//  - Data, icons, sample photos: cache-first with background refresh.
//  - CDN libraries and TF.js model weights: cached on first use so Snap & Value works in low-connectivity zones.
const VERSION = 'kc-v5'
const SHELL = ['./', 'index.html', 'recycler.html', 'start.html', 'icons/qr-app.png', 'icons/qr-console.png', 'manifest.webmanifest', 'css/app.css', 'js/i18n.js', 'js/db.js', 'js/ai.js', 'js/app.js',
  'data/categories.json', 'data/prices.json', 'data/recyclers.json', 'data/safety.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'samples/laptop.jpg', 'samples/phones.jpg', 'samples/pcb.jpg', 'samples/cables.jpg', 'samples/battery.jpg', 'samples/printer.jpg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res }

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.hostname.endsWith('tile.openstreetmap.org')) return   // map tiles: network only
  if (url.origin === location.origin) {
    const shell = /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/')
    if (shell) {
      e.respondWith(fetch(e.request).then((res) => put(e.request, res)).catch(() => caches.match(e.request, { ignoreSearch: true })))
    } else {
      e.respondWith(caches.match(e.request).then((hit) => {
        const net = fetch(e.request).then((res) => put(e.request, res)).catch(() => hit)
        return hit || net
      }))
    }
    return
  }
  // cross-origin (CDN libs, model weights): cache-first
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => put(e.request, res)).catch(() => hit)))
})
