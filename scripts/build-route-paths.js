// Precalcula el trazado A PIE real (por calles) de cada ruta recomendada y
// lo guarda en data/layers/route-paths-<ciudad>.js. Antes la app unía las
// paradas con líneas rectas (tester Khanh, feedback #31).
//
// Se calcula una sola vez aquí, no en el móvil: así la app no depende de
// ningún servicio de rutas en tiempo real (ni coste, ni cobertura, ni
// límites de uso). Usa el servidor OSRM a pie de FOSSGIS
// (routing.openstreetmap.de), datos de OpenStreetMap.
//
// Uso:  node scripts/build-route-paths.js            (todas las ciudades)
//       node scripts/build-route-paths.js toledo     (solo una)
//
// Volver a ejecutarlo si cambian las paradas o el orden de una ruta: la app
// compara la lista de paradas guardada con la actual y, si no coincide,
// vuelve a la línea recta en vez de pintar un trazado desfasado.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CITIES_DIR = path.join(ROOT, 'data', 'cities');
const OUT_DIR = path.join(ROOT, 'data', 'layers');
const OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
const DELAY_MS = 400; // trato educado al servidor público de FOSSGIS

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round5 = (n) => Math.round(n * 1e5) / 1e5;
const haversine = (a, b) => {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(toRad(b[0] - a[0]) / 2) ** 2
    + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(toRad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const loadPois = (cityId) => {
  const CITIES = { [cityId]: {} };
  // CATEGORIES vive en data/core.js; aquí solo hace falta que no falle.
  const CATEGORIES = new Proxy({}, { get: (_, k) => String(k) });
  vm.runInNewContext(fs.readFileSync(path.join(CITIES_DIR, `${cityId}.js`), 'utf8'), { CITIES, CATEGORIES });
  return CITIES[cityId].pois || [];
};

const routeLeg = async (a, b) => {
  const url = `${OSRM}/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'OnMyOwnTrip route precompute (contacto@onmyowntrip.com)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const r = data.routes && data.routes[0];
      if (!r) throw new Error(data.code || 'sin ruta');
      // GeoJSON viene como [lng, lat]; la app (Leaflet) usa [lat, lng].
      const coords = r.geometry.coordinates.map(([lng, lat]) => [round5(lat), round5(lng)]);
      // Se fuerzan los extremos a las coordenadas exactas de las paradas para
      // que la línea llegue al pin aunque OSRM la haya "pegado" a la calle.
      return { d: Math.round(r.distance), c: [a, ...coords, b] };
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1500);
    }
  }
};

const buildCity = async (cityId) => {
  const pois = loadPois(cityId).filter((p) => p.essential && p.coords);
  const byRoute = {};
  pois.forEach((p) => { (byRoute[p.essential.route] = byRoute[p.essential.route] || []).push(p); });
  const out = {};
  for (const [routeId, list] of Object.entries(byRoute)) {
    list.sort((a, b) => a.essential.order - b.essential.order);
    if (list.length < 2) continue;
    const legs = [];
    for (let i = 1; i < list.length; i++) {
      await sleep(DELAY_MS);
      const leg = await routeLeg(list[i - 1].coords, list[i].coords);
      // Un rodeo enorme a pie (más de 4 veces la línea recta y más de
      // 1,5 km) casi siempre significa agua de por medio (p. ej. el Bósforo,
      // que se cruza en ferry). Ahí se guarda null y la app pinta ese tramo
      // en línea recta, que es más honesto que un paseo de 5 km por la orilla.
      const straight = haversine(list[i - 1].coords, list[i].coords);
      legs.push(leg.d > 1500 && leg.d > 4 * straight ? null : leg);
    }
    out[routeId] = { stops: list.map((p) => p.id), legs };
    const km = legs.reduce((s, l) => s + (l ? l.d : 0), 0) / 1000;
    console.log(`  ${cityId}/${routeId}: ${list.length} paradas, ${km.toFixed(1)} km a pie`);
  }
  const file = path.join(OUT_DIR, `route-paths-${cityId}.js`);
  const header = `// Trazado a pie de las rutas recomendadas de ${cityId}, generado por\n// scripts/build-route-paths.js (no editar a mano).\n// Fuente: OpenStreetMap contributors, vía OSRM de FOSSGIS (routing.openstreetmap.de).\n`;
  fs.writeFileSync(file, `${header}window.ROUTE_PATHS = window.ROUTE_PATHS || {};\nwindow.ROUTE_PATHS[${JSON.stringify(cityId)}] = ${JSON.stringify(out)};\n`);
};

(async () => {
  const only = process.argv[2];
  const ids = only ? [only] : fs.readdirSync(CITIES_DIR).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  for (const id of ids) {
    console.log(id);
    await buildCity(id);
  }
})().catch((e) => { console.error(e); process.exit(1); });
