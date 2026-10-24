// Service worker: guarda la app para abrirla rápido; mapas y posiciones siempre van a la red.
const CACHE = 'paintball-gps-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png',
  '/leaflet/leaflet.css', '/leaflet/leaflet.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname === '/ws') return;
  // teselas del mapa: red primero, con caché de respaldo para zonas sin cobertura
  if (url.hostname.includes('arcgisonline')) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE + '-tiles').then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
