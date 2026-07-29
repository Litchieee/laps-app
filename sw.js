const CACHE = 'laps-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkPromise = fetch(e.request).then(async res => {
        if (res.ok) {
          const clone = res.clone();
          if (cached) {
            // Only notify if content actually changed
            const [oldText, newText] = await Promise.all([
              cached.clone().text(),
              clone.clone().text()
            ]);
            if (oldText !== newText) {
              await cache.put(e.request, clone);
              const all = await clients.matchAll({ type: 'window' });
              all.forEach(c => c.postMessage({ type: 'LAPS_UPDATE' }));
            }
          } else {
            await cache.put(e.request, clone);
          }
        }
        return res;
      }).catch(() => null);
      return cached || networkPromise;
    })
  );
});
