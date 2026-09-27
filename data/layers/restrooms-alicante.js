// Aseos públicos -- Alicante, en torno a las zonas de las rutas (solo aseos
// a menos de 700 m de algún POI). Capa independiente del array de POIs
// turísticos: se carga bajo demanda solo cuando el usuario activa el toggle
// de aseos en el mapa (ver loadRestrooms en app.js).
// Fuente: OpenStreetMap contributors (amenity=toilets con acceso público:
// access=yes o sin especificar; se excluyen access=private/permit/customers/no),
// consultado vía Overpass API el 2026-09-27. Datos bajo licencia ODbL
// (https://www.openstreetmap.org/copyright).
window.RESTROOMS = window.RESTROOMS || {};
RESTROOMS.alicante = [
  { id: 'osm-node-1527222296', coords: [38.3444911, -0.4959792], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: null },
  { id: 'osm-node-1691989399', coords: [38.3391932, -0.4811541], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-3790084031', coords: [38.3482837, -0.4793622], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: null },
  { id: 'osm-node-3790087497', coords: [38.3489859, -0.4771192], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
  { id: 'osm-node-4747820241', coords: [38.3219877, -0.5132623], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-5340988830', coords: [38.3488863, -0.477243], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-6533656929', coords: [38.3463954, -0.4766156], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-6533999256', coords: [38.3474765, -0.475188], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-12241243609', coords: [38.3477015, -0.4850363], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'no', precio: 0 },
  { id: 'osm-node-13031850601', coords: [38.3494396, -0.4779414], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13265517269', coords: [38.3588742, -0.4850218], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13274330532', coords: [38.3438927, -0.4896259], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13306603140', coords: [38.3541217, -0.4720132], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13355188888', coords: [38.3483957, -0.4864665], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13420573407', coords: [38.363264, -0.4437991], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13462295650', coords: [38.3541892, -0.4718675], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13481581669', coords: [38.3484436, -0.4861549], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13607992055', coords: [38.3429579, -0.4794867], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13607992056', coords: [38.3437292, -0.4801683], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: null, precio: 0 },
  { id: 'osm-node-13608033205', coords: [38.3488105, -0.4793912], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'no', precio: 0 },
  { id: 'osm-node-13608034121', coords: [38.3374179, -0.491294], status: 'operativa', address: 'Aseo público', tipo: 'wc', accesible: 'si', precio: 0 },
];
