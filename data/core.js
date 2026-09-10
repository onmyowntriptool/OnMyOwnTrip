// ============================================================
// OnMyOwnTrip · Núcleo de datos (siempre cargado)
//
// Contiene todo lo que la app necesita ANTES de que el usuario elija
// ciudad: categorías, prompts de IA, y un "esqueleto" de cada ciudad
// (metadatos + rutas, pero SIN pois[]) para poder mostrar el selector
// de ciudades y calcular "la ciudad más cercana" por geolocalización
// sin tener que descargar el contenido completo de las 4 ciudades.
//
// El contenido real de cada ciudad (pois[]) vive en su propio archivo,
// en data/cities/<id>.js, y se carga bajo demanda (ver loadCityData en
// app.js) solo cuando el usuario elige esa ciudad — así no se descargan
// de golpe las ~130 paradas de las 4 ciudades en cada visita.
// ============================================================

const CATEGORIES = {
  ALL: 'all',
  HISTORY: 'historia',
  GASTRONOMY: 'gastronomia',
  HIDDEN: 'rincones-ocultos'
};

const CATEGORY_META = {
  [CATEGORIES.HISTORY]: {
    label: {
      es: { adult: 'Museos', kids: 'Lugares Épicos 🏰' },
      en: { adult: 'Museums', kids: 'Epic Places 🏰' }
    },
    pin: 'history',
    accent: '#B8411E'
  },
  [CATEGORIES.GASTRONOMY]: {
    label: {
      es: { adult: 'Restauración', kids: '¡Comidas Ricas! 🍖' },
      en: { adult: 'Food & Drink', kids: 'Yummy Food! 🍖' }
    },
    pin: 'gastronomy',
    accent: '#C8703A'
  },
  [CATEGORIES.HIDDEN]: {
    label: {
      es: { adult: 'Puntos de interés', kids: 'Secretos ⭐' },
      en: { adult: 'Interest', kids: 'Secrets ⭐' }
    },
    pin: 'hidden',
    accent: '#4A90A4'
  }
};

