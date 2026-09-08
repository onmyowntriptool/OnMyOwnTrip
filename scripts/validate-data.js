#!/usr/bin/env node
// ============================================================
// OnMyOwnTrip · Validador de integridad de data/
//
// Desde que data.js se partió en data/core.js (categorías, esqueleto de
// ciudades, prompts de IA) + data/cities/<id>.js (POIs, cargados bajo
// demanda por app.js), este script reconstruye el mismo CITIES completo
// concatenando core.js con todos los archivos de data/cities/ en un único
// script, y lo compila como si fuera un módulo con Module._compile — así
// no hay que tocar esos archivos ni mantener una copia duplicada.
//
// Uso:
//   node scripts/validate-data.js
//
// Sale con código 1 si hay errores (ids duplicados, coords fuera de los
// límites del mapa, falta adult/kids, essential.route inexistente...).
// Los avisos (warnings) no hacen fallar el script, solo se listan.
// ============================================================

const fs = require('fs');
const path = require('path');
const Module = require('module');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CORE_PATH = path.join(DATA_DIR, 'core.js');
const CITIES_DIR = path.join(DATA_DIR, 'cities');

function loadData() {
  const coreSrc = fs.readFileSync(CORE_PATH, 'utf8');
  const cityFiles = fs.readdirSync(CITIES_DIR).filter((f) => f.endsWith('.js'));
  const citiesSrc = cityFiles
    .map((f) => fs.readFileSync(path.join(CITIES_DIR, f), 'utf8'))
    .join('\n');
  const wrapped = `${coreSrc}\n${citiesSrc}\nmodule.exports = { CATEGORIES, CATEGORY_META, CITIES, AI_PROMPTS };`;
  const m = new Module(CORE_PATH);
  m.filename = CORE_PATH;
  m.paths = Module._nodeModulePaths(DATA_DIR);
  m._compile(wrapped, CORE_PATH);
  return m.exports;
}

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// Un valor {adult, kids} se considera completo si ambas claves tienen
// texto no vacío. `required` = false permite que falte del todo (algunos
// campos son opcionales), pero si existe, tiene que estar completo.
const dualComplete = (obj) => !!obj && typeof obj.adult === 'string' && obj.adult.trim() &&
  typeof obj.kids === 'string' && obj.kids.trim();

// Algunas ciudades (desde Vaticano, ver data/cities/vaticano.js) envuelven
// sus campos en { es: {adult,kids}, en: {adult,kids} } en vez del formato
// antiguo {adult,kids} directo. Si el campo trae ese envoltorio, exigimos
// que AMBOS idiomas estén completos; si no, se valida tal cual (formato
// antiguo, tratado como español-only).
const hasDual = (obj) => {
  if (!obj) return false;
  if (obj.es || obj.en) return dualComplete(obj.es) && dualComplete(obj.en);
  return dualComplete(obj);
};

const inBounds = (coords, bounds) => {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lat, lng] = coords;
  const [[latMin, lngMin], [latMax, lngMax]] = bounds;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
};

