// Offline app shell. Product data is cached by the app itself (localStorage);
// API calls are never cached here.
const VERSION = "anteater-v1";
const SHELL = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "src/app.js", "src/score.js", "src/additives.js", "src/off.js", "src/gemini.js", "src/store.js", "src/scanner.js",
  "data/samples.json", "icons/icon.svg", "icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Network first so new deploys show up; fall back to cache when offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))),
  );
});
