// EatPlan service worker
// Strategy:
//   - Navigation requests: network-first, fall back to cached HTML (offline shell)
//   - Static assets (_next/static, /icon*, /manifest): cache-first
//   - All others: pass-through

const CACHE = "eatplan-v1";
const SHELL_PATHS = [
  "/",
  "/dashboard",
  "/plan",
  "/plan/shopping",
  "/recipes",
  "/progress",
  "/phases",
  "/settings",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Best-effort precache; ignore individual failures
      Promise.allSettled(SHELL_PATHS.map((p) => cache.add(p))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Bypass API calls and auth — these need the network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navigation: network-first, fallback to cache, fallback to shopping list shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/plan/shopping") || caches.match("/")),
        ),
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        });
      }),
    );
  }
});
