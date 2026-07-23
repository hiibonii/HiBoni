const CACHE_NAME = "hiboni-cache-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions (e.g. "hiboni-cache-v1") so stale
      // entries never linger across deploys.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle simple GET requests; let everything else (POST, chrome-extension:, etc.) pass through untouched.
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) {
    return;
  }

  const isNavigation = event.request.mode === "navigate";

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        // Save a copy of successful responses so we actually have something to fall back to later.
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Page navigation (user opening/refreshing a URL) with no network
        // and no cached copy — show the offline page instead of a raw
        // error, so the user gets something readable instead of a broken
        // browser error screen.
        if (isNavigation) {
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
        }
        // Non-navigation request (e.g. an API/data fetch) with nothing to
        // fall back to — still must return a real Response instead of
        // undefined, or the browser throws "Failed to convert value to
        // 'Response'".
        return new Response("Network error and no cached version available.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      }
    })()
  );
});