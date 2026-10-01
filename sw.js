/* Offline support for the Traffic Volume Survey Tool.
   Strategy: everything is precached on install. After that, each request is answered
   from the cache straight away and refreshed in the background, so the app opens with
   no signal and picks up new versions on the next launch.
   Bump CACHE when you add or rename files in PRECACHE. */
const CACHE = "traffic-survey-v2";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "vendor/chart.umd.min.js",
  "fonts/inter-latin-wght-normal.woff2",
  "fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      // One missing file must not stop the rest from being cached.
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(new Request(u, {cache: "reload"})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, {ignoreSearch: true});
    const refresh = fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    });
    if (cached) {
      refresh.catch(() => {});
      return cached;
    }
    try {
      return await refresh;
    } catch (err) {
      if (req.mode === "navigate") {
        const page = await cache.match("index.html");
        if (page) return page;
      }
      throw err;
    }
  })());
});