function validateCity(cityId, city) {
  const prefix = `[${cityId}]`;

  if (!city.bounds || !Array.isArray(city.bounds) || city.bounds.length !== 2) {
    err(`${prefix} bounds ausente o mal formado`);
    return;
  }
  if (!hasDual(city.subtitle)) err(`${prefix} subtitle incompleto (falta adult y/o kids)`);

  const routeIds = new Set((city.routes || []).map((r) => r.id));
  if (routeIds.size === 0) err(`${prefix} no tiene ninguna ruta en routes[]`);

  const seenIds = new Set();
  // essential.order debe ser único DENTRO de cada ruta (no globalmente:
  // dos rutas distintas pueden numerar sus paradas 1, 2, 3... cada una).
  const ordersByRoute = {};

  (city.pois || []).forEach((poi, idx) => {
    const poiLabel = `${prefix} pois[${idx}]${poi.id ? ` (${poi.id})` : ''}`;

    if (!poi.id) err(`${poiLabel}: sin id`);
    else if (seenIds.has(poi.id)) err(`${poiLabel}: id duplicado dentro de la ciudad`);
    else seenIds.add(poi.id);

    if (!hasDual(poi.name)) err(`${poiLabel}: name incompleto`);
    if (!hasDual(poi.subtitle)) err(`${poiLabel}: subtitle incompleto`);
    if (!poi.category) err(`${poiLabel}: sin category`);
    if (!poi.image || typeof poi.image !== 'string' || !/^(https?:\/\/|assets\/)/.test(poi.image)) {
      err(`${poiLabel}: image ausente, no es una URL http(s) ni una ruta local en assets/`);
    }
    if (!poi.audio || typeof poi.audio.duration !== 'number' || poi.audio.duration <= 0) {
      err(`${poiLabel}: audio.duration ausente o inválida`);
    }
    if (!poi.audio || !hasDual(poi.audio.title)) err(`${poiLabel}: audio.title incompleto`);

    if (!inBounds(poi.coords, city.bounds)) {
      err(`${poiLabel}: coords ${JSON.stringify(poi.coords)} fuera de los bounds de ${cityId}`);
    }

    ['history', 'legends', 'architecture'].forEach((tab) => {
      const t = poi.tabs && poi.tabs[tab];
      if (!hasDual(t)) err(`${poiLabel}: tabs.${tab} incompleto`);
    });

    if (poi.visitInfo) {
      if (!hasDual(poi.visitInfo.hours)) err(`${poiLabel}: visitInfo.hours incompleto`);
      if (!hasDual(poi.visitInfo.price)) err(`${poiLabel}: visitInfo.price incompleto`);
      if (poi.visitInfo.link && !/^https?:\/\//.test(poi.visitInfo.link)) {
        err(`${poiLabel}: visitInfo.link no es una URL http(s)`);
      }
    }

    if (poi.essential) {
      if (!routeIds.has(poi.essential.route)) {
        err(`${poiLabel}: essential.route "${poi.essential.route}" no existe en routes[]`);
      } else {
        const key = poi.essential.route;
        ordersByRoute[key] = ordersByRoute[key] || new Set();
        if (ordersByRoute[key].has(poi.essential.order)) {
          err(`${poiLabel}: essential.order ${poi.essential.order} duplicado en la ruta "${key}"`);
        }
        ordersByRoute[key].add(poi.essential.order);
      }
    }

    if (poi.quiz) {
      const validateQuizShape = (q, qLabel) => {
        if (!q.question || !q.question.trim()) err(`${qLabel}: sin question`);
        if (!Array.isArray(q.options) || q.options.length < 2) err(`${qLabel}: options debe tener al menos 2 opciones`);
        if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= (q.options || []).length) {
          err(`${qLabel}: correct (${q.correct}) no es un índice válido de options`);
        }
        if (!q.reveal || !q.reveal.trim()) err(`${qLabel}: sin reveal`);
      };
      Object.entries(poi.quiz).forEach(([topicId, q]) => {
        const qLabel = `${poiLabel} quiz.${topicId}`;
        // Igual que name/subtitle/tabs: puede venir envuelto en {es,en} (ver
        // data/cities/vaticano.js) o directo (formato antiguo).
        if (q.es || q.en) {
          if (q.es) validateQuizShape(q.es, `${qLabel}.es`); else err(`${qLabel}: falta es`);
          if (q.en) validateQuizShape(q.en, `${qLabel}.en`); else err(`${qLabel}: falta en`);
        } else {
          validateQuizShape(q, qLabel);
        }
      });
    }
  });

  // Aviso (no error): rutas declaradas en routes[] que ningún POI usa.
  routeIds.forEach((routeId) => {
    if (!ordersByRoute[routeId]) warn(`${prefix} ruta "${routeId}" declarada en routes[] pero sin ningún POI esencial`);
  });
}

function main() {
  const { CITIES } = loadData();
  Object.entries(CITIES).forEach(([cityId, city]) => {
    // "summary"/"deepen" en AI_PROMPTS no son ciudades: se filtran porque
    // no tienen forma de ciudad (sin pois[]/bounds).
    if (!city || !Array.isArray(city.pois)) return;
    validateCity(cityId, city);
  });

  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} aviso(s):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  if (errors.length) {
    console.log(`\n❌ ${errors.length} error(es):`);
    errors.forEach((e) => console.log(`  - ${e}`));
    console.log('');
    process.exit(1);
  }

  console.log(`\n✅ data/ válido (${Object.keys(CITIES).length} ciudades revisadas, ${warnings.length} avisos, 0 errores).`);
}

main();
