/* TECH STORE — service worker
   Rend le site installable et utilisable avec une connexion lente ou coupée.
   Actif uniquement en HTTPS (une fois le site en ligne). */

const VERSION = "techstore-v3";
const CORE = [
  "./", "index.html", "shop.html", "product.html", "cart.html", "checkout.html", "services.html", "about.html", "contact.html", "legal.html",
  "css/style.css", "css/animations.css", "css/themes.css",
  "js/config.js", "js/cart.js", "js/main.js", "js/effects.js", "data/products.js",
  "images/logo-mark.svg", "images/icon-192.png",
  "images/placeholders/pc.svg", "images/placeholders/smartphones.svg", "images/placeholders/audio.svg",
  "images/placeholders/gaming.svg", "images/placeholders/montres.svg", "images/placeholders/accessoires.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (contenu toujours à jour), cache si le réseau est absent ou trop lent
function networkFirst(req, timeout = 3500) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((r) => r || Response.error());
    const timer = setTimeout(() => { if (!done) { done = true; fromCache().then(resolve); } }, timeout);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(timer); if (!done) { done = true; fromCache().then(resolve); } });
  });
}

// Images : cache d'abord (rapide), mises à jour au passage
function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
    return res;
  }));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(/\.(png|jpe?g|webp|svg|gif|ico)$/i.test(new URL(req.url).pathname) ? cacheFirst(req) : networkFirst(req));
});
