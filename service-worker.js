const CACHE_NAME = "diber-cache-v1";
const ASSETS = [
    "/",               // tu index.html
    "/index.html",
    "/styles.css",
    "/script.js",
    "/favicon.png",
    "/manifest.json",

    // añade aquí todos tus componentes:
    "/js/app.js",
    "/core/state.js",
    "/components/utils.js",
    "/components/calcular.js",
    "/components/perfiles.js",
    "/components/historial.js",
    "/components/cronometro.js",
    "/components/userCode.js",
    "/components/sync.js",
];

// INSTALACIÓN DEL SERVICE WORKER
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

// ACTIVACIÓN Y LIMPIEZA DE CACHES ANTIGUOS
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            )
        )
    );
});

// RESPUESTA A PETICIONES
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request)
                .catch(() => cached);  
        })
    );
});
