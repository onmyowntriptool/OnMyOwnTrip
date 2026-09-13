# Proxy de IA para OnMyOwnTrip (Cloudflare Workers)

Este pequeño servidor guarda tu API key de Gemini de forma segura y reenvía
las peticiones de la web pública, para que la key nunca aparezca en el
navegador de quien visite la app.

## Despliegue (todo desde el navegador, sin instalar nada)

1. Ve a **https://dash.cloudflare.com** y crea una cuenta gratuita (no debería
   pedir tarjeta para el plan gratuito de Workers).
2. En el menú lateral: **Workers & Pages → Create → Create Worker**.
   Ponle un nombre, por ejemplo `onmyowntrip-proxy`, y créalo.
3. Pulsa **Edit code** (o "Quick edit") para abrir el editor online.
4. Borra el código de ejemplo y pega el contenido completo de `proxy.js`
   (el archivo que está en esta misma carpeta).
5. Pulsa **Deploy** / **Save and deploy**.
6. Ve a **Settings → Variables and Secrets** de ese Worker → **Add** →
   - Nombre: `GEMINI_API_KEY`
   - Tipo: **Secret** (encriptado, nunca se muestra después)
   - Valor: tu API key real de Gemini
   - Guarda.
7. Copia la URL del Worker que te da Cloudflare (algo como
   `https://onmyowntrip-proxy.TU-USUARIO.workers.dev`).

## Audioguía en voz real (opcional): Google Cloud Text-to-Speech

Esto es aparte del chat con Gemini — activa una voz de verdad (Google
Cloud TTS) para el resumen narrado de cada POI, en vez de la voz del
navegador. Es completamente opcional: si no añades este secret, la app
sigue funcionando igual, solo que con la voz de siempre.

1. Sigue los pasos de "Prueba antes de tocar nada" más abajo para crear la
   API key en Google Cloud (**Cloud Text-to-Speech API**, restringida a esa
   API).
2. En el mismo Worker de arriba, **Settings → Variables and Secrets → Add**:
   - Nombre: `GOOGLE_TTS_API_KEY`
   - Tipo: **Secret**
   - Valor: tu API key de Google Cloud
   - Guarda.

Con eso ya está — la app detecta sola que el endpoint `/tts` responde y
empieza a usarlo para el resumen inicial de cada POI (cacheado por texto,
así no se vuelve a pagar la misma narración dos veces). Si algo falla
(sin key, cuota agotada, sin red…) cae automáticamente a la voz del
navegador, sin ningún error visible para quien usa la app.

### Prueba antes de tocar nada (recomendado)

Antes de meter la key en el Worker, prueba que funciona directamente:
1. Ve a **console.cloud.google.com**, crea o elige un proyecto.
2. **APIs y servicios → Biblioteca** → busca **"Cloud Text-to-Speech API"** → **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**.
4. Pulsa **Restringir clave** y limítala a **"Cloud Text-to-Speech API"** únicamente.
5. En **Facturación → Presupuestos y alertas**, pon una alerta de $1 — así
   te avisa si algún día te acercas a superar el nivel gratis, aunque con
   el volumen de esta app es difícil que pase (ver el comentario de
   `TTS_VOICE`/`TTS_SPEAKING_RATE` en `proxy.js`: usa la voz WaveNet, la
   más barata de las voces de calidad).

## Configurar la app para usar el proxy

Con esa URL, tu `llm-config.js` local (o, una vez probado, el que subamos a
git) debe quedar así — **ya no hace falta tu key real aquí**, cualquier
texto sirve en `apiKey` porque el Worker no la usa para autenticar:

```js
window.LLM_CONFIG = {
  provider: 'openai',
  baseUrl: 'https://onmyowntrip-proxy.TU-USUARIO.workers.dev',
  apiKey: 'proxy',
  model: 'gemini-flash-latest',
  maxTokens: 3500,
  extraBody: { reasoning_effort: 'low' }
};
```

## Nota sobre abuso

El Worker solo acepta peticiones cuyo origen (`Origin`) sea tu web de
GitHub Pages (o `localhost:8791` para pruebas) — así que copiar y pegar la
URL del Worker en otra web no funcionaría desde un navegador normal. No es
una protección perfecta (alguien con conocimientos técnicos podría
saltársela), pero es suficiente para un proyecto personal.

## Control de acceso (licencias de usuario)

