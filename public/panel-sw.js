const CACHE = "od-panel-static-v1";
const PUBLIC_FALLBACK = ["/offline", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_FALLBACK)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Özel panel HTML'i, API yanıtları ve materyaller hiçbir zaman cache'e girmez.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/panel") || url.pathname.includes("/materials/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  const staticAsset = url.pathname.startsWith("/_next/static/") || /\.(?:css|js|woff2|png|ico)$/.test(url.pathname);
  if (!staticAsset) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && response.type === "basic") caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
