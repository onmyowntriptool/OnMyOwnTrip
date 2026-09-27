// Fuentes de agua potable -- Alicante, en torno a las zonas de las rutas
// (solo fuentes a menos de 700 m de algún POI). Capa independiente del
// array de POIs turísticos: se carga bajo demanda solo cuando el usuario
// activa el toggle de bebederos en el mapa (ver loadWaterFountains en app.js).
// Fuente: OpenStreetMap contributors (nodos amenity=drinking_water, sin
// access=private/no/customers), consultado vía Overpass API el 2026-09-27.
// Datos bajo licencia ODbL (https://www.openstreetmap.org/copyright).
// El Ayuntamiento de Alicante no publica un dataset abierto de fuentes de
// agua potable, así que OSM es la fuente más fiable disponible.
window.WATER_FOUNTAINS = window.WATER_FOUNTAINS || {};
WATER_FOUNTAINS.alicante = [
  { id: 'osm-3198674146', coords: [38.3477541, -0.4826988], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-3756859323', coords: [38.3906683, -0.4426304], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-3756864121', coords: [38.3900712, -0.4434599], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-3756864146', coords: [38.3895136, -0.4431166], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-4148630943', coords: [38.3282382, -0.5107936], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-4148633938', coords: [38.3283729, -0.5160775], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-5098471721', coords: [38.3533828, -0.4822647], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-6512232578', coords: [38.3475589, -0.4824792], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-8549932868', coords: [38.3559017, -0.4938626], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-8843284685', coords: [38.345479, -0.4813183], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-12169391146', coords: [38.3651607, -0.4379109], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-12752151772', coords: [38.3414783, -0.4867641], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-12836579464', coords: [38.3499843, -0.4968491], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13013382178', coords: [38.341226, -0.497995], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13030093901', coords: [38.3464335, -0.4765819], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13031827801', coords: [38.3482506, -0.4788273], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13032146201', coords: [38.3477669, -0.4863125], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13071204171', coords: [38.3553299, -0.483648], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13071225857', coords: [38.3516309, -0.484982], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13074403537', coords: [38.3489453, -0.4770364], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13074887521', coords: [38.3468079, -0.4769453], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13282602468', coords: [38.3411276, -0.4898362], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13602711418', coords: [38.3455145, -0.4812374], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13602711419', coords: [38.3466358, -0.4818205], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13609756607', coords: [38.3437814, -0.4880495], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13707613289', coords: [38.3526704, -0.4909336], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13708291032', coords: [38.3214543, -0.5136122], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13708409000', coords: [38.3229052, -0.5134764], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13708437288', coords: [38.3237274, -0.5130294], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-13708437295', coords: [38.3207046, -0.5140503], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-14041616186', coords: [38.34652, -0.4801971], status: 'operativa', address: 'Fuente de agua potable' },
  { id: 'osm-14042073909', coords: [38.3467135, -0.4804297], status: 'operativa', address: 'Fuente de agua potable' },
];
