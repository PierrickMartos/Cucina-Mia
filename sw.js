self.__BUILD__ = {"version":"3e638a78e6bc","base":"/Cucina-Mia/","precache":["","site.webmanifest","favicon.svg","favicon-32x32.png","favicon-192x192.png","apple-touch-icon.png","data/recipes/index.json","images/empty-state.webp","assets/AboutPage-CMBZ3XHm.js","assets/FavoritesPage-PN1Y4_yn.js","assets/LoadError-BUSKnZLB.js","assets/PantryPage-C6hKhm8m.js","assets/RecipesPage-C9ZpRwJO.js","assets/heart-U2efz5i-.js","assets/i18n-HSGZeUcZ.js","assets/index-Ci5ehWb3.js","assets/index-ezbFJm73.css","assets/motion-CVI1bOwk.js","assets/react-DhGenoIF.js","assets/rolldown-runtime-COnpUsM8.js","assets/text-DmVCZRSl.js"]};
/* Cucina Mia service worker: keeps the app usable offline (kitchen wifi, airplane mode).
 *
 * Built by scripts/vite-plugin-service-worker.ts, which prepends `self.__BUILD__`:
 * { version, base, precache } (precache: paths relative to base).
 *
 * - App shell (index.html, JS, CSS, icons, recipe index) is precached at install.
 * - Pages and recipe data: network first, cached copy when offline or the network is too slow.
 * - Images and sounds: cached copy first, refreshed in the background.
 * - Timer notifications are shown from here (Android only shows notifications from a worker).
 */
/* global self, caches, clients */

const { version, base, precache } = self.__BUILD__

const PREFIX = "cucina-mia-"
const SHELL_CACHE = `${PREFIX}shell-${version}`
const DATA_CACHE = `${PREFIX}data-v1`
const MEDIA_CACHE = `${PREFIX}media-v1`
const FONT_CACHE = `${PREFIX}fonts-v1`
const MAX_MEDIA_ENTRIES = 400
const NETWORK_TIMEOUT_MS = 4000
const FONT_ORIGINS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Bypass the HTTP cache so the shell matches this build
      .then((cache) => cache.addAll(precache.map((path) => new Request(base + path, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(`${PREFIX}shell-`) && key !== SHELL_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    if (FONT_ORIGINS.includes(url.origin)) event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
    // Anything else (search model on the Hugging Face CDN…) goes straight to the network
    return
  }

  const path = url.pathname
  // PR previews live below the site and have their own worker. The search engine's
  // WebAssembly (~25 MB) is left to the HTTP cache rather than duplicated here
  if (!path.startsWith(base) || path.startsWith(`${base}pr-preview/`) || path.endsWith(".wasm")) return

  if (request.mode === "navigate") {
    event.respondWith(navigation(request))
  } else if (path.startsWith(`${base}assets/`)) {
    // Hashed file names: a cached copy is always right
    event.respondWith(cacheFirst(request, SHELL_CACHE))
  } else if (path.startsWith(`${base}data/`)) {
    event.respondWith(networkFirst(request, DATA_CACHE))
  } else if (path.startsWith(`${base}images/`) || path.startsWith(`${base}sounds/`)) {
    event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE, MAX_MEDIA_ENTRIES))
  } else {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
  }
})

/** Pages: the network, else the cached page, else the app shell (every route is a hash route). */
async function navigation(request) {
  try {
    return await networkFirst(request, DATA_CACHE)
  } catch {
    const shell = await caches.match(base, { cacheName: SHELL_CACHE })
    return shell ?? Response.error()
  }
}

function cacheable(response) {
  return response.ok || response.type === "opaque"
}

async function put(cacheName, request, response, maxEntries) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  if (maxEntries) {
    const keys = await cache.keys()
    // Keys come back in insertion order: drop the oldest
    await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)))
  }
}

async function networkFirst(request, cacheName) {
  const network = fetch(request).then((response) => {
    if (response.ok) void put(cacheName, request, response.clone())
    return response
  })
  // Slow network: answer from the cache, the fetch still refreshes it in the background
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS))
  try {
    const response = await Promise.race([network, timeout])
    if (response) return response
  } catch { /* Offline */ }
  const cached = await caches.match(request)
  if (cached) return cached
  return network
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) void put(cacheName, request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cached = await caches.match(request)
  const network = fetch(request).then((response) => {
    if (cacheable(response)) void put(cacheName, request, response.clone(), maxEntries)
    return response
  })
  if (cached) {
    network.catch(() => {})
    return cached
  }
  return network
}

// Tapping a timer notification brings the cook back to the app (or opens the recipe)
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url ?? base, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).pathname.startsWith(base))
      if (open) return open.focus()
      return self.clients.openWindow(target)
    })
  )
})
