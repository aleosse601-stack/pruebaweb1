self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('falla-app').then(cache => cache.addAll([
      './',
      './login.html',
      './admin.html',
      './fallero.html'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
