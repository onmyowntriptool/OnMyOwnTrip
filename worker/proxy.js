// ============================================================
// OnMyOwnTrip · Proxy de IA (Cloudflare Worker)
//
// Reenvía las peticiones de la app a Gemini, guardando la API key
// en el propio Worker (variable de entorno "GEMINI_API_KEY"),
// para que el navegador del visitante nunca la vea.
//
// Este archivo NO contiene ninguna key — se pega tal cual en el
// editor de Cloudflare, y la key se configura aparte como "secret"
// en el panel de Cloudflare (Settings → Variables and Secrets).
// ============================================================

// Cambia esto por el origen real de tu web (y añade localhost si
// quieres poder probar en local contra este mismo Worker).
// 'https://localhost' es el origen desde el que corre la app empaquetada
// con Capacitor (Android/iOS), no un navegador de verdad — sin esta línea
// el chat, la audioguía y el control de licencias fallan solo dentro de
// la app nativa, aunque en la web vayan bien.
const ALLOWED_ORIGINS = [
  'https://davidghenriquez.github.io',
  'http://localhost:8791',
  'https://localhost'
];

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Voz de audioguía: WaveNet en español de España, la más barata de las
// voces "de calidad" de Google (ver worker/README.md). Ritmo ligeramente
// más pausado que el neutro (1.0), a juego con el ajuste ya aplicado a la
// voz del navegador (SPEECH.speak en app.js).
const TTS_VOICES = {
  es: { languageCode: 'es-ES', name: 'es-ES-Wavenet-B' },
  en: { languageCode: 'en-US', name: 'en-US-Wavenet-D' }
};
const TTS_SPEAKING_RATE = 0.95;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);
    const isChat = url.pathname.endsWith('/chat/completions');
    const isTts = url.pathname.endsWith('/tts');
    const isLicense = url.pathname.endsWith('/license/check');
    const isVisit = url.pathname.endsWith('/license/visit');
    const isDashboard = url.pathname.endsWith('/license/dashboard');
    const isDashboardClear = url.pathname.endsWith('/license/dashboard/clear');
    const isContent = url.pathname.endsWith('/content');
    // Ranking de patrocinios (ver admin/dashboard.html, pestaña "Patrocinios"):
    // cuenta impresiones/clics por patrocinador vía el KV SPONSOR_METRICS.
    const isSponsorTrack = url.pathname.endsWith('/sponsor/track');
    const isSponsorRank = url.pathname.endsWith('/sponsor/rank');
    // Gestión de patrocinadores (ver admin/dashboard.html, pestaña "Gestión"):
    // a diferencia de SPONSOR_METRICS (solo contadores), este KV namespace
    // ("SPONSORS") guarda la ficha completa de cada patrocinador — lo que
    // antes vivía a mano en data/sponsors-demo.js. /sponsors/list es la única
    // ruta pública (la app la llama en vez de cargar ese script estático);
    // las otras tres exigen ADMIN_KEY igual que /license/dashboard.
    const isSponsorsList = url.pathname.endsWith('/sponsors/list');
    const isSponsorsAdminList = url.pathname.endsWith('/sponsors/admin/list');
    const isSponsorsUpsert = url.pathname.endsWith('/sponsors/upsert');
    const isSponsorsDelete = url.pathname.endsWith('/sponsors/delete');
    // Ficha pública (ver patrocinador.html): el propio negocio rellena sus
    // datos de contenido (nombre, teaser, carta...) y quedan en "pending:"
    // dentro del mismo KV SPONSORS, a la espera de que tú los revises y los
    // conviertas en un patrocinador real desde "Gestión" (con ciudad, nivel,
    // coordenadas... que el cliente nunca decide). Nunca se publican solos.
    const isSponsorsSubmit = url.pathname.endsWith('/sponsors/submit');
    const isSponsorsPendingList = url.pathname.endsWith('/sponsors/pending/list');
    const isSponsorsPendingDelete = url.pathname.endsWith('/sponsors/pending/delete');

    if (request.method !== 'POST' || (!isChat && !isTts && !isLicense && !isVisit && !isDashboard && !isDashboardClear && !isContent && !isSponsorTrack && !isSponsorRank && !isSponsorsList && !isSponsorsAdminList && !isSponsorsUpsert && !isSponsorsDelete && !isSponsorsSubmit && !isSponsorsPendingList && !isSponsorsPendingDelete)) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: 'origin not allowed' }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // La comprobación de licencia (y sus rutas hermanas de visitas/panel) va
    // ANTES del rate limiter de abajo (que es para la cuota compartida de
    // Gemini): no tiene nada que ver con la IA, y no queremos que alguien se
    // quede sin poder ni entrar a la app solo porque otros usuarios estén
    // saturando el chat en ese momento.
    if (isLicense) return handleLicenseCheck(request, env, headers);
    if (isVisit) return handleVisit(request, env, headers);
    if (isDashboard) return handleDashboard(request, env, headers);
    if (isDashboardClear) return handleDashboardClear(request, env, headers);
    if (isContent) return handleContent(request, env, headers);
    if (isSponsorTrack) return handleSponsorTrack(request, env, headers);
    if (isSponsorRank) return handleSponsorRank(request, env, headers);
    if (isSponsorsList) return handleSponsorsList(request, env, headers);
    if (isSponsorsAdminList) return handleSponsorsAdminList(request, env, headers);
    if (isSponsorsUpsert) return handleSponsorsUpsert(request, env, headers);
    if (isSponsorsDelete) return handleSponsorsDelete(request, env, headers);
    if (isSponsorsSubmit) return handleSponsorsSubmit(request, env, headers);
    if (isSponsorsPendingList) return handleSponsorsPendingList(request, env, headers);
    if (isSponsorsPendingDelete) return handleSponsorsPendingDelete(request, env, headers);

    // Rate limiting por IP (binding "RATE_LIMITER", configurado en el panel
    // de Cloudflare → pestaña "Bindings" → Add binding → Rate Limiting).
    // Sin esto, una sola IP podría agotar ella sola la cuota compartida de
    // Gemini (~20 peticiones/min para todo el mundo) y dejar sin IA real al
    // resto de gente usando la app en ese mismo minuto. Si el binding no
    // está configurado (env.RATE_LIMITER no existe), se salta sin romper
    // nada: es una capa extra, no un requisito para que la app funcione.
    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return new Response(JSON.stringify({ error: 'rate limit exceeded, prueba en un minuto' }), {
          status: 429,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    if (isTts) return handleTts(request, env, headers);

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'invalid request body' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GEMINI_API_KEY}`
      },
      body
    });

    const text = await geminiRes.text();
    return new Response(text, {
      status: geminiRes.status,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
};

// Audioguía en voz real (Google Cloud Text-to-Speech). Solo se usa para el
// resumen narrado de cada POI (texto fijo, cacheado en el navegador de
// quien lo pide — ver CLOUD_TTS en app.js), nunca para el chat con la IA.
// Requiere el secret "GOOGLE_TTS_API_KEY" en el Worker (ver worker/README.md);
// si no está configurado, responde 501 y la app cae automáticamente a la
// voz del navegador (Web Speech API) sin que el usuario note un error.
async function handleTts(request, env, headers) {
  if (!env.GOOGLE_TTS_API_KEY) {
    return new Response(JSON.stringify({ error: 'TTS not configured' }), {
      status: 501,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid request body' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  // Tope de caracteres por petición: ninguna narración de la app se acerca
  // a esto (el límite real de la propia API de Google es 5000), es solo un
  // cinturón de seguridad extra ante un uso indebido del endpoint.
  const text = String((payload && payload.text) || '').slice(0, 3000);
  if (!text.trim()) {
    return new Response(JSON.stringify({ error: 'missing text' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
  const lang = payload && payload.lang === 'en' ? 'en' : 'es';
  const voice = TTS_VOICES[lang];

  let ttsRes;
  try {
    ttsRes = await fetch(`${GOOGLE_TTS_URL}?key=${env.GOOGLE_TTS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice,
        audioConfig: { audioEncoding: 'MP3', speakingRate: TTS_SPEAKING_RATE }
      })
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'tts request failed' }), {
      status: 502,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  if (!ttsRes.ok) {
    // Aquí llega también un 429/403 de Google si se agota la cuota gratis
    // (o el límite de caracteres que hayas puesto tú en la consola de
    // Google Cloud): se reenvía tal cual, el cliente lo trata como "no
    // disponible" y cae a la voz del navegador sin romper la audioguía.
    const errText = await ttsRes.text();
    return new Response(errText, {
      status: ttsRes.status,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const data = await ttsRes.json();
  const binary = atob(data.audioContent);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return new Response(bytes, {
    status: 200,
    headers: { ...headers, 'Content-Type': 'audio/mpeg' }
  });
}

// Control de acceso (ver LICENSE en app.js y la sección correspondiente de
// worker/README.md): a diferencia del resto de este Worker, aquí el propio
// usuario/clave vive en un KV namespace (binding "LICENSES", configurado en
// el panel de Cloudflare → Settings → Bindings → KV Namespace), NUNCA en un
// fichero público del repo — así alguien que mire el código o el tráfico de
// red solo ve la pregunta "¿es válido este usuario?" y la respuesta (sí/no),
// nunca la lista completa de usuarios y fechas.
//
// Formato del valor guardado en KV para cada clave (=nombre de usuario):
//   - "libre"          -> acceso vitalicio, sin caducidad.
//   - "YYYY-MM-DD"      -> válido hasta ese día incluido (criterio estándar:
//                          una semana desde el alta, salvo que se acuerde
//                          otra cosa).
//
// "kind" en el body ('gate' por defecto, o 'watch'): distingue un intento
// real (pantalla de acceso, o la revalidación única al abrir la app) de un
// simple ping del vigilante en segundo plano (ver LICENSE.startWatching en
// app.js, cada 60s mientras la app sigue abierta). Solo se registra en el
// historial del panel (ver handleDashboard) lo primero — si se registrara
// cada ping, el historial se llenaría de un evento por minuto y usuario
// activo, tapando los eventos que de verdad interesan.
async function handleLicenseCheck(request, env, headers) {
  // (nota sobre "respond" más abajo: solo registra los intentos FALLIDOS.
  // Un acceso correcto vía 'gate' siempre dispara justo después una llamada
  // a /license/visit desde app.js — ver wireLicenseGate/init — así que
  // registrarlo también aquí duplicaría la misma entrada dos veces en el
  // historial por cada acceso bueno.)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting por IP, con clave propia ("license:...") para no compartir
  // cupo con el rate limiter del proxy de IA de más abajo: alguien probando
  // usernames al azar no debería poder agotarle la cuota de chat a nadie, ni
  // al revés. Igual que allí, si el binding no está configurado se salta sin
  // romper nada.
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `license:${ip}` });
    if (!success) {
      return new Response(JSON.stringify({ ok: false, reason: 'rate-limited' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  if (!env.LICENSES) {
    // Sin el binding configurado esto no puede funcionar: se falla "cerrado"
    // (nadie pasa) en vez de dejar entrar a cualquiera, para que un despliegue
    // mal configurado nunca se traduzca en saltarse el control de acceso.
    return new Response(JSON.stringify({ ok: false, reason: 'not-configured' }), {
      status: 501,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const username = String((payload && payload.username) || '').trim();
  const isWatch = (payload && payload.kind) === 'watch';

  const respond = async (body) => {
    if (!isWatch && !body.ok) {
      await logAccessEvent(env, {
        type: 'check',
        username: username || '(vacío)',
        result: body.reason || 'error',
        ip
      });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  };

  if (!username) return respond({ ok: false, reason: 'not-found' });

  const result = await checkLicenseValidity(env, username);
  return respond(result);
}

// Lógica de validez compartida entre handleLicenseCheck (arriba) y
// handleContent (más abajo, gate del contenido de ciudad): mismo criterio de
// KV/"libre"/fecha en un único sitio para no duplicarlo entre los dos.
async function checkLicenseValidity(env, username) {
  const raw = await env.LICENSES.get(username);
  if (raw == null) return { ok: false, reason: 'not-found' };

  const value = raw.trim();
  if (value.toLowerCase() === 'libre') return { ok: true, expires: null };

  const today = new Date().toISOString().slice(0, 10);
  if (today <= value) return { ok: true, expires: value };

  return { ok: false, reason: 'expired', expires: value };
}

// Cuenta de visitas por usuario (ver LICENSE.recordVisit en app.js): se
// llama una única vez por apertura de la app ya autenticada (nunca desde el
// vigilante en segundo plano), así que sí representa "veces que ha abierto
// la app", no comprobaciones técnicas. KV no tiene incremento atómico: para
// el volumen de esta app (control de acceso personal, no un servicio con
// miles de peticiones simultáneas del mismo usuario) una lectura + escritura
// normal es más que suficiente, sin necesitar nada más sofisticado.
async function handleVisit(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const username = String((payload && payload.username) || '').trim();
  if (!username || !env.ACCESS_LOG) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const key = `visits:${username}`;
  let count = 0;
  try {
    const current = await env.ACCESS_LOG.get(key);
    count = (parseInt(current, 10) || 0) + 1;
    await env.ACCESS_LOG.put(key, String(count));
  } catch (_) { /* un fallo aquí no debe romper la apertura de la app */ }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  await logAccessEvent(env, { type: 'visit', username, result: 'ok', ip });

  return new Response(JSON.stringify({ ok: true, visits: count }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Guarda un evento en el historial del panel de accesos (ver ACCESS_LOG,
// handleDashboard). Clave con timestamp + sufijo aleatorio: list() de KV
// devuelve las claves en orden alfabético, y con un timestamp de 13 dígitos
// (siempre el mismo nº de cifras hasta el año 2286) ese orden coincide con
// el cronológico; el sufijo evita colisiones entre dos eventos en el mismo
// milisegundo. El dato real va en la METADATA de la entrada (no en el
// valor) para poder leer el historial entero con un solo list() en
// handleDashboard, sin tener que pedir cada clave por separado después.
async function logAccessEvent(env, data) {
  if (!env.ACCESS_LOG) return;
  const key = `log:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    await env.ACCESS_LOG.put(key, '1', { metadata: { ts: Date.now(), ...data } });
  } catch (_) { /* nunca debe romper el flujo de login por un fallo aquí */ }
}

// Comprueba la clave de administrador (secret "ADMIN_KEY", distinta de las
// claves de usuario de LICENSES) compartida por handleDashboard y
// handleDashboardClear. Devuelve una Response de error si algo no cuadra
// (payload inválido, clave incorrecta, KV sin configurar), o null si todo
// está en orden y se puede continuar.
async function checkAdminAccess(request, env, headers, requiredBinding = 'ACCESS_LOG') {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return { error: new Response(JSON.stringify({ error: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    }) };
  }
  if (!env.ADMIN_KEY || (payload && payload.adminKey) !== env.ADMIN_KEY) {
    return { error: new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 403,
      headers: { ...headers, 'Content-Type': 'application/json' }
    }) };
  }
  if (!env[requiredBinding]) {
    return { error: new Response(JSON.stringify({ error: 'not-configured' }), {
      status: 501,
      headers: { ...headers, 'Content-Type': 'application/json' }
    }) };
  }
  return { payload };
}

// Panel de accesos (ver admin/dashboard.html): protegido con una clave de
// administrador propia (secret "ADMIN_KEY" en el Worker, NO la misma cosa
// que las claves de usuario de LICENSES) — sin esto, cualquiera que
// encontrara la URL de la página vería quién usa la app y con qué
// frecuencia, ya que el repo (y por tanto esa página) es público.
async function handleDashboard(request, env, headers) {
  const { error } = await checkAdminAccess(request, env, headers);
  if (error) return error;

  const visitsList = await env.ACCESS_LOG.list({ prefix: 'visits:' });
  const visits = await Promise.all(visitsList.keys.map(async (k) => ({
    username: k.name.slice('visits:'.length),
    visits: parseInt(await env.ACCESS_LOG.get(k.name), 10) || 0
  })));
  visits.sort((a, b) => b.visits - a.visits);

  // Tope de 500 claves leídas y 200 mostradas: de sobra para el volumen de
  // un control de acceso personal: si algún día hiciera falta más historial
  // que eso, tocaría paginar con el "cursor" que devuelve list(), pero no
  // merece la pena complicar esto hasta que de verdad haga falta.
  const logList = await env.ACCESS_LOG.list({ prefix: 'log:', limit: 500 });
  const history = logList.keys
    .map((k) => k.metadata)
    .filter(Boolean)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 200);

  return new Response(JSON.stringify({ visits, history }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Borra TODO el historial y los contadores de visitas (botón "Borrar
// historial" de admin/dashboard.html) — no toca LICENSES, así que ningún
// acceso de usuario se ve afectado, solo estos datos informativos. KV no
// tiene un "borrar todo" con un prefijo: hay que listar las claves y
// borrarlas una a una (limit alto de sobra para el volumen de un panel
// personal; si algún día hubiera más de 1000 de cada, tocaría paginar con
// el cursor de list(), pero no compensa complicarlo antes de que haga falta).
async function handleDashboardClear(request, env, headers) {
  const { error } = await checkAdminAccess(request, env, headers);
  if (error) return error;

  const [logList, visitsList] = await Promise.all([
    env.ACCESS_LOG.list({ prefix: 'log:', limit: 1000 }),
    env.ACCESS_LOG.list({ prefix: 'visits:', limit: 1000 })
  ]);
  const keys = [...logList.keys, ...visitsList.keys].map((k) => k.name);
  await Promise.all(keys.map((k) => env.ACCESS_LOG.delete(k)));

  return new Response(JSON.stringify({ ok: true, deleted: keys.length }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Contenido de ciudad (ver app.js/loadCityData): sirve data/cities/<id>.json
// desde un KV namespace propio ("CITY_CONTENT", igual de configurado que
// LICENSES/ACCESS_LOG) en vez de como fichero estático público del repo, y
// solo si el username tiene una licencia válida en ese momento — así el
// contenido de pago no se puede leer solo con abrir la URL del repo en
// GitHub, hace falta pasar primero por el control de acceso real.
async function handleContent(request, env, headers) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting con clave propia ("content:..."), igual que license/chat:
  // no comparte cupo con ninguno de los otros dos.
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `content:${ip}` });
    if (!success) {
      return new Response(JSON.stringify({ ok: false, reason: 'rate-limited' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  if (!env.CITY_CONTENT || !env.LICENSES) {
    // Igual que handleLicenseCheck: sin el binding, se falla "cerrado" en vez
    // de servir el contenido sin comprobar nada.
    return new Response(JSON.stringify({ ok: false, reason: 'not-configured' }), {
      status: 501,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const username = String((payload && payload.username) || '').trim();
  const cityId = String((payload && payload.cityId) || '').trim();
  if (!username || !cityId) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const licenseResult = await checkLicenseValidity(env, username);
  if (!licenseResult.ok) {
    // Mismo registro que un intento de login fallido: si alguien machaca
    // este endpoint con usernames al azar, queda igual de rastreable que
    // machacar /license/check.
    await logAccessEvent(env, { type: 'content', username, result: licenseResult.reason, ip, cityId });
    return new Response(JSON.stringify({ ok: false, reason: licenseResult.reason }), {
      status: 403,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const content = await env.CITY_CONTENT.get(cityId);
  if (content == null) {
    return new Response(JSON.stringify({ ok: false, reason: 'city-not-found' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  // El valor en KV ya es el JSON tal cual (array de pois, generado por
  // scripts/build-city-content.js) — se devuelve sin volver a parsear/serializar.
  return new Response(content, {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// ============================================================
// RANKING DE PATROCINIOS
//
// Cuenta impresiones/clics por PATROCINADOR (nunca por usuario — no hay
// ningún dato personal aquí, solo un contador por sponsorId) para poder
// rankear qué patrocinado se lleva más "Ver la carta"/"Cómo llegar". Vive
// en su propio KV namespace (SPONSOR_METRICS) precisamente para poder
// borrarlo entero sin tocar LICENSES/ACCESS_LOG cuando se retire el
// experimento (ver worker/README.md).
//
// OJO con la cuota: el plan gratis de KV son 1.000 escrituras/día para
// TODA la cuenta (compartidas con LICENSES/ACCESS_LOG/CITY_CONTENT), así
// que app.js manda esto en LOTES agregados (al cerrar la ficha, o cada
// 2 minutos) en vez de una petición por cada toque — ver
// flushSponsorDemoMetrics en app.js. Con eso, un patrocinador visto y
// tocado varias veces en una sesión sigue siendo 1 sola escritura, no una
// por evento.
// ============================================================
async function handleSponsorTrack(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const sponsorId = String((payload && payload.sponsorId) || '').trim().slice(0, 80);
  const name = String((payload && payload.name) || '').trim().slice(0, 120);
  const events = (payload && payload.events) || {};
  if (!sponsorId || !env.SPONSOR_METRICS) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting propio ("sponsor:..."), igual que license/content: este
  // endpoint no pide clave ninguna (es un contador anónimo por sponsor, no
  // hay nada sensible que proteger), así que sin esto alguien podría
  // machacarlo a propósito y comerse la cuota de escrituras del día.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `sponsor:${ip}` });
    if (!success) {
      return new Response(JSON.stringify({ ok: false, reason: 'rate-limited' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }

  const key = `sponsor:${sponsorId}`;
  let current = { impression: 0, menu: 0, directions: 0, map: 0, name: '' };
  try {
    const raw = await env.SPONSOR_METRICS.get(key);
    if (raw) current = { ...current, ...JSON.parse(raw) };
  } catch (_) { /* si el valor guardado estuviera corrupto, se parte de cero */ }

  // Tope de 100 por campo y por petición: de sobra para un lote real (una
  // persona no toca "Ver la carta" cien veces en una sesión), y evita que
  // un payload manipulado infle los contadores de golpe.
  ['impression', 'menu', 'directions', 'map'].forEach((k) => {
    const delta = Math.min(100, Math.max(0, parseInt(events[k], 10) || 0));
    current[k] = (current[k] || 0) + delta;
  });
  if (name) current.name = name;

  try {
    await env.SPONSOR_METRICS.put(key, JSON.stringify(current));
  } catch (_) { /* un fallo aquí nunca debe romper la ficha del usuario */ }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Ranking para el panel (ver admin/dashboard.html): protegido con la misma
// clave de administrador que /license/dashboard, pero exige el binding
// SPONSOR_METRICS en vez de ACCESS_LOG.
async function handleSponsorRank(request, env, headers) {
  const { error } = await checkAdminAccess(request, env, headers, 'SPONSOR_METRICS');
  if (error) return error;

  const list = await env.SPONSOR_METRICS.list({ prefix: 'sponsor:' });
  const ranking = await Promise.all(list.keys.map(async (k) => {
    let data = {};
    try { data = JSON.parse(await env.SPONSOR_METRICS.get(k.name)) || {}; } catch (_) {}
    return {
      sponsorId: k.name.slice('sponsor:'.length),
      name: data.name || '',
      impression: data.impression || 0,
      menu: data.menu || 0,
      directions: data.directions || 0,
      map: data.map || 0
    };
  }));
  // Orden pedido: quién se lleva más "Ver la carta" + "Cómo llegar" juntos
  // (las dos acciones que de verdad indican interés real, no solo que se
  // le mostró el aviso).
  ranking.sort((a, b) => (b.menu + b.directions) - (a.menu + a.directions));

  return new Response(JSON.stringify({ ranking }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// ============================================================
// GESTIÓN DE PATROCINADORES (ver admin/dashboard.html, pestaña "Gestión")
//
// KV namespace propio ("SPONSORS", distinto de SPONSOR_METRICS): guarda la
// ficha completa de cada patrocinador, lo que antes vivía a mano en
// data/sponsors-demo.js. app.js la consulta con /sponsors/list en vez de
// cargar ese script estático (ver loadSponsorsForCity en app.js).
// ============================================================

const SPONSOR_TIERS = new Set(['bronce', 'plata', 'oro']);
const SPONSOR_ICONS = new Set(['restaurant', 'cafe', 'hotel']);
// Límites propios (más cortos que los de sanitizeSponsorInput) para lo que
// rellena el negocio en patrocinador.html: nadie revisa esto antes de
// guardarlo en "pending:", así que el tope va aquí, no solo en el HTML del
// formulario (que un cliente podría saltarse editando el DOM).
const SPONSOR_SUBMISSION_TEASER_MAX = 160;
const SPONSOR_SUBMISSION_CTA_MAX = 40;
const SPONSOR_SUBMISSION_MENU_MAX_ROWS = 8;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Misma fecha en ambos límites: activo todo ese día (comparación de strings
// YYYY-MM-DD, no hace falta parsear a Date).
function isSponsorActive(sponsor, dateStr) {
  if (sponsor.startDate && dateStr < sponsor.startDate) return false;
  if (sponsor.endDate && dateStr > sponsor.endDate) return false;
  return true;
}

function dualText(value, maxLen = 400) {
  if (!value || typeof value !== 'object') return null;
  const es = String(value.es || '').trim().slice(0, maxLen);
  const en = String(value.en || '').trim().slice(0, maxLen);
  if (!es && !en) return null;
  return { es, en };
}

// Valida y recorta el objeto que llega del formulario de admin/dashboard.html
// a la forma exacta que espera renderSponsorsDemo/findNearbySponsorDemo en
// app.js — igual que handleSponsorTrack recorta longitudes/clampa números,
// para que un dato mal formado desde el panel nunca llegue a romper la
// ficha de un POI en la app pública.
function sanitizeSponsorInput(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || '').trim().slice(0, 80);
  const name = String(raw.name || '').trim().slice(0, 120);
  const city = String(raw.city || '').trim().slice(0, 60);
  const tier = SPONSOR_TIERS.has(raw.tier) ? raw.tier : null;
  const icon = SPONSOR_ICONS.has(raw.icon) ? raw.icon : null;
  const lat = Number(raw.coords && raw.coords[0]);
  const lng = Number(raw.coords && raw.coords[1]);
  const teaser = dualText(raw.teaser);
  if (!id || !name || !city || !tier || !icon || !teaser || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const sponsor = {
    id, name, city, tier, icon, teaser,
    coords: [lat, lng],
    radius: Math.min(2000, Math.max(50, parseInt(raw.radius, 10) || 150))
  };

  const ctaLabel = dualText(raw.ctaLabel);
  if (ctaLabel) sponsor.ctaLabel = ctaLabel;

  if (raw.audioMention) {
    const audioLine = dualText(raw.audioLine);
    if (audioLine) {
      sponsor.audioMention = true;
      sponsor.audioLine = audioLine;
    }
  }

  const menuPdf = String(raw.menuPdf || '').trim().slice(0, 300);
  if (menuPdf) sponsor.menuPdf = menuPdf;

  if (Array.isArray(raw.menu)) {
    const menu = raw.menu
      .slice(0, 30)
      .map((row) => ({ item: dualText(row && row.item), price: dualText(row && row.price) }))
      .filter((row) => row.item && row.price);
    if (menu.length) sponsor.menu = menu;
  }

  const startDate = String(raw.startDate || '').trim().slice(0, 10);
  const endDate = String(raw.endDate || '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) sponsor.startDate = startDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) sponsor.endDate = endDate;

  // Solo informativo (cuántos meses se contrataron) — admin/dashboard.html
  // lo usa para rellenar endDate solo, pero se guarda aparte porque
  // endDate se puede editar después a mano sin perder de vista cuánto se
  // pactó originalmente.
  const contractMonths = parseInt(raw.contractMonths, 10);
  if (Number.isFinite(contractMonths) && contractMonths > 0) {
    sponsor.contractMonths = Math.min(36, contractMonths);
  }

  return sponsor;
}

// Ruta pública (sin ADMIN_KEY): la app la llama para pintar los patrocinios
// de la ciudad activa, igual que antes leía el SPONSORS_DEMO estático. Solo
// devuelve los que están dentro de su ventana startDate/endDate (si la
// tienen) — un patrocinio caducado desaparece solo, sin tocar nada a mano.
async function handleSponsorsList(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ sponsors: [] }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const cityId = String((payload && payload.cityId) || '').trim();
  if (!cityId || !env.SPONSORS) {
    return new Response(JSON.stringify({ sponsors: [] }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `sponsors-list:${ip}` });
    if (!success) {
      return new Response(JSON.stringify({ sponsors: [] }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }

  const list = await env.SPONSORS.list({ prefix: 'sponsor:' });
  const today = todayISO();
  const sponsors = (await Promise.all(list.keys.map(async (k) => {
    try { return JSON.parse(await env.SPONSORS.get(k.name)); } catch (_) { return null; }
  })))
    .filter((s) => s && s.city === cityId && isSponsorActive(s, today));

  return new Response(JSON.stringify({ sponsors }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Lista SIN filtrar (todas las ciudades, activos o no) para la tabla de
// gestión del panel — a diferencia de /sponsors/list, esta sí exige
// ADMIN_KEY: expone datos que aún no han empezado o ya caducaron.
async function handleSponsorsAdminList(request, env, headers) {
  const { error } = await checkAdminAccess(request, env, headers, 'SPONSORS');
  if (error) return error;

  const list = await env.SPONSORS.list({ prefix: 'sponsor:' });
  const sponsors = (await Promise.all(list.keys.map(async (k) => {
    try { return JSON.parse(await env.SPONSORS.get(k.name)); } catch (_) { return null; }
  }))).filter(Boolean);

  return new Response(JSON.stringify({ sponsors }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Crea o actualiza un patrocinador (mismo "id" = actualiza). checkAdminAccess
// ya ha leído el body como JSON, así que el propio payload (con la clave
// "sponsor" además de "adminKey") llega en { payload }.
async function handleSponsorsUpsert(request, env, headers) {
  const { error, payload } = await checkAdminAccess(request, env, headers, 'SPONSORS');
  if (error) return error;

  const sponsor = sanitizeSponsorInput(payload && payload.sponsor);
  if (!sponsor) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  await env.SPONSORS.put(`sponsor:${sponsor.id}`, JSON.stringify(sponsor));

  return new Response(JSON.stringify({ ok: true, sponsor }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Borra un patrocinador por id.
async function handleSponsorsDelete(request, env, headers) {
  const { error, payload } = await checkAdminAccess(request, env, headers, 'SPONSORS');
  if (error) return error;

  const id = String((payload && payload.id) || '').trim().slice(0, 80);
  if (!id) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  await env.SPONSORS.delete(`sponsor:${id}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// ============================================================
// FICHA PÚBLICA DEL NEGOCIO (ver patrocinador.html)
//
// El negocio rellena solo su parte de contenido (nunca ciudad, nivel,
// coordenadas, fechas...: eso lo decides tú al importarlo desde "Gestión").
// Se guarda bajo "pending:<id>" en el mismo KV SPONSORS, separado de
// "sponsor:<id>" por prefijo — nunca aparece en /sponsors/list ni en la app
// hasta que tú lo conviertes en un patrocinador real.
// ============================================================
function sanitizeSponsorSubmission(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const name = String(raw.name || '').trim().slice(0, 120);
  const teaser = dualText(raw.teaser, SPONSOR_SUBMISSION_TEASER_MAX);
  if (!name || !teaser) return null;

  const submission = { name, teaser };

  const contact = String(raw.contact || '').trim().slice(0, 120);
  if (contact) submission.contact = contact;

  const ctaLabel = dualText(raw.ctaLabel, SPONSOR_SUBMISSION_CTA_MAX);
  if (ctaLabel) submission.ctaLabel = ctaLabel;

  const menuPdf = String(raw.menuPdf || '').trim().slice(0, 300);
  if (menuPdf) submission.menuPdf = menuPdf;

  if (Array.isArray(raw.menu)) {
    const menu = raw.menu
      .slice(0, SPONSOR_SUBMISSION_MENU_MAX_ROWS)
      .map((row) => ({
        item: dualText(row && row.item, 60),
        price: dualText(row && row.price, 20)
      }))
      .filter((row) => row.item && row.price);
    if (menu.length) submission.menu = menu;
  }

  return submission;
}

async function handleSponsorsSubmit(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  if (!env.SPONSORS) {
    return new Response(JSON.stringify({ ok: false, reason: 'not-configured' }), {
      status: 501,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `sponsors-submit:${ip}` });
    if (!success) {
      return new Response(JSON.stringify({ ok: false, reason: 'rate-limited' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }

  const submission = sanitizeSponsorSubmission(payload);
  if (!submission) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
  submission.submittedAt = Date.now();

  const id = crypto.randomUUID();
  await env.SPONSORS.put(`pending:${id}`, JSON.stringify(submission));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Lista de fichas recibidas todavía sin importar (pestaña "Gestión").
async function handleSponsorsPendingList(request, env, headers) {
  const { error } = await checkAdminAccess(request, env, headers, 'SPONSORS');
  if (error) return error;

  const list = await env.SPONSORS.list({ prefix: 'pending:' });
  const pending = (await Promise.all(list.keys.map(async (k) => {
    try {
      const data = JSON.parse(await env.SPONSORS.get(k.name));
      return { ...data, id: k.name.slice('pending:'.length) };
    } catch (_) { return null; }
  }))).filter(Boolean);
  pending.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  return new Response(JSON.stringify({ pending }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Descarta una ficha pendiente — tanto al rechazarla como justo después de
// importarla con éxito (ver spImportPending en admin/dashboard.html).
async function handleSponsorsPendingDelete(request, env, headers) {
  const { error, payload } = await checkAdminAccess(request, env, headers, 'SPONSORS');
  if (error) return error;

  const id = String((payload && payload.id) || '').trim().slice(0, 80);
  if (!id) {
    return new Response(JSON.stringify({ ok: false, reason: 'bad-request' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  await env.SPONSORS.delete(`pending:${id}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}
