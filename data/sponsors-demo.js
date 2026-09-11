// ============================================================
// EXPERIMENTO TEMPORAL — PATROCINIOS DEMO
// (rama experimento-patrocinios-demo, NO fusionar a main)
//
// Datos 100% ficticios para probar los 3 niveles de cuota del
// ejercicio de monetización (Bronce/Plata/Oro) sobre POIs reales de
// Madrid. Los restaurantes llevan "(DEMO — BORRAR)" en el propio
// nombre a propósito, para que sea imposible confundirlos con un
// negocio real dentro de la app.
//
// Los dos "oro" compiten por la MISMA zona (Plaza Mayor) a propósito:
// sirve para probar la rotación entre patrocinadores cuando hay más de
// uno interesado en el mismo sitio (ver findNearbySponsorDemo en
// app.js) — solo demo-oro-1 lleva audioMention:true, para ver que el
// "plus" de la mención por voz es independiente del nivel/tarjeta.
//
// BORRAR antes de fusionar cualquier cosa de esta rama a main:
//   - este archivo
//   - el <script src="data/sponsors-demo.js..."> de index.html
//   - el bloque "PATROCINIOS DEMO" en app.js
//   - el bloque "patrocinios demo" en styles.css
//   - assets/icons/sponsor-restaurant-icon.png y sponsor-cafe-icon.png
//     (y los originales Restaurant_icon.jpg / cafe_icon.jpg de los que
//     salen, ver scratchpad/clean-sponsor-icons.js)
//   - assets/demo/carta-farolillos-falsos.pdf
// ============================================================
const SPONSORS_DEMO = [
  {
    id: 'demo-bronce-1',
    tier: 'bronce', // Radio 150 m · solo mención de texto en la ficha
    city: 'madrid',
    name: 'Cafetería El Alcázar Fantasma (DEMO — BORRAR)',
    teaser: 'Cruasanes recién hechos a dos pasos del Palacio Real.',
    coords: [40.4189, -3.7144], // ~100 m del Palacio Real
    radius: 150,
    icon: 'cafe'
  },
  {
    id: 'demo-plata-1',
    tier: 'plata', // Radio 300 m · mención + botón "Ver en el mapa"
    city: 'madrid',
    name: 'Bocatería La Osa Golosa (DEMO — BORRAR)',
    teaser: 'Bocadillos de calamares a un paso de la Puerta del Sol.',
    coords: [40.4169, -3.7014], // ~180 m de la Puerta del Sol
    radius: 300,
    icon: 'restaurant'
  },
  {
    id: 'demo-oro-1',
    tier: 'oro', // Radio 500 m · tarjeta con foto + pin permanente + mención por voz
    city: 'madrid',
    name: 'Churrería Los Farolillos Falsos (DEMO — BORRAR)',
    teaser: 'Churros y chocolate a la sombra de la Plaza Mayor.',
    coords: [40.4142, -3.7082], // ~160 m de la Plaza Mayor
    radius: 500,
    icon: 'cafe',
    audioMention: true, // "plus": al terminar la audioguía, se menciona en voz
    // El negocio entrega su propia carta en PDF (lo típico en la vida real)
    // en vez de que nosotros tecleemos los platos — se abre incrustada, sin
    // salir de la app (ver showSponsorDemoMenu en app.js). Generado con
    // scratchpad/make-demo-menu-pdf.js, ejercicio igual de ficticio que el
    // resto de este archivo.
    menuPdf: 'assets/demo/carta-farolillos-falsos.pdf'
  },
  {
    id: 'demo-oro-2',
    tier: 'oro', // Mismo radio/zona que demo-oro-1 a propósito (ver rotación)
    city: 'madrid',
    name: 'Chocolatería La Abuela Traviesa (DEMO — BORRAR)',
    teaser: 'Chocolate con churros de toda la vida, junto a la Plaza Mayor.',
    coords: [40.4148, -3.7069], // también dentro de los 500 m de Plaza Mayor
    radius: 500,
    icon: 'cafe',
    // Sin audioMention: paga el mismo nivel Oro que demo-oro-1 pero no el
    // "plus" de la voz — así se nota la diferencia al alternar entre los dos.
    menu: [
      { item: 'Chocolate con churros', price: '4,50 €' },
      { item: 'Tarta de chocolate (porción)', price: '3,90 €' },
      { item: 'Melindros con chocolate', price: '4,20 €' },
      { item: 'Chocolate frío', price: '3,00 €' }
    ]
  }
];
