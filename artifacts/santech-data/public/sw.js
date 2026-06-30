const CACHE = "santech-v5";

// On install — cache nothing, just activate immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

// On activate — delete ALL old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Never intercept API calls
  if (url.pathname.startsWith("/api")) return;

  // Never cache index.html — always fetch fresh from network
  // This ensures the latest routing is always used
  if (url.pathname === "/" || url.pathname === "/index.html" || !url.pathname.includes(".")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // For hashed static assets (JS/CSS with hash in filename) — cache-first
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Everything else — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
