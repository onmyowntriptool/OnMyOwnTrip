// Aseos publicos -- Estambul: peninsula historica, Galata/Beyoglu y
// orillas del Bosforo (incluye banos de abluciones de mezquitas etiquetados
// como de acceso publico en OSM). Capa independiente del array de POIs
// turisticos: se carga bajo demanda solo cuando el usuario activa el toggle
// de aseos en el mapa (ver loadRestrooms en app.js).
// Fuente: OpenStreetMap contributors (nodos amenity=toilets con acceso
// publico: access=yes o sin especificar; se excluyen access=private/
// permit/customers/no), consultado via Overpass API el 2026-09-09.
// Datos bajo licencia ODbL (https://www.openstreetmap.org/copyright).
window.RESTROOMS = window.RESTROOMS || {};
RESTROOMS.estambul = [
  {
    "id": "osm-581990854",
    "coords": [
      41.0528819,
      29.0341713
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-621411715",
    "coords": [
      41.0508044,
      29.0167568
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-621412000",
    "coords": [
      41.0480697,
      29.0136587
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-656087303",
    "coords": [
      41.0313425,
      28.9821249
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-662928881",
    "coords": [
      41.0076307,
      28.9775787
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-1455438414",
    "coords": [
      41.0151234,
      28.9647872
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-1762092191",
    "coords": [
      41.0090338,
      28.9792764
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-1762097195",
    "coords": [
      41.0115221,
      28.9786014
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-1915390155",
    "coords": [
      41.0285403,
      28.9736893
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-2336601895",
    "coords": [
      41.039139,
      28.9874832
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-2674509788",
    "coords": [
      41.0123384,
      28.9847118
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-2683025320",
    "coords": [
      41.0107431,
      28.9674734
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-2769187009",
    "coords": [
      41.0068636,
      28.975835
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-2769191419",
    "coords": [
      41.0381599,
      28.98383
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-2889686728",
    "coords": [
      40.9923035,
      29.0328151
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-3044788498",
    "coords": [
      41.002274,
      28.9560686
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-3107414920",
    "coords": [
      41.0151196,
      28.9648617
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-3217042756",
    "coords": [
      41.041527,
      29.0389235
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-3425182518",
    "coords": [
      41.0111235,
      28.9837555
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-3458733929",
    "coords": [
      41.0219306,
      28.9745453
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-3499094099",
    "coords": [
      41.0299088,
      28.9364603
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-3499295325",
    "coords": [
      41.0146923,
      28.9763856
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-3725196697",
    "coords": [
      40.986283,
      29.020854
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-3970935649",
    "coords": [
      41.0121519,
      29.014123
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-4031869600",
    "coords": [
      41.0607259,
      28.9477203
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-4266750500",
    "coords": [
      41.0258085,
      29.0114019
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-4273352250",
    "coords": [
      41.0277805,
      29.0691513
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-4442702733",
    "coords": [
      41.0324027,
      29.0267834
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-4472318419",
    "coords": [
      41.0139186,
      28.9763317
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-4488685689",
    "coords": [
      41.044781,
      28.9924887
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-5087416398",
    "coords": [
      41.0475142,
      29.0062379
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-5100117321",
    "coords": [
      41.0056905,
      28.9785108
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-5104610626",
    "coords": [
      41.0425273,
      28.9896462
    ],
    "status": "operativa",
    "address": "out of order for a long while",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-5113609938",
    "coords": [
      41.0295633,
      28.9366175
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-5113620679",
    "coords": [
      41.0072797,
      28.9790215
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-5245312931",
    "coords": [
      41.0037299,
      29.0213819
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-5291789321",
    "coords": [
      40.9909992,
      29.0230905
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-5478145623",
    "coords": [
      41.0129421,
      28.9788756
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-5482981325",
    "coords": [
      41.01593,
      28.9678039
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-5484712921",
    "coords": [
      41.0228637,
      28.975284
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-5488580121",
    "coords": [
      41.014862,
      28.9529157
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-5489353024",
    "coords": [
      41.0180824,
      28.9687939
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-5630876621",
    "coords": [
      40.9936344,
      29.0244844
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-5663541617",
    "coords": [
      41.0181739,
      28.9718542
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-5663545066",
    "coords": [
      41.0092683,
      28.9797883
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6325275991",
    "coords": [
      41.0050425,
      28.9702111
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6364378288",
    "coords": [
      41.0190505,
      28.968547
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6394103485",
    "coords": [
      41.0278749,
      29.0166182
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6394103785",
    "coords": [
      41.0231468,
      29.0072112
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6449207587",
    "coords": [
      41.0265554,
      28.972875
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-6457294386",
    "coords": [
      41.0137166,
      28.9759494
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6464014887",
    "coords": [
      41.0154237,
      28.970597
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6731343767",
    "coords": [
      41.0291153,
      29.0698508
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-6731346359",
    "coords": [
      41.0271028,
      29.0701783
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6744432585",
    "coords": [
      41.0274773,
      28.9834029
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6781177422",
    "coords": [
      41.0181496,
      29.0653878
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6828668385",
    "coords": [
      41.000907,
      28.9485006
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-6939034086",
    "coords": [
      41.0197461,
      28.9489727
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-7143458985",
    "coords": [
      41.02256,
      29.0637756
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-7247672388",
    "coords": [
      41.00524,
      28.9760196
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-7794400285",
    "coords": [
      41.0120265,
      28.9703311
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-7931463886",
    "coords": [
      41.0262581,
      28.9808903
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-7931464185",
    "coords": [
      41.040767,
      29.0017386
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-7963856190",
    "coords": [
      41.0365342,
      28.984171
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-7965878586",
    "coords": [
      41.0152022,
      28.9768759
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-8071755852",
    "coords": [
      41.0121216,
      28.9308477
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 1.5
  },
  {
    "id": "osm-8071775993",
    "coords": [
      41.013518,
      28.9701459
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-8626698219",
    "coords": [
      41.0170969,
      28.9639222
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-8626698617",
    "coords": [
      41.0131282,
      28.9599794
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-8636465617",
    "coords": [
      41.0186491,
      28.9658515
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-8636465717",
    "coords": [
      41.0178207,
      28.9675915
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-8699129773",
    "coords": [
      41.0147199,
      28.9775907
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-8699197213",
    "coords": [
      41.0039999,
      28.9749795
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-8702469384",
    "coords": [
      41.0052298,
      28.9657007
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-8702469385",
    "coords": [
      41.0073159,
      28.9656293
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-8824386017",
    "coords": [
      41.0473122,
      28.9364558
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9263162917",
    "coords": [
      40.9893179,
      29.0248776
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9348513417",
    "coords": [
      41.0123279,
      28.981784
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9392435517",
    "coords": [
      41.0279622,
      28.9855425
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9480617764",
    "coords": [
      41.0878687,
      28.9443268
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-9563552346",
    "coords": [
      41.0439593,
      28.9934502
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-9685132928",
    "coords": [
      41.0123131,
      28.9676074
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-9719094456",
    "coords": [
      41.0659144,
      29.0120853
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9719094458",
    "coords": [
      41.0663059,
      29.0141371
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9789503811",
    "coords": [
      41.0366646,
      28.9949652
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9868455217",
    "coords": [
      41.0144535,
      28.98236
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-9974086830",
    "coords": [
      41.040685,
      29.0028516
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-9979642018",
    "coords": [
      41.0567044,
      28.9414255
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-10033016264",
    "coords": [
      41.0336997,
      29.0699738
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-10086919271",
    "coords": [
      41.0088388,
      28.9682359
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10123424393",
    "coords": [
      41.0186472,
      28.9212313
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10154825517",
    "coords": [
      41.0224205,
      28.9714928
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 10
  },
  {
    "id": "osm-10228019990",
    "coords": [
      41.0594331,
      29.0362122
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10282239456",
    "coords": [
      41.0253646,
      29.012757
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-10282239457",
    "coords": [
      41.0283082,
      29.0284599
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-10282239459",
    "coords": [
      41.0214863,
      29.0371916
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-10282239460",
    "coords": [
      41.0218039,
      29.0476027
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-10289654439",
    "coords": [
      41.0271988,
      28.951491
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10308918710",
    "coords": [
      41.0201616,
      29.0669635
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10735126007",
    "coords": [
      41.0768325,
      29.0437249
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10743530006",
    "coords": [
      41.0235317,
      28.9601191
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10743534005",
    "coords": [
      41.0319004,
      28.9483766
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10799787871",
    "coords": [
      41.0536556,
      28.933363
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10886747643",
    "coords": [
      41.0841185,
      29.0565315
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-10886748165",
    "coords": [
      41.0472731,
      29.0152637
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-10892587000",
    "coords": [
      41.0458582,
      29.0182064
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11112880756",
    "coords": [
      41.0193288,
      29.0635945
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11113277788",
    "coords": [
      41.0263753,
      28.9747783
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 4
  },
  {
    "id": "osm-11117834230",
    "coords": [
      41.0387799,
      28.9973768
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11236559463",
    "coords": [
      41.0377623,
      28.996944
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11330042302",
    "coords": [
      41.0334695,
      28.9779693
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-11330044040",
    "coords": [
      41.0297328,
      28.9785954
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11363528864",
    "coords": [
      41.0001817,
      28.9450346
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11520099261",
    "coords": [
      41.0207294,
      29.0452233
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11520134172",
    "coords": [
      41.0171668,
      29.0509951
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11520134176",
    "coords": [
      41.0271824,
      29.0401977
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-11521702182",
    "coords": [
      41.0270521,
      29.0323809
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11521738404",
    "coords": [
      41.0231271,
      29.0342952
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11521917351",
    "coords": [
      41.0249595,
      29.0145106
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-11521917354",
    "coords": [
      41.026539,
      29.0159171
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11521917363",
    "coords": [
      41.0254046,
      29.0178389
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11521945473",
    "coords": [
      41.0191572,
      29.0237299
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11775710259",
    "coords": [
      41.0049286,
      28.9820327
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11775710260",
    "coords": [
      41.0034197,
      28.9620698
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11812527479",
    "coords": [
      41.0180259,
      28.9693395
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11914942842",
    "coords": [
      41.0245932,
      28.9711585
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11985366402",
    "coords": [
      41.0694216,
      28.9241929
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-11985689828",
    "coords": [
      41.0703262,
      28.9204008
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12092654169",
    "coords": [
      40.9914603,
      28.9270391
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12102295183",
    "coords": [
      41.0120058,
      28.9671
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-12102845899",
    "coords": [
      41.002972,
      28.9719573
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12145210202",
    "coords": [
      41.0876732,
      28.9467757
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12192283564",
    "coords": [
      40.9959472,
      29.0421336
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12299572855",
    "coords": [
      41.0165948,
      28.9845287
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 3
  },
  {
    "id": "osm-12347942488",
    "coords": [
      41.0004267,
      28.9185521
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12356494881",
    "coords": [
      41.0307499,
      28.9391986
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0.5
  },
  {
    "id": "osm-12356558196",
    "coords": [
      41.0341765,
      28.9405159
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12369158189",
    "coords": [
      41.030123,
      28.9759019
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12379068152",
    "coords": [
      41.0240306,
      29.0183209
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12446888434",
    "coords": [
      41.0490006,
      29.0093423
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-12465161628",
    "coords": [
      41.0107227,
      29.0097862
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12512834709",
    "coords": [
      41.0227783,
      28.9765324
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-12725504137",
    "coords": [
      41.0067321,
      28.9756802
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-12729151863",
    "coords": [
      41.0190868,
      28.9685404
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12730749151",
    "coords": [
      41.0144422,
      28.9823151
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  },
  {
    "id": "osm-12791581976",
    "coords": [
      41.0148621,
      29.0114246
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-12915967843",
    "coords": [
      41.0801033,
      28.9282616
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13123455010",
    "coords": [
      41.004708,
      28.9518418
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13186922871",
    "coords": [
      41.0099749,
      28.9700747
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13256089268",
    "coords": [
      41.025937,
      28.9719309
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13326664501",
    "coords": [
      41.0126941,
      28.9660095
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13431435324",
    "coords": [
      41.0049109,
      28.9765362
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13477910385",
    "coords": [
      41.0109607,
      28.9485501
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13731814422",
    "coords": [
      41.007084,
      28.9537931
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-13817991210",
    "coords": [
      41.0728408,
      29.0721431
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 0
  },
  {
    "id": "osm-13891450151",
    "coords": [
      41.097256,
      29.0525956
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-13926156490",
    "coords": [
      41.0103032,
      28.9558033
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-14028784221",
    "coords": [
      41.0209436,
      28.9275271
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-14028784226",
    "coords": [
      41.0203594,
      28.920526
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-14059031368",
    "coords": [
      41.0414972,
      29.0086115
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 5
  },
  {
    "id": "osm-14059308504",
    "coords": [
      41.04762,
      29.0268842
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-14064670053",
    "coords": [
      41.0079035,
      28.9590858
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-14064670054",
    "coords": [
      41.0079562,
      28.9590875
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "no",
    "precio": 0
  },
  {
    "id": "osm-14081680130",
    "coords": [
      40.9980744,
      29.0604796
    ],
    "status": "operativa",
    "address": "Aseo público",
    "tipo": "wc",
    "accesible": "si",
    "precio": 5
  }
];