La app pide un nombre de usuario antes de dejar entrar (pantalla "Acceso
privado", ver `LICENSE` en `app.js`), comprobándolo contra un KV namespace
de este mismo Worker — nunca contra un fichero del repo, para que la lista
de usuarios válidos no quede visible en el navegador de cualquiera.

### Configurarlo (una sola vez)

1. En el panel de Cloudflare: **Storage & databases → Workers KV → Create
   Instance**. Nómbralo, por ejemplo, `omot-licenses`.
2. En tu Worker → pestaña **Bindings** → **Add binding** → tipo **KV
   Namespace**. Variable: `LICENSES` (tiene que llamarse exactamente así,
   es el nombre que usa `proxy.js`). Selecciona el namespace del paso 1.
3. Guarda/Deploy.

### Dar de alta, renovar o revocar un acceso

Todo se hace entrando al namespace `omot-licenses` (Storage & databases →
Workers KV → ábrelo) y editando sus entradas directamente desde el panel,
sin tocar código ni hacer commits:

- **Dar de alta o renovar**: añade o edita una entrada — **Key** = el
  nombre de usuario que esa persona escribirá en la app, **Value** = la
  fecha de caducidad en formato `YYYY-MM-DD` (válida hasta ese día
  incluido). **Criterio estándar: una semana desde hoy**, salvo que
  acuerdes otra cosa.
- **Acceso vitalicio/libre**: usa el valor literal `libre` en vez de una
  fecha.
- **Revocar**: borra la entrada (o cámbiale el valor a una fecha ya
  pasada). No hace falta tocar nada más: quien ya tenía la app abierta con
  ese acceso se bloquea solo en cuanto la app vuelve a comprobarlo (ver
  abajo), sin esperar a que cierre y reabra la app.

### Cómo funciona por dentro

Al abrir la app sin un acceso guardado válido, pide un nombre de usuario y
llama a `POST /license/check` de este Worker (`handleLicenseCheck` en
`proxy.js`), que consulta el KV y responde solo `{ ok: true/false, ... }`
— nunca la lista completa. Si es válido, la app lo guarda en el propio
dispositivo (`localStorage`) para seguir funcionando sin red (piensa que
es una app para usar caminando por la calle).

Mientras la app sigue abierta, un vigilante (`LICENSE.startWatching` en
`app.js`) revisa el acceso cada minuto contra este mismo endpoint, y
también en cuanto se vuelve a la pestaña tras estar en segundo plano. En
cuanto el Worker deja de confirmarlo (revocado o caducado), la app se
bloquea al momento con el mensaje "Licencia caducada. Solicita una nueva
clave para continuar." — sin esperar a la siguiente apertura. Un simple
fallo de red no cuenta como invalidación, para no dejar sin acceso a
alguien sin cobertura que ya se había validado.

### Límites reales de esto

Esto no es DRM ni una protección a prueba de cualquiera: el código de
`app.js` que llama a este endpoint es público (el repo lo es), así que
alguien con conocimientos técnicos podría, con esfuerzo, forzar el
resultado desde las herramientas de desarrollador del navegador. Lo que sí
evita, a diferencia de guardar la lista en un fichero del repo, es que
cualquiera pueda leer los nombres de usuario válidos con solo abrir una
URL.

## Panel de accesos (quién ha entrado, cuántas veces)

`admin/dashboard.html` (en la raíz del repo, junto a `index.html`) es una
páginita independiente — no enlazada desde ningún sitio de la app — que
muestra un historial de intentos de acceso y cuántas veces ha abierto la
app cada usuario. Su protección real no es que nadie encuentre la URL
(el repo es público, cualquiera podría dar con ella), sino la clave de
administrador que exige el Worker antes de devolver ningún dato.

### Configurarlo (una sola vez)

1. **Storage & databases → Workers KV → Create Instance**. Nómbralo, por
   ejemplo, `omot-access-log`.
2. En tu Worker → pestaña **Bindings** → **Add binding** → tipo **KV
   Namespace**. Variable: `ACCESS_LOG` (tiene que llamarse exactamente
   así). Selecciona el namespace del paso 1.
3. En el mismo Worker → **Settings → Variables and Secrets → Add**:
   - Nombre: `ADMIN_KEY`
   - Tipo: **Secret**
   - Valor: una clave que tú elijas (es la contraseña del panel, distinta
     de las claves de usuario de `LICENSES`).
4. Guarda/Deploy.

### Usarlo

Abre `admin/dashboard.html` (tu web + `/admin/dashboard.html`) e
introduce la clave de administrador del paso 3. Verás dos tablas:

- **Visitas por usuario**: cuántas veces ha abierto la app cada uno,
  contando solo aperturas reales (no los pings del vigilante cada
  minuto mientras la app ya está abierta).
- **Historial reciente**: los últimos 200 eventos (comprobaciones de
  acceso y visitas), con fecha, usuario y si fue aceptado o rechazado
  (útil también para ver intentos con usuarios no reconocidos).

Sin el binding `ACCESS_LOG` configurado, tanto el conteo de visitas como
el historial simplemente no se guardan (el resto de la app sigue
funcionando igual) — es una capa informativa opcional, no un requisito
para que el control de acceso funcione.

## Ranking de patrocinios

Cuenta impresiones/clics ("Ver la carta", "Cómo llegar") por
PATROCINADOR — nunca por usuario, es una métrica de qué patrocinador
funciona mejor, no de seguimiento de personas.

### Configurarlo

1. **Storage & databases → Workers KV → Create Instance**. Nómbralo, por
   ejemplo, `omot-sponsor-metrics`.
2. En tu Worker → pestaña **Bindings** → **Add binding** → tipo **KV
   Namespace**. Variable: `SPONSOR_METRICS` (tiene que llamarse exactamente
   así). Selecciona el namespace del paso 1.
3. Guarda/Deploy. Reutiliza el mismo secret `ADMIN_KEY` que ya tengas
   configurado para el panel de accesos — no hace falta crear otro.

### Cómo verlo

Es la misma clave de administrador que abre `admin/dashboard.html`: ahí
aparece una tabla "Ranking de patrocinios" con impresiones, "Ver la
carta" y "Cómo llegar" por patrocinador, ordenada por quién se lleva más
interés real (carta + cómo llegar juntos).

### Por qué en lotes y no una escritura por clic

El plan gratis de KV son 1.000 escrituras/día para TODA la cuenta
(compartidas con `LICENSES`/`ACCESS_LOG`/`CITY_CONTENT`). Si cada toque en
"Ver la carta" disparara su propia petición al Worker, un puñado de
pruebas podría acercarse a ese límite y dejar sin cuota al control de
acceso real. Por eso `app.js` acumula los eventos en el propio móvil y
los manda en un solo lote agregado al cerrar la ficha (o cada 2 minutos
si se queda abierta) — un restaurante visto y tocado varias veces en una
sesión sigue siendo 1 sola escritura, no una por evento.

## Gestión de patrocinadores (alta/edición/baja desde el panel)

Reemplaza el fichero estático `data/sponsors-demo.js` (que había que editar
a mano y hacer commit para cambiar un solo patrocinador) por un KV
namespace propio, gestionable desde una pestaña nueva "Gestión" en
`admin/dashboard.html`, sin tocar código ni hacer commits. Es un namespace
DISTINTO de `SPONSOR_METRICS` (ese solo guarda contadores de clics; este
guarda la ficha completa: nombre, ubicación, textos, fechas...).

### Configurarlo

1. **Storage & databases → Workers KV → Create Instance**. Nómbralo, por
   ejemplo, `omot-sponsors`.
2. En tu Worker → pestaña **Bindings** → **Add binding** → tipo **KV
   Namespace**. Variable: `SPONSORS` (tiene que llamarse exactamente así,
   es el nombre que usa `proxy.js`). Selecciona el namespace del paso 1.
3. Guarda/Deploy. Reutiliza el mismo secret `ADMIN_KEY` que ya tengas
   configurado para el panel de accesos — no hace falta crear otro.

### Usarlo

En `admin/dashboard.html`, pestaña **Gestión**: una tabla con todos los
patrocinadores dados de alta (nombre, ciudad, nivel, fechas) con botones
Editar/Borrar, un formulario para crear o editar uno, y una caja para
pegar de golpe un JSON con varios patrocinadores (útil solo para la
migración inicial desde `data/sponsors-demo.js`, no hace falta para el
día a día).

Campos con fecha de inicio/fin son opcionales: sin ellas, el patrocinio
está activo siempre; con ellas, desaparece solo de la app (sin volver a
tocar nada) en cuanto pasa la fecha de fin — `/sponsors/list` (la ruta
pública que consulta `app.js`) filtra por la fecha de hoy antes de
devolver nada.

### Cómo funciona por dentro

- `POST /sponsors/list`: pública (sin `adminKey`), la llama `app.js` al
  entrar en una ciudad — solo con activos por fecha.
- `POST /sponsors/admin/list`: igual pero sin filtrar por fecha, para que
  la tabla de gestión también vea los que aún no han empezado o ya
  caducaron. Exige `adminKey`.
- `POST /sponsors/upsert`: crea o actualiza (mismo `id` = actualiza).
  Exige `adminKey`.
- `POST /sponsors/delete`: borra por `id`. Exige `adminKey`.

### Ficha para que el propio negocio rellene sus datos

`patrocinador.html` (en la raíz del repo, sin enlazar desde ningún sitio,
igual que `admin/dashboard.html`) es una páginita pública que le puedes
mandar directamente a un negocio interesado: rellena su nombre, un teaser
corto (limitado a 160 caracteres, para que no escriba un párrafo entero),
el texto de su botón, un enlace a su carta en PDF o unos platos con
precio, y un contacto. Nunca decide ciudad, nivel, radio, coordenadas ni
fechas — eso lo sigues decidiendo tú.

Lo que envía queda guardado en el mismo KV `SPONSORS`, bajo la clave
`pending:<id>` (en vez de `sponsor:<id>`), así que nunca aparece en
`/sponsors/list` ni en la app hasta que tú lo apruebas. En la pestaña
**Gestión** del panel verás una tabla "Solicitudes pendientes" con lo
recibido; el botón **Importar** precarga esos datos en el formulario de
alta (dejando ciudad/nivel/coordenadas/fechas en blanco para que los
rellenes) y, al guardar, borra la solicitud automáticamente. El botón
**Descartar** la quita sin convertirla en nada.

- `POST /sponsors/submit`: pública (sin `adminKey`, con rate limiting
  propio), la llama `patrocinador.html`.
- `POST /sponsors/pending/list`: lista lo recibido sin revisar. Exige
  `adminKey`.
- `POST /sponsors/pending/delete`: borra una solicitud por `id` (al
  descartarla, o justo después de importarla). Exige `adminKey`.

## Compra "sin publicidad" por ciudad (Google Play Billing)

**EXPERIMENTAL** (rama `experimento-premium-sin-publicidad`, no la fusiones
a `main` hasta que hayas probado una compra real de principio a fin).

Pago único no consumible: 3,99 € por quitar la publicidad de una ciudad
concreta, o 14,99 € por todas de golpe. La app solo se ofrece desde la app
nativa de Android (Google exige pasar por su propio sistema de cobro para
esto, no se puede hacer desde la web). La verificación de cada compra es
**directa contra la API de Google Play**, sin RevenueCat ni ningún otro
servicio externo — encaja con que todo lo demás de este proyecto vive ya
en tu propio Cloudflare.

### Configurarlo (una sola vez)

1. **Google Cloud Console** (console.cloud.google.com), mismo proyecto que
   uses o uno nuevo:
   - **APIs y servicios → Biblioteca** → busca **"Google Play Android
     Developer API"** → Habilitar.
   - **IAM y administración → Cuentas de servicio → Crear cuenta de
     servicio**. No hace falta darle ningún rol de IAM aquí (el permiso
     real se da desde Play Console, paso siguiente).
   - Dentro de esa cuenta de servicio → **Claves → Agregar clave → Crear
     clave nueva → JSON**. Se descarga un fichero `.json` — es un secreto,
     no lo subas al repo ni me lo pegues a mí.
2. **Play Console → Configuración → Acceso a la API**:
   - Vincula el proyecto de Google Cloud del paso 1 (si no aparece solo,
     usa "Vincular proyecto existente" con el mismo ID de proyecto).
   - Busca la cuenta de servicio recién creada → **Administrar acceso de
     Play Console** → dale permiso de **Finanzas → Ver datos financieros,
     órdenes y transacciones** (es lo que necesita para consultar compras).
3. En tu Worker → **Settings → Variables and Secrets → Add**:
   - Nombre: `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`
   - Tipo: **Secret**
   - Valor: el contenido COMPLETO del `.json` descargado en el paso 1,
     pegado tal cual (es un único bloque JSON, no lo reformatees).
4. **Storage & databases → Workers KV → Create Instance**. Nómbralo, por
   ejemplo, `omot-premium`.
5. En tu Worker → pestaña **Bindings** → **Add binding** → tipo **KV
   Namespace**. Variable: `PREMIUM` (tiene que llamarse exactamente así).
   Selecciona el namespace del paso 4.
6. **Play Console → Monetización → Productos → Productos integrados en la
   aplicación → Crear producto**: uno no consumible por cada ciudad, con
   el ID exacto (en minúsculas y guion bajo) que espera `proxy.js` — ver
   `PREMIUM_PRODUCT_TO_CITY` ahí mismo para la lista completa (p.ej.
   `ads_free_madrid`, `ads_free_toledo`...) — más uno `ads_free_all_cities`
   para el pack de todas. Precio: 3,99 € cada ciudad, 14,99 € el pack.
7. **Play Console → Configuración → Prueba de licencias**: añade tu propia
   cuenta de Google (o la de quien vaya a probar) como *tester licenciado*,
   para poder completar compras de prueba sin que cobren de verdad.
8. Guarda/Deploy el Worker con el código actualizado.

Si añades una ciudad nueva a la app en el futuro, hay que repetir el paso 6
para esa ciudad y añadirla también a `ALL_CITY_IDS`/`PREMIUM_PRODUCT_TO_CITY`
en `proxy.js` — si no, el bundle "todas las ciudades" no la incluirá.

### Cómo funciona por dentro

- `POST /premium/verify-purchase`: pública (sin `adminKey` — la prueba real
  de que la compra es genuina la hace la propia API de Google, no una
  clave compartida), con rate limiting propio. Recibe
  `{username, productId, purchaseToken}` desde la app justo después de que
  el usuario complete la compra nativa. Comprueba que `username` tiene una
  licencia válida, firma un JWT con la cuenta de servicio para conseguir un
  token de acceso de Google, confirma la compra contra la Android Publisher
  API, la "confirma" (`acknowledge`, obligatorio en 3 días o Google la
  reembolsa sola), y guarda el resultado en `PREMIUM` bajo `user:<username>`.
- Un mismo justificante de compra (`purchaseToken`) no se puede reclamar
  dos veces desde usernames distintos (se guarda en `PREMIUM` bajo
  `token:<purchaseToken>`) — sí es idempotente reclamarlo otra vez desde el
  MISMO username (lo que hace "Restaurar compras" en la app).
- `POST /license/check` (la comprobación de licencia normal, incluido el
  vigilante en segundo plano) ahora también devuelve `premiumCities` — la
  app la usa para saber en qué ciudades ocultar la publicidad, sin una
  llamada aparte.

### Límite real de esto

Sin el binding `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`/`PREMIUM` configurados,
`/premium/verify-purchase` responde `not-configured` (501) sin romper nada
más de la app — es una capa opcional, igual que el resto de KV bindings
de este Worker.

## Rate limiting por IP (opcional, recomendado)

Importante: como este Worker vive en un subdominio `workers.dev` (no en un
dominio propio dado de alta como "zona" en Cloudflare), **no** aparece la
pestaña "Security" con reglas de Rate Limiting/WAF — ese producto solo
existe para dominios gestionados por Cloudflare. La vía que sí funciona
aquí es un **binding de Rate Limiting**, ya soportado por `proxy.js`
(variable `RATE_LIMITER`; si no configuras el binding, el código lo
detecta y simplemente no aplica límite, sin romper nada):

1. En tu Worker → pestaña **Bindings** → **Add binding**.
2. Tipo **Rate Limiting**. Nombre de variable: `RATE_LIMITER` (tiene que
   llamarse exactamente así, es el nombre que usa `proxy.js`).
3. Límite sugerido: `20` peticiones cada `60` segundos por IP (antes se
   sugería `10`, pero resultó demasiado ajustado — ver nota abajo).
4. Guarda/Deploy.

**Por qué `20` y no `10`:** un solo uso normal de "Profundiza más" en un
punto de interés (ver `queueDeepenWithFillers` en `app.js`) puede lanzar
hasta 11 peticiones reales de fondo por su cuenta (1 para planificar el
guion de 10 puntos + 1 por cada punto desarrollado), a las que se suman la
narración en voz (audio real vía `/tts`, mismo límite) y cualquier
pregunta suelta o chip de tema que se toque mientras tanto. Con `10`, una
familia visitando dos o tres paradas seguidas en un mismo minuto —sin
ningún abuso— podía agotar el límite ella sola y caer al simulador local,
justo el síntoma que motivó subir este número. Sigue siendo un límite
real (no lo quites del todo): con `20` una sola IP todavía no puede
acaparar toda la cuota compartida de Gemini (~20/min entre todo el
mundo) de forma sostenida, solo tiene más margen para una sesión de uso
normal. Si en el futuro "Profundiza más" pasa a lanzar menos peticiones
de fondo por parada, este número se puede volver a bajar.
**Este número solo se puede cambiar aquí, a mano, desde el panel de
Cloudflare — no hay forma de ajustarlo desde el código del repositorio.**

Sin este binding, una sola IP podría agotar ella sola casi toda la cuota
compartida (ver ejemplo práctico comentado en el propio código).
