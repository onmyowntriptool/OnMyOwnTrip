// ============================================================
// OnMyOwnTrip · Migración de dominio (github.io -> onmyowntrip.com)
//
// El progreso, la clave de acceso y el resto de datos de la web viven en
// localStorage, que el navegador ata al ORIGEN (dominio). Al pasar de
// onmyowntriptool.github.io a onmyowntrip.com, sin esto cada usuario web
// empezaría de cero y tendría que volver a meter su clave.
//
// Cómo funciona (carga síncrona, lo PRIMERO del <head>, antes que app.js):
//  - En el dominio viejo: recoge todas las claves "omot_*" de localStorage
//    y redirige a la misma página en el dominio nuevo, con esos datos en el
//    #fragmento de la URL. El fragmento nunca se envía a ningún servidor
//    (ni a GitHub ni a Cloudflare), solo lo lee el navegador.
//  - En el dominio nuevo: si llega ese fragmento, copia cada clave SOLO si
//    no existe ya (nunca pisa datos más recientes del dominio nuevo) y
//    borra el fragmento de la barra de direcciones.
//
// Solo funciona si el dominio viejo sigue sirviendo esta web (dominio nuevo
// alojado aparte, p. ej. Cloudflare Pages). Si se usara el dominio propio
// de GitHub Pages, GitHub redirige solo antes de que corra ningún JS y esto
// se queda inerte (no rompe nada, pero tampoco migra).
//
// En la app nativa (origen localhost) no hace nada.
// ============================================================
(function () {
  var OLD_HOST = 'onmyowntriptool.github.io';
  var OLD_BASE = '/OnMyOwnTrip';
  var NEW_ORIGIN = 'https://onmyowntrip.com';
  var HASH_PREFIX = '#omot-migrate=';
  var KEY_PREFIX = 'omot_';

  try {
    if (location.hostname === OLD_HOST) {
      var data = {};
      var count = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(KEY_PREFIX) === 0) {
            data[k] = localStorage.getItem(k);
            count++;
          }
        }
      } catch (_) { /* sin acceso a localStorage: se redirige sin datos */ }

      var path = location.pathname;
      if (path.indexOf(OLD_BASE) === 0) path = path.slice(OLD_BASE.length);
      if (!path) path = '/';

      var target = NEW_ORIGIN + path + location.search;
      if (count) target += HASH_PREFIX + encodeURIComponent(JSON.stringify(data));
      else if (location.hash) target += location.hash;

      // Evita que el resto de la página (app.js, etc.) llegue a pintarse
      // durante el instante que tarda la redirección.
      document.documentElement.style.display = 'none';
      location.replace(target);
      return;
    }

    if (location.hash.indexOf(HASH_PREFIX) === 0) {
      try {
        var payload = JSON.parse(decodeURIComponent(location.hash.slice(HASH_PREFIX.length)));
        if (payload && typeof payload === 'object') {
          Object.keys(payload).forEach(function (key) {
            var val = payload[key];
            if (key.indexOf(KEY_PREFIX) !== 0 || typeof val !== 'string') return;
            if (localStorage.getItem(key) === null) localStorage.setItem(key, val);
          });
        }
      } finally {
        // Aunque los datos lleguen dañados, que no se quede el fragmento
        // (largo y feo) en la barra ni en un posible marcador.
        history.replaceState(null, '', location.pathname + location.search);
      }
    }
  } catch (_) {
    // Nunca debe impedir que la app arranque: en el peor caso el usuario
    // empieza de cero en el dominio nuevo, igual que sin este script.
  }
})();
