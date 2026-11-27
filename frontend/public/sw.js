const CACHE_NAME = 'medconnect-static-v1';
const PUBLIC_EDU_URL = '/api/clinical/bundle';

// Never cache private patient endpoints, auth, reports, chat, or QR tokens.
function isPrivatePath(pathname) {
  return (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/patient') ||
    pathname.startsWith('/api/doctor') ||
    pathname.startsWith('/api/reports') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/api/qr') ||
    pathname.startsWith('/api/mentor') ||
    pathname.startsWith('/api/forum') ||
    pathname.startsWith('/api/community') ||
    pathname.startsWith('/api/appointments')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/index.html']).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivatePath(url.pathname)) return;

  // Network-first for public educational bundle so updates arrive when online, cached offline
  if (url.pathname === PUBLIC_EDU_URL || url.pathname.startsWith('/api/clinical/')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for static assets & SPA shell
  if (!url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request).then((m) => m || caches.match('/index.html')))
    );
  }
});
