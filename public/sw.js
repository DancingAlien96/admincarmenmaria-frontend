// Service worker del Campus (PWA). Estrategia conservadora:
// - Páginas: siempre de la red (para ver siempre la última versión); sin
//   conexión se muestra /offline.html.
// - Archivos estáticos con hash (/_next/static) e íconos: caché primero.
// - La API y los archivos subidos (/api, /uploads) nunca se cachean.
// - Notificaciones push: muestra el aviso y al tocarlo abre la página indicada.
const VERSION = "v2";
const STATIC_CACHE = `cm-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) =>
        c.addAll([OFFLINE_URL, "/icon-192.png", "/logocarmenmaria.png"])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("cm-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});

// --- Notificaciones push -------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Campus Carmen María", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // Si el Campus ya está abierto, lo reutiliza; si no, abre una ventana.
        const open = list.find((c) => c.url.startsWith(self.location.origin));
        if (open && url.startsWith(self.location.origin)) {
          return open.focus().then((c) => (c || open).navigate(url));
        }
        return self.clients.openWindow(url);
      })
  );
});
