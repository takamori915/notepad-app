const CACHE_NAME = 'kakumee-v2';
const ASSETS = [
    '/notepad-app/',
    '/notepad-app/index.html',
    '/notepad-app/styles.css',
    '/notepad-app/script.js',
    '/notepad-app/generator.html',
    '/notepad-app/generator.css',
    '/notepad-app/generator.js',
    '/notepad-app/manifest.json',
    '/notepad-app/icons/icon-192.png',
    '/notepad-app/icons/icon-512.png',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    // 外部APIはキャッシュしない
    if (!url.origin.includes('github.io') && url.origin !== self.location.origin) return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            const network = fetch(e.request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return res;
            }).catch(() => cached);
            return cached || network;
        })
    );
});
