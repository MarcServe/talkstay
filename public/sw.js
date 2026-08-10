// TalkStay service worker.
//  * PWA: precache the app shell (list injected by vite-plugin-pwa at build) so
//    the app installs to the home screen and opens offline.
//  * Push: web-push notifications for staff alerts (new/assigned requests).
// Self-contained — no workbox import — so it stays robust and dependency-light.

// vite-plugin-pwa (injectManifest) replaces self.__WB_MANIFEST with the built
// asset list. Guard so the raw source is still valid during local dev.
const MANIFEST = (self.__WB_MANIFEST || []);
const PRECACHE_URLS = MANIFEST.map((e) => (typeof e === "string" ? e : e.url));

// The cache name is derived from the built asset list, so EVERY deploy gets a
// fresh cache and `activate` below evicts the previous one. This was a fixed
// "talkstay-shell-v1" before — which made the activate cleanup a permanent
// no-op (nothing ever differed from it), so stale shell/assets could be served
// indefinitely after a deploy.
const BUILD_ID = (() => {
  const s = PRECACHE_URLS.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
})();
const CACHE = `talkstay-shell-${BUILD_ID}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", ...PRECACHE_URLS]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Navigations: network-first with an offline fallback to the cached shell.
// Everything else: cache-first for our own static assets.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept Supabase/OpenAI

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((r) => r || caches.match(req)))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && (url.pathname.startsWith("/assets/") || url.pathname === "/")) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});

// ---- Web push (staff alerts) ----
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
  const title = data.title || "TalkStay";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      data: { url: data.url || "/app" },
      requireInteraction: !!data.urgent,
      // Explicitly allow the OS notification sound (some browsers default quiet).
      silent: false,
      renotify: true,
      vibrate: data.urgent ? [200, 100, 200] : [120],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
