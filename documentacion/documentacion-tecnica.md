# OnMyOwnTrip · Documentación técnica

Guía turística interactiva para Toledo: mapa con puntos de interés, modo
Adultos/Niños, ficha con audioguía narrada y un "guía IA" conversacional
que profundiza sobre cada lugar. Es una **app 100% estática** (sin
servidor propio salvo el proxy de IA opcional) pensada para GitHub Pages.

---

## 1. Estructura de archivos

```
index.html                    Estructura de la página (mapa, ficha, chat)
styles.css                    Estética oscura (ámbar=adultos / índigo=niños)
data/core.js                  Categorías, esqueleto de ciudades (sin pois[]), prompts de IA
data/cities/<id>.js           POIs de cada ciudad — cargado bajo demanda, no al arrancar
app.js                        Toda la lógica (mapa, ficha, IA, audio)
sw.js                         Service Worker: cachea shell + imágenes/ciudades ya vistas
scripts/validate-data.js      Valida data/core.js + data/cities/*.js (ids, bounds, dual...)
llm-config.example.js         Plantilla de configuración de IA (SÍ se sube a git)
llm-config.js                 Configuración real local (NO se sube, está en .gitignore)
worker/proxy.js               Código del proxy de IA (Cloudflare Worker)
worker/README.md              Guía de despliegue del proxy
.gitignore
```

No hay build step: los archivos se sirven tal cual (GitHub Pages).

---

## 2. Flujo de carga de la app

1. `index.html` carga, en orden: Leaflet (CDN), la configuración de IA
   (inline en el propio `index.html` + `llm-config.js` opcional que la
   sobreescribe), `data/core.js` y por último `app.js`. **`data/cities/<id>.js`
   NO se carga aquí**: solo contiene categorías, el esqueleto de las 4
   ciudades (metadatos + rutas, sin `pois[]`) y los prompts de IA — lo
   justo para pintar la pantalla de bienvenida y calcular la ciudad más
   cercana por geolocalización sin descargar el contenido de las 130 y
   pico paradas de golpe.
2. Al elegir ciudad (`finishOnboarding` → `selectCity` → `loadCityData` en
   `app.js`), se inyecta dinámicamente un `<script src="data/cities/<id>.js">`
   que rellena `CITIES[id].pois`. Es asíncrono: la pantalla de bienvenida
   muestra un spinner (`.onboarding-card.-loading`) mientras se descarga, y
   si falla (sin red y esa ciudad no estaba cacheada de una visita
   anterior) se avisa con un toast y no se sale de la pantalla de inicio.
3. `app.js` es un único IIFE envuelto en un `try/catch` global: si algo
   falla durante la carga, se muestra un aviso visible en pantalla en vez
   de dejar la app "en blanco" sin explicación.
4. `init()` (final de `app.js`):
   - Pinta el header y conecta los filtros / el toggle Adultos-Niños
     (`buildHeader`).
   - Inicializa el mapa Leaflet y coloca los pines (`initMap`,
     `renderMarkers`).
   - Conecta los eventos de la ficha (cerrar, play/pause, arrastrar la
     barra de progreso) y del cuadro de pregunta libre (`wireEvents`,
     `wireAiInput`).
   - Aplica el modo inicial (Adultos) y muestra un toast de bienvenida.

---

## 3. Datos (`data/core.js` + `data/cities/<id>.js`)

- **`CATEGORIES`**: `historia`, `gastronomia`, `rincones-ocultos` (+ `all`
  para el filtro "Todos").
- **`CATEGORY_META`**: etiqueta (adulto/niño) y color de acento por
  categoría.
- **`POIS`**: array de lugares. Cada uno tiene, en **dual idioma adulto /
  niño**:
  - `name`, `subtitle`, `image`, `coords`, `category`.
  - `audio.title` (título mostrado en el reproductor) y `audio.duration`
    (valor de referencia inicial; la duración real se recalcula según el
    texto que se narra en cada momento, ver §6).
  - `tabs.history` / `tabs.legends` / `tabs.architecture`: textos ya
    redactados a mano (~60-90 palabras cada uno) que la app reutiliza como
    base de la narración y de las respuestas de arquitectura/leyendas.
