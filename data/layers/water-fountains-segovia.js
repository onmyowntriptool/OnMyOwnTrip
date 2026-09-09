// Fuentes de agua potable -- Segovia (casco historico y alrededores).
// Capa independiente del array de POIs turisticos: se carga bajo demanda
// solo cuando el usuario activa el toggle de bebederos en el mapa (ver
// loadWaterFountains en app.js).
// Fuente: OpenStreetMap contributors (nodos amenity=drinking_water),
// consultado via Overpass API el 2026-09-09.
// Datos bajo licencia ODbL (https://www.openstreetmap.org/copyright).
// A diferencia de Madrid/Berlin (portal de datos abiertos municipal), no se
// encontro un dataset oficial equivalente para Segovia con el portal
// opendata.segovia.es inaccesible (502) en el momento de generar esta capa
// -- OSM es la fuente mas fiable disponible, mantenida activamente (varios
// nodos con check_date de 2026).
window.WATER_FOUNTAINS = window.WATER_FOUNTAINS || {};
WATER_FOUNTAINS.segovia = [
  {
    "id": "osm-853378134",
    "coords": [
      40.9522954,
      -4.1277389
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-853400649",
    "coords": [
      40.950157,
      -4.1239557
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-1820959746",
    "coords": [
      40.9543601,
      -4.1311439
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-2654959925",
    "coords": [
      40.9522121,
      -4.1314837
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-2980955248",
    "coords": [
      40.947508,
      -4.1186137
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-2980955249",
    "coords": [
      40.94535,
      -4.1206155
    ],
    "status": "operativa",
    "address": "Fuente San Millán"
  },
  {
    "id": "osm-2980963913",
    "coords": [
      40.9444646,
      -4.1206799
    ],
    "status": "operativa",
    "address": "Fuente Jardines San Roque"
  },
  {
    "id": "osm-2980963915",
    "coords": [
      40.9545889,
      -4.1207403
    ],
    "status": "operativa",
    "address": "Fuente Alameda 1"
  },
  {
    "id": "osm-2980963916",
    "coords": [
      40.9440127,
      -4.1239841
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-2980985008",
    "coords": [
      40.9561712,
      -4.1354749
    ],
    "status": "operativa",
    "address": "Fuente La Fuencisla 1"
  },
  {
    "id": "osm-2980985009",
    "coords": [
      40.95422,
      -4.1335636
    ],
    "status": "operativa",
    "address": "Fuente de San Marcos"
  },
  {
    "id": "osm-2980985010",
    "coords": [
      40.9474654,
      -4.109324
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-2980985011",
    "coords": [
      40.9455541,
      -4.1060675
    ],
    "status": "operativa",
    "address": "Fuente Potable Plaza de la Gimnástica Segoviana"
  },
  {
    "id": "osm-2980985014",
    "coords": [
      40.9497514,
      -4.1174742
    ],
    "status": "operativa",
    "address": "Fuente Potable Concepcionistas"
  },
  {
    "id": "osm-2980985015",
    "coords": [
      40.9499567,
      -4.1212403
    ],
    "status": "operativa",
    "address": "Fuente Potable Correos"
  },
  {
    "id": "osm-2985084551",
    "coords": [
      40.946784,
      -4.1120596
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-3006530971",
    "coords": [
      40.9494742,
      -4.1165289
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-3006530972",
    "coords": [
      40.9477492,
      -4.1125923
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-5553637217",
    "coords": [
      40.9506693,
      -4.1256202
    ],
    "status": "operativa",
    "address": "Fuente potable Catedral"
  },
  {
    "id": "osm-5590212321",
    "coords": [
      40.9509421,
      -4.1211061
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-5760836106",
    "coords": [
      40.9526414,
      -4.1237698
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-5762100865",
    "coords": [
      40.9489187,
      -4.123672
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-6724972291",
    "coords": [
      40.9540915,
      -4.1278495
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-8296498281",
    "coords": [
      40.9449663,
      -4.1164653
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-10775193332",
    "coords": [
      40.9487204,
      -4.1191016
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-11185716637",
    "coords": [
      40.9498364,
      -4.1275645
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-11185943737",
    "coords": [
      40.9532074,
      -4.1279535
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-11230817540",
    "coords": [
      40.9547898,
      -4.1249412
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-12100381107",
    "coords": [
      40.9506981,
      -4.1187391
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-12137265452",
    "coords": [
      40.9546684,
      -4.1303838
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-12352275440",
    "coords": [
      40.9482201,
      -4.1116009
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-12353682815",
    "coords": [
      40.9487105,
      -4.1251732
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-12650300286",
    "coords": [
      40.9485008,
      -4.1258247
    ],
    "status": "operativa",
    "address": "Fuente de la Cuesta de los Hoyos"
  },
  {
    "id": "osm-12911701096",
    "coords": [
      40.953841,
      -4.1131449
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  },
  {
    "id": "osm-13063140338",
    "coords": [
      40.9509545,
      -4.1274103
    ],
    "status": "operativa",
    "address": "Fuente de agua potable (casco histórico)"
  }
];
