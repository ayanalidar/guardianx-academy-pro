/* ============================================================
   GuardianX Academy — Service Worker
   - Network-first for navigation requests (fresh UI when online)
   - Cache-first for immutable static assets
   - Offline fallback to cached shell
   ============================================================ */

// v3: fixed ghost-build bug. v2 cached EVERY navigation response under the
// cache key "/" and served that stale HTML for any route whenever the
// network hiccupped (deploys, restarts) — clients silently ran old builds
// with old bugs. v3 caches each page under its own URL, only caches OK
// responses, and times out slow navigations before falling back.
// Bump VERSION on every shell-affecting change so clients self-refresh.
const VERSION = "guardianx-sw-v3";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const NAV_TIMEOUT_MS = 8000;

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/logo.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches (purges v1/v2 caches on existing clients)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper: is this a navigation request?
function isNavigation(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept") || "").includes(
      "text/html"
    )
  );
}

// Helper: same-origin?
function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// Helper: fetch with a hard timeout so a hanging origin falls back fast
// instead of leaving the user on a blank screen for 30+ seconds.
function fetchWithTimeout(request, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip Next.js HMR, dev, and internal endpoints entirely
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.pathname.startsWith("/_next/data")) return;
  if (url.pathname.startsWith("/api/")) return;

  // 1) Navigation requests — network-first, fall back to cached copy of
  //    THIS page, then the cached shell, then the offline body.
  if (isNavigation(request) && isSameOrigin(url)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetchWithTimeout(request, NAV_TIMEOUT_MS);
          // Only cache genuinely good HTML, under the page's OWN URL —
          // never poison "/" with a different page's HTML.
          if (fresh && fresh.ok && fresh.type === "basic") {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, fresh.clone()).catch(() => undefined);
          }
          return fresh;
        } catch (err) {
          const runtime = await caches.open(RUNTIME_CACHE);
          const shell = await caches.open(SHELL_CACHE);
          const cached =
            (await runtime.match(request)) ||
            (await shell.match(request)) ||
            (await shell.match("/"));
          if (cached) return cached;
          return new Response(
            offlineBody(),
            { status: 503, headers: { "Content-Type": "text/html" } }
          );
        }
      })()
    );
    return;
  }

  // 2) Static assets (same origin) — cache-first, then network (and cache).
  //    _next/static assets are content-hashed so caching them is safe.
  if (isSameOrigin(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok && fresh.type === "basic") {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, fresh.clone()).catch(() => undefined);
          }
          return fresh;
        } catch (err) {
          // No fallback for missing assets
          return new Response("", { status: 504 });
        }
      })()
    );
    return;
  }

  // 3) Cross-origin — straight to network
  // (Default browser behaviour; do not intercept)
});

// Offline fallback HTML body — minimal branded page
function offlineBody() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>GuardianX — Offline</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(at 20% 20%, rgba(124,58,237,0.18) 0%, transparent 55%),
                radial-gradient(at 80% 12%, rgba(6,182,212,0.10) 0%, transparent 50%),
                #0a0a0f;
    color: #f5f5fa;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .card {
    max-width: 28rem;
    width: 100%;
    background: rgba(28, 28, 41, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 1rem;
    padding: 2.5rem 2rem;
    text-align: center;
    box-shadow: 0 16px 60px -20px rgba(124,58,237,0.35);
  }
  .badge {
    display: inline-block;
    padding: 0.35rem 0.8rem;
    border: 1px solid rgba(124,58,237,0.45);
    background: rgba(124,58,237,0.12);
    color: #a78bfa;
    border-radius: 999px;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 1.25rem;
  }
  h1 { margin: 0 0 0.75rem; font-size: 1.5rem; letter-spacing: -0.02em; }
  p { color: #a1a1b5; margin: 0 0 1.5rem; line-height: 1.55; font-size: 0.95rem; }
  button {
    background: #7c3aed;
    color: #fff;
    border: none;
    padding: 0.7rem 1.4rem;
    border-radius: 0.6rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease;
  }
  button:hover { background: #6d28d9; }
  button:active { transform: scale(0.97); }
  .footer { margin-top: 1.5rem; font-size: 0.7rem; color: #6b6b80; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">OFFLINE MODE</div>
    <h1>You're offline, Guardian.</h1>
    <p>GuardianX Academy needs an internet connection to load course content, labs, and live sessions. Cached pages will still be available.</p>
    <button onclick="location.reload()">Try Again</button>
    <div class="footer">GuardianX Academy · Cyber Security LMS</div>
  </div>
</body>
</html>`;
}