- **`AI_PROMPTS`**: las plantillas de instrucciones que se le mandan a una
  IA real (resumen, historia secreta, arquitectura, gastronomía cercana,
  leyendas, "profundiza más"), en dos tonos (adulto/niño) y pidiendo
  explícitamente respuestas largas (~150-220 palabras, para que la
  narración dure alrededor de 1 minuto).
- **`AI_TOPIC_NAMES`**: nombre "hablado" de cada tema, usado tanto en las
  cabeceras como al pedirle a la IA que profundice en uno concreto.

---

## 4. Mapa y pines

- **Leaflet** + teselas estándar de **OpenStreetMap** (`{s}.tile.openstreetmap.org`),
  con un filtro CSS (`--map-filter`) disponible para oscurecerlas si hiciera
  falta encajar con el tema oscuro de la app. Antes se usaban teselas de
  CartoDB Voyager, pero CARTO cerró el acceso anónimo a su servicio de
  mosaicos (ahora exige una clave de API incluso para uso básico).
- Cada POI se dibuja como un `L.divIcon` (`makePinIcon`): un círculo del
  color de su categoría con un icono SVG dibujado a mano dentro (no
  emoji, para que se vea igual en todos los sistemas): columnas para
  Historia, copa de vino para Gastronomía, llave para Rincones Ocultos.
- Al pulsar un pin (`selectPoi`) se resalta (`setSelectedMarker`), se
  centra el mapa, se abre la ficha y arranca la conversación de IA para
  ese lugar.
- Cambiar de filtro (categoría) vuelve a pintar los pines; si el POI
  activo sigue siendo visible, conserva el resaltado, y si deja de
  cumplir el filtro, la ficha se cierra sola.

---

## 5. Ficha del lugar ("bottom sheet")

Panel que sube desde abajo (`#bottomSheet`) con:
`imagen + categoría + título + subtítulo` → `chat de IA` → `chips de
sugerencias` → `campo de pregunta libre` → `reproductor de audio`.

Solo tiene dos estados (abierta/cerrada, sin estados intermedios): se
abre al tocar un pin y se cierra con la X, tocando el backdrop, la
tecla Escape, o el propio tirador superior.

---

## 6. Modo Adultos / Niños

Un único interruptor (`setStateMode`) cambia a la vez:
- El icono y texto de marca (🧭 "OnMyOwnTrip" ↔ 🚀 "OnMyOwnTrip Kids").
- El color del tema (variables CSS `--color-primary`, etc. — ámbar en
  adultos, índigo en niños).
- Las etiquetas de los filtros y el idioma/tono de todo el contenido
  (`pickDual`, usado en toda la app para elegir el texto adulto o
  infantil de cada campo).
- Si hay una ficha abierta, se vuelve a poblar en el nuevo tono.

---

## 7. Guía IA: cómo funciona la conversación

1. **Al tocar un pin**: se muestra un saludo fijo (`LLM.summaryGreet`,
   instantáneo, sin llamada a IA) y se lanza en segundo plano una
   petición de **resumen** (`ensureAiPanelInitialGreet` →
   `queueAiMessage({kind:'summary'})`).
2. **Chips de tema**: al principio se ofrecen 2-3 de los 4 temas fijos
   (`secret-history`, `architecture`, `nearby-food`, `legends`,
   definidos en `AI_PROMPTS.options`). Al elegir uno:
   - Se marca como "explorado" y pasa a ser el "tema actual"
     (`STATE.ai.currentTopic`).
   - Los chips siguientes son: **"🔍 Profundiza más"** (sigue
     ahondando en ese mismo tema) + los temas aún no explorados.
   - Cuando los 4 temas ya se han explorado, aparece un chip
     **"🔄 Ver otros temas"** que reinicia la selección.
3. **"Profundiza más"**: pide un dato nuevo sobre el tema activo. Usa
   bancos de datos **específicos por tema** (`SIM.deepenFacts`) para que
   profundizar en "gastronomía" no acabe hablando de arquitectura por
   error.
4. **Pregunta libre**: el campo de texto bajo los chips
   (`sendUserAiMessage`) envía la pregunta tal cual a la IA (o al
   simulador), sin encajarla en ningún tema prefijado.
