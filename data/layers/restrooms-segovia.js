// Aseos publicos -- Segovia (casco historico y alrededores). Capa
// independiente del array de POIs turisticos: se carga bajo demanda solo
// cuando el usuario activa el toggle de aseos en el mapa (ver loadRestrooms
// en app.js).
// Fuente: OpenStreetMap contributors (nodos amenity=toilets con acceso
// publico: access=yes o sin especificar; se excluyen access=private/
// permit/customers/no), consultado via Overpass API el 2026-09-09.
// Datos bajo licencia ODbL (https://www.openstreetmap.org/copyright).
// Mismo motivo que water-fountains-segovia.js: sin dataset oficial
// municipal accesible en el momento de generar esta capa.
window.RESTROOMS = window.RESTROOMS || {};
RESTROOMS.segovia = [
  {
    "id": "osm-9496793519",
    "coords": [
      40.9566037,
      -4.1355848
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-11018109507",
    "coords": [
      40.9472059,
      -4.1089269
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11628398585",
    "coords": [
      40.9447759,
      -4.1220768
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0.5
  },
  {
    "id": "osm-11628398589",
    "coords": [
      40.9446136,
      -4.122532
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13014236638",
    "coords": [
      40.9500871,
      -4.124636
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13014254382",
    "coords": [
      40.9525001,
      -4.132073
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0.5
  },
  {
    "id": "osm-13093298866",
    "coords": [
      40.9494489,
      -4.1164825
    ],
    "status": "operativa",
    "address": "Aseo público (casco histórico)",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  }
];
