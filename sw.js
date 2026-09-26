const CACHE_NAME = "kroshka-shell-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./menu.html",
  "./favorites.html",
  "./about.html",
  "./visit.html",
  "./order.html",
  "./404.html",
  "./style.css",
  "./menu-data.js",
  "./js_main1.js",
  "./order.js",
  "./manifest.json",
  "./assets/icons/kroshka.svg",
  "./assets/icons/kroshka-180.png",
  "./assets/icons/kroshka-192.png",
  "./assets/icons/kroshka-512.png",
  "./assets/icons/food-croissant.svg",
  "./assets/icons/food-coffee.svg",
  "./assets/icons/food-cookie.svg",
  "./assets/icons/food-dessert.svg",
  "./assets/images/croissant-coffee.webp",
  "./assets/images/latte.webp",
  "./assets/images/cinnamon-roll.webp",
  "./assets/images/chocolate-cookie.webp",
  "./assets/images/breakfast.webp",
  "./assets/images/cafe-interior.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("kroshka-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(async () =>
        (await caches.match(request, { ignoreSearch: true })) ??
        (await caches.match(new URL("./404.html", self.registration.scope).href)) ??
        (await caches.match(new URL("./index.html", self.registration.scope).href))
      )
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(async (error) => {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    })
  );
});
