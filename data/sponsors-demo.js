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
//   - assets/icons/sponsor-restaurant-icon.png, sponsor-cafe-icon.png y
//     sponsor-hotel-icon.svg (y los originales Restaurant_icon.jpg /
//     cafe_icon.jpg de los que salen, ver scratchpad/clean-sponsor-icons.js)
//   - assets/demo/carta-farolillos-falsos.pdf
//
// Campos opcionales por sponsor (ver renderSponsorDemoInsert/
// showSponsorDemoMenu/maybeSpeakSponsorDemoOutro en app.js):
//   - ctaLabel: texto del botón principal en la tarjeta Oro (por defecto
//     "Ver la carta" — los sponsors de hotel usan "Ver disponibilidad").
//   - audioLine: frase exacta para la mención por voz (audioMention:true);
//     sin este campo cae a la frase genérica de restaurante de siempre.
//
// IDIOMA (fix: la app es bilingüe ES/EN pero este archivo se escribió solo
// en español, así que en modo inglés se oía/leía español de golpe en medio
// de la interfaz). teaser/ctaLabel/audioLine y cada item/price de "menu"
// van ahora envueltos como { es, en } -- mismo patrón que pickLang usa para
// el resto del contenido (ver app.js) -- y se resuelven con pickLang() en
// vez de leerse tal cual. "name" se deja SIN envolver a propósito: son
// nombres propios (ficticios, pero nombres propios al fin), y esos no se
// traducen igual que "Hotel Gran Vía Central" no se traduce en una guía
// real en inglés.
// ============================================================
const SPONSORS_DEMO = [
  {
    id: 'demo-bronce-1',
    tier: 'bronce', // Radio 150 m · solo mención de texto en la ficha
    city: 'madrid',
    name: 'Cafetería El Alcázar Fantasma (DEMO — BORRAR)',
    teaser: {
      es: 'Cruasanes recién hechos a dos pasos del Palacio Real.',
      en: 'Freshly baked croissants just steps from the Royal Palace.'
    },
    coords: [40.4189, -3.7144], // ~100 m del Palacio Real
    radius: 150,
    icon: 'cafe'
  },
  {
    id: 'demo-plata-1',
    tier: 'plata', // Radio 300 m · mención + botón "Ver en el mapa"
    city: 'madrid',
    name: 'Bocatería La Osa Golosa (DEMO — BORRAR)',
    teaser: {
      es: 'Bocadillos de calamares a un paso de la Puerta del Sol.',
      en: 'Fried squid sandwiches just steps from Puerta del Sol.'
    },
    coords: [40.4169, -3.7014], // ~180 m de la Puerta del Sol
    radius: 300,
    icon: 'restaurant'
  },
  {
    id: 'demo-oro-1',
    tier: 'oro', // Radio 500 m · tarjeta con foto + pin permanente + mención por voz
    city: 'madrid',
    name: 'Churrería Los Farolillos Falsos (DEMO — BORRAR)',
    teaser: {
      es: 'Churros y chocolate a la sombra de la Plaza Mayor.',
      en: 'Churros and hot chocolate in the shade of Plaza Mayor.'
    },
    coords: [40.4142, -3.7082], // ~160 m de la Plaza Mayor
    radius: 500,
    icon: 'cafe',
    audioMention: true, // "plus": al terminar la audioguía, se menciona en voz
    audioLine: {
      es: 'Si quieres hacer una pausa para recuperar aliento y probar algo de la zona, cerca tienes Churrería Los Farolillos Falsos. Churros y chocolate a la sombra de la Plaza Mayor.',
      en: 'If you feel like a break to catch your breath and try something local, nearby you have Churrería Los Farolillos Falsos. Churros and hot chocolate in the shade of Plaza Mayor.'
    },
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
    teaser: {
      es: 'Chocolate con churros de toda la vida, junto a la Plaza Mayor.',
      en: 'Classic churros with hot chocolate, right by Plaza Mayor.'
    },
    coords: [40.4148, -3.7069], // también dentro de los 500 m de Plaza Mayor
    radius: 500,
    icon: 'cafe',
    // Sin audioMention: paga el mismo nivel Oro que demo-oro-1 pero no el
    // "plus" de la voz — así se nota la diferencia al alternar entre los dos.
    menu: [
      { item: { es: 'Chocolate con churros', en: 'Hot chocolate with churros' }, price: { es: '4,50 €', en: '€4.50' } },
      { item: { es: 'Tarta de chocolate (porción)', en: 'Chocolate cake (slice)' }, price: { es: '3,90 €', en: '€3.90' } },
      { item: { es: 'Melindros con chocolate', en: 'Ladyfingers with chocolate' }, price: { es: '4,20 €', en: '€4.20' } },
      { item: { es: 'Chocolate frío', en: 'Iced chocolate' }, price: { es: '3,00 €', en: '€3.00' } }
    ]
  },

  // ---- Hoteles (mismo modelo de 3 niveles, aplicado a otra categoría de
  // negocio para probar que el sistema no es específico de restauración) ----
  {
    id: 'demo-hotel-bronce-1',
    tier: 'bronce', // Radio 150 m · solo mención de texto en la ficha
    city: 'madrid',
    name: 'Hostal Prado Sereno (DEMO — BORRAR)',
    teaser: {
      es: 'Habitaciones sencillas y luminosas a un paso del Museo del Prado.',
      en: 'Simple, bright rooms just steps from the Prado Museum.'
    },
    coords: [40.4132, -3.6935], // ~90 m del Museo del Prado
    radius: 150,
    icon: 'hotel'
  },
  {
    id: 'demo-hotel-plata-1',
    tier: 'plata', // Radio 300 m · mención + botón "Ver en el mapa"
    city: 'madrid',
    name: 'Hotel Gran Vía Central (DEMO — BORRAR)',
    teaser: {
      es: 'Alojamiento boutique en pleno corazón de la Gran Vía.',
      en: 'Boutique accommodation right in the heart of Gran Vía.'
    },
    coords: [40.4198, -3.705], // ~100 m de Gran Vía
    radius: 300,
    icon: 'hotel',
    ctaLabel: { es: 'Ver disponibilidad', en: 'Check availability' }
  },
  {
    id: 'demo-hotel-oro-1',
    tier: 'oro', // Radio 500 m · tarjeta con foto + pin permanente + mención por voz
    city: 'madrid',
    name: 'Gran Hotel Cibeles Real (DEMO — BORRAR)',
    teaser: {
      es: 'Alojamiento de lujo junto a la Plaza de Cibeles, con desayuno incluido.',
      en: 'Luxury accommodation by Plaza de Cibeles, breakfast included.'
    },
    coords: [40.4183, -3.6928], // ~120 m de la Plaza de Cibeles
    radius: 500,
    icon: 'hotel',
    ctaLabel: { es: 'Ver disponibilidad', en: 'Check availability' },
    audioMention: true,
    audioLine: {
      es: 'Si prefieres alojarte por esta zona para seguir explorando mañana, cerca tienes el Gran Hotel Cibeles Real. Alojamiento de lujo junto a la Plaza de Cibeles, con desayuno incluido.',
      en: 'If you’d rather stay in this area to keep exploring tomorrow, nearby you have the Gran Hotel Cibeles Real. Luxury accommodation by Plaza de Cibeles, breakfast included.'
    },
    // Mismo formato item/precio que la carta de un restaurante, pero con
    // tipos de habitación en vez de platos — reutiliza tal cual el modal de
    // "carta" (ver showSponsorDemoMenu en app.js), sin necesidad de una
    // vista específica para hoteles.
    menu: [
      { item: { es: 'Habitación doble', en: 'Double room' }, price: { es: 'desde 129 €/noche', en: 'from €129/night' } },
      { item: { es: 'Habitación individual', en: 'Single room' }, price: { es: 'desde 89 €/noche', en: 'from €89/night' } },
      { item: { es: 'Suite con vistas a Cibeles', en: 'Suite with Cibeles views' }, price: { es: 'desde 219 €/noche', en: 'from €219/night' } }
    ]
  }
];