// ============================================================
// CIUDADES (esqueleto): cada una con su propio centro/zoom/límites de
// mapa y sus rutas, pero pois[] se rellena luego desde
// data/cities/<id>.js. STATE.cityId (en app.js) decide cuál se carga.
// ============================================================
const CITIES = {
  toledo: {
    id: 'toledo',
    name: 'Toledo',
    country: 'España',
    continent: 'Europa',
    subtitle: { adult: 'Ciudad Imperial', kids: '¡Ciudad de Castillos! 🏰' },
    // Bienvenida corta que se muestra una vez, la primera vez que se entra
    // en esta ciudad (ver maybeShowCityIntro en app.js) — no confundir con
    // "subtitle" (etiqueta breve) ni con tabs.history de cada POI.
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Toledo, la Ciudad de las Tres Culturas. Aquí vivieron juntos musulmanes, cristianos y judíos, y todavía se nota en cada calle. En este paseo verás su Alcázar, su Catedral y rincones que apenas han cambiado en siglos. Toledo te espera: ven a descubrirla.',
        kids: '¡Bienvenido a Toledo, la ciudad construida sobre una roca gigante! Aquí vivieron juntos musulmanes, cristianos y judíos hace cientos de años. Vas a ver un castillo enorme, una catedral preciosa y calles que parecen de cuento. ¡Prepárate para la aventura!'
      },
      en: {
        adult: "Welcome to Toledo, the City of the Three Cultures. Muslims, Christians, and Jews once lived here side by side, and you can still feel it on every street. On this walk you'll see its Alcázar, its Cathedral, and corners that have barely changed in centuries. Toledo is waiting: come and discover it.",
        kids: "Welcome to Toledo, the city built on a giant rock! Muslims, Christians, and Jews all lived here together hundreds of years ago. You'll see a huge castle, a beautiful cathedral, and streets that look like they're out of a storybook. Get ready for adventure!"
      }
    },
    // Insignia de ciudad (modo niño, ver STATE.game.cityBadges en app.js):
    // se gana al llegar a esta cantidad de estrellas SOLO con quizzes de
    // Toledo. Puesto en ~50% del máximo real de la ciudad (48 POIs con
    // quiz × 10 puntos = 1440 posibles), para que haga falta explorar a
    // fondo sin exigir el 100%.
    badgeThreshold: 720,
    badgeImg: 'assets/badges/toledo.png',
    // EXPERIMENTO (rama experimento-diseno-editorial): foto de fondo del
    // modal de bienvenida (ver maybeShowCityIntro en app.js) -- curada a
    // mano por ciudad (el punto de la ruta con menor "order" no siempre es
    // el más fotogénico ni representativo, ver Peñíscola/Playa Norte vs.
    // su castillo). Reutiliza la imagen de un POI ya existente.
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/FP_Toledo_Alcazar_2025_-_Views.jpg/330px-FP_Toledo_Alcazar_2025_-_Views.jpg',
    center: [39.8628, -4.0273],
    zoom: 15.2,
    minZoom: 13,
    bounds: [[39.845, -4.05], [39.878, -4.00]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'Esta es la ruta imprescindible de Toledo: siete paradas que resumen casi 2.000 años de historia en poco más de dos kilómetros a pie. Entrarás por la monumental Puerta de Bisagra, cruzarás la Plaza de Zocodover, subirás hasta el Alcázar y visitarás la Catedral Primada, la Iglesia de Santo Tomé y la Sinagoga del Tránsito, antes de terminar con las mejores vistas de la ciudad desde el Mirador del Valle. Al acabar entenderás por qué Toledo se llama la Ciudad de las Tres Culturas: aquí conviven, a pocos metros unas de otras, la huella musulmana, cristiana y judía. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Prepárate para la aventura más importante de Toledo! 🏰 Vas a pasar por una puerta gigante de hace más de 1.000 años, un castillo enorme, una catedral con vitrales de colores, una iglesia con un cuadro gigante y una sinagoga con madera traída desde muy lejos. ¡Y terminarás en un mirador con las mejores vistas de toda la ciudad! Al final sabrás por qué a Toledo la llaman la ciudad de las tres culturas. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This is Toledo's essential route: seven stops that sum up nearly 2,000 years of history in just over two kilometres on foot. You'll enter through the monumental Puerta de Bisagra, cross Plaza de Zocodover, climb up to the Alcázar, and visit the Primate Cathedral, the Church of Santo Tomé, and the Synagogue of El Tránsito, before finishing with the city's best views from the Mirador del Valle. By the end you'll understand why Toledo is called the City of the Three Cultures: within a few metres of each other, the Muslim, Christian, and Jewish legacies still live side by side. Tap each stop on the map to see the specific information for that spot.",
            kids: "Get ready for Toledo's biggest adventure! 🏰 You'll pass through a giant gate that's over 1,000 years old, a huge castle, a cathedral with colourful stained glass, a church with a giant painting, and a synagogue with wood brought from far away. And you'll finish at a lookout with the best views of the whole city! By the end you'll know why Toledo is called the city of the three cultures. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'juderia',
        name: {
          es: { adult: 'Judería y Rincones Ocultos', kids: '¡El Barrio Secreto! 🕵️' },
          en: { adult: 'Jewish Quarter & Hidden Corners', kids: 'The Secret Neighbourhood! 🕵️' }
        },
        color: '#8B5CF6',
        intro: {
          es: {
            adult: 'Esta ruta te lleva por el antiguo barrio judío de Toledo y algunos de sus rincones más escondidos. Empezarás en la Sinagoga de Santa María la Blanca, seguirás hasta el Palacio de Fuensalida y la Casa-Museo de El Greco, pasarás por el estrecho Callejón del Pozo Amargo —escenario de una leyenda de amor imposible— y terminarás en dos joyas casi secretas: la Mezquita de las Tornerías, escondida en un edificio comercial, y la Mezquita del Cristo de la Luz. Al terminar habrás visto cómo la Toledo medieval dejó su huella en calles que apenas han cambiado en 800 años. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta es un poco secreta! 🕵️ Vas a caminar por el antiguo barrio judío de Toledo, con calles tan estrechas que casi puedes tocar las dos paredes a la vez. Verás una sinagoga preciosa, la casa donde vivió un pintor muy famoso, un callejón con una leyenda de amor triste, ¡y hasta una mezquita escondida dentro de una tienda! Al terminar sabrás encontrar secretos que casi nadie más conoce en Toledo. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route takes you through Toledo's old Jewish quarter and some of its most hidden corners. You'll start at the Synagogue of Santa María la Blanca, continue to the Palacio de Fuensalida and the El Greco House-Museum, pass through the narrow Callejón del Pozo Amargo — the setting for a legend of impossible love — and finish at two almost-secret gems: the Mezquita de las Tornerías, tucked inside a commercial building, and the Mezquita del Cristo de la Luz. By the end you'll have seen how medieval Toledo left its mark on streets that have barely changed in 800 years. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route is a little bit secret! 🕵️ You'll walk through Toledo's old Jewish quarter, with streets so narrow you can almost touch both walls at once. You'll see a beautiful synagogue, the house where a very famous painter lived, an alley with a sad love legend, and even a mosque hidden inside a shop! By the end you'll know how to find secrets almost nobody else knows about in Toledo. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'conventos',
        name: {
          es: { adult: 'Conventos y Monasterios Escondidos', kids: '¡El Barrio de las Monjas y los Frailes! 🙏' },
          en: { adult: 'Hidden Convents & Monasteries', kids: 'The Nuns & Friars Neighbourhood! 🙏' }
        },
        color: '#10B981',
        intro: {
          es: {
            adult: 'Un recorrido tranquilo por los conventos y monasterios que todavía laten en el corazón de Toledo. Empieza en el imponente Monasterio de San Juan de los Reyes, sigue por el Convento de Santo Domingo el Antiguo y el de San Clemente, pasa por la Iglesia de San Pedro Mártir y el Monasterio de la Madre de Dios, y termina en el Convento de las Comendadoras de Santiago. Al finalizar habrás descubierto que, tras muchos de estos muros silenciosos, todavía viven comunidades religiosas activas desde hace siglos. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al barrio más tranquilo de Toledo! 🙏 Vas a ver varios conventos y monasterios, algunos con monjas y frailes que todavía viven dentro, como hace cientos de años. Empezarás en un monasterio enorme con cadenas colgando en su fachada, y terminarás descubriendo rincones que parecen sacados de un cuento. Al acabar sabrás que, detrás de esas paredes tan calladas, la vida sigue igual que hace siglos. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "A quiet walk through the convents and monasteries that still beat at the heart of Toledo. It starts at the imposing Monastery of San Juan de los Reyes, continues through the Convent of Santo Domingo el Antiguo and San Clemente, passes the Church of San Pedro Mártir and the Monastery of la Madre de Dios, and finishes at the Convent of the Comendadoras de Santiago. By the end you'll have discovered that, behind many of these silent walls, active religious communities have lived on for centuries. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to Toledo's quietest neighbourhood! 🙏 You'll see several convents and monasteries, some with nuns and friars still living inside, just like hundreds of years ago. You'll start at a huge monastery with chains hanging on its front wall, and finish by discovering corners that look straight out of a storybook. By the end you'll know that, behind those quiet walls, life carries on just like it did centuries ago. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  madrid: {
    id: 'madrid',
    name: 'Madrid Centro',
    country: 'España',
    // Agrupa esta ciudad junto a Alcalá de Henares y Buitrago del Lozoya
    // bajo un desplegable "Madrid" en el selector (ver renderCities en
    // app.js), en vez de listarlas las tres sueltas junto a Toledo o
    // Peñíscola: las tres pertenecen a la misma Comunidad de Madrid.
    region: 'Madrid',
    continent: 'Europa',
    subtitle: { adult: 'La Villa y Corte', kids: '¡La Ciudad del Oso y el Madroño! 🐻' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Madrid, capital de España desde hace más de 450 años. Aquí encontrarás palacios, museos con arte de todo el mundo y calles llenas de vida a cualquier hora. En este paseo descubrirás sus rincones más especiales. ¡Empecemos!',
        kids: '¡Bienvenido a Madrid, la ciudad del oso y el madroño! Es la capital de España desde hace más de 450 años. Vas a ver un palacio enorme, museos llenos de tesoros y plazas donde siempre pasa algo divertido. ¡Prepárate para descubrir Madrid!'
      },
      en: {
        adult: "Welcome to Madrid, the capital of Spain for over 450 years. Here you'll find palaces, museums with art from all over the world, and streets full of life at any hour. On this walk you'll discover its most special corners. Let's get started!",
        kids: "Welcome to Madrid, the city of the bear and the strawberry tree! It's been Spain's capital for over 450 years. You'll see a huge palace, museums full of treasures, and squares where something fun is always happening. Get ready to discover Madrid!"
      }
    },
    // ~50% del máximo real de Madrid (81 POIs con quiz × 10 = 2430 posibles).
    badgeThreshold: 1200,
    badgeImg: 'assets/badges/madrid.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Palacio_Real_de_Madrid_Julio_2016_%28cropped%29.jpg/330px-Palacio_Real_de_Madrid_Julio_2016_%28cropped%29.jpg',
    center: [40.4169, -3.7095],
    zoom: 15.3,
    minZoom: 13,
    // Ampliados respecto a los originales ([[40.408,-3.722],[40.423,-3.697]]):
    // eran demasiado ajustados y dejaban fuera del área navegable del mapa
    // POIs reales como el Museo del Prado o el Parque del Retiro (detectado
    // por scripts/validate-data.js). Con las nuevas rutas "Paseo del Arte"
    // y "Palacio y Plaza de España" tocaba corregirlo ya.
    // Lado este ampliado de nuevo a -3.680 -> -3.677: dejaba fuera del mapa
    // un par de rincones del Retiro (Jardines de Cecilio Rodríguez, Casa de
    // Fieras) detectados con la misma validación al añadir nuevas paradas.
    bounds: [[40.404, -3.723], [40.432, -3.677]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta imprescindible de Madrid reúne sus grandes símbolos en un paseo corto y muy caminable. Visitarás el Palacio Real, uno de los más grandes de Europa, probarás el ambiente del Mercado de San Miguel, pisarás el kilómetro cero de España en la Puerta del Sol y cruzarás la Plaza Mayor. Junto a la Catedral de la Almudena verás los restos de muralla árabe más antiguos de la ciudad, y terminarás recorriendo la Gran Vía, entre la Plaza del Callao y el Edificio Telefónica, el primer rascacielos de Europa. Al acabar tendrás una primera fotografía completa de Madrid: la capital de un imperio, convertida siglos después en una ciudad moderna y cosmopolita. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta es la ruta top de Madrid! 🚩 Vas a ver un palacio gigante con más de 3.000 habitaciones, un mercado lleno de comida rica, la plaza donde empiezan todas las carreteras de España y una plaza mayor preciosa. Junto a la catedral verás las piedras más viejas de todo Madrid, ¡de hace más de 1.100 años! Y terminarás en una calle enorme llena de luces y teatros, con el primer rascacielos que hubo en toda Europa. Al final habrás visto lo mejor de Madrid en un solo paseo. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "Madrid's essential route brings together its great symbols in a short, very walkable stroll. You'll visit the Royal Palace, one of the largest in Europe, soak up the atmosphere of the Mercado de San Miguel, stand on Spain's kilometre zero at Puerta del Sol, and cross Plaza Mayor. Next to Almudena Cathedral you'll see the city's oldest surviving Arab wall remains, and you'll finish along Gran Vía, between Plaza del Callao and the Edificio Telefónica, Europe's first skyscraper. By the end you'll have a first complete snapshot of Madrid: the capital of an empire, turned centuries later into a modern, cosmopolitan city. Tap each stop on the map to see the specific information for that spot.",
            kids: "This is Madrid's top route! 🚩 You'll see a giant palace with over 3,000 rooms, a market full of tasty food, the square where every road in Spain begins, and a beautiful main square. Next to the cathedral you'll see the oldest stones in all of Madrid — over 1,100 years old! And you'll finish on a huge street full of lights and theatres, with the very first skyscraper in all of Europe. By the end you'll have seen the best of Madrid in a single walk. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'arte',
        name: {
          es: { adult: 'Paseo del Arte', kids: '¡El Paseo de los Museos! 🎨' },
          en: { adult: 'Art Walk', kids: 'The Museum Walk! 🎨' }
        },
        color: '#E11D48',
        intro: {
          es: {
            adult: 'El Paseo del Arte es el eje cultural más importante de España: en poco más de un kilómetro se concentran algunos de los museos más visitados del mundo. Empezarás junto a la diosa Cibeles y bajo la Puerta de Alcalá, seguirás por el Museo Thyssen-Bornemisza, el Museo del Prado y el Real Jardín Botánico, te adentrarás en el Retiro hasta el Estanque Grande y el Palacio de Cristal, pasarás por la fachada vegetal del CaixaForum y terminarás en el Museo Reina Sofía, hogar del Guernica de Picasso. Al terminar habrás recorrido ocho siglos de historia del arte, del Románico a la vanguardia del siglo XX, sin salir de un mismo paseo. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta es puro arte! 🎨 Empezarás junto a una diosa de piedra y una puerta gigante, pasarás por tres museos con cuadros y tesoros distintos, un jardín con plantas de todo el mundo, y un lago del Retiro donde hace siglos un rey organizaba batallas navales de mentira. Terminarás en un edificio con una pared cubierta de plantas de verdad. Al final habrás visto pinturas hechas hace cientos de años y otras hechas hace muy poquito tiempo, ¡todo en el mismo paseo! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "The Paseo del Arte is Spain's most important cultural axis: in just over a kilometre it packs in some of the most visited museums in the world. You'll start by the goddess Cibeles and under the Puerta de Alcalá, continue past the Thyssen-Bornemisza Museum, the Prado Museum, and the Royal Botanical Garden, head into the Retiro park to the Estanque Grande and the Palacio de Cristal, pass the living plant wall of CaixaForum, and finish at the Reina Sofía Museum, home to Picasso's Guernica. By the end you'll have covered eight centuries of art history, from Romanesque to 20th-century avant-garde, without leaving a single walk. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route is pure art! 🎨 You'll start by a stone goddess and a giant gate, pass three museums each full of different paintings and treasures, a garden with plants from all over the world, and a lake in the Retiro park where centuries ago a king staged pretend naval battles. You'll finish at a building with a wall covered in real, living plants. By the end you'll have seen paintings made hundreds of years ago and others made just recently, all on the same walk! Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'austrias',
        name: {
          es: { adult: 'Madrid de los Austrias', kids: '¡El Madrid Antiguo! 🏰' },
          en: { adult: 'Habsburg Madrid', kids: 'Old Madrid! 🏰' }
        },
        color: '#16A34A',
        intro: {
          es: {
            adult: 'Esta ruta recorre el Madrid más antiguo, el de los Austrias, con sus calles estrechas y sus plazas escondidas. Pasarás por la Iglesia de San Ginés y el barrio de La Latina, bajarás por la Calle Cuchilleros, llegarás a la Plaza de la Paja y los Jardines de Anglona, visitarás la Colegiata de San Isidro —la catedral de Madrid antes de la Almudena— y la basílica de San Francisco el Grande, subirás al mirador del Parque de las Vistillas y terminarás en el castizo Mercado de la Cebada. Al terminar habrás visto el Madrid medieval y renacentista que sobrevive, casi intacto, a la sombra de la Plaza Mayor. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al Madrid más antiguo de todos! 🏰 Vas a caminar por el barrio más castizo de la ciudad, por calles estrechitas y empinadas, como las de un pueblo de hace cientos de años, con plazas escondidas y jardines tranquilos. Visitarás la iglesia que fue catedral de Madrid antes de que existiera la Almudena, subirás a un mirador con vistas preciosas y terminarás en un mercado con mucho ambiente. Al final habrás descubierto un Madrid que casi nadie ve porque está escondido detrás de la Plaza Mayor. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route runs through Madrid's oldest quarter, the Habsburg-era Madrid de los Austrias, with its narrow streets and hidden squares. You'll pass the Church of San Ginés and the La Latina neighbourhood, walk down Calle Cuchilleros, reach Plaza de la Paja and the Jardines de Anglona, visit the Colegiata de San Isidro — Madrid's cathedral before the Almudena — and the Basilica of San Francisco el Grande, climb up to the viewpoint at Parque de las Vistillas, and finish at the traditional Mercado de la Cebada. By the end you'll have seen the medieval and Renaissance Madrid that survives, almost intact, in the shadow of Plaza Mayor. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to the oldest part of Madrid! 🏰 You'll walk through the city's most traditional neighbourhood, along narrow, steep streets just like a village from hundreds of years ago, with hidden squares and quiet gardens. You'll visit the church that was Madrid's cathedral before the Almudena existed, climb to a viewpoint with beautiful views, and finish at a lively market. By the end you'll have discovered a Madrid that almost nobody sees, because it's hidden right behind Plaza Mayor. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'palacio',
        name: {
          es: { adult: 'Palacio y Plaza de España', kids: '¡El Barrio del Rey! 👑' },
          en: { adult: 'Palace & Plaza de España', kids: "The King's Neighbourhood! 👑" }
        },
        color: '#0EA5E9',
        intro: {
          es: {
            adult: 'Una ruta por el Madrid más monumental, alrededor del Palacio Real. Empezarás en el Teatro Real, cruzarás la Plaza de Oriente y los Jardines de Sabatini, subirás hasta el Templo de Debod —un templo egipcio real, regalado a España hace más de 2.000 años— y el Monumento al Dos de Mayo de 1808, visitarás el Museo Cerralbo y terminarás en la Plaza de España, el Monasterio de la Encarnación y el Palacio del Senado. Al terminar habrás visto cómo Madrid combina la grandeza de sus palacios con un templo egipcio original, algo que no se ve en ninguna otra capital europea. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta es la del rey! 👑 Vas a pasar por un teatro enorme, unos jardines preciosos, ¡y hasta un templo egipcio de verdad, con miles de años, que le regalaron a España! También verás un monumento a un grupo de valientes que se enfrentaron a un ejército entero. Terminarás en una plaza con Don Quijote y Sancho Panza, un monasterio tranquilo y el edificio donde trabajan los senadores. Al final sabrás que en Madrid hay un pedacito de Egipto, ¡y pocos niños lo saben! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "A route through Madrid's most monumental side, around the Royal Palace. You'll start at the Teatro Real, cross Plaza de Oriente and the Jardines de Sabatini, climb up to the Temple of Debod — a genuine Egyptian temple, gifted to Spain over 2,000 years ago — and the Monument to the Second of May 1808, visit the Cerralbo Museum, and finish at Plaza de España, the Monasterio de la Encarnación, and the Senate Palace. By the end you'll have seen how Madrid combines the grandeur of its palaces with an original Egyptian temple, something no other European capital can offer. Tap each stop on the map to see the specific information for that spot.",
            kids: "This is the king's route! 👑 You'll pass a huge theatre, beautiful gardens, and even a real Egyptian temple, thousands of years old, that was gifted to Spain! You'll also see a monument to a group of brave people who stood up to an entire army. You'll finish in a square with Don Quixote and Sancho Panza, a quiet monastery, and the building where the senators work. By the end you'll know Madrid has a little piece of Egypt, and hardly any kids know that! Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  'alcala-de-henares': {
    id: 'alcala-de-henares',
    name: 'Alcalá de Henares',
    country: 'España',
    region: 'Madrid',
    continent: 'Europa',
    subtitle: { adult: 'Cuna de Cervantes, Patrimonio de la Humanidad', kids: '¡La Ciudad Donde Nació Don Quijote... o Casi! 🖋️' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Alcalá de Henares, la ciudad donde nació Cervantes. Su universidad, de más de 500 años, la convirtió en un lugar clave para las letras en toda Europa. En este paseo caminarás por sus calles históricas. ¡Vamos a descubrirla!',
        kids: '¡Bienvenido a Alcalá de Henares, la ciudad donde nació el escritor más famoso de España! Su universidad tiene más de 500 años. Vas a caminar por una calle con soportales enorme y descubrir dónde nació Cervantes. ¡Prepárate para la aventura!'
      },
      en: {
        adult: "Welcome to Alcalá de Henares, the city where Cervantes was born. Its university, over 500 years old, made it a key place for literature across Europe. On this walk you'll stroll through its historic streets. Let's go discover it!",
        kids: "Welcome to Alcalá de Henares, the city where Spain's most famous writer was born! Its university is over 500 years old. You'll walk down a huge arcaded street and discover where Cervantes was born. Get ready for adventure!"
      }
    },
    // ~50% del máximo real de Alcalá de Henares (16 POIs con quiz × 30 = 480 posibles).
    badgeThreshold: 240,
    badgeImg: 'assets/badges/alcala-de-henares.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Universidad-Alcala-180819.jpg/330px-Universidad-Alcala-180819.jpg',
    center: [40.4835, -3.3670],
    zoom: 15.5,
    minZoom: 13,
    // Cubre todo el casco histórico Patrimonio de la Humanidad, desde la
    // Puerta de Madrid y la muralla (oeste) hasta el Palacio Laredo y la
    // estación de tren (norte), y desde el convento de las Bernardas hasta
    // el Hospital de Antezana y la Calle Mayor.
    bounds: [[40.4775, -3.3755], [40.4905, -3.3605]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'Esta ruta reúne el corazón cervantino y universitario de Alcalá de Henares, Patrimonio de la Humanidad desde 1998. Empezarás en el Colegio de San Ildefonso, la universidad fundada por el cardenal Cisneros en 1499 donde hoy se entrega el Premio Cervantes, seguirás hasta la Catedral Magistral —una de las dos únicas del mundo con ese título—, visitarás la casa donde se conserva la partida de bautismo de Miguel de Cervantes y su plaza, te asomarás al Corral de Comedias, uno de los teatros en activo más antiguos de Europa, y terminarás subiendo a la torre mirador construida sobre las ruinas de la iglesia donde el propio Cervantes fue bautizado en 1547. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al Alcalá de Cervantes! 🖋️ Vas a entrar en una universidad de más de 500 años donde cada año se entrega un premio súper importante de libros, visitarás una catedral que solo comparte su título con otra en todo el mundo, entrarás en la casa donde nació el escritor más famoso de España, y subirás a una torre mirador construida sobre una iglesia muy antigua. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route brings together the Cervantes-and-university heart of Alcalá de Henares, a UNESCO World Heritage Site since 1998. You'll start at the Colegio de San Ildefonso, the university founded by Cardinal Cisneros in 1499 where the Cervantes Prize is awarded today, continue to the Magistral Cathedral — one of only two in the world with that title — visit the house that holds Miguel de Cervantes' baptism record and its square, peek into the Corral de Comedias, one of Europe's oldest working theatres, and finish by climbing the lookout tower built over the ruins of the church where Cervantes himself was baptised in 1547. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to Cervantes' Alcalá! 🖋️ You'll go into a university that's over 500 years old, where a super important book prize is given out every year, visit a cathedral that shares its title with only one other in the whole world, go into the house where Spain's most famous writer was born, and climb a lookout tower built over a very old church. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'palacios',
        name: {
          es: { adult: 'Palacios y Murallas', kids: '¡El Alcalá de los Palacios! 🏯' },
          en: { adult: 'Palaces & Walls', kids: 'Alcalá of the Palaces! 🏯' }
        },
        color: '#0EA5E9',
        intro: {
          es: {
            adult: 'Una ruta por el Alcalá monumental y religioso, menos transitada que el centro cervantino pero igual de sorprendente. Recorrerás la Calle Mayor, la calle soportalada más larga conservada de Europa, cruzarás la Puerta de Madrid y un tramo de la muralla árabe y medieval del siglo XI, visitarás el Palacio Arzobispal —donde Isabel la Católica recibió a Cristóbal Colón en 1486— y el Palacio Laredo, y terminarás junto a la cúpula ovalada más grande de España, en el convento de las Bernardas. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta es la de los palacios y las murallas! 🏯 Vas a caminar por la calle con soportales más larga de toda Europa, cruzar una puerta muy antigua y un trozo de muralla de hace casi 1.000 años, visitar un palacio donde una reina se reunió con el marinero que después cruzó el océano, y otro palacio con decoración árabe. Terminarás junto a la cúpula más grande de España en forma de óvalo. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "A route through monumental, religious Alcalá, quieter than the Cervantes centre but just as striking. You'll walk along Calle Mayor, Europe's longest surviving arcaded street, cross the Puerta de Madrid and a stretch of the 11th-century Arab and medieval wall, visit the Archbishop's Palace — where Isabel the Catholic received Christopher Columbus in 1486 — and the Palacio Laredo, and finish beside Spain's largest oval dome, at the Convent of the Bernardas. Tap each stop on the map to see the specific information for that spot.",
            kids: "This is the route of palaces and walls! 🏯 You'll walk along the longest arcaded street in all of Europe, cross a very old gate and a stretch of wall almost 1,000 years old, visit a palace where a queen met the sailor who later crossed the ocean, and another palace with Arab-style decoration. You'll finish beside Spain's biggest oval-shaped dome. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  'buitrago-del-lozoya': {
    id: 'buitrago-del-lozoya',
    name: 'Buitrago del Lozoya',
    country: 'España',
    region: 'Madrid',
    continent: 'Europa',
    subtitle: { adult: 'El pueblo amurallado de la Sierra Norte', kids: '¡El Pueblo con Muralla de Verdad! 🏰' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Buitrago del Lozoya, un pueblo con muralla en la Sierra Norte de Madrid. Tiene casi mil años de historia y hasta un museo con obras de Picasso. Se recorre en poco más de una hora. ¡Ven a descubrir un lugar único!',
        kids: '¡Bienvenido a Buitrago del Lozoya, un pueblo con una muralla de verdad! Tiene casi 1.000 años y todavía puedes caminar junto a ella. ¡Hasta hay un museo con cuadros de Picasso! Prepárate para descubrir un pueblo mágico.'
      },
      en: {
        adult: "Welcome to Buitrago del Lozoya, a walled village in the Sierra Norte of Madrid. It has almost a thousand years of history, and even a museum with works by Picasso. You can walk the whole thing in just over an hour. Come discover a one-of-a-kind place!",
        kids: "Welcome to Buitrago del Lozoya, a village with a real wall! It's almost 1,000 years old and you can still walk right beside it. There's even a museum with paintings by Picasso! Get ready to discover a magical village."
      }
    },
    // ~50% del máximo real de Buitrago del Lozoya (7 POIs con quiz × 30 = 210 posibles).
    badgeThreshold: 105,
    badgeImg: 'assets/badges/buitrago-del-lozoya.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Muralla_y_barbacana_de_Buitrago_del_Lozoya.jpg/330px-Muralla_y_barbacana_de_Buitrago_del_Lozoya.jpg',
    center: [40.9945, -3.6345],
    zoom: 16.2,
    minZoom: 14.5,
    // El recinto amurallado casi completo del pueblo, desde el puente del
    // Arrabal (norte) hasta el castillo y la iglesia (sur).
    bounds: [[40.991, -3.639], [40.998, -3.6305]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta recorre por completo el recinto amurallado mejor conservado de la Comunidad de Madrid, de origen musulmán del siglo XI. Caminarás junto a la muralla y su barbacana, visitarás el castillo donde se refugió Juana la Beltraneja durante su disputa con Isabel la Católica por el trono de Castilla, entrarás en la iglesia mudéjar de Santa María del Castillo, descubrirás un pequeño museo con obras auténticas de Picasso regaladas a su peluquero y amigo, y cruzarás el puente medieval sobre el río Lozoya. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta rodea un pueblo amurallado como de cuento! 🏰 Vas a caminar junto a una muralla de hace casi 1.000 años, visitar un castillo donde se escondió una princesa, entrar en una iglesia muy antigua, y descubrir un museo pequeñito con cuadros auténticos de Picasso que regaló a su amigo peluquero. Terminarás cruzando un puente de piedra muy viejo sobre un río. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route covers the entire best-preserved walled enclosure in the Community of Madrid, of 11th-century Muslim origin. You'll walk alongside the wall and its barbican, visit the castle where Juana la Beltraneja took refuge during her dispute with Isabel the Catholic over the throne of Castile, step into the Mudéjar church of Santa María del Castillo, discover a small museum with genuine works by Picasso, gifted to his hairdresser and friend, and cross the medieval bridge over the Lozoya River. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route circles a storybook walled village! 🏰 You'll walk beside a wall that's almost 1,000 years old, visit a castle where a princess once hid, step into a very old church, and discover a tiny museum with genuine paintings that Picasso gave to his friend the hairdresser. You'll finish crossing a very old stone bridge over a river. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  peniscola: {
    id: 'peniscola',
    name: 'Peñíscola',
    country: 'España',
    continent: 'Europa',
    subtitle: { adult: 'La Ciudad en el Mar', kids: '¡El Castillo sobre las Olas! 🌊' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Peñíscola, la Ciudad en el Mar. Sobre sus rocas se alza el Castillo del Papa Luna, frente al Mediterráneo. En este paseo recorrerás murallas, playas y vistas que no olvidarás. ¡Ven a descubrirla!',
        kids: '¡Bienvenido a Peñíscola, el pueblo con un castillo sobre el mar! Hace muchos años casi era una isla de verdad. Vas a caminar junto a murallas y subir hasta un castillo con vistas increíbles. ¡Prepárate para la aventura!'
      },
      en: {
        adult: "Welcome to Peñíscola, the City in the Sea. The Castillo del Papa Luna rises from its rocks, facing the Mediterranean. On this walk you'll explore walls, beaches, and views you won't forget. Come discover it!",
        kids: "Welcome to Peñíscola, the village with a castle over the sea! Many years ago it was almost a real island. You'll walk beside old walls and climb up to a castle with incredible views. Get ready for adventure!"
      }
    },
    // ~50% del máximo real de Peñíscola (6 POIs con quiz × 10 = 180 posibles).
    badgeThreshold: 90,
    badgeImg: 'assets/badges/peniscola.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Pe%C3%B1%C3%ADscola._Castillo_del_Papa_Luna_19.jpg/330px-Pe%C3%B1%C3%ADscola._Castillo_del_Papa_Luna_19.jpg',
    center: [40.359, 0.403],
    zoom: 15.4,
    minZoom: 13,
    bounds: [[40.353, 0.395], [40.365, 0.411]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta imprescindible de Peñíscola sigue el camino natural que unió esta antigua isla a tierra firme. Empezarás en Playa Norte, entrarás por las murallas renacentistas, visitarás la Iglesia de Santa María y llegarás hasta el Castillo del Papa Luna, el último bastión de un Papa que nunca se rindió. Terminarás en la Ermita de la Virgen de la Ermitana y en El Bufador, una grieta en la roca que "respira" con el oleaje. Al acabar conocerás la historia de Peñíscola desde el mar hasta lo más alto del peñón. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva de la playa hasta lo más alto de un castillo sobre el mar! 🏰🌊 Vas a caminar junto a murallas que frenaron a los piratas, entrar en una iglesia con el tesoro de un Papa muy testarudo, y llegar hasta su castillo. Al final escucharás una roca que respira como una ballena. ¡Sabrás por qué Peñíscola casi era una isla de verdad! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "Peñíscola's essential route follows the natural path that once joined this old island to the mainland. You'll start at Playa Norte, enter through the Renaissance walls, visit the Church of Santa María, and reach the Castillo del Papa Luna, the last stronghold of a Pope who never surrendered. You'll finish at the Ermita de la Virgen de la Ermitana and El Bufador, a crack in the rock that \"breathes\" with the swell of the waves. By the end you'll know Peñíscola's story from the sea to the very top of the rock. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you from the beach all the way up to the top of a castle by the sea! 🏰🌊 You'll walk beside walls that once held off pirates, step into a church holding the treasure of a very stubborn Pope, and reach his castle. At the end you'll hear a rock that breathes like a whale. You'll find out why Peñíscola was almost a real island! Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  cdmx: {
    id: 'cdmx',
    name: 'Ciudad de México',
    country: 'México',
    continent: 'América',
    subtitle: { adult: 'Capital azteca y virreinal', kids: '¡La Ciudad de las Águilas y las Pirámides! 🦅' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a la Ciudad de México, construida sobre Tenochtitlan, la antigua capital azteca. Aquí conviven una pirámide, palacios y barrios como Coyoacán, donde vivió Frida Kahlo. En este paseo descubrirás mucha historia en pocos pasos. ¡Vamos a explorarla!',
        kids: '¡Bienvenido a la Ciudad de México, una ciudad construida encima de otra! Hace 500 años aquí estaba Tenochtitlan, la capital de los aztecas. Vas a ver una pirámide escondida, un palacio con pinturas gigantes y el barrio de una pintora muy famosa. ¡Prepárate para descubrir sus secretos!'
      },
      en: {
        adult: "Welcome to Mexico City, built on top of Tenochtitlan, the ancient Aztec capital. Here a pyramid, palaces, and neighbourhoods like Coyoacán, where Frida Kahlo lived, all exist side by side. On this walk you'll discover a lot of history in just a few steps. Let's go explore it!",
        kids: "Welcome to Mexico City, a city built on top of another city! 500 years ago Tenochtitlan, the Aztec capital, stood right here. You'll see a hidden pyramid, a palace with giant paintings, and the neighbourhood of a very famous painter. Get ready to discover its secrets!"
      }
    },
    // ~50% del máximo real de CDMX (19 POIs con quiz × 10 = 570 posibles).
    badgeThreshold: 290,
    badgeImg: 'assets/badges/cdmx.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Catedral_Metropolitana_de_la_Ciudad_de_M%C3%A9xico_1.jpg/330px-Catedral_Metropolitana_de_la_Ciudad_de_M%C3%A9xico_1.jpg',
    center: [19.37, -99.15],
    zoom: 11,
    minZoom: 9.5,
    bounds: [[19.22, -99.22], [19.51, -99.08]],
    routes: [
      {
        id: 'centro',
        name: {
          es: { adult: 'Centro Histórico', kids: 'Centro Histórico 🏛️' },
          en: { adult: 'Historic Centre', kids: 'Historic Centre 🏛️' }
        },
        color: '#E4002B',
        intro: {
          es: {
            adult: 'Esta ruta recorre el corazón de la Ciudad de México, construido literalmente sobre las ruinas de Tenochtitlan. Visitarás la Catedral Metropolitana, la más grande de América, el Palacio Nacional con sus murales de Diego Rivera, el Templo Mayor azteca excavado bajo la propia plaza, subirás a la Torre Latinoamericana —el primer rascacielos antisísmico del mundo—, entrarás en el Palacio de Bellas Artes y terminarás paseando por la Alameda Central, el parque público más antiguo de América. Al acabar habrás visto cómo la capital azteca y la ciudad colonial conviven, literalmente, una encima de la otra. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al centro de una ciudad que se construyó encima de otra ciudad! 🏛️🐍 Vas a ver una catedral gigante, un palacio con una campana muy especial y pinturas gigantes, una pirámide azteca escondida bajo tierra durante casi 500 años, subir a una torre altísima que baila en los terremotos, y visitar un palacio de mármol blanco. Al terminar sabrás que, bajo tus pies, todavía está la antigua capital de los aztecas. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route runs through the heart of Mexico City, built literally on top of the ruins of Tenochtitlan. You'll visit the Metropolitan Cathedral, the largest in the Americas, the National Palace with its Diego Rivera murals, the Aztec Templo Mayor excavated right under the square itself, climb the Torre Latinoamericana — the world's first earthquake-resistant skyscraper — go into the Palacio de Bellas Artes, and finish strolling through the Alameda Central, the oldest public park in the Americas. By the end you'll have seen how the Aztec capital and the colonial city coexist, literally, one on top of the other. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to the centre of a city built on top of another city! 🏛️🐍 You'll see a giant cathedral, a palace with a very special bell and giant paintings, an Aztec pyramid hidden underground for almost 500 years, climb a super-tall tower that sways in earthquakes, and visit a white marble palace. By the end you'll know that, right under your feet, the ancient Aztec capital is still there. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'sur',
        name: {
          es: { adult: 'Coyoacán', kids: 'Coyoacán 🎨' },
          en: { adult: 'Coyoacán', kids: 'Coyoacán 🎨' }
        },
        color: '#22C55E',
        intro: {
          es: {
            adult: 'Un paseo por Coyoacán, el barrio colonial donde vivieron Frida Kahlo, Diego Rivera y León Trotsky. Empezarás en el Jardín Centenario y la Parroquia de San Juan Bautista, seguirás por el animado Mercado de Coyoacán, visitarás la Casa Azul donde nació y murió Frida Kahlo, y terminarás en la casa-fortaleza donde Trotsky pasó sus últimos meses de exilio. Al acabar conocerás el barrio que marcó a algunos de los personajes más importantes del arte y la política del siglo XX. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al barrio de una pintora muy famosa! 🎨💙 Vas a pasar por una plaza llena de estatuas de ranas, un mercado con mil sabores, una casa pintada de azul intenso donde vivió Frida Kahlo, y una casa convertida en fortaleza de verdad, con torretas y todo. Al final sabrás por qué este barrio sigue siendo uno de los más queridos de toda la ciudad. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "A stroll through Coyoacán, the colonial neighbourhood where Frida Kahlo, Diego Rivera, and Leon Trotsky lived. You'll start at the Jardín Centenario and the Parish of San Juan Bautista, continue through the lively Mercado de Coyoacán, visit the Casa Azul where Frida Kahlo was born and died, and finish at the fortress-house where Trotsky spent his final months of exile. By the end you'll know the neighbourhood that shaped some of the most important figures in 20th-century art and politics. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to the neighbourhood of a very famous painter! 🎨💙 You'll pass a square full of frog statues, a market with a thousand flavours, a house painted deep blue where Frida Kahlo lived, and a house turned into a real fortress, watchtowers and all. By the end you'll know why this neighbourhood is still one of the most loved in the whole city. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'polanco',
        name: {
          es: { adult: 'Polanco · Museos', kids: 'Polanco · Museos 🦉' },
          en: { adult: 'Polanco · Museums', kids: 'Polanco · Museums 🦉' }
        },
        color: '#F5A623',
        intro: {
          es: {
            adult: 'Esta ruta reúne algunos de los museos más importantes de México, empezando por el único castillo de uso real de toda América: el Castillo de Chapultepec. Seguirás por el Museo Nacional de Antropología, con la Piedra del Sol como pieza estrella, y terminarás frente a frente entre dos museos privados muy distintos: el brillante Museo Soumaya y el sobrio Museo Jumex. Al acabar habrás visto, en un mismo paseo, desde un emperador del siglo XIX hasta el arte contemporáneo más actual. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta está llena de tesoros! 🦉 Vas a subir a un castillo de verdad, donde vivió un emperador, ver la piedra azteca más famosa del mundo, y terminar entre dos museos que parecen del futuro: uno plateado y brillante, y otro blanco y muy recto. Al final habrás visto objetos de hace miles de años y arte hecho hace muy poquito tiempo. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route brings together some of Mexico's most important museums, starting with the only castle in all the Americas ever actually used by royalty: Chapultepec Castle. You'll continue to the National Museum of Anthropology, with the Sun Stone as its star piece, and finish facing off between two very different private museums: the gleaming Museo Soumaya and the austere Museo Jumex. By the end you'll have seen, on a single walk, everything from a 19th-century emperor to the very latest contemporary art. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route is packed with treasures! 🦉 You'll climb up to a real castle where an emperor once lived, see the most famous Aztec stone in the world, and finish between two museums that look like they're from the future: one silver and shiny, the other white and very sharp-edged. By the end you'll have seen objects thousands of years old and art made just recently. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'basilica',
        name: {
          es: { adult: 'Basílica', kids: 'Basílica ⛪' },
          en: { adult: 'Basilica', kids: 'Basilica ⛪' }
        },
        color: '#7B2D8E',
        intro: {
          es: {
            adult: 'Una ruta breve pero muy especial: el santuario mariano más visitado del mundo. Visitarás la Basílica de Guadalupe, construida junto al cerro donde, según la tradición, se apareció la Virgen a Juan Diego en 1531, recorrerás la Antigua Basílica —el templo original, hoy museo, notablemente inclinado por el hundimiento del terreno— y subirás hasta la Capilla del Cerrito, en el punto más alto y sagrado de todo el conjunto. Al terminar conocerás el lugar que recibe a millones de peregrinos cada año, especialmente cada 12 de diciembre. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva a uno de los lugares más visitados del mundo! ⛪🌟 Vas a ver una iglesia redonda gigantesca, otra iglesia mucho más vieja que está clarísimamente torcida, y subir hasta la cima de una colina donde, cuenta la leyenda, aparecieron unas rosas mágicas. Al final sabrás por qué millones de personas vienen aquí cada año desde hace casi 500 años. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "A short but very special route: the most visited Marian shrine in the world. You'll visit the Basilica of Guadalupe, built beside the hill where, according to tradition, the Virgin appeared to Juan Diego in 1531, walk through the Old Basilica — the original church, now a museum, noticeably tilted from ground subsidence — and climb up to the Capilla del Cerrito, at the highest and most sacred point of the whole site. By the end you'll know the place that welcomes millions of pilgrims every year, especially every 12th of December. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to one of the most visited places in the world! ⛪🌟 You'll see a giant round church, another much older church that's clearly leaning, and climb to the top of a hill where, legend says, magical roses once appeared. By the end you'll know why millions of people have come here every year for almost 500 years. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  berlin: {
    id: 'berlin',
    name: 'Berlín',
    country: 'Alemania',
    continent: 'Europa',
    subtitle: { adult: 'Historia, muros y memoria', kids: '¡La Ciudad del Oso y el Muro! 🐻' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Berlín, una ciudad marcada por la historia: una guerra, un muro que la dividió durante casi 30 años y una libertad recuperada. En este paseo verás la Puerta de Brandeburgo, restos del Muro y su famosa Isla de los Museos. ¡Descubre esta ciudad!',
        kids: '¡Bienvenido a Berlín, la ciudad del oso, igual que Madrid! Aquí hubo un muro gigante que dividió la ciudad en dos durante casi 30 años. Vas a ver una puerta enorme, trozos del muro pintados de colores y una isla llena de museos. ¡Prepárate para la aventura!'
      },
      en: {
        adult: "Welcome to Berlin, a city shaped by history: a war, a wall that split it for almost 30 years, and freedom regained. On this walk you'll see the Brandenburg Gate, remains of the Wall, and its famous Museum Island. Discover this city!",
        kids: "Welcome to Berlin, the city of the bear, just like Madrid! There was once a giant wall here that split the city in two for almost 30 years. You'll see a huge gate, colourfully painted pieces of the wall, and an island full of museums. Get ready for adventure!"
      }
    },
    // ~50% del máximo real de Berlín (30 POIs con quiz × 10 = 890 posibles).
    badgeThreshold: 450,
    badgeImg: 'assets/badges/berlin.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Brandenburger_Tor%2C_Berlin%2C_Germany.jpg/330px-Brandenburger_Tor%2C_Berlin%2C_Germany.jpg',
    center: [52.5145, 13.3888],
    zoom: 12.3,
    // Ampliados respecto a los originales ([[52.493,13.27],[52.535,13.47]]):
    // se quedaban fuera POIs reales de las rutas nuevas "Isla de los Museos"
    // y "Muro y Guerra Fría" (Mauerpark al norte, Tempelhofer Feld y Curry 36
    // al sur), igual que se corrigió antes en Madrid. Ampliados de nuevo para
    // cubrir el Museo de la Stasi (este), el Museo de los Aliados (sur) y,
    // sobre todo, el Puente de Glienicke (suroeste), a las afueras reales de
    // Berlín, cerca de Potsdam.
    minZoom: 11,
    bounds: [[52.405, 13.08], [52.548, 13.495]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta imprescindible de Berlín reúne los grandes símbolos de una ciudad marcada por el siglo XX: dictadura, guerra, muro y reunificación. Empezarás en la Puerta de Brandeburgo, subirás a la cúpula de cristal del Reichstag, cruzarás el inquietante Monumento a los Judíos de Europa Asesinados y llegarás hasta Checkpoint Charlie, el paso fronterizo más famoso de la Guerra Fría. Seguirás hasta la Catedral de Berlín y el Museo de Pérgamo, en la Isla de los Museos, y terminarás con las vistas de toda la ciudad desde la Torre de Televisión de Alexanderplatz. Al ser una ruta más extensa que en otras ciudades, algunos tramos te convendrá hacerlos en metro o bus en lugar de a pie. Al acabar entenderás por qué Berlín es, quizás, la capital europea que más abiertamente convive con su propia historia. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Prepárate para conocer una ciudad que tiene un oso como símbolo, igual que Madrid! 🐻 Vas a pasar por una puerta gigante con un carro de oro encima, subir a una cúpula de cristal desde la que se ve todo el Parlamento, cruzar un lugar muy especial que recuerda a millones de personas, y visitar el puesto fronterizo más famoso de cuando la ciudad estaba dividida por un muro. También verás una catedral enorme, un museo con puertas gigantes de hace miles de años y una torre altísima con las mejores vistas de toda la ciudad. Como Berlín es una ciudad grande, ¡en algunos tramos os convendrá coger el metro! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "Berlin's essential route brings together the great symbols of a city shaped by the 20th century: dictatorship, war, a wall, and reunification. You'll start at the Brandenburg Gate, climb up to the Reichstag's glass dome, cross the unsettling Memorial to the Murdered Jews of Europe, and reach Checkpoint Charlie, the most famous Cold War border crossing. You'll continue to Berlin Cathedral and the Pergamon Museum, on Museum Island, and finish with views over the whole city from the Alexanderplatz TV Tower. Since this route is longer than in other cities, some stretches are best covered by metro or bus rather than on foot. By the end you'll understand why Berlin is, perhaps, the European capital that most openly lives alongside its own history. Tap each stop on the map to see the specific information for that spot.",
            kids: "Get ready to discover a city with a bear as its symbol, just like Madrid! 🐻 You'll pass through a giant gate with a golden chariot on top, climb up into a glass dome you can see the whole Parliament from, cross a very special place that remembers millions of people, and visit the most famous border post from when the city was split by a wall. You'll also see a huge cathedral, a museum with giant gates that are thousands of years old, and a super-tall tower with the best views of the whole city. Since Berlin is a big city, on some stretches you'll want to hop on the metro! Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'museos',
        name: {
          es: { adult: 'Isla de los Museos y Centro Histórico', kids: '¡La Isla de los Tesoros! 🏛️' },
          en: { adult: 'Museum Island & Historic Centre', kids: 'The Island of Treasures! 🏛️' }
        },
        color: '#7C3AED',
        intro: {
          es: {
            adult: 'Esta ruta recorre el corazón monumental de Berlín, apenas un kilómetro y medio a pie por la Isla de los Museos —Patrimonio de la Humanidad de la UNESCO— y sus alrededores en el barrio de Mitte. Empezarás en Bebelplatz y la Neue Wache, en pleno bulevar Unter den Linden, entrarás en el Humboldt Forum, el antiguo palacio real reconstruido, y recorrerás cuatro de los cinco grandes museos de la isla: el Altes Museum, el Neues Museum (con el busto de Nefertiti), la Alte Nationalgalerie y el Bode Museum. Cruzarás después hasta los pintorescos patios de las Hackesche Höfe y el Nikolaiviertel, el barrio más antiguo de Berlín, pasarás junto al Ayuntamiento Rojo y el DDR Museum, y terminarás en la elegante plaza del Gendarmenmarkt. Al acabar habrás visto ocho siglos de historia y algunas de las colecciones de arte antiguo más importantes del mundo, todo sin salir de un mismo paseo. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva a una isla llena de museos con tesoros de miles de años! 🏛️ Vas a entrar en un palacio reconstruido, ver momias y bustos egipcios antiquísimos, cuadros gigantes y hasta el mármol de un templo griego entero. Después cruzarás unos patios preciosos escondidos, pasarás por el barrio más viejo de todo Berlín, junto al ayuntamiento con la torre roja, y aprenderás cómo vivía la gente cuando Alemania estaba dividida en dos países. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route covers Berlin's monumental heart, barely a kilometre and a half on foot through Museum Island — a UNESCO World Heritage Site — and its surroundings in the Mitte district. You'll start at Bebelplatz and the Neue Wache, right on the Unter den Linden boulevard, go into the Humboldt Forum, the rebuilt former royal palace, and take in four of the island's five great museums: the Altes Museum, the Neues Museum (home to the bust of Nefertiti), the Alte Nationalgalerie, and the Bode Museum. You'll then cross over to the picturesque courtyards of the Hackesche Höfe and the Nikolaiviertel, Berlin's oldest neighbourhood, pass the Red City Hall and the DDR Museum, and finish at the elegant Gendarmenmarkt square. By the end you'll have covered eight centuries of history and some of the most important ancient art collections in the world, all without leaving a single walk. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to an island full of museums with treasures thousands of years old! 🏛️ You'll go into a rebuilt palace, see ancient Egyptian mummies and busts, giant paintings, and even the marble of an entire Greek temple. Then you'll cross some beautiful hidden courtyards, pass through the oldest neighbourhood in all of Berlin, next to the city hall with the red tower, and learn how people lived when Germany was split into two countries. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'muro',
        name: {
          es: { adult: 'Muro y Guerra Fría', kids: '¡La Ruta del Muro! 🧱' },
          en: { adult: 'The Wall & the Cold War', kids: 'The Wall Route! 🧱' }
        },
        color: '#DC2626',
        intro: {
          es: {
            adult: 'Una ruta por los lugares que mejor explican cómo fue vivir en una ciudad partida en dos durante casi 30 años. Empezarás en la Topografía del Terror, sobre el antiguo cuartel general de la Gestapo y las SS, seguirás hasta la Potsdamer Platz, una plaza que renació de la nada tras pasar cuatro décadas como tierra de nadie junto al Muro. Después te convendrá coger el metro o el bus hasta el Memorial del Muro de Berlín en la calle Bernauer, el lugar que mejor conserva cómo era realmente la frontera, y hasta el cercano Mauerpark, construido literalmente sobre la antigua "franja de la muerte". Terminarás muy al este, en la East Side Gallery y el puente de Oberbaum, junto al Molecule Man, sobre el río Spree. Al acabar habrás recorrido, de punta a punta de la ciudad, la historia de un muro que dividió familias enteras y que hoy es uno de los grandes símbolos de la reunificación europea. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te cuenta la historia del muro que partió Berlín en dos durante casi 30 años! 🧱 Vas a ver el lugar donde tenía su cuartel la policía secreta más temida, una plaza que estuvo vacía durante 40 años y ahora está llena de rascacielos, y el sitio que mejor conserva cómo era el muro de verdad, con sus torres de vigilancia. Como está lejos, ¡tocará coger el metro! Terminarás junto a un trozo de muro pintado con colores y un puente precioso sobre el río. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: 'A route through the places that best explain what it was like to live in a city split in two for almost 30 years. You\'ll start at the Topography of Terror, on the site of the former Gestapo and SS headquarters, continue to Potsdamer Platz, a square that rose from nothing after four decades as no-man\'s-land beside the Wall. From there it\'s best to take the metro or bus to the Berlin Wall Memorial on Bernauer Strasse, the place that best preserves what the border really looked like, and on to the nearby Mauerpark, built literally on top of the former "death strip." You\'ll finish far to the east, at the East Side Gallery and the Oberbaum Bridge, next to the Molecule Man, over the Spree river. By the end you\'ll have travelled, from one end of the city to the other, the story of a wall that split whole families apart and is today one of the great symbols of European reunification. Tap each stop on the map to see the specific information for that spot.',
            kids: "This route tells the story of the wall that split Berlin in two for almost 30 years! 🧱 You'll see where the most feared secret police had their headquarters, a square that stood empty for 40 years and is now full of skyscrapers, and the spot that best preserves what the real wall looked like, watchtowers and all. Since it's far away, you'll need to hop on the metro! You'll finish beside a stretch of wall painted in bright colours and a beautiful bridge over the river. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  roma: {
    id: 'roma',
    name: 'Roma',
    country: 'Italia',
    continent: 'Europa',
    subtitle: { adult: 'La Ciudad Eterna', kids: '¡La Ciudad de los Gladiadores! ⚔️' },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Roma, la Ciudad Eterna, con casi tres mil años de historia en sus calles. En este paseo entrarás en el Coliseo, caminarás por el Foro Romano y lanzarás una moneda a la Fontana di Trevi. ¡Prepárate para una de las ciudades más fascinantes del mundo!',
        kids: '¡Bienvenido a Roma, la ciudad de los gladiadores! Tiene casi 3.000 años de historia, y todavía se puede visitar el anfiteatro gigante donde luchaban. Vas a caminar por las ruinas de un imperio enorme y lanzar una moneda a una fuente preciosa. ¡Prepárate para la aventura más grande!'
      },
      en: {
        adult: "Welcome to Rome, the Eternal City, with almost three thousand years of history in its streets. On this walk you'll step inside the Colosseum, walk through the Roman Forum, and toss a coin into the Trevi Fountain. Get ready for one of the most fascinating cities in the world!",
        kids: "Welcome to Rome, the city of the gladiators! It has almost 3,000 years of history, and you can still visit the giant amphitheatre where they fought. You'll walk through the ruins of an enormous empire and toss a coin into a beautiful fountain. Get ready for the biggest adventure yet!"
      }
    },
    // ~50% del máximo real de Roma (39 POIs con quiz × 30 = 1170 posibles).
    badgeThreshold: 585,
    badgeImg: 'assets/badges/roma.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/330px-Colosseo_2020.jpg',
    center: [41.8986, 12.4768],
    zoom: 14.2,
    minZoom: 12,
    // Cubre desde Trastevere/Gianicolo (oeste) hasta San Giovanni in
    // Laterano (este), y desde el Aventino (sur) hasta Villa Borghese y el
    // Quartiere Coppedè (norte). El Vaticano tiene su propia ciudad aparte
    // (ver "vaticano" más abajo), con sus propios límites de mapa.
    bounds: [[41.876, 12.448], [41.917, 12.513]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta imprescindible de Roma reúne los grandes símbolos de casi tres mil años de historia ininterrumpida. Empezarás en el Coliseo, el anfiteatro más famoso del mundo, seguirás por el Foro Romano y el Palatino, el corazón político y el barrio residencial de la Roma antigua, y cruzarás hasta el Panteón, el edificio con cúpula de hormigón sin armar más grande jamás construido. Terminarás lanzando una moneda a la Fontana di Trevi y perdiéndote entre las columnas berninianas de Piazza Navona. Al ser una ruta extensa, algunos tramos te convendrá hacerlos en metro o a buen paso. Al acabar entenderás por qué a Roma se la llama la Ciudad Eterna: pocos lugares del mundo permiten caminar, en una sola mañana, por el Imperio, el Renacimiento y el Barroco sin salir del mismo casco urbano. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Prepárate para la aventura más grande de Roma! ⚔️ Vas a entrar en un anfiteatro gigante donde luchaban los gladiadores, caminar por las ruinas de la plaza más importante del Imperio Romano, y visitar un templo con una cúpula de piedra tan enorme que todavía hoy sorprende a los arquitectos. Después lanzarás una moneda a una fuente preciosa para poder volver algún día, ¡y verás una plaza con fuentes y estatuas por todas partes! Como Roma es una ciudad grande, ¡en algunos tramos os convendrá caminar rápido o coger el metro! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "Rome's essential route brings together the great symbols of almost three thousand years of unbroken history. You'll start at the Colosseum, the most famous amphitheatre in the world, continue through the Roman Forum and the Palatine Hill, the political heart and residential quarter of ancient Rome, and cross over to the Pantheon, the largest unreinforced concrete dome ever built. You'll finish by tossing a coin into the Trevi Fountain and getting lost among the Bernini columns of Piazza Navona. Since this is a long route, some stretches are best covered by metro or at a brisk pace. By the end you'll understand why Rome is called the Eternal City: few places in the world let you walk, in a single morning, through the Empire, the Renaissance, and the Baroque without leaving the same old town. Tap each stop on the map to see the specific information for that spot.",
            kids: "Get ready for Rome's biggest adventure! ⚔️ You'll go into a giant amphitheatre where gladiators once fought, walk through the ruins of the most important square in the Roman Empire, and visit a temple with a stone dome so huge it still amazes architects today. Then you'll toss a coin into a beautiful fountain so you can come back one day, and see a square with fountains and statues everywhere! Since Rome is a big city, on some stretches you'll want to walk fast or hop on the metro! Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'antigua-roma',
        name: {
          es: { adult: 'Roma Antigua e Imperial', kids: '¡El Imperio Romano! 🏛️' },
          en: { adult: 'Ancient & Imperial Rome', kids: 'The Roman Empire! 🏛️' }
        },
        color: '#B8411E',
        intro: {
          es: {
            adult: 'Esta ruta recorre el corazón del poder de la Roma imperial, del Coliseo al Circo Máximo. Verás el Arco de Constantino, el mayor de los arcos triunfales que se conservan en la ciudad, descenderás al Circo Máximo, el hipódromo que llegó a albergar a 150.000 espectadores, y visitarás la Bocca della Verità, la boca de piedra que, según la leyenda, muerde la mano de quien miente. Terminarás en las Terme di Caracalla, unas termas públicas tan colosales que hoy acogen conciertos de ópera entre sus ruinas. Al acabar habrás recorrido a pie los mismos escenarios que vieron desfilar emperadores, gladiadores y carreras de cuadrigas hace dos mil años. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al corazón del Imperio Romano! 🏛️ Vas a ver el arco más grande de todos los que quedan en Roma, bajar hasta un hipódromo gigante donde corrían carreras de carros con caballos delante de 150.000 personas, y meter la mano en una boca de piedra que, según la leyenda, ¡muerde a quien dice mentiras! Terminarás en unas termas romanas tan enormes que hoy hacen conciertos dentro de sus ruinas. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route covers the heart of imperial Roman power, from the Colosseum to the Circus Maximus. You'll see the Arch of Constantine, the largest surviving triumphal arch in the city, walk down to the Circus Maximus, the hippodrome that once held 150,000 spectators, and visit the Bocca della Verità, the stone mouth that, according to legend, bites the hand of anyone who lies. You'll finish at the Baths of Caracalla, public baths so colossal that opera concerts are held among their ruins today. By the end you'll have walked, on foot, the very grounds that saw emperors, gladiators, and chariot races parade by two thousand years ago. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route takes you to the heart of the Roman Empire! 🏛️ You'll see the biggest arch still standing in Rome, go down to a giant hippodrome where chariot races once ran in front of 150,000 people, and put your hand inside a stone mouth that, legend says, bites anyone who tells lies! You'll finish at Roman baths so enormous that concerts are held inside their ruins today. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'trastevere',
        name: {
          es: { adult: 'Trastevere y la Roma Escondida', kids: '¡El Barrio Secreto del Río! 🌊' },
          en: { adult: 'Trastevere & Hidden Rome', kids: 'The Secret River Neighbourhood! 🌊' }
        },
        color: '#10B981',
        intro: {
          es: {
            adult: 'Esta ruta cruza al otro lado del Tíber, a Trastevere, el barrio más castizo y menos monumental de Roma, perfecto para perderse sin prisa. Pasarás por la Isola Tiberina, la única isla del río dentro de la ciudad, entrarás en la Basílica de Santa Maria in Trastevere, una de las iglesias más antiguas dedicadas a la Virgen, subirás hasta el Gianicolo, un mirador con las mejores vistas de toda Roma, y terminarás en la Villa Farnesina, la villa renacentista de un banquero decorada por el propio Rafael. Al terminar habrás descubierto que, a solo unos minutos a pie de los grandes monumentos, Roma esconde callejuelas empedradas, plazas con fuentes modestas y una vida de barrio que apenas ha cambiado en siglos. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta es un poco secreta! 🌊 Vas a cruzar a un barrio con calles estrechas y empedradas, pasar por la única isla que tiene el río de Roma, entrar en una de las iglesias más antiguas dedicadas a la Virgen, subir a una colina con las mejores vistas de toda la ciudad, y terminar en una villa preciosa decorada por el propio Rafael. Al final habrás descubierto un Roma tranquilo que casi ningún turista con prisa llega a ver. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route crosses to the other side of the Tiber, to Trastevere, Rome's most traditional and least monumental neighbourhood, perfect for wandering without a plan. You'll pass by the Isola Tiberina, the river's only island within the city, go into the Basilica of Santa Maria in Trastevere, one of the oldest churches dedicated to the Virgin Mary, climb up to the Gianicolo, a viewpoint with the best views over all of Rome, and finish at the Villa Farnesina, the Renaissance villa of a banker decorated by Raphael himself. By the end you'll have discovered that, just minutes on foot from the great monuments, Rome hides cobbled alleys, squares with modest fountains, and a neighbourhood life that has barely changed in centuries. Tap each stop on the map to see the specific information for that spot.",
            kids: "This route is a little bit secret! 🌊 You'll cross into a neighbourhood with narrow, cobbled streets, pass by the only island in Rome's river, go into one of the oldest churches dedicated to the Virgin Mary, climb a hill with the best views of the whole city, and finish at a beautiful villa decorated by Raphael himself. By the end you'll have discovered a quiet Rome that hardly any rushed tourist ever gets to see. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  vaticano: {
    id: 'vaticano',
    name: 'Vaticano',
    country: 'Vaticano',
    continent: 'Europa',
    subtitle: {
      es: { adult: 'El Estado más pequeño del mundo', kids: '¡El País Más Pequeño del Mundo! 🕊️' },
      en: { adult: 'The smallest state in the world', kids: 'The Smallest Country in the World! 🕊️' }
    },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido al Vaticano, el país más pequeño del mundo. En este paseo entrarás en la Basílica de San Pedro, la iglesia más grande del mundo, y en la Capilla Sixtina, pintada por Miguel Ángel. ¡Descubre un país dentro de una ciudad!',
        kids: '¡Bienvenido al país más pequeño del mundo entero! Vas a entrar en la iglesia más grande del planeta y ver un techo pintado a mano que tardó años en terminarse. ¡Prepárate para descubrir tesoros increíbles en muy poquito espacio!'
      },
      en: {
        adult: "Welcome to Vatican City, the smallest country in the world. On this walk you'll step inside St. Peter's Basilica, the largest church in the world, and the Sistine Chapel, painted by Michelangelo. Discover a country within a city!",
        kids: "Welcome to the smallest country in the whole world! You're going to step inside the biggest church on the planet and see a hand-painted ceiling that took years to finish. Get ready to discover incredible treasures packed into a tiny space!"
      }
    },
    // ~50% del máximo real del Vaticano (3 POIs con quiz × 30 = 90 posibles).
    badgeThreshold: 45,
    badgeImg: 'assets/badges/vaticano.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg/330px-St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg',
    center: [41.9025, 12.4595],
    zoom: 15.6,
    minZoom: 14,
    // Solo la Plaza de San Pedro, la Basílica y los Museos Vaticanos: el
    // territorio real del Estado del Vaticano. Castel Sant'Angelo y su
    // puente quedan fuera de esas fronteras (son territorio de Roma), así
    // que viven en roma.js aunque estén a un paso de aquí.
    bounds: [[41.898, 12.449], [41.907, 12.470]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F5C518',
        intro: {
          es: {
            adult: 'La ruta imprescindible del Vaticano recorre el Estado más pequeño del mundo, apenas 0,44 km² con más historia y arte por metro cuadrado que casi cualquier otro lugar del planeta. Empezarás en la Plaza de San Pedro, abrazada por la columnata de Bernini, entrarás en la Basílica de San Pedro, el templo católico más grande del mundo, y visitarás los Museos Vaticanos y la Capilla Sixtina, con el techo pintado por Miguel Ángel. Terminarás cruzando hacia el Castel Sant\'Angelo, el antiguo mausoleo de Adriano convertido en fortaleza papal, y el Ponte Sant\'Angelo, decorado con ángeles de Bernini. Al acabar habrás visto cómo, en apenas un kilómetro, conviven la sede de la Iglesia católica, una de las mayores colecciones de arte del mundo y un mausoleo imperial romano reconvertido en fortaleza. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al país más pequeño del mundo entero! 🕊️ Vas a entrar en la iglesia más grande de todo el planeta, visitar un museo con un techo pintado a mano que tardó años en terminarse, y cruzar hasta un castillo que antes fue la tumba de un emperador romano, pasando por un puente con estatuas de ángeles. Al final habrás visto en un solo paseo la iglesia más grande del mundo y algunas de las obras de arte más famosas de la historia. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: 'The unmissable route through Vatican City covers the smallest state in the world — barely 0.44 km², yet packed with more history and art per square meter than almost anywhere else on the planet. You\'ll start at St. Peter\'s Square, embraced by Bernini\'s colonnade, step inside St. Peter\'s Basilica, the largest Catholic church in the world, and visit the Vatican Museums and the Sistine Chapel, with its ceiling painted by Michelangelo. You\'ll finish by crossing over to Castel Sant\'Angelo, the ancient mausoleum of Hadrian turned papal fortress, and the Ponte Sant\'Angelo, decorated with Bernini\'s angels. By the end you\'ll have seen how, in barely a kilometer, the seat of the Catholic Church, one of the greatest art collections in the world, and an imperial Roman mausoleum turned fortress all sit side by side. Tap each stop on the map to see specific information about that spot.',
            kids: 'This route takes you to the smallest country in the whole world! 🕊️ You\'ll step inside the biggest church on the entire planet, visit a museum with a hand-painted ceiling that took years to finish, and cross over to a castle that used to be a Roman emperor\'s tomb, passing over a bridge decorated with angel statues. By the end you\'ll have seen, in a single walk, the biggest church in the world and some of the most famous artworks in history. Tap each point on the map to discover everything about that spot!'
          }
        }
      }
    ]
  },

  estambul: {
    id: 'estambul',
    name: 'Estambul',
    country: 'Turquía',
    continent: 'Europa',
    subtitle: {
      es: { adult: 'Donde Europa y Asia se dan la mano', kids: '¡La Única Ciudad en Dos Continentes! 🌍' },
      en: { adult: 'Where Europe and Asia shake hands', kids: 'The Only City on Two Continents! 🌍' }
    },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Estambul, la única ciudad del mundo repartida entre dos continentes. En este paseo cruzarás entre Santa Sofía y la Mezquita Azul, te perderás en el Gran Bazar y hasta podrás cruzar en barco hasta Asia. ¡Prepárate para una ciudad única!',
        kids: '¡Bienvenido a Estambul, la única ciudad del mundo repartida en dos continentes! Vas a ver una catedral que se convirtió en mezquita, perderte en un mercado con miles de tiendas, ¡y hasta cruzar en barco hasta Asia! Prepárate para la aventura más grande de todas.'
      },
      en: {
        adult: "Welcome to Istanbul, the only city in the world split across two continents. On this walk you'll cross between Hagia Sophia and the Blue Mosque, get lost in the Grand Bazaar, and even take a boat across to Asia. Get ready for a one-of-a-kind city!",
        kids: "Welcome to Istanbul, the only city in the world split between two continents! You'll see a cathedral that became a mosque, get lost in a market with thousands of shops, and even cross by boat to Asia! Get ready for the biggest adventure of all."
      }
    },
    // ~50% del máximo real de Estambul (59 POIs con quiz × 10 = 590 posibles).
    badgeThreshold: 295,
    badgeImg: 'assets/badges/estambul.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/330px-Hagia_Sophia_%28228968325%29.jpeg',
    center: [41.015, 28.978],
    zoom: 12.6,
    minZoom: 11,
    // Cubre la península histórica, Gálata/Beyoğlu, ambas orillas del
    // Bósforo (fortalezas de Rumeli/Anadolu al norte) y un núcleo del lado
    // asiático (Üsküdar, Beylerbeyi, Çamlıca, Kadıköy/Moda).
    bounds: [[40.985, 28.915], [41.100, 29.080]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta imprescindible de Estambul reúne los grandes símbolos de la única ciudad del mundo repartida entre dos continentes. Empezarás frente a frente entre Santa Sofía, catedral bizantina convertida en mezquita otomana y de nuevo en mezquita, y la Mezquita Azul, con sus seis minaretes y miles de azulejos de Iznik. Bajarás a la Cisterna Basílica, un bosque de columnas bizantinas bajo tierra, y te perderás entre las callejuelas cubiertas del Gran Bazar y el aromático Bazar de las Especias. Subirás hasta la Mezquita de Süleymaniye, obra maestra del arquitecto Sinan, cruzarás el Cuerno de Oro hasta la Torre de Gálata, y terminarás en la orilla del Bósforo, frente al Palacio de Dolmabahçe y la Mezquita de Ortaköy, con el puente que une Europa y Asia de fondo. Al acabar habrás visto por qué Estambul fue, sucesivamente, capital de dos imperios milenarios. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Prepárate para la aventura más grande de todas: una ciudad repartida entre dos continentes! 🌍 Vas a entrar en una iglesia gigante que se convirtió en mezquita, luego en museo, ¡y ahora vuelve a ser mezquita! Justo enfrente verás otra mezquita con seis torres puntiagudas y miles de azulejos azules. Bajarás a una cisterna secreta bajo tierra, llena de columnas y hasta dos cabezas de piedra con forma de Medusa. Te perderás en un mercado gigantesco con miles de tiendas y en otro lleno de especias de colores. Subirás a una torre genovesa altísima y terminarás junto al Bósforo, frente a un palacio con una lámpara de cristal enorme y una mezquita pegadita al agua. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "The unmissable route through Istanbul brings together the great symbols of the only city in the world split between two continents. You'll start face to face between Hagia Sophia, a Byzantine cathedral turned Ottoman mosque, then museum, then mosque again, and the Blue Mosque, with its six minarets and thousands of İznik tiles. You'll descend into the Basilica Cistern, an underground forest of Byzantine columns, and lose yourself in the covered alleys of the Grand Bazaar and the fragrant Spice Bazaar. You'll climb up to the Süleymaniye Mosque, a masterpiece by the architect Sinan, cross the Golden Horn to the Galata Tower, and finish on the Bosphorus shore, facing Dolmabahçe Palace and the Ortaköy Mosque, with the bridge linking Europe and Asia in the background. By the end you'll have seen why Istanbul was, in succession, the capital of two thousand-year empires. Tap each stop on the map to see specific information about that spot.",
            kids: "Get ready for the biggest adventure of all: a city split between two whole continents! 🌍 You'll step inside a giant church that became a mosque, then a museum, and now it's a mosque again! Right across from it you'll see another mosque with six pointy towers and thousands of blue tiles. You'll go down into a secret underground cistern full of columns, including two stone heads shaped like Medusa. You'll get lost in a giant market with thousands of shops, and another one full of colorful spices. You'll climb a tall Genoese tower and finish by the Bosphorus, facing a palace with a huge crystal chandelier and a mosque sitting right on the water. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'peninsula',
        name: {
          es: { adult: 'Sultanahmet y la Península Histórica', kids: '¡El Estambul Más Antiguo! 🏛️' },
          en: { adult: 'Sultanahmet and the Historic Peninsula', kids: 'The Oldest Istanbul! 🏛️' }
        },
        color: '#B8411E',
        intro: {
          es: {
            adult: 'Esta ruta profundiza en la península histórica más allá de los grandes iconos, siguiendo casi 1.600 años de historia romana, bizantina y otomana. Empezarás en el antiguo Hipódromo de Constantinopla, con sus tres monumentos originales todavía en pie, visitarás los Museos Arqueológicos y el Museo de Artes Turcas e Islámicas, y descubrirás la Cisterna de Binbirdirek, la "hermana pequeña" de la Basílica. Seguirás hasta la Mezquita Nueva y la escondida Mezquita de Rüstem Bajá, forrada por dentro de azulejos de Iznik, pasarás bajo el Acueducto de Valente, construido por los romanos en el siglo IV, y terminarás en la Iglesia de Cora, con algunos de los mosaicos bizantinos mejor conservados del mundo, y en las murallas de Teodosio, que protegieron la ciudad durante más de mil años. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva por la parte más antigua de Estambul! 🏛️ Vas a ver un antiguo hipódromo romano con un obelisco egipcio de verdad, entrar en museos con tesoros de hace miles de años, y bajar a otra cisterna secreta bajo tierra. Descubrirás una mezquita pequeñita escondida entre tiendas, ¡pero cubierta por dentro de azulejos preciosos! Pasarás bajo un acueducto romano gigante que todavía sigue en pie, y terminarás en una iglesia con mosaicos dorados que tienen casi 700 años, y junto a una muralla que protegió la ciudad durante más de mil años seguidos. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route digs deeper into the historic peninsula beyond the headline icons, following almost 1,600 years of Roman, Byzantine and Ottoman history. You'll start at the ancient Hippodrome of Constantinople, with its three original monuments still standing, visit the Archaeology Museums and the Museum of Turkish and Islamic Arts, and discover the Cistern of Binbirdirek, the \"little sister\" of the Basilica Cistern. You'll continue to the New Mosque and the hidden Rüstem Pasha Mosque, lined inside with İznik tiles, pass beneath the Valens Aqueduct, built by the Romans in the 4th century, and finish at the Chora Church, home to some of the best-preserved Byzantine mosaics in the world, and at the Theodosian Walls, which protected the city for over a thousand years. Tap each stop on the map to see specific information about that spot.",
            kids: "This route takes you through the oldest part of Istanbul! 🏛️ You'll see an ancient Roman hippodrome with a real Egyptian obelisk, step into museums full of treasures thousands of years old, and go down into another secret underground cistern. You'll discover a tiny mosque hidden among shops, but covered inside with gorgeous tiles! You'll walk under a giant Roman aqueduct still standing today, and finish at a church with golden mosaics almost 700 years old, next to a wall that protected the city for over a thousand years straight. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'galata',
        name: {
          es: { adult: 'Gálata, Beyoğlu y el Cuerno de Oro', kids: '¡El Barrio Internacional! 🎭' },
          en: { adult: 'Galata, Beyoğlu and the Golden Horn', kids: 'The International Quarter! 🎭' }
        },
        color: '#7C3AED',
        intro: {
          es: {
            adult: 'Esta ruta cruza al lado europeo "moderno" de Estambul, el antiguo barrio genovés de Gálata y el cosmopolita Beyoğlu. Empezarás en el monasterio de los derviches giróvagos de Gálata, seguirás por la Avenida Istiklal y su tranvía histórico, y te asomarás al Pasaje de las Flores y al Mercado de Pescado. Visitarás el Hotel Pera Palace, construido para los pasajeros del Orient Express, y el Museo Pera, con su famoso cuadro del domador de tortugas, cruzarás la Plaza de Taksim y descubrirás el antiguo Banco Otomano en Karaköy, antes de terminar en la Mezquita de Kılıç Ali Bajá, obra tardía del arquitecto Sinan. Al acabar habrás visto el Estambul europeo, cosmopolita y de embajadas que convivió, calle con calle, con el Estambul otomano de la península. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva al barrio más internacional de Estambul! 🎭 Vas a visitar un antiguo monasterio donde unos monjes especiales bailaban dando vueltas y vueltas, caminar por una avenida larguísima con un tranvía rojo de hace más de 100 años, y curiosear en un mercado de pescado con mucho ambiente. Entrarás en un hotel donde paraban los pasajeros de un tren muy famoso, verás un cuadro gigante de un hombre entrenando tortugas, y cruzarás una plaza enorme. Terminarás en un antiguo banco convertido en museo y en una mezquita construida por un almirante. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route crosses over to Istanbul's \"modern\" European side, the old Genoese neighborhood of Galata and cosmopolitan Beyoğlu. You'll start at the whirling dervish lodge of Galata, continue along İstiklal Avenue and its historic tram, and step into the Flower Passage and the Fish Market. You'll visit the Pera Palace Hotel, built for Orient Express passengers, and the Pera Museum, home to the famous painting of the tortoise trainer, cross Taksim Square and discover the old Ottoman Bank in Karaköy, before finishing at the Kılıç Ali Pasha Mosque, a late work by the architect Sinan. By the end you'll have seen the cosmopolitan, embassy-filled European Istanbul that lived, street by street, alongside the Ottoman Istanbul of the peninsula. Tap each stop on the map to see specific information about that spot.",
            kids: "This route takes you to Istanbul's most international neighborhood! 🎭 You'll visit an old lodge where special monks used to dance by spinning round and round, walk along a very long avenue with a red tram from over 100 years ago, and browse a lively fish market. You'll step into a hotel where passengers from a very famous train used to stay, see a giant painting of a man training tortoises, and cross a huge square. You'll finish at an old bank turned into a museum and at a mosque built by an admiral. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'bosforo',
        name: {
          es: { adult: 'El Bósforo: Palacios y Fortalezas', kids: '¡La Ruta del Estrecho! 🚢' },
          en: { adult: 'The Bosphorus: Palaces and Fortresses', kids: 'The Strait Route! 🚢' }
        },
        color: '#0EA5E9',
        intro: {
          es: {
            adult: 'Una ruta que navega la orilla europea del Bósforo, del último gran palacio otomano a la fortaleza que hizo posible la conquista de Constantinopla. Empezarás junto al Palacio de Dolmabahçe y su torre del reloj, seguirás hasta el Palacio de Çırağan, hoy convertido en hotel de lujo, y el tranquilo barrio de Bebek. Terminarás en la Fortaleza de Rumeli, construida en apenas cuatro o cinco meses en 1452 para preparar el asedio otomano de 1453, y en su fortaleza gemela, Anadolu Hisarı, ya en la orilla asiática. Muchos tramos de esta ruta se recorren mejor en ferry: un crucero por el Bósforo desde Eminönü te permite ver, del tirón, palacios, fortalezas y pueblos pesqueros por los que ninguna carretera pasa directamente. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta navega por el Bósforo, el estrecho que separa Europa de Asia! 🚢 Vas a ver un reloj gigante junto a un palacio, y otro palacio junto al mar que ahora es un hotel de lujo. Pasarás por un barrio tranquilo con vistas al otro continente, y terminarás en una fortaleza que se construyó ¡en solo cuatro meses! para ayudar a conquistar la ciudad hace más de 500 años, con su fortaleza gemela justo enfrente, en la otra orilla. Para ver bien esta ruta, ¡lo mejor es subirse a un ferry! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "A route that sails along the Bosphorus's European shore, from the last great Ottoman palace to the fortress that made the conquest of Constantinople possible. You'll start beside Dolmabahçe Palace and its clock tower, continue to Çırağan Palace, today a luxury hotel, and the quiet neighborhood of Bebek. You'll finish at Rumeli Fortress, built in just four or five months in 1452 to prepare the Ottoman siege of 1453, and its twin fortress, Anadolu Hisarı, on the Asian shore. Many stretches of this route are best covered by ferry: a Bosphorus cruise from Eminönü lets you see, in one go, palaces, fortresses and fishing villages that no road passes directly. Tap each stop on the map to see specific information about that spot.",
            kids: "This route sails along the Bosphorus, the strait that separates Europe from Asia! 🚢 You'll see a giant clock next to a palace, and another palace by the sea that's now a luxury hotel. You'll pass through a quiet neighborhood with views of the other continent, and finish at a fortress that was built in just four months to help conquer the city over 500 years ago, with its twin fortress right across the water. The best way to see this route is to hop on a ferry! Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'asia',
        name: {
          es: { adult: 'Estambul de Asia', kids: '¡El Otro Continente! 🌏' },
          en: { adult: 'Asian Istanbul', kids: 'The Other Continent! 🌏' }
        },
        color: '#16A34A',
        intro: {
          es: {
            adult: 'La única ruta de toda la app que cruza a otro continente. Un ferry desde el lado europeo te deja en Üsküdar, con su mezquita construida por la hija de Solimán el Magnífico, y en la diminuta Torre de la Doncella, sobre un islote a la entrada del Bósforo. Seguirás hasta el Palacio de Beylerbeyi, donde un sultán depuesto pasó sus últimos años, subirás a Çamlıca, el punto más alto de Estambul, y bajarás hasta Kadıköy, el barrio con más ambiente de la orilla asiática, asentado sobre la antigua ciudad griega de Calcedonia. Al terminar podrás decir que has estado, en el mismo día, en Europa y en Asia, algo que solo es posible en esta ciudad. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta es la única ruta de toda la app donde cambias de continente! 🌏 Un ferry te lleva hasta Asia, donde verás una mezquita construida por la hija de un sultán muy famoso, y una torre diminuta en mitad del mar con leyendas de princesas y dragones. Subirás a la colina más alta de toda Estambul, con vistas increíbles, y terminarás en un barrio lleno de mercados y ambiente. Al acabar podrás contar que en un mismo día ¡has estado en dos continentes distintos! ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "The only route in the whole app that crosses into another continent. A ferry from the European side drops you in Üsküdar, with its mosque built by the daughter of Suleiman the Magnificent, and at the tiny Maiden's Tower, on an islet at the mouth of the Bosphorus. You'll continue to Beylerbeyi Palace, where a deposed sultan spent his final years, climb up to Çamlıca, Istanbul's highest point, and head down to Kadıköy, the liveliest neighborhood on the Asian shore, built over the ancient Greek city of Chalcedon. By the end you'll be able to say you've stood, on the same day, in both Europe and Asia — something only possible in this city. Tap each stop on the map to see specific information about that spot.",
            kids: "This is the only route in the whole app where you switch continents! 🌏 A ferry takes you to Asia, where you'll see a mosque built by a famous sultan's daughter, and a tiny tower in the middle of the sea with legends about princesses and dragons. You'll climb Istanbul's highest hill, with incredible views, and finish in a lively neighborhood full of markets. By the end you'll be able to say that in a single day, you've stood on two different continents! Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  },

  segovia: {
    id: 'segovia',
    name: 'Segovia',
    country: 'España',
    continent: 'Europa',
    subtitle: {
      es: { adult: 'La ciudad del acueducto y los cuentos de hadas', kids: '¡La Ciudad del Acueducto Mágico! 🏰' },
      en: { adult: 'The city of the aqueduct and fairy tales', kids: 'The City of the Magic Aqueduct! 🏰' }
    },
    welcomeIntro: {
      es: {
        adult: 'Bienvenido a Segovia, la ciudad de un acueducto romano que lleva casi dos mil años en pie. En este paseo subirás al Alcázar, el castillo de cuento donde se proclamó reina a Isabel la Católica. ¡Ven a descubrir una ciudad Patrimonio de la Humanidad!',
        kids: '¡Bienvenido a Segovia, la ciudad del acueducto mágico! Tiene casi 2.000 años y se sostiene sin pegamento ni cemento. Vas a subir a un castillo que parece de cuento de hadas y descubrir calles llenas de historia. ¡Prepárate para la aventura!'
      },
      en: {
        adult: "Welcome to Segovia, home to a Roman aqueduct that has stood for almost two thousand years. On this walk you'll climb up to the Alcázar, the fairy-tale castle where Isabella of Castile was crowned queen. Come discover a UNESCO World Heritage city!",
        kids: "Welcome to Segovia, the city of the magic aqueduct! It's almost 2,000 years old and stands without any glue or cement. You'll climb up to a castle straight out of a fairy tale and discover streets full of history. Get ready for the adventure!"
      }
    },
    // ~50% del máximo real de Segovia (39 POIs con quiz × 10 = 390 posibles).
    badgeThreshold: 195,
    badgeImg: 'assets/badges/segovia.png',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Aqueduct_of_Segovia_08.jpg/330px-Aqueduct_of_Segovia_08.jpg',
    center: [40.9505, -4.1200],
    zoom: 15.4,
    minZoom: 13.5,
    // Cubre todo el casco histórico amurallado, el Alcázar y el valle del
    // Eresma (Vera Cruz, El Parral, la Pradera de San Marcos) al oeste.
    bounds: [[40.944, -4.140], [40.960, -4.106]],
    routes: [
      {
        id: 'main',
        name: {
          es: { adult: 'Recomendaciones', kids: '¡Lo Top! 🚩' },
          en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' }
        },
        color: '#F59E0B',
        intro: {
          es: {
            adult: 'La ruta imprescindible de Segovia reúne los grandes símbolos de esta ciudad amurallada sobre una roca entre dos ríos. Empezarás bajo el Acueducto Romano, que sigue en pie sin una gota de mortero desde hace casi dos mil años, subirás hasta el Alcázar, el castillo de cuento que vio proclamarse reina a Isabel la Católica, y visitarás la Catedral, la última gran catedral gótica construida en España. Cruzarás la Plaza Mayor, verás la fachada cubierta de picos de piedra de la Casa de los Picos, y terminarás en la antigua Sinagoga Mayor, hoy convertida en iglesia, y en las calles de la Judería. Al acabar habrás visto por qué Segovia entera es Patrimonio de la Humanidad. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Prepárate para la ruta más top de Segovia! 🏰 Vas a pasar bajo un acueducto romano gigante que se sostiene sin pegamento ni cemento desde hace casi 2.000 años, subir a un castillo que parece sacado de un cuento de hadas, y entrar en una catedral altísima. Cruzarás una plaza mayor preciosa, verás una casa cubierta de piedras con forma de pirámide, y terminarás en una antigua sinagoga convertida en iglesia. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "The unmissable route through Segovia brings together the great symbols of this walled city perched on a rock between two rivers. You'll start beneath the Roman Aqueduct, still standing without a single drop of mortar after almost two thousand years, climb up to the Alcázar, the fairy-tale castle where Isabella of Castile was proclaimed queen, and visit the Cathedral, the last great Gothic cathedral built in Spain. You'll cross Plaza Mayor, see the stone-studded facade of the Casa de los Picos, and finish at the old Main Synagogue, today a church, and the streets of the Jewish Quarter. By the end you'll have seen why the whole of Segovia is a UNESCO World Heritage Site. Tap each stop on the map to see specific information about that spot.",
            kids: "Get ready for Segovia's top route! 🏰 You'll walk under a giant Roman aqueduct that has stood without any glue or cement for almost 2,000 years, climb up to a castle that looks straight out of a fairy tale, and step inside a very tall cathedral. You'll cross a beautiful main square, see a house covered in pyramid-shaped stones, and finish at an old synagogue turned into a church. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'juderia',
        name: {
          es: { adult: 'Judería y Murallas', kids: '¡El Segovia Amurallado! 🕍' },
          en: { adult: 'Jewish Quarter and City Walls', kids: 'Walled Segovia! 🕍' }
        },
        color: '#8B5CF6',
        intro: {
          es: {
            adult: 'Esta ruta recorre la Segovia amurallada y judía, menos fotografiada que los grandes monumentos pero igual de fascinante. Caminarás junto a la muralla medieval que rodea toda la ciudad vieja, cruzarás las puertas de San Andrés y de Santiago, y te adentrarás en las calles estrechas de la antigua Judería, donde vivió una de las comunidades judías más importantes de Castilla hasta la expulsión de 1492. Visitarás el Torreón de Lozoya y la Plaza de San Martín, y descubrirás un cementerio judío en la ladera de El Pinarillo. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta te lleva por el Segovia amurallado y judío! 🕍 Vas a caminar junto a una muralla que rodea toda la ciudad, cruzar puertas de piedra con casi 1.000 años, y perderte por callejuelas estrechitas donde vivió una comunidad judía muy importante hace siglos. Visitarás una torre-casa medieval y una plaza preciosa, y descubrirás un cementerio muy antiguo en una colina. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route explores walled, Jewish Segovia, less photographed than the great monuments but just as fascinating. You'll walk alongside the medieval wall that encircles the whole old town, pass through the San Andrés and Santiago gates, and wander the narrow streets of the old Jewish Quarter, home to one of Castile's most important Jewish communities until the 1492 expulsion. You'll visit the Torreón de Lozoya and Plaza de San Martín, and discover a Jewish cemetery on the El Pinarillo hillside. Tap each stop on the map to see specific information about that spot.",
            kids: "This route takes you through walled, Jewish Segovia! 🕍 You'll walk alongside a wall that circles the whole city, pass through stone gates almost 1,000 years old, and get lost in narrow little streets where a very important Jewish community lived centuries ago. You'll visit a medieval tower-house and a beautiful square, and discover a very old cemetery on a hillside. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'valle',
        name: {
          es: { adult: 'Valle del Eresma', kids: '¡El Valle del Río! 🌳' },
          en: { adult: 'Eresma Valley', kids: 'The River Valley! 🌳' }
        },
        color: '#10B981',
        intro: {
          es: {
            adult: 'Esta ruta baja desde la ciudad amurallada hasta el valle del río Eresma, donde Segovia esconde algunos de sus rincones más tranquilos. Visitarás la Iglesia de la Vera Cruz, un templo románico de doce lados vinculado a los templarios, y el Monasterio de El Parral, fundado en el siglo XV junto al río. Cruzarás un puente de piedra con vistas al Alcázar desde abajo, y terminarás en la Pradera de San Marcos, el mirador clásico de las postales de Segovia. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Esta ruta baja hasta el valle del río, justo debajo del castillo! 🌳 Vas a ver una iglesia con doce lados, muy rara, relacionada con caballeros templarios, y un monasterio junto al río de hace más de 500 años. Cruzarás un puente de piedra con una vista alucinante del castillo desde abajo, y terminarás en un prado donde se hacen las fotos más bonitas de Segovia. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "This route drops down from the walled city to the valley of the Eresma river, where Segovia hides some of its quietest corners. You'll visit the Iglesia de la Vera Cruz, a twelve-sided Romanesque church linked to the Knights Templar, and the Monasterio de El Parral, founded in the 15th century beside the river. You'll cross a stone bridge with views up at the Alcázar from below, and finish at the Pradera de San Marcos, the classic postcard viewpoint of Segovia. Tap each stop on the map to see specific information about that spot.",
            kids: "This route goes down into the river valley, right below the castle! 🌳 You'll see a very unusual twelve-sided church linked to Templar knights, and a monastery by the river that's over 500 years old. You'll cross a stone bridge with an amazing view of the castle from below, and finish in a meadow where Segovia's most beautiful postcard photos are taken. Tap each point on the map to discover everything about that spot!"
          }
        }
      },
      {
        id: 'romanico',
        name: {
          es: { adult: 'Segovia Románica', kids: '¡Las Iglesias Antiguas! ⛪' },
          en: { adult: 'Romanesque Segovia', kids: 'The Ancient Churches! ⛪' }
        },
        color: '#B8411E',
        intro: {
          es: {
            adult: 'Segovia tiene casi veinte iglesias románicas, una concentración enorme para una ciudad de su tamaño, y esta ruta recorre las más destacadas. Verás la torre de San Esteban, considerada una de las más bellas de España, el pórtico casi completo de San Martín, las pinturas murales medievales de San Justo, y la antigua iglesia de San Quirce, hoy reconvertida en sala de exposiciones. Al acabar habrás entendido por qué Segovia es, junto a su acueducto y su alcázar, también una capital del románico. Toca cada parada en el mapa para ver la información específica de ese lugar.',
            kids: '¡Segovia tiene casi veinte iglesias de hace 800 años, muchísimas para una ciudad tan pequeña! ⛪ Vas a ver una torre altísima considerada una de las más bonitas de España, un pórtico casi completo con columnas talladas, unas pinturas antiguas escondidas dentro de una iglesia, y otra iglesia que ya no se usa para rezar, ¡sino para exposiciones! Al final sabrás que Segovia no solo tiene un acueducto y un castillo, sino también un montón de iglesias antiquísimas. ¡Toca cada punto del mapa para descubrir todo sobre ese sitio!'
          },
          en: {
            adult: "Segovia has nearly twenty Romanesque churches, an extraordinary concentration for a city its size, and this route covers the most notable ones. You'll see the tower of San Esteban, considered one of the most beautiful in Spain, the almost-complete portico of San Martín, the medieval murals of San Justo, and the former church of San Quirce, today converted into an exhibition space. By the end you'll understand why Segovia is, alongside its aqueduct and its Alcázar, also a capital of Romanesque architecture. Tap each stop on the map to see specific information about that spot.",
            kids: "Segovia has almost twenty churches that are 800 years old, an incredible number for such a small city! ⛪ You'll see a super tall tower considered one of the most beautiful in Spain, an almost-complete porch with carved columns, old paintings hidden inside a church, and another church that isn't used for prayer anymore, but for exhibitions! By the end you'll know that Segovia has not just an aqueduct and a castle, but also a whole bunch of ancient churches. Tap each point on the map to discover everything about that spot!"
          }
        }
      }
    ]
  }
};

const AI_PROMPTS = {
  summary: {
    adult: (p, cityName) =>
      `Un recorrido extenso y detallado por ${pick(p.name, 'adult')}, resaltando por qué es imprescindible en ${cityName}: datos clave, época, contexto histórico y un detalle sorprendente. Unas 190-220 palabras (equivalente a un minuto largo hablado), en varios párrafos. Tono: experto pero cercano.`,
    kids: (p, cityName) =>
      `Presenta ${pick(p.name, 'kids')} a un niño de 8 años: qué es, por qué mola, dos o tres datos súper curiosos y una mini-challenge interactiva que pueda hacer allí. Unas 190-220 palabras (equivalente a un minuto largo hablado, igual de largo que la versión de adultos). Usa emojis y tono divertido, no lo resumas demasiado.`
  },
  options: [
    {
      id: 'secret-history',
      label: {
        es: { adult: 'Historia secreta', kids: 'Historia secreta' },
        en: { adult: 'Secret history', kids: 'Secret history' }
      },
      prompt: {
        adult: (p, cityName) =>
          `Cuéntame con detalle una historia poco conocida, oscura o inesperada sobre ${pick(p.name, 'adult')} (${cityName}). Asegúrate de que sea un episodio real, poco divulgado, y desarróllalo en varios párrafos con contexto. Unas 190-220 palabras. Si conoces la fuente histórica, añádela en una frase final; si no tienes certeza de que el episodio sea real y documentado, dilo explícitamente ("no hay una fuente clara para esto" o similar) en vez de inventarte una cita o un cronista concreto.`,
        kids: (p) =>
          `¡Cuéntame con muchos detalles el secreto más chulo y misterioso de ${pick(p.name, 'kids')}! 😱 Pero que NO dé miedo, que sea de aventuras o magia. Unas 190-220 palabras (tan largo como para un adulto). Termina con un mini-juego: "¿Te atreves a buscar... allí?"`
      }
    },
    {
      id: 'architecture',
      label: {
        es: { adult: 'Arquitectura', kids: 'Trucos de arquitectura' },
        en: { adult: 'Architecture', kids: 'Architecture tricks' }
      },
      prompt: {
        adult: (p, cityName) =>
          `Analiza en profundidad la arquitectura de ${pick(p.name, 'adult')} como si fueras un guía especializado: estilo, material estrella, dimensión poco visible (bóvedas, cimentación, simetrías ocultas) y por qué esta obra es única frente a otras de ${cityName}. Unas 190-220 palabras, en varios párrafos.`,
        kids: (p) =>
          `Explícame con detalle los TRUCOS DE INGENIERO que usaron los constructores de ${pick(p.name, 'kids')} para que no se cayera en mil años! 🛠️ Menciona varias cosas que pueda ver con sus ojos. Unas 190-220 palabras (tan largo como para un adulto). Termina con un reto de observación.`
      }
    },
    {
      id: 'legends',
      label: {
        es: { adult: 'Leyendas', kids: 'Leyendas divertidas' },
        en: { adult: 'Legends', kids: 'Fun legends' }
      },
      prompt: {
        adult: (p, cityName) =>
          `Narra con detalle la leyenda más antigua y verosímil asociada a ${pick(p.name, 'adult')} de ${cityName}, dejando claro que es tradición/leyenda y no un hecho documentado (cita su origen documental solo si de verdad lo conoces, sin inventarte cronistas o fuentes concretas). Desarróllala en varios párrafos. Unas 190-220 palabras. Termina con tu interpretación: ¿qué hecho real pudo inspirarla?`,
        kids: (p) =>
          `¡Cuéntame con muchos detalles una leyenda superchula de ${pick(p.name, 'kids')} con personajes mágicos (reyes, hadas, animales parlanchines)! 🧚 Sin miedo. Unas 190-220 palabras (tan larga como para un adulto). Termina con una moraleja corta y divertida.`
      }
    }
  ],
  deepenLabel: {
    es: { adult: 'Profundiza más', kids: '¡Cuéntame más!' },
    en: { adult: 'Dig deeper', kids: 'Tell me more!' }
  },
  resetLabel: {
    es: { adult: 'Ver otros temas', kids: '¡Otras sorpresas!' },
    en: { adult: 'See other topics', kids: 'More surprises!' }
  },
  deepen: {
    adult: (p, topicLabel) =>
      `Sigue profundizando sobre ${topicLabel} en ${pick(p.name, 'adult')}. Da dos datos nuevos, más concretos y menos conocidos que no hayas mencionado antes, sin repetirte, desarrollados con detalle. Unas 150-180 palabras.`,
    kids: (p, topicLabel) =>
      `¡Sigue contándome más sobre ${topicLabel} en ${pick(p.name, 'kids')}! Dos datos nuevos y flipantes que no hayas contado antes 🤩, con detalles. Unas 150-180 palabras (tan largo como para un adulto). Termina con una pregunta para que quiera saber más.`
  }
};

const AI_TOPIC_NAMES = {
  'secret-history': { es: { adult: 'la historia secreta', kids: 'el secreto' }, en: { adult: 'the secret history', kids: 'the secret' } },
  'architecture': { es: { adult: 'la arquitectura', kids: 'los trucos de construcción' }, en: { adult: 'the architecture', kids: 'the building tricks' } },
  'legends': { es: { adult: 'las leyendas', kids: 'las leyendas' }, en: { adult: 'the legends', kids: 'the legends' } }
};

// Vive fuera del cierre de app.js, así que no tiene acceso a STATE.lang (ver
// pickLang/pickDual ahí): si el campo ya viene con el envoltorio bilingüe
// { es: {...}, en: {...} } (ver data/cities/vaticano.js), aquí siempre se
// usa español como valor por defecto — esta función solo alimenta el
// prompt de fallback para generar un resumen con IA, un camino que en la
// práctica no se usa en los POIs ya traducidos (todos tienen su propio
// tabs.history/legends/architecture escritos a mano).
function pick(obj, mode) {
  if (!obj) return '';
  const langObj = (obj.es || obj.en) ? (obj.es || obj.en) : obj;
  return langObj[mode] ?? langObj.adult ?? langObj.kids ?? '';
}
