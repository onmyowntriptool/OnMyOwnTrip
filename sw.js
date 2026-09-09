// ============================================================
// OnMyOwnTrip · Service Worker (offline básico)
//
// Objetivo: que la app siga funcionando (shell + POIs ya vistos) con
// conexión intermitente o sin cobertura, típico del turismo a pie por
// cascos históricos. NO cachea las llamadas a la IA (son POST: el fetch
// handler de abajo solo intercepta GET, así que pasan de largo tal cual
// y el propio app.js ya sabe caer al simulador local si fallan).
//
// Registrado con ruta relativa ('sw.js', no '/sw.js') a propósito: la
// web se sirve bajo un subpath en GitHub Pages
// (davidghenriquez.github.io/OnMyOwnTrip/), y el scope de un Service
// Worker no puede ser más amplio que la carpeta donde vive su script.
// ============================================================

// Sube este número cuando cambies la lista SHELL_URLS de aquí abajo
// (los propios archivos versionados con "?v=N" ya se cachean solos con
// su nueva clave la primera vez que se piden, sin necesidad de tocar esto).
const CACHE_VERSION = 'v188';
const SHELL_CACHE = `omot-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `omot-images-${CACHE_VERSION}`;
// Contenido de ciudad servido por el Worker (POST /content, ver
// worker/proxy.js): no lleva CACHE_VERSION porque no depende del shell, solo
// se invalidaría si cambiara la forma de la respuesta (no el contenido en sí,
// que ya se actualiza solo al volver a pedirse con red).
const CONTENT_CACHE = 'omot-content-v1';

// Rutas relativas al propio sw.js (que vive en la raíz del sitio): se
// resuelven correctamente tanto en local como bajo el subpath de GitHub
// Pages. No se incluye llm-config.js: es un override local opcional que
// ni siquiera existe en el despliegue público (está en .gitignore).
//
// data/cities/<id>.js NO se precachea aquí a propósito: solo se descarga
// cuando el usuario elige esa ciudad (ver loadCityData en app.js), pero
// una vez pedida, el fetch handler de abajo la cachea igual que el resto
// del shell, así que la siguiente visita a esa misma ciudad ya funciona
// offline sin tocar este archivo.
const SHELL_URLS = [
  './',
  './index.html',
  './app.js?v=194',
  './data/core.js?v=27',
  './styles.css?v=60',
  './manifest.json?v=1',
  './privacidad.html',
  './assets/icons/icon-192.png?v=1',
  './assets/icons/icon-512.png?v=1',
  './assets/icons/icon-512-maskable.png?v=1',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Individual, no cache.addAll: un solo fallo (p.ej. sin red en ese
    // instante) no debe tirar abajo el precache de todo lo demás.
    await Promise.allSettled(
      SHELL_URLS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.ok) await cache.put(url, res);
        } catch (_) { /* se cacheará más adelante vía el fetch handler */ }
      })
    );
    // OJO: aquí había un self.skipWaiting() incondicional, que activaba
    // cualquier versión nueva al instante sin que el usuario llegara a
    // pulsar "Actualizar". Combinado con index.html comparando un número
    // de versión copiado a mano (que se desincronizaba fácilmente y dejaba
    // el aviso de actualización en bucle infinito), resultó ser un diseño
    // frágil. Ahora se espera de verdad en estado "waiting" hasta que
    // index.html pida explícitamente saltárselo (ver el listener de
    // 'message' más abajo), el patrón estándar y bien probado para
    // Service Workers.
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, IMAGE_CACHE, CONTENT_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
    self.clients.claim();
  })());
});

const isImageRequest = (req) => req.destination === 'image';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Contenido de ciudad (POST /content, gate de licencia — ver
  // worker/proxy.js): a diferencia del resto de peticiones POST de este
  // Worker (chat/tts/license, que se dejan pasar sin tocar más abajo), esta
  // SÍ conviene cachearla, para que la app siga funcionando offline con las
  // ciudades ya visitadas — igual que antes con el <script src=
  // "data/cities/...">  estático. La Cache API no indexa por método HTTP
  // como el navegador: se usa una key sintética (URL inventada, estable por
  // ciudad) en vez del Request real.
  if (url.pathname.endsWith('/content') && request.method === 'POST') {
    event.respondWith((async () => {
      const body = await request.clone().json().catch(() => null);
      const cityId = body && body.cityId;
      const cacheKey = cityId ? new Request(`https://omot-content-cache.local/${cityId}`) : null;
      const cache = await caches.open(CONTENT_CACHE);

      try {
        const res = await fetch(request);
        if (res.ok && cacheKey) cache.put(cacheKey, res.clone());
        // Licencia caducada/no encontrada pero con la ciudad ya cacheada de
        // una visita anterior con acceso válido: servir la copia local en
        // vez de bloquear (no penalizar a alguien de viaje sin cobertura).
        if (!res.ok && cacheKey) {
          const cached = await cache.match(cacheKey);
          if (cached) return cached;
        }
        return res;
      } catch (_) {
        if (cacheKey) {
          const cached = await cache.match(cacheKey);
          if (cached) return cached;
        }
        return Response.error();
      }
    })());
    return;
  }

  // Solo GET a partir de aquí: deja pasar sin tocar cualquier otro POST
  // (chat/tts/license), tal cual, directo a la red.
  if (request.method !== 'GET') return;

  // Nunca cachear el proxy de IA (aunque en la práctica siempre es POST,
  // por si acaso cambia a GET en el futuro no queremos servir respuestas
  // de IA cacheadas y desactualizadas).
  if (url.hostname.endsWith('workers.dev')) return;

  if (isImageRequest(request)) {
    // Imágenes de POIs (Wikimedia, cross-origin): cache-first, y se
    // guarda en segundo plano la que se pida por primera vez, para que
    // la próxima visita a ese POI funcione ya sin conexión.
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res && res.ok) {
          cache.put(request, res.clone());
        } else if (res && res.type === 'opaque') {
          // Las imágenes de Wikimedia se piden sin CORS, así que la
          // respuesta siempre llega "opaca": no se puede leer su status
          // real, un fallo de red camuflado de opaca se ve exactamente
          // igual que un éxito. Sin este chequeo, un fallo transitorio se
          // cachearía como si fuera la imagen real y quedaría vacía para
          // siempre (bug real: encontrado con una imagen cacheada a 0
          // bytes que nunca volvía a reintentar red).
          const blob = await res.clone().blob();
          if (blob.size > 0) cache.put(request, res.clone());
        }
        return res;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Shell de la app (HTML/CSS/JS + leaflet): stale-while-revalidate — se
  // responde al momento con lo cacheado si existe (rápido, y funciona
  // offline), y en paralelo se pide la red para refrescar la caché de
  // cara a la siguiente visita.
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    const networkFetch = fetch(request).then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await networkFetch) || Response.error();
  })());
});