5. En cualquiera de los casos anteriores, tocar una opción **corta el
   audio en curso al instante** (`stopAudio()`), y la respuesta nueva se
   reproduce sola en cuanto llega.
6. El título completo del lugar solo se narra **la primera vez** (el
   resumen inicial); las respuestas siguientes van directas al
   contenido, sin repetir el nombre como si fuera un titular cada vez.

---

## 8. Conector de IA (`LLM`, dentro de `app.js`) — qué APIs se consultan

Todo pasa por una única función, `LLM.generate()`, que decide entre dos
caminos:

### a) Sin API configurada → **simulador local** (`SIM`)
No hay ninguna llamada de red. Genera texto a partir de plantillas
escritas a mano (con partes elegidas al azar para variar entre visitas)
combinadas con los textos de `data/cities/<id>.js`. Es el modo por defecto y el que
usa cualquiera que abra la app sin haber configurado `window.LLM_CONFIG`.

### b) Con `window.LLM_CONFIG` definido → **IA real**
El código soporta dos formatos de API:
- **`provider: 'anthropic'`** → llama directo a
  `https://api.anthropic.com/v1/messages` (Claude).
- **`provider: 'openai'`** → llama a `{baseUrl}/chat/completions` con el
  formato de OpenAI. Como muchos proveedores son "compatibles con
  OpenAI", este mismo camino sirve, cambiando solo `baseUrl`, para:
  **Gemini**, Groq, OpenRouter, Mistral, modelos locales (Ollama/LM
  Studio), etc.

**Configuración activa actualmente**: `provider: 'openai'` apuntando al
**proxy de Cloudflare Worker** (ver §9), que a su vez llama al endpoint
compatible con OpenAI de **Google Gemini**
(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
modelo `gemini-flash-latest`).

Si la llamada a la IA real falla (sin cuota, sin red, error del
proveedor...), el código **cae automáticamente al simulador local** y
añade al final de la respuesta un aviso "⚠️ Modo offline" — nunca se
queda sin responder.

Parámetros configurables por `window.LLM_CONFIG` (ver
`llm-config.example.js`): `provider`, `baseUrl`, `apiKey`, `model`,
`maxTokens` (algunos modelos "razonadores" como Gemini 3.x gastan mucho
margen en pensamiento interno antes de escribir la respuesta visible, y
necesitan un límite más alto de lo normal) y `extraBody` (campos extra
que se añaden tal cual a la petición, p. ej. `reasoning_effort: 'low'`
para que no se corte la respuesta a medias).

---

## 9. Proxy de IA (`worker/proxy.js`) — por qué existe

Esta es una web estática pública: cualquier key escrita en su código
sería visible para quien mirara "ver código fuente". Para poder tener IA
real en la web pública **sin exponer la key**, hay un pequeño servidor
intermedio desplegado en **Cloudflare Workers** (nivel gratuito, sin
tarjeta, 100.000 peticiones/día):

1. El navegador del visitante llama al Worker (no a Gemini directamente).
2. El Worker comprueba que la petición viene del origen esperado
   (`https://onmyowntriptool.github.io` o `localhost:8791` en pruebas) —
   protección básica, no infalible, pero suficiente para un proyecto
   personal.
3. El Worker añade la key real (guardada como **Secret** en su propio
   panel de Cloudflare, nunca en el código) y reenvía la petición a
   Gemini.
4. Devuelve la respuesta de Gemini al navegador tal cual.

La key **nunca** viaja hasta el navegador del visitante. El
`window.LLM_CONFIG` que sí está en `index.html` (público) solo contiene
la URL del proxy y un `apiKey: 'proxy'` que no autentica nada real — el
Worker ignora ese valor.

---

## 10. Audio (audioguía narrada)

Usa la **Web Speech API** del propio navegador (`speechSynthesis`), no
ninguna API de pago — es gratis pero con voces menos naturales que
opciones como ElevenLabs (evaluado y descartado por ahora: su nivel
gratuito, ~10.000 caracteres/mes, se agotaría en una sola sesión de
pruebas con esta app).

Detalles relevantes:
- **Duración de la barra de progreso**: se recalcula en cada reproducción
  a partir del nº de palabras del texto real que toca narrar
  (`estimateSpeechDuration`), no de un valor fijo por lugar.
