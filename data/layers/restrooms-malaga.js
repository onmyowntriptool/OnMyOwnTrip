// Aseos públicos -- Málaga, en torno a las zonas de las rutas (solo aseos a
// menos de 700 m de algún POI). Capa independiente del array de POIs
// turísticos: se carga bajo demanda solo cuando el usuario activa el toggle de
// aseos en el mapa (ver loadRestrooms en app.js).
// Fuente: OpenStreetMap contributors (amenity=toilets con acceso público:
// access=yes o sin especificar; se excluyen access=private/permit/customers/no),
// consultado vía Overpass API el 2026-09-26. Datos bajo licencia ODbL
// (https://www.openstreetmap.org/copyright). El portal de datos abiertos del
// Ayuntamiento no publica un dataset de aseos públicos.
window.RESTROOMS = window.RESTROOMS || {};
RESTROOMS.malaga = [
  { id: 'osm-node-2322366711', coords: [36.7151813, -4.4142828], status: 'operativa', address: 'Aseo público (Muelle uno)', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-2334235702', coords: [36.7182902, -4.4239162], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-4620269189', coords: [36.7198078, -4.4169607], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-4620610689', coords: [36.7232295, -4.4113973], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'no', precio: 0 },
  { id: 'osm-node-4876412504', coords: [36.7212141, -4.400379], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-4893702099', coords: [36.720578, -4.4022044], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-5578645757', coords: [36.7182362, -4.4299341], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-5578650855', coords: [36.718456, -4.4209052], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-5645588179', coords: [36.7120488, -4.4331597], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-10271585614', coords: [36.7187093, -4.4129476], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-11085694206', coords: [36.7180206, -4.4174915], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-11188865049', coords: [36.7228549, -4.4167897], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-11254996762', coords: [36.7212496, -4.400238], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-12062658007', coords: [36.7081667, -4.4140488], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-12758313106', coords: [36.720743, -4.4128638], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-13055810752', coords: [36.7171104, -4.4287214], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13174939044', coords: [36.7121293, -4.4336355], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13205154911', coords: [36.7117104, -4.432906], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-13205154912', coords: [36.7115193, -4.4315113], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: null },
  { id: 'osm-node-13307987916', coords: [36.7216321, -4.4170929], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13326562701', coords: [36.7187345, -4.413329], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13348495752', coords: [36.7185956, -4.4285955], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13348495758', coords: [36.7183955, -4.4288937], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-14110773059', coords: [36.7185448, -4.424293], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'no', precio: 0 },
  { id: 'osm-node-14110804707', coords: [36.718643, -4.4241046], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'no', precio: 0 },
  { id: 'osm-node-14178191101', coords: [36.7167277, -4.4111336], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-14219226301', coords: [36.7187959, -4.4297544], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-way-68349670', coords: [36.7640334, -4.4258546], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-way-192552393', coords: [36.7025679, -4.4331891], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-way-516757050', coords: [36.7182982, -4.4086055], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-way-837585794', coords: [36.7214401, -4.3867355], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'no', precio: 0 },
  { id: 'osm-way-1059959115', coords: [36.715707, -4.4120667], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-way-1212180313', coords: [36.7190596, -4.4187543], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-way-1218469555', coords: [36.695165, -4.4390127], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
];
