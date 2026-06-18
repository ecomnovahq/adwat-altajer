/* Service Worker — أدوات التاجر
   استراتيجية:
   - HTML والـAPI: network-first (دائماً أحدث نسخة — يحل مشكلة الكاش القديم)
   - الأصول الثابتة (css/js/خطوط/صور): stale-while-revalidate (سريع + يتحدّث بالخلفية)
*/
const CACHE = 'tajer-v9';
const ASSET_RE = /\.(css|js|svg|png|jpg|jpeg|webp|woff2?)(\?|$)/i;

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // لا تتدخّل في طلبات الـAPI أو النطاقات الخارجية — اتركها للشبكة مباشرة
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  // HTML: شبكة فقط — لا نخزّن صفحات HTML إطلاقاً (يمنع تقديم نسخة قديمة مكسورة)
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // الأصول الثابتة: stale-while-revalidate
  if (ASSET_RE.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