- **Sin emoji hablados**: antes de narrar, se filtran los emoji del texto
  (`stripEmojiForSpeech`) — algunos motores de voz los "leen" en voz alta
  (p. ej. 📌 como "chincheta"), lo cual sonaba roto. El chat en pantalla
  sigue mostrando los emoji con normalidad; solo se quitan para la voz.
- **Autoplay**: la respuesta se reproduce sola en cuanto llega. Como esto
  ocurre tras una espera asíncrona (no dentro del toque directo del
  usuario), en iOS Safari el primer intento puede fallar por su política
  de gestos — el botón de play queda listo para un toque manual como
  respaldo, sin mostrar un aviso de error molesto en ese caso concreto.

---

## 11. Configuración local vs. despliegue público

| Archivo | ¿Se sube a git? | Para qué |
|---|---|---|
| `llm-config.example.js` | Sí | Plantilla de ejemplo, sin ninguna key real |
| `llm-config.js` | **No** (en `.gitignore`) | Config real local, para probar otros proveedores sin tocar `index.html` |
| Config inline en `index.html` | Sí | La que usa la web pública — apunta al proxy, sin key real |

---

## 12. Despliegue

- **Web**: GitHub Pages, rama `main`, sin build step
  (`https://onmyowntriptool.github.io/OnMyOwnTrip/`).
- **Proxy de IA**: Cloudflare Workers, desplegado manualmente desde el
  panel web de Cloudflare (código en `worker/proxy.js`, guía paso a paso
  en `worker/README.md`).

---

## 12bis. Service Worker (uso con conexión intermitente)

`sw.js` cachea el shell de la app (`index.html`, `app.js`, `data/core.js`,
`styles.css`, Leaflet) y, sobre la marcha, cualquier imagen que se pida
(fotos de POIs y teselas del mapa ya vistas), para que la app siga
funcionando al caminar por zonas con mala cobertura. Se registra con
ruta **relativa** (`sw.js`, no `/sw.js`) a propósito: el scope de un
Service Worker no puede ser más amplio que la carpeta donde vive su
script, y la web se sirve bajo el subpath `/OnMyOwnTrip/` en GitHub
Pages.

`data/cities/<id>.js` NO está en la lista de precache (`SHELL_URLS`) a
propósito: solo se pide cuando el usuario elige esa ciudad. Pero una vez
pedida, el mismo fetch handler genérico la cachea igual que el resto del
shell (es una petición `GET` normal), así que la próxima vez que se elija
esa misma ciudad —incluso sin red— ya funciona.

No cachea nunca las peticiones al proxy de IA (son `POST`, y el fetch
handler solo intercepta `GET`): si no hay red, esas llamadas fallan tal
cual y `app.js` ya sabe caer al simulador local.

Al subir un cambio a `index.html`/`app.js`/`data/core.js`/`styles.css`,
hay que actualizar también la lista `SHELL_URLS` de `sw.js` con el nuevo
`?v=N` de cada archivo (igual que ya se hace en `index.html`) y subir
`CACHE_VERSION`, para que la próxima visita descargue y cachee la
versión nueva. Los archivos de `data/cities/` no necesitan este paso:
al no estar en `SHELL_URLS`, cambiar su `?v=N` en `loadCityData` (en
`app.js`) ya basta para que se pidan y cacheen de nuevo con la clave
nueva.

---

## 13. Limitaciones conocidas

- **Cuota de Gemini gratuita compartida**: ~20 peticiones/minuto para
  todo el que use la web a la vez (está atada a una única key/proyecto,
  no a cada visitante). Si se agota, cae al simulador local durante ~1
  minuto y se recupera sola.
- **Calidad de voz**: depende de las voces instaladas en el sistema
  operativo/navegador de quien visita la web; no es una voz neuronal de
  pago.
- **Sin base de datos**: todos los POIs están escritos a mano en
  `data/cities/<id>.js`; añadir una ciudad nueva hoy implica editar
  código (y registrarla en el esqueleto de `data/core.js`), no un panel
  de administración.
- **Protección del proxy básica**: el filtro por origen (`Origin`) no es
  infalible ante un atacante decidido; sería mejorable con reglas de
  *rate limiting* de Cloudflare (gratuitas, activables desde su panel
  sin tocar código) si el uso real lo justifica.
