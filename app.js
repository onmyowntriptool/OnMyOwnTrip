(() => {
  'use strict';

  // ========================================================
  // GLOBAL ERROR GUARD:
  // Si CUALQUIER cosa falla dentro del IIFE, no nos quedamos a oscuras.
  // Reportamos el error al usuario mediante un toast y no aborta el resto.
  // ========================================================
  try {

  /* =========================================================
   * CONFIGURABLE LLM CONNECTOR
   *   - To enable a real API: define window.LLM_CONFIG BEFORE this script (in index.html top script)
   *     {
   *       provider: 'openai',       // 'openai' | 'anthropic'
   *       apiKey:   'sk-...',
   *       model:    'gpt-4o-mini',  // 'gpt-4o' / 'claude-3-5-sonnet-20240620'
   *       baseUrl:  'https://api.openai.com/v1'  // optional override
   *     }
   *   - Otherwise: a smart local simulator is used (template-based, context-aware, dual mode)
   * =======================================================*/
  const LLM = (() => {
    const CFG = typeof window !== 'undefined' ? (window.LLM_CONFIG || null) : null;

    // "concise" lo usa la conversación por voz (ver queueCallTurn en app.js):
    // en una llamada nadie quiere escuchar un párrafo entero solo para saber
    // cuánto mide algo, así que ahí se pide expresamente lo contrario que en
    // el chat de texto normal (que sí busca respuestas ricas y extensas).
    const systemPromptFor = (mode, cityName = 'la ciudad', concise = false) => {
      // Guardarraíl anti-alucinación (mismo para las 4 variantes): sin esto,
      // ante una pregunta suelta sin relación con el lugar (deberes, otro
      // tema, algo random) el modelo tiende a inventarse una respuesta con
      // el mismo tono seguro que el resto, en vez de admitir que no viene
      // a cuento. Se aplica solo a preguntas libres del usuario, no a los
      // prompts de los botones de tema (esos siempre son sobre el sitio).
      const offTopicGuardKids = 'Si te preguntan algo que no tiene nada que ver con este lugar (deberes, otro tema, cualquier cosa random), no te lo inventes: dilo con humor y anímale a preguntar sobre lo que le rodea.';
      const offTopicGuardAdult = 'Si la pregunta del usuario no tiene relación con este lugar concreto, no te la inventes: indícaselo con amabilidad y sugiere qué sí puedes contarle sobre el sitio.';
      // Guardarraíl de contenido (mismo para las 4 variantes): pedido
      // explícitamente para que ninguna respuesta real de la IA —ni
      // siquiera ante una pregunta suelta del usuario con lenguaje
      // grosero o provocador— devuelva palabrotas, contenido obsceno o
      // un tono agresivo, sea cual sea la pregunta.
      const contentSafetyGuard = 'No uses nunca palabrotas, insultos, lenguaje obsceno ni un tono agresivo, aunque la pregunta del usuario los use o los busque a propósito: responde siempre con un tono respetuoso.';
      // Guardarraíl anti-invención de "hechos" concretos (solo modo adulto,
      // sin voz): detectado en pruebas de usuario que, al pedirle un
      // "detalle secreto" observable in situ en CADA respuesta, el modelo
      // rellenaba el hueco inventando anécdotas elaboradas (con "pruebas
      // físicas" y cronistas reales citados de forma inconsistente entre
      // llamadas) cuando el sitio no tenía un dato así de verdad — más
      // frecuente cuanto menos célebre es el lugar. Este guardarraíl hace
      // el detalle opcional y pide honestidad explícita en vez de inventar.
      const factualGuardAdult = 'Si conoces un detalle curioso y verificable que el viajero pueda observar in situ, inclúyelo al final; pero si no estás realmente seguro de que sea cierto, no te lo inventes ni le atribuyas una fuente, cronista o crónica concreta que no conozcas con certeza — en ese caso, o bien indica que es una tradición sin origen documental claro, o simplemente no incluyas ese detalle. Nunca presentes como hecho contrastado algo que te has inventado.';
      // El resto de esta instrucción va en español (el modelo la sigue igual
      // de bien en cualquier idioma); solo esta frase cambia según STATE.lang
      // para que la respuesta real llegue en el idioma que está usando la
      // persona, en vez de forzar siempre español aunque esté viendo el
      // contenido del POI en inglés.
      const langInstruction = STATE.lang === 'en' ? 'Reply always in English.' : 'Responde siempre en español.';
      if (concise) {
        return mode === 'kids'
          ? `Eres "${cityName} Junior", un guía turístico divertido para niños de 7 a 11 años, hablando por VOZ en una llamada en directo (no por texto). Responde SIEMPRE muy corto y directo, como en una conversación real: da primero el dato exacto que se pregunta (una medida, un nombre, un número) y, como mucho, UNA frase corta más con un dato relacionado curioso o relevante. Máximo 2-3 frases en total, nunca listas ni resúmenes largos. ${langInstruction} ${offTopicGuardKids} (también corto, 1 frase). ${contentSafetyGuard}`
          : `Eres "Guía ${cityName}", un guía turístico experto de ${cityName}, hablando por VOZ en una llamada en directo (no por texto). Responde SIEMPRE muy corto y directo, como en una conversación real: da primero el dato concreto que se pregunta (una cifra, un nombre, una fecha) y, como mucho, añade UNA frase corta con un dato relacionado relevante (por ejemplo, si preguntan una medida, la cifra y, si aporta valor, una comparación conocida). Máximo 2-3 frases en total, nunca párrafos largos ni resúmenes. ${langInstruction} ${offTopicGuardAdult} (también corto, 1 frase). ${contentSafetyGuard}`;
      }
      return mode === 'kids'
        ? `Eres "${cityName} Junior", un guía turístico muy divertido, amigable y pedagogógico para niños de 7 a 11 años que visita ${cityName}. ${langInstruction} Frases cortas, emojis, tono juguetón y retos interactivos. NUNCA des miedo. Incluye consejos que un niño pueda hacer allí (mirar arriba, buscar una piedra, contar torres). Da una respuesta extensa y detallada, de unas 190-220 palabras (equivalente a un minuto largo hablado, tan larga como para un adulto), no la resumas. Hazlo memorable. ${offTopicGuardKids} ${contentSafetyGuard}`
        : `Eres "Guía ${cityName}", un guía turístico experto, ameno y con alto conocimiento histórico-artístico de ${cityName}. ${langInstruction} Cercano pero riguroso, citando épocas, autores y datos contrastados. Si el usuario pregunta gastronomía, recomienda platos y establecimientos creíbles del centro. Da una respuesta extensa y con varios párrafos, de unas 190-220 palabras (equivalente a un minuto largo hablado), no la resumas. ${factualGuardAdult} ${offTopicGuardAdult} ${contentSafetyGuard}`;
    };

    const buildUserText = (poi, mode, userQuery, cityName = 'la ciudad') => {
      // Se usa siempre el nombre real (no el apodo de modo niño) como contexto
      // para la IA, para no confundirla con un nombre que no es el oficial.
      const name = pickLang(poi.name).adult;
      const cat = poi.category;
      const subtitleLang = pickLang(poi.subtitle);
      const historyLang = pickLang(poi.tabs.history);
      const context = [
        `Estamos en ${cityName}, justo en: ${name}`,
        `Categoría: ${cat}`,
        `Subtítulo: ${subtitleLang[mode] || subtitleLang.adult}`,
        `Fragmento historia: ${(historyLang[mode] || historyLang.adult).slice(0, 260)}…`
      ].join('. ');
      return `${context}. Usuario pregunta: ${userQuery}`;
    };

    const fetchOpenAI = async (sys, usr, maxTokensOverride) => {
      const url = (CFG.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
      const model = CFG.model || 'gpt-4o-mini';
      // Sin timeout, un fetch que se queda colgado (red inestable, el Worker
      // o el modelo tardando de más) deja la promesa pendiente para
      // siempre: ni error ni respuesta, así que "Pensando…" se queda ahí
      // sin que el usuario sepa si sigue trabajando o se ha roto (mismo
      // motivo que fetchOpenAIVision, más abajo, que ya tenía este límite).
      // Medido en directo sin límite artificial (ver versión de depuración
      // V23.2): una respuesta real de "profundiza más" tarda ~42-45s con la
      // configuración actual (max_tokens 3500, modelo gemini-3.6-flash).
      // 90s da un margen cómodo sobre eso para variaciones normales de red/
      // carga del modelo, sin quedarse corto como pasaba con 25s y luego
      // con 60s. Con el sistema de rellenos locales (ver
      // queueDeepenWithFillers) la espera ya no bloquea al usuario, así que
      // no hay coste real en dejarlo generoso.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const fetchStart = performance.now();
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CFG.apiKey}`
          },
          body: JSON.stringify({
            model,
            temperature: 0.6,
            // maxTokens/extraBody son opcionales en window.LLM_CONFIG:
            // algunos modelos "razonadores" (p.ej. Gemini 3.x vía el
            // endpoint compatible con OpenAI) consumen muchos tokens en
            // pensamiento interno antes de responder, así que necesitan un
            // max_tokens mucho más alto y a veces un reasoning_effort bajo
            // para no cortar la respuesta a medias. maxTokensOverride
            // permite bajarlo para peticiones que ya piden ser breves (ver
            // la llamada de voz, concise en LLM.generate): con menos
            // margen el modelo tiene menos "hueco" para pensar de más, lo
            // que en la práctica también suele acelerar la respuesta.
            max_tokens: maxTokensOverride || CFG.maxTokens || 700,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: usr }
            ],
            ...(CFG.extraBody || {})
          })
        });
      } catch (e) {
        const elapsedSec = ((performance.now() - fetchStart) / 1000).toFixed(1);
        console.info(`[LLM] fetchOpenAI falló tras ${elapsedSec}s: ${e && e.message}`);
        if (e.name === 'AbortError') throw new Error('chat-timeout');
        throw e;
      } finally {
        clearTimeout(timeoutId);
      }
      const elapsedSec = ((performance.now() - fetchStart) / 1000).toFixed(1);
      console.info(`[LLM] fetchOpenAI respondió en ${elapsedSec}s (status ${res.status})`);
      if (!res.ok) {
        const err = new Error(`OpenAI ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const json = await res.json();
      return json?.choices?.[0]?.message?.content?.trim() ?? '';
    };

    // Variante con foto para "¿qué estoy viendo?" (ver scanForPoi en la UI):
    // mismo endpoint, pero con el content como array (texto + image_url), el
    // formato multimodal estándar que Gemini expone vía su capa compatible
    // con OpenAI. El Worker no distingue esto de una petición normal, así
    // que no necesita ningún cambio.
    //
    // IMPORTANTE: aunque la respuesta que queremos es corta (un id), hay que
    // mandar el mismo extraBody (reasoning_effort) que la llamada normal y
    // un max_tokens generoso: los modelos "razonadores" (p.ej. Gemini vía
    // este endpoint) gastan tokens en pensamiento interno ANTES de escribir
    // nada visible, así que un max_tokens bajo (p.ej. 20) puede agotarse
    // entero en ese pensamiento y devolver contenido vacío sin dar ningún
    // error — parece que la app "no responde" cuando en realidad la API
    // respondió 200 OK con la respuesta cortada a la nada.
    const fetchOpenAIVision = async (sys, usrText, imageDataUrl, maxTokens) => {
      const url = (CFG.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
      const model = CFG.model || 'gpt-4o-mini';
      // Sin timeout, un fetch que se queda colgado (red inestable, el
      // Worker o el modelo tardando de más) deja la promesa pendiente para
      // siempre: ni error ni respuesta, así que la app parece no responder
      // aunque en realidad sigue "esperando" sin que el usuario lo sepa.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CFG.apiKey}`
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: maxTokens || 300,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: [
                { type: 'text', text: usrText },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ] }
            ],
            ...(CFG.extraBody || {})
          })
        });
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('vision-timeout');
        throw e;
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        // El cuerpo del error de Gemini distingue "modelo saturado en este
        // instante" (RESOURCE_EXHAUSTED por rate-limit puntual, se
        // resuelve solo) de "cuota del día/mes agotada" (mismo código,
        // pero el mensaje lo aclara) — sin esto solo se ve "503" y no hay
        // forma de saber cuál de las dos es.
        let detail = '';
        try { detail = (await res.text()).slice(0, 300); } catch (_) {}
        console.warn('[Vision] Error de la API, cuerpo de la respuesta:', detail);
        const err = new Error(`OpenAI ${res.status}`);
        err.status = res.status;
        err.detail = detail;
        throw err;
      }
      const json = await res.json();
      return json?.choices?.[0]?.message?.content?.trim() ?? '';
    };

    // Reconocimiento visual: dada una foto y una lista corta de POIs
    // cercanos (ya acotada por GPS, ver scanForPoi): primero intenta que la
    // IA confirme cuál de esos candidatos concretos es (nunca le dejamos
    // adivinar un candidato inventado). Si la foto NO es ninguno de los
    // candidatos pero la IA aun así reconoce el lugar (aunque no esté en
    // nuestros datos), lo dice igual, con un resumen — ver scanForPoi para
    // cómo se presenta eso después con un aviso de "sin verificar", ya que
    // ese dato no está curado como el resto de la app.
    const identifyPoi = async ({ imageDataUrl, candidates, cityName }) => {
      if (!CFG || !CFG.apiKey || CFG.provider !== 'openai') return { supported: false };
      const list = candidates.map((c) => `- id:${c.id} | ${c.name} — ${c.subtitle}`).join('\n');
      // Prompt reforzado tras detectar un caso real de confusión: una foto de
      // la estatua del Oso y el Madroño (en plena Puerta del Sol de Madrid)
      // se identificó como "Puerta del Sol" — el modelo confundió cercanía
      // geográfica con identidad visual, algo muy fácil de que pase cuando
      // dos candidatos distintos comparten la misma plaza o están a pocos
      // metros (una escultura pequeña justo delante de un edificio grande,
      // por ejemplo). Las instrucciones de abajo separan explícitamente
      // ambos conceptos y piden identificar primero el objeto/edificio
      // protagonista de la foto antes de intentar hacer coincidir un id.
      const sys = [
        'Eres un sistema experto de reconocimiento visual de monumentos y lugares turísticos.',
        'Se te da una foto real tomada por un turista y, si las hay, una lista de lugares candidatos cercanos por GPS (con id y una breve descripción).',
        'IMPORTANTE: la lista de candidatos es solo una acotación por cercanía geográfica, NO una lista de opciones garantizadas. Es muy habitual que dos o más candidatos distintos estén en la misma plaza o a pocos metros entre sí (por ejemplo, una estatua o fuente pequeña justo delante de un edificio monumental, o un monumento dentro de una plaza más grande). Que la foto se haya tomado CERCA de un candidato no significa que la foto SEA ese candidato.',
        'Antes de responder, identifica primero qué objeto, escultura o edificio concreto es el protagonista real de la foto (su forma, tamaño, materiales, si es una pieza pequeña aislada o una fachada completa), y solo después compáralo con la descripción de cada candidato.',
        'CASO FRECUENTE A EVITAR: si el protagonista de la foto es un elemento pequeño y autónomo (una estatua, escultura, fuente, monumento puntual, cartel...) situado DENTRO o junto a un candidato que en realidad describe el lugar/plaza/edificio grande que lo rodea, NO respondas MATCH con el id de ese lugar grande solo por estar en el mismo sitio: ese elemento pequeño es un sujeto distinto del espacio que lo contiene. Solo responde MATCH si la propia DESCRIPCIÓN del candidato se refiere a ese elemento concreto (no al espacio general). En caso contrario, trátalo como si no hubiera candidato que coincida e identifícalo en abierto (formato NOMBRE/RESUMEN/INFO) o responde DESCONOCIDO si no lo reconoces con confianza — nunca sustituyas un objeto concreto no reconocido por el lugar general donde estaba.',
        'Responde ÚNICAMENTE en uno de estos formatos, sin texto extra:',
        '1) Si el protagonista de la foto coincide visualmente, de forma clara, con la DESCRIPCIÓN de uno de los candidatos (no solo con la cercanía del lugar donde se tomó): MATCH:<id exacto>',
        '2) Si el protagonista de la foto NO coincide visualmente con ningún candidato de la lista (aunque la foto se haya tomado cerca de alguno), o no había lista, pero aun así reconoces con razonable confianza qué edificio/monumento/escultura/lugar es en realidad:',
        'NOMBRE: <nombre corto>',
        'RESUMEN: <una frase breve>',
        'INFO: <2-3 frases con datos concretos y contrastables: qué es, época o autor, algo destacable>',
        'GUARDARRAÍL ANTI-INVENCIÓN para el campo INFO: no rellenes con color histórico genérico que no venga a cuento (marcas de cantero, asimetrías ópticas deliberadas, leyendas medievales...) si el lugar es evidentemente un espacio o edificio moderno o comercial (una plaza reciente, un centro comercial, un local con cartelería de marca, arquitectura contemporánea). En esos casos, describe con naturalidad lo que de verdad se ve — para qué se usa el lugar, qué hay alrededor, cualquier dato reconocible — sin inventar antigüedad ni artesanía que ese sitio no tiene. Si no tienes datos concretos y fiables que dar, es preferible una INFO breve y honesta a una inventada que suene convincente.',
        '3) Si no puedes identificarlo con una confianza razonable: DESCONOCIDO',
        'No uses nunca palabrotas, insultos ni lenguaje obsceno en ninguna parte de la respuesta.',
        STATE.lang === 'en' ? 'Write the NAME/SUMMARY/INFO content in English (keep the labels MATCH/NOMBRE/RESUMEN/INFO/DESCONOCIDO exactly as given, only the content after them goes in English).' : ''
      ].filter(Boolean).join('\n');
      const usrText = candidates.length
        ? `Foto tomada cerca de ${cityName}. Candidatos cercanos:\n${list}\n\n¿Cuál coincide (MATCH:<id>)? Si no coincide ninguno, identifica igualmente el lugar si puedes (formato NOMBRE/RESUMEN/INFO), o responde DESCONOCIDO.`
        : `Foto tomada cerca de ${cityName}, sin candidatos cercanos conocidos. Identifica qué edificio, monumento o lugar es (formato NOMBRE/RESUMEN/INFO), o responde DESCONOCIDO si no puedes.`;
      // 400 se quedaba corto de verdad: un caso real truncó el campo INFO a
      // mitad de frase ("...orilla del río Sp") y, al concatenarse sin más
      // con el aviso fijo de "Si quieres profundizar...", se leía como
      // "orilla del Si quieres profundizar..." (bug reportado en pruebas de
      // usuario, 2026-09-07). Con modelos "razonadores" (ver comentario de
      // fetchOpenAIVision más arriba) la respuesta MATCH+NOMBRE+RESUMEN+INFO
      // completa necesita más margen que un simple id corto — 900 iguala el
      // límite ya usado para las respuestas "concise" del chat normal.
      const raw = await fetchOpenAIVision(sys, usrText, imageDataUrl, 900);
      const trimmed = raw.trim();
      if (/^DESCONOCIDO/i.test(trimmed)) return { supported: true, type: 'none' };
      const matchTag = trimmed.match(/^MATCH:\s*(.+)/i);
      if (matchTag) {
        const cleaned = matchTag[1].trim().replace(/["'.:\s]+$/, '');
        // Coincidencia exacta primero; si el modelo se ha ido de madre con
        // explicaciones pese a la instrucción, buscamos el id como palabra
        // suelta dentro de la respuesta en vez de descartarlo sin más.
        let match = candidates.find((c) => c.id.toLowerCase() === cleaned.toLowerCase());
        if (!match) {
          const lower = cleaned.toLowerCase();
          match = candidates.find((c) => new RegExp(`\\b${c.id.toLowerCase()}\\b`).test(lower));
        }
        if (match) return { supported: true, type: 'match', poiId: match.id };
      }
      const nameMatch = trimmed.match(/NOMBRE:\s*(.+)/i);
      if (nameMatch) {
        const summaryMatch = trimmed.match(/RESUMEN:\s*(.+)/i);
        const infoMatch = trimmed.match(/INFO:\s*([\s\S]+)/i);
        return {
          supported: true,
          type: 'openended',
          name: nameMatch[1].trim(),
          subtitle: summaryMatch ? summaryMatch[1].trim() : '',
          info: infoMatch ? infoMatch[1].trim() : ''
        };
      }
      return { supported: true, type: 'none' };
    };

    const fetchAnthropic = async (sys, usr) => {
      const url = (CFG.baseUrl || 'https://api.anthropic.com') + '/v1/messages';
      const model = CFG.model || 'claude-3-5-sonnet-20240620';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CFG.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          system: sys,
          max_tokens: 700,
          temperature: 0.6,
          messages: [{ role: 'user', content: usr }]
        })
      });
      if (!res.ok) {
        const err = new Error(`Anthropic ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const json = await res.json();
      const block = json?.content?.find((b) => b.type === 'text');
      return (block?.text ?? '').trim();
    };

    /* ---- LOCAL SIMULATOR (template + POI context-aware, no network) ---- */
    const SIM = {
      pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
      // Idioma activo del simulador local: SIM vive en el mismo cierre que
      // STATE, así que puede leerlo directamente en cada llamada sin que
      // haga falta pasarlo como parámetro por todas las funciones de abajo.
      L() { return STATE.lang === 'en' ? 'en' : 'es'; },
      // Los textos de poi.tabs son bastante breves (~60-90 palabras). Estas
      // intros/cierres genéricos se combinan con ellos para que cada
      // narración dure de forma fiable alrededor de un minuto hablado.
      introsAdult: {
        es: [
          `Este casco histórico concentra siglos de civilizaciones superpuestas, y este lugar es una de las piezas clave para entenderlo.`,
          `Pocos rincones del mundo condensan tanta historia en tan poco espacio como este; aquí conviven huellas de distintas épocas y culturas.`,
          `Este es uno de esos lugares que conviene visitar despacio, porque cada detalle esconde una capa distinta de la historia de la ciudad.`
        ],
        en: [
          `This historic quarter holds centuries of overlapping civilizations, and this spot is one of the key pieces for understanding it.`,
          `Few corners of the world pack as much history into so little space as this one; traces of different eras and cultures coexist right here.`,
          `This is one of those places worth visiting slowly, because every detail hides a different layer of the city's history.`
        ]
      },
      closingsAdult: {
        es: [
          `Antes de seguir caminando, tómate un momento para observar los materiales, las proporciones y la luz: son estos detalles, más que las fechas, los que realmente transmiten el paso del tiempo. Si te fijas bien, notarás que las distintas épocas conviven sin imponerse unas sobre otras, algo poco habitual.`,
          `Vale la pena imaginar cómo sería este lugar hace siglos, con otro tráfico de personas, otros oficios y otras preocupaciones cotidianas. La piedra permanece, pero quienes la habitaron cambiaron muchas veces de forma de vida, de lengua y de religión, dejando cada uno su propia huella superpuesta.`,
          `Un buen viajero no solo mira, también escucha: el eco de los pasos, el silencio de las calles, el contraste entre la piedra fría y la luz del día. Todo eso forma parte de la experiencia tanto como los datos históricos que acabas de escuchar.`
        ],
        en: [
          `Before you keep walking, take a moment to look at the materials, the proportions, the light: these details, more than any date, are what really convey the passage of time. Look closely and you'll notice how the different eras coexist without one overpowering the other — something not so common.`,
          `It's worth imagining what this place looked like centuries ago, with a different flow of people, different trades, different everyday concerns. The stone remains, but the people who lived here changed their way of life, their language, and their religion many times over, each leaving their own layer behind.`,
          `A good traveler doesn't just look, they also listen: the echo of footsteps, the silence of the streets, the contrast between cold stone and daylight. All of that is as much a part of the experience as the historical facts you just heard.`
        ]
      },
      introsKids: {
        es: [
          `¡Prepárate para un viaje en el tiempo! Este sitio ha visto pasar reyes, caballeros y hasta alguna leyenda de dragones. 🐉`,
          `Esta ciudad esconde secretos en cada rincón, ¡y este es uno de los más chulos que vas a descubrir hoy! 🗺️`,
          `Agárrate fuerte, porque lo que te voy a contar lleva aquí cientos y cientos de años. ⏳✨`
        ],
        en: [
          `Get ready for a trip through time! This spot has seen kings, knights, and even a dragon legend or two go by. 🐉`,
          `This city hides secrets around every corner, and this is one of the coolest ones you'll discover today! 🗺️`,
          `Hold on tight, because what I'm about to tell you has been here for hundreds and hundreds of years. ⏳✨`
        ]
      },
      closingsKids: {
        es: [
          `Antes de seguir tu aventura, mira bien a tu alrededor: fíjate en los colores de la piedra, en las formas raras de las ventanas y en lo alto que es todo. Los mejores exploradores son los que se fijan en los detalles pequeños que casi nadie ve. 🔍`,
          `Imagina a los niños que vivían aquí hace muchísimos años, jugando por estas mismas calles. ¿Jugarían a lo mismo que tú? Seguro que también se hacían un montón de preguntas mirando este lugar, igual que tú ahora mismo. 🤔`,
          `Cierra los ojos un segundo y escucha: el viento, los pájaros, algún eco lejano… Cada rincón de esta ciudad suena distinto, y este es uno de los sitios donde más se nota. 👂✨`
        ],
        en: [
          `Before you continue your adventure, take a good look around: check out the colors of the stone, the funny shapes of the windows, and how tall everything is. The best explorers are the ones who notice the tiny details almost nobody else sees. 🔍`,
          `Imagine the kids who lived here a very long time ago, playing in these very same streets. Would they play the same games as you? They probably asked themselves a ton of questions looking at this place too, just like you're doing right now. 🤔`,
          `Close your eyes for a second and listen: the wind, the birds, some far-off echo… Every corner of this city sounds different, and this is one of the places where you notice it the most. 👂✨`
        ]
      },
      // Introducciones específicas para "Historia secreta": el dato real viene
      // de poi.tabs.legends (igual que el chip "Leyendas"), así que aquí se usa
      // un envoltorio distinto ("dato poco conocido" en vez de "cuenta la
      // leyenda") para que no se lea como una repetición literal del otro chip.
      secretIntrosAdult: {
        es: [
          `No es un dato que aparezca en las guías al uso, pero muchos vecinos y guías locales lo conocen bien.`,
          `Es de esos detalles que casi nunca se cuentan en una visita rápida, aunque cambian bastante la forma de ver el lugar.`,
          `Pocos visitantes se paran a preguntar por esto, aunque forma parte de lo que hace único a este sitio.`
        ],
        en: [
          `It's not something you'll find in the usual guidebooks, but plenty of locals and tour guides know it well.`,
          `It's the kind of detail that's almost never mentioned on a quick visit, even though it changes the way you see the place quite a bit.`,
          `Few visitors ever stop to ask about this, even though it's part of what makes this place unique.`
        ]
      },
      secretIntrosKids: {
        es: [
          `¡Esto es un secreto que no todo el mundo conoce! 🤫`,
          `Prepárate, porque esto que te voy a contar no lo sabe todo el mundo... 🤭`,
          `¡Shhh! Acércate un poco, que esto es un secretillo especial de este lugar. 🤫✨`
        ],
        en: [
          `This is a secret not everyone knows! 🤫`,
          `Get ready, because not everybody knows what I'm about to tell you... 🤭`,
          `Shhh! Come a little closer, this is a special little secret about this place. 🤫✨`
        ]
      },
      greet(poi, m) {
        // Nombre real siempre, aunque se hable en modo niño: el apodo
        // divertido es solo para lo que se lee en pantalla.
        const n = pickLang(poi.name).adult;
        if (this.L() === 'en') {
          if (m === 'kids') {
            return `Hi! 👋 You're right at ${n}, one of my favorite spots in the whole city! 🤩 Let me tell you all about it in the coolest way possible… Ready for the adventure?`;
          }
          return `Welcome to ${n}. I'm your personal local guide. Here's a quick rundown so you can make the most of your visit without missing a single detail.`;
        }
        if (m === 'kids') {
          return `¡Hola! 👋 Estás justo en ${n}, ¡uno de mis lugares preferidos de toda la ciudad! 🤩 Déjame contártelo de la forma más chula… ¿Listo para la aventura?`;
        }
        return `Bienvenido a ${n}. Soy tu guía local personalizada. A continuación un resumen ágil para que aproveches al máximo tu visita, sin perderte ningún detalle.`;
      },
      // Nota: ya no se usa para el resumen inicial de un POI (ver
      // buildIntroText/ensureAiPanelInitialGreet, que no depende de la IA);
      // queda como fallback si algún día "summary" volviera a pedirse a la IA.
      summary(poi, m) {
        const historyFull = poi.tabs.history[m] || poi.tabs.history.adult || '';
        const historyRest = historyFull.split('.').slice(1).join('.').trim();
        const historyForSummary = historyRest || historyFull;
        const lang = this.L();
        if (m === 'kids') {
          const challenges = lang === 'en' ? [
            `🎯 Challenge: Count how many towers you can see from here and shout the number out loud 🔊.`,
            `🎯 Challenge: Take a photo pretending to grab the building with your hand 🤏.`,
            `🎯 Challenge: Find a colorful window and describe what shape it has 🌈.`
          ] : [
            `🎯 Reto: Cuenta cuántas torres se ven desde aquí y grita el número en voz alta 🔊.`,
            `🎯 Reto: Haz una foto fingiendo que agarras el edificio con tu mano 🤏.`,
            `🎯 Reto: Encuentra una ventana de colores y describe qué forma tiene 🌈.`
          ];
          return `${this.pick(this.introsKids[lang])}\n\n${historyForSummary}\n\n${this.pick(this.closingsKids[lang])}\n\n${this.pick(challenges)}`;
        }
        if (lang === 'en') {
          const src = `Guide source: ${this.pick(['Local chronicles (16th c.)', 'Academy of History', 'General Inventory of Cultural Heritage Sites'])}`;
          return `${this.pick(this.introsAdult.en)}\n\n${historyForSummary}\n\n${this.pick(this.closingsAdult.en)}\n\n${src}.`;
        }
        const src = `Fuente guía: ${this.pick(['Crónicas locales (s. XVI)', 'Academia de la Historia', 'Inventario General de Bienes de Interés Cultural'])}`;
        return `${this.pick(this.introsAdult.es)}\n\n${historyForSummary}\n\n${this.pick(this.closingsAdult.es)}\n\n${src}.`;
      },
      pickDistinct(arr, count) {
        const pool = arr.slice();
        const out = [];
        while (out.length < count && pool.length) {
          const idx = Math.floor(Math.random() * pool.length);
          out.push(pool.splice(idx, 1)[0]);
        }
        return out;
      },
      // Datos de "profundizar" por tema (no genéricos), para que la respuesta
      // siga hablando realmente de historia secreta / arquitectura / comida /
      // leyendas, y no derive hacia otro asunto sin relación. Bancos amplios
      // a propósito (12 frases por tema y modo, no 4): como se piden solo 3
      // al azar cada vez (ver pickDistinct) y "Profundiza más" puede tocarse
      // varias veces seguidas en menos de lo que tarda la IA real en
      // responder (42-45s, ver más arriba), un banco pequeño hacía que las
      // mismas frases se repitieran enseguida, tanto dentro de una misma
      // parada como entre paradas distintas — el problema real detectado en
      // producción no era que "no fuera IA de verdad" sino que el banco de
      // respaldo era demasiado corto para disimularlo.
      deepenFacts: {
        es: {
          adult: {
            'secret-history': [
              `un documento del archivo diocesano menciona un incidente que nunca llegó a las crónicas oficiales, silenciado probablemente por conveniencia política de la época`,
              `algunos vecinos más veteranos del barrio conservan relatos orales que nunca se han recogido por escrito, transmitidos de generación en generación`,
              `un historiador local publicó hace pocos años una referencia que contradice la versión más difundida de los hechos, aunque todavía no se ha investigado a fondo`,
              `existen indicios de que ciertos episodios se atenuaron deliberadamente en las crónicas para no comprometer a familias influyentes de la época`,
              `se conserva una carta privada que menciona un uso del edificio distinto del que se cuenta habitualmente en las visitas, nunca confirmado del todo`,
              `un inventario antiguo recoge un detalle que no encaja del todo con la explicación que suele darse hoy a los visitantes`,
              `existe una fotografía de época que muestra un elemento que ya no está y del que apenas queda constancia documental`,
              `algunos archivos parroquiales de la zona guardan referencias sueltas que nunca se han cruzado entre sí para reconstruir la historia completa`,
              `un cronista de hace más de un siglo dejó anotado un episodio menor que ninguna guía moderna recoge`,
              `los registros municipales conservan una versión de los hechos que rara vez coincide del todo con la que se cuenta en las visitas guiadas`,
              `los planos originales, comparados con el estado actual, muestran un cambio que ningún documento explica con claridad`,
              `hay un testimonio recogido a mediados del siglo pasado que aporta un matiz distinto a la versión oficial, aunque nunca se llegó a publicar`
            ],
            'architecture': [
              `un detalle que pocos guías mencionan es que los canteros solían dejar una marca personal oculta, visible solo con luz rasante al amanecer o al atardecer`,
              `los registros de la época recogen anécdotas curiosas sobre reformas posteriores que no siempre aparecen en las guías oficiales`,
              `un matiz que sorprende a los expertos es la superposición de técnicas constructivas de distintas épocas en el mismo punto`,
              `restauraciones recientes revelaron capas anteriores que cambian ligeramente la datación tradicional que se suele contar a los visitantes`,
              `algunos elementos estructurales se reutilizaron de una construcción anterior, algo que solo se aprecia mirando con atención los materiales`,
              `los canteros de la época solían firmar su trabajo con pequeñas marcas de cantero, muchas de las cuales siguen sin identificarse del todo`,
              `un estudio reciente detectó asimetrías deliberadas en la construcción, probablemente para corregir efectos ópticos a cierta distancia`,
              `parte de la piedra empleada procede de una cantera bastante alejada, lo que en su momento supuso un esfuerzo logístico considerable`,
              `algunas reformas posteriores intentaron imitar el estilo original con tanto cuidado que hoy cuesta distinguir qué es antiguo y qué no`,
              `los cimientos esconden restos de una estructura anterior, descubiertos por casualidad durante unas obras de mantenimiento`,
              `ciertos detalles decorativos se colocaron pensando en cómo se verían desde la calle, no desde donde hoy los observa la mayoría de visitantes`,
              `una revisión técnica reciente encontró señales de al menos dos fases constructivas distintas, algo que no siempre se explica en las visitas`
            ],
            'legends': [
              `existen variantes de esta leyenda en pueblos cercanos, con protagonistas distintos pero un desenlace casi idéntico, lo que sugiere un origen común más antiguo`,
              `algunos investigadores del folclore creen que estas historias servían para explicar fenómenos naturales que la gente de la época no podía comprender de otra forma`,
              `hay quien asegura haber vivido una experiencia similar a la de la leyenda en tiempos recientes, aunque nunca ha quedado documentada de forma oficial`,
              `la versión que se cuenta hoy en día difiere bastante de la recogida en manuscritos antiguos, señal de que la historia se ha ido adornando con el tiempo`,
              `algunos folcloristas apuntan a que la leyenda pudo nacer como advertencia práctica, disfrazada de historia fantástica para que se recordara mejor`,
              `existe una versión bastante más antigua y menos conocida, con un final distinto al que se suele contar hoy a los visitantes`,
              `en pueblos vecinos circula una historia parecida, aunque allí se atribuye a un personaje completamente distinto`,
              `algunos vecinos mayores todavía se refieren a la leyenda como si fuera un hecho histórico más, sin distinguir claramente dónde acaba lo real`,
              `hay quien relaciona la leyenda con un suceso real documentado, aunque la conexión nunca se ha podido demostrar del todo`,
              `la tradición oral local añade detalles que no aparecen en ninguna versión escrita conocida`,
              `algunos estudiosos creen que la leyenda se reforzó con el tiempo para atraer peregrinos o viajeros a la zona`,
              `existe una representación artística antigua de la leyenda que difiere en varios detalles de cómo se cuenta actualmente`
            ]
          },
          kids: {
            'secret-history': [
              `Cuentan que hay una carta muy antigua escondida en un archivo que nadie ha terminado de leer 📜, ¡y podría guardar otro secreto más!`,
              `Los abuelos del barrio se cuentan unos a otros historias de este sitio que nunca se han escrito en ningún libro 👴👵.`,
              `Un investigador encontró hace poco un papel que contaba la historia de otra forma distinta 🕵️‍♀️, ¡y todavía la están estudiando!`,
              `¡Hay una foto muy vieja que muestra algo que ya no existe! 📷 Nadie sabe muy bien qué pasó con ello.`,
              `Dicen que en los archivos de la iglesia hay papeles sueltos que nadie ha juntado todavía para saber la historia completa 🗂️.`,
              `Un señor que escribía sobre esta ciudad hace muchísimos años apuntó un dato pequeñito que nadie más ha contado nunca ✍️.`,
              `¡Los planos antiguos de este sitio no son iguales a como está ahora! 📐 Y nadie explica muy bien por qué cambió.`,
              `Hay un testimonio guardado desde hace muchos años que cuenta la historia de una forma un poquito distinta 🗣️.`
            ],
            'architecture': [
              `¿Sabías que si cuentas hasta 3 antes de mirar hacia arriba, dicen que ves el detalle mágico mejor? 👀 Muchos niños que han venido antes que tú lo han probado y juran que funciona.`,
              `Un dato flipante: ¡algunas piedras de aquí pesan tanto como 3 elefantes juntos! 🐘🐘🐘 Y aun así, las subieron sin grúas ni máquinas, solo con cuerdas y mucha fuerza en equipo.`,
              `¡Hay una marca secreta tallada en una piedra que solo se ve si el sol pega de lado! ☀️ Todavía nadie se pone de acuerdo en qué significa exactamente.`,
              `¡Algunas piedras de aquí vienen de una cantera súper lejana! 🪨 Traerlas hasta aquí en aquella época fue toda una aventura.`,
              `¿Sabías que parte de esta construcción se hizo reutilizando piedras de un edificio todavía más viejo? ♻️ ¡Como un puzle gigante!`,
              `Los que construyeron esto dejaban su propia marca tallada en la piedra, como una firma secreta 🔏, ¡y muchas siguen sin descifrarse!`,
              `¡Debajo de este sitio hay restos de una construcción todavía más antigua! 🕳️ Los encontraron sin querer haciendo obras.`,
              `¡Fíjate bien! Algunos detalles se colocaron pensando en cómo se verían desde lejos, no desde tan cerca como los ves tú ahora 🔎.`
            ],
            'legends': [
              `¡Esta misma leyenda se cuenta también en otros pueblos, pero con otros protagonistas! 🧚 A lo mejor todas vienen de una historia aún más antigua.`,
              `Algunas personas mayores dicen que a ellos también les pasó algo parecido a lo de la leyenda 😲, ¡aunque nadie lo ha escrito nunca!`,
              `Cuentan que esta leyenda ha ido cambiando un poquito cada vez que se cuenta, ¡como el juego del teléfono escacharrado! 📞😄`,
              `¡Hay una versión mucho más antigua de esta leyenda, con un final distinto! 📖 A lo mejor te gusta más que la de ahora.`,
              `En un pueblo cercano cuentan casi la misma historia, ¡pero con un personaje totalmente diferente! 🎭`,
              `Algunos vecinos hablan de la leyenda como si de verdad hubiera pasado tal cual 😮, ¡sin dudarlo ni un poquito!`,
              `Hay quien dice que la leyenda viene de algo que sí pasó de verdad, ¡aunque nadie lo ha podido comprobar del todo! 🔍`,
              `¡Existe un dibujo muy antiguo de esta leyenda, y no se parece del todo a como te la acabo de contar! 🎨`
            ]
          }
        },
        en: {
          adult: {
            'secret-history': [
              `a document in the diocesan archive mentions an incident that never made it into the official chronicles, likely silenced for political convenience at the time`,
              `some of the neighborhood's oldest residents still keep oral accounts that have never been written down, passed on from generation to generation`,
              `a local historian published a reference a few years ago that contradicts the most widespread version of events, though it still hasn't been fully investigated`,
              `there are signs that certain episodes were deliberately toned down in the chronicles so as not to compromise influential families of the time`,
              `a private letter survives that mentions a use of the building different from what's usually told on tours, though it's never been fully confirmed`,
              `an old inventory records a detail that doesn't quite match the explanation usually given to visitors today`,
              `there's a period photograph showing an element that's no longer there and for which barely any documentation survives`,
              `some parish archives in the area hold scattered references that have never been cross-checked to reconstruct the full story`,
              `a chronicler from over a century ago noted down a minor episode that no modern guidebook mentions`,
              `municipal records preserve a version of events that rarely fully matches the one told on guided tours`,
              `the original blueprints, compared with the current layout, show a change that no document explains clearly`,
              `there's a testimony collected in the mid-20th century that adds a different nuance to the official version, though it was never published`
            ],
            'architecture': [
              `a detail few guides mention is that stonemasons used to leave a hidden personal mark, visible only in raking light at dawn or dusk`,
              `records from the period contain curious anecdotes about later renovations that don't always make it into official guides`,
              `a detail that surprises experts is the overlap of construction techniques from different eras at the very same spot`,
              `recent restorations revealed earlier layers that slightly shift the traditional dating usually given to visitors`,
              `some structural elements were reused from an earlier building, something only noticeable if you look closely at the materials`,
              `stonemasons of the time used to sign their work with small mason's marks, many of which still haven't been fully identified`,
              `a recent study detected deliberate asymmetries in the construction, probably to correct optical effects at a certain distance`,
              `some of the stone used comes from a quarry quite far away, which at the time meant a considerable logistical effort`,
              `some later renovations tried to mimic the original style so carefully that today it's hard to tell what's original and what isn't`,
              `the foundations hide remains of an earlier structure, discovered by chance during maintenance work`,
              `certain decorative details were placed with how they'd look from the street in mind, not from where most visitors view them today`,
              `a recent technical survey found signs of at least two distinct construction phases, something that isn't always explained on tours`
            ],
            'legends': [
              `variants of this legend exist in nearby towns, with different characters but an almost identical ending, suggesting a common, older origin`,
              `some folklore researchers believe these stories served to explain natural phenomena that people of the time couldn't understand any other way`,
              `some claim to have had an experience similar to the legend in recent times, though it's never been officially documented`,
              `the version told today differs quite a bit from the one recorded in old manuscripts, a sign the story has been embellished over time`,
              `some folklorists suggest the legend may have started as a practical warning, dressed up as a fantastical tale so it would be remembered better`,
              `a much older, lesser-known version exists, with a different ending from the one usually told to visitors today`,
              `a similar story circulates in neighboring towns, though there it's attributed to a completely different character`,
              `some older residents still talk about the legend as if it were plain historical fact, without clearly distinguishing where reality ends`,
              `some link the legend to a real, documented event, although the connection has never been fully proven`,
              `local oral tradition adds details that don't appear in any known written version`,
              `some scholars believe the legend was reinforced over time to attract pilgrims or travelers to the area`,
              `an old artistic depiction of the legend exists that differs in several details from how it's told today`
            ]
          },
          kids: {
            'secret-history': [
              `They say there's a very old letter hidden in an archive that nobody has finished reading yet 📜, and it might hold another secret!`,
              `The grandparents of the neighborhood tell each other stories about this place that have never been written in any book 👴👵.`,
              `A researcher recently found a paper that told the story a totally different way 🕵️‍♀️, and they're still studying it!`,
              `There's a very old photo that shows something that doesn't exist anymore! 📷 Nobody really knows what happened to it.`,
              `They say the church archives have loose papers nobody has put together yet to find out the whole story 🗂️.`,
              `A man who wrote about this city a very long time ago jotted down a tiny detail that nobody else has ever told ✍️.`,
              `The old plans of this place aren't the same as how it looks now! 📐 And nobody really explains why it changed.`,
              `There's a testimony kept for many years that tells the story in a slightly different way 🗣️.`
            ],
            'architecture': [
              `Did you know that if you count to 3 before looking up, they say you spot the magic detail better? 👀 Lots of kids who came before you have tried it and swear it works.`,
              `A mind-blowing fact: some of the stones here weigh as much as 3 elephants put together! 🐘🐘🐘 And they still hauled them up with no cranes or machines, just ropes and a lot of teamwork.`,
              `There's a secret mark carved into a stone that you can only see when the sun hits it sideways! ☀️ Nobody agrees yet on exactly what it means.`,
              `Some of the stones here come from a super far-away quarry! 🪨 Bringing them all the way here back then was a real adventure.`,
              `Did you know part of this building was made by reusing stones from an even older building? ♻️ Like a giant puzzle!`,
              `The people who built this carved their own mark into the stone, like a secret signature 🔏, and lots of them are still a mystery!`,
              `Underneath this spot there are remains of an even older building! 🕳️ They found them by accident during some repair work.`,
              `Look closely! Some details were placed thinking about how they'd look from far away, not up close like you're seeing them now 🔎.`
            ],
            'legends': [
              `This very same legend is told in other towns too, but with different characters! 🧚 Maybe they all come from an even older story.`,
              `Some grown-ups say something similar to the legend happened to them too 😲, even though nobody has ever written it down!`,
              `They say this legend has changed a little bit every time it's told, just like the telephone game! 📞😄`,
              `There's a much older version of this legend, with a different ending! 📖 Maybe you'll like it even more than the one now.`,
              `In a nearby town they tell almost the same story, but with a totally different character! 🎭`,
              `Some locals talk about the legend as if it really happened exactly like that 😮, without doubting it one bit!`,
              `Some say the legend comes from something that really did happen, though nobody's been able to fully prove it! 🔍`,
              `There's a very old drawing of this legend, and it doesn't quite look like how I just told it to you! 🎨`
            ]
          }
        }
      },
      deepen(poi, m, topicId) {
        const lang = this.L();
        const topicMeta = pickLang(AI_TOPIC_NAMES[topicId]);
        const topic = topicMeta ? (topicMeta[m] || topicMeta.adult) : (m === 'kids' ? (lang === 'en' ? 'this' : 'esto') : (lang === 'en' ? 'this topic' : 'este tema'));
        const bank = this.deepenFacts[lang] || this.deepenFacts.es;
        const pool = (bank[m] && bank[m][topicId]) || bank[m]['architecture'];
        if (m === 'kids') {
          const [a, b, c] = this.pickDistinct(pool, Math.min(3, pool.length));
          if (lang === 'en') {
            return `✨ Still telling you about ${topic}!\n\n${a}\n\n${b}\n\n${c || ''}\n\n${this.pick(this.closingsKids.en)}\n\nWant me to dig even deeper? 🔍`;
          }
          return `✨ ¡Sigo contándote sobre ${topic}!\n\n${a}\n\n${b}\n\n${c || ''}\n\n${this.pick(this.closingsKids.es)}\n\n¿Quieres que siga profundizando? 🔍`;
        }
        const [factA, factB, factC] = this.pickDistinct(pool, Math.min(3, pool.length));
        if (lang === 'en') {
          return `Digging deeper into ${topic}:\n\n${factA.charAt(0).toUpperCase()}${factA.slice(1)}.\n\nAlso, ${factB}.\n\nAnd one more little-known detail: ${factC || ''}.\n\n${this.pick(this.closingsAdult.en)}\n\nShall I keep digging?`;
        }
        return `Profundizando en ${topic}:\n\n${factA.charAt(0).toUpperCase()}${factA.slice(1)}.\n\nAdemás, ${factB}.\n\nY otro detalle poco conocido: ${factC || ''}.\n\n${this.pick(this.closingsAdult.es)}\n\n¿Sigo profundizando?`;
      },
      option(poi, m, optionId) {
        if (optionId && optionId.startsWith('deepen:')) {
          return this.deepen(poi, m, optionId.slice(7));
        }
        const lang = this.L();
        const n = pickLang(poi.name).adult;
        switch (optionId) {
          case 'secret-history': {
            // Sin API real disponible no hay forma de generar un dato nuevo
            // de verdad, así que en vez de inventar un episodio y una fuente
            // falsos (como antes), se reutiliza el dato real y verificado de
            // poi.tabs.legends, con un envoltorio distinto al del chip
            // "Leyendas" para que no se lea como el mismo texto dos veces.
            const legendText = poi.tabs.legends[m] || poi.tabs.legends.adult || '';
            if (lang === 'en') {
              return m === 'kids'
                ? `🤫 SECRET HISTORY\n\n${this.pick(this.secretIntrosKids.en)}\n\n${legendText}\n\n${this.pick(this.closingsKids.en)}\n\n🕵️‍♂️ Do you dare tell your family this secret?`
                : `LITTLE-KNOWN HISTORY\n\n${this.pick(this.secretIntrosAdult.en)}\n\n${legendText}\n\n${this.pick(this.closingsAdult.en)}`;
            }
            return m === 'kids'
              ? `🤫 HISTORIA SECRETA\n\n${this.pick(this.secretIntrosKids.es)}\n\n${legendText}\n\n${this.pick(this.closingsKids.es)}\n\n🕵️‍♂️ ¿Te atreves a contarle este secreto a tu familia?`
              : `HISTORIA POCO CONOCIDA\n\n${this.pick(this.secretIntrosAdult.es)}\n\n${legendText}\n\n${this.pick(this.closingsAdult.es)}`;
          }
          case 'architecture':
            if (lang === 'en') {
              return m === 'kids'
                ? `🏗️ ARCHITECTURE TRICKS!\n\n${this.pick(this.introsKids.en)}\n\n${poi.tabs.architecture.kids || ''}\n\n${this.pick(this.closingsKids.en)}\n\n👀 Observation challenge: how many of these tricks can you spot all by yourself, with no help?`
                : `ARCHITECTURE\n\n${this.pick(this.introsAdult.en)}\n\n${poi.tabs.architecture.adult || ''}\n\n${this.pick(this.closingsAdult.en)}`;
            }
            return m === 'kids'
              ? `🏗️ ¡TRUCOS DE ARQUITECTURA!\n\n${this.pick(this.introsKids.es)}\n\n${poi.tabs.architecture.kids || ''}\n\n${this.pick(this.closingsKids.es)}\n\n👀 Reto observación: ¿cuántos de estos trucos puedes encontrar tú solo, sin que nadie te ayude?`
              : `ARQUITECTURA\n\n${this.pick(this.introsAdult.es)}\n\n${poi.tabs.architecture.adult || ''}\n\n${this.pick(this.closingsAdult.es)}`;
          case 'legends':
            if (lang === 'en') {
              return m === 'kids'
                ? `🧙‍♂️ LEGEND\n\n${this.pick(this.introsKids.en)}\n\n${poi.tabs.legends.kids || ''}\n\n${this.pick(this.closingsKids.en)}`
                : `LEGEND\n\n${this.pick(this.introsAdult.en)}\n\n${poi.tabs.legends.adult || ''}\n\n${this.pick(this.closingsAdult.en)}`;
            }
            return m === 'kids'
              ? `🧙‍♂️ LEYENDA\n\n${this.pick(this.introsKids.es)}\n\n${poi.tabs.legends.kids || ''}\n\n${this.pick(this.closingsKids.es)}`
              : `LEYENDA\n\n${this.pick(this.introsAdult.es)}\n\n${poi.tabs.legends.adult || ''}\n\n${this.pick(this.closingsAdult.es)}`;
          default: {
            if (lang === 'en') {
              if (m === 'kids') {
                return `Wow, great question! 🤔 Here's a secret: at ${n} there are ${this.pick(['invisible windows', 'staircases that spin', 'secret colors'])}, and only really observant kids discover them. Walk around with your eyes WIDE open! 👀 What have you spotted that nobody else has?`;
              }
              return `Good question. When it comes to ${n}, here's what matters most: ${(poi.tabs.history.adult || '').slice(0, 200)}\n\nIf you'd like to go deeper, ask about a specific period (Roman, Caliphate, medieval, Renaissance) or a particular figure (El Greco, Covarrubias, Berruguete).`;
            }
            if (m === 'kids') {
              return `¡Vaya, qué buena pregunta! 🤔 Pues mira, te cuento un secreto: en ${n} hay ${this.pick(['ventanas invisibles', 'escaleras que giran', 'colores secretos'])} y solo los niños atentos lo descubren. ¡Pasea con los ojos MUY ABIERTOS! 👀 ¿Qué has visto tú que nadie más vea?`;
            }
            return `Buena pregunta. En el contexto de ${n}, lo más relevante es lo siguiente: ${(poi.tabs.history.adult || '').slice(0, 200)}\n\nSi deseas profundizar, pregunta por un periodo concreto (época romana, califal, medieval, renacentista) o por un autor (El Greco, Covarrubias, Berruguete).`;
          }
        }
      },
      generic(poi, m, query) {
        const lang = this.L();
        const n = pickLang(poi.name).adult;
        const q = (query || '').toLowerCase();
        const has = (arr) => arr.some((w) => q.includes(w));
        const scheduleWords = lang === 'en' ? ['schedule', 'hours', 'open', 'close', 'time'] : ['horario', 'abierto', 'abre', 'cierra', 'hora'];
        const priceWords = lang === 'en' ? ['price', 'ticket', 'cost', 'money', 'euro'] : ['precio', 'entrada', 'dinero', 'cuesta', 'euro'];
        const transportWords = lang === 'en' ? ['get there', 'arrive', 'bus', 'parking', 'car'] : ['llegar', 'cómo voy', 'autobús', 'bus', 'parking', 'coche', 'aparcamiento'];
        if (has(scheduleWords)) {
          if (lang === 'en') {
            return m === 'kids'
              ? `⏰ SUPER EASY schedule:\n\nTuesday to Saturday: from when you wake up until snack time (10:00 to 18:30!).\nSundays: mornings only! ☀️\nMondays: the castle takes a nap 🌙 (just like bears 🐻).\n\nTell mom or dad, and check the official website in case it changes on a holiday 🎊.`
              : `Approximate hours (may vary on public holidays, worth confirming on the site's official website):\nTuesday–Saturday: 10:00 – 18:30 (last entry 17:45)\nSundays and public holidays: 10:00 – 14:00\nMondays: closed (except public-holiday Mondays).\n\nDiscounted entry with a youth card, large-family card, or student ID. Tip: buy your ticket online ahead of time and skip the line.`;
          }
          return m === 'kids'
            ? `⏰ Horario MUY FÁCIL:\n\nDe martes a sábado: desde que te despiertas hasta la merienda (¡10:00 a 18:30!).\nDomingos: ¡solo por la mañana! ☀️\nLunes: el castillo descansa 🌙 (como los osos 🐻).\n\nCuentaselo a papá o mamá y mirad la web oficial por si cambian un día de fiesta 🎊.`
            : `Horario orientativo (puede variar en festivos, conviene confirmar en la web oficial del lugar):\nMartes–Sábado: 10:00 – 18:30 (último acceso 17:45)\nDomingos y festivos: 10:00 – 14:00\nLunes: cerrado (salvo lunes festivos).\n\nEntrada reducida si llevas carné joven, familia numerosa o carné de estudiante. Consejo: comprála online con antelación y ahorras la cola.`;
        }
        if (has(priceWords)) {
          if (lang === 'en') {
            return m === 'kids'
              ? `💰 It costs about the same as a burger meal 🍔 for grown-ups.\n\nKids your age get in FREE or almost free! 🎉\n\nAsk your parents to get the "family ticket" — it's cheaper 👨‍👩‍👧‍👦.`
              : `Approximate general admission: ~€10 (or local currency equivalent). Discounted (student, 65+, large family): ~€5. Under 12: free in many cases. Many cities offer combined tickets with nearby monuments that can save up to 30% — worth asking at the ticket office or checking the official website.`;
          }
          return m === 'kids'
            ? `💰 Cuesta casi lo mismo que un menú de hamburguesas 🍔 para los mayores.\n\nLos niños de tu edad ¡entran GRATIS o casi nada! 🎉\n\nPide a papá que pida "entrada familiar" que sale más barato 👨‍👩‍👧‍👦. `
            : `Entrada general orientativa: ~10 € (moneda local equivalente). Reducida (estudiante, >65, familia numerosa): ~5 €. Menores de 12 años: gratuita en muchos casos. Muchas ciudades ofrecen bonos conjuntos con otros monumentos cercanos que permiten ahorrar hasta un 30% — merece la pena preguntar en taquilla o mirar la web oficial.`;
        }
        if (has(transportWords)) {
          if (lang === 'en') {
            return m === 'kids'
              ? `🚶 You almost always get there on FOOT! This city's best treasures are on narrow streets where cars can't go 🏘️.\n\nIf you come by car 🚗 you park near the center and then walk in. The views are like something from a movie! 🎬`
              : `Recommended access: on foot from the nearest historic area (5–10 min); the old town is usually 100% pedestrian. If traveling by car, use a park-and-walk lot on the outskirts and avoid driving into the old town — narrow streets, restrictions, and very strict access hours. Local public transport usually covers the outer route in about 15 min.`;
          }
          return m === 'kids'
            ? `🚶 ¡Casi siempre vas ANDANDO! Los mejores tesoros de esta ciudad están en calles estrechas donde no pasan coches 🏘️.\n\nSi venís en coche 🚗 lo dejáis en un parking cerca del centro y luego entráis caminando. ¡Las vistas son de película! 🎬`
            : `Acceso recomendado: a pie desde la zona monumental más cercana (5–10 min); el núcleo histórico suele ser 100% peatonal. Si viajas en coche, usa algún parking disuasorio en el perímetro y evita entrar en el casco histórico con vehículo — calles estrechas, limitaciones y horarios de acceso muy estrictos. El transporte público local suele cubrir el recorrido exterior en unos 15 min.`;
        }
        if (m === 'kids') {
          if (lang === 'en') {
            return `Wow, what a curious question! 🤩 Here's what's coolest about ${n || 'this place'}: there are things from MANY years ago that are still here, like a time machine is actually working ⏳✨.\n\nYou know what? If you look REALLY closely at the walls 👀 you'll spot strange marks left by the stonemasons (builders from centuries ago). Look for a tiny "X"! Can you find it?`;
          }
          return `¡Guau, qué curioso/a! 🤩 Pues te contaré lo que más mola de ${n || 'este sitio'}: hay cosas de hace MUCHOS años que siguen ahí, como si hubiera una máquina del tiempo funcionando ⏳✨.\n\n¿Sabes qué? Si te fijas MUY bien en las paredes 👀 verás marcas raras que hicieron los canteros (los constructores de hace siglos). ¡Busca una "X" pequeña! ¿La encuentras?`;
        }
        if (lang === 'en') {
          const extras = [
            `If you have more time, here's a useful tip: pair this visit with the Jewish Quarter route — just 8 minutes on foot.`,
            `Fun fact: according to the latest regional government study, only 12% of visitors notice this detail.`,
            `A personal take: I think this place's real value lies less in what you see and more in the layering of eras — you can see 10 centuries in 20 square meters.`
          ];
          return `${SIM.option(poi, 'adult', null)}\n\n${this.pick(extras)}`;
        }
        const extras = [
          `Si dispones de más tiempo, un dato valioso: combina esta visita con la ruta judería — apenas 8 minutos andando.`,
          `Dato curioso: según el último estudio de la Junta de Comunidades, solo el 12% de los visitantes repara en este matiz.`,
          `Una perspectiva personal: creo que el valor de este lugar está menos en lo que ves y más en la superposición de épocas — puedes ver 10 siglos en 20 metros cuadrados.`
        ];
        return `${SIM.option(poi, 'adult', null)}\n\n${this.pick(extras)}`;
      },
      // Versión corta de generic(), para la conversación por voz (ver
      // queueCallTurn): nadie quiere escuchar un párrafo entero por voz solo
      // para saber un horario o cuánto mide algo — aquí se prioriza dar el
      // dato directo y como mucho una frase más, igual que se le pide a la
      // IA real vía systemPromptFor(mode, cityName, concise: true).
      genericConcise(poi, m, query) {
        const lang = this.L();
        const n = pickLang(poi.name).adult;
        const q = (query || '').toLowerCase();
        const has = (arr) => arr.some((w) => q.includes(w));
        const scheduleWords = lang === 'en' ? ['schedule', 'hours', 'open', 'close', 'time'] : ['horario', 'abierto', 'abre', 'cierra', 'hora'];
        const priceWords = lang === 'en' ? ['price', 'ticket', 'cost', 'money', 'euro'] : ['precio', 'entrada', 'dinero', 'cuesta', 'euro'];
        const transportWords = lang === 'en' ? ['get there', 'arrive', 'bus', 'parking', 'car'] : ['llegar', 'cómo voy', 'autobús', 'bus', 'parking', 'coche', 'aparcamiento'];
        if (has(scheduleWords)) {
          if (lang === 'en') {
            return m === 'kids'
              ? '⏰ Open Tuesday to Saturday, 10:00 to 18:30. Sundays mornings only, and Mondays it takes a break!'
              : 'Tuesday to Saturday, 10:00–18:30. Sundays 10:00–14:00. Closed Mondays (check the official website for holiday changes).';
          }
          return m === 'kids'
            ? '⏰ Abre de martes a sábado, de 10:00 a 18:30. Los domingos solo por la mañana, ¡y los lunes descansa!'
            : 'De martes a sábado, 10:00–18:30. Domingos 10:00–14:00. Lunes cerrado (confirma en la web oficial por si hay festivos).';
        }
        if (has(priceWords)) {
          if (lang === 'en') {
            return m === 'kids'
              ? "💰 It doesn't cost much, and kids almost always get in free or nearly free!"
              : 'Approximate general admission: around €10, discounted around €5. Check the exact price on the official website.';
          }
          return m === 'kids'
            ? '💰 Cuesta poquito, ¡y los niños casi siempre entran gratis o casi gratis!'
            : 'Entrada general orientativa: unos 10 €, reducida unos 5 €. Confirma el precio exacto en la web oficial.';
        }
        if (has(transportWords)) {
          if (lang === 'en') {
            return m === 'kids'
              ? "🚶 You almost always walk there — the streets downtown are just for walking!"
              : "Best on foot from the historic center, about 5-10 minutes; it's a very pedestrian-friendly area.";
          }
          return m === 'kids'
            ? '🚶 Casi siempre se va andando, ¡las calles del centro son solo para caminar!'
            : 'Mejor a pie desde el centro histórico, unos 5-10 minutos; es una zona muy peatonal.';
        }
        const firstFact = (poi.tabs.history.adult || '').split('.')[0];
        if (lang === 'en') {
          return m === 'kids'
            ? `Good question! The coolest thing about ${n} is that it has centuries of history hidden in every corner. 🕰️`
            : `About ${n}: ${firstFact}.`;
        }
        return m === 'kids'
          ? `¡Buena pregunta! De ${n} lo más curioso es que tiene siglos de historia escondidos en cada rincón. 🕰️`
          : `Sobre ${n}: ${firstFact}.`;
      }
    };

    const simulated = async (poi, mode, userQuery, optionId, concise) => {
      // simulate latency, natural
      const wait = 900 + Math.floor(Math.random() * 1100);
      await new Promise((r) => setTimeout(r, wait));
      const kind = optionId
        ? 'option'
        : (userQuery === null || userQuery === undefined ? 'summary' : 'generic');
      if (kind === 'summary') return SIM.summary(poi, mode);
      if (kind === 'option')  return SIM.option(poi, mode, optionId);
      return concise ? SIM.genericConcise(poi, mode, userQuery) : SIM.generic(poi, mode, userQuery);
    };

      // Usa los prompts específicos ya escritos en data.js (AI_PROMPTS) para
      // la ruta de API real, en vez de un texto genérico "Tema: X" — así, si
      // se configura una API real, las respuestas son tan ricas como las
      // pensadas para cada tema, y no un resumen plano.
      const queryFor = (poi, mode, userQuery, optionId, cityName, alreadySaid) => {
        if (optionId && optionId.startsWith('deepen:')) {
          const topicId = optionId.slice(7);
          // Los prompts de AI_PROMPTS están siempre escritos en español (ver
          // más abajo), así que aquí se usa siempre la etiqueta en español
          // aunque STATE.lang esté en inglés; systemPromptFor ya se encarga
          // de pedirle a la IA que responda en inglés cuando corresponda.
          const topicMetaEs = AI_TOPIC_NAMES[topicId] && AI_TOPIC_NAMES[topicId].es;
          const topicLabel = topicMetaEs ? (topicMetaEs[mode] || topicMetaEs.adult) : (mode === 'kids' ? 'esto' : 'este tema');
          const fn = AI_PROMPTS.deepen && AI_PROMPTS.deepen[mode];
          const base = typeof fn === 'function' ? fn(poi, topicLabel) : (mode === 'kids'
            ? `Sigue contándome más sobre ${topicLabel}, un dato nuevo que no hayas contado antes.`
            : `Continúa profundizando sobre ${topicLabel}, con un dato nuevo, más concreto y que no hayas mencionado antes. No te repitas.`);
          // alreadySaid aquí es TODO lo que ya se ha narrado sobre este
          // lugar en esta sesión (el resumen inicial + cada párrafo de
          // "profundiza más" anterior, sea de la IA o de un relleno local
          // — el usuario lo ha oído igual, ver queueDeepenWithFillers).
          // Cada llamada a la IA es independiente y no tiene memoria de
          // las anteriores, así que sin esto el modelo tiende a repetir
          // una y otra vez los mismos datos "estrella" del sitio (los
          // Stradivarius, la misma leyenda...), solo que con otras
          // palabras — justo lo que se pide evitar al pulsar "profundiza
          // más" varias veces seguidas.
          if (alreadySaid) {
            return `${base}\n\nIMPORTANTE: esto es TODO lo que ya se le ha contado al usuario sobre este lugar hasta ahora — no repitas nada de esto, ni los mismos datos con otras palabras: "${alreadySaid}"\n\nAporta información realmente nueva y distinta a todo lo anterior.`;
          }
          return base;
        }
        if (optionId) {
          const opt = (AI_PROMPTS.options || []).find((o) => o.id === optionId);
          const fn = opt && opt.prompt && opt.prompt[mode];
          if (typeof fn === 'function') return fn(poi, cityName);
          return `Tema seleccionado: ${optionId}. Responde al contenido pedido.`;
        }
        if (userQuery) return userQuery;
        const summaryFn = AI_PROMPTS.summary && AI_PROMPTS.summary[mode];
        const base = typeof summaryFn === 'function' ? summaryFn(poi, cityName) : 'Haz un resumen inicial del lugar.';
        // alreadySaid: la intro básica local que ya se narró en voz alta
        // antes de pedir este resumen (ver ensureAiPanelInitialGreet) — se
        // le pasa a la IA para que continúe y complemente en vez de repetir
        // el nombre, el subtítulo o el primer dato, que el usuario ya oyó.
        if (alreadySaid) {
          return `${base}\n\nIMPORTANTE: al usuario ya se le ha dicho esto en voz alta justo antes: "${alreadySaid}". NO repitas el nombre del lugar, el subtítulo ni el dato que ya se mencionó ahí — continúa directamente con información NUEVA y complementaria, como si retomaras la conversación donde se quedó.`;
        }
        return base;
      };

    const generate = async ({ poi, mode, userQuery, optionId, cityName, concise, alreadySaid }) => {
      const sys = systemPromptFor(mode, cityName, concise);
      const usr = buildUserText(poi, mode, queryFor(poi, mode, userQuery, optionId, cityName, alreadySaid), cityName);
      if (CFG && CFG.apiKey && CFG.provider) {
        try {
          if (CFG.provider === 'anthropic') return await fetchAnthropic(sys, usr);
          // concise pide un max_tokens menor para acelerar la respuesta,
          // pero no demasiado bajo: probado contra la API real, 500 cortaba
          // a mitad de frase (finish_reason: "length") en respuestas que
          // mencionaban más de un dato — el modelo gasta parte del margen
          // en pensamiento interno antes de escribir nada visible (ver
          // fetchOpenAIVision), así que hace falta más colchón del que
          // parece. 800 completó bien esas mismas respuestas en las pruebas.
          return await fetchOpenAI(sys, usr, concise ? 800 : undefined);
        } catch (e) {
          console.warn('[LLM] Fallo API, usando simulador local:', e);
          // 429 = cuota agotada, 503 = modelo saturado: son la misma causa de
          // cara al usuario ("hay demasiada gente usando la IA ahora mismo"),
          // así que merecen un aviso distinto del genérico de "error de conexión".
          const isQuotaError = e && (e.status === 429 || e.status === 503);
          // Se incluye el motivo real y corto del fallo, no solo en consola
          // (en el móvil nadie la mira): así un fallo se puede diagnosticar
          // con una captura de pantalla en vez de adivinarlo a ciegas (mismo
          // motivo que en scanForPoi para el escaneo de fotos).
          const code = e && e.status ? `HTTP ${e.status}`
            : (e && (e.name === 'AbortError' || e.message === 'chat-timeout')) ? pickLang({ es: 'tiempo agotado', en: 'timed out' })
            : (e && e.message) ? e.message
            : pickLang({ es: 'error desconocido', en: 'unknown error' });
          const suffix = isQuotaError
            ? pickLang(UI_STRINGS.aiQuotaSuffix)[mode]
            : pickLang(UI_STRINGS.aiOfflineSuffix)[mode].replace('{code}', code);
          return await simulated(poi, mode, userQuery, optionId, concise) + suffix;
        }
      }
      return simulated(poi, mode, userQuery, optionId, concise);
    };

    return {
      generate,
      identifyPoi,
      summaryGreet: (poi, m) => SIM.greet(poi, m),
      // Un párrafo "profundiza" local, generado al instante sin red: se usa
      // como relleno mientras se espera la respuesta real (ver
      // queueDeepenWithFillers), no como sustituto definitivo de la IA.
      localDeepen: (poi, m, topicId) => SIM.deepen(poi, m, topicId),
      isReal: () => !!(CFG && CFG.apiKey)
    };
  })();

  /* =========================================================
   * GLOBAL STATE
   * =======================================================*/
  const STATE = {
    mode: 'adult',
    // 'es' (por defecto) o 'en'. Solo afecta al CONTENIDO bilingüe de cada
    // POI (ver pickLang/pickDual) — los textos fijos de la interfaz
    // (botones, toasts, onboarding) siguen en español por ahora, eso es
    // un alcance aparte todavía sin abordar.
    lang: 'es',
    cityId: null,
    category: CATEGORIES.ALL,
    activeRoute: null, // id de la ruta imprescindible activa (para ciudades con varios circuitos)
    activePoiId: null,
    sheet: 'closed',
    audio: {
      playing: false, currentTime: 0, duration: 0, timer: null,
      // 'cloud' mientras suena/está en pausa un audio de CLOUD_TTS; null
      // en cualquier otro caso (incluido "sonando con Web Speech").
      engine: null,
      // Texto puntual a narrar a continuación (p.ej. la revelación de una
      // pregunta del quiz), en vez del resumen inicial. Se limpia cada vez
      // que se abre una ficha para que el audio inicial vuelva a sonar.
      overrideText: null,
      // Callback pendiente de "este segmento ha terminado" del startAudio
      // en curso (lo usa queueDeepenWithFillers para saber cuándo pedir
      // el siguiente párrafo) — seekAudioTo lo relee para no perderlo al
      // saltar de punto a mitad de un segmento. No se persiste (no tiene
      // sentido guardar una función en localStorage).
      onSegmentEnd: null,
      speech: { supported: false, utterance: null, voices: [], pickedVoice: null }
    },
    // localIntroSpoken: qué POIs ya oyeron la intro básica local narrada al
    // abrirlos (ver ensureAiPanelInitialGreet) EN ESTA SESIÓN — a propósito
    // no se persiste (no aparece en saveState/loadState): tras recargar la
    // página, si se reabre un lugar ya visitado, esta intro local no vuelve
    // a sonar (solo suena la primera vez que se crea su historial), así que
    // buildNarrativeText debe poder seguir añadiendo su propio saludo de
    // respaldo en ese caso, en vez de asumir que ya se dijo el nombre.
    // deepenProgress: por POI, el "programa" de 7 puntos de "profundiza
    // más" con IA real (ver queueDeepenWithFillers) — titles (los 7
    // títulos ya pedidos a la IA, null hasta que llega esa respuesta),
    // nextIndex (el próximo punto a desarrollar, 1-based), exhausted (ya
    // se mostraron los 7, el chip queda deshabilitado), fallback (la
    // respuesta inicial no se pudo interpretar como títulos+desarrollo,
    // así que este POI vuelve al sistema anterior sin tope de 7) y
    // fillerIndex (por dónde vamos en poi.tabs.deepenFillers mientras se
    // espera a la IA real, ver nextDeepenFiller).
    // deepenBusy: como pending, pero solo para la tanda de "profundiza
    // más" en curso — separado de pending para que EL RESTO de chips
    // (Entrada, temas, pregunta libre) sigan disponibles mientras
    // "profundiza más" está sonando/esperando a la IA; solo el propio
    // chip de "profundiza más" se bloquea con esto (ver
    // renderAiSuggestions y el click handler de los chips).
    // historyLang: idioma (STATE.lang) en el que se generó el historial de
    // cada POI -- FIX (2026-09-10, reportado en modo Inglés): si se abría
    // un POI en español y más tarde se cambiaba a inglés, el saludo/
    // resumen ya guardado se quedaba en español para siempre, porque
    // ensureAiPanelInitialGreet solo mira si el historial está vacío, no en
    // qué idioma se generó. Se usa para detectar ese desfase y regenerar
    // (ver ensureAiPanelInitialGreet).
    ai: { perPoiHistory: {}, pending: false, deepenBusy: false, currentTopic: {}, explored: {}, localIntroSpoken: {}, deepenProgress: {}, historyLang: {} },
    // Gamificación (modo niño): puntos por preguntas acertadas. "answered"
    // guarda qué combinaciones "poiId:topicId" ya se RESPONDIERON (con o sin
    // acierto, ver answerKidsQuiz): decide si "Siguiente" repite la pregunta
    // o pasa a la próxima, y evita "granjear" puntos reintentando. Como
    // también cuenta las falladas, no sirve para saber cuántos puntos se
    // ganaron — para eso está "pointsEarned", que solo guarda las
    // combinaciones acertadas (mismo momento en que sube STATE.game.points),
    // usado por cityPointsEarned() para el progreso de la insignia de
    // ciudad sin contar preguntas falladas como si dieran estrellas.
    // "claimedRewards" son los ids de REWARD_ITEMS ya reclamados a mano en
    // la mochila (ver claimReward): el saldo gastable es points menos el
    // coste de todo lo reclamado, points en sí no baja (sigue reflejando el
    // total ganado de cara a EXPLORER_LEVELS). "cityBadges" son los ids de
    // ciudad cuya insignia ya se desbloqueó (ver checkCityBadge).
    game: { points: 0, answered: {}, pointsEarned: {}, claimedRewards: [], cityBadges: [] },
    userLocation: null, // { lat, lng } una vez que el usuario comparte su ubicación
    userHeading: null // grados 0-360 (0 = norte), null si el dispositivo no lo reporta
  };

  /* =========================================================
   * PERSISTENCIA (localStorage)
   * Guarda el progreso (conversación por POI, temas explorados, modo)
   * para que sobreviva a un refresco de página o a que el móvil mate
   * la pestaña en segundo plano a media visita.
   * =======================================================*/
  const STORAGE_KEY = 'omot_state_v1';
  // POI que estaba abierto la última vez que se guardó el estado, pendiente
  // de reabrir al arrancar (ver loadState / resumeSavedSession) — no es lo
  // mismo que STATE.activePoiId (ver comentario en loadState).
  let pendingResumePoiId = null;
  const saveState = () => {
    try {
      const explored = {};
      Object.entries(STATE.ai.explored).forEach(([poiId, set]) => {
        explored[poiId] = Array.from(set);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: STATE.mode,
        lang: STATE.lang,
        cityId: STATE.cityId,
        activePoiId: STATE.activePoiId,
        ai: {
          perPoiHistory: STATE.ai.perPoiHistory,
          currentTopic: STATE.ai.currentTopic,
          explored,
          deepenProgress: STATE.ai.deepenProgress,
          historyLang: STATE.ai.historyLang
        },
        game: STATE.game
      }));
    } catch (_) { /* localStorage no disponible (navegación privada, cuota...): seguimos sin persistir */ }
  };
  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.mode === 'kids' || saved.mode === 'adult') STATE.mode = saved.mode;
      if (saved.lang === 'en' || saved.lang === 'es') STATE.lang = saved.lang;
      if (saved.cityId && CITIES[saved.cityId]) STATE.cityId = saved.cityId;
      // OJO: NO se asigna directo a STATE.activePoiId aquí — ese campo
      // significa "la ficha está abierta ahora mismo para este POI" en
      // todo el resto de la app (updateSheetDistance, updateAudioUi...) y
      // en este punto ni el mapa ni la ficha existen todavía (startApp no
      // ha corrido). Se guarda aparte y solo se aplica de verdad — vía
      // selectPoi, que ya deja todo consistente — al reanudar la sesión
      // (ver resumeSavedSession).
      if (typeof saved.activePoiId === 'string') pendingResumePoiId = saved.activePoiId;
      if (saved.ai) {
        STATE.ai.perPoiHistory = saved.ai.perPoiHistory || {};
        STATE.ai.currentTopic = saved.ai.currentTopic || {};
        const explored = {};
        Object.entries(saved.ai.explored || {}).forEach(([poiId, arr]) => {
          explored[poiId] = new Set(arr);
        });
        STATE.ai.explored = explored;
        STATE.ai.deepenProgress = saved.ai.deepenProgress || {};
        STATE.ai.historyLang = saved.ai.historyLang || {};
      }
      if (saved.game) {
        STATE.game.points = Number(saved.game.points) || 0;
        STATE.game.answered = saved.game.answered || {};
        // Partidas guardadas antes de este cambio no traen pointsEarned: se
        // reconstruye asumiendo que todo lo ya marcado como "answered" fue
        // acierto (así era el único caso posible antes de este cambio, ver
        // el comentario en STATE.game de arriba), para no perder de golpe
        // el progreso de insignia de ciudad de quien ya jugaba.
        STATE.game.pointsEarned = saved.game.pointsEarned
          || Object.fromEntries(Object.keys(saved.game.answered || {}).map((k) => [k, 10]));
        STATE.game.claimedRewards = Array.isArray(saved.game.claimedRewards) ? saved.game.claimedRewards : [];
        STATE.game.cityBadges = Array.isArray(saved.game.cityBadges) ? saved.game.cityBadges : [];
      }
    } catch (_) { /* datos corruptos o de una versión anterior: empezamos de cero */ }
  };

  /* =========================================================
   * LICENCIA DE ACCESO
   * Control manual y sencillo de quién puede usar la app: el propio
   * Cloudflare Worker (el mismo que ya hace de proxy de IA, ver
   * worker/proxy.js) expone un endpoint "/license/check" respaldado por un
   * KV namespace (clave = nombre de usuario, valor = "libre" para acceso
   * vitalicio o una fecha "YYYY-MM-DD" de caducidad). Se gestiona a mano
   * desde el panel de Cloudflare (ver worker/README.md), sin tocar código.
   *
   * A diferencia de un fichero del repo, aquí el navegador nunca ve la
   * lista de usuarios válidos: solo pregunta "¿es válido X?" y recibe
   * sí/no, así que leer el código o el tráfico de red no basta para
   * conseguir un acceso (sí seguiría siendo posible con acceso de verdad al
   * KV o a las herramientas de desarrollador para forzar el resultado
   * localmente, pero ya no es tan trivial como leer un fichero público).
   * =======================================================*/
  const LICENSE = (() => {
    const STORAGE = 'omot_license_v1';
    const baseUrl = (typeof window !== 'undefined' && window.LLM_CONFIG && window.LLM_CONFIG.baseUrl) || '';
    const ENDPOINT = baseUrl ? `${baseUrl.replace(/\/$/, '')}/license/check` : '';
    const VISIT_ENDPOINT = baseUrl ? `${baseUrl.replace(/\/$/, '')}/license/visit` : '';

    const todayStr = () => new Date().toISOString().slice(0, 10);

    // expires: null/undefined = vitalicio. Si no, comparación de fechas en
    // formato ISO "YYYY-MM-DD" (orden lexicográfico = orden cronológico).
    // Se usa solo para la validación offline de abajo: la comprobación real
    // contra un usuario nuevo siempre la resuelve el Worker, con su propia
    // fecha del servidor.
    const isValid = (expires) => expires == null || todayStr() <= expires;

    const readStored = () => {
      try {
        const raw = localStorage.getItem(STORAGE);
        return raw ? JSON.parse(raw) : null;
      } catch (_) { return null; }
    };
    const writeStored = (data) => {
      try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch (_) {}
    };
    const clearStored = () => {
      try { localStorage.removeItem(STORAGE); } catch (_) {}
    };

    // kind: 'gate' (por defecto, un intento real: pantalla de acceso o la
    // revalidación única al abrir la app) o 'watch' (ping periódico del
    // vigilante en segundo plano, ver startWatching). El Worker usa esto
    // para no llenar el historial del panel de accesos con un evento por
    // minuto y usuario activo (ver worker/proxy.js).
    // { ok: true, expires } | { ok: false, reason: 'not-found' | 'expired' | 'offline', expires? }
    const check = async (username, kind = 'gate') => {
      if (!ENDPOINT) return { ok: false, reason: 'offline' };
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        let res;
        try {
          res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, kind }),
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }
        // El Worker responde siempre 200 con { ok, reason? } tanto para "no
        // encontrado" como "caducado" (son resultados válidos, no errores);
        // cualquier otro status aquí es un fallo real (red, CORS, 5xx...).
        if (res.status !== 200) return { ok: false, reason: 'offline' };
        return await res.json();
      } catch (_) {
        return { ok: false, reason: 'offline' }; // sin red, timeout, Worker caído, etc.
      }
    };

    // Registro de "visita" (ver worker/proxy.js handleVisit): una vez por
    // apertura de la app ya autenticada, nunca desde el vigilante — puro
    // dato informativo para el panel de accesos, nunca debe bloquear ni
    // afectar el flujo de entrada si falla (por eso no se espera su promesa
    // en las llamadas, ver wireLicenseGate/init más abajo).
    const recordVisit = (username) => {
      if (!VISIT_ENDPOINT) return;
      fetch(VISIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      }).catch(() => {});
    };

    // Validación offline con lo último guardado localmente, para no dejar
    // sin acceso a quien ya se validó antes solo por no tener red en ese
    // momento (la app está pensada para usarse caminando, con cobertura
    // intermitente). El chequeo real contra el Worker (arriba) se hace
    // igualmente en segundo plano al arrancar, ver wireLicenseGate/init.
    const checkStoredValidOffline = () => {
      const stored = readStored();
      if (!stored || !stored.username) return null;
      return isValid(stored.expires) ? stored : null;
    };

    // Vigilancia mientras la app está en uso: sin esto, una revocación o
    // caducidad solo se notaba en la SIGUIENTE vez que se abría la app (la
    // sesión ya en curso seguía funcionando con lo cacheado hasta entonces).
    // Se revisa cada minuto contra el Worker (consulta muy barata, no
    // consume la cuota de Gemini, ver el orden de rutas en proxy.js) y
    // también en cuanto se vuelve a esta pestaña tras estar en segundo
    // plano, que es cuando más sentido tiene refrescar el estado.
    const WATCH_INTERVAL_MS = 60 * 1000;
    let watchTimer = null;
    let watchVisibilityHandler = null;

    const stopWatching = () => {
      if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
      if (watchVisibilityHandler) {
        document.removeEventListener('visibilitychange', watchVisibilityHandler);
        watchVisibilityHandler = null;
      }
    };

    // onInvalid(result) se llama en cuanto el Worker deja de confirmar el
    // acceso (caducado, revocado, o el usuario ya no existe en el KV) — NO
    // se llama por un simple fallo de red ('offline'), para no bloquear a
    // alguien sin cobertura en mitad de una visita que ya se había validado.
    const startWatching = (username, onInvalid) => {
      stopWatching();
      const recheck = async () => {
        const result = await check(username, 'watch');
        if (result.ok) {
          writeStored({ username, expires: result.expires });
        } else if (result.reason !== 'offline') {
          stopWatching();
          clearStored();
          onInvalid(result);
        }
      };
      watchTimer = setInterval(recheck, WATCH_INTERVAL_MS);
      watchVisibilityHandler = () => {
        if (document.visibilityState === 'visible') recheck();
      };
      document.addEventListener('visibilitychange', watchVisibilityHandler);
    };

    return { check, recordVisit, readStored, writeStored, clearStored, checkStoredValidOffline, startWatching, stopWatching };
  })();

  const ICONS = {
    play: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="7 4 20 12 7 20 7 4"></polygon></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {};
  let map, markersLayer, clusterLayer, markerLookup = {}, userMarker = null;
  let POIS = []; // POIs de la ciudad activa (CURRENT_CITY.pois) — se rellena al elegir ciudad
  let CURRENT_CITY = null;
  let fountainsLayer = null, fountainsVisible = false;
  let restroomsLayer = null, restroomsVisible = false;
  // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo).
  // Capa honesta con TODOS los locales de comer/beber cercanos (datos
  // abiertos de OpenStreetMap), patrocinen o no — ver conversación sobre el
  // "conflicto moral" de solo mostrar lo patrocinado. Mismo patrón que
  // fountainsLayer/restroomsLayer. BORRAR junto con data/layers/food-*.js
  // si se retira el experimento (o dejarlo si la capa se queda de verdad).
  let foodLayer = null, foodVisible = false;
  // EXPERIMENTO TEMPORAL — PATROCINIOS DEMO (rama experimento-patrocinios-demo).
  // Capa de pines patrocinados (solo nivel Oro pone pin permanente en el
  // mapa; Bronce/Plata solo aparecen dentro de la ficha, ver
  // renderSponsorDemoInsert). BORRAR junto con data/sponsors-demo.js.
  let sponsorsLayer = null;
  // EXPERIMENTO (rama experimento-vista-satelite): capa base alternativa de
  // imagen satelital en vez del mapa de calles de siempre. A diferencia de
  // fuentes/aseos (capas aditivas por encima del mapa), esta es una capa
  // BASE: se intercambia con streetLayer, nunca convive con ella a la vez.
  let streetLayer = null, satelliteLayer = null, satelliteVisible = false;

  /* =========================================================
   * HELPERS
   * =======================================================*/
  // Resuelve el idioma activo (ver STATE.lang) sin tocar el modo adulto/
  // niño. El contenido bilingüe lleva el envoltorio { es: {...}, en: {...} };
  // el formato antiguo (sin ese envoltorio, todavía la mayoría de ciudades)
  // se devuelve tal cual, así que nada se rompe mientras se traduce ciudad
  // por ciudad. Se detecta el envoltorio nuevo por la presencia de "es" o
  // "en" como clave — ninguno de los campos de contenido usa esas claves
  // para otra cosa.
  const pickLang = (obj) => {
    if (!obj) return obj;
    if (obj.es || obj.en) return obj[STATE.lang] || obj.es || obj.en;
    return obj;
  };

  const pickDual = (obj) => {
    if (!obj) return '';
    const langObj = pickLang(obj);
    const k = STATE.mode === 'kids' ? 'kids' : 'adult';
    return langObj[k] ?? langObj.adult ?? langObj.kids ?? '';
  };

  // Diccionario de textos fijos de la interfaz (chips, botones, mensajes
  // comunes) que NO vienen de ningún archivo de datos de ciudad — a
  // diferencia del contenido de cada POI, este vive aquí mismo. Mismo
  // envoltorio { es: {adult,kids}, en: {adult,kids} } que el resto, así
  // que se resuelve con el propio pickDual: t('claveDelTexto').
  const UI_STRINGS = {
    comeHere: { es: { adult: 'Cómo llegar', kids: 'Cómo llegar' }, en: { adult: 'Directions', kids: 'Directions' } },
    // EXPERIMENTO (rama experimento-diseno-editorial): etiqueta corta para
    // el icono de "Cómo llegar" en la cabecera de la ficha (ver
    // .sheet-directions-btn) -- ahí no cabe el texto completo de comeHere,
    // así que es un verbo más corto e imperativo en vez de un recorte del
    // mismo texto.
    sheetDirectionsLabel: { es: { adult: 'Llévame', kids: 'Llévame' }, en: { adult: 'Take me', kids: 'Take me' } },
    intro: { es: { adult: 'Introducción', kids: 'Introducción' }, en: { adult: 'Introduction', kids: 'Introduction' } },
    ticket: { es: { adult: 'Entrada: horario y precio', kids: 'Entrada: horario y precio' }, en: { adult: 'Tickets: hours & price', kids: 'Tickets: hours & price' } },
    allPill: { es: { adult: 'Todos', kids: 'Todo ✨' }, en: { adult: 'All', kids: 'All ✨' } },
    essentialFallback: { es: { adult: 'Rutas<br>recomendadas', kids: '¡Lo Top! 🚩' }, en: { adult: 'Highlights', kids: 'The Top Spots! 🚩' } },
    askPlaceholder: { es: { adult: 'Escribe tu pregunta…', kids: 'Escribe tu pregunta…' }, en: { adult: 'Type your question…', kids: 'Type your question…' } },
    askAriaLabel: { es: { adult: 'Escribe tu pregunta a la guía IA', kids: 'Escribe tu pregunta a la guía IA' }, en: { adult: 'Type your question to the AI guide', kids: 'Type your question to the AI guide' } },
    backToMenu: { es: { adult: 'Menú principal', kids: 'Menú principal' }, en: { adult: 'Main menu', kids: 'Main menu' } },
    // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
    // etiquetas visibles de las tres filas siempre presentes en .header-bottom
    // (Inicio/Filtros/Capas) — ver #changeCityLabel/#filtersToggleLabel/#layersLabel.
    menuHomeLabel: { es: { adult: 'Inicio', kids: 'Inicio' }, en: { adult: 'Home', kids: 'Home' } },
    menuFiltersLabel: { es: { adult: 'Filtros', kids: 'Filtros' }, en: { adult: 'Filters', kids: 'Filters' } },
    menuLayersLabel: { es: { adult: 'Capas', kids: 'Capas' }, en: { adult: 'Layers', kids: 'Layers' } },
    audioguideCompleted: { es: { adult: 'Audioguía completada', kids: '¡Fin del cuento! 🎉' }, en: { adult: 'Audio guide completed', kids: 'The End! 🎉' } },
    locationUnsupported: { es: { adult: 'La geolocalización no está disponible en este navegador.', kids: 'Tu navegador no sabe dónde estás 😅' }, en: { adult: 'Geolocation is not available in this browser.', kids: "Your browser doesn't know where you are 😅" } },
    locationDenied: { es: { adult: 'Has denegado el permiso de ubicación. Actívalo en los ajustes del navegador para usar esta función.', kids: 'Necesito permiso para saber dónde estás 🗺️' }, en: { adult: 'You denied location permission. Enable it in your browser settings to use this feature.', kids: 'I need permission to know where you are 🗺️' } },
    locationFailed: { es: { adult: 'No se pudo obtener tu ubicación. Inténtalo de nuevo.', kids: 'No he podido encontrarte ahora mismo.' }, en: { adult: "We couldn't get your location. Please try again.", kids: "I couldn't find you right now." } },
    distanceFromYou: { es: { adult: '📍 A ', kids: '📍 A ' }, en: { adult: '📍 ', kids: '📍 ' } },
    distanceFromYouSuffix: { es: { adult: '', kids: ' de ti' }, en: { adult: ' away', kids: ' away' } },
    scanAnalyzing: { es: { adult: 'Analizando tu foto…', kids: 'Mirando tu foto… 🔍' }, en: { adult: 'Analyzing your photo…', kids: 'Looking at your photo… 🔍' } },
    scanNoLocation: { es: { adult: 'No se pudo obtener tu ubicación; analizo la foto de todos modos.', kids: 'No sé dónde estás, pero miro la foto igual 🔍' }, en: { adult: "Couldn't get your location; analyzing the photo anyway.", kids: "I don't know where you are, but I'll look at the photo anyway 🔍" } },
    scanNoAiOffline: { es: { adult: 'No se puede analizar la foto sin conexión a la IA.', kids: 'No puedo analizar fotos sin conexión a la IA 😅' }, en: { adult: "Can't analyze the photo without an AI connection.", kids: "I can't look at photos without an AI connection 😅" } },
    scanAiBusyRetry: { es: { adult: 'La IA está saturada ahora mismo, reintentando…', kids: '¡La IA está muy solicitada! Probando otra vez… 🔁' }, en: { adult: 'The AI is overloaded right now, retrying…', kids: 'The AI is really busy! Trying again… 🔁' } },
    scanFailedGeneric: { es: { adult: 'No se pudo analizar la foto. Inténtalo de nuevo.', kids: '¡Uy! Algo ha fallado con la foto 😅' }, en: { adult: "The photo couldn't be analyzed. Please try again.", kids: 'Oops! Something went wrong with the photo 😅' } },
    scanNotRecognized: { es: { adult: 'No he podido identificar este lugar. Prueba a acercarte más o a otro ángulo.', kids: '¡No he reconocido este sitio! Prueba a acercarte más 🔍' }, en: { adult: "I couldn't identify this place. Try getting closer or a different angle.", kids: "I didn't recognize this place! Try getting closer 🔍" } },
    scanAiStillBusy: { es: { adult: 'La IA sigue saturada. Prueba de nuevo en un minuto.', kids: '¡La IA sigue muy solicitada! Prueba otra vez en un ratito 🙏' }, en: { adult: 'The AI is still overloaded. Try again in a minute.', kids: 'The AI is still really busy! Try again in a bit 🙏' } },
    scanRecognized: { es: { adult: '¡Reconocido! Es ', kids: '¡Es ' }, en: { adult: 'Recognized! It\'s ', kids: 'It\'s ' } },
    scanIdentifiedFromPhoto: { es: { adult: 'Identificado a partir de tu foto', kids: '¡Descubierto con tu foto!' }, en: { adult: 'Identified from your photo', kids: 'Discovered with your photo!' } },
    scanUnverifiedBadge: { es: { adult: 'ANÁLISIS IA · SIN VERIFICAR', kids: 'IA · SIN VERIFICAR' }, en: { adult: 'AI ANALYSIS · UNVERIFIED', kids: 'AI · UNVERIFIED' } },
    scanAdHocResult: { es: { adult: 'No estaba en mis datos, pero creo que es: {name} (sin verificar).', kids: '¡Creo que es {name}! (sin verificar) 🔍' }, en: { adult: "It wasn't in my data, but I think it's: {name} (unverified).", kids: "I think it's {name}! (unverified) 🔍" } },
    scanAiAnalysisTitle: { es: { adult: 'Análisis IA: ', kids: 'Análisis IA: ' }, en: { adult: 'AI Analysis: ', kids: 'AI Analysis: ' } },
    scanNoMoreData: { es: { adult: 'Sin más datos disponibles.', kids: 'Sin más datos disponibles.' }, en: { adult: 'No further data available.', kids: 'No further data available.' } },
    routeFollowNumbers: { es: { adult: 'Ruta "{route}": sigue el orden numerado en el mapa.', kids: '¡Sigue los números de "{route}" en el mapa! 🚩' }, en: { adult: 'Route "{route}": follow the numbered order on the map.', kids: 'Follow the numbers of "{route}" on the map! 🚩' } },
    beforeStarting: { es: { adult: 'Antes de empezar — ', kids: '¡Antes de empezar! — ' }, en: { adult: 'Before you start — ', kids: 'Before you start! — ' } },
    tutorialNext: { es: { adult: 'Siguiente', kids: 'Siguiente' }, en: { adult: 'Next', kids: 'Next' } },
    tutorialGo: { es: { adult: 'Entendido', kids: '¡Vamos allá! 🚀' }, en: { adult: 'Got it', kids: "Let's go! 🚀" } },
    tutorialSkip: { es: { adult: 'Saltar tutorial ✕', kids: 'Saltar tutorial ✕' }, en: { adult: 'Skip tutorial ✕', kids: 'Skip tutorial ✕' } },
    cityIntroSkip: { es: { adult: 'Saltar intro ✕', kids: 'Saltar intro ✕' }, en: { adult: 'Skip intro ✕', kids: 'Skip intro ✕' } },
    cityIntroStart: { es: { adult: 'Empezar a explorar', kids: '¡Vamos a explorarla! 🚀' }, en: { adult: 'Start exploring', kids: "Let's explore it! 🚀" } },
    tutorialBack: { es: { adult: '‹ Atrás', kids: '‹ Atrás' }, en: { adult: '‹ Back', kids: '‹ Back' } },
    tutorialBackAria: { es: { adult: 'Paso anterior', kids: 'Paso anterior' }, en: { adult: 'Previous step', kids: 'Previous step' } },
    demoBadge: { es: { adult: 'Museos · Ilustrativo', kids: 'Museos · Ilustrativo' }, en: { adult: 'Museums · Illustrative', kids: 'Museums · Illustrative' } },
    demoImgAlt: { es: { adult: 'Ejemplo de punto de interés', kids: 'Ejemplo de punto de interés' }, en: { adult: 'Example point of interest', kids: 'Example point of interest' } },
    demoTitle: { es: { adult: 'Nombre del lugar', kids: 'Nombre del lugar' }, en: { adult: 'Place name', kids: 'Place name' } },
    demoSubtitle: { es: { adult: 'Así se ve cualquier punto que abras', kids: 'Así se ve cualquier punto que abras' }, en: { adult: 'This is what any point you open looks like', kids: 'This is what any point you open looks like' } },
    demoAudioTitle: { es: { adult: 'Audioguía de ejemplo', kids: 'Audioguía de ejemplo' }, en: { adult: 'Example audio guide', kids: 'Example audio guide' } },
    demoMsg1: { es: { adult: '¡Hola! Este lugar tiene mucha historia detrás — te resumo lo esencial mientras lo recorres.', kids: '¡Hola! Este lugar tiene mucha historia detrás — te resumo lo esencial mientras lo recorres.' }, en: { adult: "Hi! This place has a lot of history behind it — I'll sum up the essentials as you explore it.", kids: "Hi! This place has a lot of history behind it — I'll sum up the essentials as you explore it." } },
    demoMsg2: { es: { adult: '¿Sabes alguna curiosidad menos conocida?', kids: '¿Sabes alguna curiosidad menos conocida?' }, en: { adult: 'Do you know any lesser-known fact?', kids: 'Do you know any lesser-known fact?' } },
    demoMsg3: { es: { adult: 'Así vería tu respuesta: contexto, anécdotas y datos verificados sobre el lugar que estés visitando.', kids: 'Así vería tu respuesta: contexto, anécdotas y datos verificados sobre el lugar que estés visitando.' }, en: { adult: "This is what your answer would look like: context, anecdotes and verified facts about the place you're visiting.", kids: "This is what your answer would look like: context, anecdotes and verified facts about the place you're visiting." } },
    fictionalBadge: { es: { adult: ' · Ilustrativo', kids: ' · Imaginado' }, en: { adult: ' · Illustrative', kids: ' · Imagined' } },
    cameraOpenFailed: { es: { adult: 'No se pudo abrir la cámara. Prueba a subir una foto en su lugar.', kids: '¡No pude abrir la cámara! Prueba a subir una foto 📷' }, en: { adult: "Couldn't open the camera. Try uploading a photo instead.", kids: "I couldn't open the camera! Try uploading a photo instead 📷" } },
    welcomeBack: { es: { adult: 'Bienvenido a {city} · Toca un pin', kids: '¡Hola aventurero! Toca los pines 🏰' }, en: { adult: 'Welcome to {city} · Tap a pin', kids: 'Hi there, adventurer! Tap the pins 🏰' } },
    quizAllDone: { es: { adult: '¡Ya conoces todos los secretos de este lugar! ⭐⭐⭐', kids: '¡Ya conoces todos los secretos de este lugar! ⭐⭐⭐' }, en: { adult: 'You already know all the secrets of this place! ⭐⭐⭐', kids: 'You already know all the secrets of this place! ⭐⭐⭐' } },
    quizCorrectWithPoints: { es: { adult: '🎉 ¡Correcto! +{points} ⭐ ', kids: '🎉 ¡Correcto! +{points} ⭐ ' }, en: { adult: '🎉 Correct! +{points} ⭐ ', kids: '🎉 Correct! +{points} ⭐ ' } },
    quizCorrect: { es: { adult: '🎉 ¡Correcto! ', kids: '🎉 ¡Correcto! ' }, en: { adult: '🎉 Correct! ', kids: '🎉 Correct! ' } },
    quizAlmost: { es: { adult: '¡Casi! Era esta 👉 ', kids: '¡Casi! Era esta 👉 ' }, en: { adult: 'Almost! It was this one 👉 ', kids: 'Almost! It was this one 👉 ' } },
    quizNext: { es: { adult: 'Siguiente ▶', kids: 'Siguiente ▶' }, en: { adult: 'Next ▶', kids: 'Next ▶' } },
    audioStartFailed: { es: { adult: 'No se pudo iniciar la audioguía. Prueba a pulsar reproducir otra vez.', kids: 'No pude arrancar la voz. Toca reproducir otra vez.' }, en: { adult: "The audio guide couldn't start. Try tapping play again.", kids: "I couldn't start the voice. Tap play again." } },
    rewardMissing: { es: { adult: '🔒 Faltan {n} ⭐', kids: '🔒 Faltan {n} ⭐' }, en: { adult: '🔒 {n} more needed ⭐', kids: '🔒 {n} more needed ⭐' } },
    rewardClaim: { es: { adult: 'Reclamar {points} ⭐', kids: 'Reclamar {points} ⭐' }, en: { adult: 'Claim for {points} ⭐', kids: 'Claim for {points} ⭐' } },
    rewardAriaClaimed: { es: { adult: '{name}, ya reclamado', kids: '{name}, ya reclamado' }, en: { adult: '{name}, already claimed', kids: '{name}, already claimed' } },
    rewardAriaClaimable: { es: { adult: '{name}, reclamable por {points} estrellas', kids: '{name}, reclamable por {points} estrellas' }, en: { adult: '{name}, claimable for {points} stars', kids: '{name}, claimable for {points} stars' } },
    rewardAriaLocked: { es: { adult: '{name}, bloqueado, faltan {n} estrellas', kids: '{name}, bloqueado, faltan {n} estrellas' }, en: { adult: '{name}, locked, {n} more stars needed', kids: '{name}, locked, {n} more stars needed' } },
    yourTripThrough: { es: { adult: 'Tu aventura por {city}', kids: 'Tu aventura por {city}' }, en: { adult: 'Your trip through {city}', kids: 'Your trip through {city}' } },
    placesVisited: { es: { adult: '{visited} de {total} lugares visitados', kids: '{visited} de {total} lugares visitados' }, en: { adult: '{visited} of {total} places visited', kids: '{visited} of {total} places visited' } },
    cityBadgeEarned: { es: { adult: '🏅 ¡Insignia de {city} conseguida!', kids: '🏅 ¡Insignia de {city} conseguida!' }, en: { adult: '🏅 {city} badge earned!', kids: '🏅 {city} badge earned!' } },
    cityBadgeProgress: { es: { adult: '🏅 Insignia de {city}: {points}/{threshold} ⭐', kids: '🏅 Insignia de {city}: {points}/{threshold} ⭐' }, en: { adult: '🏅 {city} badge: {points}/{threshold} ⭐', kids: '🏅 {city} badge: {points}/{threshold} ⭐' } },
    cityBadgeAriaEarned: { es: { adult: 'Insignia de {city}, conseguida', kids: 'Insignia de {city}, conseguida' }, en: { adult: '{city} badge, earned', kids: '{city} badge, earned' } },
    cityBadgeAriaLocked: { es: { adult: 'Insignia de {city}, todavía sin conseguir', kids: 'Insignia de {city}, todavía sin conseguir' }, en: { adult: '{city} badge, not earned yet', kids: '{city} badge, not earned yet' } },
    cityBadgeLabelEarned: { es: { adult: '🏅 Insignia de {city}', kids: '🏅 Insignia de {city}' }, en: { adult: '🏅 {city} badge', kids: '🏅 {city} badge' } },
    cityBadgeLabelLocked: { es: { adult: '🔒 Insignia de {city} (todavía sin conseguir)', kids: '🔒 Insignia de {city} (todavía sin conseguir)' }, en: { adult: '🔒 {city} badge (not earned yet)', kids: '🔒 {city} badge (not earned yet)' } },
    cityBadgeUnlocked: { es: { adult: '🏅 ¡Insignia de {city} desbloqueada! Mírala en tu mochila.', kids: '🏅 ¡Insignia de {city} desbloqueada! Mírala en tu mochila.' }, en: { adult: "🏅 {city} badge unlocked! Check it out in your backpack.", kids: "🏅 {city} badge unlocked! Check it out in your backpack." } },
    callListening: { es: { adult: 'Te escucho…', kids: 'Te escucho… 🎙️' }, en: { adult: "I'm listening…", kids: "I'm listening… 🎙️" } },
    callAskMore: { es: { adult: '¿Quieres preguntar algo más?', kids: '¿Quieres preguntarme algo más?' }, en: { adult: 'Do you want to ask anything else?', kids: 'Do you want to ask me anything else?' } },
    callDidYouSaySomething: { es: { adult: 'Disculpa, ¿quieres decirme algo, o continúo?', kids: '¡Ups! ¿Querías decirme algo, o sigo? 👂' }, en: { adult: 'Sorry, did you want to say something, or should I continue?', kids: 'Oops! Did you want to tell me something, or should I keep going? 👂' } },
    callBye: { es: { adult: 'Hasta luego, que disfrutes la visita.', kids: '¡Hasta la próxima aventura! 👋' }, en: { adult: 'Goodbye, enjoy your visit.', kids: 'See you on the next adventure! 👋' } },
    callThinking: { es: { adult: 'Pensando…', kids: 'Pensando… 🤔' }, en: { adult: 'Thinking…', kids: 'Thinking… 🤔' } },
    callStillThinking: { es: { adult: 'Sigo pensando, un momento…', kids: 'Sigo pensando… dame un segundo más 🤔' }, en: { adult: 'Still thinking, one moment…', kids: 'Still thinking… give me one more second 🤔' } },
    callAnswerFailed: { es: { adult: 'No he podido generar una respuesta. ¿Lo intentamos de nuevo?', kids: '¡Ups! Mi cajita mágica está un poquito lenta. ¿Lo intentamos otra vez?' }, en: { adult: "I couldn't generate an answer. Shall we try again?", kids: 'Oops! My magic box is running a little slow. Shall we try again?' } },
    callSpeaking: { es: { adult: 'Respondiendo…', kids: 'Hablando…' }, en: { adult: 'Answering…', kids: 'Talking…' } },
    callGreetListen: { es: { adult: 'Te escucho. Pregúntame lo que quieras sobre {name}.', kids: '¡Hola! Pregúntame lo que quieras sobre {name}.' }, en: { adult: "I'm listening. Ask me anything about {name}.", kids: 'Hi! Ask me anything about {name}.' } },
    deepenFillerContinue: { es: { adult: '{fact}\n\n¿Sigo profundizando?', kids: '✨ {fact}\n\n¿Sigo contándote más? 🔍' }, en: { adult: '{fact}\n\nShall I keep digging deeper?', kids: '✨ {fact}\n\nShall I tell you more? 🔍' } },
    deepenFetchFailed: { es: { adult: 'No hemos podido obtener respuesta. Revisa tu conexión o la configuración de la API (window.LLM_CONFIG).', kids: '¡Ups! 😵 Mi cajita mágica está un poquito lenta… Vuelve a intentarlo en 1 minuto, por favor.' }, en: { adult: "We couldn't get a response. Check your connection or the API configuration (window.LLM_CONFIG).", kids: 'Oops! 😵 My magic box is running a little slow… Please try again in 1 minute.' } },
    aiQuotaSuffix: { es: { adult: '\n\n(La IA está saturada de peticiones en este momento —no es un fallo de la app—, se ha usado el simulador local mientras tanto.)', kids: '\n\n⚠️ (¡La IA está muy solicitada ahora mismo! Se ha usado el modo sin conexión mientras se libera hueco.)' }, en: { adult: "\n\n(The AI is overloaded with requests right now — this isn't an app failure — the local simulator was used in the meantime.)", kids: '\n\n⚠️ (The AI is really busy right now! Offline mode was used while it frees up.)' } },
    aiOfflineSuffix: { es: { adult: '\n\n(Modo offline. Error al conectar con la API ({code}), se ha usado el simulador local.)', kids: '\n\n⚠️ (Modo offline: la IA real respondió con error — {code})' }, en: { adult: '\n\n(Offline mode. Error connecting to the API ({code}), the local simulator was used.)', kids: '\n\n⚠️ (Offline mode: the real AI responded with an error — {code})' } },
    deepenScriptDone: { es: { adult: '\n\nEso es todo lo que tengo preparado sobre este lugar. Si quieres saber algo muy concreto, escríbeme tu pregunta aquí abajo.', kids: '\n\n¡Eso es todo lo que tengo preparado sobre este lugar! Si quieres saber algo muy concreto, escríbeme tu pregunta aquí abajo.' }, en: { adult: "\n\nThat's everything I have ready about this place. If there's something specific you'd like to know, type your question below.", kids: "\n\nThat's everything I have ready about this place! If there's something specific you'd like to know, type your question below." } },
    deepenPregenNotice: { es: { adult: '\n\nGenerando respuesta complementaria.\nVuelve a tocar "{label}" en un momento para verla.', kids: '\n\n💭 (¡Esto es solo un adelanto rápido! Estoy preparando algo todavía mejor — vuelve a tocar "{label}" en un ratito para verlo.)' }, en: { adult: '\n\nGenerating a fuller answer.\nTap "{label}" again in a moment to see it.', kids: '\n\n💭 (This is just a quick preview! I\'m preparing something even better — tap "{label}" again in a bit to see it.)' } },
    scanReasonTimeout: { es: { adult: 'tiempo agotado con la IA', kids: 'tiempo agotado con la IA' }, en: { adult: 'AI request timed out', kids: 'AI request timed out' } },
    scanReasonImageFailed: { es: { adult: 'no se pudo procesar la imagen', kids: 'no se pudo procesar la imagen' }, en: { adult: 'could not process the image', kids: 'could not process the image' } },
    scanReasonUnknown: { es: { adult: 'error desconocido', kids: 'error desconocido' }, en: { adult: 'unknown error', kids: 'unknown error' } },
    scanFailedWithCode: { es: { adult: 'No se pudo analizar la foto ({code}). Inténtalo de nuevo.', kids: '¡Uy! Algo ha fallado con la foto ({code}) 😅' }, en: { adult: "The photo couldn't be analyzed ({code}). Please try again.", kids: 'Oops! Something went wrong with the photo ({code}) 😅' } },
    resetConfirmTitle: { es: { adult: '¿Reiniciar la app?', kids: '¿Reiniciar la app?' }, en: { adult: 'Reset the app?', kids: 'Reset the app?' } },
    resetConfirmText: { es: { adult: 'Se borrará todo: la ciudad y el modo guardados, tus puntos y progreso del quiz, las conversaciones con la guía IA y todo el contenido descargado para uso sin conexión. Quedará como la primera vez que abriste la web. Esta acción no se puede deshacer.', kids: 'Se borrará todo: la ciudad y el modo guardados, tus puntos y progreso del quiz, las conversaciones con la guía IA y todo el contenido descargado para uso sin conexión. Quedará como la primera vez que abriste la web. Esta acción no se puede deshacer.' }, en: { adult: "Everything will be erased: the saved city and mode, your points and quiz progress, your conversations with the AI guide, and all content downloaded for offline use. It will be as if you were opening the site for the first time. This action can't be undone.", kids: "Everything will be erased: the saved city and mode, your points and quiz progress, your conversations with the AI guide, and all content downloaded for offline use. It will be as if you were opening the site for the first time. This action can't be undone." } },
    resetConfirmCancel: { es: { adult: 'Cancelar', kids: 'Cancelar' }, en: { adult: 'Cancel', kids: 'Cancel' } },
    resetConfirmOk: { es: { adult: 'Sí, reiniciar', kids: 'Sí, reiniciar' }, en: { adult: 'Yes, reset', kids: 'Yes, reset' } },
    directionsConfirmTitle: { es: { adult: 'Vas a abrir Google Maps', kids: 'Vas a abrir Google Maps' }, en: { adult: "You're about to open Google Maps", kids: "You're about to open Google Maps" } },
    directionsConfirmText: { es: { adult: 'Te llevará paso a paso hasta aquí. Cuando termines, vuelve a esta app para seguir con la visita — la encontrarás tal como la dejaste.', kids: 'Te llevará paso a paso hasta aquí. Cuando termines, vuelve a esta app para seguir con la visita — la encontrarás tal como la dejaste.' }, en: { adult: "It'll guide you step by step to get here. When you're done, come back to this app to continue your visit — you'll find it just as you left it.", kids: "It'll guide you step by step to get here. When you're done, come back to this app to continue your visit — you'll find it just as you left it." } },
    directionsConfirmCancel: { es: { adult: 'Cancelar', kids: 'Cancelar' }, en: { adult: 'Cancel', kids: 'Cancel' } },
    directionsConfirmOk: { es: { adult: 'Abrir Maps', kids: 'Abrir Maps' }, en: { adult: 'Open Maps', kids: 'Open Maps' } },
    scanLogTitle: { es: { adult: 'Fotos no reconocidas', kids: 'Fotos no reconocidas' }, en: { adult: 'Unrecognized photos', kids: 'Unrecognized photos' } },
    scanLogHint: { es: { adult: 'Registro local de fotos escaneadas que no coincidían con ningún lugar de la app. Solo tú puedes verlo.', kids: 'Registro local de fotos escaneadas que no coincidían con ningún lugar de la app. Solo tú puedes verlo.' }, en: { adult: "Local log of scanned photos that didn't match any place in the app. Only you can see it.", kids: "Local log of scanned photos that didn't match any place in the app. Only you can see it." } },
    scanLogExport: { es: { adult: '⬇️ Exportar JSON', kids: '⬇️ Exportar JSON' }, en: { adult: '⬇️ Export JSON', kids: '⬇️ Export JSON' } },
    scanLogClear: { es: { adult: '🗑️ Borrar registro', kids: '🗑️ Borrar registro' }, en: { adult: '🗑️ Clear log', kids: '🗑️ Clear log' } },
    rewardChestTitle: { es: { adult: 'Mochila de viaje', kids: 'Mochila de viaje' }, en: { adult: 'Travel backpack', kids: 'Travel backpack' } },
    rewardChestHint: { es: { adult: 'Responde bien a las preguntas de cada sitio para ganar ⭐. Cuando te lleguen para algo, toca "Reclamar" y elige tú qué te llevas.', kids: 'Responde bien a las preguntas de cada sitio para ganar ⭐. Cuando te lleguen para algo, toca "Reclamar" y elige tú qué te llevas.' }, en: { adult: 'Answer each place\'s questions correctly to earn ⭐. Once you have enough, tap "Claim" and choose what you take home.', kids: 'Answer each place\'s questions correctly to earn ⭐. Once you have enough, tap "Claim" and choose what you take home.' } },
    scanTakePhoto: { es: { adult: 'Tomar foto', kids: 'Tomar foto' }, en: { adult: 'Take photo', kids: 'Take photo' } },
    scanUploadPhoto: { es: { adult: 'Subir foto', kids: 'Subir foto' }, en: { adult: 'Upload photo', kids: 'Upload photo' } },
    modeToggleAdult: { es: { adult: 'Adultos', kids: 'Adultos' }, en: { adult: 'Adults', kids: 'Adults' } },
    modeToggleKids: { es: { adult: 'Niños', kids: 'Niños' }, en: { adult: 'Kids', kids: 'Kids' } },
    brandBadgeAdult: { es: { adult: 'Adultos', kids: 'Adultos' }, en: { adult: 'Adults', kids: 'Adults' } },
    brandBadgeKids: { es: { adult: 'Modo Niños 🎈', kids: 'Modo Niños 🎈' }, en: { adult: 'Kids Mode 🎈', kids: 'Kids Mode 🎈' } },
    brandSubKids: { es: { adult: '¡Aventuras mágicas a tu ritmo!', kids: '¡Aventuras mágicas a tu ritmo!' }, en: { adult: 'Magical adventures at your own pace!', kids: 'Magical adventures at your own pace!' } },
    brandSubAdult: { es: { adult: '{city} · Turismo autoguiado inteligente', kids: '{city} · Turismo autoguiado inteligente' }, en: { adult: '{city} · Smart self-guided tourism', kids: '{city} · Smart self-guided tourism' } },
    obContinentsBack: { es: { adult: 'Continentes', kids: 'Continentes' }, en: { adult: 'Continents', kids: 'Continents' } },
    licenseGateTitle: { es: { adult: 'Acceso privado', kids: 'Acceso privado' }, en: { adult: 'Private access', kids: 'Private access' } },
    licenseGateText: { es: { adult: 'Introduce tu clave de acceso para continuar.', kids: 'Introduce tu clave de acceso para continuar.' }, en: { adult: 'Enter your access key to continue.', kids: 'Enter your access key to continue.' } },
    licenseGateInputPlaceholder: { es: { adult: 'Tu clave de acceso', kids: 'Tu clave de acceso' }, en: { adult: 'Your access key', kids: 'Your access key' } },
    licenseGateSubmit: { es: { adult: 'Entrar', kids: 'Entrar' }, en: { adult: 'Enter', kids: 'Enter' } },
    callHangup: { es: { adult: 'Colgar', kids: 'Colgar' }, en: { adult: 'Hang up', kids: 'Hang up' } },
    lightboxRetryLabel: { es: { adult: 'Reintentar', kids: 'Reintentar' }, en: { adult: 'Retry', kids: 'Retry' } },
    ariaFilters: { es: { adult: 'Filtrar puntos de interés', kids: 'Filtrar puntos de interés' }, en: { adult: 'Filter points of interest', kids: 'Filter points of interest' } },
    ariaModeToggleGroup: { es: { adult: 'Cambiar modo de contenido', kids: 'Cambiar modo de contenido' }, en: { adult: 'Switch content mode', kids: 'Switch content mode' } },
    ariaRouteIntroPlay: { es: { adult: 'Reproducir introducción de la ruta', kids: 'Reproducir introducción de la ruta' }, en: { adult: 'Play route introduction', kids: 'Play route introduction' } },
    ariaRouteIntroClose: { es: { adult: 'Cerrar introducción de la ruta', kids: 'Cerrar introducción de la ruta' }, en: { adult: 'Close route introduction', kids: 'Close route introduction' } },
    ariaMapTools: { es: { adult: 'Herramientas del mapa', kids: 'Herramientas del mapa' }, en: { adult: 'Map tools', kids: 'Map tools' } },
    ariaFountains: { es: { adult: 'Mostrar fuentes de agua potable', kids: 'Mostrar fuentes de agua potable' }, en: { adult: 'Show drinking water fountains', kids: 'Show drinking water fountains' } },
    ariaRestrooms: { es: { adult: 'Mostrar aseos públicos', kids: 'Mostrar aseos públicos' }, en: { adult: 'Show public restrooms', kids: 'Show public restrooms' } },
    ariaScan: { es: { adult: 'Identificar lo que estoy viendo', kids: 'Identificar lo que estoy viendo' }, en: { adult: "Identify what I'm looking at", kids: "Identify what I'm looking at" } },
    ariaLocate: { es: { adult: 'Mostrar mi ubicación', kids: 'Mostrar mi ubicación' }, en: { adult: 'Show my location', kids: 'Show my location' } },
    ariaSheet: { es: { adult: 'Información del punto de interés', kids: 'Información del punto de interés' }, en: { adult: 'Point of interest information', kids: 'Point of interest information' } },
    ariaSheetClose: { es: { adult: 'Cerrar ficha', kids: 'Cerrar ficha' }, en: { adult: 'Close card', kids: 'Close card' } },
    ariaSheetDirections: { es: { adult: 'Cómo llegar', kids: 'Cómo llegar' }, en: { adult: 'Directions', kids: 'Directions' } },
    ariaImageRetry: { es: { adult: 'Reintentar cargar la imagen', kids: 'Reintentar cargar la imagen' }, en: { adult: 'Retry loading the image', kids: 'Retry loading the image' } },
    ariaAudioPlayer: { es: { adult: 'Reproductor de audio', kids: 'Reproductor de audio' }, en: { adult: 'Audio player', kids: 'Audio player' } },
    ariaAudioProgressGroup: { es: { adult: 'Progreso', kids: 'Progreso' }, en: { adult: 'Progress', kids: 'Progress' } },
    ariaProgressBar: { es: { adult: 'Barra de progreso', kids: 'Barra de progreso' }, en: { adult: 'Progress bar', kids: 'Progress bar' } },
    ariaAiMessages: { es: { adult: 'Conversación con la guía IA', kids: 'Conversación con la guía IA' }, en: { adult: 'Conversation with the AI guide', kids: 'Conversation with the AI guide' } },
    ariaAiMic: { es: { adult: 'Preguntar por voz', kids: 'Preguntar por voz' }, en: { adult: 'Ask by voice', kids: 'Ask by voice' } },
    ariaAiSend: { es: { adult: 'Enviar pregunta', kids: 'Enviar pregunta' }, en: { adult: 'Send question', kids: 'Send question' } },
    ariaAiCallOpen: { es: { adult: 'Hablar con la guía IA', kids: 'Hablar con la guía IA' }, en: { adult: 'Talk to the AI guide', kids: 'Talk to the AI guide' } },
    ariaAiCallModal: { es: { adult: 'Conversación por voz con la guía IA', kids: 'Conversación por voz con la guía IA' }, en: { adult: 'Voice conversation with the AI guide', kids: 'Voice conversation with the AI guide' } },
    ariaAiCallClose: { es: { adult: 'Terminar conversación', kids: 'Terminar conversación' }, en: { adult: 'End conversation', kids: 'End conversation' } },
    ariaAiCallSend: { es: { adult: 'Enviar', kids: 'Enviar' }, en: { adult: 'Send', kids: 'Send' } },
    ariaCameraModal: { es: { adult: 'Tomar foto', kids: 'Tomar foto' }, en: { adult: 'Take photo', kids: 'Take photo' } },
    ariaCameraClose: { es: { adult: 'Cerrar cámara', kids: 'Cerrar cámara' }, en: { adult: 'Close camera', kids: 'Close camera' } },
    ariaZoomOut: { es: { adult: 'Alejar', kids: 'Alejar' }, en: { adult: 'Zoom out', kids: 'Zoom out' } },
    ariaZoomIn: { es: { adult: 'Acercar', kids: 'Acercar' }, en: { adult: 'Zoom in', kids: 'Zoom in' } },
    ariaShutter: { es: { adult: 'Tomar foto', kids: 'Tomar foto' }, en: { adult: 'Take photo', kids: 'Take photo' } },
    ariaImageLightbox: { es: { adult: 'Imagen ampliada', kids: 'Imagen ampliada' }, en: { adult: 'Enlarged image', kids: 'Enlarged image' } },
    ariaLightboxClose: { es: { adult: 'Cerrar imagen', kids: 'Cerrar imagen' }, en: { adult: 'Close image', kids: 'Close image' } },
    ariaVisitSummaryModal: { es: { adult: 'Resumen de tu visita', kids: 'Resumen de tu visita' }, en: { adult: 'Your visit summary', kids: 'Your visit summary' } },
    ariaVisitSummaryClose: { es: { adult: 'Cerrar resumen', kids: 'Cerrar resumen' }, en: { adult: 'Close summary', kids: 'Close summary' } }
  };
  const t = (key) => pickDual(UI_STRINGS[key]);

  // Las imágenes vienen de Wikimedia como miniaturas de 330px
  // (".../thumb/…/330px-Archivo.jpg"). Wikimedia genera bajo demanda
  // cualquier ancho pedido en esa misma URL, pero si el ancho pedido supera
  // el de la imagen original, responde 400 en vez de recortarlo — por eso el
  // lightbox necesita una cadena de fallback (ver openLightbox).
  const getLargeImageUrl = (src) => {
    if (!src) return src;
    return src.replace(/\/(\d+)px-/, '/1200px-');
  };
  // Reconstruye la URL del archivo original sin recortar, quitando el
  // segmento "/thumb/" y el sufijo "NNNpx-" del nombre de archivo repetido.
  const getOriginalImageUrl = (src) => {
    if (!src || !src.includes('/thumb/')) return src;
    return src.replace('/thumb/', '/').replace(/\/\d+px-[^/]+$/, '');
  };
  const fmtTime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  };
  const showToast = (msg, ms = 2000) => {
    let t = $('#app-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'app-toast'; t.className = 'toast'; document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('-show'));
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('-show'), ms);
  };
  // Ayuda temporal de diagnóstico (ver wireOnboarding): muestra un texto
  // largo en un cuadro propio de la página, con un botón de copiar, en vez
  // de depender de window.prompt (bloqueado en algunos navegadores móviles).
  const showDebugDump = (text) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;gap:10px;padding:16px;';
    const box = document.createElement('textarea');
    box.readOnly = true;
    box.value = text;
    box.style.cssText = 'flex:1;width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:0;font:12px/1.4 monospace;resize:none;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copiar';
    copyBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:0;background:#6C5CE7;color:#fff;font-weight:700;font-size:15px;';
    copyBtn.addEventListener('click', async () => {
      box.focus();
      box.select();
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = '¡Copiado! ✅';
      } catch (_) {
        try {
          document.execCommand('copy');
          copyBtn.textContent = '¡Copiado! ✅';
        } catch (__) {
          copyBtn.textContent = 'Selecciona el texto a mano';
        }
      }
    });
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Cerrar';
    closeBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:0;background:#333;color:#fff;font-weight:700;font-size:15px;';
    closeBtn.addEventListener('click', () => overlay.remove());
    row.appendChild(copyBtn);
    row.appendChild(closeBtn);
    overlay.appendChild(box);
    overlay.appendChild(row);
    document.body.appendChild(overlay);
    box.focus();
    box.select();
  };

  // Panel oculto del registro de escaneos sin match (ver ScanLog): se abre
  // con 6 toques sobre la versión (ver wireOnboarding). Pensado solo para
  // revisión propia, no es una función de cara al usuario final.
  const renderScanLogList = () => {
    const list = $('#scanLogList');
    if (!list) return;
    const entries = ScanLog.read();
    list.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'scan-log-empty';
      empty.textContent = 'Todavía no hay ninguna foto registrada.';
      list.appendChild(empty);
      return;
    }
    entries.forEach((e) => {
      const li = document.createElement('li');
      li.className = 'scan-log-item';
      const img = document.createElement('img');
      img.src = e.thumb || '';
      img.alt = '';
      const textWrap = document.createElement('div');
      textWrap.className = 'scan-log-item-text';
      const nameEl = document.createElement('div');
      nameEl.className = 'scan-log-item-name';
      nameEl.textContent = e.name || (e.type === 'none' ? 'No identificado por la IA' : 'Sin nombre');
      const metaEl = document.createElement('div');
      metaEl.className = 'scan-log-item-meta';
      const d = new Date(e.ts);
      metaEl.textContent = `${e.city || '?'} · ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      textWrap.appendChild(nameEl);
      textWrap.appendChild(metaEl);
      li.appendChild(img);
      li.appendChild(textWrap);
      list.appendChild(li);
    });
  };
  const openScanLogModal = () => {
    const modal = $('#scanLogModal');
    if (!modal) return;
    renderScanLogList();
    modal.classList.add('-open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeScanLogModal = () => {
    const modal = $('#scanLogModal');
    if (!modal) return;
    modal.classList.remove('-open');
    modal.setAttribute('aria-hidden', 'true');
  };
  const exportScanLog = () => {
    const entries = ScanLog.read();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omot-scan-log-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const clearScanLog = () => {
    ScanLog.clear();
    renderScanLogList();
  };
  const wireScanLogModal = () => {
    const modal = $('#scanLogModal');
    if (!modal) return;
    $('#scanLogClose')?.addEventListener('click', closeScanLogModal);
    $('#scanLogExport')?.addEventListener('click', exportScanLog);
    $('#rewardChestBtn')?.addEventListener('click', openRewardChest);
    $('#rewardChestClose')?.addEventListener('click', closeRewardChest);
    $('#rewardChestModal')?.addEventListener('click', (e) => { if (e.target === $('#rewardChestModal')) closeRewardChest(); });
    $('#scanLogClear')?.addEventListener('click', clearScanLog);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeScanLogModal(); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('-open')) closeScanLogModal();
    });
  };

  const getCategoryPinColor = (cat) => {
    if (cat === CATEGORIES.HISTORY) return '#3B82F6'; // monumentos y museos: azul
    // EXPERIMENTO (rama experimento-diseno-editorial): el amarillo puro
    // (#EAB308) de restauración quedaba demasiado "llamativo" tanto en el
    // pin como en la ficha (que ahora hereda este mismo color, ver
    // populateSheetContent) -- un mostaza/ocre más apagado sigue
    // leyéndose como "amarillo" a simple vista pero sin chillar.
    if (cat === CATEGORIES.GASTRONOMY) return '#B8860B'; // restauración: mostaza/ocre
    if (cat === CATEGORIES.HIDDEN) return '#22C55E'; // puntos de interés: verde
    return '#3B82F6';
  };
  // Iconos SVG propios por categoría (en vez de emoji, que se renderizan de
  // forma distinta y muy plana según el sistema operativo). Se usan tanto
  // en los pines del mapa como en las píldoras de filtro, para que
  // coincidan visualmente.
  const CATEGORY_ICON_PATHS = {
    // Monumentos y museos: edificio de columnas
    [CATEGORIES.HISTORY]: `<path d="M3 10 12 4l9 6"/><path d="M4 10v9M8 10v9M12 10v9M16 10v9M20 10v9"/><path d="M2 21h20"/>`,
    // Restauración: tenedor (centrado en x=12)
    [CATEGORIES.GASTRONOMY]: `<path d="M9 3v5M12 3v5M15 3v5"/><path d="M9 8c0 2 1.3 3 3 3s3-1 3-3"/><path d="M12 11v10"/>`,
    // Puntos de interés: prismáticos
    [CATEGORIES.HIDDEN]: `<rect x="2.5" y="9" width="7" height="9" rx="2.5"/><rect x="14.5" y="9" width="7" height="9" rx="2.5"/><path d="M9.5 12.5h5"/><path d="M5 9V7.5A1.5 1.5 0 0 1 6.5 6h1"/><path d="M19 9V7.5A1.5 1.5 0 0 0 17.5 6h-1"/>`
  };
  const categoryIconSvg = (cat, color = 'currentColor') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICON_PATHS[cat] || CATEGORY_ICON_PATHS[CATEGORIES.HISTORY]}</svg>`;
  const PIN_ICON_SVG = Object.fromEntries(
    Object.keys(CATEGORY_ICON_PATHS).map((cat) => [cat, categoryIconSvg(cat, 'white')])
  );
  const getCategoryPinIconSvg = (cat) => PIN_ICON_SVG[cat] || PIN_ICON_SVG[CATEGORIES.HISTORY];

  // Iconos SVG para los chips de sugerencia del chat IA (mismo criterio que
  // arriba: nada de emoji, que cada sistema operativo los pinta distinto).
  // "deepen" usa un destello de dos puntas, el símbolo habitual de "generado
  // por IA" en el resto de apps.
  const SUGGEST_ICON_SVG = {
    directions: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
    intro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H12v18H6.5A2.5 2.5 0 0 0 4 22.5v-18Z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H12v18h5.5a2.5 2.5 0 0 1 2.5 2.5v-18Z"/></svg>`,
    ticket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9Z"/><path d="M9 7.5v9" stroke-dasharray="1.5 2.2"/></svg>`,
    deepen: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11.5 2c.5 3 1.2 5 2.2 6s3 1.7 6 2.2c-3 .5-5 1.2-6 2.2s-1.7 3-2.2 6c-.5-3-1.2-5-2.2-6s-3-1.7-6-2.2c3-.5 5-1.2 6-2.2s1.7-3 2.2-6Z"/><path d="M19 15c.3 1.3.6 2.1 1.1 2.6s1.3.8 2.6 1.1c-1.3.3-2.1.6-2.6 1.1s-.8 1.3-1.1 2.6c-.3-1.3-.6-2.1-1.1-2.6s-1.3-.8-2.6-1.1c1.3-.3 2.1-.6 2.6-1.1s.8-1.3 1.1-2.6Z"/></svg>`,
    'secret-history': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="15.4" r="1.3" fill="currentColor" stroke="none"/></svg>`,
    architecture: CATEGORY_ICON_PATHS[CATEGORIES.HISTORY],
    legends: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5v-13Z"/></svg>`,
    reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/></svg>`
  };
  const suggestIconSvg = (kind) => {
    const inner = SUGGEST_ICON_SVG[kind];
    if (!inner) return '';
    // "architecture"/"legends" y el resto de categorías reutilizan el mismo
    // formato <path>...</path> que CATEGORY_ICON_PATHS: hace falta envolverlos
    // en <svg>; deepen/ticket/secret-history ya traen su propio <svg>.
    return inner.startsWith('<svg')
      ? inner
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  };

  // Icono de la píldora "Ruta imprescindible" (bandera de meta)
  const ROUTE_ICON_SVG = (color = 'currentColor') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18"/><path d="M5 4h13l-3 4 3 4H5"/></svg>`;
  const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* =========================================================
   * CUSTOM LEAFLET PIN (círculo de color + icono SVG, estilo app nativa)
   * =======================================================*/
  const makePinIcon = (poi, dimmed = false) => {
    const color = dimmed ? '#94A3B8' : getCategoryPinColor(poi.category);
    // EXPERIMENTO (rama experimento-diseno-editorial): pin como retrato/foto
    // real del POI en vez del icono genérico de categoría, con un anillo de
    // color a modo de borde -- inspirado en apps de historia con mapa tipo
    // "avatares" en vez de pines planos. Si el POI no tiene imagen (raro,
    // pero pasa en algún dato suelto), cae al icono de siempre.
    const hasPhoto = !!poi.image;
    const icon = hasPhoto ? '' : getCategoryPinIconSvg(poi.category);
    const bgStyle = hasPhoto ? ` background-image:url('${poi.image}');` : '';
    const cls = 'custom-pin' + (hasPhoto ? ' -avatar' : '') + (dimmed ? ' -dimmed' : '');
    return L.divIcon({
      className: 'custom-pin-wrap',
      html: `<div class="${cls}" data-id="${poi.id}" style="--pin-color:${color};${bgStyle}">${icon}</div>`,
      iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -19]
    });
  };

  // Pin de las fuentes de agua potable: mucho más pequeño que un pin de POI
  // (16px frente a 38px) y de otro color, para que se lea a simple vista
  // como una capa aparte y no compita visualmente con los POIs turísticos.
  const makeFountainIcon = (status) => L.divIcon({
    className: 'fountain-pin-wrap',
    html: `<div class="fountain-pin${status === 'fuera-de-servicio' ? ' -off' : ''}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-13-7-13Z"/></svg></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -6]
  });

  // Pin de los aseos públicos: mismo lenguaje visual que la capa de
  // bebederos (mismo tamaño, por detrás de los POIs), pero con el
  // pictograma hombre/mujer encargado como imagen (assets/icons/restroom.png)
  // en vez de un SVG propio, para no alterar el diseño ya aprobado. Los
  // aseos "evento" (solo abiertos en actos puntuales) usan el estilo
  // atenuado, igual que "fuera-de-servicio" en las fuentes.
  const makeRestroomIcon = (status) => L.divIcon({
    className: 'fountain-pin-wrap',
    html: `<div class="restroom-pin${status === 'evento' ? ' -off' : ''}"><img src="assets/icons/restroom.png?v=2" alt="" /></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -6]
  });

  // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER": mismo icono de tenedor y
  // cuchillo que el botón #foodBtn, en el mismo tamaño/lenguaje que
  // fuentes/aseos (ver .food-pin en styles.css).
  const makeFoodIcon = () => L.divIcon({
    className: 'fountain-pin-wrap',
    html: '<div class="food-pin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v7a2 2 0 0 0 2 2v11"/><path d="M7 2v20"/><path d="M11 2v9"/><path d="M17 2c-1.7 0-3 2-3 5s1.3 5 3 5v10"/></svg></div>',
    iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -6]
  });

  // Burbuja de agrupación (cluster): mismo lenguaje visual que .custom-pin,
  // pero con el número de POIs agrupados dentro. Crece un poco con la
  // cantidad para que se note de un vistazo si hay 3 o 30 ahí dentro.
  const makeClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    const size = count < 10 ? 40 : count < 30 ? 46 : 52;
    return L.divIcon({
      className: 'custom-pin-wrap',
      html: `<div class="custom-pin -cluster" style="--pin-size:${size}px">${count}</div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2]
    });
  };

  /* =========================================================
   * MAP
   * =======================================================*/
  const updatePinScale = () => {
    if (!map || !CURRENT_CITY) return;
    const zoom = map.getZoom();
    const restZoom = CURRENT_CITY.zoom;
    const minZoom = CURRENT_CITY.minZoom || 11;
    const t = restZoom > minZoom ? (zoom - minZoom) / (restZoom - minZoom) : 1;
    const scale = 0.45 + 0.55 * Math.max(0, Math.min(1, t));
    document.documentElement.style.setProperty('--pin-scale', scale.toFixed(3));
  };

  const initMap = () => {
    // Cleanup: si el script se evalúa dos veces, evita "Map container is already initialized"
    const mapEl = document.getElementById('map');
    if (mapEl) {
      while (mapEl.firstChild) mapEl.removeChild(mapEl.firstChild);
      mapEl.removeAttribute('style');
      if (mapEl._leaflet_id) delete mapEl._leaflet_id;
    }
    const city = CURRENT_CITY || CITIES.toledo;
    const cityMinZoom = city.minZoom || 11;
    map = L.map('map', { zoomControl: false, attributionControl: true, scrollWheelZoom: true, maxBoundsViscosity: 0.7 })
      .setView(city.center, city.zoom);
    map.setMaxBounds(L.latLngBounds(city.bounds[0], city.bounds[1]).pad(0.25));
    // CARTO cerró el acceso anónimo a sus mosaicos (basemaps.cartocdn.com):
    // desde ahora exige una clave de API incluso para el uso más básico, y
    // sin ella todas las peticiones devuelven un tile con el aviso "API KEY
    // REQUIRED" en vez del mapa real (bug real, reportado en producción).
    // Los tiles estándar de OpenStreetMap son gratuitos sin clave, pero su
    // política de uso exige atribución visible: de ahí attributionControl
    // pasando a true arriba, en vez de estar desactivado del todo.
    streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: cityMinZoom, subdomains: 'abc',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    // EXPERIMENTO (rama experimento-vista-satelite): imagen satelital de
    // Esri (gratuita, sin clave de API) + una capa de etiquetas encima
    // (nombres de calles/lugares) para que siga siendo legible — la
    // imagen sola no trae ningún texto. Ambas teselas van en un mismo
    // layerGroup para tratarse como una sola "capa base" al intercambiar
    // con streetLayer (ver toggleSatellite).
    satelliteLayer = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, minZoom: cityMinZoom,
        attribution: 'Tiles &copy; Esri'
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, minZoom: cityMinZoom
      })
    ]);
    (satelliteVisible ? satelliteLayer : streetLayer).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    // Agrupa pines en modo "explorar libremente" (fuera de una ruta): con
    // ciudades como Madrid (59 POIs) el mapa alejado es ilegible sin esto.
    // En modo ruta no se agrupa nunca: los pines llevan un número de orden
    // y una línea que los conecta, agruparlos rompería esa lectura.
    clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 55,
      iconCreateFunction: makeClusterIcon
    });
    // Capa independiente de fuentes de agua potable: no se agrupa con
    // markersLayer/clusterLayer ni se excluyen entre sí — convive con
    // cualquiera de los dos modos y se activa/desactiva aparte con su
    // propio botón (ver toggleFountains).
    fountainsLayer = L.layerGroup();
    if (fountainsVisible) {
      loadWaterFountains(STATE.cityId).then(() => {
        renderFountains();
        if (map && fountainsLayer) fountainsLayer.addTo(map);
      });
    }
    // Capa independiente de aseos públicos: mismo patrón que fountainsLayer
    // (ver comentario arriba), con su propio botón (ver toggleRestrooms).
    restroomsLayer = L.layerGroup();
    if (restroomsVisible) {
      loadRestrooms(STATE.cityId).then(() => {
        renderRestrooms();
        if (map && restroomsLayer) restroomsLayer.addTo(map);
      });
    }
    // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER": mismo patrón que
    // fountainsLayer/restroomsLayer justo arriba. BORRAR si se retira.
    foodLayer = L.layerGroup();
    if (foodVisible) {
      loadFoodPlaces(STATE.cityId).then(() => {
        renderFood();
        if (map && foodLayer) foodLayer.addTo(map);
      });
    }
    // EXPERIMENTO TEMPORAL — PATROCINIOS DEMO (rama experimento-patrocinios-demo):
    // capa siempre visible (sin toggle propio, a diferencia de fuentes/aseos)
    // porque para este ejercicio interesa ver el pin Oro sin un paso extra.
    // BORRAR junto con data/sponsors-demo.js.
    sponsorsLayer = L.layerGroup().addTo(map);
    map.on('zoom', updatePinScale);
    updatePinScale();
    renderMarkers();
    renderSponsorsDemo();
  };
  const isRouteMode = () => STATE.category === 'essential';
  // Rutas imprescindibles de la ciudad activa; las ciudades sin `routes` propio
  // se tratan como una única ruta "main" con el color primario de la app.
  const getCityRoutes = () => (CURRENT_CITY && CURRENT_CITY.routes) || [
    { id: 'main', name: { es: { adult: 'Rutas<br>recomendadas', kids: '¡Lo Top!' }, en: { adult: 'Highlights', kids: 'The Top Spots!' } }, color: null }
  ];
  const isPoiInActiveRoute = (poi) => !!(poi.essential && poi.essential.route === STATE.activeRoute);

  const makeRouteIcon = (poi, order, color) => {
    return L.divIcon({
      className: 'custom-pin-wrap',
      html: `<div class="custom-pin -route" data-id="${poi.id}" style="--pin-color:${color}">${order}</div>`,
      iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -19]
    });
  };

  const renderMarkers = () => {
    markersLayer.clearLayers();
    clusterLayer.clearLayers();
    markerLookup = {};
    const routeMode = isRouteMode();
    // En modo ruta se usa markersLayer (sin agrupar, con línea y orden);
    // en modo exploración libre se usa clusterLayer (agrupa al alejar el
    // zoom). Solo una de las dos capas está añadida al mapa a la vez.
    if (routeMode) {
      if (map.hasLayer(clusterLayer)) map.removeLayer(clusterLayer);
      if (!map.hasLayer(markersLayer)) markersLayer.addTo(map);
    } else {
      if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer);
      if (!map.hasLayer(clusterLayer)) clusterLayer.addTo(map);
    }
    const targetLayer = routeMode ? markersLayer : clusterLayer;
    const routeMeta = routeMode && getCityRoutes().find((r) => r.id === STATE.activeRoute);
    const routeColor = (routeMeta && routeMeta.color) || getCssVar('--color-primary') || '#F59E0B';
    // Las fichas efímeras de "¿qué estoy viendo?" (ver openAdHocScanResult)
    // viven en POIS para que el resto del flujo (chat, audioguía) funcione
    // igual que con un POI real, pero nunca deben aparecer como pin: no son
    // datos de la ciudad, son un resultado de una foto concreta.
    const scannablePois = POIS.filter((p) => !p.isAdHocScan);
    const list = routeMode && routeMeta
      ? scannablePois.filter(isPoiInActiveRoute).sort((a, b) => a.essential.order - b.essential.order)
      : (routeMode ? [] : scannablePois);
    if (routeMode && list.length > 1) {
      L.polyline(list.map((p) => p.coords), {
        color: routeColor,
        weight: 3, opacity: 0.8, dashArray: '2 10', lineCap: 'round'
      }).addTo(markersLayer);
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1].coords, b = list[i].coords;
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        L.marker(mid, {
          icon: L.divIcon({
            className: 'route-distance-wrap',
            html: `<span class="route-distance" style="--route-color:${routeColor}">${formatDistance(haversineMeters(a, b))}</span>`,
            iconSize: [0, 0]
          }),
          interactive: false,
          zIndexOffset: -9000
        }).addTo(markersLayer);
      }
    }
    list.forEach((poi, i) => {
      const dimmed = !routeMode && STATE.category !== CATEGORIES.ALL && poi.category !== STATE.category;
      const icon = routeMode ? makeRouteIcon(poi, i + 1, routeColor) : makePinIcon(poi, dimmed);
      const marker = L.marker(poi.coords, { icon });
      marker.options.poiId = poi.id;
      marker.options.category = poi.category;
      marker.on('click', () => selectPoi(poi.id, true));
      marker.addTo(targetLayer);
      markerLookup[poi.id] = marker;
    });
  };
  const setSelectedMarker = (id) => {
    Object.entries(markerLookup).forEach(([k, m]) => {
      const pin = m.getElement()?.querySelector('.custom-pin');
      if (!pin) return;
      pin.classList.toggle('-selected', k === id);
    });
  };
  const clearSelectedMarker = () => {
    Object.values(markerLookup).forEach((m) => m.getElement()?.querySelector('.custom-pin')?.classList.remove('-selected'));
  };

  /* =========================================================
   * GEOLOCALIZACIÓN ("dónde estoy" + distancia a cada lugar)
   * =======================================================*/
  const haversineMeters = (a, b) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]), lat2 = toRad(b[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // El cono de orientación vive siempre en el HTML del icono (oculto por
  // defecto vía CSS hasta que se le pone la clase "-visible"), y se rota
  // mutando su estilo directamente en el DOM en cada lectura de la brújula
  // (ver watchHeading), sin recrear el marcador — recrearlo en cada lectura
  // (varias por segundo) sería un desperdicio y podría dar parpadeos.
  const updateUserHeadingUi = () => {
    const el = userMarker?.getElement();
    const cone = el?.querySelector('.user-heading-cone');
    if (!cone) return;
    if (typeof STATE.userHeading === 'number') {
      cone.classList.add('-visible');
      cone.style.transform = `rotate(${STATE.userHeading}deg)`;
    } else {
      cone.classList.remove('-visible');
    }
  };

  const updateUserMarker = () => {
    if (!STATE.userLocation || !map) return;
    const pos = [STATE.userLocation.lat, STATE.userLocation.lng];
    if (userMarker) {
      userMarker.setLatLng(pos);
    } else {
      userMarker = L.marker(pos, {
        icon: L.divIcon({
          className: 'user-location-wrap',
          html: '<div class="user-heading-cone"></div><div class="user-location-dot"></div>',
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        }),
        interactive: false,
        zIndexOffset: -100
      }).addTo(map);
      updateUserHeadingUi();
    }
  };

  // watchId del seguimiento continuo de posición: una vez que el usuario
  // localiza con éxito una vez, se deja un watchPosition corriendo de fondo
  // para que el punto azul se mueva solo mientras camina, en vez de quedarse
  // fijo hasta que vuelva a tocar el botón (comportamiento anterior).
  let locationWatchId = null;

  const startLocationWatch = () => {
    if (locationWatchId !== null || !navigator.geolocation) return;
    locationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        STATE.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        $('#locateBtn')?.classList.add('-active');
        updateUserMarker();
        if (STATE.activePoiId) updateSheetDistance(STATE.activePoiId);
      },
      // Errores intermitentes del watch (señal débil momentánea, etc.) se
      // ignoran en silencio: el usuario ya vio el aviso de error, si lo
      // hubo, en el intento inicial de requestLocation. Avisar en cada
      // fallo puntual del watch sería machacar con toasts sin motivo.
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  // Triangulito de orientación (ver updateUserHeadingUi): necesita el
  // rumbo del dispositivo vía DeviceOrientationEvent. En iOS 13+ el
  // permiso solo puede pedirse dentro de un gesto de usuario, por eso se
  // arranca aquí, desde el mismo toque de "Mostrar mi ubicación", no de
  // forma automática al cargar la página. Si el navegador no lo soporta o
  // el permiso se deniega, no pasa nada especial: el mapa sigue igual,
  // simplemente sin cono, como ya era el comportamiento hasta ahora.
  let headingWatchStarted = false;
  // Suavizado del rumbo: el magnetómetro crudo del móvil es ruidoso de por
  // sí, y junto a estructuras metálicas grandes (bug real reportado en
  // pruebas de usuario junto al Uber Arena de Berlín, 2026-09-04, visible en
  // vídeo como el cono de dirección girando solo sin que el móvil se
  // moviera) puede dar lecturas erráticas de un evento a otro. Se promedia
  // con una media móvil exponencial sobre el VECTOR unitario (x,y) del
  // ángulo, no sobre el ángulo en grados directamente: promediar grados
  // cerca del salto 0°/360° (p.ej. 350° y 10°, que son casi el mismo rumbo)
  // daría con una media lineal un resultado absurdo de 180°.
  let smoothedHeadingVec = null;
  const HEADING_SMOOTHING = 0.15; // 0-1: más bajo = más suave pero más lento en seguir giros reales
  const handleOrientationEvent = (e) => {
    let heading = null;
    if (typeof e.webkitCompassHeading === 'number') {
      // iOS Safari: ya viene como rumbo de brújula real (0 = norte).
      heading = e.webkitCompassHeading;
    } else if (typeof e.alpha === 'number') {
      // Resto de navegadores: alpha crece en sentido contrario a las
      // agujas del reloj desde la orientación inicial del dispositivo, así
      // que el rumbo real es 360-alpha; se corrige además con el ángulo de
      // rotación de la pantalla para no desviarse si el móvil está en
      // horizontal. Es una aproximación razonable, no un cálculo exacto de
      // brújula profesional (para eso haría falta compensar inclinación).
      const screenAngle = (screen.orientation && screen.orientation.angle) || 0;
      heading = (360 - e.alpha + screenAngle) % 360;
    }
    if (heading === null || Number.isNaN(heading)) return;
    const rad = heading * Math.PI / 180;
    const x = Math.cos(rad);
    const y = Math.sin(rad);
    if (!smoothedHeadingVec) {
      smoothedHeadingVec = { x, y };
    } else {
      smoothedHeadingVec.x += (x - smoothedHeadingVec.x) * HEADING_SMOOTHING;
      smoothedHeadingVec.y += (y - smoothedHeadingVec.y) * HEADING_SMOOTHING;
    }
    STATE.userHeading = (Math.atan2(smoothedHeadingVec.y, smoothedHeadingVec.x) * 180 / Math.PI + 360) % 360;
    updateUserHeadingUi();
  };
  const startHeadingWatch = () => {
    if (headingWatchStarted || typeof DeviceOrientationEvent === 'undefined') return;
    headingWatchStarted = true;
    const attach = () => {
      const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
      window.addEventListener(eventName, handleOrientationEvent);
    };
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then((result) => {
        if (result === 'granted') attach();
      }).catch(() => {});
    } else {
      attach();
    }
  };

  // El mapa tiene un maxBounds (ver initMap) que "engancha" cualquier
  // flyTo/panTo hacia el punto válido más cercano si las coordenadas
  // pedidas caen fuera de él — así que centrar en una posición real que
  // no está dentro de la ciudad no falla ni se nota como error: el mapa
  // simplemente aterriza en el borde más próximo, un punto sin ningún
  // significado (bug real reportado, 2026-09: al abrir Berlín estando
  // lejos de la ciudad, el auto-centrado silencioso —ver startApp— llevaba
  // a "un punto random" en vez de quedarse en el centro). Se usa el mismo
  // pad(0.25) que maxBounds para que el criterio de "cerca" coincida
  // exactamente con la zona por la que el mapa deja moverse de verdad.
  const isNearCurrentCity = (lat, lng) => {
    if (!CURRENT_CITY || !CURRENT_CITY.bounds) return true;
    return L.latLngBounds(CURRENT_CITY.bounds[0], CURRENT_CITY.bounds[1]).pad(0.25).contains([lat, lng]);
  };

  const requestLocation = (centerOnResult = true, silent = false) => {
    startHeadingWatch();
    const btn = $('#locateBtn');
    if (!navigator.geolocation) {
      if (!silent) showToast(t('locationUnsupported'));
      return;
    }
    // Si el seguimiento continuo ya está activo y tenemos una posición
    // reciente, no hace falta pedir una nueva: solo recentra el mapa.
    if (locationWatchId !== null && STATE.userLocation) {
      const shouldCenter = centerOnResult && (!silent || isNearCurrentCity(STATE.userLocation.lat, STATE.userLocation.lng));
      if (shouldCenter && map) map.flyTo([STATE.userLocation.lat, STATE.userLocation.lng], 16, { duration: 0.7 });
      return;
    }
    btn?.classList.add('-locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        STATE.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        btn?.classList.remove('-locating');
        btn?.classList.add('-active');
        updateUserMarker();
        // En el intento silencioso al abrir la app (ver startApp), solo se
        // recentra si de verdad estás cerca de la ciudad que estás viendo
        // — si no, se deja el centro de la ciudad tal cual, en vez de
        // arrastrar el mapa a un punto sin sentido en el borde (ver
        // isNearCurrentCity arriba). El botón manual de "localizarme"
        // sigue centrando siempre, esté cerca o no: ahí sí es información
        // útil (confirma que no estás en la zona).
        const shouldCenter = centerOnResult && (!silent || isNearCurrentCity(STATE.userLocation.lat, STATE.userLocation.lng));
        if (shouldCenter && map) map.flyTo([STATE.userLocation.lat, STATE.userLocation.lng], 16, { duration: 0.7 });
        if (STATE.activePoiId) updateSheetDistance(STATE.activePoiId);
        startLocationWatch();
      },
      (err) => {
        btn?.classList.remove('-locating');
        if (silent) return;
        const denied = err && err.code === 1;
        showToast(denied ? t('locationDenied') : t('locationFailed'), 3200);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const updateSheetDistance = (poiId) => {
    const el = $('.sheet-distance', els.sheet);
    if (!el) return;
    const poi = POIS.find((p) => p.id === poiId);
    if (!poi || !STATE.userLocation) { el.hidden = true; return; }
    const meters = haversineMeters([STATE.userLocation.lat, STATE.userLocation.lng], poi.coords);
    el.hidden = false;
    el.textContent = t('distanceFromYou') + formatDistance(meters) + t('distanceFromYouSuffix');
  };

  /* =========================================================
   * "¿QUÉ ESTOY VIENDO?": identifica un POI a partir de una foto + GPS.
   * La foto NUNCA se manda sola: siempre va acompañada de los POIs reales
   * más cercanos al usuario, y la IA solo puede elegir entre esos (o decir
   * que no reconoce ninguno). Así no puede "inventarse" un monumento que
   * no está en nuestros datos.
   * =======================================================*/
  const getCurrentLocationOnce = () => {
    if (!navigator.geolocation) return Promise.reject(new Error('no-geolocation'));
    const geoPromise = new Promise((resolve, reject) => {
      // Sin alta precisión: solo hace falta acertar el barrio para acotar
      // candidatos, y así se responde en 1-2s en vez de esperar a que el
      // GPS "caliente" para una posición exacta (que aquí no aporta nada).
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    });
    // El "timeout" de arriba es solo una petición al navegador, no una
    // garantía: en algunas combinaciones de SO/navegador (visto en iOS
    // Chrome) ni éxito ni error llegan a dispararse nunca si el servicio
    // de localización del sistema no responde, dejando la promesa
    // pendiente para siempre pase lo que pase en la opción "timeout". Este
    // segundo timeout, propio y forzado, garantiza que esta función SIEMPRE
    // se resuelve o rechaza antes de 7s, ocurra lo que ocurra por debajo.
    const hardTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('geolocation-hard-timeout')), 7000);
    });
    return Promise.race([geoPromise, hardTimeout]);
  };

  // Dispara la petición de ubicación en el momento del toque (ver
  // scanUploadPhoto/scanTakePhoto), sin esperar a su resultado: solo deja
  // el permiso resuelto y STATE.userLocation ya actualizado de fondo para
  // cuando scanForPoi lo necesite después.
  const prefetchLocation = () => {
    getCurrentLocationOnce()
      .then((coords) => { STATE.userLocation = coords; updateUserMarker(); })
      .catch(() => {});
  };

  // Reduce la foto (los móviles hacen fotos de varios MB) antes de mandarla:
  // más rápido de subir y de menos coste en tokens, sin perder detalle
  // relevante para reconocer un edificio.
  const resizeImageFile = (file, maxDim = 768, quality = 0.72) => new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    // Por si el formato (p.ej. HEIC en algún navegador) no dispara ni
    // onload ni onerror: sin esto la promesa se queda pendiente para
    // siempre y el "Analizando tu foto…" no llega a ningún sitio.
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image-load-timeout'));
    }, 8000);
    img.onload = () => {
      clearTimeout(timeoutId);
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else if (height >= width && height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { clearTimeout(timeoutId); URL.revokeObjectURL(objectUrl); reject(new Error('image-load-failed')); };
    img.src = objectUrl;
  });

  // Reduce una imagen ya en memoria (data URL) a una miniatura pequeña, sin
  // volver a tocar red ni el archivo original: se usa solo para el registro
  // de escaneos sin match (ver ScanLog más abajo), donde guardar la foto ya
  // redimensionada a 768px en localStorage para cientos de entradas se
  // llenaría el almacenamiento en poco tiempo.
  const shrinkDataUrl = (dataUrl, maxDim, quality) => new Promise((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => reject(new Error('thumb-timeout')), 4000);
    img.onload = () => {
      clearTimeout(timeoutId);
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else if (height >= width && height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { clearTimeout(timeoutId); reject(new Error('thumb-failed')); };
    img.src = dataUrl;
  });

  // Registro local (localStorage) de fotos escaneadas que no encontraron
  // match curado (ni "openended" ni "none"): pensado para que, con el
  // tiempo, se pueda revisar qué está fotografiando la gente que la app
  // todavía no reconoce, y decidir si merece la pena curarlo como POI
  // nuevo. Nunca se envía a ningún sitio: vive solo en este dispositivo,
  // y se exporta a mano como JSON desde el panel oculto (ver
  // wireScanLogTrigger). Acotado a SCAN_LOG_MAX entradas (con miniaturas
  // pequeñas) para no arriesgarse a llenar la cuota de localStorage.
  const SCAN_LOG_KEY = 'omot_scan_log';
  const SCAN_LOG_MAX = 150;
  const ScanLog = {
    read() {
      try { return JSON.parse(localStorage.getItem(SCAN_LOG_KEY)) || []; } catch (_) { return []; }
    },
    write(list) {
      try { localStorage.setItem(SCAN_LOG_KEY, JSON.stringify(list)); } catch (_) {}
    },
    add(entry) {
      const list = this.read();
      list.unshift(entry);
      if (list.length > SCAN_LOG_MAX) list.length = SCAN_LOG_MAX;
      this.write(list);
    },
    clear() { this.write([]); }
  };

  // Se llama sin esperar su resultado (no debe retrasar mostrar el
  // resultado del escaneo al usuario): cualquier fallo generando la
  // miniatura o escribiendo en localStorage se ignora en silencio, es un
  // extra de depuración, nunca debe romper el flujo normal de escaneo.
  const logUnrecognizedScan = async ({ type, name, coords, imageDataUrl }) => {
    try {
      const thumb = await shrinkDataUrl(imageDataUrl, 96, 0.5);
      ScanLog.add({
        ts: Date.now(),
        city: CURRENT_CITY ? CURRENT_CITY.id : null,
        type,
        name: name || null,
        coords: coords ? { lat: coords.lat, lng: coords.lng } : null,
        thumb
      });
    } catch (_) {}
  };

  // Candidatos: los POIs más cercanos al usuario en la ciudad actual, sin
  // depender del filtro de categoría activo (si vas caminando y sacas la
  // foto, tiene que poder reconocer cualquier punto, esté o no filtrado).
  const nearbyPoiCandidates = (coords, limit = 5) => {
    if (!coords || !POIS || !POIS.length) return [];
    return POIS
      .map((p) => ({ poi: p, dist: haversineMeters([coords.lat, coords.lng], p.coords) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit)
      .map(({ poi }) => ({ id: poi.id, name: pickDual(poi.name), subtitle: pickDual(poi.subtitle) }));
  };

  const setScanning = (on) => {
    const btn = $('#scanBtn');
    btn?.classList.toggle('-scanning', on);
    btn?.toggleAttribute('disabled', on);
  };

  // Cámara en vivo (getUserMedia) para "Tomar foto": en escritorio (y algún
  // navegador que no honre bien el atributo "capture" del input file) el
  // input por sí solo no abre ninguna cámara real. "Subir foto" usa en
  // cambio el input de archivo normal (ver wireEvents), como opción
  // explícita e independiente, no como fallback automático encadenado: así
  // no depende de la "activación" del toque original, que puede haberse
  // perdido tras la espera async del permiso de cámara.
  let cameraStream = null;

  // Zoom digital de la cámara en vivo: no hay control alguno sobre el
  // encuadre en el getUserMedia por defecto, así que se simula escalando
  // el propio <video> (transform: scale) para la vista previa, y recortando
  // la región central equivalente del frame real al capturar (ver más
  // abajo), para que la foto exportada coincida con lo que se veía en
  // pantalla. CAMERA_ZOOM_MAX a 3x es un límite razonable: más allá de eso
  // el digital zoom se ve demasiado pixelado para servir de ayuda real a
  // la identificación por IA.
  const CAMERA_ZOOM_MIN = 1;
  const CAMERA_ZOOM_MAX = 3;
  let cameraZoom = 1;

  const applyCameraZoom = (zoom) => {
    cameraZoom = Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, zoom));
    const video = $('#cameraVideo');
    if (video) video.style.transform = `scale(${cameraZoom})`;
    const label = $('#cameraZoomLabel');
    if (label) label.textContent = `${cameraZoom.toFixed(1)}×`;
  };

  const closeCameraCapture = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    const modal = $('#cameraModal');
    modal?.classList.remove('-open');
    modal?.setAttribute('aria-hidden', 'true');
  };

  const openCameraCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (_) {
      return false;
    }
    // A partir de aquí ya tenemos la cámara: cualquier fallo pintando el
    // modal (elemento no encontrado, srcObject rechazado, etc.) no debe
    // dejar colgada la promesa sin caer al input de archivo de respaldo.
    try {
      const modal = $('#cameraModal');
      const video = $('#cameraVideo');
      if (!modal || !video) throw new Error('camera-modal-missing');
      cameraStream = stream;
      video.srcObject = stream;
      applyCameraZoom(1); // cada apertura empieza sin zoom, no arrastra el de la vez anterior
      modal.classList.add('-open');
      modal.setAttribute('aria-hidden', 'false');
    } catch (_) {
      stream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
      return false;
    }
    return true;
  };

  const captureCameraPhoto = () => {
    const video = $('#cameraVideo');
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Recorta la región central equivalente al zoom aplicado en la vista
    // previa (a más zoom, región de origen más pequeña) y la escala para
    // rellenar el canvas entero, así la foto capturada coincide con lo que
    // se veía en pantalla en vez de mandar siempre el frame completo sin
    // recortar a la IA.
    const srcW = video.videoWidth / cameraZoom;
    const srcH = video.videoHeight / cameraZoom;
    const srcX = (video.videoWidth - srcW) / 2;
    const srcY = (video.videoHeight - srcH) / 2;
    canvas.getContext('2d').drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      closeCameraCapture();
      if (blob) scanForPoi(blob);
    }, 'image/jpeg', 0.85);
  };

  const scanForPoi = async (file) => {
    if (!file || !CURRENT_CITY) return;
    setScanning(true);
    // Feedback inmediato: localizarte + que la IA mire la foto puede tardar
    // varios segundos, y sin esto el único indicio de que algo está
    // pasando es el pulso sutil del botón — fácil de no notar.
    showToast(t('scanAnalyzing'), 6000);
    try {
      let coords = STATE.userLocation;
      try {
        coords = await getCurrentLocationOnce();
        STATE.userLocation = coords;
        updateUserMarker();
      } catch (_) {
        // Sin ubicación no abortamos: seguimos sin candidatos cercanos que
        // confirmar, pero la IA puede identificar la foto igual en abierto
        // (ver más abajo). La ubicación aquí es una ayuda para acotar, no
        // un requisito — sobre todo porque en algunos dispositivos falla
        // de forma persistente y bloquear la función entera por eso sería
        // peor que ofrecer un resultado sin ubicación confirmada.
        if (!coords) {
          showToast(t('scanNoLocation'), 2600);
        }
      }

      // Sin candidatos cercanos no abortamos: seguimos para que la IA
      // intente igual una identificación abierta (ver más abajo), solo que
      // sin nada conocido con lo que confirmarla primero.
      const candidates = nearbyPoiCandidates(coords, 5);

      const imageDataUrl = await resizeImageFile(file);

      if (!LLM.isReal()) {
        // Sin IA real configurada no hay reconocimiento visual posible. Ya
        // NO se sustituye por "el punto más cercano" por GPS: mostraba info
        // de un sitio distinto al fotografiado (p.ej. una estatua concreta
        // dentro de una plaza acababa mostrando la ficha de la plaza
        // entera), lo cual confunde más de lo que ayuda.
        showToast(t('scanNoAiOffline'), 3000);
        return;
      }

      // 429/503 = la IA está saturada en ese instante (frecuente con
      // Gemini en horas punta): no es un fallo persistente, así que antes
      // de rendirse se reintenta una vez tras una breve espera en vez de
      // hacer fracasar todo el escaneo por una saturación pasajera.
      let result;
      try {
        result = await LLM.identifyPoi({ imageDataUrl, candidates, cityName: CURRENT_CITY.name });
      } catch (e) {
        if (e && (e.status === 429 || e.status === 503)) {
          showToast(t('scanAiBusyRetry'), 2500);
          await new Promise((r) => setTimeout(r, 2500));
          result = await LLM.identifyPoi({ imageDataUrl, candidates, cityName: CURRENT_CITY.name });
        } else {
          throw e;
        }
      }
      if (!result.supported) {
        showToast(t('scanFailedGeneric'), 3000);
        return;
      }
      if (result.type === 'match') {
        openScannedPoi(result.poiId);
      } else if (result.type === 'openended') {
        logUnrecognizedScan({ type: 'openended', name: result.name, coords, imageDataUrl });
        openAdHocScanResult(result, imageDataUrl, coords);
      } else {
        logUnrecognizedScan({ type: 'none', name: null, coords, imageDataUrl });
        showToast(t('scanNotRecognized'), 3200);
      }
    } catch (e) {
      console.warn('[Scan] Error identificando POI:', e);
      if (e && (e.status === 429 || e.status === 503)) {
        // Ya se reintentó una vez arriba: si sigue saturada, mensaje
        // honesto de "vuelve a intentarlo en un momento" en vez de un
        // código HTTP que no significa nada para quien lo lee.
        showToast(t('scanAiStillBusy'), 3500);
      } else {
        // Se incluye el motivo real y corto en el propio aviso (no solo en
        // consola, que en el móvil nadie mira): así un fallo se puede
        // reportar con una captura de pantalla en vez de tener que
        // adivinarlo a ciegas otra vez.
        const code = e && e.status ? `HTTP ${e.status}`
          : (e && (e.name === 'AbortError' || e.message === 'vision-timeout')) ? t('scanReasonTimeout')
          : (e && (e.message === 'image-load-timeout' || e.message === 'image-load-failed')) ? t('scanReasonImageFailed')
          : (e && e.message) ? e.message
          : t('scanReasonUnknown');
        showToast(t('scanFailedWithCode').replace('{code}', code), 4200);
      }
    } finally {
      setScanning(false);
    }
  };

  const openScannedPoi = (poiId) => {
    const poi = POIS.find((p) => p.id === poiId);
    if (!poi) return;
    selectPoi(poiId, true);
    showToast(`${t('scanRecognized')}${pickDual(poi.name)}${STATE.mode === 'kids' ? '! 🎉' : '.'}`, 2800);
  };

  // Cuando la foto no es ninguno de los POIs curados de la app pero la IA
  // reconoce igual qué es, se construye una ficha "efímera" (no forma parte
  // de los datos de la ciudad, no aparece como pin en el mapa) reutilizando
  // toda la infraestructura de la ficha normal: imagen (la propia foto del
  // usuario), audioguía narrada y chat para seguir preguntando. Se marca
  // claramente como "sin verificar" porque, a diferencia del resto de la
  // app, aquí ni siquiera los datos base están curados a mano.
  const openAdHocScanResult = (info, imageDataUrl, coords) => {
    const id = `scan-adhoc-${Date.now()}`;
    // El aviso de "sin verificar" NO va en subtitle: la primera narración
    // dice en voz alta el nombre + subtítulo (ver buildNarrativeText), así
    // que si el aviso viviera ahí la audioguía leería literalmente "sin
    // verificar, puede contener errores" como si fuera parte del relato.
    // Se deja solo en el badge y en el aviso emergente, que son visuales.
    const tagline = info.subtitle || t('scanIdentifiedFromPhoto');
    const poi = {
      id,
      name: { adult: info.name, kids: info.name },
      subtitle: { adult: tagline, kids: tagline },
      category: CATEGORIES.HIDDEN,
      // Sin ubicación real, se usa el centro de la ciudad como posición de
      // relleno: nunca se muestra como pin (ver renderMarkers), así que
      // solo afecta al cálculo de distancia, que ya no tiene sentido mostrar
      // aquí de todas formas.
      coords: coords ? [coords.lat, coords.lng] : CURRENT_CITY.center,
      image: imageDataUrl,
      audio: {
        duration: Math.max(40, Math.round((info.info || info.subtitle || '').split(/\s+/).length / 2.3)),
        title: { adult: `${t('scanAiAnalysisTitle')}${info.name}`, kids: `${t('scanAiAnalysisTitle')}${info.name}` }
      },
      tabs: {
        history: {
          adult: info.info || info.subtitle || t('scanNoMoreData'),
          kids: info.info || info.subtitle || t('scanNoMoreData')
        }
      },
      isAdHocScan: true
    };
    POIS.push(poi);
    selectPoi(id, true);
    const badge = $('.sheet-cat-badge', els.sheet);
    if (badge) badge.textContent = t('scanUnverifiedBadge');
    showToast(t('scanAdHocResult').replace('{name}', info.name), 3200);
  };

  // Las fichas efímeras del escaneo no deben quedarse coladas en POIS: si
  // no se limpian, podrían reaparecer como un pin fantasma en el mapa la
  // próxima vez que se recalculen los marcadores (cambio de filtro, etc.).
  const cleanupAdHocScanIfNeeded = (poiId) => {
    if (!poiId) return;
    const idx = POIS.findIndex((p) => p.id === poiId && p.isAdHocScan);
    if (idx >= 0) POIS.splice(idx, 1);
  };

  /* =========================================================
   * CIUDADES
   * =======================================================*/
  const nearestCityId = (lat, lng) => {
    let best = null, bestDist = Infinity;
    Object.values(CITIES).forEach((city) => {
      const d = haversineMeters([lat, lng], city.center);
      if (d < bestDist) { bestDist = d; best = city.id; }
    });
    return best;
  };

  // Carga bajo demanda del contenido de una ciudad (POIs): solo
  // CATEGORIES/CITIES-esqueleto/AI_PROMPTS viven en data/core.js, que se
  // descarga siempre; el contenido real de cada ciudad se pide solo la
  // primera vez que se elige, y queda cacheado (variable + Service Worker)
  // para las siguientes veces en la misma sesión o visitas posteriores.
  //
  // El contenido se sirve desde el Worker (endpoint /content, gate de
  // licencia — ver worker/proxy.js) en vez de como fichero estático
  // data/cities/<id>.js del repo: así no queda legible por cualquiera que
  // abra el repo público en GitHub sin pasar antes por el control de acceso.
  const loadedCityScripts = new Set();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const CONTENT_BASE_URL = (typeof window !== 'undefined' && window.LLM_CONFIG && window.LLM_CONFIG.baseUrl) || '';
  const CONTENT_ENDPOINT = CONTENT_BASE_URL ? `${CONTENT_BASE_URL.replace(/\/$/, '')}/content` : '';

  // Usado por loadWaterFountains/loadRestrooms (capas opcionales, siguen
  // siendo ficheros estáticos del repo, no llevan gate de licencia).
  const loadScriptOnce = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });

  // Justo tras registrarse, el Service Worker puede tomar el control de la
  // página a mitad de sesión (clients.claim() en sw.js) mientras esta
  // petición ya está en marcha, lo que a veces la hace fallar una vez con
  // net::ERR_FAILED aunque la red vaya bien. Un par de reintentos cortos
  // resuelve ese hueco sin que el usuario vea nunca el aviso de error.
  const loadCityData = async (cityId) => {
    if (CITIES[cityId] && Array.isArray(CITIES[cityId].pois)) return;
    if (loadedCityScripts.has(cityId)) return;

    const stored = LICENSE.readStored();
    const username = stored && stored.username;
    if (!username || !CONTENT_ENDPOINT) throw new Error('Sin licencia válida para cargar contenido');

    const delays = [0, 350, 900];
    let lastError;
    for (const delay of delays) {
      if (delay) await sleep(delay);
      try {
        const res = await fetch(CONTENT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, cityId })
        });
        if (!res.ok) throw new Error(`content ${res.status}`);
        const pois = await res.json();
        CITIES[cityId].pois = pois;
        loadedCityScripts.add(cityId);
        return;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  };

  // Carga bajo demanda de data/layers/water-fountains-<id>.js: solo se pide
  // la primera vez que el usuario activa el toggle de bebederos (no en
  // selectCity), para no penalizar a quien nunca usa esta capa.
  const loadedFountainScripts = new Set();
  const loadWaterFountains = async (cityId) => {
    if (window.WATER_FOUNTAINS && window.WATER_FOUNTAINS[cityId]) return;
    if (loadedFountainScripts.has(cityId)) return;
    try {
      await loadScriptOnce(`data/layers/water-fountains-${cityId}.js?v=1`);
      loadedFountainScripts.add(cityId);
    } catch (e) {
      console.warn(`No se pudieron cargar las fuentes de agua de ${cityId}`, e);
    }
  };

  const renderFountains = () => {
    if (!fountainsLayer) return;
    fountainsLayer.clearLayers();
    const list = (window.WATER_FOUNTAINS && window.WATER_FOUNTAINS[STATE.cityId]) || [];
    list.forEach((f) => {
      // zIndexOffset muy negativo: mantiene los bebederos siempre por
      // detrás de los pines de POI (offset 0) cuando coinciden en el mapa.
      const marker = L.marker(f.coords, { icon: makeFountainIcon(f.status), zIndexOffset: -1000 });
      const offNote = f.status === 'fuera-de-servicio' ? '<br><em>Fuera de servicio</em>' : '';
      marker.bindPopup(`<strong>Fuente de agua potable</strong><br>${f.address}${offNote}`);
      marker.addTo(fountainsLayer);
    });
  };

  // Toggle del botón de bebederos: carga los datos la primera vez (si hace
  // falta) y añade/quita fountainsLayer del mapa sin tocar markersLayer ni
  // clusterLayer.
  const toggleFountains = async () => {
    fountainsVisible = !fountainsVisible;
    const btn = $('#fountainsBtn');
    btn?.classList.toggle('-active', fountainsVisible);
    if (!map || !fountainsLayer) return;
    if (fountainsVisible) {
      await loadWaterFountains(STATE.cityId);
      renderFountains();
      if (!map.hasLayer(fountainsLayer)) fountainsLayer.addTo(map);
    } else if (map.hasLayer(fountainsLayer)) {
      map.removeLayer(fountainsLayer);
    }
  };

  // Carga bajo demanda de data/layers/restrooms-<id>.js: mismo patrón que
  // loadWaterFountains (ver comentario arriba) — solo se pide la primera
  // vez que el usuario activa el toggle de aseos.
  const loadedRestroomScripts = new Set();
  const loadRestrooms = async (cityId) => {
    if (window.RESTROOMS && window.RESTROOMS[cityId]) return;
    if (loadedRestroomScripts.has(cityId)) return;
    try {
      await loadScriptOnce(`data/layers/restrooms-${cityId}.js?v=1`);
      loadedRestroomScripts.add(cityId);
    } catch (e) {
      console.warn(`No se pudieron cargar los aseos de ${cityId}`, e);
    }
  };

  const renderRestrooms = () => {
    if (!restroomsLayer) return;
    restroomsLayer.clearLayers();
    const list = (window.RESTROOMS && window.RESTROOMS[STATE.cityId]) || [];
    list.forEach((r) => {
      // zIndexOffset muy negativo: igual que en renderFountains, mantiene
      // los aseos siempre por detrás de los pines de POI.
      const marker = L.marker(r.coords, { icon: makeRestroomIcon(r.status), zIndexOffset: -1000 });
      const info = [
        r.tipo === 'urinario' ? 'Urinario' : null,
        r.precio ? `${r.precio.toFixed(2).replace('.', ',')} €` : 'Gratuito',
        r.accesible === 'si' ? 'Accesible' : null
      ].filter(Boolean).join(' · ');
      const offNote = r.status === 'evento' ? '<br><em>Solo abierto en eventos</em>' : '';
      marker.bindPopup(`<strong>Aseo público</strong><br>${r.address}<br>${info}${offNote}`);
      marker.addTo(restroomsLayer);
    });
  };

  // Toggle del botón de aseos: mismo patrón que toggleFountains (ver
  // comentario arriba), independiente de markersLayer/clusterLayer y de
  // fountainsLayer.
  const toggleRestrooms = async () => {
    restroomsVisible = !restroomsVisible;
    const btn = $('#restroomsBtn');
    btn?.classList.toggle('-active', restroomsVisible);
    if (!map || !restroomsLayer) return;
    if (restroomsVisible) {
      await loadRestrooms(STATE.cityId);
      renderRestrooms();
      if (!map.hasLayer(restroomsLayer)) restroomsLayer.addTo(map);
    } else if (map.hasLayer(restroomsLayer)) {
      map.removeLayer(restroomsLayer);
    }
  };

  /* =========================================================
   * EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER"
   * (rama experimento-patrocinios-demo, NO fusionar a main sin revisar)
   *
   * Mismo patrón exacto que fuentes/aseos de arriba, pero con TODOS los
   * restaurantes/cafeterías/comida rápida cercanos (datos abiertos de
   * OpenStreetMap vía Overpass — ver scratchpad/build-food-layer.js),
   * patrocinen o no. Resuelve el conflicto de "solo enseñar lo pagado":
   * esta capa es honesta y completa; el patrocinio (ver sponsorsLayer más
   * arriba) solo compra protagonismo DENTRO de la ficha, nunca la
   * posibilidad de aparecer aquí — aquí aparece todo el mundo igual.
   * =======================================================*/
  const loadedFoodScripts = new Set();
  const loadFoodPlaces = async (cityId) => {
    if (window.FOOD_PLACES && window.FOOD_PLACES[cityId]) return;
    if (loadedFoodScripts.has(cityId)) return;
    try {
      await loadScriptOnce(`data/layers/food-${cityId}.js?v=1`);
      loadedFoodScripts.add(cityId);
    } catch (e) {
      console.warn(`No se pudo cargar la capa de comer/beber de ${cityId}`, e);
    }
  };

  const FOOD_TYPE_LABEL = { restaurant: 'Restaurante', cafe: 'Cafetería', fast_food: 'Comida rápida' };
  const renderFood = () => {
    if (!foodLayer) return;
    foodLayer.clearLayers();
    const list = (window.FOOD_PLACES && window.FOOD_PLACES[STATE.cityId]) || [];
    list.forEach((f) => {
      const marker = L.marker(f.coords, { icon: makeFoodIcon(), zIndexOffset: -1000 });
      const typeLabel = FOOD_TYPE_LABEL[f.type] || 'Comer y beber';
      const cuisine = f.cuisine ? ` · ${f.cuisine}` : '';
      marker.bindPopup(`<strong>${f.name}</strong><br>${typeLabel}${cuisine}`);
      marker.addTo(foodLayer);
    });
  };

  const toggleFood = async () => {
    foodVisible = !foodVisible;
    const btn = $('#foodBtn');
    btn?.classList.toggle('-active', foodVisible);
    if (!map || !foodLayer) return;
    if (foodVisible) {
      await loadFoodPlaces(STATE.cityId);
      renderFood();
      if (!map.hasLayer(foodLayer)) foodLayer.addTo(map);
    } else if (map.hasLayer(foodLayer)) {
      map.removeLayer(foodLayer);
    }
  };

  /* =========================================================
   * EXPERIMENTO TEMPORAL — PATROCINIOS DEMO
   * (rama experimento-patrocinios-demo, NO fusionar a main)
   *
   * Ejercicio de monetización: 3 restaurantes ficticios (ver
   * data/sponsors-demo.js) prueban los 3 niveles de cuota:
   *   - Bronce: mención de texto en la ficha del POI cercano.
   *   - Plata:  mención + botón "Ver en el mapa" (pin temporal).
   *   - Oro:    pin permanente en el mapa + tarjeta con foto en la ficha.
   * BORRAR todo este bloque, la capa `sponsorsLayer` de arriba, la
   * llamada a renderSponsorDemoInsert en populateSheetContent,
   * data/sponsors-demo.js y su <script> en index.html antes de
   * fusionar cualquier cosa de esta rama a main.
   * =======================================================*/
  // Iconos reales (no emoji, para que se lea igual de "en serio" que el
  // resto de la ficha en modo adulto) recortados a partir de los dos PNG
  // que se pusieron en assets/icons — ver scratchpad/clean-sponsor-icons.js.
  const SPONSOR_ICON_SRC = {
    restaurant: 'assets/icons/sponsor-restaurant-icon.png',
    cafe: 'assets/icons/sponsor-cafe-icon.png'
  };
  const sponsorIconUrl = (sponsor) => SPONSOR_ICON_SRC[sponsor.icon] || SPONSOR_ICON_SRC.restaurant;

  const makeSponsorDemoIcon = (sponsor, pulse = false) => L.divIcon({
    className: 'custom-pin-wrap',
    html: `<div class="sponsor-demo-pin${pulse ? ' -pulse' : ''}"><img src="${sponsorIconUrl(sponsor)}" alt="" /></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26]
  });

  const renderSponsorsDemo = () => {
    if (!sponsorsLayer) return;
    sponsorsLayer.clearLayers();
    const list = (typeof SPONSORS_DEMO !== 'undefined' ? SPONSORS_DEMO : []).filter((s) => s.city === STATE.cityId && s.tier === 'oro');
    list.forEach((s) => {
      const marker = L.marker(s.coords, { icon: makeSponsorDemoIcon(s) });
      marker.bindPopup(`<strong>${s.name}</strong><br>${s.teaser}<br><em>Patrocinado — DEMO</em>`);
      marker.addTo(sponsorsLayer);
    });
  };

  // Nivel Plata: no tiene pin permanente, así que "Ver en el mapa" pone uno
  // temporal (pulsando) y centra el mapa encima antes de quitarlo solo.
  const flyToSponsorDemo = (sponsor) => {
    if (!map || !sponsorsLayer) return;
    const marker = L.marker(sponsor.coords, { icon: makeSponsorDemoIcon(sponsor, true), zIndexOffset: 800 });
    marker.addTo(sponsorsLayer);
    map.flyTo(sponsor.coords, 17, { duration: 0.6 });
    setTimeout(() => sponsorsLayer.removeLayer(marker), 3000);
  };

  // Carta ficticia (nivel Oro, botón "Ver la carta"): un modal suelto fuera
  // de la ficha (igual que el lightbox de fotos), no una tarjeta más dentro
  // del sheet, porque tapa la pantalla entera y con la ficha de por medio
  // sería muy poco espacio para leer una carta completa.
  const ensureSponsorDemoMenuModal = () => {
    let el = document.getElementById('sponsorDemoMenuModal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'sponsorDemoMenuModal';
    el.className = 'sponsor-demo-menu-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="sponsor-demo-menu-card" role="dialog" aria-modal="true">
        <button type="button" class="sponsor-demo-menu-close" aria-label="Cerrar carta">✕</button>
        <div class="sponsor-demo-menu-head"></div>
        <div class="sponsor-demo-menu-body"></div>
        <p class="sponsor-demo-menu-foot">Carta ficticia — ejercicio de patrocinios (DEMO)</p>
      </div>`;
    document.body.appendChild(el);
    const close = () => { el.hidden = true; };
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    el.querySelector('.sponsor-demo-menu-close').addEventListener('click', close);
    return el;
  };

  const showSponsorDemoMenu = (sponsor) => {
    const el = ensureSponsorDemoMenuModal();
    const card = el.querySelector('.sponsor-demo-menu-card');
    const cleanName = sponsor.name.replace(/\s*\(DEMO.*?\)\s*/i, '');
    el.querySelector('.sponsor-demo-menu-head').innerHTML = `
      <span class="emoji"><img src="${sponsorIconUrl(sponsor)}" alt="" /></span>
      <div><h3>${cleanName}</h3><p>${sponsor.teaser}</p></div>`;
    const body = el.querySelector('.sponsor-demo-menu-body');
    // Muchos negocios reales ya tienen su carta como PDF y prefieren
    // entregar eso a que alguien les teclee la carta a mano — se incrusta
    // con un <iframe> (visor nativo del navegador) para que se abra sin
    // salir de la app, ni descargar nada, ni abrir una pestaña nueva.
    card.classList.toggle('-pdf', !!sponsor.menuPdf);
    if (sponsor.menuPdf) {
      body.innerHTML = `<iframe src="${sponsor.menuPdf}" title="Carta de ${cleanName}" loading="lazy"></iframe>`;
    } else {
      const items = (sponsor.menu || [])
        .map((m) => `<li><span>${m.item}</span><span class="price">${m.price}</span></li>`)
        .join('') || '<li><span>Carta no disponible en esta demo.</span></li>';
      body.innerHTML = `<ul class="sponsor-demo-menu-list">${items}</ul>`;
    }
    el.hidden = false;
  };

  // MEDICIÓN (demo): cuenta impresiones/clics por sponsor en localStorage,
  // para poder responder "¿cuánta gente ve la carta / pide ir allí?" sin
  // montar un backend de analítica solo para el ejercicio. En un producto
  // real esto NUNCA se le muestra al turista dentro de la ficha (es un dato
  // para el panel del anunciante) — por eso aquí solo se registra y se
  // consulta por consola (window.SPONSOR_DEMO_STATS()), no se pinta en la
  // tarjeta.
  const SPONSOR_DEMO_METRICS_KEY = 'omot_sponsor_demo_metrics_v1';
  // Cola en memoria de lo que aún no se ha mandado a Cloudflare — ver
  // flushSponsorDemoMetrics. Se manda por RESTAURANTE, nunca por usuario:
  // no hay ningún identificador de persona en el payload.
  const pendingSponsorDemoDeltas = {};
  const trackSponsorDemoEvent = (sponsor, kind) => {
    const sponsorId = sponsor.id;
    let all = {};
    try { all = JSON.parse(localStorage.getItem(SPONSOR_DEMO_METRICS_KEY) || '{}'); } catch (_) { all = {}; }
    if (!all[sponsorId]) all[sponsorId] = { impression: 0, map: 0, menu: 0, directions: 0 };
    all[sponsorId][kind] = (all[sponsorId][kind] || 0) + 1;
    try { localStorage.setItem(SPONSOR_DEMO_METRICS_KEY, JSON.stringify(all)); } catch (_) {}
    console.log('[patrocinios demo]', sponsorId, kind, all[sponsorId]);

    if (!pendingSponsorDemoDeltas[sponsorId]) {
      pendingSponsorDemoDeltas[sponsorId] = { name: sponsor.name, impression: 0, map: 0, menu: 0, directions: 0 };
    }
    pendingSponsorDemoDeltas[sponsorId][kind]++;
  };
  // Consulta rápida desde la consola del navegador mientras se prueba.
  window.SPONSOR_DEMO_STATS = () => {
    try { return JSON.parse(localStorage.getItem(SPONSOR_DEMO_METRICS_KEY) || '{}'); } catch (_) { return {}; }
  };

  // Manda la cola acumulada al Worker DE UNA VEZ (1 escritura de KV por
  // restaurante con eventos pendientes, no una por cada toque) — se llama
  // al cerrar la ficha y cada 2 minutos como red de seguridad si se queda
  // abierta. Mismo baseUrl que ya usa LICENSE para hablar con el Worker
  // (ver window.LLM_CONFIG en index.html); si no hay red o el endpoint no
  // existe todavía (rama sin desplegar en Cloudflare), falla en silencio y
  // los datos siguen intactos en localStorage para la próxima vez.
  const SPONSOR_TRACK_BASE = (typeof window !== 'undefined' && window.LLM_CONFIG && window.LLM_CONFIG.baseUrl) || '';
  const flushSponsorDemoMetrics = () => {
    if (!SPONSOR_TRACK_BASE) return;
    const endpoint = `${SPONSOR_TRACK_BASE.replace(/\/$/, '')}/sponsor/track`;
    Object.keys(pendingSponsorDemoDeltas).forEach((sponsorId) => {
      const { name, ...events } = pendingSponsorDemoDeltas[sponsorId];
      delete pendingSponsorDemoDeltas[sponsorId];
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorId, name, events })
      }).catch(() => { /* red caída: se pierde este lote, pero no rompe nada */ });
    });
  };
  setInterval(flushSponsorDemoMetrics, 120000);

  // ROTACIÓN entre varios sponsors interesados en el mismo POI: gana
  // siempre el nivel más alto (Oro > Plata > Bronce, igual que pagaría más
  // caro un anunciante por más prioridad); si hay EMPATE de nivel entre
  // varios (ver demo-oro-1/demo-oro-2 en data/sponsors-demo.js, misma zona
  // a propósito), se alterna uno distinto cada vez que se abre la ficha de
  // ESE POI en concreto, para que ninguno se quede siempre fuera.
  const SPONSOR_TIER_RANK = { oro: 3, plata: 2, bronce: 1 };
  const sponsorRotationCounters = {}; // { [poiId]: siguiente índice a mostrar }
  const findNearbySponsorDemo = (poi) => {
    if (!poi || !poi.coords) return null;
    const candidates = (typeof SPONSORS_DEMO !== 'undefined' ? SPONSORS_DEMO : [])
      .filter((s) => s.city === STATE.cityId)
      .map((s) => ({ sponsor: s, distance: haversineMeters(poi.coords, s.coords) }))
      .filter((c) => c.distance <= c.sponsor.radius);
    if (!candidates.length) return null;
    const bestRank = Math.max(...candidates.map((c) => SPONSOR_TIER_RANK[c.sponsor.tier] || 0));
    const topTier = candidates.filter((c) => (SPONSOR_TIER_RANK[c.sponsor.tier] || 0) === bestRank);
    if (topTier.length === 1) return topTier[0];
    const i = sponsorRotationCounters[poi.id] || 0;
    sponsorRotationCounters[poi.id] = (i + 1) % topTier.length;
    return topTier[i % topTier.length];
  };

  // Recuerda qué sponsor quedó mostrado en la ficha actualmente abierta,
  // para que la mención por voz (ver el "finished" de toggleAudio) hable
  // del MISMO que ve el usuario en la tarjeta, en vez de recalcular y
  // arriesgarse a rotar a otro distinto a media narración.
  let activeSponsorDemoMatch = null;

  const ensureSponsorDemoEl = () => {
    let el = $('#sheetSponsorDemo', els.sheet);
    if (!el) {
      el = document.createElement('div');
      el.id = 'sheetSponsorDemo';
      el.hidden = true;
      const head = $('.sheet-head', els.sheet);
      if (head) head.insertAdjacentElement('afterend', el);
    }
    return el;
  };

  const renderSponsorDemoInsert = (poi) => {
    const el = ensureSponsorDemoEl();
    const match = findNearbySponsorDemo(poi);
    activeSponsorDemoMatch = match ? { poiId: poi.id, ...match } : null;
    if (!match) { el.hidden = true; el.className = ''; el.innerHTML = ''; return; }
    const { sponsor, distance } = match;
    const distLabel = formatDistance(distance);
    trackSponsorDemoEvent(sponsor, 'impression');
    const iconImg = `<img class="inline-icon" src="${sponsorIconUrl(sponsor)}" alt="" />`;
    if (sponsor.tier === 'bronce') {
      el.className = 'sheet-sponsor-demo';
      el.innerHTML = `<span class="label">Contenido patrocinado</span>
        <p>${iconImg} Muy cerca (${distLabel}) tienes <b>${sponsor.name}</b>. ${sponsor.teaser}</p>`;
    } else if (sponsor.tier === 'plata') {
      el.className = 'sheet-sponsor-demo';
      el.innerHTML = `<span class="label">Contenido patrocinado</span>
        <p>${iconImg} Muy cerca (${distLabel}) tienes <b>${sponsor.name}</b>. ${sponsor.teaser}</p>
        <button type="button" id="sponsorDemoMapBtn">Ver en el mapa</button>`;
      const btn = $('#sponsorDemoMapBtn', el);
      if (btn) btn.addEventListener('click', () => { trackSponsorDemoEvent(sponsor, 'map'); flyToSponsorDemo(sponsor); });
    } else if (sponsor.tier === 'oro') {
      el.className = 'sheet-sponsor-demo -oro';
      // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
      // los botones vivían debajo del texto en su propia fila (.cta-row),
      // dejando la ficha más alta de lo necesario con un hueco vacío a la
      // derecha del texto (donde nunca llegaba a ocupar todo el ancho).
      // Ahora son una TERCERA columna (.cta-col) al lado de la foto y el
      // texto, apilados verticalmente en ese mismo hueco -- la tarjeta
      // ocupa menos alto sin perder nada. BORRAR este comentario si se
      // retira el experimento (el layout se queda si el cambio se mantiene).
      el.innerHTML = `<div class="photo"><img src="${sponsorIconUrl(sponsor)}" alt="" /></div>
        <div class="body">
          <span class="label">Contenido patrocinado</span>
          <p><b>${sponsor.name}</b><br>${sponsor.teaser}</p>
          <span class="dist">${distLabel}</span>
        </div>
        <div class="cta-col">
          <button type="button" id="sponsorDemoMenuBtn">Ver la carta</button>
          <button type="button" id="sponsorDemoDirBtn">Cómo llegar</button>
        </div>`;
      const menuBtn = $('#sponsorDemoMenuBtn', el);
      if (menuBtn) menuBtn.addEventListener('click', () => {
        trackSponsorDemoEvent(sponsor, 'menu');
        showSponsorDemoMenu(sponsor);
      });
      const dirBtn = $('#sponsorDemoDirBtn', el);
      if (dirBtn) dirBtn.addEventListener('click', () => {
        trackSponsorDemoEvent(sponsor, 'directions');
        flyToSponsorDemo(sponsor);
      });
    }
    el.hidden = false;
  };

  // "Plus" de nivel Oro (ver audioMention en data/sponsors-demo.js): al
  // terminar la audioguía del POI orgánico, si el sponsor que quedó
  // mostrado en su ficha pagó ese extra, se lee una frase corta con la
  // misma voz — reutiliza el mecanismo de "texto puntual" (overrideText)
  // que ya usan el tutorial y "cómo llegar" (ver más abajo, STATE.audio.
  // overrideText), así que no hace falta ningún motor de voz nuevo.
  const maybeSpeakSponsorDemoOutro = (poi) => {
    if (!poi || STATE.mode === 'kids') return;
    const match = activeSponsorDemoMatch;
    if (!match || match.poiId !== poi.id || !match.sponsor.audioMention) return;
    setTimeout(() => {
      // Si mientras tanto se cerró la ficha o se abrió otro POI, no decimos
      // nada: sería una voz patrocinada sonando sobre una pantalla distinta.
      if (STATE.activePoiId !== poi.id || STATE.audio.playing) return;
      const cleanName = match.sponsor.name.replace(/\s*\(DEMO.*?\)\s*/i, '');
      STATE.audio.overrideText = `Si quieres hacer una pausa para recuperar aliento y probar algo de la zona, cerca tienes ${cleanName}. ${match.sponsor.teaser}`;
      SPEECH.speak(() => { STATE.audio.overrideText = null; });
    }, 900);
  };

  // EXPERIMENTO (rama experimento-vista-satelite): a diferencia de
  // toggleFountains/toggleRestrooms (capas aditivas), aquí se INTERCAMBIA
  // la capa base — streetLayer y satelliteLayer nunca están las dos a la
  // vez, para no pintar calles encima de la foto o viceversa.
  const toggleSatellite = () => {
    satelliteVisible = !satelliteVisible;
    const btn = $('#satelliteBtn');
    btn?.classList.toggle('-active', satelliteVisible);
    if (!map || !streetLayer || !satelliteLayer) return;
    if (satelliteVisible) {
      if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
      satelliteLayer.addTo(map);
    } else {
      if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
      streetLayer.addTo(map);
    }
  };

  // Cambia de ciudad: recarga POIs, mapa y cabecera. Si la app ya estaba
  // en marcha (no es el arranque inicial), también limpia la ficha abierta.
  // Async porque puede necesitar descargar data/cities/<id>.js primero.
  const selectCity = async (cityId) => {
    const city = CITIES[cityId];
    if (!city) return;
    await loadCityData(cityId);
    STATE.cityId = cityId;
    CURRENT_CITY = city;
    POIS = city.pois;
    STATE.category = CATEGORIES.ALL;
    STATE.activeRoute = null;
    closeRoutePicker();
    saveState();
    if (map) {
      closeSheet();
      initMap();
      updatePills();
    }
    setStateMode(STATE.mode);
  };

  /* =========================================================
   * HEADER
   * =======================================================*/
  // Activa una ruta imprescindible concreta (tras elegirla directamente o
  // desde el selector de circuitos) y refresca mapa/ficha/píldora en bloque.
  const activateRoute = (routeId) => {
    STATE.activeRoute = routeId;
    STATE.category = 'essential';
    closeRoutePicker();
    updatePills();
    updateEssentialPillLabel();
    renderMarkers();
    if (STATE.activePoiId) {
      const poi = POIS.find((x) => x.id === STATE.activePoiId);
      if (!poi || !isPoiInActiveRoute(poi)) closeSheet();
      else setSelectedMarker(STATE.activePoiId);
    }
    const routeMeta = getCityRoutes().find((r) => r.id === routeId);
    const routeLabel = routeMeta ? pickDual(routeMeta.name) : '';
    showToast(t('routeFollowNumbers').replace('{route}', routeLabel), 3000);
    playRouteIntro(routeMeta);
  };

  /* =========================================================
   * INTRO DE RUTA (audioguía corta al elegir un circuito)
   * Reutiliza SPEECH (misma voz elegida, mismo motor) pero con su propio
   * mini-reproductor en el header, independiente de la ficha de POI: se
   * activa antes de que el usuario haya tocado ningún pin.
   * =======================================================*/
  const routeIntroState = { playing: false, currentTime: 0, duration: 0, timer: null, routeId: null };

  const formatAudioTime = (s) => {
    const total = Math.max(0, Math.round(s));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  const updateRouteIntroUi = () => {
    if (!els.routeIntro || els.routeIntro.hidden) return;
    const btn = $('#routeIntroPlay');
    if (btn) btn.innerHTML = routeIntroState.playing ? ICONS.pause : ICONS.play;
    const fill = $('#routeIntroFill');
    const dur = routeIntroState.duration || 1;
    if (fill) fill.style.width = `${Math.min(100, (routeIntroState.currentTime / dur) * 100)}%`;
    const time = $('#routeIntroTime');
    if (time) time.textContent = `${formatAudioTime(routeIntroState.currentTime)} / ${formatAudioTime(routeIntroState.duration)}`;
  };

  const stopRouteIntroAudio = () => {
    routeIntroState.playing = false;
    clearInterval(routeIntroState.timer);
    routeIntroState.timer = null;
    SPEECH.cancel();
    updateRouteIntroUi();
  };

  // Se llama también al abrir un POI o cambiar de ciudad, para que no quede
  // sonando (o con el icono desincronizado) por encima de otra narración.
  const closeRouteIntro = () => {
    stopRouteIntroAudio();
    routeIntroState.routeId = null;
    if (els.routeIntro) els.routeIntro.hidden = true;
  };

  const startRouteIntroAudio = (isResume = false) => {
    routeIntroState.playing = true;
    if (!isResume && SPEECH.isSupported()) {
      routeIntroState.duration = estimateSpeechDuration(SPEECH.getText());
    }
    const duration = routeIntroState.duration;
    clearInterval(routeIntroState.timer);

    if (!isResume) {
      const spokeOk = SPEECH.isSupported() && SPEECH.speak(({ finished, error, startFailed }) => {
        if (finished || error || startFailed) {
          routeIntroState.currentTime = finished ? duration : 0;
          stopRouteIntroAudio();
        }
      });
      if (!spokeOk) {
        routeIntroState.playing = false;
        updateRouteIntroUi();
        return;
      }
    } else {
      SPEECH.resume();
    }

    routeIntroState.timer = setInterval(() => {
      routeIntroState.currentTime += 0.2;
      if (routeIntroState.currentTime >= duration) {
        routeIntroState.currentTime = duration;
        stopRouteIntroAudio();
        return;
      }
      updateRouteIntroUi();
    }, 200);
    updateRouteIntroUi();
  };

  const pauseRouteIntroAudio = () => {
    routeIntroState.playing = false;
    clearInterval(routeIntroState.timer);
    routeIntroState.timer = null;
    SPEECH.pause();
    updateRouteIntroUi();
  };

  const toggleRouteIntroAudio = () => {
    if (!routeIntroState.routeId) return;
    if (routeIntroState.playing) {
      if (SPEECH.isSupported() && routeIntroState.currentTime > 0 && routeIntroState.currentTime < routeIntroState.duration) {
        pauseRouteIntroAudio();
      } else {
        stopRouteIntroAudio();
      }
    } else {
      const isPausedMidway = routeIntroState.currentTime > 0 && routeIntroState.currentTime < routeIntroState.duration;
      startRouteIntroAudio(isPausedMidway);
    }
  };

  // Se llama SIEMPRE de forma síncrona dentro del click del usuario que
  // elige la ruta (requisito de iOS para poder narrar sin un gesto aparte).
  const playRouteIntro = (routeMeta) => {
    if (!els.routeIntro || !routeMeta || !routeMeta.intro || !SPEECH.isSupported()) return;
    const text = pickDual(routeMeta.intro);
    if (!text) return;
    stopRouteIntroAudio();
    routeIntroState.routeId = routeMeta.id;
    routeIntroState.currentTime = 0;
    routeIntroState.duration = 0;
    STATE.audio.overrideText = text;
    const title = $('#routeIntroTitle');
    if (title) {
      title.textContent = t('beforeStarting') + pickDual(routeMeta.name);
    }
    els.routeIntro.style.setProperty('--route-intro-color', routeMeta.color || '');
    els.routeIntro.hidden = false;
    startRouteIntroAudio(false);
  };

  // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
  // "cerrar el selector de rutas" ahora es simplemente volver al nivel
  // "filters" del menú (ver showAppMenuLevel más arriba) — ya no es un
  // dropdown flotante aparte que hubiera que ocultar/posicionar por su
  // cuenta. BORRAR este comentario si se retira el experimento.
  const closeRoutePicker = () => showAppMenuLevel('filters');
  const openRoutePicker = (routes) => {
    if (!els.routePicker) return;
    els.routePicker.innerHTML = routes.map((r) => `
      <button type="button" class="dropdown-option" data-route="${r.id}">
        <span class="dropdown-dot" style="background:${r.color}"></span>
        <span>${pickDual(r.name)}</span>
      </button>
    `).join('');
    $$('.dropdown-option', els.routePicker).forEach((btn) => {
      btn.addEventListener('click', () => { activateRoute(btn.dataset.route); closeAppMenu(); });
    });
    openAppMenu('routes');
  };

  const updateEssentialPillLabel = () => {
    const pill = els.filters && els.filters.querySelector('.pill[data-category="essential"]');
    if (!pill) return;
    const active = STATE.category === 'essential' && getCityRoutes().find((r) => r.id === STATE.activeRoute);
    pill.innerHTML = `<span class="pill-icon">${ROUTE_ICON_SVG()}</span><span>${
      active ? pickDual(active.name) : t('essentialFallback')
    }</span>`;
    pill.style.setProperty('--pill-color', (active && active.color) || getCssVar('--color-primary'));
  };

  // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo).
  // Cuarta vuelta de este menú: ya no hay un nivel "main" ni un icono único
  // que lo esconda todo — "Filtros" y "Capas" son botones siempre visibles
  // en .header-bottom (ver index.html), cada uno con su propio disparador
  // (#filtersToggleBtn/#layersBtn) que abre/cierra DIRECTAMENTE su nivel.
  // "routes" sigue siendo un nivel aparte (solo alcanzable desde dentro de
  // "filters", con su "‹" para volver ahí — ver data-menu-back). Abrir un
  // nivel cierra cualquier otro que estuviera abierto, para que Filtros y
  // Capas no compitan por sitio en la misma fila. Un commit de checkpoint
  // (rama experimento-patrocinios-demo) guarda la versión anterior de este
  // menú (icono único ">>") por si esta no convence. BORRAR este bloque si
  // se retira el experimento del todo.
  const APP_MENU_LEVEL_IDS = { filters: 'appMenuFilters', layers: 'appMenuLayers', routes: 'appMenuRoutes' };
  const APP_MENU_TRIGGERS = { filters: '#filtersToggleBtn', layers: '#layersBtn' };
  // Quinta vuelta: "routes" ya no comparte disparador propio, pero SÍ
  // comparte slot con "filters" (vive anidado dentro de Filtros, ver
  // index.html) — por eso apunta al mismo slot que "filters" en vez de
  // tener uno para sí mismo.
  const APP_MENU_SLOTS = { filters: 'filtersMenuSlot', routes: 'filtersMenuSlot', layers: 'layersMenuSlot' };
  const showAppMenuLevel = (level) => {
    Object.entries(APP_MENU_LEVEL_IDS).forEach(([key, id]) => {
      const el = $(`#${id}`);
      if (el) el.hidden = key !== level;
    });
  };
  const openAppMenuLevels = () => Object.entries(APP_MENU_LEVEL_IDS)
    .filter(([, id]) => !$(`#${id}`)?.hidden)
    .map(([key]) => key);
  const isAppMenuSlotOpen = (slotId) => !!$(`#${slotId}`)?.classList.contains('-open');
  const isAppMenuOpen = () => isAppMenuSlotOpen('filtersMenuSlot') || isAppMenuSlotOpen('layersMenuSlot');
  const closeAllAppMenuSlots = () => {
    $('#filtersMenuSlot')?.classList.remove('-open');
    $('#layersMenuSlot')?.classList.remove('-open');
  };
  // Abre el panel del nivel indicado en su propio slot, justo debajo de su
  // botón disparador (ver .app-menu-slot en el CSS) — cierra cualquier otro
  // slot abierto de paso, porque Filtros y Capas no pueden estar abiertos a
  // la vez (competirían por el mismo hueco vertical bajo Capas).
  const openAppMenu = (level) => {
    showAppMenuLevel(level);
    closeAllAppMenuSlots();
    $(`#${APP_MENU_SLOTS[level]}`)?.classList.add('-open');
    // "routes" cuenta como que Filtros sigue "abierto" para el aria-expanded
    // de su botón: es un nivel anidado dentro de Filtros, no uno propio.
    $(APP_MENU_TRIGGERS.filters)?.setAttribute('aria-expanded', String(APP_MENU_SLOTS[level] === 'filtersMenuSlot'));
    $(APP_MENU_TRIGGERS.layers)?.setAttribute('aria-expanded', String(APP_MENU_SLOTS[level] === 'layersMenuSlot'));
  };
  const closeAppMenu = () => {
    closeAllAppMenuSlots();
    Object.values(APP_MENU_TRIGGERS).forEach((sel) => $(sel)?.setAttribute('aria-expanded', 'false'));
  };
  // Alterna el nivel de un disparador de nivel superior (Filtros/Capas): si
  // su slot ya estaba abierto, cierra todo; si no, lo abre (y de paso
  // cierra cualquier otro slot que estuviera abierto).
  const toggleAppMenuLevel = (level) => {
    if (isAppMenuSlotOpen(APP_MENU_SLOTS[level])) closeAppMenu();
    else openAppMenu(level);
  };

  const buildHeader = () => {
    $$('.pill', els.filters).forEach((p) => {
      p.addEventListener('click', () => {
        if (p.dataset.category === 'essential') {
          const routes = getCityRoutes();
          if (routes.length > 1) {
            // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
            // ya no alterna abrir/cerrar el mismo dropdown flotante — esto
            // solo cambia de nivel dentro del menú (ver openRoutePicker),
            // así que siempre "entra" en la lista de rutas.
            openRoutePicker(routes);
            return;
          }
          activateRoute(routes[0].id);
          closeAppMenu();
          return;
        }
        STATE.category = p.dataset.category;
        updatePills();
        updateEssentialPillLabel();
        renderMarkers();
        if (STATE.activePoiId) {
          const poi = POIS.find((x) => x.id === STATE.activePoiId);
          const stillVisible = poi && (STATE.category === CATEGORIES.ALL || poi.category === STATE.category);
          if (!stillVisible) closeSheet();
          else setSelectedMarker(STATE.activePoiId);
        }
        // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
        // elegir un filtro simple cierra el menú entero.
        closeAppMenu();
      });
    });
    // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo).
    // "Filtros" y "Capas" son botones siempre visibles, cada uno alterna
    // DIRECTAMENTE su propio nivel (ver toggleAppMenuLevel más arriba).
    // data-menu-back (solo lo usa "Rutas recomendadas" por ahora) vuelve al
    // nivel que indique su propio atributo. BORRAR este bloque si se
    // retira el experimento.
    $('#filtersToggleBtn')?.addEventListener('click', () => toggleAppMenuLevel('filters'));
    $('#layersBtn')?.addEventListener('click', () => toggleAppMenuLevel('layers'));
    $$('[data-menu-back]').forEach((b) => {
      b.addEventListener('click', () => openAppMenu(b.dataset.menuBack || 'filters'));
    });
    $$('.mode-toggle-option').forEach((opt) => {
      opt.addEventListener('click', () => setStateMode(opt.dataset.mode));
    });
    // El idioma solo se elige en la pantalla de bienvenida (ver
    // wireOnboarding/obLangToggle) — no hay selector de idioma en la
    // cabecera de la app ya dentro de una ciudad.
    // Cierra los desplegables (circuitos, voz) al tocar fuera de ellos o de
    // su botón.
    document.addEventListener('click', (e) => {
      const scanMenu = $('#scanMenu'), scanBtn = $('#scanBtn');
      if (scanMenu && !scanMenu.hidden) {
        if (!scanMenu.contains(e.target) && !(scanBtn && scanBtn.contains(e.target))) {
          scanMenu.hidden = true;
          scanBtn?.setAttribute('aria-expanded', 'false');
        }
      }
      // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
      // cierra el menú (Filtros/Capas) al tocar fuera de sus dos slots y de
      // sus dos botones disparadores.
      if (isAppMenuOpen()) {
        const slots = [$('#filtersMenuSlot'), $('#layersMenuSlot')];
        const btns = [$(APP_MENU_TRIGGERS.filters), $(APP_MENU_TRIGGERS.layers)];
        const insideSlot = slots.some((s) => s && s.contains(e.target));
        const insideTrigger = btns.some((b) => b && b.contains(e.target));
        if (!insideSlot && !insideTrigger) closeAppMenu();
      }
    }, true);

    if (els.filters) {
      els.filters.addEventListener('scroll', updateFiltersScrollHint, { passive: true });
      // Detecta cambios de ancho del propio contenido (cambia de idioma/modo,
      // la píldora "Recomendaciones" cambia de texto, etc.) sin tener que
      // acordarse de llamar a esto a mano desde cada sitio que las toca.
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(updateFiltersScrollHint).observe(els.filters);
      }
      updateFiltersScrollHint();
    }
  };

  // Solo visible mientras quede contenido sin ver a la derecha: evita dejar
  // la flecha puesta cuando el usuario ya ha llegado al final de la lista.
  const updateFiltersScrollHint = () => {
    const filters = els.filters;
    const hint = $('#filtersMore');
    if (!filters || !hint) return;
    const hasMore = filters.scrollWidth - filters.scrollLeft - filters.clientWidth > 4;
    hint.classList.toggle('-visible', hasMore);
  };
  const updatePills = () => {
    $$('.pill', els.filters).forEach((p) => p.dataset.active = p.dataset.category === STATE.category ? 'true' : 'false');
    // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
    // puntito en el botón "Filtros" cuando hay uno puesto distinto de
    // "Todos" — con Filtros/Capas siempre visibles ya no hace tanta falta
    // como con el icono único de antes, pero se deja igual de útil.
    // BORRAR si se retira el experimento.
    $('#filtersToggleBtn')?.classList.toggle('-active', STATE.category !== CATEGORIES.ALL);
  };

  // Niveles del explorador (modo niño): umbrales de puntos pensados para
  // cuando haya preguntas en más lugares, no solo para este prototipo.
  const EXPLORER_LEVELS = [
    { id: 'principiante', min: 0,   label: { es: 'Principiante', en: 'Beginner' }, color: '#22C55E', img: 'assets/explorer/principiante.png' },
    { id: 'intermedio',   min: 200, label: { es: 'Intermedio', en: 'Intermediate' }, color: '#F5B942', img: 'assets/explorer/intermedio.png' },
    { id: 'avanzado',     min: 600, label: { es: 'Avanzado', en: 'Advanced' }, color: '#EF4444', img: 'assets/explorer/avanzado.png' }
  ];

  // Mochila de viaje (modo niño): objetos coleccionables que se reclaman a
  // mano (ver renderRewardChest/claimReward) gastando del saldo de estrellas
  // acumulado en STATE.game.points (ver STATE.game.claimedRewards). En orden
  // ascendente para que la mochila lea como una progresión natural de
  // "primeros pasos" a "expedición completa". Los umbrales están pensados
  // para solaparse con EXPLORER_LEVELS de arriba (0/200/600): los primeros
  // objetos caen en la etapa Principiante, los de en medio en Intermedio, y
  // los últimos exigen ya estar en Avanzado. Las tres insignias circulares
  // (a juego con los propios niveles) se colocan justo en esos umbrales
  // exactos, como eco visual de cada ascenso.
  //
  // Umbrales multiplicados x4 respecto a la versión anterior (0-250 → 0-
  // 1000): con el máximo real por ciudad (Peñíscola ~180, CDMX ~570, Berlín
  // ~890, Toledo ~1440, Madrid ~2430 puntos posibles en sus quizzes), la
  // mochila se vaciaba entera visitando una sola ciudad grande. Con el nuevo
  // techo en 1000, hace falta explorar a fondo una ciudad mediana/grande —o
  // combinar varias— para completarla.
  const REWARD_ITEMS = [
    { id: 'insignia-principiante', name: { es: 'Insignia de Principiante', en: 'Beginner Badge' }, points: 10, img: 'assets/rewards/insignia-principiante.png' },
    { id: 'brujula', name: { es: 'Brújula', en: 'Compass' }, points: 40, img: 'assets/rewards/brujula.png' },
    { id: 'mapa-tesoro', name: { es: 'Mapa del tesoro', en: 'Treasure map' }, points: 80, img: 'assets/rewards/mapa-tesoro.png' },
    { id: 'linterna', name: { es: 'Linterna', en: 'Flashlight' }, points: 160, img: 'assets/rewards/linterna.png' },
    { id: 'insignia-intermedio', name: { es: 'Insignia de Intermedio', en: 'Intermediate Badge' }, points: 200, img: 'assets/rewards/insignia-intermedio.png' },
    { id: 'cuerda', name: { es: 'Cuerda', en: 'Rope' }, points: 240, img: 'assets/rewards/cuerda.png' },
    { id: 'walkie-talkie', name: { es: 'Walkie-talkies', en: 'Walkie-talkies' }, points: 320, img: 'assets/rewards/walkie-talkie.png' },
    { id: 'botas', name: { es: 'Botas de explorador', en: "Explorer's boots" }, points: 400, img: 'assets/rewards/botas.png' },
    { id: 'chubasquero', name: { es: 'Chubasquero', en: 'Raincoat' }, points: 520, img: 'assets/rewards/chubasquero.png' },
    { id: 'insignia-avanzado', name: { es: 'Insignia de Avanzado', en: 'Advanced Badge' }, points: 600, img: 'assets/rewards/insignia-avanzado.png' },
    { id: 'hornillo', name: { es: 'Hornillo de campamento', en: 'Camping stove' }, points: 640, img: 'assets/rewards/hornillo.png' },
    { id: 'chaqueta', name: { es: 'Chaqueta de explorador', en: "Explorer's jacket" }, points: 800, img: 'assets/rewards/chaqueta.png' },
    { id: 'tienda', name: { es: 'Tienda de campaña', en: 'Camping tent' }, points: 1000, img: 'assets/rewards/tienda.png' }
  ];
  const getExplorerLevel = (points) =>
    [...EXPLORER_LEVELS].reverse().find((lv) => points >= lv.min) || EXPLORER_LEVELS[0];

  // Saldo gastable de la mochila: el total ganado (STATE.game.points, que
  // NUNCA baja, así el nivel de explorador de arriba no "retrocede" por
  // gastar) menos lo ya reclamado a mano (ver claimReward). Es justo lo que
  // el niño puede reclamar ahora mismo — la app ya no desbloquea objetos
  // solo por acumular puntos, hace falta tocar "Reclamar" (ver renderRewardChest).
  const rewardBalance = () => {
    const spent = STATE.game.claimedRewards.reduce((sum, id) => {
      const item = REWARD_ITEMS.find((r) => r.id === id);
      return sum + (item ? item.points : 0);
    }, 0);
    return Math.max(0, STATE.game.points - spent);
  };

  const claimReward = (item) => {
    if (STATE.game.claimedRewards.includes(item.id)) return;
    if (rewardBalance() < item.points) return;
    STATE.game.claimedRewards.push(item.id);
    saveState();
  };

  // Puntos ganados SOLO con quizzes de la ciudad activa (ver CURRENT_CITY/
  // POIS): recorre los quizzes de sus propios POIs y suma STATE.game.
  // pointsEarned (solo cuenta acierto, no basta con haber "visto" la
  // pregunta). Al usar POIS (que solo trae la ciudad cargada en cada
  // momento, ver loadCityData) no hace falta guardar un contador aparte por
  // ciudad ni preocuparse por ids de POI repetidos entre ciudades: cada
  // ciudad solo ve sus propios POIs.
  const cityPointsEarned = () => {
    if (!POIS || !POIS.length) return 0;
    let sum = 0;
    POIS.forEach((poi) => {
      if (!poi.quiz) return;
      Object.keys(poi.quiz).forEach((topicId) => {
        sum += STATE.game.pointsEarned[`${poi.id}:${topicId}`] || 0;
      });
    });
    return sum;
  };

  // Se llama tras cada pregunta de quiz respondida (ver answerKidsQuiz): si
  // la ciudad activa define badgeThreshold (ver data/core.js) y aún no
  // tiene su insignia, comprueba si ya se alcanzó y la desbloquea con un
  // aviso — se acierte o no la pregunta en curso, lo que cuenta es el total
  // acumulado de la ciudad, igual que el resto de la mochila.
  const checkCityBadge = () => {
    if (!CURRENT_CITY || !CURRENT_CITY.badgeThreshold) return;
    if (STATE.game.cityBadges.includes(CURRENT_CITY.id)) return;
    if (cityPointsEarned() < CURRENT_CITY.badgeThreshold) return;
    STATE.game.cityBadges.push(CURRENT_CITY.id);
    saveState();
    showToast(t('cityBadgeUnlocked').replace('{city}', CURRENT_CITY.name), 4000);
  };

  // Tanto los stickers del explorador como los de la mochila de viaje (ver
  // REWARD_ITEMS) se guardaron sin transparencia real: el "fondo a
  // cuadros" que se ve en el editor de imágenes quedó grabado como
  // píxeles opacos de verdad (negro/gris alternados), no como transparencia.
  // Sin editor de imagen disponible aquí, se recorta en el propio navegador
  // con un flood fill: partiendo de todo el borde exterior del lienzo, se
  // va "caminando" por píxeles vecinos mientras sean neutros (gris/negro/
  // blanco, poca diferencia entre R, G y B) —eso cubre tanto el cuadriculado
  // como el borde blanco del sticker— y se detiene en cuanto encuentra color
  // real del dibujo (piel, ropa, metal...), que sí tiene saturación. Se
  // cachea por URL para no repetir el procesado cada vez que hace falta el
  // mismo sprite (cambio de nivel, reabrir el cofre...).
  const explorerSpriteCache = {};
  const loadExplorerSprite = (src) => {
    if (explorerSpriteCache[src]) return explorerSpriteCache[src];
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const W = img.naturalWidth, H = img.naturalHeight;
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const ctx = off.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const frame = ctx.getImageData(0, 0, W, H);
        const d = frame.data;
        const idx = (x, y) => (y * W + x) * 4;

        // Si el PNG ya trae transparencia real de verdad (comprobado mirando
        // el borde: si ya hay píxeles con alpha bajo ahí, es que a esta
        // imagen ya se le quitó el fondo de otra forma, p.ej. a mano fuera
        // del navegador), el flood fill por color de abajo sobra y encima
        // hace daño: el objeto puede ser tan neutro en color como el propio
        // cuadriculado (una linterna gris metalizada, por ejemplo) y el
        // flood fill se comería el dibujo entero sin distinguirlo del
        // fondo, porque no mira el canal alfa, solo el color. Con el borde
        // ya transparente de antemano, se salta directo al recorte de abajo.
        let borderAlreadyTransparent = true;
        for (let x = 0; x < W && borderAlreadyTransparent; x++) {
          if (d[idx(x, 0) + 3] > 20 || d[idx(x, H - 1) + 3] > 20) borderAlreadyTransparent = false;
        }
        if (borderAlreadyTransparent) {
          for (let y = 0; y < H && borderAlreadyTransparent; y++) {
            if (d[idx(0, y) + 3] > 20 || d[idx(W - 1, y) + 3] > 20) borderAlreadyTransparent = false;
          }
        }

        if (!borderAlreadyTransparent) {
        const NEUTRAL_TOL = 26; // max(R,G,B) - min(R,G,B) por debajo de esto = "neutro"
        const WHITE_FLOOR = 200; // por encima de esto en el canal más oscuro = "blanco", no fondo
        const isNeutral = (i) => {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const minc = Math.min(r, g, b);
          // El borde blanco del propio sticker es tan neutro en color como el
          // cuadriculado (R≈G≈B en ambos), así que sin esta excepción el
          // flood fill se lo come igual que el fondo. El cuadriculado nunca
          // llega a blanco puro (sus dos tonos rondan negro y gris medio),
          // así que cortar aquí preserva el contorno blanco sin dejar de
          // quitar el fondo real.
          if (minc > WHITE_FLOOR) return false;
          return (Math.max(r, g, b) - minc) <= NEUTRAL_TOL;
        };
        const visited = new Uint8Array(W * H);
        const stack = [];
        for (let x = 0; x < W; x++) { stack.push(x, 0); stack.push(x, H - 1); }
        for (let y = 0; y < H; y++) { stack.push(0, y); stack.push(W - 1, y); }
        while (stack.length) {
          const y = stack.pop(), x = stack.pop();
          const p = y * W + x;
          if (visited[p]) continue;
          visited[p] = 1;
          const i = idx(x, y);
          if (!isNeutral(i)) continue;
          d[i + 3] = 0;
          // 8 direcciones (con diagonales), no solo 4: el cuadriculado
          // alterna blanco/gris en un patrón donde dos casillas del MISMO
          // tono solo se tocan en diagonal, nunca de lado. Como el blanco
          // queda excluido de isNeutral (para proteger el contorno blanco
          // de los propios stickers, ver comentario de arriba), un flood
          // fill de solo 4 direcciones no puede saltar de una casilla gris
          // a la siguiente gris sin "colarse" en diagonal — se quedaba
          // parte del cuadriculado sin limpiar en imágenes con el
          // cuadriculado más nítido/menos difuminado (caso real: la
          // insignia de Berlín).
          if (x > 0) stack.push(x - 1, y);
          if (x < W - 1) stack.push(x + 1, y);
          if (y > 0) stack.push(x, y - 1);
          if (y < H - 1) stack.push(x, y + 1);
          if (x > 0 && y > 0) stack.push(x - 1, y - 1);
          if (x < W - 1 && y > 0) stack.push(x + 1, y - 1);
          if (x > 0 && y < H - 1) stack.push(x - 1, y + 1);
          if (x < W - 1 && y < H - 1) stack.push(x + 1, y + 1);
        }

        // Segunda pasada: a veces una franja de casillas BLANCAS del propio
        // cuadriculado (no grises) queda pegada a una zona de color muy
        // saturado del dibujo (p.ej. la cinta roja/dorada de una medalla) —
        // esas casillas blancas superan WHITE_FLOOR a propósito (para no
        // comerse el contorno blanco de los stickers) y actúan de "muro":
        // el relleno de arriba nunca llega a las casillas de detrás, así
        // que sobrevive una isla de cuadriculado sin recortar (caso real:
        // la insignia de Berlín, con el cuadriculado nítido justo junto a
        // la cinta). Aquí se agrupan por conectividad todos los píxeles que
        // sobrevivieron, y cualquier grupo que sea ENTERAMENTE neutro (sin
        // ni un solo píxel con color de verdad, sea blanco o gris) se
        // considera fondo sobrante y se borra igual — el dibujo real de
        // cualquier sticker siempre tiene color saturado en algún punto,
        // así que esto nunca se come parte del sticker de verdad.
        const SAT_REAL = 30;
        const compVisited = new Uint8Array(W * H);
        for (let y0 = 0; y0 < H; y0++) {
          for (let x0 = 0; x0 < W; x0++) {
            const p0 = y0 * W + x0;
            if (compVisited[p0]) continue;
            const i0 = idx(x0, y0);
            if (d[i0 + 3] === 0) { compVisited[p0] = 1; continue; }
            const compStack = [[x0, y0]];
            const compPixels = [];
            compVisited[p0] = 1;
            let hasRealColor = false;
            while (compStack.length) {
              const [x, y] = compStack.pop();
              const i = idx(x, y);
              compPixels.push(i);
              const r = d[i], g = d[i + 1], b = d[i + 2];
              if (Math.max(r, g, b) - Math.min(r, g, b) > SAT_REAL) hasRealColor = true;
              const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]];
              for (const [nx, ny] of neighbors) {
                if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                const np = ny * W + nx;
                if (compVisited[np]) continue;
                const ni = idx(nx, ny);
                if (d[ni + 3] === 0) { compVisited[np] = 1; continue; }
                compVisited[np] = 1;
                compStack.push([nx, ny]);
              }
            }
            if (!hasRealColor) compPixels.forEach((i) => { d[i + 3] = 0; });
          }
        }
        } // fin if (!borderAlreadyTransparent)

        ctx.putImageData(frame, 0, 0);

        // El personaje queda perdido en medio de un lienzo enorme y
        // mayormente vacío (los 1024×1024 originales), así que se recorta
        // al rectángulo real donde hay contenido visible, para que al
        // escalarlo a un icono pequeño se vea grande y centrado en vez de
        // diminuto y descuadrado con el resto del badge.
        let minX = W, minY = H, maxX = -1, maxY = -1;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (d[idx(x, y) + 3] > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX || maxY < minY) { resolve(off); return; } // no se detectó contenido: se usa tal cual
        const cropW = maxX - minX + 1, cropH = maxY - minY + 1;
        // Red de seguridad: si lo que sobrevivió al flood fill es
        // sospechosamente pequeño (menos del 3% del lienzo), lo más
        // probable es que el dibujo fuera tan neutro en color como el
        // propio fondo (un objeto gris/metálico, por ejemplo) y el flood
        // fill se lo haya comido casi entero en vez de solo el fondo.
        // Mejor mostrar el icono original sin recortar el fondo que un
        // icono prácticamente invisible.
        if (cropW * cropH < W * H * 0.03) {
          const fresh = document.createElement('canvas');
          fresh.width = W;
          fresh.height = H;
          fresh.getContext('2d').drawImage(img, 0, 0);
          resolve(fresh);
          return;
        }
        const cropped = document.createElement('canvas');
        cropped.width = cropW;
        cropped.height = cropH;
        cropped.getContext('2d').drawImage(off, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        resolve(cropped);
      };
      img.onerror = reject;
      img.src = src;
    });
    explorerSpriteCache[src] = promise;
    return promise;
  };

  const updatePointsBadge = () => {
    const badge = $('#pointsBadge');
    if (!badge) return;
    const isKids = STATE.mode === 'kids';
    badge.hidden = !isKids;
    if (!isKids) return;
    const level = getExplorerLevel(STATE.game.points);
    badge.style.setProperty('--explorer-color', level.color);
    // El número mostrado es el saldo GASTABLE (puntos menos lo ya
    // reclamado en la mochila), no el total histórico: es lo que el niño
    // puede usar ahora mismo. El nivel de explorador, en cambio, sí usa el
    // total histórico (STATE.game.points), para que no "baje" de nivel por
    // gastar estrellas en la mochila.
    badge.textContent = `⭐ ${rewardBalance()} · ${pickLang(level.label)}`;
  };

  const updateExplorerBadge = () => {
    const wrap = $('#explorerBadge');
    if (!wrap) return;
    const isKids = STATE.mode === 'kids';
    wrap.hidden = !isKids;
    if (!isKids) return;
    const level = getExplorerLevel(STATE.game.points);
    const canvas = $('#explorerAvatar', wrap);
    if (canvas.dataset.levelId === level.id) return;
    canvas.dataset.levelId = level.id;
    canvas.setAttribute('aria-label', `${pickLang({ es: 'Explorador nivel', en: 'Explorer level' })} ${pickLang(level.label)}`);
    loadExplorerSprite(level.img).then((sprite) => {
      if (canvas.dataset.levelId !== level.id) return; // el nivel cambió mientras cargaba
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // El recorte ya no es cuadrado (el personaje es más alto que ancho),
      // así que se escala manteniendo proporción y se centra en el lienzo
      // en vez de estirarlo, para que quede alineado con el badge de al lado.
      const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
      const w = sprite.width * scale, h = sprite.height * scale;
      const dx = (canvas.width - w) / 2, dy = (canvas.height - h) / 2;
      ctx.drawImage(sprite, dx, dy, w, h);
    }).catch(() => {});
  };

  // Zoom de insignia: al tocar una medalla de la mochila, se ve grande en
  // un modal a pantalla completa (reutiliza el mismo sprite ya recortado
  // por loadExplorerSprite, cacheado por URL, así que no hay que volver a
  // procesar la imagen).
  const openBadgeZoom = (sprite, label, locked) => {
    const modal = $('#badgeZoomModal');
    if (!modal) return;
    const canvas = $('#badgeZoomCanvas');
    canvas.classList.toggle('-locked', !!locked);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
    const w = sprite.width * scale, h = sprite.height * scale;
    ctx.drawImage(sprite, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    $('#badgeZoomLabel').textContent = label;
    modal.classList.add('-open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeBadgeZoom = () => {
    const modal = $('#badgeZoomModal');
    modal?.classList.remove('-open');
    modal?.setAttribute('aria-hidden', 'true');
  };

  // Fila de insignias de ciudad (ver checkCityBadge/STATE.game.cityBadges):
  // una por cada ciudad definida en CITIES (data/core.js), a color si ya se
  // ganó y en gris si no. Se puede tocar para verla grande (ver
  // openBadgeZoom), pero no se reclama: se gana sola al llegar al umbral.
  const renderCityBadgeRow = () => {
    const row = $('#cityBadgeRow');
    if (!row) return;
    row.innerHTML = '';
    Object.values(CITIES).forEach((city) => {
      if (!city.badgeThreshold) return;
      const earned = STATE.game.cityBadges.includes(city.id);
      const card = document.createElement('div');
      card.className = 'city-badge-item' + (earned ? ' -earned' : ' -locked');
      const canvas = document.createElement('canvas');
      canvas.width = 72;
      canvas.height = 72;
      canvas.className = 'city-badge-item-icon';
      canvas.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'city-badge-item-label';
      label.textContent = city.name;
      card.appendChild(canvas);
      card.appendChild(label);
      card.setAttribute('aria-label', earned ? t('cityBadgeAriaEarned').replace('{city}', city.name) : t('cityBadgeAriaLocked').replace('{city}', city.name));
      row.appendChild(card);
      if (city.badgeImg) {
        const spritePromise = loadExplorerSprite(city.badgeImg);
        spritePromise.then((sprite) => {
          const ctx = canvas.getContext('2d');
          const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
          const w = sprite.width * scale, h = sprite.height * scale;
          ctx.drawImage(sprite, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        }).catch(() => {});
        card.addEventListener('click', () => {
          spritePromise.then((sprite) => {
            const label = earned ? t('cityBadgeLabelEarned').replace('{city}', city.name) : t('cityBadgeLabelLocked').replace('{city}', city.name);
            openBadgeZoom(sprite, label, !earned);
          }).catch(() => {});
        });
      }
    });
  };

  // Mochila de viaje: pinta un icono por objeto (ver REWARD_ITEMS). Ya no se
  // desbloquea solo por acumular puntos: hay tres estados — reclamado (ya es
  // tuyo), reclamable (el saldo ya llega, aparece el botón "Reclamar") y
  // bloqueado (todavía faltan estrellas). Se repinta entera cada vez que se
  // abre el modal en vez de mantener el DOM vivo entre aperturas: son pocos
  // objetos, y así no hay que preocuparse de sincronizar altas/bajas.
  // (Nombres internos "rewardChest"/"reward-chest-*" se mantienen tal
  // cual, aunque de cara al usuario ahora se llame "mochila de viaje".)
  const renderRewardChest = () => {
    const list = $('#rewardChestList');
    if (!list) return;
    list.innerHTML = '';
    const balance = rewardBalance();
    REWARD_ITEMS.forEach((item) => {
      const claimed = STATE.game.claimedRewards.includes(item.id);
      const claimable = !claimed && balance >= item.points;
      const state = claimed ? '-claimed' : (claimable ? '-claimable' : '-locked');
      const card = document.createElement('div');
      card.className = 'reward-item ' + state;
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      canvas.className = 'reward-item-icon';
      canvas.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'reward-item-label';
      const itemName = pickLang(item.name);
      label.textContent = claimed ? `✓ ${itemName}` : (claimable ? itemName : t('rewardMissing').replace('{n}', item.points - balance));
      card.appendChild(canvas);
      card.appendChild(label);
      if (claimable) {
        const claimBtn = document.createElement('button');
        claimBtn.type = 'button';
        claimBtn.className = 'reward-item-claim-btn';
        claimBtn.textContent = t('rewardClaim').replace('{points}', item.points);
        claimBtn.addEventListener('click', () => {
          claimReward(item);
          updatePointsBadge();
          renderRewardChest();
        });
        card.appendChild(claimBtn);
      }
      card.setAttribute('aria-label', claimed
        ? t('rewardAriaClaimed').replace('{name}', itemName)
        : (claimable ? t('rewardAriaClaimable').replace('{name}', itemName).replace('{points}', item.points) : t('rewardAriaLocked').replace('{name}', itemName).replace('{n}', item.points - balance)));
      list.appendChild(card);
      loadExplorerSprite(item.img).then((sprite) => {
        const ctx = canvas.getContext('2d');
        const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
        const w = sprite.width * scale, h = sprite.height * scale;
        const dx = (canvas.width - w) / 2, dy = (canvas.height - h) / 2;
        ctx.drawImage(sprite, dx, dy, w, h);
      }).catch(() => {});
    });
    renderCityBadgeRow();
  };

  const openRewardChest = () => {
    const modal = $('#rewardChestModal');
    if (!modal) return;
    renderRewardChest();
    modal.classList.add('-open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeRewardChest = () => {
    const modal = $('#rewardChestModal');
    modal?.classList.remove('-open');
    modal?.setAttribute('aria-hidden', 'true');
  };

  // Icono de la mochila (botón de cabecera + título del modal): mismo
  // sprite recortado, dibujado en dos canvas distintos. Solo hace falta
  // cargarlo una vez por sesión (loadExplorerSprite ya cachea por URL),
  // así que estas dos llamadas son baratas aunque se repitan.
  const BACKPACK_ICON_SRC = 'assets/rewards/mochila-icon.png';
  const renderBackpackIcons = () => {
    loadExplorerSprite(BACKPACK_ICON_SRC).then((sprite) => {
      [$('#rewardChestBtnIcon'), $('#rewardChestTitleIcon')].forEach((canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
        const w = sprite.width * scale, h = sprite.height * scale;
        ctx.drawImage(sprite, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      });
    }).catch(() => {});
  };

  /* =========================================================
   * TUTORIAL GUIADO (modo niño, primera vez): recorrido con un "foco"
   * (ver .tutorial-spotlight en CSS) que va iluminando, paso a paso, los
   * elementos clave para entender el juego — el propio Billy, el mapa,
   * las estrellas y la mochila —, con el resto de la pantalla oscurecida.
   * No es interactivo de verdad (no hace falta tocar el elemento
   * iluminado para avanzar): es solo un recorrido guiado con "Siguiente".
   * Se guarda en localStorage que ya se vio para no repetirlo cada vez
   * que un niño que ya juega vuelve a abrir la app; se puede repetir
   * siempre a mano tocando a Billy en la cabecera.
   * =======================================================*/
  const TUTORIAL_SEEN_KEY_KIDS = 'omot_tutorial_seen_v1';
  const TUTORIAL_SEEN_KEY_ADULT = 'omot_tutorial_adult_seen_v1';
  // Selector de "un pin cualquiera, nunca una burbuja de agrupación" (ver
  // el paso "Los puntos del mapa" en ADULT_TUTORIAL_STEPS, más abajo).
  // Declarado antes de los pasos porque uno de ellos ya lo referencia.
  const TUTORIAL_MAP_PIN_TARGET = '.custom-pin:not(.-cluster)';
  const KIDS_TUTORIAL_STEPS = [
    {
      target: '#explorerBadge',
      title: { es: '¡Hola, gran explorador! 🌟', en: 'Hi there, great explorer! 🌟' },
      text: { es: '¡Qué aventura nos espera! Vamos a ayudar a Billy a prepararse para su viaje. Escucha bien, que te cuento el secreto para conseguirlo.', en: "What an adventure awaits! Let's help Billy get ready for his trip. Listen closely, I'll tell you the secret to make it happen." }
    },
    {
      target: '#map',
      title: { es: 'Cada punto esconde un secreto 🗺️', en: 'Every point hides a secret 🗺️' },
      text: { es: 'Mira todos esos puntos brillantes del mapa: cada uno guarda una leyenda, un secreto... ¡y una pregunta para poner a prueba tu ingenio! Tócalos para descubrirlos.', en: 'Look at all those shiny dots on the map: each one holds a legend, a secret... and a question to test your wits! Tap them to discover them.' }
    },
    {
      target: '#pointsBadge',
      title: { es: '¡Responde bien y gana estrellas! ⭐', en: 'Answer right and earn stars! ⭐' },
      text: { es: 'Si aciertas la pregunta de un lugar, ganas estrellas. ¡Cuantos más secretos descubras, más estrellas brillarán aquí arriba!', en: 'If you answer a place\'s question correctly, you earn stars. The more secrets you discover, the more stars will shine up here!' }
    },
    {
      target: '#rewardChestBtn',
      title: { es: 'Canjea tus estrellas 🎒', en: 'Trade in your stars 🎒' },
      text: { es: 'Con esas estrellas puedes reclamar recompensas geniales para la mochila de Billy: una brújula, un mapa del tesoro ¡y muchas sorpresas más! ¿Le ayudamos a conseguirlas todas?', en: "With those stars you can claim awesome rewards for Billy's backpack: a compass, a treasure map, and lots more surprises! Shall we help him get them all?" }
    }
  ];
  // Versión para modo adultos: mismo motor (spotlight + tooltip + voz),
  // pasos y tono propios — sin Billy, sin estrellas/recompensas (no
  // existen en este modo), tono más sobrio acorde a "contenido experto y
  // riguroso". Recorre cada categoría de filtro una a una (no solo la
  // barra en conjunto) y cada herramienta del mapa por separado, y los
  // pasos marcados con demoSheet abren una ficha de ejemplo (ver
  // openTutorialDemoSheet) con el mismo aspecto que una real, para
  // explicar in situ las opciones de la guía IA sin depender de un POI
  // real ni de ninguna llamada de red.
  const ADULT_TUTORIAL_STEPS = [
    {
      target: '#brandIcon',
      title: { es: 'Bienvenido a OnMyOwnTrip', en: 'Welcome to OnMyOwnTrip' },
      text: { es: 'Una herramienta pensada para ayudarte a aprender más de cada sitio turístico a tu propio ritmo: historia verificada, curiosidades y una guía IA siempre disponible, todo narrado mientras caminas. Te cuento en unos segundos cómo sacarle el máximo partido.', en: "A tool designed to help you learn more about every tourist site at your own pace: verified history, curiosities and an AI guide always available, all narrated as you walk. I'll show you in a few seconds how to get the most out of it." }
    },
    {
      target: '#changeCityBtn',
      title: { es: 'Vuelve al inicio cuando quieras', en: 'Go back to the start whenever you like' },
      text: { es: 'Este botón te lleva al menú principal para cambiar de ciudad o de modo, adultos o niños. Tranquilo: tu progreso no se borra al volver.', en: "This button takes you to the main menu to change city or mode, Adults or Kids. Don't worry: your progress isn't erased when you go back." }
    },
    {
      target: '#filters',
      title: { es: 'La barra de filtros', en: 'The filter bar' },
      text: { es: 'Con estas pestañas filtras el mapa para ver solo lo que te interesa en cada momento. Repasemos cada opción:', en: "With these tabs you filter the map to see only what interests you at each moment. Let's go through each option:" }
    },
    {
      target: '.pill[data-category="all"]',
      title: { es: '«Todos»', en: '"All"' },
      text: { es: 'Muestra en el mapa todos los puntos de interés de la ciudad, sin ningún filtro aplicado.', en: "Shows every point of interest in the city on the map, with no filter applied." }
    },
    {
      target: '.pill[data-category="essential"]',
      title: { es: '«Recomendaciones»', en: '"Highlights"' },
      text: { es: 'Son rutas temáticas: agrupan varias paradas en un recorrido con un orden sugerido, para centrarte en un itinerario concreto en vez de explorar sin rumbo.', en: 'These are themed routes: they group several stops into a route with a suggested order, so you can focus on a specific itinerary instead of exploring aimlessly.' }
    },
    {
      target: '.pill[data-category="rincones-ocultos"]',
      title: { es: '«Interés»', en: '"Interest"' },
      text: { es: 'Rincones curiosos y menos conocidos: historias y detalles que se salen del recorrido turístico habitual.', en: 'Curious, lesser-known corners: stories and details that fall outside the usual tourist route.' }
    },
    {
      target: '.pill[data-category="historia"]',
      title: { es: '«Museos»', en: '"Museums"' },
      text: { es: 'Los monumentos, museos y edificios históricos más relevantes de la ciudad.', en: "The city's most important monuments, museums and historic buildings." }
    },
    {
      target: '.pill[data-category="gastronomia"]',
      title: { es: '«Restauración»', en: '"Food & Drink"' },
      text: { es: 'Recomendaciones gastronómicas: bares, restaurantes y sitios donde parar a comer, cerca de cada zona.', en: 'Food recommendations: bars, restaurants and places to stop for a bite, near each area.' }
    },
    {
      // Ilumina un único pin real (nunca una burbuja de agrupación, de ahí
      // el :not(.-cluster)) en vez de todo #map: si se iluminara el mapa
      // entero se vería exactamente igual que la interfaz normal ya
      // interactiva, y podría parecer que hay que tocar algo ahora mismo.
      target: TUTORIAL_MAP_PIN_TARGET,
      title: { es: 'Los puntos del mapa', en: 'The map markers' },
      text: { es: 'Cada marcador del mapa abre su historia, contexto y curiosidades, con la opción de escucharlo narrado en lugar de leerlo.', en: "Each map marker opens its history, context and curiosities, with the option to listen to it narrated instead of reading it." }
    },
    {
      target: '#bottomSheet',
      demoSheet: true,
      title: { es: 'Así es la ficha de cada punto', en: "This is what each place's card looks like" },
      text: { es: 'Título, resumen narrado con audioguía, y un historial de conversación con tu guía IA. Así quedaría, por ejemplo, tras preguntar por una curiosidad del lugar.', en: 'Title, a narrated summary with an audio guide, and a conversation history with your AI guide. This is what it would look like, for example, after asking about a curiosity of the place.' }
    },
    {
      target: '.ai-input-wrap',
      demoSheet: true,
      title: { es: 'Pregunta como prefieras', en: 'Ask however you prefer' },
      text: { es: 'Escribe tu duda, pulsa el micrófono para preguntarla en voz alta, o toca el icono de ondas para iniciar una llamada de voz completa con la guía.', en: 'Type your question, tap the microphone to ask it out loud, or tap the waves icon to start a full voice call with the guide.' }
    },
    {
      target: '#mapTools',
      title: { es: 'Herramientas del mapa', en: 'Map tools' },
      text: { es: 'Abajo a la derecha tienes accesos rápidos para identificar lugares, encontrar agua, encontrar aseos o ubicarte. Vamos una a una:', en: "Bottom right you'll find quick access to identify places, find water, find restrooms, or locate yourself. Let's go one by one:" }
    },
    {
      target: '#fountainsBtn',
      title: { es: 'Fuentes de agua potable', en: 'Drinking water fountains' },
      text: { es: 'Muestra en el mapa las fuentes más cercanas: útil para rellenar la botella mientras caminas.', en: 'Shows the nearest fountains on the map: handy for refilling your bottle as you walk.' }
    },
    {
      target: '#restroomsBtn',
      title: { es: 'Aseos públicos', en: 'Public restrooms' },
      text: { es: 'Muestra en el mapa los aseos públicos más cercanos, con precio y accesibilidad.', en: 'Shows the nearest public restrooms on the map, with price and accessibility.' }
    },
    {
      target: '#scanBtn',
      title: { es: 'Identifica lo que ves', en: 'Identify what you see' },
      text: { es: 'Apunta con la cámara a un monumento o edificio y la IA intentará identificarlo, aunque no sepas su nombre.', en: "Point the camera at a monument or building and the AI will try to identify it, even if you don't know its name." }
    },
    {
      target: '#locateBtn',
      title: { es: 'Tu ubicación', en: 'Your location' },
      text: { es: 'Centra el mapa en tu posición actual en cualquier momento, para no perder la orientación.', en: 'Centers the map on your current position at any time, so you never lose your bearings.' }
    }
  ];
  let tutorialSteps = KIDS_TUTORIAL_STEPS;
  let tutorialSeenKey = TUTORIAL_SEEN_KEY_KIDS;
  let tutorialStepIndex = 0;
  let tutorialResizeHandler = null;

  // Elementos grandes (mapa, ficha) que solo necesitan una esquina
  // redondeada discreta; el resto (pastillas, botones) son pequeños y se
  // iluminan casi como un círculo perfecto (ver fórmula más abajo).
  const TUTORIAL_BIG_RECT_TARGETS = new Set(['#map', '#bottomSheet']);

  // querySelector se quedaría con el primer pin en orden del DOM, que
  // puede caer pegado a un borde de la pantalla (medio tapado por la
  // cabecera o las herramientas del mapa). Se prefiere uno que quede
  // cómodamente dentro de una franja central y segura; si ninguno cumple,
  // se usa igualmente el primero antes que no iluminar nada.
  const pickTutorialMapPin = () => {
    const pins = Array.from(document.querySelectorAll(TUTORIAL_MAP_PIN_TARGET));
    if (!pins.length) return null;
    const safeTop = 100;
    const safeBottom = window.innerHeight - 180;
    const margin = 40;
    const inSafeBand = pins.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= safeTop && r.bottom <= safeBottom
        && r.left >= margin && r.right <= window.innerWidth - margin;
    });
    return inSafeBand || pins[0];
  };

  // Icono de "museo/monumento" genérico (mismo trazo que CATEGORY_META.historia
  // en data/core.js) sobre un fondo de color, para que la ficha de ejemplo del
  // tutorial tenga una miniatura real sin depender de ninguna imagen de red.
  const TUTORIAL_DEMO_THUMB_SRC = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">' +
    '<rect width="56" height="56" rx="14" fill="#B8411E"/>' +
    '<g transform="translate(14,15)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3 10 12 4l9 6"/><path d="M4 10v9M8 10v9M12 10v9M16 10v9M20 10v9"/><path d="M2 21h20"/>' +
    '</g></svg>'
  );

  // Rellena la ficha inferior con contenido de ejemplo (nunca con un POI
  // real ni con STATE.activePoiId, así no se dispara ninguna llamada a la
  // IA ni se toca el historial real de conversación) para que el paso
  // "pregunta a tu guía IA" del tutorial de adultos pueda mostrar la
  // interfaz real de una ficha ya rellena, en vez de solo describirla.
  let tutorialDemoSheetOpen = false;
  const fillTutorialDemoSheetContent = () => {
    if (!els.sheet) return;
    const thumb = $('.sheet-thumb', els.sheet);
    if (thumb) { thumb.src = TUTORIAL_DEMO_THUMB_SRC; thumb.alt = t('demoImgAlt'); }
    const badge = $('.sheet-cat-badge', els.sheet);
    if (badge) badge.textContent = t('demoBadge');
    const title = $('.sheet-title', els.sheet);
    if (title) title.textContent = t('demoTitle');
    const sub = $('.sheet-sub', els.sheet);
    if (sub) sub.textContent = t('demoSubtitle');
    const audioTitle = $('.audio-title', els.sheet);
    if (audioTitle) audioTitle.textContent = t('demoAudioTitle');
    const progressFill = $('.progress-fill', els.sheet);
    if (progressFill) progressFill.style.width = '40%';
    const audioTime = $('.audio-time', els.sheet);
    if (audioTime) audioTime.textContent = '1:10 / 2:45';

    const box = $('#aiMessages');
    if (box) {
      box.innerHTML = '';
      [
        { user: false, text: t('demoMsg1') },
        { user: true, text: t('demoMsg2') },
        { user: false, text: t('demoMsg3') }
      ].forEach((msg) => {
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg' + (msg.user ? ' -user' : '');
        const av = document.createElement('div');
        av.className = 'ai-msg-avatar';
        if (msg.user) {
          av.textContent = '👤';
        } else {
          av.classList.add('-plain');
          const icon = document.createElement('img');
          icon.className = 'ai-msg-avatar-icon';
          icon.src = 'assets/icons/ai.png';
          icon.alt = '';
          av.appendChild(icon);
        }
        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.textContent = msg.text;
        wrap.appendChild(av);
        wrap.appendChild(bubble);
        box.appendChild(wrap);
      });
    }
    const suggestBox = $('#aiSuggestions');
    if (suggestBox) {
      suggestBox.innerHTML = '';
      ['Profundiza más', 'Cuéntame una curiosidad', 'Entrada: horario y precio'].forEach((label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'suggest-chip';
        b.textContent = label;
        suggestBox.appendChild(b);
      });
    }
  };
  const openTutorialDemoSheet = () => {
    if (!els.sheet || !els.backdrop) return;
    fillTutorialDemoSheetContent();
    els.backdrop.classList.add('-open');
    els.sheet.classList.add('-open');
    try { els.sheet.setAttribute('aria-hidden', 'false'); } catch (_) {}
    tutorialDemoSheetOpen = true;
  };
  const closeTutorialDemoSheet = () => {
    if (!tutorialDemoSheetOpen) return;
    if (els.backdrop) els.backdrop.classList.remove('-open');
    if (els.sheet) {
      els.sheet.classList.remove('-open');
      try { els.sheet.setAttribute('aria-hidden', 'true'); } catch (_) {}
    }
    tutorialDemoSheetOpen = false;
  };

  const positionTutorialSpotlight = () => {
    const spotlight = $('#tutorialSpotlight');
    const tooltip = $('#tutorialTooltip');
    const step = tutorialSteps[tutorialStepIndex];
    if (!spotlight || !step) return;
    if (!step.target) {
      // Paso informativo sin ningún elemento que iluminar: un spotlight de
      // tamaño cero centrado sigue generando el oscurecido vía su
      // box-shadow, para no dejar la pantalla de golpe sin atenuar
      // mientras se lee.
      spotlight.style.opacity = '1';
      spotlight.style.top = '50%';
      spotlight.style.left = '50%';
      spotlight.style.width = '0px';
      spotlight.style.height = '0px';
      spotlight.style.borderRadius = '0px';
      spotlight.classList.remove('-highlighting');
      tooltip?.classList.remove('-top');
      return;
    }
    const target = step.target === TUTORIAL_MAP_PIN_TARGET ? pickTutorialMapPin() : $(step.target);
    if (!target) { spotlight.style.opacity = '0'; spotlight.classList.remove('-highlighting'); return; }
    spotlight.classList.add('-highlighting');
    // Las pastillas de filtro pueden estar fuera de la vista (la barra
    // hace scroll horizontal): tráela al centro antes de medir su rect.
    if (target.closest('#filters')) target.scrollIntoView({ inline: 'center', block: 'nearest' });
    const rect = target.getBoundingClientRect();
    const pad = 8;
    spotlight.style.opacity = '1';
    spotlight.style.top = `${rect.top - pad}px`;
    spotlight.style.left = `${rect.left - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;
    // El mapa y la ficha son rectángulos grandes: un radio pequeño basta.
    // El resto son pastillas/botones más redondos, así que se iluminan
    // casi como un círculo perfecto (mitad del lado más corto).
    spotlight.style.borderRadius = TUTORIAL_BIG_RECT_TARGETS.has(step.target)
      ? '18px' : `${Math.min(rect.width, rect.height) / 2 + pad}px`;
    // El tooltip vive anclado abajo por defecto (ver CSS), pero si el
    // objetivo iluminado está pegado a la parte baja de la pantalla (las
    // herramientas del mapa, la ficha de ejemplo…) se taparían mutuamente:
    // en ese caso se ancla arriba en su lugar.
    const spaceBelow = window.innerHeight - rect.bottom;
    tooltip?.classList.toggle('-top', spaceBelow < 200);
  };

  // Narra cada paso con el mismo motor SPEECH (Web Speech API) que ya usa
  // el audioguía, reutilizando el mecanismo de "texto puntual" (ver
  // overrideText/speakCallText) en vez de duplicar lógica de voces/ritmo.
  // stopTutorialSpeech() limpia overrideText a mano en vez de esperar al
  // callback de SPEECH.speak: un cancel() a mitad de frase dispara un
  // "canceled" que el propio motor traga a propósito (no llama al
  // callback), así que hay que soltar el texto puntual aquí mismo.
  const stopTutorialSpeech = () => {
    SPEECH.cancel();
    STATE.audio.overrideText = null;
  };
  const speakTutorialStep = (step) => {
    if (!SPEECH.isSupported()) return;
    STATE.audio.overrideText = `${pickLang(step.title)}. ${pickLang(step.text)}`;
    SPEECH.speak(() => { STATE.audio.overrideText = null; });
  };

  const showTutorialStep = (index) => {
    tutorialStepIndex = Math.max(0, Math.min(index, tutorialSteps.length - 1));
    const step = tutorialSteps[tutorialStepIndex];
    $('#tutorialTitle').textContent = pickLang(step.title);
    $('#tutorialText').textContent = pickLang(step.text);
    const isLast = tutorialStepIndex === tutorialSteps.length - 1;
    $('#tutorialNext').textContent = isLast ? t('tutorialGo') : t('tutorialNext');
    const backBtn = $('#tutorialBack');
    if (backBtn) backBtn.dataset.hidden = tutorialStepIndex === 0 ? 'true' : 'false';
    const dots = $('#tutorialDots');
    if (dots) {
      dots.innerHTML = '';
      tutorialSteps.forEach((_, i) => {
        const dot = document.createElement('span');
        if (i === tutorialStepIndex) dot.className = '-active';
        dots.appendChild(dot);
      });
    }
    // La ficha de ejemplo (pasos demoSheet) se abre/cierra según la
    // necesite el paso, con el mismo desplazamiento (0.38s) que una ficha
    // real: si acaba de abrirse, el spotlight espera a que termine de
    // entrar antes de medir su posición; si ya estaba abierta (dos pasos
    // seguidos dentro de ella) o no hace falta, se reposiciona al vuelo.
    const needsDemoSheet = !!step.demoSheet;
    if (needsDemoSheet && !tutorialDemoSheetOpen) {
      openTutorialDemoSheet();
      setTimeout(positionTutorialSpotlight, 420);
    } else {
      if (!needsDemoSheet && tutorialDemoSheetOpen) closeTutorialDemoSheet();
      // Reposicionar después del próximo frame: si el paso anterior venía
      // de abrir la app recién ahora, el layout (mapa, cabecera) puede no
      // estar del todo asentado todavía en este mismo tick.
      requestAnimationFrame(positionTutorialSpotlight);
    }
    stopTutorialSpeech();
    speakTutorialStep(step);
  };

  const closeTutorial = (markSeen = true) => {
    const overlay = $('#tutorialOverlay');
    overlay?.classList.remove('-open');
    if (overlay) overlay.hidden = true;
    stopTutorialSpeech();
    closeTutorialDemoSheet();
    if (markSeen) {
      try { localStorage.setItem(tutorialSeenKey, '1'); } catch (_) {}
    }
    if (tutorialResizeHandler) {
      window.removeEventListener('resize', tutorialResizeHandler);
      tutorialResizeHandler = null;
    }
    // Encadena la bienvenida a la ciudad justo después de cerrar el
    // tutorial general (ver maybeShowCityIntro más abajo): así, la
    // primerísima vez que se abre la app, el usuario ve primero cómo
    // funciona OnMyOwnTrip y justo después una bienvenida a la ciudad
    // concreta que eligió, nunca los dos overlays a la vez.
    maybeShowCityIntro();
  };

  const startTutorial = () => {
    const overlay = $('#tutorialOverlay');
    if (!overlay) return;
    // Elige el guion según el modo activo en este momento: mismo motor de
    // spotlight/tooltip/voz, pasos y clave de "ya visto" distintos.
    tutorialSteps = STATE.mode === 'kids' ? KIDS_TUTORIAL_STEPS : ADULT_TUTORIAL_STEPS;
    tutorialSeenKey = STATE.mode === 'kids' ? TUTORIAL_SEEN_KEY_KIDS : TUTORIAL_SEEN_KEY_ADULT;
    // Si se repite el tutorial con un audioguía real ya sonando, se corta
    // primero (stopAudio deja bien STATE.audio y su UI, no solo la voz)
    // para no solapar dos narraciones a la vez.
    if (STATE.audio.playing) stopAudio();
    overlay.hidden = false;
    // classList.add en el frame siguiente para que la transición de
    // opacidad (ver CSS) se dispare de verdad, en vez de empezar ya
    // visible por haber cambiado "hidden" y la clase en el mismo tick.
    requestAnimationFrame(() => overlay.classList.add('-open'));
    showTutorialStep(0);
    tutorialResizeHandler = () => positionTutorialSpotlight();
    window.addEventListener('resize', tutorialResizeHandler);
  };

  const maybeAutoStartTutorial = () => {
    const seenKey = STATE.mode === 'kids' ? TUTORIAL_SEEN_KEY_KIDS : TUTORIAL_SEEN_KEY_ADULT;
    let seen = false;
    try { seen = localStorage.getItem(seenKey) === '1'; } catch (_) {}
    if (!seen) startTutorial();
  };

  const wireTutorial = () => {
    $('#tutorialNext')?.addEventListener('click', () => {
      if (tutorialStepIndex >= tutorialSteps.length - 1) closeTutorial(true);
      else showTutorialStep(tutorialStepIndex + 1);
    });
    $('#tutorialBack')?.addEventListener('click', () => {
      if (tutorialStepIndex > 0) showTutorialStep(tutorialStepIndex - 1);
    });
    $('#tutorialSkip')?.addEventListener('click', () => closeTutorial(true));
    // Volver a ver el tutorial en cualquier momento: tocando a Billy en
    // modo niño, o el logo/icono de marca en modo adultos (no hay mascota
    // persistente en ese modo, así que el logo hace de "botón de ayuda").
    $('#explorerBadge')?.addEventListener('click', () => {
      if (STATE.mode === 'kids') startTutorial();
    });
    $('#brandIcon')?.addEventListener('click', () => {
      if (STATE.mode === 'adult') startTutorial();
    });
  };

  /* =========================================================
   * BIENVENIDA DE CIUDAD (una vez por ciudad — ver comentario en index.html
   * junto a #cityIntroModal). Distinta del tutorial de arriba: el tutorial
   * explica cómo se usa la app (una sola vez, por modo); esto presenta la
   * propia ciudad (una vez por ciudad, la primera vez que se entra en
   * ella), usando CITIES.<id>.welcomeIntro escrito a mano por ciudad.
   * =======================================================*/
  const CITY_INTRO_SEEN_KEY = 'omot_city_intro_seen_v1';

  const getCityIntroSeen = () => {
    try { return new Set(JSON.parse(localStorage.getItem(CITY_INTRO_SEEN_KEY) || '[]')); }
    catch (_) { return new Set(); }
  };

  const markCityIntroSeen = (cityId) => {
    const seen = getCityIntroSeen();
    seen.add(cityId);
    try { localStorage.setItem(CITY_INTRO_SEEN_KEY, JSON.stringify([...seen])); } catch (_) {}
  };

  const cityIntroModal = $('#cityIntroModal');

  // La narración de esta bienvenida NO puede reutilizar el <audio>
  // compartido de la ficha de POI (cloudAudioEl/startAudio, ver más abajo):
  // ese camino exige STATE.activePoiId, y esto se dispara ANTES de elegir
  // ningún POI. Se le da su propio <audio> independiente, pero con la
  // misma cadena de prioridad que el audioguía de cada sitio: audio ya
  // cacheado en la nube (CLOUD_TTS) > pedirlo ahora mismo si hay Worker
  // configurado > síntesis de voz local (Web Speech). Esta última no
  // existe en el WebView de Android empaquetado (no hay
  // window.speechSynthesis ahí, ver comentario en startAudio), pero sí en
  // navegador de escritorio/iOS, así que se deja como último recurso en
  // vez de dejar la bienvenida muda del todo en esos entornos.
  let cityIntroAudioEl = null;
  // Texto de la bienvenida actualmente mostrada (para poder reintentar la
  // reproducción manualmente, ver cityIntroIcon más abajo) y si ya llegó a
  // sonar de verdad. Muchos navegadores (Safari/Chrome fuera de la app
  // empaquetada, a diferencia del WebView de Capacitor en Android) bloquean
  // el autoplay con sonido cuando la llamada a .play() no ocurre de forma
  // síncrona dentro de un gesto del usuario — y aquí siempre hay un salto
  // asíncrono de por medio (pedir el audio a CLOUD_TTS antes de poder
  // reproducirlo). Si el intento automático de abajo no llega a sonar, se
  // deja el propio icono de la tarjeta como botón de "toca para escuchar":
  // un toque real SÍ es un gesto directo y esa reproducción nunca la bloquea
  // el navegador (y para entonces el audio ya suele estar cacheado, así que
  // ni siquiera hay que esperar a la red otra vez).
  let cityIntroActiveText = null;
  let cityIntroPlaybackStarted = false;
  let cityIntroTapHintTimer = null;
  // EXPERIMENTO (rama experimento-diseno-editorial): temporizador del
  // "beat" de ~2s con solo la foto de la ciudad antes de que aparezca la
  // tarjeta con el texto (ver maybeShowCityIntro).
  let cityIntroCardRevealTimer = null;

  const cityIntroIconEl = () => $('#cityIntroIcon');
  const cityIntroHintEl = () => $('#cityIntroHint');

  const showCityIntroTapHint = () => {
    const icon = cityIntroIconEl(), hint = cityIntroHintEl();
    if (icon) icon.classList.add('-tap');
    if (hint) hint.hidden = false;
  };

  const hideCityIntroTapHint = () => {
    const icon = cityIntroIconEl(), hint = cityIntroHintEl();
    if (icon) icon.classList.remove('-tap');
    if (hint) hint.hidden = true;
  };

  const markCityIntroPlaybackStarted = () => {
    cityIntroPlaybackStarted = true;
    clearTimeout(cityIntroTapHintTimer);
    hideCityIntroTapHint();
  };

  const stopCityIntroSpeech = () => {
    clearTimeout(cityIntroTapHintTimer);
    SPEECH.cancel();
    STATE.audio.overrideText = null;
    if (cityIntroAudioEl) {
      cityIntroAudioEl.onended = null;
      cityIntroAudioEl.onerror = null;
      cityIntroAudioEl.onplaying = null;
      cityIntroAudioEl.pause();
    }
  };

  // La síntesis de voz en la nube (Google Cloud TTS) lee los emoji en voz
  // alta letra por letra de su nombre Unicode (p.ej. 🌍 se escucha como
  // "globo terráqueo Europa-África") en vez de ignorarlos — a diferencia de
  // Web Speech, que ya se limpia sola dentro de SPEECH (ver
  // stripEmojiForSpeech más abajo en el archivo). Se limpia aquí también,
  // solo de cara al audio: el texto mostrado en la tarjeta conserva sus
  // emoji tal cual (ver maybeShowCityIntro).
  const stripEmojiForCityIntroSpeech = (text) => Array.from(text || '').filter((ch) => {
    const cp = ch.codePointAt(0);
    if (cp === 0xFE0F || cp === 0x200D || cp === 0x20E3) return false;
    if (cp >= 0x1F000 && cp <= 0x1FFFF) return false;
    if (cp >= 0x2600 && cp <= 0x27BF) return false;
    if (cp >= 0x2B00 && cp <= 0x2BFF) return false;
    return true;
  }).join('').replace(/\s+/g, ' ').trim();

  const speakCityIntroViaLocalSpeech = (text) => {
    if (!SPEECH.isSupported() || !text) return;
    STATE.audio.overrideText = text;
    SPEECH.speak(() => { STATE.audio.overrideText = null; });
    // Web Speech no avisa de forma fiable si de verdad llegó a sonar (mismo
    // problema de gesto que el <audio>, ver arriba), así que se comprueba a
    // los pocos ms: si el motor está hablando de verdad, se da por bueno.
    setTimeout(() => { if (SPEECH.isSpeaking()) markCityIntroPlaybackStarted(); }, 150);
  };

  const playCityIntroCloudUrl = (url, text) => {
    if (!cityIntroAudioEl) cityIntroAudioEl = new Audio();
    cityIntroAudioEl.onerror = () => speakCityIntroViaLocalSpeech(text);
    cityIntroAudioEl.onplaying = () => markCityIntroPlaybackStarted();
    cityIntroAudioEl.src = url;
    cityIntroAudioEl.currentTime = 0;
    const p = cityIntroAudioEl.play();
    if (p && p.catch) p.catch(() => speakCityIntroViaLocalSpeech(text));
  };

  const speakCityIntro = (text) => {
    if (!text) return;
    cityIntroActiveText = text;
    if (STATE.audio.playing) stopAudio();
    const speechText = stripEmojiForCityIntroSpeech(text);
    if (!speechText) return;
    const cachedUrl = CLOUD_TTS.getReadyUrl(speechText);
    if (cachedUrl) { playCityIntroCloudUrl(cachedUrl, speechText); return; }
    if (CLOUD_TTS.isConfigured()) {
      CLOUD_TTS.fetchAndCache(speechText).then((url) => {
        // Si para cuando llega el audio el usuario ya cerró la bienvenida
        // (skip/empezar), no hay nada que reproducir encima de lo que sea
        // que esté haciendo ahora.
        if (!cityIntroModal || !cityIntroModal.classList.contains('-open')) return;
        if (url) playCityIntroCloudUrl(url, speechText);
        else speakCityIntroViaLocalSpeech(speechText);
      });
      return;
    }
    speakCityIntroViaLocalSpeech(speechText);
  };

  // Reintento manual: se llama tanto al tocar el icono como, de forma
  // automática, si tras un momento el audio automático no llegó a sonar
  // (ver el setTimeout en maybeShowCityIntro). Al ser un toque real, esta
  // llamada a .play()/speak() nunca la bloquea el navegador.
  const retryCityIntroPlayback = () => {
    if (!cityIntroActiveText) return;
    hideCityIntroTapHint();
    speakCityIntro(cityIntroActiveText);
  };

  const closeCityIntro = (markSeen = true) => {
    if (!cityIntroModal) return;
    cityIntroModal.classList.remove('-open', '-card-visible');
    cityIntroModal.setAttribute('aria-hidden', 'true');
    clearTimeout(cityIntroCardRevealTimer);
    stopCityIntroSpeech();
    cityIntroActiveText = null;
    if (markSeen && CURRENT_CITY) markCityIntroSeen(CURRENT_CITY.id);
  };

  // Se llama tras cargar una ciudad (ver startApp) y también desde
  // closeTutorial: en la primerísima vez que se abre la app, si el
  // tutorial general va a arrancar, esta función se queda quieta (para no
  // tapar un overlay con otro) y es closeTutorial quien vuelve a llamarla
  // en cuanto el tutorial se cierra — así el orden siempre es "tutorial de
  // la app" → "bienvenida a la ciudad", nunca al revés ni solapados.
  const maybeShowCityIntro = () => {
    if (!cityIntroModal || !CURRENT_CITY || !CURRENT_CITY.welcomeIntro) return;
    const tutorialOverlay = $('#tutorialOverlay');
    if (tutorialOverlay && !tutorialOverlay.hidden) return;
    if (getCityIntroSeen().has(CURRENT_CITY.id)) return;
    const text = pickDual(CURRENT_CITY.welcomeIntro);
    if (!text) return;
    const textEl = $('#cityIntroText');
    const skipBtn = $('#cityIntroSkip');
    const startBtn = $('#cityIntroStart');
    if (textEl) textEl.textContent = text;
    if (skipBtn) skipBtn.textContent = t('cityIntroSkip');
    if (startBtn) startBtn.textContent = t('cityIntroStart');
    // EXPERIMENTO (rama experimento-diseno-editorial): fondo del modal con
    // una foto real de la ciudad en vez del negro liso de siempre. Prioriza
    // CURRENT_CITY.heroImage, curada a mano por ciudad (el primer punto de
    // la ruta por "order" no siempre es el más fotogénico ni representativo
    // -- en Peñíscola era la playa en vez del castillo). Si una ciudad no
    // trae heroImage (dato suelto sin curar todavía), cae al primer POI con
    // foto de su ruta "main"; si de verdad no hay ninguna, se queda sin
    // --city-intro-photo y el CSS usa su color de respaldo (ver
    // .city-intro-modal).
    const heroImage = CURRENT_CITY.heroImage
      || (POIS.filter((p) => p.essential && p.essential.route === 'main' && p.image)
        .sort((a, b) => a.essential.order - b.essential.order)[0] || {}).image
      || (POIS.find((p) => p.image) || {}).image;
    if (heroImage) {
      cityIntroModal.style.setProperty('--city-intro-photo', `url('${heroImage}')`);
    } else {
      cityIntroModal.style.removeProperty('--city-intro-photo');
    }
    cityIntroPlaybackStarted = false;
    hideCityIntroTapHint();
    cityIntroModal.classList.remove('-card-visible');
    cityIntroModal.classList.add('-open');
    cityIntroModal.setAttribute('aria-hidden', 'false');
    // EXPERIMENTO (rama experimento-diseno-editorial, para todas las
    // ciudades e idiomas): el modal se abre ya con la foto visible pero la
    // tarjeta (texto, botones) se queda invisible ~2s (ver .city-intro-card
    // en el CSS) -- un momento para apreciar la foto de la ciudad antes de
    // que aparezca la intro encima. La voz y el aviso de "toca para
    // escuchar" también esperan a este mismo instante, para que no empiecen
    // a sonar/mostrarse mientras la tarjeta todavía no se ve.
    clearTimeout(cityIntroCardRevealTimer);
    cityIntroCardRevealTimer = setTimeout(() => {
      if (!cityIntroModal.classList.contains('-open')) return;
      cityIntroModal.classList.add('-card-visible');
      speakCityIntro(text);
      // Si en 3s el audio automático no ha llegado a sonar de verdad (caso
      // típico: navegador bloqueando el autoplay fuera de la app
      // empaquetada), se muestra el icono como botón de "toca para
      // escuchar" en vez de dejar la bienvenida muda sin que el usuario
      // sepa por qué.
      clearTimeout(cityIntroTapHintTimer);
      cityIntroTapHintTimer = setTimeout(() => {
        if (!cityIntroPlaybackStarted && cityIntroModal.classList.contains('-open')) showCityIntroTapHint();
      }, 3000);
    }, 2000);
  };

  const wireCityIntro = () => {
    $('#cityIntroSkip')?.addEventListener('click', () => closeCityIntro(true));
    $('#cityIntroStart')?.addEventListener('click', () => closeCityIntro(true));
    $('#cityIntroIcon')?.addEventListener('click', () => retryCityIntroPlayback());
  };

  const setStateMode = (mode) => {
    STATE.mode = mode === 'kids' ? 'kids' : 'adult';
    document.documentElement.dataset.mode = STATE.mode;
    document.documentElement.dataset.lang = STATE.lang;
    const isKids = STATE.mode === 'kids';
    // iOS: color de la barra superior según el modo
    try {
      const metaTheme = document.getElementById('metaThemeColor');
      if (metaTheme) metaTheme.setAttribute('content', isKids ? '#12102b' : '#0F172A');
    } catch (_) {}
    $$('.mode-toggle-option').forEach((o) => o.dataset.active = o.dataset.mode === STATE.mode ? 'true' : 'false');
    // Textos fijos del HTML que no se re-renderizan solos (atributos, no
    // contenido de un template): hay que empujarlos a mano en cada cambio
    // de idioma o de modo.
    const aiInputEl = $('#aiInput');
    if (aiInputEl) { aiInputEl.placeholder = t('askPlaceholder'); aiInputEl.setAttribute('aria-label', t('askAriaLabel')); }
    const aiCallInputEl = $('#aiCallInput');
    if (aiCallInputEl) { aiCallInputEl.placeholder = t('askPlaceholder'); aiCallInputEl.setAttribute('aria-label', t('askPlaceholder')); }
    const changeCityBtnEl = $('#changeCityBtn');
    if (changeCityBtnEl) { changeCityBtnEl.setAttribute('aria-label', t('backToMenu')); changeCityBtnEl.setAttribute('title', t('backToMenu')); }
    const changeCityLabelEl = $('#changeCityLabel');
    if (changeCityLabelEl) changeCityLabelEl.textContent = t('menuHomeLabel');
    const filtersToggleBtnEl = $('#filtersToggleBtn');
    if (filtersToggleBtnEl) filtersToggleBtnEl.setAttribute('aria-label', t('menuFiltersLabel'));
    const filtersToggleLabelEl = $('#filtersToggleLabel');
    if (filtersToggleLabelEl) filtersToggleLabelEl.textContent = t('menuFiltersLabel');
    const layersBtnEl = $('#layersBtn');
    if (layersBtnEl) layersBtnEl.setAttribute('aria-label', t('menuLayersLabel'));
    const layersLabelEl = $('#layersLabel');
    if (layersLabelEl) layersLabelEl.textContent = t('menuLayersLabel');
    const tutSkipEl = $('#tutorialSkip');
    if (tutSkipEl) tutSkipEl.textContent = t('tutorialSkip');
    const tutBackEl = $('#tutorialBack');
    if (tutBackEl) { tutBackEl.setAttribute('aria-label', t('tutorialBackAria')); tutBackEl.textContent = t('tutorialBack'); }
    const resetTitleEl = $('#resetConfirmTitle');
    if (resetTitleEl) resetTitleEl.textContent = t('resetConfirmTitle');
    const resetTextEl = $('#resetConfirmText');
    if (resetTextEl) resetTextEl.textContent = t('resetConfirmText');
    const resetCancelEl = $('#resetConfirmCancel');
    if (resetCancelEl) resetCancelEl.textContent = t('resetConfirmCancel');
    const resetOkEl = $('#resetConfirmOk');
    if (resetOkEl) resetOkEl.textContent = t('resetConfirmOk');
    const dirTitleEl = $('#directionsConfirmTitle');
    if (dirTitleEl) dirTitleEl.textContent = t('directionsConfirmTitle');
    const dirTextEl = $('#directionsConfirmText');
    if (dirTextEl) dirTextEl.textContent = t('directionsConfirmText');
    const dirCancelEl = $('#directionsConfirmCancel');
    if (dirCancelEl) dirCancelEl.textContent = t('directionsConfirmCancel');
    const dirOkEl = $('#directionsConfirmOk');
    if (dirOkEl) dirOkEl.textContent = t('directionsConfirmOk');
    const sheetDirLabelEl = $('#sheetDirectionsLabel');
    if (sheetDirLabelEl) sheetDirLabelEl.textContent = t('sheetDirectionsLabel');
    const scanLogTitleEl = $('#scanLogTitle');
    if (scanLogTitleEl) scanLogTitleEl.textContent = t('scanLogTitle');
    const scanLogHintEl = $('#scanLogHint');
    if (scanLogHintEl) scanLogHintEl.textContent = t('scanLogHint');
    const scanLogExportEl = $('#scanLogExport');
    if (scanLogExportEl) scanLogExportEl.textContent = t('scanLogExport');
    const scanLogClearEl = $('#scanLogClear');
    if (scanLogClearEl) scanLogClearEl.textContent = t('scanLogClear');
    const chestTitleEl = $('#rewardChestTitle');
    if (chestTitleEl) chestTitleEl.textContent = t('rewardChestTitle');
    const chestHintEl = $('#rewardChestHint');
    if (chestHintEl) chestHintEl.textContent = t('rewardChestHint');
    const scanTakeLabelEl = $('#scanTakePhotoLabel');
    if (scanTakeLabelEl) scanTakeLabelEl.textContent = t('scanTakePhoto');
    const scanUploadLabelEl = $('#scanUploadPhotoLabel');
    if (scanUploadLabelEl) scanUploadLabelEl.textContent = t('scanUploadPhoto');
    const modeAdultLabelEl = $('#modeToggleAdultLabel');
    if (modeAdultLabelEl) modeAdultLabelEl.textContent = t('modeToggleAdult');
    const modeKidsLabelEl = $('#modeToggleKidsLabel');
    if (modeKidsLabelEl) modeKidsLabelEl.textContent = t('modeToggleKids');
    const aiCallEndEl = $('#aiCallEnd');
    if (aiCallEndEl) aiCallEndEl.textContent = t('callHangup');
    const lightboxRetryLabelEl = $('#lightboxRetryLabel');
    if (lightboxRetryLabelEl) lightboxRetryLabelEl.textContent = t('lightboxRetryLabel');
    // Aria-labels y otros atributos estáticos (invisibles para un usuario
    // vidente, pero igual de importantes para lectores de pantalla).
    [
      ['#filters', 'aria-label', 'ariaFilters'],
      ['.mode-toggle', 'aria-label', 'ariaModeToggleGroup'],
      ['#routeIntroPlay', 'aria-label', 'ariaRouteIntroPlay'],
      ['#routeIntroClose', 'aria-label', 'ariaRouteIntroClose'],
      ['#mapTools', 'aria-label', 'ariaMapTools'],
      ['#fountainsBtn', 'aria-label', 'ariaFountains'],
      ['#restroomsBtn', 'aria-label', 'ariaRestrooms'],
      ['#scanBtn', 'aria-label', 'ariaScan'],
      ['#locateBtn', 'aria-label', 'ariaLocate'],
      ['#bottomSheet', 'aria-label', 'ariaSheet'],
      ['#sheetCloseBtn', 'aria-label', 'ariaSheetClose'],
      ['#sheetDirectionsBtn', 'aria-label', 'ariaSheetDirections'],
      ['.sheet-thumb-retry', 'aria-label', 'ariaImageRetry'],
      ['.audio-player', 'aria-label', 'ariaAudioPlayer'],
      ['.audio-progress', 'aria-label', 'ariaAudioProgressGroup'],
      ['.progress-wrap', 'aria-label', 'ariaProgressBar'],
      ['#aiMessages', 'aria-label', 'ariaAiMessages'],
      ['#aiMic', 'aria-label', 'ariaAiMic'],
      ['#aiSend', 'aria-label', 'ariaAiSend'],
      ['#aiCallBtn', 'aria-label', 'ariaAiCallOpen'],
      ['#aiCallModal', 'aria-label', 'ariaAiCallModal'],
      ['#aiCallClose', 'aria-label', 'ariaAiCallClose'],
      ['#aiCallSend', 'aria-label', 'ariaAiCallSend'],
      ['#cameraModal', 'aria-label', 'ariaCameraModal'],
      ['#cameraCloseBtn', 'aria-label', 'ariaCameraClose'],
      ['#cameraZoomOutBtn', 'aria-label', 'ariaZoomOut'],
      ['#cameraZoomInBtn', 'aria-label', 'ariaZoomIn'],
      ['#cameraShutterBtn', 'aria-label', 'ariaShutter'],
      ['#imageLightbox', 'aria-label', 'ariaImageLightbox'],
      ['#lightboxCloseBtn', 'aria-label', 'ariaLightboxClose'],
      ['.lightbox-retry', 'aria-label', 'ariaImageRetry'],
      ['#visitSummaryModal', 'aria-label', 'ariaVisitSummaryModal'],
      ['#visitSummaryCloseBtn', 'aria-label', 'ariaVisitSummaryClose']
    ].forEach(([sel, attr, key]) => {
      const el = $(sel);
      if (el) el.setAttribute(attr, t(key));
    });
    const brandIcon = $('#brandIcon'), brandTitle = $('#brandTitle'), brandSub = $('#brandSub'), brandBadge = $('#brandBadge');
    if (brandIcon) brandIcon.textContent = isKids ? '🚀' : '🧭';
    if (brandTitle) brandTitle.textContent = isKids ? 'OnMyOwnTrip Kids' : 'OnMyOwnTrip';
    const cityName = CURRENT_CITY ? CURRENT_CITY.name : 'Toledo';
    if (brandSub) brandSub.textContent = isKids ? t('brandSubKids') : t('brandSubAdult').replace('{city}', cityName);
    if (brandBadge) brandBadge.textContent = isKids ? t('brandBadgeKids') : t('brandBadgeAdult');
    if (CURRENT_CITY) {
      const citySubtitle = pickDual(CURRENT_CITY.subtitle);
      document.title = `OnMyOwnTrip · ${cityName}`;
      const metaDescription = document.getElementById('metaDescription');
      if (metaDescription) {
        metaDescription.setAttribute('content', `OnMyOwnTrip · Turismo autoguiado interactivo por ${cityName}, ${citySubtitle}. Modo Adultos y Niños.`);
      }
    }
    updatePointsBadge();
    updateExplorerBadge();
    const chestBtn = $('#rewardChestBtn');
    if (chestBtn) chestBtn.hidden = !isKids;
    if (isKids) renderBackpackIcons();
    $$('.pill').forEach((p) => {
      const cat = p.dataset.category;
      if (cat === CATEGORIES.ALL) {
        // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
        // se le añade un icono (antes no llevaba) para que quede igual que
        // el resto de filas del menú Filtros — todas con icono + texto.
        p.innerHTML = `<span class="pill-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span><span>${t('allPill')}</span>`;
      } else if (cat === 'essential') {
        updateEssentialPillLabel();
      } else {
        const meta = CATEGORY_META[cat];
        if (meta) {
          // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" (rama experimento-patrocinios-demo):
          // ya no hace falta partir "Puntos de interés" en dos líneas (era
          // para que cupiera en una píldora estrecha) — ahora el menú
          // Filtros es una lista de filas anchas con icono + texto.
          p.innerHTML = `<span class="pill-icon">${categoryIconSvg(cat)}</span><span>${pickDual(meta.label)}</span>`;
        }
        p.style.setProperty('--pill-color', getCategoryPinColor(cat));
      }
      p.dataset.active = cat === STATE.category ? 'true' : 'false';
    });
    if (STATE.activePoiId) {
      populateSheetContent(STATE.activePoiId);
      ensureAiPanelInitialGreet(POIS.find((p) => p.id === STATE.activePoiId));
      renderAiSuggestions();
    }
    saveState();
  };

  // Cambia el idioma del CONTENIDO (ver pickLang/pickDual) — no reinicia
  // conversación ni progreso, solo refresca lo que ya está en pantalla.
  // Reutiliza setStateMode con el modo actual sin cambios: ya hace todo el
  // refresco de textos que dependen de pickDual (pills, ficha activa,
  // subtítulo de ciudad), así que no hace falta duplicar esa lógica aquí.
  const setStateLang = (lang) => {
    STATE.lang = lang === 'en' ? 'en' : 'es';
    setStateMode(STATE.mode);
  };

  /* =========================================================
   * AI GUIDE
   * =======================================================*/
  const aiHistoryFor = (poiId) => {
    if (!STATE.ai.perPoiHistory[poiId]) STATE.ai.perPoiHistory[poiId] = [];
    return STATE.ai.perPoiHistory[poiId];
  };

  // Arma el resumen inicial completo de un POI: nombre, subtítulo e
  // historia entera, un dato curioso (leyenda), un apunte de arquitectura,
  // si se puede visitar o no, y cómo seguir explorando. Ya NO depende de
  // la IA — usa contenido propio del POI, escrito y verificado igual que
  // el resto de tabs — así que el resumen inicial funciona sin conexión,
  // siempre igual de rápido y sin gastar cuota. La IA se reserva para
  // "Profundiza más" y las preguntas sueltas (ver queueAiMessage), que sí
  // necesitan generar algo que no está ya guardado.
  //
  // Un único texto para todo (nada de dividirlo en un "adelanto" hablado
  // aparte y un "resto" mostrado en pantalla): lo que se narra en voz alta
  // debe ser exactamente lo que aparece en la burbuja del chat, ni una
  // palabra de más ni de menos.
  // Frase corta de bienvenida (nombre + subtítulo ya escrito de cada POI):
  // la intro completa de abajo la reutiliza tal cual como primera frase, así
  // que se queda "pura" — el aviso de "abajo tienes opciones" (ver
  // buildOpeningGreeting) no pinta nada ahí en medio de la audioguía larga.
  const buildPreviewText = (poi, mode) => {
    const name = pickLang(poi.name).adult;
    // "teaser" (si el POI ya lo tiene escrito) es una frase algo más rica
    // que el subtitle — pensada para que la persona decida si quiere
    // visitarlo, no solo una etiqueta — pero solo en modo Adultos: en niño
    // se sigue usando el subtitle de siempre, más corto y directo.
    const body = (mode !== 'kids' && poi.teaser) ? pickDual(poi.teaser) : pickDual(poi.subtitle);
    if (STATE.lang === 'en') {
      return mode === 'kids' ? `Hi! You're at ${name}. ${body}` : `Welcome to ${name}. ${body}`;
    }
    return mode === 'kids' ? `¡Hola! Estás en ${name}. ${body}` : `Bienvenido a ${name}. ${body}`;
  };

  // Lo que se dice de verdad al abrir la ficha en modo Adultos (ver
  // ensureAiPanelInitialGreet): la frase corta de arriba + un empujón hacia
  // el botón de arriba y los chips de debajo, para que no haga falta
  // adivinar qué hacen.
  // EXPERIMENTO (rama experimento-diseno-editorial): "Llévame" ya no está
  // "abajo" -- se mudó a la cabecera (ver .sheet-directions-btn) -- así que
  // este aviso tenía que dejar de decir que cómo llegar está entre las
  // opciones de abajo.
  const buildOpeningGreeting = (poi, mode) => {
    const guide = STATE.lang === 'en'
      ? "\n\nUp top you'll find the \"Take me\" button to get you here, and below you can listen to the site's full information with the Introduction button."
      : '\n\nArriba tienes el botón "Llévame" para llegar hasta aquí, y abajo puedes ir escuchando toda la información del sitio en el botón Introducción.';
    return buildPreviewText(poi, mode) + guide;
  };

  // includeOpener: false cuando la llama showFullIntro en modo Adultos — el
  // chip "Introducción" solo existe ahí, y para cuando el usuario llega a
  // pulsarlo ya vio la frase corta de bienvenida como primer mensaje del
  // chat (ver ensureAiPanelInitialGreet). Repetirla aquí sonaba como si la
  // app se presentara dos veces seguidas. En modo Niños sigue en true: ahí
  // esta es la ÚNICA llamada (no hay chip de Introducción separado), así
  // que la frase de bienvenida tiene que decirse en algún punto.
  // Evita que dos fragmentos se lean pegados como si fueran la misma frase
  // si el anterior no termina en un signo de puntuación — p.ej. una
  // respuesta de IA truncada a mitad de frase (ver identifyPoi/max_tokens):
  // bug real reportado en pruebas de usuario, 2026-09-07 ("...orilla del Si
  // quieres profundizar..."). El contenido curado a mano de las ciudades ya
  // termina siempre en punto, así que esto no cambia nada ahí — es solo una
  // red de seguridad para texto inesperado (fichas efímeras de "¿qué estoy
  // viendo?", o cualquier futura fuente de contenido no curada a mano).
  const ensureSentenceEnd = (text) => {
    const trimmed = (text || '').trimEnd();
    if (!trimmed) return trimmed;
    return /[.!?…"'”)]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  };

  const buildIntroText = (poi, mode, includeOpener = true) => {
    const isEn = STATE.lang === 'en';
    const historyFull = ensureSentenceEnd(pickDual(poi.tabs.history) || '');
    const legends = poi.tabs.legends ? ensureSentenceEnd(pickDual(poi.tabs.legends)) : '';
    const architecture = poi.tabs.architecture ? ensureSentenceEnd(pickDual(poi.tabs.architecture)) : '';

    const opener = includeOpener ? buildPreviewText(poi, mode) : '';
    const legendBridge = legends
      ? (isEn
        ? (mode === 'kids' ? ` Here's a fun fact: ${legends}` : ` A curious fact: ${legends}`)
        : (mode === 'kids' ? ` Aquí va un dato curioso: ${legends}` : ` Un dato curioso: ${legends}`))
      : '';
    const archBridge = architecture
      ? (isEn
        ? (mode === 'kids' ? ` And on the outside, take a look: ${architecture}` : ` As for its architecture: ${architecture}`)
        : (mode === 'kids' ? ` Y por fuera, fíjate: ${architecture}` : ` En cuanto a su arquitectura: ${architecture}`))
      : '';

    // "Visitable o no": se deduce del propio texto de horario/precio ya
    // escrito para cada POI (poi.visitInfo), en vez de añadir un campo de
    // datos nuevo — un espacio "de acceso libre, sin horario" (una plaza,
    // una calle) se trata distinto de uno con horario y entrada (un museo,
    // un palacio). El patrón que detecta "gratis" cambia con el idioma
    // porque busca dentro del propio texto ya traducido de visitInfo.
    let visitLine = '';
    if (poi.visitInfo) {
      const priceText = pickDual(poi.visitInfo.price) || '';
      const hoursText = pickDual(poi.visitInfo.hours) || '';
      const freeAccess = isEn
        ? /free|no ticket|open access/i.test(`${priceText} ${hoursText}`)
        : /gratis|acceso libre|sin horario/i.test(`${priceText} ${hoursText}`);
      if (isEn) {
        visitLine = mode === 'kids'
          ? (freeAccess ? " You can see it whenever you want, it's open access!" : ' You can go inside, though it has set hours.')
          : (freeAccess ? " It's an open-access site: you can visit it whenever you like." : ' You can visit the inside, with set hours and a ticket.');
      } else {
        visitLine = mode === 'kids'
          ? (freeAccess ? ' ¡Puedes verlo cuando quieras, es de acceso libre!' : ' Se puede entrar, aunque tiene su horario.')
          : (freeAccess ? ' Es un espacio de acceso libre: puedes visitarlo cuando quieras.' : ' Se puede visitar por dentro, con su horario y su entrada.');
      }
    }

    const cta = isEn
      ? (mode === 'kids'
        ? (poi.quiz ? " Listen carefully, because when it's over I'm going to ask you a question to see how much you remember." : '')
        : ' If you want to dig deeper into a topic, use the "Dig deeper" button below. And if you\'re after the exact hours and price, there\'s a tickets button for that.')
      : (mode === 'kids'
        ? (poi.quiz ? ' Escucha bien, que cuando termine te voy a hacer una pregunta para ver cuánto se te ha quedado.' : '')
        : ' Si quieres profundizar en algún tema, tienes el botón "Profundiza más" aquí abajo. Y si buscas el horario y el precio exactos, ahí tienes el botón de entradas.');

    const body = `${historyFull}${legendBridge}${archBridge}${visitLine}${cta}`;
    return opener ? `${opener} ${body}` : body;
  };

  const ensureAiPanelInitialGreet = (poi) => {
    if (!poi) return;
    const history = aiHistoryFor(poi.id);
    // FIX (2026-09-10): si este POI ya tiene historial pero se generó en el
    // OTRO idioma (se abrió en español, luego se cambió a inglés, y se
    // vuelve a abrir el mismo POI), se descarta -- si no, se quedaba en el
    // idioma viejo para siempre, porque abajo solo se mira si el historial
    // está vacío, no en qué idioma quedó guardado.
    if (history.length > 0 && STATE.ai.historyLang[poi.id] && STATE.ai.historyLang[poi.id] !== STATE.lang) {
      history.length = 0;
      STATE.ai.explored[poi.id] = new Set();
      STATE.ai.currentTopic[poi.id] = null;
      delete STATE.ai.deepenProgress[poi.id];
      STATE.ai.localIntroSpoken[poi.id] = false;
      // populateSheetContent ya llamó a renderAiSuggestions ANTES de este
      // reset (ver el orden en selectPoi), así que los chips (p.ej.
      // "Profundiza más" deshabilitado si el guion viejo estaba agotado)
      // se recalculan aquí también para no dejarlos con el estado del
      // idioma anterior.
      if (STATE.activePoiId === poi.id) renderAiSuggestions();
    }
    if (history.length === 0) {
      // Solo en modo Adultos se dice nada más que la frase corta de
      // bienvenida (ver buildPreviewText) — la intro completa de siempre
      // queda detrás del chip "Introducción" (ver showFullIntro). En modo
      // niño no hay chips en absoluto (renderAiSuggestions corta antes de
      // montarlos: es audio + quiz, no una lista de botones), así que ahí
      // se mantiene el comportamiento de siempre o se quedarían sin forma
      // de llegar a la historia completa.
      // isSummary marca de forma explícita cuál es el resumen inicial, para
      // que el audio principal en modo niño siempre lo identifique bien sin
      // depender de su posición en el historial (ver buildNarrativeText).
      const openingText = STATE.mode === 'kids' ? buildIntroText(poi, STATE.mode) : buildOpeningGreeting(poi, STATE.mode);
      history.push({ role: 'assistant', text: openingText, isSummary: true });
      STATE.ai.historyLang[poi.id] = STATE.lang;
      saveState();
      STATE.ai.localIntroSpoken[poi.id] = true;
      // Ya no hace falta ningún "adelanto" hablado aparte mientras se
      // espera a la IA (el texto de arriba está listo al instante): se
      // reproduce directo por el camino normal, igual que cualquier otra
      // narración (ver startAudio).
      // CLOUD_TTS.isConfigured() cubre el caso de la app empaquetada en
      // Capacitor (WebView de Android sin window.speechSynthesis: ver
      // startAudio más abajo, que ya sabe pedir la voz en la nube al vuelo
      // cuando no hay síntesis local) — sin esto, la app se quedaba muda
      // ahí porque esta comprobación solo miraba la voz del navegador.
      if ((SPEECH.isSupported() || CLOUD_TTS.isConfigured()) && !STATE.audio.playing) startAudio(false, true);
    }
    renderAiMessages();
    scrollAiToBottom();
  };

  // Chips de sugerencia: en vez de mostrar siempre las 4 categorías fijas,
  // una vez elegido un tema se ofrece "profundizar más" sobre ese mismo tema
  // + los temas que aún no se han explorado, para enganchar en una conversación
  // que se va abriendo en profundidad en vez de repetir las mismas opciones.
  const renderAiSuggestions = () => {
    const input = $('#aiInput');
    const sendBtn = $('#aiSend');
    if (sendBtn) sendBtn.toggleAttribute('disabled', STATE.ai.pending || !(input && input.value.trim()));
    const box = $('#aiSuggestions');
    if (!box || !STATE.activePoiId) return;
    box.innerHTML = '';
    // Modo niño: sin chat de texto ni chips. Solo audioguía y, al terminar,
    // una pregunta con puntos (ver renderKidsQuizCard).
    if (STATE.mode === 'kids') return;
    const poiId = STATE.activePoiId;
    const poi = POIS.find((p) => p.id === poiId);
    const topic = STATE.ai.currentTopic[poiId] || null;
    // "disabled" (general) bloquea todos los chips EXCEPTO "profundiza
    // más", que tiene su propio candado independiente (deepenBusy): así,
    // mientras un párrafo de "profundiza más" suena o espera a la IA, el
    // resto de chips (Entrada, pregunta libre) siguen disponibles — antes
    // se bloqueaban todos por igual, que era justo lo que se pidió arreglar.
    const disabled = STATE.ai.pending;

    // El chip de "Entrada" no es una de las opciones de IA: es información
    // práctica fija (horario/precio), solo se muestra si el propio POI la
    // trae (poi.visitInfo) y va siempre primero, antes que "Profundiza más".
    // EXPERIMENTO (rama experimento-diseno-editorial): "Cómo llegar" ya NO
    // va aquí -- se mudó a un icono fijo junto al de cerrar la ficha (ver
    // .sheet-directions-btn / populateSheetContent), así que esta fila
    // queda con menos chips y todos caben mejor.
    const chips = [];
    // "Introducción" va primero: es la audioguía completa de siempre, a un
    // toque en vez de sonar sola al abrir la ficha (ver
    // ensureAiPanelInitialGreet / showFullIntro).
    chips.push({ id: 'intro', kind: 'intro', label: t('intro') });
    if (poi && poi.visitInfo) chips.push({ id: 'ticket', kind: 'ticket', label: t('ticket') });
    // "Profundiza más" es el único chip de IA que queda -- los 3 chips de
    // tema (Historia secreta / Arquitectura / Leyendas) se quitaron: el
    // propio guion de 7 puntos que arma "Profundiza más" ya pide mezclar
    // esos mismos ángulos (ver buildStructuredInitPrompt), así que eran
    // redundantes con lo que esto ya cubre por su cuenta. Se deshabilita en
    // cuanto se agotan esos 7 puntos (ver queueDeepenWithFillers): a partir
    // de ahí, seguir pulsando no daría nada nuevo con garantías, así que se
    // redirige a la pregunta libre (el propio texto del último punto ya se
    // lo indica al usuario). También se deshabilita mientras su propia
    // tanda está en curso (deepenBusy), aunque el resto de chips (disabled,
    // de arriba) no lo estén.
    const deepenExhausted = !!(STATE.ai.deepenProgress[poiId] && STATE.ai.deepenProgress[poiId].exhausted);
    chips.push({ id: 'deepen', kind: 'deepen', label: pickDual(AI_PROMPTS.deepenLabel), disabled: deepenExhausted || STATE.ai.deepenBusy });

    chips.forEach((chip) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'suggest-chip';
      const iconKind = chip.kind === 'option' ? chip.id : chip.kind;
      b.innerHTML = `<span class="suggest-chip-icon">${suggestIconSvg(iconKind)}</span><span>${chip.label}</span>`;
      if (disabled || chip.disabled) b.setAttribute('disabled', 'true');
      b.addEventListener('click', () => {
        if (!STATE.activePoiId || STATE.ai.pending) return;
        if (chip.kind === 'deepen' && STATE.ai.deepenBusy) return;
        const poi = POIS.find((p) => p.id === STATE.activePoiId);

        if (chip.kind === 'reset') {
          STATE.ai.explored[poi.id] = new Set();
          STATE.ai.currentTopic[poi.id] = null;
          saveState();
          renderAiSuggestions();
          return;
        }

        // No es una pregunta a la IA: no se registra en el chat, igual que
        // "reset" arriba.
        if (chip.kind === 'directions') {
          openDirectionsConfirm(poi);
          return;
        }

        // Si había un párrafo de "profundiza más" en curso (relleno local
        // sonando, o esperando a la IA real) y el usuario elige OTRO
        // chip mientras tanto, se abandona limpiamente antes de seguir —
        // ver el comentario de abandonDeepenFlow.
        if (chip.kind !== 'deepen' && STATE.ai.deepenBusy) abandonDeepenFlow();

        // Corta el audio en curso al instante: no tiene sentido seguir oyendo
        // la respuesta anterior mientras se genera la nueva.
        stopAudio();

        // Si lo último que hubo fue una pregunta suelta escrita a mano (no
        // un chip de tema), "Profundiza más" debe seguir profundizando en
        // ESA pregunta concreta, no saltar al guion general del POI (bug
        // reportado en pruebas de usuario, 2026-09-04: alguien preguntó por
        // cafés cerca de un POI y "profundiza más" la mandó a arquitectura
        // en vez de darle más sobre cafés). Se mira el turno de usuario más
        // reciente ANTES de añadir el propio bubble de este chip.
        const priorUserTurn = [...aiHistoryFor(poi.id)].reverse().find((m) => m.role === 'user');
        const followsFreeQuestion = chip.kind === 'deepen' && !!priorUserTurn && !priorUserTurn.isOptionChip;

        aiHistoryFor(poi.id).push({ role: 'user', text: chip.label, isOptionChip: true });

        renderAiMessages();
        scrollAiToBottom();

        if (chip.kind === 'ticket') {
          showVisitInfo(poi);
          return;
        }

        if (chip.kind === 'intro') {
          showFullIntro(poi);
          return;
        }

        if (followsFreeQuestion) {
          // No toca STATE.ai.deepenProgress (el guion general de 7 puntos):
          // es una ampliación puntual de la última pregunta libre, no
          // consume ni adelanta ese guion, así que "profundiza más" sigue
          // funcionando con normalidad si luego se vuelve a usar sin haber
          // preguntado nada suelto antes.
          queueAiMessage({
            poi,
            kind: 'deepenFollowup',
            optionId: null,
            userText: `Sigue profundizando en lo último que pregunté ("${priorUserTurn.text}"): dame más detalle y datos concretos nuevos que no hayas mencionado todavía, sin repetirte.`
          });
        } else if (chip.kind === 'deepen') {
          queueAiMessage({ poi, kind: 'deepen', optionId: 'deepen:' + (topic || 'general'), userText: chip.label });
        } else {
          if (!STATE.ai.explored[poi.id]) STATE.ai.explored[poi.id] = new Set();
          STATE.ai.explored[poi.id].add(chip.id);
          STATE.ai.currentTopic[poi.id] = chip.id;
          queueAiMessage({ poi, kind: 'option', optionId: chip.id, userText: chip.label });
        }
      });
      box.appendChild(b);
    });

    // La fila ya se desplazaba en horizontal (overflow-x: auto), pero sin
    // ninguna pista visual: en pantallas estrechas el último chip quedaba
    // cortado en seco justo en el borde ("Histo…"), y parecía un fallo de
    // maquetación en vez de una fila deslizable (bug reportado en pruebas de
    // usuario, 2026-09-07). updateFadeHint añade un difuminado a la derecha
    // (ver .ai-suggestions.-scrollable en styles.css) solo cuando de verdad
    // sobra contenido, y se reevalúa al desplazar por si se llega al final.
    const updateFadeHint = () => {
      box.classList.toggle('-scrollable', box.scrollWidth - box.clientWidth - box.scrollLeft > 4);
    };
    updateFadeHint();
    box.onscroll = updateFadeHint;
  };

  // Pregunta de gamificación tras el audio (modo niño): elige el primer tema
  // sin acertar aún de este lugar, o null si no hay preguntas o ya se
  // respondieron todas. El orden prioriza secreto > leyenda > arquitectura.
  const KIDS_QUIZ_ORDER = [
    'secret-history', 'legends', 'architecture',
    'construction-time', 'palace-size', 'royal-family', 'nearby-food'
  ];
  const nextKidsQuizTopic = (poi) => {
    if (!poi || !poi.quiz) return null;
    const keys = Object.keys(poi.quiz).sort((a, b) => KIDS_QUIZ_ORDER.indexOf(a) - KIDS_QUIZ_ORDER.indexOf(b));
    return keys.find((t) => !STATE.game.answered[`${poi.id}:${t}`]) || null;
  };

  // Se llama al terminar cualquier narración en modo niño: solo dispara la
  // primera pregunta (cuando termina el audio inicial y la ficha aún no
  // muestra nada). Pasar de una pregunta a la siguiente es cosa del botón
  // "Siguiente" en answerKidsQuiz, no de esperar a que acabe el audio.
  const maybeShowFirstKidsQuiz = () => {
    const card = $('#kidsQuizCard');
    if (card && card.hidden) renderKidsQuizCard();
  };

  const hideKidsQuiz = () => {
    const card = $('#kidsQuizCard');
    if (!card) return;
    card.hidden = true;
    card.innerHTML = '';
  };

  // Se llama cuando termina de sonar la audioguía en modo niño: muestra la
  // siguiente pregunta pendiente de este lugar directamente en la ficha
  // (no en el chat, que en modo niño está oculto).
  const renderKidsQuizCard = () => {
    const card = $('#kidsQuizCard');
    if (!card || STATE.mode !== 'kids' || !STATE.activePoiId) { hideKidsQuiz(); return; }
    const poi = POIS.find((p) => p.id === STATE.activePoiId);
    if (!poi || !poi.quiz) { hideKidsQuiz(); return; }

    const topicId = nextKidsQuizTopic(poi);
    card.innerHTML = '';
    card.hidden = false;

    if (!topicId) {
      const done = document.createElement('p');
      done.className = 'quiz-done';
      done.textContent = t('quizAllDone');
      card.appendChild(done);
      return;
    }

    const q = pickLang(poi.quiz[topicId]);
    const question = document.createElement('div');
    question.className = 'quiz-question';
    question.textContent = '🤔 ' + q.question;
    card.appendChild(question);

    const optsWrap = document.createElement('div');
    optsWrap.className = 'quiz-options';
    q.options.forEach((optText, i) => {
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = 'quiz-option';
      optBtn.textContent = optText;
      optBtn.addEventListener('click', () => answerKidsQuiz(poi, topicId, i));
      optsWrap.appendChild(optBtn);
    });
    card.appendChild(optsWrap);
  };

  const answerKidsQuiz = (poi, topicId, selectedIndex) => {
    const card = $('#kidsQuizCard');
    if (!card) return;
    const q = pickLang(poi.quiz[topicId]);
    const isCorrect = selectedIndex === q.correct;
    const key = `${poi.id}:${topicId}`;
    let pointsAwarded = 0;
    // Se marca como vista (con acierto o sin él) para que "Siguiente" avance
    // a la próxima pregunta en vez de repetir esta misma: fallarla ya
    // muestra la respuesta correcta ahí mismo, no hace falta forzar el
    // reintento para poder continuar.
    if (!STATE.game.answered[key]) {
      STATE.game.answered[key] = true;
      if (isCorrect) {
        STATE.game.points += 10;
        STATE.game.pointsEarned[key] = 10;
        pointsAwarded = 10;
        updatePointsBadge();
        updateExplorerBadge();
        checkCityBadge();
      }
    }
    saveState();
    $$('.quiz-option', card).forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correct) btn.classList.add('-correct');
      else if (i === selectedIndex) btn.classList.add('-incorrect');
    });
    const revealText = (isCorrect
      ? (pointsAwarded ? t('quizCorrectWithPoints').replace('{points}', pointsAwarded) : t('quizCorrect'))
      : t('quizAlmost')) + q.reveal;
    const reveal = document.createElement('p');
    reveal.className = 'quiz-reveal';
    reveal.textContent = revealText;
    card.appendChild(reveal);

    // Se narra el dato en voz alta como texto puntual (no se guarda en el
    // historial del lugar: si no, la próxima vez que se abra esta ficha, el
    // audio inicial sonaría con esta revelación en vez del resumen). Avanzar
    // a la siguiente pregunta ya no depende de esperar a que termine el
    // audio: el niño decide el ritmo tocando "Siguiente".
    if (STATE.activePoiId === poi.id) {
      STATE.audio.overrideText = revealText;
      stopAudio();
      startAudio(false, true);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'quiz-next-btn';
    nextBtn.textContent = t('quizNext');
    nextBtn.addEventListener('click', () => {
      stopAudio();
      renderKidsQuizCard();
    });
    card.appendChild(nextBtn);
  };

  const renderAiMessages = () => {
    const box = $('#aiMessages');
    if (!box || !STATE.activePoiId) return;
    const history = aiHistoryFor(STATE.activePoiId);
    box.innerHTML = '';
    history.forEach((msg) => {
      if (msg.role === 'typing') {
        box.appendChild(makeTypingEl(msg.statusText));
        return;
      }
      const user = msg.role === 'user';
      const wrap = document.createElement('div');
      wrap.className = 'ai-msg' + (user ? ' -user' : '');
      const av = document.createElement('div');
      av.className = 'ai-msg-avatar';
      // El resumen inicial (isSummary) y los párrafos de relleno local de
      // "profundiza más" (pregen, ver queueDeepenWithFillers) no los genera
      // la IA — usan el icono propio de narración/altavoz para no dar a
      // entender que es contenido de IA; el resto de respuestas (la
      // respuesta real de profundizar, preguntas sueltas) sí lo son, y
      // mantienen el icono de IA. Es la única forma de diferenciarlos a
      // simple vista, a propósito discreta: para un cliente son solo dos
      // iconos distintos, sin que se entienda qué significan.
      if (user) {
        av.textContent = STATE.mode === 'kids' ? '🧒' : '👤';
      } else if (msg.isSummary || msg.pregen) {
        const icon = document.createElement('img');
        icon.className = 'ai-msg-avatar-icon';
        icon.src = 'assets/icons/narration.png';
        icon.alt = '';
        av.appendChild(icon);
      } else {
        av.classList.add('-plain');
        const icon = document.createElement('img');
        icon.className = 'ai-msg-avatar-icon';
        icon.src = 'assets/icons/ai.png';
        icon.alt = '';
        av.appendChild(icon);
      }
      const bubble = document.createElement('div');
      bubble.className = 'ai-msg-bubble';
      bubble.textContent = msg.text || '';
      // msg.link solo lo trae el mensaje fijo de info práctica (ver
      // showVisitInfo): se añade como <a> real vía DOM, nunca con innerHTML,
      // para no arriesgarse a inyectar HTML si algún día este campo llegara
      // a depender de un texto menos controlado que el nuestro.
      if (msg.link) {
        const a = document.createElement('a');
        a.className = 'ai-msg-link';
        a.href = msg.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = '🎟️ Comprar entrada oficial ↗';
        bubble.appendChild(a);
      }
      wrap.appendChild(av);
      wrap.appendChild(bubble);
      box.appendChild(wrap);
    });
  };

  // statusText (opcional): pasados unos segundos sin respuesta (ver el
  // setTimeout en queueAiMessage), los puntos de "escribiendo…" se
  // cambian por un aviso de texto — sin esto, una espera larga (la IA
  // real puede tardar 45-90s) se siente como que la app se ha quedado
  // colgada, ya que los puntos no comunican que sigue en marcha.
  const makeTypingEl = (statusText) => {
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg -typing';
    const av = document.createElement('div');
    av.className = 'ai-msg-avatar -plain';
    const avIcon = document.createElement('img');
    avIcon.className = 'ai-msg-avatar-icon';
    avIcon.src = 'assets/icons/ai.png';
    avIcon.alt = '';
    av.appendChild(avIcon);
    const b = document.createElement('div');
    b.className = 'ai-msg-bubble';
    if (statusText) {
      b.textContent = statusText;
    } else {
      b.innerHTML = `<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>`;
    }
    wrap.appendChild(av);
    wrap.appendChild(b);
    return wrap;
  };

  const scrollAiToBottom = () => {
    const box = $('#aiMessages');
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  };

  // Info práctica (horario/precio): a diferencia de los chips de IA, este
  // texto es fijo y viene del propio POI (poi.visitInfo), así que se
  // inserta directo en el historial sin pasar por LLM.generate — no tiene
  // sentido dejar que un dato tan sensible a errores (precios, horarios)
  // pueda inventarse o desactualizarse vía IA.
  const showVisitInfo = (poi) => {
    if (!poi || !poi.visitInfo) return;
    const hist = aiHistoryFor(poi.id);
    const hours = pickDual(poi.visitInfo.hours);
    const price = pickDual(poi.visitInfo.price);
    const text = `🕐 Horario\n${hours}\n\n🎟️ Precio\n${price}\n\n📅 Datos orientativos: pueden cambiar, confirma en la web oficial antes de ir.`;
    hist.push({ role: 'assistant', text, link: poi.visitInfo.link || null });
    renderAiMessages();
    scrollAiToBottom();
    saveState();
    if (STATE.activePoiId === poi.id) startAudio(false, true);
  };

  // Chip "Introducción": la audioguía completa de siempre (historia,
  // leyendas, arquitectura...), que ahora queda a un toque de distancia en
  // vez de arrancar sola al abrir la ficha — ver ensureAiPanelInitialGreet,
  // que solo dice la frase corta de bienvenida. Mismo patrón que
  // showVisitInfo: se añade como mensaje de la IA en el chat y se narra.
  const showFullIntro = (poi) => {
    if (!poi) return;
    const hist = aiHistoryFor(poi.id);
    hist.push({ role: 'assistant', text: buildIntroText(poi, STATE.mode, STATE.mode === 'kids'), isSummary: true });
    renderAiMessages();
    scrollAiToBottom();
    saveState();
    if (STATE.activePoiId === poi.id) startAudio(false, true);
  };

  // "Cómo llegar": aviso previo antes de saltar a Google Maps, para que
  // quien lo pida sepa que la app se queda tal cual la dejó (no se cierra,
  // solo pasa a segundo plano) — modal propio en vez de window.confirm,
  // mismo motivo que el de reiniciar la app (ver wireEvents). Los listeners
  // de los botones del modal se cablean en wireEvents; open/close viven
  // aquí porque el chip que llama a openDirectionsConfirm se define en
  // renderAiSuggestions, no dentro de wireEvents.
  const directionsModal = $('#directionsConfirmModal');
  let directionsPoi = null;
  const closeDirectionsConfirm = () => {
    if (!directionsModal) return;
    directionsModal.classList.remove('-open');
    directionsModal.setAttribute('aria-hidden', 'true');
    directionsPoi = null;
    SPEECH.cancel();
    STATE.audio.overrideText = null;
  };
  const openDirectionsConfirm = (poi) => {
    if (!directionsModal || !poi || !poi.coords) return;
    directionsPoi = poi;
    directionsModal.classList.add('-open');
    directionsModal.setAttribute('aria-hidden', 'false');
    // EXPERIMENTO (rama experimento-diseno-editorial): el aviso de que se
    // va a abrir Google Maps también se dice en voz, no solo en el texto
    // del modal -- para quien va mirando el mapa o llevando el móvil en el
    // bolsillo, no leyendo la ficha. Reutiliza el mismo texto que ya se
    // muestra (directionsConfirmTitle/Text) en vez de inventar otro
    // mensaje, y el mecanismo de "texto puntual" (overrideText) ya probado
    // en speakCityIntroViaLocalSpeech: no hace falta duplicar el mensaje
    // en el chat, solo se oye.
    if (SPEECH.isSupported()) {
      pauseAudio();
      STATE.audio.overrideText = `${t('directionsConfirmTitle')}. ${t('directionsConfirmText')}`;
      SPEECH.speak(() => { STATE.audio.overrideText = null; });
    }
  };

  // Registro en memoria (a propósito NO va dentro de STATE: no tiene
  // sentido intentar persistir una petición fetch en curso, y así no hay
  // que preocuparse de serializarla) de la consulta real de "profundiza
  // más" en curso para cada POI. Con IA real, la respuesta puede tardar
  // bastante (medido en directo: ~42-45s con la configuración de
  // max_tokens que usamos, ver el timeout de fetchOpenAI): en vez de
  // dejar al usuario mirando el indicador de "escribiendo…" todo ese
  // rato, o encadenar rellenos en automático sin que lo pida, cada click
  // en "Profundiza más" solo desvela UN párrafo:
  //   - El primer click arranca la IA real de fondo (no se espera aquí) y
  //     muestra un párrafo "profundiza" ya armado en local (mismo pool de
  //     datos que usa el simulador offline, SIM.deepen vía
  //     LLM.localDeepen) — a esas alturas es imposible que la IA ya haya
  //     contestado, así que este primer párrafo es SIEMPRE local.
  //   - Cada click siguiente: si la consulta en curso ya contestó, se
  //     muestra esa respuesta real Y, en el mismo momento, se lanza YA la
  //     siguiente consulta a la IA (no se espera a un futuro click para
  //     arrancarla) — así tiene de margen toda la duración de este audio
  //     antes de que el usuario vuelva a pedir más. Si la consulta en
  //     curso TODAVÍA no ha contestado, se muestra otro párrafo de relleno
  //     local y se sigue esperando la misma respuesta (no se lanza una
  //     segunda consulta en paralelo). Solo se recurre a relleno local
  //     cuando, en el tiempo que ha tardado en reproducirse el párrafo
  //     anterior, la IA de verdad no ha terminado todavía.
  // "pregen: true" en el historial es solo una marca interna — se usa
  // para el icono del avatar (bocina = relleno local, icono de IA = IA real, ver
  // renderAiMessages) a modo de guiño discreto para poder comprobar que
  // esto funciona bien, sin que un cliente cualquiera entienda qué
  // significan esos dos iconos.
  const deepenInFlight = {};

  // "Profundiza más" con IA real usa un guion fijo de 7 puntos (antes 10,
  // ver comentario de más abajo sobre por qué se redujo) en vez de pedirle
  // a la IA en cada llamada que "no repita" lo ya dicho (eso era solo un
  // ruego: en pruebas reales, la IA repetía igualmente el mismo dato
  // "estrella" del sitio en 3 de 4 respuestas seguidas, ver historial de
  // V23.5). Ahora:
  //   1) La PRIMERA llamada real pide el TÍTULO de 7 datos distintos y
  //      poco correlacionados sobre el lugar, y desarrolla solo el primero
  //      en la misma respuesta (un único viaje de red).
  //   2) Cada llamada siguiente pide desarrollar un punto concreto ya
  //      titulado — al apuntar a un ángulo distinto por diseño, ya no hace
  //      falta pedirle que "no repita", así que la garantía es estructural
  //      y no depende de que la IA obedezca una instrucción.
  //   3) Al mostrarse el desarrollo del punto 7, se cierra el guion: se
  //      añade una frase invitando a preguntar algo concreto en el chat de
  //      texto, y el chip se deshabilita para ese POI (ver
  //      renderAiSuggestions).
  // Si la respuesta inicial no llega en el formato esperado (la IA no
  // siempre es disciplinada con el formato pedido), se descarta y este POI
  // cae de forma permanente al sistema anterior de una sola tanda con
  // "alreadySaid" — sin tope de 7, como red de seguridad.
  //
  // Por qué 7 y no 10 (cambiado en el estudio de producción del
  // 2026-08-19): completar el guion entero de 10 podía suponer hasta 11
  // peticiones reales de fondo por parada (1 para planificar + 10 puntos),
  // presionando de más la cuota compartida de Gemini y el límite por IP
  // del proxy — justo la causa raíz del "relleno repetido" que motivó ese
  // estudio. Con 7, el máximo baja a 8 peticiones por parada (-27%) sin
  // perder demasiada profundidad: pocos usuarios llegan a tocar "Profundiza
  // más" más de 4-5 veces seguidas en una misma parada.
  const buildStructuredInitPrompt = (poi) => {
    const name = pickLang(poi.name).adult;
    return `Quiero explorar ${name} en profundidad, en varias tandas cortas.

Primero, dame el TÍTULO (muy corto, entre 3 y 8 palabras) de 7 datos o curiosidades DISTINTAS y poco correlacionadas entre sí sobre este lugar: mezcla historia, arquitectura, leyendas, anécdotas, detalles secretos, curiosidades poco conocidas... cuanto más variados los ángulos entre sí, mejor. No desarrolles nada todavía en esta lista, solo los títulos.

Después, desarrolla en detalle SOLO el primero de esos 7 puntos (150-180 palabras, con datos concretos).

Responde EXACTAMENTE con este formato, sin nada más antes ni después:

TITULOS:
1. (título)
2. (título)
3. (título)
4. (título)
5. (título)
6. (título)
7. (título)

DESARROLLO:
(desarrollo del punto 1)`;
  };
  const buildStructuredPointPrompt = (poi, title) => {
    const name = pickLang(poi.name).adult;
    return `Seguimos explorando ${name}. Desarrolla en detalle este punto concreto (150-180 palabras, con datos concretos): "${title}"

Responde solo con el desarrollo de ese punto: no repitas el título tal cual, no numeres nada, no añadas nada más antes ni después.`;
  };
  // Exige al menos 4 títulos bien formados (de los 7 pedidos) para
  // aceptar la respuesta — con menos que eso, la variedad prometida no se
  // cumple de verdad y es mejor cortar por el sistema de respaldo.
  const parseStructuredInit = (text) => {
    // Tolerante a que la IA "corrija" el acento aunque se pida sin él
    // (TITULOS/TÍTULOS) — el resto del formato si debe respetarse.
    const titlesMatch = (text || '').match(/T[IÍ]TULOS:\s*([\s\S]*?)DESARROLLO:/i);
    const bodyMatch = (text || '').match(/DESARROLLO:\s*([\s\S]*)$/i);
    if (!titlesMatch || !bodyMatch) return null;
    const titles = titlesMatch[1].split('\n')
      .map((l) => l.trim())
      .map((l) => l.match(/^\d+[.)]\s*(.+)$/))
      .filter(Boolean)
      .map((m) => m[1].trim())
      .filter(Boolean);
    const body = bodyMatch[1].trim();
    if (titles.length < 4 || !body) return null;
    return { titles, body };
  };
  const deepenProgressFor = (poiId) => {
    if (!STATE.ai.deepenProgress[poiId]) {
      STATE.ai.deepenProgress[poiId] = { titles: null, nextIndex: 1, exhausted: false, fallback: false, fillerIndex: 0 };
    }
    return STATE.ai.deepenProgress[poiId];
  };

  // Relleno mientras se espera a la IA real (ver queueDeepenWithFillers):
  // datos REALES y específicos de ESTE POI en concreto (poi.tabs.deepenFillers,
  // 2-3 por modo), no frases genéricas compartidas por las ~140 paradas de
  // toda la app — la causa de fondo del bug reportado en producción
  // (2026-08-19: el mismo "los canteros dejaban una marca oculta" saliendo
  // en sitios sin relación entre sí). Cicla por ellos con
  // progress.fillerIndex cada vez que hace falta relleno para este POI; si
  // se agotan, sigue repitiéndolos en orden (mejor repetir un dato real del
  // sitio que inventar contenido nuevo de la nada). "|| 0" defiende contra
  // partidas guardadas antes de este cambio, cuyo progress no trae
  // fillerIndex todavía. Si el POI no tiene deepenFillers propios (caso
  // raro: alguna parada recién añadida sin este campo aún, o las paradas
  // de ambientación como los restaurantes ilustrados), cae al banco
  // genérico de siempre (SIM.deepenFacts) como red de seguridad.
  const nextDeepenFiller = (poi, progress) => {
    const fillers = poi.tabs.deepenFillers && pickDual(poi.tabs.deepenFillers);
    if (!fillers || !fillers.length) return LLM.localDeepen(poi, STATE.mode, 'architecture');
    const idx = progress.fillerIndex || 0;
    const fact = fillers[idx % fillers.length];
    progress.fillerIndex = idx + 1;
    return t('deepenFillerContinue').replace('{fact}', fact);
  };

  // Quita el aviso final "(Modo offline...)" / "(La IA está saturada...)"
  // que LLM.generate pega al final del texto cuando la IA real falla y
  // cae al simulador local (ver su suffix). Se usa solo cuando ese texto
  // va a ir seguido de la despedida del último punto de "profundiza más": ahí
  // el aviso ya no aporta nada y sumado a la despedida quedaba redundante.
  // El texto que reemplaza (${code}) puede traer sus propios paréntesis
  // ("API (Load failed)"), así que en vez de intentar casar paréntesis
  // equilibrados se corta todo lo que queda desde el aviso hasta el final
  // — construction garantiza que el aviso es siempre lo último del texto.
  const stripOfflineSuffix = (text) => (text || '')
    .replace(/\n\n(?:⚠️)?\s?\((?:¡La IA está muy solicitada|La IA está saturada|Modo offline|The AI is (?:overloaded|really busy)|Offline mode)[\s\S]*$/, '')
    .trimEnd();

  const queueDeepenWithFillers = async ({ poi, optionId, userText }) => {
    if (!poi || STATE.ai.deepenBusy) return;
    const hist = aiHistoryFor(poi.id);
    const fallbackText = t('deepenFetchFailed');
    const progress = deepenProgressFor(poi.id);

    // Lanza (sin esperar aquí) una consulta real nueva y la registra como
    // la consulta en curso para este POI. Qué pide exactamente depende de
    // en qué punto del guion de 7 vamos (ver comentario de arriba).
    const launchAiQuery = () => {
      const entry = { settled: false, text: null };
      deepenInFlight[poi.id] = entry;

      let genParams;
      if (progress.fallback) {
        // Red de seguridad: la respuesta inicial no se pudo interpretar
        // como títulos+desarrollo, así que este POI vuelve al sistema
        // anterior (una tanda suelta con todo lo narrado hasta ahora,
        // pidiéndole a la IA que no lo repita).
        const saidSoFar = hist.filter((m) => m.role === 'assistant').map((m) => m.text).join('\n\n');
        const alreadySaid = saidSoFar.length > 6000 ? saidSoFar.slice(-6000) : saidSoFar;
        genParams = {
          poi, mode: STATE.mode, userQuery: userText ?? null, optionId: optionId ?? null,
          cityName: CURRENT_CITY ? CURRENT_CITY.name : 'la ciudad', concise: false,
          alreadySaid: alreadySaid || null
        };
      } else if (!progress.titles) {
        genParams = {
          poi, mode: STATE.mode, userQuery: buildStructuredInitPrompt(poi), optionId: null,
          cityName: CURRENT_CITY ? CURRENT_CITY.name : 'la ciudad', concise: false, alreadySaid: null
        };
      } else {
        const title = progress.titles[progress.nextIndex - 1];
        genParams = {
          poi, mode: STATE.mode, userQuery: buildStructuredPointPrompt(poi, title), optionId: null,
          cityName: CURRENT_CITY ? CURRENT_CITY.name : 'la ciudad', concise: false, alreadySaid: null
        };
      }

      LLM.generate(genParams).catch(() => fallbackText).then((text) => { entry.settled = true; entry.text = text; });
      return entry;
    };

    let entry = deepenInFlight[poi.id];
    if (!entry) entry = launchAiQuery();

    STATE.ai.deepenBusy = true;
    if (STATE.activePoiId === poi.id) updateAudioUi();
    renderAiSuggestions();

    let text, pregen;
    if (entry.settled) {
      pregen = false;
      if (!progress.titles && !progress.fallback) {
        const parsed = parseStructuredInit(entry.text);
        if (parsed) {
          progress.titles = parsed.titles;
          progress.nextIndex = 2;
          text = parsed.body;
          launchAiQuery();
        } else {
          // No se pudo interpretar el formato: se descarta esta respuesta
          // (podría venir a medio formar) y se cae al sistema de
          // respaldo, mostrando relleno local en ESTE click mientras esa
          // primera consulta de respaldo viaja.
          progress.fallback = true;
          launchAiQuery();
          text = nextDeepenFiller(poi, progress);
          pregen = true;
        }
      } else if (progress.fallback) {
        text = entry.text;
        launchAiQuery();
      } else {
        text = entry.text;
        progress.nextIndex += 1;
        if (progress.nextIndex > progress.titles.length) {
          progress.exhausted = true;
          // Si esta última consulta falló y cayó al simulador local, su
          // texto ya lleva pegado el aviso "(Modo offline...)" (ver
          // LLM.generate) — sumarle encima la despedida quedaba raro y
          // redundante ("no hay conexión... por cierto, esto es todo,
          // pregúntame algo"). En este punto concreto ese aviso ya no
          // aporta nada (el usuario va a ver la despedida igualmente), así
          // que se quita antes de cerrar el guion.
          text = stripOfflineSuffix(text);
          text += t('deepenScriptDone');
        } else {
          launchAiQuery();
        }
      }
    } else {
      text = nextDeepenFiller(poi, progress);
      pregen = true;
    }

    // Aviso visible de que esto es un adelanto de relleno, no la respuesta
    // final de la IA: antes la única diferencia era el icono del avatar
    // (narration.png vs ai.png en renderAiMessages), a propósito discreto
    // para no interrumpir la lectura — pero con una respuesta real
    // tardando 42-45s (ver arriba) y "Profundiza más" siendo natural
    // tocarlo varias veces seguidas en ese rato, casi nadie esperaba lo
    // suficiente para ver la respuesta real, y el relleno se leía como si
    // fuera la respuesta definitiva. Este aviso solo aparece cuando pregen
    // es true (relleno mientras la IA real sigue viajando), nunca cuando
    // la IA real ya ha fallado del todo (esos casos usan su propio aviso
    // "Modo offline...", ver LLM.generate).
    if (pregen) {
      const deepenLabel = pickDual(AI_PROMPTS.deepenLabel);
      text += t('deepenPregenNotice').replace('{label}', deepenLabel);
    }

    await new Promise((resolve) => {
      hist.push({ role: 'assistant', text, pregen });
      renderAiMessages();
      scrollAiToBottom();
      if (STATE.activePoiId !== poi.id) { resolve(); return; }
      STATE.audio.overrideText = null;
      startAudio(false, true, resolve);
    });

    STATE.ai.deepenBusy = false;
    if (STATE.activePoiId === poi.id) updateAudioUi();
    renderAiMessages();
    renderAiSuggestions();
    scrollAiToBottom();
    saveState();
  };

  const queueAiMessage = async ({ poi, kind, userText, optionId, alreadySaid }) => {
    // "Profundiza más" tiene su propio flujo con rellenos locales mientras
    // espera a la IA real (ver arriba) — solo tiene sentido cuando hay una
    // API real configurada: sin ella, LLM.generate ya resuelve al instante
    // y el relleno solo añadiría una espera artificial sin necesidad.
    if (kind === 'deepen' && LLM.isReal()) {
      return queueDeepenWithFillers({ poi, optionId, userText });
    }
    if (!poi || STATE.ai.pending) return;
    STATE.ai.pending = true;
    if (STATE.activePoiId === poi.id) updateAudioUi(); // refleja el play deshabilitado (ver updateAudioUi)
    const hist = aiHistoryFor(poi.id);
    const typingMsg = { role: 'typing' };
    hist.push(typingMsg);
    renderAiMessages();
    renderAiSuggestions();
    scrollAiToBottom();

    // Igual que en la llamada de voz (ver queueCallTurn): a los pocos
    // segundos, si la IA real sigue sin contestar, se cambia el indicador
    // de "escribiendo…" por un aviso de texto — sin esto, una espera
    // larga (hasta 90s con el modelo actual, ver el timeout de
    // fetchOpenAI) se siente como que la app se ha quedado colgada, ya
    // que los puntos por sí solos no comunican que sigue en marcha.
    const slowTimer = setTimeout(() => {
      typingMsg.statusText = t('callStillThinking');
      renderAiMessages();
    }, 6000);

    try {
      // concise solo para preguntas sueltas escritas por el usuario
      // (kind: 'text'): si pregunta algo puntual como "¿a qué hora abre?"
      // o "¿cuánto mide?", no tiene sentido que la IA responda con un
      // párrafo entero de historia detrás — eso es justo lo que se pide en
      // los botones de tema (Historia secreta, Arquitectura, Leyendas,
      // Profundiza más), que sí deben seguir siendo extensos por diseño.
      const text = await LLM.generate({
        poi,
        mode: STATE.mode,
        userQuery: userText ?? null,
        optionId: optionId ?? null,
        cityName: CURRENT_CITY ? CURRENT_CITY.name : 'la ciudad',
        concise: kind === 'text',
        alreadySaid: alreadySaid ?? null
      });
      const idx = hist.findIndex((m) => m.role === 'typing');
      if (idx >= 0) hist.splice(idx, 1);
      // isSummary marca de forma explícita cuál es el resumen inicial, para
      // que el audio principal en modo niño siempre lo identifique bien sin
      // depender de su posición en el historial (ver buildNarrativeText).
      hist.push({ role: 'assistant', text, isSummary: kind === 'summary' });
      // Solo el resumen inicial intenta CLOUD_TTS: es la única narración
      // que vale la pena cachear (el chat y las revelaciones del quiz son
      // texto de un solo uso). Si no está configurado o falla, no añade
      // espera real (fetchAndCache resuelve al momento en ese caso).
      // Importante: se pide con SPEECH.getText() (evaluado ya con este
      // mensaje metido en el historial), no con la variable "text" suelta
      // — buildNarrativeText le añade la intro ("¡Hola! Vamos a descubrir…")
      // que también se narra, así que hay que cachear el texto completo tal
      // cual lo va a pedir startAudio, o la caché nunca haría match.
      // El relleno narrado mientras se esperaba esta respuesta (ver
      // ensureAiPanelInitialGreet) puede haberse quedado a medias, con
      // STATE.audio.overrideText todavía apuntando a su texto: cuando se
      // interrumpe con SPEECH.cancel(), el motor de voz se traga el aviso
      // de fin a propósito (para no disparar avisos de error en cancelaciones
      // esperadas en otros sitios), así que su propio callback de limpieza
      // nunca llega a ejecutarse. Sin este borrado explícito aquí,
      // buildNarrativeText() seguiría devolviendo ese texto de relleno en
      // vez del resumen real — tanto para el caché de CLOUD_TTS de abajo
      // como para cualquier reproducción manual posterior.
      STATE.audio.overrideText = null;
      if (kind === 'summary' && STATE.activePoiId === poi.id && CLOUD_TTS.isConfigured()) {
        await CLOUD_TTS.fetchAndCache(SPEECH.getText());
      }
      // Autoplay de la respuesta recién generada. Se dispara fuera del gesto
      // directo del usuario (tras el await), así que en iOS Safari puede no
      // arrancar la primera vez; por eso "silent" evita un toast de error y
      // el botón de play queda listo para un toque manual como respaldo.
      // Ojo: solo si no hay ya algo sonando. El botón de play se deshabilita
      // mientras STATE.ai.pending está activo (ver updateAudioUi) para que
      // no se pueda arrancar de forma manual con el texto de respaldo
      // mientras esto carga, pero por si acaso (p.ej. una pestaña que
      // quedó reproduciendo audio de otro momento) no forzamos nunca un
      // reinicio en pleno play: eso es justo lo que sonaba como un audio
      // que "se refresca solo" a los pocos segundos.
      if (STATE.activePoiId === poi.id && !STATE.audio.playing) startAudio(false, true);
    } catch (e) {
      const idx = hist.findIndex((m) => m.role === 'typing');
      if (idx >= 0) hist.splice(idx, 1);
      hist.push({ role: 'assistant', text: t('deepenFetchFailed') });
    } finally {
      clearTimeout(slowTimer);
      STATE.ai.pending = false;
      if (STATE.activePoiId === poi.id) updateAudioUi(); // reactiva el play si se había deshabilitado (ver arriba)
      renderAiMessages();
      renderAiSuggestions();
      scrollAiToBottom();
      saveState();
    }
  };

  const sendUserAiMessage = () => {
    const input = $('#aiInput');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text || STATE.ai.pending || !STATE.activePoiId) return;
    const poi = POIS.find((p) => p.id === STATE.activePoiId);
    // Igual que con los chips: si había un párrafo de "profundiza más" en
    // curso, se abandona limpiamente antes de mandar la pregunta suelta
    // (ver abandonDeepenFlow) — el input de texto nunca se bloqueó por
    // deepenBusy (solo por pending), así que sin esto la tanda de
    // profundizar se quedaría huérfana.
    if (STATE.ai.deepenBusy) abandonDeepenFlow();
    stopAudio();
    aiHistoryFor(poi.id).push({ role: 'user', text });
    input.value = '';
    $('#aiSend')?.setAttribute('disabled', 'true');
    renderAiMessages();
    scrollAiToBottom();
    queueAiMessage({ poi, kind: 'text', userText: text });
  };

  const wireAiInput = () => {
    const input = $('#aiInput');
    const sendBtn = $('#aiSend');
    if (!input || !sendBtn) return;
    sendBtn.addEventListener('click', sendUserAiMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendUserAiMessage();
      }
    });
    input.addEventListener('input', () => {
      sendBtn.toggleAttribute('disabled', STATE.ai.pending || !input.value.trim());
    });
  };

  // Dictado por voz de la pregunta: Web Speech API (reconocimiento), no
  // confundir con SPEECH (síntesis/TTS de la audioguía) de más arriba. Solo
  // Chrome/Edge la soportan de verdad (Safari/iOS no implementa
  // SpeechRecognition), así que el botón se queda oculto si no hay soporte
  // en vez de mostrar algo roto.
  const wireMicInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = $('#aiMic');
    const input = $('#aiInput');
    const sendBtn = $('#aiSend');
    if (!Recognition || !btn || !input || !sendBtn) return;
    btn.hidden = false;

    let recognition = null;
    let listening = false;
    const setListening = (on) => {
      listening = on;
      btn.setAttribute('aria-pressed', String(on));
    };

    btn.addEventListener('click', () => {
      if (listening) { recognition?.stop(); return; }
      if (!STATE.activePoiId) return;
      stopAudio(); // si la audioguía está sonando, el micro no debe "escucharla"
      recognition = new Recognition();
      recognition.lang = 'es-ES';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onstart = () => setListening(true);
      recognition.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        input.value = transcript;
        sendBtn.toggleAttribute('disabled', STATE.ai.pending || !transcript.trim());
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      try { recognition.start(); } catch (_) { setListening(false); }
    });
  };

  /* =========================================================
   * CONVERSACIÓN POR VOZ ("llamada" con la IA)
   * Distinto del dictado puntual de arriba (wireMicInput): aquí se abre un
   * modal a pantalla completa que se queda activo turno tras turno, con la
   * IA respondiendo siempre en voz alta y preguntando "¿algo más?" al
   * terminar, hasta que el usuario dice/escribe que no o pulsa "Colgar".
   * Reutiliza LLM.generate directamente (mismo contexto de POI/ciudad que
   * el chat normal, así que las respuestas ya vienen acotadas a la zona) y
   * guarda cada turno en el historial normal del lugar (aiHistoryFor), para
   * que quede visible también en el chat de texto si se reabre después.
   *
   * Si el navegador soporta SpeechRecognition (no en Safari/iOS) escucha
   * cada turno por voz; si no, muestra un input de texto dentro del propio
   * modal como respaldo — la IA sigue respondiendo hablado en ambos casos,
   * y el flujo de "llamada" (turnos + cierre) es idéntico.
   * =======================================================*/
  const CALL_END_RE = /^(no|nada|nada m[aá]s|gracias|ya est[aá]|para|termina|terminar|cierra|cuelga|colgar|adi[oó]s|chao|eso es todo)[.!¡¿?\s]*$/i;
  // Respuesta a "¿quieres decirme algo, o continúo?" tras una interrupción
  // (ver handleCallInterruption): si el usuario no quería decir nada nuevo,
  // no se re-narra la respuesta cortada (complicaría el flujo innecesariamente
  // — si le interesa ese dato puede volver a preguntarlo), simplemente se
  // pasa a preguntar si quiere algo más.
  const CALL_CONTINUE_RE = /^(sigue|contin[uú]a|nada|no,? sigue|no,? contin[uú]a|prosigue|adelante|vale,? sigue|nada,? sigue)[.!¡¿?\s]*$/i;

  // nextHandler: a qué función debe ir el próximo texto reconocido/escrito
  // (una pregunta normal, o la respuesta a "¿quieres decirme algo?" tras una
  // interrupción) — tanto el reconocimiento de voz como el input de texto de
  // respaldo consultan este mismo valor, así el flujo es idéntico entre los
  // dos caminos de entrada.
  const callState = { active: false, poi: null, nextHandler: null };
  let callRecognition = null;
  let callInterruptRecognition = null;

  const hasSpeechRecognition = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const setCallStatus = (text) => {
    const el = $('#aiCallStatus');
    if (el) el.textContent = text;
  };
  const setCallAvatarState = (cls) => {
    const el = $('#aiCallAvatar');
    if (!el) return;
    el.classList.remove('-listening', '-speaking');
    if (cls) el.classList.add(cls);
  };
  const appendCallBubble = (role, text) => {
    const box = $('#aiCallTranscript');
    if (!box) return;
    const b = document.createElement('div');
    b.className = 'ai-call-bubble' + (role === 'user' ? ' -user' : '');
    b.textContent = text;
    box.appendChild(b);
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  };
  const focusCallTextInput = (handler) => {
    callState.nextHandler = handler || handleCallUserInput;
    setCallAvatarState(null);
    const row = $('#aiCallTextRow');
    if (row) row.hidden = false;
    $('#aiCallInput')?.focus();
  };

  // "Oído" de fondo que escucha MIENTRAS la IA habla, solo para detectar que
  // el usuario ha empezado a decir algo (barge-in): en cuanto llega cualquier
  // resultado (aunque sea provisional) se corta la voz y se pregunta si quería
  // decir algo. Aviso: sin cancelación de eco garantizada, en algunos
  // dispositivos podría confundir la propia voz de la IA saliendo por el
  // altavoz con la del usuario — pendiente de afinar con pruebas reales en
  // un móvil, no se ha podido verificar este camino concreto en este entorno
  // (sin acceso a micrófono real).
  const stopCallInterruptWatch = () => {
    if (!callInterruptRecognition) return;
    try {
      callInterruptRecognition.onresult = null;
      callInterruptRecognition.onerror = null;
      callInterruptRecognition.onend = null;
      // abort() en vez de stop(): en Safari/iOS, stop() espera a que la
      // sesión de reconocimiento "termine con educación" antes de soltar
      // el micrófono, y en la práctica a veces no llega a soltarlo del
      // todo. abort() cancela en el acto, sin esperar resultado final.
      callInterruptRecognition.abort();
    } catch (_) {}
    callInterruptRecognition = null;
  };
  const startCallInterruptWatch = (onInterrupt) => {
    if (!hasSpeechRecognition() || !callState.active) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      callInterruptRecognition = new Recognition();
      callInterruptRecognition.lang = 'es-ES';
      callInterruptRecognition.interimResults = true;
      callInterruptRecognition.continuous = true;
      let triggered = false;
      callInterruptRecognition.onresult = (e) => {
        if (triggered) return;
        const hasSpeech = Array.from(e.results).some((r) => (r[0]?.transcript || '').trim().length > 0);
        if (hasSpeech) { triggered = true; onInterrupt(); }
      };
      callInterruptRecognition.onerror = () => {}; // ruido/silencio: se ignora, es solo un oído de fondo
      callInterruptRecognition.onend = () => {};
      callInterruptRecognition.start();
    } catch (_) {
      callInterruptRecognition = null;
    }
  };

  // Habla usando el mismo motor SPEECH (Web Speech API) que la audioguía,
  // reutilizando el mecanismo de "texto puntual" (overrideText) ya probado
  // con las revelaciones del quiz — así no hay que duplicar lógica de voces/
  // ritmo/pitch. No usa STATE.audio.playing/timer: la llamada tiene su
  // propio estado (callState), independiente del reproductor de la ficha.
  // interruptible: si el usuario empieza a hablar mientras esto suena, se
  // corta y se gestiona como interrupción (ver handleCallInterruption) en
  // vez de esperar a que termine todo el parlamento.
  const speakCallText = (text, onDone, { interruptible = false } = {}) => {
    setCallAvatarState('-speaking');
    if (!SPEECH.isSupported()) { setCallAvatarState(null); onDone && onDone(); return; }
    STATE.audio.overrideText = text;
    if (interruptible) {
      startCallInterruptWatch(() => {
        stopCallInterruptWatch();
        // SPEECH.cancel() dispara un evento "canceled" que el propio motor
        // SPEECH ignora a propósito (no llama a onEndCallback), así que la
        // interrupción se gestiona aquí mismo, no esperando ese callback.
        SPEECH.cancel();
        handleCallInterruption();
      });
    }
    SPEECH.speak(() => {
      stopCallInterruptWatch();
      STATE.audio.overrideText = null;
      setCallAvatarState(null);
      // Margen antes de seguir (normalmente, volver a escuchar): parar un
      // reconocimiento de voz (el "oído de fondo" de la interrupción) y
      // arrancar otro inmediatamente después (el de escucha real) en el
      // mismo instante falla en la práctica en varios navegadores — el
      // anterior no ha soltado el micrófono todavía — y el intento de
      // escuchar caía a texto sin motivo real. Con este margen se evita
      // esa carrera; se aplica siempre, no solo si hubo interrupción.
      setTimeout(() => { onDone && onDone(); }, 300);
    });
  };

  const startCallListening = (handler) => {
    if (!callState.active) return;
    callState.nextHandler = handler || handleCallUserInput;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { focusCallTextInput(callState.nextHandler); return; }
    $('#aiCallTextRow').hidden = true;
    setCallStatus(t('callListening'));
    setCallAvatarState('-listening');
    try {
      callRecognition = new Recognition();
      callRecognition.lang = 'es-ES';
      callRecognition.interimResults = false;
      callRecognition.continuous = false;
      callRecognition.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        callState.nextHandler(transcript);
      };
      callRecognition.onerror = () => { if (callState.active) focusCallTextInput(callState.nextHandler); };
      callRecognition.onend = () => setCallAvatarState(null);
      callRecognition.start();
    } catch (_) {
      focusCallTextInput(callState.nextHandler);
    }
  };

  const askCallForMore = (poi) => {
    if (!callState.active) return;
    const more = t('callAskMore');
    setCallStatus(more);
    speakCallText(more, () => {
      if (!callState.active) return;
      if (hasSpeechRecognition()) startCallListening(handleCallUserInput);
      else focusCallTextInput(handleCallUserInput);
    }, { interruptible: true });
  };

  // Se llama cuando el "oído" de fondo detecta que el usuario ha empezado a
  // hablar mientras la IA respondía: corta, pregunta si quería decir algo, y
  // el siguiente turno se enruta a handleInterruptionReply (no directamente
  // a queueCallTurn) para distinguir "quería seguir escuchando" de "tenía
  // una pregunta nueva".
  const handleCallInterruption = () => {
    if (!callState.active) return;
    STATE.audio.overrideText = null;
    setCallAvatarState(null);
    const ask = t('callDidYouSaySomething');
    appendCallBubble('assistant', ask);
    setCallStatus(ask);
    speakCallText(ask, () => {
      if (!callState.active) return;
      if (hasSpeechRecognition()) startCallListening(handleInterruptionReply);
      else focusCallTextInput(handleInterruptionReply);
    }, { interruptible: true });
  };

  const handleInterruptionReply = (raw) => {
    const t = (raw || '').trim();
    if (!t || CALL_CONTINUE_RE.test(t)) {
      askCallForMore(callState.poi);
      return;
    }
    appendCallBubble('user', t);
    if (CALL_END_RE.test(t)) {
      const bye = pickDual(UI_STRINGS.callBye);
      setCallStatus(bye);
      speakCallText(bye, () => closeAiCallMode());
      return;
    }
    queueCallTurn(t);
  };

  const queueCallTurn = async (userText) => {
    if (!callState.active || !callState.poi) return;
    const poi = callState.poi;
    setCallStatus(t('callThinking'));
    setCallAvatarState(null);
    STATE.ai.pending = true;
    if (STATE.activePoiId === poi.id) updateAudioUi();
    aiHistoryFor(poi.id).push({ role: 'user', text: userText });
    // La IA real puede tardar bastantes segundos en responder (más aún si
    // hay que reintentar por saturación): sin este aviso, "Pensando…" se
    // queda ahí quieto y parece que la llamada se ha colgado sin más.
    const slowTimer = setTimeout(() => {
      if (callState.active) {
        setCallStatus(t('callStillThinking'));
      }
    }, 6000);
    let text;
    try {
      // concise: en una llamada de voz nadie quiere un párrafo entero para
      // saber, por ejemplo, cuánto mide algo (ver systemPromptFor) — a
      // diferencia del chat de texto normal, que sí busca respuestas ricas.
      // También se pide un max_tokens menor (ver fetchOpenAI): con menos
      // margen el modelo tiene menos "hueco" para pensar de más, lo que en
      // la práctica también ayuda a que responda antes.
      text = await LLM.generate({
        poi,
        mode: STATE.mode,
        userQuery: userText,
        optionId: null,
        cityName: CURRENT_CITY ? CURRENT_CITY.name : 'la ciudad',
        concise: true
      });
      aiHistoryFor(poi.id).push({ role: 'assistant', text });
      saveState();
    } catch (e) {
      text = t('callAnswerFailed');
    } finally {
      clearTimeout(slowTimer);
      STATE.ai.pending = false;
      if (STATE.activePoiId === poi.id) updateAudioUi();
    }
    if (!callState.active) return; // se colgó mientras esperaba la respuesta
    appendCallBubble('assistant', text);
    setCallStatus(t('callSpeaking'));
    speakCallText(text, () => askCallForMore(poi), { interruptible: true });
  };

  const handleCallUserInput = (raw) => {
    const t = (raw || '').trim();
    if (!t) {
      // No se capturó nada (silencio, ruido): reintenta escuchar en vez de
      // dejar la llamada colgada sin más.
      if (hasSpeechRecognition()) startCallListening(handleCallUserInput);
      else focusCallTextInput(handleCallUserInput);
      return;
    }
    appendCallBubble('user', t);
    if (CALL_END_RE.test(t)) {
      const bye = pickDual(UI_STRINGS.callBye);
      setCallStatus(bye);
      speakCallText(bye, () => closeAiCallMode());
      return;
    }
    queueCallTurn(t);
  };

  const closeAiCallMode = () => {
    callState.active = false;
    callState.poi = null;
    callState.nextHandler = null;
    // abort() en vez de stop(), mismo motivo que en stopCallInterruptWatch:
    // más fiable soltando el micrófono en Safari/iOS al colgar.
    try { callRecognition?.abort(); } catch (_) {}
    callRecognition = null;
    stopCallInterruptWatch();
    SPEECH.cancel();
    STATE.audio.overrideText = null;
    const modal = $('#aiCallModal');
    if (modal) { modal.classList.remove('-open'); modal.setAttribute('aria-hidden', 'true'); }
  };

  const openAiCallMode = () => {
    if (!STATE.activePoiId) return;
    const poi = POIS.find((p) => p.id === STATE.activePoiId);
    if (!poi) return;
    const modal = $('#aiCallModal');
    if (!modal) return;
    stopAudio(); // la audioguía y la llamada no deben sonar a la vez
    callState.active = true;
    callState.poi = poi;
    callState.nextHandler = handleCallUserInput;
    $('#aiCallTranscript').innerHTML = '';
    $('#aiCallTextRow').hidden = true;
    $('#aiCallInput').value = '';
    modal.classList.add('-open');
    modal.setAttribute('aria-hidden', 'false');
    const greet = t('callGreetListen').replace('{name}', pickDual(poi.name));
    setCallStatus(greet);
    appendCallBubble('assistant', greet);
    speakCallText(greet, () => {
      if (!callState.active) return;
      if (hasSpeechRecognition()) startCallListening(handleCallUserInput);
      else focusCallTextInput(handleCallUserInput);
    }, { interruptible: true });
  };

  const wireAiCallModal = () => {
    const modal = $('#aiCallModal');
    if (!modal) return;
    $('#aiCallBtn')?.addEventListener('click', openAiCallMode);
    $('#aiCallClose')?.addEventListener('click', closeAiCallMode);
    $('#aiCallEnd')?.addEventListener('click', closeAiCallMode);
    const input = $('#aiCallInput');
    const submit = () => {
      const t = (input.value || '').trim();
      if (!t) return;
      input.value = '';
      (callState.nextHandler || handleCallUserInput)(t);
    };
    $('#aiCallSend')?.addEventListener('click', submit);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAiCallMode(); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('-open')) closeAiCallMode();
    });
  };

  /* =========================================================
   * POI SELECTION + SHEET
   * =======================================================*/
  const selectPoi = (id, centerMap = false) => {
    // Si se salta directo a otro POI mientras "Profundiza más" del POI
    // anterior seguía en curso (deepenBusy=true, esperando a que terminase
    // de sonar su párrafo), hay que resolver esa promesa pendiente aquí
    // igual que se hace al tocar otro chip o al mandar una pregunta suelta
    // (ver abandonDeepenFlow) — si no, resetAudio() de abajo para el audio
    // con stopAudio(), que a propósito NO dispara ese callback pendiente, y
    // deepenBusy se queda en true para siempre. Como es una bandera GLOBAL
    // (no por POI), eso dejaba el botón "Profundiza más" bloqueado en
    // cualquier parada nueva que se abriera después, aunque no tuviera
    // nada que ver con la anterior — el bug real reportado en producción.
    if (STATE.ai.deepenBusy) abandonDeepenFlow();
    // Si había una ficha efímera de escaneo abierta y se salta directo a
    // otro POI sin cerrarla antes, hay que limpiarla igual (closeSheet no
    // llega a ejecutarse en ese camino).
    if (STATE.activePoiId && STATE.activePoiId !== id) cleanupAdHocScanIfNeeded(STATE.activePoiId);
    STATE.activePoiId = id;
    const poi = POIS.find((p) => p.id === id);
    if (!poi) return;
    closeRouteIntro(); // no dejar la intro de la ruta sonando por encima del POI
    setSelectedMarker(id);
    populateSheetContent(id);
    resetAudio(poi.audio.duration);
    ensureAiPanelInitialGreet(poi);
    openSheet();
    if (centerMap && map) map.flyTo([poi.coords[0] - 0.0015, poi.coords[1]], 16.5, { duration: 0.7 });
    // El audio del resumen se autorreproduce cuando llega (ver queueAiMessage),
    // no aquí, para no arrancar dos veces la narración con el texto de relleno.
    // Guarda ya qué POI quedó abierto: si el sistema mata la app en segundo
    // plano (p.ej. al volver de "Cómo llegar" en Google Maps) antes de que
    // cualquier otro saveState() se dispare, resumeSavedSession puede
    // reabrir esta misma ficha con su chat al volver a abrir la app.
    saveState();
  };

  const openSheet = () => {
    STATE.sheet = 'open';
    els.backdrop.classList.add('-open');
    els.sheet.classList.add('-open');
    try { els.sheet.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };
  const closeSheet = () => {
    // Mismo motivo que en selectPoi: si se cierra la ficha (X, fondo,
    // Escape) mientras "Profundiza más" seguía en curso, hay que resolver
    // esa promesa pendiente antes de que stopAudio() la deje huérfana para
    // siempre (ver abandonDeepenFlow).
    if (STATE.ai.deepenBusy) abandonDeepenFlow();
    cleanupAdHocScanIfNeeded(STATE.activePoiId);
    // EXPERIMENTO TEMPORAL — PATROCINIOS DEMO: BORRAR esta línea junto con
    // flushSponsorDemoMetrics más arriba.
    flushSponsorDemoMetrics();
    STATE.sheet = 'closed';
    STATE.activePoiId = null;
    els.backdrop.classList.remove('-open');
    els.sheet.classList.remove('-open');
    try { els.sheet.setAttribute('aria-hidden', 'true'); } catch (_) {}
    stopAudio();
    clearSelectedMarker();
    closeLightbox();
    // Para que un cierre deliberado de la ficha no la reabra sola en la
    // próxima sesión (ver resumeSavedSession) — mismo motivo que el
    // saveState() añadido en selectPoi.
    saveState();
  };

  // Últimos src/alt pedidos, para que el botón de reintentar (fijo en el
  // DOM, cableado una sola vez en wireEvents) pueda volver a arrancar todo
  // el proceso sin depender del cierre de esta función.
  let lastLightboxSrc = null, lastLightboxAlt = '';
  const openLightbox = (smallSrc, alt) => {
    if (!els.lightbox || !smallSrc) return;
    lastLightboxSrc = smallSrc;
    lastLightboxAlt = alt || '';
    const img = $('.lightbox-img', els.lightbox);
    const retryBtn = $('.lightbox-retry', els.lightbox);
    const originalSrc = getOriginalImageUrl(smallSrc);
    let retriedSmall = false;
    const tryLoad = (stage, src) => {
      img.dataset.stage = stage;
      img.hidden = false;
      if (retryBtn) retryBtn.hidden = true;
      img.src = src;
    };
    // Cadena de fallback: 1200px → original sin recortar → miniatura
    // pequeña (esta última garantizada, ya que es la que se ve en la
    // ficha). Si incluso esa falla — típico con cobertura floja en cascos
    // históricos — se reintenta una vez tras 1s antes de rendirse y dejar
    // un botón para reintentar a mano en vez de un icono de imagen rota.
    img.onerror = () => {
      if (img.dataset.stage === 'large') {
        tryLoad('original', originalSrc);
      } else if (img.dataset.stage === 'original') {
        tryLoad('small', smallSrc);
      } else if (!retriedSmall) {
        retriedSmall = true;
        setTimeout(() => tryLoad('small', smallSrc), 1000);
      } else {
        img.hidden = true;
        if (retryBtn) retryBtn.hidden = false;
      }
    };
    img.alt = lastLightboxAlt;
    tryLoad('large', getLargeImageUrl(smallSrc));
    els.lightbox.classList.add('-open');
    els.lightbox.setAttribute('aria-hidden', 'false');
  };
  const closeLightbox = () => {
    if (!els.lightbox) return;
    els.lightbox.classList.remove('-open');
    els.lightbox.setAttribute('aria-hidden', 'true');
  };

  // "Visitado" = se ha abierto su ficha al menos una vez (ensureAiPanelInitialGreet
  // guarda un saludo en perPoiHistory la primera vez que se abre), sin importar
  // si luego se ha vuelto a cerrar. Se recalcula cada vez que se abre el modal
  // en vez de guardarse aparte, para no duplicar estado.
  const openVisitSummary = () => {
    if (!els.visitSummary || !CURRENT_CITY) return;
    // Igual que en renderMarkers: las fichas efímeras de escaneo no son
    // POIs de la ciudad y no deben contar aquí.
    const realPois = POIS.filter((p) => !p.isAdHocScan);
    const visited = realPois.filter((p) => (STATE.ai.perPoiHistory[p.id] || []).length > 0);
    const total = realPois.length;
    const level = getExplorerLevel(STATE.game.points);

    $('#visitSummaryTitle', els.visitSummary).textContent = t('yourTripThrough').replace('{city}', CURRENT_CITY.name);
    $('#visitSummaryStat', els.visitSummary).textContent =
      t('placesVisited').replace('{visited}', visited.length).replace('{total}', total);
    $('#visitSummaryFill', els.visitSummary).style.width =
      `${total ? Math.round((visited.length / total) * 100) : 0}%`;
    const pointsEl = $('#visitSummaryPoints', els.visitSummary);
    pointsEl.textContent = `⭐ ${STATE.game.points} · ${pickLang(level.label)}`;
    pointsEl.style.setProperty('--explorer-color', level.color);

    // Progreso hacia la insignia de ESTA ciudad (ver checkCityBadge): solo
    // se muestra si la ciudad activa tiene badgeThreshold definido en
    // data/core.js (todas lo tienen, pero por si acaso).
    const badgeBox = $('#visitSummaryBadge', els.visitSummary);
    if (badgeBox) {
      if (CURRENT_CITY.badgeThreshold) {
        badgeBox.hidden = false;
        const earned = STATE.game.cityBadges.includes(CURRENT_CITY.id);
        const cityPts = cityPointsEarned();
        const pct = Math.min(100, Math.round((cityPts / CURRENT_CITY.badgeThreshold) * 100));
        $('#visitSummaryBadgeLabel', els.visitSummary).textContent = earned
          ? t('cityBadgeEarned').replace('{city}', CURRENT_CITY.name)
          : t('cityBadgeProgress').replace('{city}', CURRENT_CITY.name).replace('{points}', cityPts).replace('{threshold}', CURRENT_CITY.badgeThreshold);
        $('#visitSummaryBadgeFill', els.visitSummary).style.width = `${pct}%`;
        const badgeCanvas = $('#visitSummaryBadgeIcon', els.visitSummary);
        badgeCanvas.classList.toggle('-locked', !earned);
        if (CURRENT_CITY.badgeImg) {
          loadExplorerSprite(CURRENT_CITY.badgeImg).then((sprite) => {
            const ctx = badgeCanvas.getContext('2d');
            ctx.clearRect(0, 0, badgeCanvas.width, badgeCanvas.height);
            const scale = Math.min(badgeCanvas.width / sprite.width, badgeCanvas.height / sprite.height);
            const w = sprite.width * scale, h = sprite.height * scale;
            ctx.drawImage(sprite, (badgeCanvas.width - w) / 2, (badgeCanvas.height - h) / 2, w, h);
          }).catch(() => {});
        }
      } else {
        badgeBox.hidden = true;
      }
    }

    const list = $('#visitSummaryList', els.visitSummary);
    list.innerHTML = realPois.map((p) => {
      const isVisited = (STATE.ai.perPoiHistory[p.id] || []).length > 0;
      return `<li data-visited="${isVisited}">
        <span class="visit-summary-check" aria-hidden="true">${isVisited ? '✅' : '⬜'}</span>
        <span>${pickDual(p.name)}</span>
      </li>`;
    }).join('');

    els.visitSummary.classList.add('-open');
    els.visitSummary.setAttribute('aria-hidden', 'false');
  };
  const closeVisitSummary = () => {
    if (!els.visitSummary) return;
    els.visitSummary.classList.remove('-open');
    els.visitSummary.setAttribute('aria-hidden', 'true');
  };

  // Reintento de la miniatura de la ficha: con cobertura floja (típico en
  // cascos históricos) a veces la primera petición a Wikimedia no llega a
  // tiempo. Un solo reintento automático al segundo suele bastar; si
  // también falla, se deja un botón de recarga a mano en vez de dejar el
  // icono de imagen rota del navegador.
  const setSheetThumbImage = (src, alt) => {
    const img = $('.sheet-thumb', els.sheet);
    const retryBtn = $('.sheet-thumb-retry', els.sheet);
    if (!img) return;
    img.alt = alt || '';
    if (retryBtn) retryBtn.hidden = true;
    let retried = false;
    img.onerror = () => {
      if (!retried) {
        retried = true;
        setTimeout(() => { img.src = src; }, 1000);
      } else {
        img.onerror = null;
        if (retryBtn) retryBtn.hidden = false;
      }
    };
    img.onload = () => { if (retryBtn) retryBtn.hidden = true; };
    img.src = src;
  };

  const populateSheetContent = (id) => {
    const poi = POIS.find((p) => p.id === id);
    if (!poi) return;
    const meta = CATEGORY_META[poi.category];

    // EXPERIMENTO (rama experimento-diseno-editorial): tiñe toda la ficha
    // (cabecera + audioguía + controles del chat) con el MISMO color que ya
    // usa el pin de esa categoría en el mapa (getCategoryPinColor: azul
    // Museos, amarillo Restauración, verde Interés) -- antes usaba
    // meta.accent, una paleta distinta (terracota/ocre/teal) que no
    // coincidía con el color del pin y desentonaba al abrir la ficha. Se
    // fija en els.sheet (el .bottom-sheet entero) y no en .sheet-head para
    // que la custom property herede hacia abajo a los botones de
    // audio/chat también (una custom property no "sube" desde un hijo).
    const accentColor = getCategoryPinColor(poi.category);
    if (els.sheet) {
      els.sheet.style.setProperty('--sheet-accent-raw', accentColor);
    }
    const sheetHead = $('.sheet-head', els.sheet);
    if (sheetHead) {
      sheetHead.setAttribute('data-tinted', 'true');
    }

    setSheetThumbImage(poi.image, pickDual(poi.name));
    $('.sheet-cat-badge', els.sheet).textContent = pickDual(meta.label)
      + (poi.fictional ? t('fictionalBadge') : '');
    $('.sheet-title', els.sheet).textContent = pickDual(poi.name);
    $('.sheet-sub', els.sheet).textContent = pickDual(poi.subtitle);
    updateSheetDistance(id);
    // EXPERIMENTO TEMPORAL — PATROCINIOS DEMO (rama experimento-patrocinios-demo).
    // BORRAR esta llamada junto con el bloque de funciones más arriba.
    renderSponsorDemoInsert(poi);

    // EXPERIMENTO (rama experimento-diseno-editorial): "Cómo llegar" ya no
    // es un chip de la fila de abajo (ver renderAiSuggestions) sino este
    // icono fijo junto al de cerrar -- mismo criterio de antes (solo si el
    // POI trae coords) para decidir si se muestra.
    const dirBtn = $('#sheetDirectionsBtn', els.sheet);
    if (dirBtn) dirBtn.hidden = !poi.coords;

    renderAiSuggestions();
    hideKidsQuiz();

    stopAudio();
    STATE.audio.overrideText = null;
    STATE.audio.duration = poi.audio.duration;
    STATE.audio.currentTime = 0;
    $('.audio-title', els.sheet).textContent = pickDual(poi.audio.title);
    updateAudioUi();
  };

  /* =========================================================
   * SPEECH SYNTHESIS (real voice via Web Speech API)
   * · Fix crítico iOS Safari: speak() SÓLO funciona si se
   *   llama DIRECTAMENTE dentro del click/tap del usuario
   *   (sin ningún setTimeout/Promise/await de por medio).
   * =======================================================*/
  const SPEECH = (() => {
    const S = STATE.audio.speech;
    const synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;
    S.supported = !!synth && 'SpeechSynthesisUtterance' in window;

    const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Nombres que en la práctica suenan mucho menos "robóticas" que las voces
    // clásicas offline de cada sistema (Windows SAPI, etc.): voces neuronales/
    // online de Google, Microsoft Edge, Amazon o Apple. La elección es siempre
    // automática (mejor voz española disponible en el sistema del usuario),
    // sin selector manual: menos que decidir, y evita ofrecer una voz que
    // luego no siga instalada en otro dispositivo.
    const QUALITY_NAME_RE = /online|natural|neural|enhanced|premium|wavenet|google|chirp|journey|studio|plus|siri/i;
    // Voces "compactas" offline: son las más robóticas de todas (motor SAPI
    // muy antiguo en iOS/Android si no se ha descargado una voz mejorada).
    // Se evitan activamente aunque sean la única voz "es-ES" disponible, y
    // solo se usan como último recurso si no queda ninguna otra opción.
    const LOW_QUALITY_NAME_RE = /compact/i;

    // Antes solo elegía español; ahora resuelve según STATE.lang para que
    // el modo Inglés use una voz inglesa en vez de leer el texto en inglés
    // con acento/voz española.
    const pickVoiceForLang = () => {
      if (!S.supported) return null;
      try {
        const all = (synth.getVoices && synth.getVoices()) || [];
        S.voices = all;
        const prefer = STATE.lang === 'en' ? [
          (v) => /^en/i.test(v.lang) && QUALITY_NAME_RE.test(v.name || ''),
          (v) => /en[-_]US/i.test(v.lang) && !LOW_QUALITY_NAME_RE.test(v.name || ''),
          (v) => /^en/i.test(v.lang) && !LOW_QUALITY_NAME_RE.test(v.name || ''),
          (v) => /en[-_]US/i.test(v.lang),
          (v) => /^en/i.test(v.lang),
          (v) => !!v
        ] : [
          (v) => /^es/i.test(v.lang) && QUALITY_NAME_RE.test(v.name || ''),
          (v) => /es[-_]ES/i.test(v.lang) && /Monica|Jorge|Diego|sabina|lucia|paulina|elvira|alvaro|isabela/i.test(v.name || ''),
          (v) => /es[-_]ES/i.test(v.lang) && !LOW_QUALITY_NAME_RE.test(v.name || ''),
          (v) => /^es/i.test(v.lang) && !LOW_QUALITY_NAME_RE.test(v.name || ''),
          (v) => /es[-_]ES/i.test(v.lang),
          (v) => /^es/i.test(v.lang),
          (v) => !!v
        ];
        for (const fn of prefer) {
          const hit = all.find(fn);
          if (hit) { S.pickedVoice = hit; return hit; }
        }
        S.pickedVoice = all[0] || null;
        return S.pickedVoice;
      } catch (_) { return S.pickedVoice || null; }
    };

    let warmedUp = false;
    const warmUp = () => {
      if (!S.supported || warmedUp || !IS_IOS) { warmedUp = true; return; }
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        u.rate = 1;
        u.lang = 'es-ES';
        u.onend = u.onerror = () => {};
        synth.speak(u);
        warmedUp = true;
      } catch (_) {}
    };

    if (S.supported) {
      pickVoiceForLang();
      try { synth.onvoiceschanged = pickVoiceForLang; } catch (_) {}
      setTimeout(pickVoiceForLang, 500);
      setTimeout(pickVoiceForLang, 1500);
      setTimeout(pickVoiceForLang, 3000);

      const unlockVoiceOnce = () => {
        if (warmedUp) return;
        warmUp();
        try {
          synth.cancel();
          const u = new SpeechSynthesisUtterance('.');
          u.volume = 0.01;
          u.rate = 2;
          u.lang = 'es-ES';
          u.onend = u.onerror = () => {};
          synth.speak(u);
          warmedUp = true;
        } catch (_) { warmedUp = true; }
        document.removeEventListener('click', unlockVoiceOnce, true);
        document.removeEventListener('touchstart', unlockVoiceOnce, true);
      };
      document.addEventListener('click', unlockVoiceOnce, true);
      document.addEventListener('touchstart', unlockVoiceOnce, true);
    }

    // La síntesis de voz de algunos sistemas "lee" los emoji en voz alta
    // (por ejemplo 📌 se pronuncia como "chincheta"). Los quitamos SOLO del
    // texto que se narra; el texto mostrado en el chat conserva sus emoji.
    const stripEmojiForSpeech = (text) => Array.from(text || '').filter((ch) => {
      const cp = ch.codePointAt(0);
      if (cp === 0xFE0F || cp === 0x200D || cp === 0x20E3) return false; // variation selector, ZWJ, keycap
      if (cp >= 0x1F000 && cp <= 0x1FFFF) return false; // emoji: emoticonos, símbolos, transporte, etc.
      if (cp >= 0x2600 && cp <= 0x27BF) return false; // símbolos varios y dingbats (✨ ☀ etc.)
      if (cp >= 0x2B00 && cp <= 0x2BFF) return false; // símbolos varios y flechas (⭐ etc.)
      return true;
    }).join('');

    // La IA a veces devuelve el texto con formato markdown (**negrita**,
    // # títulos, listas con "-", etc.), pensado para leerse en pantalla —
    // pero la síntesis de voz lee los símbolos literalmente ("asterisco
    // asterisco"). Se quitan solo de cara a la narración; el texto que se
    // muestra en el chat conserva el markdown tal cual (por si algún día se
    // renderiza con formato).
    const stripMarkdownForSpeech = (text) => (text || '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`{1,3}([^`]*?)`{1,3}/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '');

    const buildNarrativeText = () => {
      // Texto puntual (revelación de una pregunta del quiz, o la intro de
      // una ruta): se dice directo, sin depender de que haya un POI activo
      // (una intro de ruta se narra antes de elegir ningún lugar concreto).
      if (STATE.audio.overrideText) {
        return stripEmojiForSpeech(stripMarkdownForSpeech(STATE.audio.overrideText)).replace(/\s+/g, ' ').trim().slice(0, 6000);
      }
      const poi = POIS.find((p) => p.id === STATE.activePoiId);
      if (!poi) return '';
      const m = STATE.mode;
      // Nombre real también al hablar en modo niño (el apodo divertido es
      // solo texto en pantalla; decirlo en voz alta con el "—" queda raro).
      const name = pickLang(poi.name).adult;
      const subtitle = pickDual(poi.subtitle);
      const hist = aiHistoryFor(poi.id).filter((x) => x.role === 'assistant');
      // Reconoce el texto de una revelación de quiz (empieza siempre con uno
      // de estos dos prefijos fijos, ver answerKidsQuiz) para poder
      // descartarlo aquí aunque venga de un historial guardado por una
      // versión antigua, sin la marca isSummary ni en la posición esperada
      // (p.ej. si en su momento se respondió una pregunta antes de que
      // terminara de llegar el resumen inicial).
      const looksLikeQuizReveal = (text) => /^(🎉 ¡Correcto!|¡Casi! Era esta|🎉 Correct!|Almost! It was this one)/.test(text || '');
      // En modo niño el audio principal es siempre el resumen original: no
      // hay chips que generen respuestas legítimas adicionales, así que
      // cualquier otro mensaje del historial se ignora aquí a propósito.
      const summaryMsg = hist.find((x) => x.isSummary) || hist.find((x) => !looksLikeQuizReveal(x.text));
      // Si NINGÚN mensaje guardado sirve como resumen (p.ej. un historial
      // viejo donde todas las respuestas registradas son revelaciones del
      // quiz, sin que llegara a guardarse nunca un resumen real), no se cae
      // a hist[0] a ciegas: se trata igual que si no hubiera historial.
      const body = m === 'kids'
        ? (summaryMsg ? summaryMsg.text : (pickDual(poi.tabs.history) || ''))
        : (hist.length ? hist[hist.length - 1].text : (pickDual(poi.tabs.history) || ''));
      // El título y subtítulo solo se dicen en la primera narración (el
      // resumen inicial al tocar el pin); en las siguientes respuestas
      // (chips, "profundiza más", preguntas) se habla directo, sin repetirlo.
      // El texto de tabs.history no trae su propia introducción (a
      // diferencia del resumen generado, que ya empieza con su propio
      // gancho), así que cuando se usa como respaldo en modo niño también
      // lleva el saludo, aunque el historial ya tenga mensajes antiguos.
      const usingFallbackHistory = m === 'kids' && !summaryMsg;
      const isFirstNarration = usingFallbackHistory || hist.length <= 1;
      // Si la intro básica local ya se narró al abrir este lugar en esta
      // misma sesión (ver ensureAiPanelInitialGreet), el nombre y el
      // subtítulo ya se han dicho justo antes: añadir este otro saludo
      // encima sería la misma repetición que se quiso evitar ahí. Solo se
      // usa este saludo de respaldo si, por lo que sea, esa intro local no
      // llegó a sonar (SPEECH sin soporte, o un resumen recuperado tras
      // recargar la página sin volver a narrar nada).
      const localIntroAlreadySpoken = !!STATE.ai.localIntroSpoken[poi.id];
      const intro = (!isFirstNarration || localIntroAlreadySpoken) ? '' : (m === 'kids')
        ? `¡Hola! Vamos a descubrir ${name}. ${subtitle}. ¡Pon mucha atención! `
        : `Audioguía de ${name}. ${subtitle}. `;
      // El límite era 1800 y cortaba el audio a media frase en respuestas
      // reales de "profundiza más" más largas de lo habitual (el texto
      // mostrado en pantalla no tiene este límite, así que se veía más
      // texto del que llegaba a narrarse). 6000 da margen de sobra incluso
      // para una respuesta larga con max_tokens 3500, y sigue actuando de
      // red de seguridad ante un texto verdaderamente desbocado.
      return stripEmojiForSpeech(stripMarkdownForSpeech(intro + body)).replace(/\s+/g, ' ').trim().slice(0, 6000);
    };

    let delayedCancelTimer = null;
    let startWatchTimer = null;

    const clearDelayedCancel = () => {
      if (!delayedCancelTimer) return;
      clearTimeout(delayedCancelTimer);
      delayedCancelTimer = null;
    };
    const clearStartWatch = () => {
      if (!startWatchTimer) return;
      clearTimeout(startWatchTimer);
      startWatchTimer = null;
    };

    const cancel = (aggressive = true) => {
      if (!S.supported) return;
      clearDelayedCancel();
      clearStartWatch();
      try {
        synth.cancel();
        if (aggressive) {
          delayedCancelTimer = setTimeout(() => {
            delayedCancelTimer = null;
            try { synth.cancel(); } catch (_) {}
          }, 20);
        }
      } catch (_) {}
      S.utterance = null;
    };

    const pause = () => {
      if (!S.supported) return;
      try { synth.pause(); } catch (_) {}
    };

    const resume = () => {
      if (!S.supported) return;
      try { synth.resume(); } catch (_) {}
    };

    // startRatio (0-1, ver seekAudioTo): Web Speech no permite saltar a un
    // punto exacto de una narración ya en marcha, a diferencia de un
    // <audio> real — se aproxima recortando el texto a partir de la
    // palabra que le correspondería a ese punto y empezando ahí una
    // utterance nueva. No es exacto al segundo, pero usa el mismo cálculo
    // de palabras/minuto que ya alimenta la barra de progreso
    // (estimateSpeechDuration), así que queda consistente con lo que se
    // ve en pantalla.
    const speak = (onEndCallback, startRatio = 0) => {
      if (!S.supported) return false;
      warmUp();
      pickVoiceForLang();
      try { synth.resume(); } catch (_) {}

      const fullText = buildNarrativeText();
      if (!fullText) return false;
      const words = fullText.split(/\s+/).filter(Boolean);
      const startWordIndex = startRatio > 0 ? Math.min(words.length - 1, Math.floor(startRatio * words.length)) : 0;
      const text = startWordIndex > 0 ? words.slice(startWordIndex).join(' ') : fullText;
      cancel(false);

      const makeUtt = (usePickedVoice = true) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = STATE.lang === 'en' ? 'en-US' : 'es-ES';
        // Ritmo y tono algo más pausados y graves que el neutro (1/1) leen
        // como una voz más cálida y menos robótica en la mayoría de motores;
        // en niños se mantiene la energía pero se suaviza el agudo "chillón".
        u.rate = STATE.mode === 'kids' ? 1.05 : 0.93;
        u.pitch = STATE.mode === 'kids' ? 1.14 : 0.95;
        u.volume = 1;
        if (usePickedVoice && S.pickedVoice) {
          try { u.voice = S.pickedVoice; } catch (_) {}
        }
        u.onstart = () => { clearStartWatch(); };
        u.onend = () => {
          clearStartWatch();
          S.utterance = null;
          if (typeof onEndCallback === 'function') onEndCallback({ finished: true });
        };
        u.onerror = (ev) => {
          clearStartWatch();
          S.utterance = null;
          if (ev && typeof ev.error === 'string' && /canceled|interrupted/i.test(ev.error)) return;
          if (typeof onEndCallback === 'function') {
            onEndCallback({ finished: false, error: true, reason: ev?.error || 'unknown' });
          }
        };
        return u;
      };

      const u1 = makeUtt();
      S.utterance = u1;
      let ok = false;
      try {
        synth.speak(u1);
        ok = true;
      } catch (_) { ok = false; }

      if (!ok) return false;

      startWatchTimer = setTimeout(() => {
        try {
          if (S.utterance !== u1 || synth.speaking || synth.pending) return;
          synth.cancel();
          const u2 = makeUtt(false);
          S.utterance = u2;
          synth.speak(u2);
          startWatchTimer = setTimeout(() => {
            if (S.utterance !== u2 || synth.speaking || synth.pending) return;
            S.utterance = null;
            if (typeof onEndCallback === 'function') {
              onEndCallback({ finished: false, error: true, startFailed: true });
            }
          }, IS_IOS ? 420 : 700);
        } catch (_) {
          S.utterance = null;
          if (typeof onEndCallback === 'function') {
            onEndCallback({ finished: false, error: true, startFailed: true });
          }
        }
      }, IS_IOS ? 180 : 350);

      if (IS_IOS) {
        setTimeout(() => {
          try {
            if (S.utterance === u1 && !synth.speaking && !synth.paused) {
              synth.cancel();
              const u2 = makeUtt();
              S.utterance = u2;
              synth.speak(u2);
            }
          } catch (_) {}
        }, 120);
      }
      return true;
    };

    return {
      isSupported: () => S.supported,
      isSpeaking: () => S.supported ? synth.speaking : false,
      isPaused: () => S.supported ? synth.paused : false,
      getText: buildNarrativeText,
      speak, pause, resume, cancel, warmUp
    };
  })();

  /* =========================================================
   * CLOUD TTS (Google Cloud Text-to-Speech, vía el Worker propio)
   * Prototipo opcional en prueba: si no hay window.LLM_CONFIG.baseUrl
   * configurado, o el Worker no tiene la key de Google puesta, o falla la
   * petición (incluida cuota agotada), todo esto queda inactivo sin más y
   * la app sigue funcionando con SPEECH (Web Speech API) como hasta ahora
   * — nunca se rompe la audioguía por esto.
   *
   * Solo se intenta para el resumen narrado que genera la IA al abrir un
   * POI (kind: 'summary' en queueAiMessage), nunca para el chat ni las
   * revelaciones del quiz: ese texto es dinámico y no compensa cachearlo,
   * así que se queda directamente en Web Speech.
   *
   * El audio se pide una vez por texto exacto (se cachea por hash del
   * texto, no por POI, para que un mismo resumen nunca se vuelva a pagar)
   * y se guarda en Cache Storage — sobrevive a recargas de página, no solo
   * a la sesión actual.
   * =======================================================*/
  const CLOUD_TTS = (() => {
    const baseUrl = (typeof window !== 'undefined' && window.LLM_CONFIG && window.LLM_CONFIG.baseUrl) || '';
    const endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/tts` : '';
    const CACHE_NAME = 'omot-tts-v1';
    // hash(texto) -> URL de objeto ya lista para reproducir sin esperar red
    // ni Cache Storage (que también es async): así startAudio puede mirar
    // esto de forma síncrona en el momento del toque del usuario.
    const readyUrls = new Map();

    // Hash corto no criptográfico: solo hace falta que el mismo texto
    // exacto produzca siempre la misma clave de caché.
    const hashText = (text) => {
      let h = 0;
      for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
      return 'h' + (h >>> 0).toString(36);
    };

    const fetchAndCache = async (text) => {
      if (!endpoint || !text) return null;
      const key = hashText(text);
      if (readyUrls.has(key)) return readyUrls.get(key);
      const cacheKey = `https://tts.cache.local/${key}`;
      try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(cacheKey);
        if (cached) {
          const url = URL.createObjectURL(await cached.blob());
          readyUrls.set(key, url);
          return url;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, lang: STATE.lang }),
          signal: controller.signal
        }).finally(() => clearTimeout(timeout));
        if (!res.ok) return null; // 501 sin configurar, 429/403 sin cuota, etc.
        const blob = await res.blob();
        await cache.put(cacheKey, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
        const url = URL.createObjectURL(blob);
        readyUrls.set(key, url);
        return url;
      } catch (_) {
        return null; // red caída, timeout, etc.: se cae a Web Speech
      }
    };

    const getReadyUrl = (text) => (text ? readyUrls.get(hashText(text)) || null : null);

    return { isConfigured: () => !!endpoint, fetchAndCache, getReadyUrl };
  })();

  // Evita que la pantalla se apague sola por inactividad mientras suena una
  // audioguía: en Android, tanto la voz del navegador (Web Speech, ver
  // SPEECH más abajo) como el <audio> de CLOUD_TTS pueden cortarse cuando la
  // pantalla se apaga, porque Chrome suspende esas APIs en segundo plano
  // para ahorrar batería — no hay forma de hacer que sigan sonando desde
  // JS una vez la pantalla está realmente apagada. Wake Lock no lo arregla
  // del todo (si el usuario pulsa el botón de apagar a propósito, el
  // audio se corta igual), pero cubre el caso más habitual: la pantalla
  // apagándose sola mientras el audio sigue en curso.
  const WAKE_LOCK = (() => {
    let sentinel = null;
    const isSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    const acquire = async () => {
      if (!isSupported() || sentinel) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', () => { sentinel = null; });
      } catch (_) {
        // Puede fallar si el documento no está visible en ese instante
        // (p.ej. se pidió justo al volver de segundo plano): no es un
        // error real, simplemente no hay wake lock que mantener ahora.
        sentinel = null;
      }
    };
    const release = () => {
      if (!sentinel) return;
      sentinel.release().catch(() => {});
      sentinel = null;
    };
    // El propio navegador libera el wake lock al ocultarse la pestaña; si
    // el audio sigue sonando al volver a primer plano, se vuelve a pedir
    // (recomendado por la propia spec de Wake Lock para este caso).
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && STATE.audio.playing) acquire();
      });
    }
    return { acquire, release };
  })();

  /* =========================================================
   * AUDIO PLAYER (visual + real speech when available)
   * =======================================================*/
  // Elemento compartido para reproducir el audio de CLOUD_TTS cuando está
  // disponible; con Web Speech (el camino de siempre) no se usa.
  const cloudAudioEl = (typeof Audio !== 'undefined') ? new Audio() : null;

  // Desbloqueo de audio en iOS Safari: un <audio> solo puede empezar a
  // sonar por su cuenta (fuera de un toque directo) si YA se llamó a
  // play() alguna vez dentro de un toque directo del usuario, igual que
  // SPEECH ya hace para la voz del navegador (ver "Fix crítico iOS Safari"
  // más arriba). El resumen de CLOUD_TTS llega tras esperar a la IA, así
  // que sin este desbloqueo previo, en iPhone se bloquearía en silencio y
  // caería siempre a Web Speech aunque el audio esté listo. Se reproduce
  // un WAV silencioso mínimo una sola vez, sobre este mismo elemento (el
  // desbloqueo es por elemento, no global) — luego se le cambia el "src"
  // real cuando toque, sin perder el desbloqueo.
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  let cloudAudioUnlocked = false;
  const unlockCloudAudioOnce = () => {
    if (cloudAudioUnlocked || !cloudAudioEl) return;
    cloudAudioUnlocked = true;
    try {
      cloudAudioEl.src = SILENT_WAV;
      const p = cloudAudioEl.play();
      if (p && p.catch) p.catch(() => {});
      cloudAudioEl.pause();
    } catch (_) {}
    document.removeEventListener('click', unlockCloudAudioOnce, true);
    document.removeEventListener('touchstart', unlockCloudAudioOnce, true);
  };
  if (cloudAudioEl) {
    document.addEventListener('click', unlockCloudAudioOnce, true);
    document.addEventListener('touchstart', unlockCloudAudioOnce, true);
  }
  const toggleAudio = () => {
    if (!STATE.activePoiId) return;
    if (STATE.audio.playing) {
      const canPause = STATE.audio.engine === 'cloud' || SPEECH.isSupported();
      if (canPause && STATE.audio.currentTime > 0 && STATE.audio.currentTime < STATE.audio.duration) {
        pauseAudio();
      } else {
        stopAudio();
      }
    } else {
      const isPausedMidway = STATE.audio.currentTime > 0 && STATE.audio.currentTime < STATE.audio.duration;
      if (isPausedMidway) {
        startAudio(true);
      } else {
        STATE.audio.currentTime = 0;
        startAudio(false);
      }
    }
  };

  const pauseAudio = () => {
    STATE.audio.playing = false;
    clearInterval(STATE.audio.timer);
    STATE.audio.timer = null;
    if (STATE.audio.engine === 'cloud') {
      cloudAudioEl.pause();
    } else {
      SPEECH.pause();
    }
    WAKE_LOCK.release();
    updateAudioUi();
  };

  // Abandona limpiamente un párrafo de "profundiza más" en curso (relleno
  // local sonando, o esperando a la IA real) cuando el usuario elige otro
  // chip mientras tanto (ver el click handler de los chips en
  // wireEvents). Sin esto, la promesa pendiente de queueDeepenWithFillers
  // (su "await new Promise" a la espera de que termine el audio) se
  // quedaría colgada para siempre — SPEECH.cancel() no dispara el
  // callback de fin a propósito (ver su comentario) — y STATE.ai.deepenBusy
  // nunca volvería a false, dejando el chip "Profundiza más" bloqueado
  // sin que nada lo desbloqueara. Solo resuelve esa promesa pendiente; no
  // toca el audio en sí (eso ya lo hace stopAudio, llamado aparte).
  const abandonDeepenFlow = () => {
    if (typeof STATE.audio.onSegmentEnd !== 'function') return;
    const cb = STATE.audio.onSegmentEnd;
    STATE.audio.onSegmentEnd = null;
    cb();
  };

  // Salta a un punto concreto de la narración al tocar la barra de
  // progreso (ver el listener de .progress-wrap en wireEvents). Con
  // CLOUD_TTS (un <audio> real) es un salto nativo trivial; con Web
  // Speech (el motor habitual, sin soporte real de "seek") se arranca una
  // narración nueva desde ese punto (ver el comentario de startRatio en
  // SPEECH.speak) — siempre pasa a reproducir, aunque estuviera en pausa,
  // igual que al arrastrar la barra de un pódcast.
  const seekAudioTo = (ratio) => {
    if (!STATE.activePoiId) return;
    const duration = STATE.audio.duration || 0;
    if (!duration) return;
    const targetTime = Math.min(duration, Math.max(0, ratio * duration));

    if (STATE.audio.engine === 'cloud' && cloudAudioEl) {
      cloudAudioEl.currentTime = targetTime;
      STATE.audio.currentTime = targetTime;
      STATE.audio.playing = true;
      cloudAudioEl.play().catch(() => {});
      updateAudioUi();
      return;
    }

    if (!SPEECH.isSupported()) return;
    // Conserva el aviso de "fin de segmento" pendiente (si lo había): lo
    // usa queueDeepenWithFillers para saber cuándo puede pedir el
    // siguiente párrafo de "profundiza más". Sin esto, saltar de punto a
    // mitad de uno de esos párrafos dejaba ese aviso huérfano para
    // siempre y los chips se quedaban bloqueados sin que nada volviera a
    // desbloquearlos.
    startAudio(false, false, STATE.audio.onSegmentEnd, ratio);
  };

  // Estima cuánto durará la narración a partir del nº de palabras, para que
  // la barra de progreso corresponda al texto real (que ahora varía en
  // longitud) en vez de a una duración fija inventada por POI. Solo se usa
  // con Web Speech: el audio de CLOUD_TTS trae su propia duración real.
  const estimateSpeechDuration = (text) => {
    const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    const rate = STATE.mode === 'kids' ? 1.05 : 0.93;
    const wpm = 150 * rate;
    return Math.max(8, Math.round((words / wpm) * 60));
  };

  // Reproduce un audio ya resuelto de CLOUD_TTS. Comparte STATE.audio y
  // updateAudioUi con el camino de Web Speech: la barra de progreso no
  // sabe (ni le importa) qué motor está sonando.
  const startCloudAudio = (url, silent) => {
    STATE.audio.engine = 'cloud';
    cloudAudioEl.onloadedmetadata = () => {
      if (isFinite(cloudAudioEl.duration)) STATE.audio.duration = cloudAudioEl.duration;
      updateAudioUi();
    };
    cloudAudioEl.ontimeupdate = () => {
      STATE.audio.currentTime = cloudAudioEl.currentTime;
      updateAudioUi();
    };
    cloudAudioEl.onended = () => {
      stopAudio();
      if (!silent) showToast(t('audioguideCompleted'));
      if (STATE.mode === 'kids') maybeShowFirstKidsQuiz();
      // EXPERIMENTO TEMPORAL — PATROCINIOS DEMO: BORRAR esta línea junto con
      // maybeSpeakSponsorDemoOutro más arriba.
      maybeSpeakSponsorDemoOutro(POIS.find((p) => p.id === STATE.activePoiId));
    };
    // Si el audio en caché falla al reproducir (blob corrupto, formato no
    // soportado, etc.) se reintenta ya mismo con Web Speech en vez de dejar
    // la audioguía muda.
    const fallbackToSpeech = () => { STATE.audio.engine = null; startAudio(false, silent); };
    cloudAudioEl.onerror = fallbackToSpeech;
    cloudAudioEl.src = url;
    cloudAudioEl.currentTime = 0;
    const p = cloudAudioEl.play();
    if (p && p.catch) p.catch(fallbackToSpeech);
    updateAudioUi();
  };

  // onSegmentEnd (opcional): se dispara una sola vez cuando esta narración
  // concreta termina (bien o mal) — lo usa queueDeepenWithFillers para
  // encadenar el siguiente relleno o la respuesta real justo cuando el
  // audio anterior deja de sonar, sin cortarlo a medias. No se propaga al
  // camino de CLOUD_TTS (startCloudAudio): los rellenos locales nunca
  // tienen audio en caché, así que ese camino no aplica aquí.
  // seekRatio (opcional, 0-1, ver seekAudioTo): en vez de arrancar desde
  // el principio, la narración empieza aproximadamente en ese punto — la
  // barra de progreso arranca ya ahí (en vez de en 0) y SPEECH.speak
  // recorta el texto por palabras hasta ese punto (ver su comentario).
  const startAudio = (isResume = false, silent = false, onSegmentEnd = null, seekRatio = null) => {
    if (!STATE.activePoiId) return;
    STATE.audio.playing = true;
    WAKE_LOCK.acquire();
    let segmentEndCb = onSegmentEnd;
    // Se refleja también en STATE.audio para que seekAudioTo pueda
    // recuperarlo y pasarlo a la narración nueva que arranca al saltar de
    // punto — si no, un salto a mitad de un párrafo de "profundiza más"
    // (ver queueDeepenWithFillers) dejaría su aviso de "fin de segmento"
    // huérfano para siempre, y los chips se quedarían bloqueados sin que
    // nada volviera a desbloquearlos.
    STATE.audio.onSegmentEnd = onSegmentEnd;
    const notifySegmentEnd = () => {
      if (typeof segmentEndCb !== 'function') return;
      const cb = segmentEndCb;
      segmentEndCb = null;
      if (STATE.audio.onSegmentEnd === cb) STATE.audio.onSegmentEnd = null;
      cb();
    };

    if (!isResume) {
      const textForCloud = SPEECH.getText();
      const cloudUrl = CLOUD_TTS.getReadyUrl(textForCloud);
      if (cloudUrl) { startCloudAudio(cloudUrl, silent); return; }
      // Sin síntesis de voz del navegador (WebView de Capacitor en Android:
      // no existe window.speechSynthesis ahí) no hay ningún motor local al
      // que caer — sin este intento activo la audioguía se quedaría muda
      // del todo dentro de la app empaquetada, porque antes la voz en la
      // nube solo se usaba si ya estaba precacheada de antemano (ver
      // queueAiMessage). Se pide ya mismo y se reproduce en cuanto llegue;
      // si STATE.activePoiId cambió mientras tanto (el usuario ya se fue a
      // otro punto), se descarta sin reproducir nada encima de lo nuevo.
      if (!SPEECH.isSupported() && CLOUD_TTS.isConfigured()) {
        const poiId = STATE.activePoiId;
        STATE.audio.playing = true;
        updateAudioUi();
        CLOUD_TTS.fetchAndCache(textForCloud).then((url) => {
          if (url && STATE.activePoiId === poiId) {
            startCloudAudio(url, silent);
          } else {
            STATE.audio.playing = false;
            updateAudioUi();
            if (!silent) showToast('No se pudo cargar el audio. Comprueba tu conexión.', 3200);
            // Sin esto, si esta narración traía un onSegmentEnd pendiente
            // (ver queueDeepenWithFillers), su promesa se queda colgada para
            // siempre en cuanto falla la carga del audio en la nube — y con
            // ella STATE.ai.deepenBusy nunca vuelve a false, dejando
            // "Profundiza más" bloqueado sin que nada lo desbloquee (bug
            // reportado en pruebas de usuario, 2026-09-04).
            notifySegmentEnd();
          }
        });
        return;
      }
      STATE.audio.engine = null;
    } else if (STATE.audio.engine === 'cloud') {
      cloudAudioEl.play().catch(() => {});
      updateAudioUi();
      return;
    }

    if (!isResume && SPEECH.isSupported()) {
      STATE.audio.duration = estimateSpeechDuration(SPEECH.getText());
    }
    const duration = STATE.audio.duration;
    clearInterval(STATE.audio.timer);
    if (seekRatio !== null) {
      STATE.audio.currentTime = Math.min(duration, Math.max(0, seekRatio * duration));
    }

    if (!isResume) {
      const spokeOk = SPEECH.isSupported() && SPEECH.speak(({ finished, error, startFailed }) => {
        if (finished) {
          STATE.audio.currentTime = duration;
          stopAudio();
          STATE.audio.currentTime = 0;
          updateAudioUi();
          if (!silent) showToast(t('audioguideCompleted'));
          if (STATE.mode === 'kids') maybeShowFirstKidsQuiz();
          // EXPERIMENTO TEMPORAL — PATROCINIOS DEMO: BORRAR esta línea junto
          // con maybeSpeakSponsorDemoOutro más arriba.
          maybeSpeakSponsorDemoOutro(POIS.find((p) => p.id === STATE.activePoiId));
          notifySegmentEnd();
          return;
        }
        if (error || startFailed) {
          stopAudio();
          STATE.audio.currentTime = 0;
          updateAudioUi();
          // En autoplay (silent) no avisamos: en iOS Safari el primer intento
          // fuera de un gesto directo puede fallar siempre, y el botón de
          // play ya queda listo para un toque manual (eso sí funcionará).
          if (!silent) {
            showToast(t('audioStartFailed'), 3200);
          }
          notifySegmentEnd();
        }
      }, seekRatio || 0);
      if (!spokeOk) {
        STATE.audio.playing = false;
        updateAudioUi();
        notifySegmentEnd();
        return;
      }
    } else {
      SPEECH.resume();
    }

    STATE.audio.timer = setInterval(() => {
      STATE.audio.currentTime += 0.2;
      if (STATE.audio.currentTime >= duration) {
        // OJO: "duration" aquí es una ESTIMACIÓN por nº de palabras (ver
        // estimateSpeechDuration), no la duración real de la voz — el ritmo
        // real varía con pausas, puntuación y la propia síntesis del
        // navegador. Antes este bloque llamaba a stopAudio() (que cancela
        // la síntesis de voz en curso) nada más alcanzar la estimación,
        // cortando la narración a media frase cuando la voz real tardaba
        // más de lo estimado — bug real: audio que se corta "random" justo
        // con el aviso de "Audioguía completada" de fondo. El único fin
        // real y fiable es el callback de SPEECH.speak (ver más arriba,
        // finished/error/startFailed), que sí escucha el evento genuino del
        // motor de voz: aquí solo se congela la barra al 100% y se para
        // este intervalo, sin tocar la voz ni disparar avisos de fin.
        STATE.audio.currentTime = duration;
        clearInterval(STATE.audio.timer);
        STATE.audio.timer = null;
        updateAudioUi();
        return;
      }
      updateAudioUi();
    }, 200);
    updateAudioUi();
  };

  const stopAudio = () => {
    STATE.audio.playing = false;
    clearInterval(STATE.audio.timer);
    STATE.audio.timer = null;
    SPEECH.cancel();
    if (cloudAudioEl) {
      cloudAudioEl.pause();
      cloudAudioEl.onended = cloudAudioEl.onerror = cloudAudioEl.ontimeupdate = cloudAudioEl.onloadedmetadata = null;
    }
    STATE.audio.engine = null;
    WAKE_LOCK.release();
    updateAudioUi();
  };

  const resetAudio = (duration) => {
    stopAudio();
    STATE.audio.duration = duration;
    STATE.audio.currentTime = 0;
    updateAudioUi();
  };

  const updateAudioUi = () => {
    const c = els.sheet;
    const player = $('.audio-player', c), btn = $('.play-btn', c), fill = $('.progress-fill', c), time = $('.audio-time', c);
    if (!player || !btn || !fill || !time) return;
    btn.innerHTML = STATE.audio.playing ? ICONS.pause : ICONS.play;
    // Mientras se está generando una respuesta nueva (STATE.ai.pending) y
    // no hay nada sonando todavía, se deshabilita el play: si se pudiera
    // arrancar en ese hueco, sonaría con el texto de respaldo (tabs.history)
    // y unos segundos después, al llegar la respuesta real, se reiniciaría
    // solo con el texto correcto — el "audio que se refresca a los 8s"
    // que reportó un usuario. Una vez playing=true no se vuelve a tocar
    // este disabled, para no bloquear pausar/reanudar mientras suena.
    btn.disabled = STATE.ai.pending && !STATE.audio.playing;
    const dur = STATE.audio.duration || 1;
    fill.style.width = `${Math.min(100, (STATE.audio.currentTime / dur) * 100)}%`;
    time.textContent = `${fmtTime(STATE.audio.currentTime)} / ${fmtTime(dur)}`;
  };

  /* =========================================================
   * WIRE EVENTS
   * =======================================================*/
  const wireEvents = () => {
    $('.sheet-close', els.sheet).addEventListener('click', closeSheet);
    els.backdrop.addEventListener('click', closeSheet);

    // FIX (reportado en producción, iPhone): el tirador de arriba solo tenía
    // un listener de "click", que no llegaba a dispararse si el dedo se
    // movía nada -- un swipe real hacia abajo lo clasifica el navegador
    // como gesto de arrastre, no como tap, así que "bajar la pestaña" no
    // hacía nada. Ahora sigue el dedo 1:1 con Pointer Events: si se suelta
    // habiendo arrastrado más de DRAG_CLOSE_THRESHOLD, cierra la ficha; si
    // apenas se movió (un tap de verdad), también cierra, igual que antes;
    // si se soltó a medio camino, vuelve a su sitio con la misma
    // transición que ya usa el CSS para abrir/cerrar.
    const sheetHandleEl = $('.sheet-handle', els.sheet);
    if (sheetHandleEl) {
      const DRAG_CLOSE_THRESHOLD = 90;
      let dragStartY = null;
      let dragDelta = 0;
      const onSheetHandleMove = (e) => {
        if (dragStartY === null) return;
        dragDelta = Math.max(0, e.clientY - dragStartY);
        els.sheet.style.transform = `translateY(${dragDelta}px)`;
      };
      const onSheetHandleUp = () => {
        if (dragStartY === null) return;
        dragStartY = null;
        els.sheet.style.transition = '';
        els.sheet.style.transform = '';
        if (dragDelta > DRAG_CLOSE_THRESHOLD || dragDelta < 6) closeSheet();
        dragDelta = 0;
      };
      sheetHandleEl.addEventListener('pointerdown', (e) => {
        dragStartY = e.clientY;
        dragDelta = 0;
        els.sheet.style.transition = 'none';
        try { sheetHandleEl.setPointerCapture(e.pointerId); } catch (_) {}
      });
      sheetHandleEl.addEventListener('pointermove', onSheetHandleMove);
      sheetHandleEl.addEventListener('pointerup', onSheetHandleUp);
      sheetHandleEl.addEventListener('pointercancel', onSheetHandleUp);
    }

    $('#locateBtn')?.addEventListener('click', () => requestLocation(true));

    $('#fountainsBtn')?.addEventListener('click', () => toggleFountains());
    $('#restroomsBtn')?.addEventListener('click', () => toggleRestrooms());
    $('#satelliteBtn')?.addEventListener('click', () => toggleSatellite());
    // EXPERIMENTO TEMPORAL — CAPA "COMER Y BEBER" / panel de capas
    // horizontal (rama experimento-patrocinios-demo). BORRAR este bloque
    // (y el trozo de closeAllMapMenus más abajo) si se retira el experimento.
    $('#foodBtn')?.addEventListener('click', () => toggleFood());
    // (El botón "Capas" (#layersBtn) se cablea más arriba, junto con "Filtros".)

    $('#scanBtn')?.addEventListener('click', () => {
      const menu = $('#scanMenu'), btn = $('#scanBtn');
      const willOpen = menu?.hidden;
      if (menu) menu.hidden = !willOpen;
      btn?.setAttribute('aria-expanded', String(!!willOpen));
    });
    $('#scanTakePhoto')?.addEventListener('click', async () => {
      $('#scanMenu').hidden = true;
      $('#scanBtn')?.setAttribute('aria-expanded', 'false');
      prefetchLocation(); // ver comentario en scanUploadPhoto
      const opened = await openCameraCapture();
      if (!opened) {
        showToast(t('cameraOpenFailed'), 3200);
      }
    });
    $('#scanUploadPhoto')?.addEventListener('click', () => {
      $('#scanMenu').hidden = true;
      $('#scanBtn')?.setAttribute('aria-expanded', 'false');
      // Pide la ubicación YA, en este toque directo, en vez de esperar a
      // después de elegir la foto: en iOS, tras cerrarse el selector nativo
      // de fotos, el toque original ya no cuenta como "reciente" y el
      // permiso de geolocalización puede fallar o comportarse mal si se
      // pide en ese momento. Pedirlo aquí dispara el diálogo de permiso (si
      // hace falta) mientras el toque sigue "fresco"; para cuando scanForPoi
      // la necesite, ya estará resuelta o en curso.
      prefetchLocation();
      $('#scanInput')?.click();
    });
    $('#cameraShutterBtn')?.addEventListener('click', captureCameraPhoto);
    $('#cameraCloseBtn')?.addEventListener('click', closeCameraCapture);
    $('#cameraZoomInBtn')?.addEventListener('click', () => applyCameraZoom(cameraZoom + 0.5));
    $('#cameraZoomOutBtn')?.addEventListener('click', () => applyCameraZoom(cameraZoom - 0.5));
    // Pellizco (pinch) sobre el propio vídeo para hacer zoom con dos dedos,
    // el gesto habitual en cualquier app de cámara. Los botones +/- de
    // arriba son el respaldo "descubrible" para quien no pruebe a pellizcar.
    (() => {
      const wrap = $('#cameraVideoWrap');
      if (!wrap) return;
      let pinchStartDist = null;
      let pinchStartZoom = 1;
      const touchDistance = (touches) => {
        const [a, b] = touches;
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      };
      wrap.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          pinchStartDist = touchDistance(e.touches);
          pinchStartZoom = cameraZoom;
        }
      }, { passive: true });
      wrap.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 2 || pinchStartDist === null) return;
        e.preventDefault(); // evita que el navegador intente hacer scroll/zoom de página a la vez
        const factor = touchDistance(e.touches) / pinchStartDist;
        applyCameraZoom(pinchStartZoom * factor);
      }, { passive: false });
      wrap.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) pinchStartDist = null;
      });
    })();
    $('#scanInput')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ''; // permite volver a elegir la misma foto una segunda vez
      if (file) scanForPoi(file);
    });

    $('#changeCityBtn')?.addEventListener('click', () => {
      STATE.cityId = null;
      saveState();
      location.reload();
    });

    $('.play-btn', els.sheet).addEventListener('click', toggleAudio);
    $('.progress-wrap', els.sheet).addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      seekAudioTo(ratio);
    });

    $('.sheet-thumb', els.sheet).addEventListener('click', (e) => {
      openLightbox(e.currentTarget.src, e.currentTarget.alt);
    });
    $('.sheet-thumb-retry', els.sheet)?.addEventListener('click', () => {
      const poi = POIS.find((p) => p.id === STATE.activePoiId);
      if (poi) setSheetThumbImage(poi.image, pickDual(poi.name));
    });
    if (els.lightbox) {
      $('.lightbox-close', els.lightbox).addEventListener('click', closeLightbox);
      els.lightbox.addEventListener('click', (e) => {
        if (e.target === els.lightbox) closeLightbox();
      });
      $('.lightbox-retry', els.lightbox)?.addEventListener('click', () => {
        if (lastLightboxSrc) openLightbox(lastLightboxSrc, lastLightboxAlt);
      });
    }

    $('#pointsBadge')?.addEventListener('click', openVisitSummary);
    if (els.visitSummary) {
      $('.visit-summary-close', els.visitSummary).addEventListener('click', closeVisitSummary);
      els.visitSummary.addEventListener('click', (e) => {
        if (e.target === els.visitSummary) closeVisitSummary();
      });
    }

    $('#routeIntroPlay')?.addEventListener('click', toggleRouteIntroAudio);
    $('#routeIntroClose')?.addEventListener('click', closeRouteIntro);

    const badgeZoomModal = $('#badgeZoomModal');
    if (badgeZoomModal) {
      $('#badgeZoomClose').addEventListener('click', closeBadgeZoom);
      badgeZoomModal.addEventListener('click', (e) => {
        if (e.target === badgeZoomModal) closeBadgeZoom();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (els.lightbox && els.lightbox.classList.contains('-open')) { closeLightbox(); return; }
      if (els.visitSummary && els.visitSummary.classList.contains('-open')) { closeVisitSummary(); return; }
      if (badgeZoomModal && badgeZoomModal.classList.contains('-open')) { closeBadgeZoom(); return; }
      if (STATE.sheet !== 'closed') closeSheet();
    });
  };

  /* =========================================================
   * PANTALLA DE BIENVENIDA (ciudad + modo, todo en una sola pantalla)
   * =======================================================*/
  const setOnboardingLoading = (isLoading) => {
    const card = $('.onboarding-card');
    if (card) card.classList.toggle('-loading', isLoading);
  };

  const finishOnboarding = async (cityId, mode) => {
    STATE.mode = mode === 'kids' ? 'kids' : 'adult';
    setOnboardingLoading(true);
    try {
      await selectCity(cityId);
    } catch (e) {
      console.warn('[OMOT] Fallo al cargar la ciudad:', e);
      setOnboardingLoading(false);
      showToast('No se pudo cargar la ciudad. Comprueba tu conexión e inténtalo de nuevo.', 3500);
      return;
    }
    setOnboardingLoading(false);
    const ob = $('#onboarding');
    if (ob) { ob.hidden = true; ob.setAttribute('aria-hidden', 'true'); }
    startApp();
  };

  // Textos fijos de la pantalla de bienvenida (ver index.html, sección
  // .onboarding): a diferencia del contenido de cada POI, esto no viene de
  // ningún archivo de datos, así que vive aquí como un pequeño diccionario
  // propio en vez de forzarlo por el mecanismo pickDual/pickLang, pensado
  // para contenido de POI con modo adulto/niño.
  const ONBOARDING_STRINGS = {
    es: {
      obHeroTitle: 'Explora a tu manera',
      obHeroSubtitle: 'Historias, leyendas y secretos de cada rincón de tu ciudad preferida, a tu ritmo.',
      obSectionCityHeading: '¿Dónde quieres explorar?',
      obNearbyTitle: 'Cerca de mí',
      obNearbyDesc: 'Detecto la ciudad más cercana con tu ubicación',
      obPickCityLabel: 'Elegir una ciudad',
      obSectionModeHeading: '¿Modo Adultos o Niños?',
      obModeAdultTitle: 'Adultos',
      obModeAdultDesc: 'Contenido experto y riguroso',
      obModeKidsTitle: 'Niños',
      obModeKidsDesc: 'Aventuras, retos y magia',
      obResetBtn: 'Reiniciar app',
      obPrivacyLink: 'Privacidad y créditos'
    },
    en: {
      obHeroTitle: 'Explore your way',
      obHeroSubtitle: 'Stories, legends and secrets from every corner of your favorite city, at your own pace.',
      obSectionCityHeading: 'Where do you want to explore?',
      obNearbyTitle: 'Near me',
      obNearbyDesc: 'I detect the closest city using your location',
      obPickCityLabel: 'Choose a city',
      obSectionModeHeading: 'Adult or Kids mode?',
      obModeAdultTitle: 'Adults',
      obModeAdultDesc: 'Expert, rigorous content',
      obModeKidsTitle: 'Kids',
      obModeKidsDesc: 'Adventures, challenges and magic',
      obResetBtn: 'Restart app',
      obPrivacyLink: 'Privacy & credits'
    }
  };

  const applyOnboardingLang = () => {
    const dict = ONBOARDING_STRINGS[STATE.lang] || ONBOARDING_STRINGS.es;
    Object.entries(dict).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
    $$('#obLangToggle .onboarding-btn.-lang').forEach((o) => o.dataset.active = o.dataset.lang === STATE.lang ? 'true' : 'false');
    document.documentElement.lang = STATE.lang;
  };

  const wireOnboarding = () => {
    const ob = $('#onboarding');
    if (!ob) return;

    applyOnboardingLang();
    $$('#obLangToggle .onboarding-btn.-lang').forEach((opt) => {
      opt.addEventListener('click', () => {
        setStateLang(opt.dataset.lang);
        applyOnboardingLang();
      });
    });

    // Ayuda temporal de diagnóstico: 3 toques sobre el número de versión
    // muestran los datos guardados en un cuadro directamente en la página
    // (no window.prompt, que algunos navegadores móviles bloquean sobre
    // todo en modo "añadido a pantalla de inicio"), para poder revisar de
    // verdad qué hay guardado en un dispositivo concreto. Si se sigue
    // tocando hasta 6 toques seguidos (sin que pase el temporizador), se
    // abre además el registro de fotos sin reconocer (ver ScanLog): no se
    // resetea el contador al llegar a 3 para poder seguir sumando toques
    // dentro de la misma ventana de tiempo.
    const versionEl = $('#appVersion');
    if (versionEl) {
      let tapCount = 0;
      let tapTimer = null;
      versionEl.addEventListener('click', () => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 2500);
        if (tapCount === 3) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY) || '(vacío)';
            showDebugDump(raw);
          } catch (_) {}
        } else if (tapCount >= 6) {
          tapCount = 0;
          clearTimeout(tapTimer);
          openScanLogModal();
        }
      });
    }

    // Reinicio completo: borra caché del Service Worker, el propio Service
    // Worker registrado y todo localStorage (ciudad/modo, puntos, progreso
    // del quiz, conversaciones con la IA), y recarga — como si fuera la
    // primera vez que se abre la web. Pide confirmación con un modal propio
    // (no window.confirm, por el mismo motivo que el volcado de depuración
    // no usa window.prompt: puede bloquearse en modo "añadido a pantalla de
    // inicio" en algunos navegadores móviles).
    const resetBtn = $('#obResetBtn');
    const resetModal = $('#resetConfirmModal');
    const openResetConfirm = () => {
      if (!resetModal) return;
      resetModal.classList.add('-open');
      resetModal.setAttribute('aria-hidden', 'false');
    };
    const closeResetConfirm = () => {
      if (!resetModal) return;
      resetModal.classList.remove('-open');
      resetModal.setAttribute('aria-hidden', 'true');
    };
    const performFullReset = async () => {
      const okBtn = $('#resetConfirmOk');
      if (okBtn) { okBtn.disabled = true; okBtn.textContent = 'Reiniciando…'; }
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch (_) {}
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {}
      try { localStorage.clear(); } catch (_) {}
      location.reload();
    };
    resetBtn?.addEventListener('click', openResetConfirm);
    $('#resetConfirmCancel')?.addEventListener('click', closeResetConfirm);
    $('#resetConfirmOk')?.addEventListener('click', performFullReset);
    resetModal?.addEventListener('click', (e) => {
      if (e.target === resetModal) closeResetConfirm();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && resetModal && resetModal.classList.contains('-open')) closeResetConfirm();
    });

    // "Cómo llegar": el estado y las funciones open/close viven fuera de
    // wireEvents (ver junto a showVisitInfo), porque el chip que las llama
    // se define en renderAiSuggestions, una función hermana, no anidada
    // aquí dentro — aquí solo se cablean los listeners de los botones.
    $('#directionsConfirmCancel')?.addEventListener('click', closeDirectionsConfirm);
    $('#directionsConfirmOk')?.addEventListener('click', () => {
      if (directionsPoi) {
        const [lat, lng] = directionsPoi.coords;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank', 'noopener');
      }
      closeDirectionsConfirm();
    });
    directionsModal?.addEventListener('click', (e) => {
      if (e.target === directionsModal) closeDirectionsConfirm();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && directionsModal && directionsModal.classList.contains('-open')) closeDirectionsConfirm();
    });
    // EXPERIMENTO (rama experimento-diseno-editorial): icono de "Cómo
    // llegar" en la cabecera de la ficha (ver populateSheetContent) en vez
    // del chip de abajo -- abre el mismo modal de confirmación de siempre.
    $('#sheetDirectionsBtn')?.addEventListener('click', () => {
      const poi = POIS.find((p) => p.id === STATE.activePoiId);
      if (poi) openDirectionsConfirm(poi);
    });

    let chosenMode = STATE.mode === 'kids' ? 'kids' : 'adult';
    const modeBtns = $$('.onboarding-btn.-mode');
    modeBtns.forEach((b) => {
      b.dataset.active = String(b.dataset.mode === chosenMode);
      b.addEventListener('click', () => {
        chosenMode = b.dataset.mode === 'kids' ? 'kids' : 'adult';
        modeBtns.forEach((x) => { x.dataset.active = String(x === b); });
      });
    });

    // Lista de ciudades: continente → país → ciudad (se genera desde CITIES).
    const cityList = $('#obCityList');
    const allCities = Object.values(CITIES);

    // continent/country en CITIES son claves fijas en español (se comparan
    // por igualdad para agrupar), así que la traducción es solo de
    // visualización: nunca se toca el valor real, solo la etiqueta.
    const GEO_LABELS = {
      Europa: { es: 'Europa', en: 'Europe' },
      América: { es: 'América', en: 'America' },
      España: { es: 'España', en: 'Spain' },
      México: { es: 'México', en: 'Mexico' },
      Alemania: { es: 'Alemania', en: 'Germany' },
      Italia: { es: 'Italia', en: 'Italy' },
      Vaticano: { es: 'Vaticano', en: 'Vatican' },
      Turquía: { es: 'Turquía', en: 'Turkey' }
    };
    const geoLabel = (value) => (GEO_LABELS[value] ? GEO_LABELS[value][STATE.lang] || value : value);

    const makeRow = (label, sub, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'onboarding-city-option';
      b.innerHTML = sub ? `<span>${label}</span><small>${sub}</small>` : `<span>${label}</span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    const makeBack = (label, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'onboarding-city-back';
      b.innerHTML = `<span aria-hidden="true">←</span> ${label}`;
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    // Orden alfabético (es) en los tres niveles del selector, para que la
    // lista no dependa del orden en que se fueron añadiendo las ciudades a
    // CITIES.
    const alphabetically = (a, b) => a.localeCompare(b, 'es');

    const renderContinents = () => {
      if (!cityList) return;
      cityList.innerHTML = '';
      const continents = [...new Set(allCities.map((c) => c.continent))].sort(alphabetically);
      continents.forEach((continent) => {
        cityList.appendChild(makeRow(geoLabel(continent), '', () => renderCountries(continent)));
      });
    };

    const renderCountries = (continent) => {
      if (!cityList) return;
      cityList.innerHTML = '';
      cityList.appendChild(makeBack(t('obContinentsBack'), renderContinents));
      const countries = [...new Set(allCities.filter((c) => c.continent === continent).map((c) => c.country))].sort(alphabetically);
      countries.forEach((country) => {
        cityList.appendChild(makeRow(geoLabel(country), '', () => renderCities(continent, country)));
      });
    };

    // Ciudades con el mismo "region" (ej. varias ciudades de la Comunidad de
    // Madrid) se agrupan bajo un desplegable extra con el nombre de esa
    // región, en vez de listarse sueltas junto al resto de ciudades del
    // país. Las ciudades sin "region" (la mayoría) se muestran igual que
    // siempre, directamente en este mismo nivel.
    const renderCities = (continent, country) => {
      if (!cityList) return;
      cityList.innerHTML = '';
      cityList.appendChild(makeBack(geoLabel(country), () => renderCountries(continent)));
      const cities = allCities.filter((c) => c.continent === continent && c.country === country);
      const regions = [...new Set(cities.filter((c) => c.region).map((c) => c.region))];
      const items = [
        ...regions.map((region) => ({ label: region, onClick: () => renderRegionCities(continent, country, region) })),
        ...cities.filter((c) => !c.region).map((city) => ({ label: city.name, onClick: () => finishOnboarding(city.id, chosenMode) }))
      ];
      items
        .sort((a, b) => alphabetically(a.label, b.label))
        .forEach((item) => cityList.appendChild(makeRow(item.label, '', item.onClick)));
    };

    const renderRegionCities = (continent, country, region) => {
      if (!cityList) return;
      cityList.innerHTML = '';
      cityList.appendChild(makeBack(region, () => renderCities(continent, country)));
      allCities
        .filter((c) => c.continent === continent && c.country === country && c.region === region)
        .sort((a, b) => alphabetically(a.name, b.name))
        .forEach((city) => {
          cityList.appendChild(makeRow(city.name, '', () => finishOnboarding(city.id, chosenMode)));
        });
    };

    const pickCityBtn = $('#obPickCity');
    pickCityBtn?.addEventListener('click', (e) => {
      if (!cityList) return;
      const willExpand = cityList.hidden;
      if (willExpand) renderContinents();
      cityList.hidden = !willExpand;
      e.currentTarget.setAttribute('aria-expanded', String(willExpand));
      e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
      if (!cityList || cityList.hidden) return;
      if (cityList.contains(e.target) || pickCityBtn?.contains(e.target)) return;
      cityList.hidden = true;
      pickCityBtn?.setAttribute('aria-expanded', 'false');
    });

    $('#obNearby')?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('No se pudo detectar tu ubicación. Elige una ciudad de la lista.');
        if (cityList) cityList.hidden = false;
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          STATE.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const cityId = nearestCityId(pos.coords.latitude, pos.coords.longitude);
          finishOnboarding(cityId, chosenMode);
        },
        () => {
          showToast('No hemos podido acceder a tu ubicación. Elige una ciudad de la lista.');
          if (cityList) cityList.hidden = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  };

  /* =========================================================
   * INIT
   * =======================================================*/
  const startApp = () => {
    els.sheet = $('#bottomSheet');
    els.backdrop = $('#sheetBackdrop');
    els.filters = $('#filters');
    els.header = $('.header');
    els.lightbox = $('#imageLightbox');
    els.visitSummary = $('#visitSummaryModal');
    els.routePicker = $('#routePicker');
    els.routeIntro = $('#routeIntro');

    buildHeader();
    initMap();
    wireEvents();
    wireAiInput();
    wireMicInput();
    wireAiCallModal();
    wireTutorial();
    wireCityIntro();

    setStateMode(STATE.mode);
    updatePills();

    // Auto-centra en la ubicación real del usuario al abrir, en vez de
    // esperar a que toque el botón de "localizarme" (petición real de
    // testers, 2026-09-04: "no sé dónde estoy en el mapa"). Silencioso si
    // falla o se deniega el permiso — ese aviso solo tiene sentido cuando
    // el usuario toca el botón a propósito, no en cada apertura de la app.
    setTimeout(() => requestLocation(true, true), 800);

    // El tutorial (primera vez en cada modo, niño o adultos) y el toast de
    // bienvenida compiten por la atención en el mismo instante: si va a
    // arrancar el tutorial, se salta el toast por completo en vez de
    // solaparlos.
    let seenTutorial = true;
    try {
      const seenKey = STATE.mode === 'kids' ? TUTORIAL_SEEN_KEY_KIDS : TUTORIAL_SEEN_KEY_ADULT;
      seenTutorial = localStorage.getItem(seenKey) === '1';
    } catch (_) {}
    const willShowTutorial = !seenTutorial;

    if (willShowTutorial) {
      setTimeout(() => maybeAutoStartTutorial(), 600);
    } else {
      setTimeout(() => {
        showToast(t('welcomeBack').replace('{city}', CURRENT_CITY.name));
      }, 600);
      // Sin tutorial de por medio (ya visto antes), la bienvenida a la
      // ciudad no tiene que esperar a que nada se cierre: se muestra
      // directamente si esta ciudad concreta es nueva para el usuario.
      setTimeout(() => maybeShowCityIntro(), 650);
    }
  };

  const showOnboardingScreen = () => {
    const ob = $('#onboarding');
    if (ob) { ob.hidden = false; ob.setAttribute('aria-hidden', 'false'); }
  };

  // Retoma una visita ya en marcha (ciudad ya elegida en una sesión
  // anterior) sin pasar por la pantalla de elegir ciudad: carga la ciudad
  // igual que finishOnboarding, arranca la app y, si había una ficha de POI
  // abierta cuando se guardó el estado (ver selectPoi/closeSheet), la
  // reabre con su chat tal como estaba — así una vuelta de Google Maps (o
  // que el sistema mate la app en segundo plano mientras tanto) no se
  // siente como "se perdió la conversación". Si algo falla (sin red para
  // cargar los POIs de la ciudad, etc.) se propaga el error para que
  // revealApp caiga al picker de siempre.
  const resumeSavedSession = async (cityId) => {
    const poiIdToReopen = pendingResumePoiId;
    pendingResumePoiId = null;
    await selectCity(cityId);
    startApp();
    if (poiIdToReopen && POIS.some((p) => p.id === poiIdToReopen)) {
      selectPoi(poiIdToReopen);
    }
  };

  // Muestra la pantalla principal (elegir ciudad y modo), una vez superada
  // la comprobación de licencia (ver LICENSE más arriba) — o, si ya había
  // una ciudad elegida de antes, retoma esa visita directamente (ver
  // resumeSavedSession). Idempotente a propósito: tras un bloqueo a media
  // sesión (ver lockApp) la app ya estaba revelada de antes, así que volver
  // a pasar la comprobación no debe re-enganchar los mismos listeners por
  // segunda vez.
  let appRevealed = false;
  const revealApp = () => {
    if (appRevealed) return;
    appRevealed = true;
    wireOnboarding();
    wireScanLogModal();

    const savedCityId = STATE.cityId;
    if (savedCityId && CITIES[savedCityId]) {
      resumeSavedSession(savedCityId).catch((e) => {
        console.warn('[OMOT] No se pudo retomar la sesión guardada:', e);
        showOnboardingScreen();
      });
      return;
    }
    showOnboardingScreen();
  };

  const setLicenseGateError = (msg) => {
    const err = $('#licenseGateError');
    if (!err) return;
    err.hidden = !msg;
    err.textContent = msg || '';
  };

  const showLicenseGate = () => {
    const gate = $('#licenseGate');
    if (!gate) { revealApp(); return; } // sin el marcado en el HTML, no bloqueamos la app
    gate.hidden = false;
    gate.setAttribute('aria-hidden', 'false');
    const input = $('#licenseGateInput');
    if (input) { input.value = ''; input.focus(); }
  };

  const hideLicenseGate = () => {
    const gate = $('#licenseGate');
    if (!gate) return;
    gate.hidden = true;
    gate.setAttribute('aria-hidden', 'true');
  };

  // Bloqueo a media sesión (ver LICENSE.startWatching): a diferencia de la
  // primera vez, aquí la app ya estaba abierta y puede que sonando, así que
  // se para el audio antes de tapar la pantalla con la puerta de acceso.
  const lockApp = () => {
    try { stopAudio(); } catch (_) {}
    setLicenseGateError('Licencia caducada. Solicita una nueva clave para continuar.');
    showLicenseGate();
  };

  const wireLicenseGate = () => {
    const submit = $('#licenseGateSubmit');
    const input = $('#licenseGateInput');
    if (!submit || !input) return;
    let checking = false;
    const attempt = async () => {
      const username = input.value.trim();
      if (!username || checking) return;
      checking = true;
      submit.disabled = true;
      submit.textContent = 'Comprobando…';
      setLicenseGateError(null);
      const result = await LICENSE.check(username);
      checking = false;
      submit.disabled = false;
      submit.textContent = 'Entrar';
      if (result.ok) {
        LICENSE.writeStored({ username, expires: result.expires });
        hideLicenseGate();
        revealApp(); // no-op si la app ya se había revelado antes de un bloqueo
        LICENSE.startWatching(username, lockApp);
        LICENSE.recordVisit(username);
        return;
      }
      if (result.reason === 'expired') {
        setLicenseGateError('Licencia caducada. Solicita una nueva clave para continuar.');
      } else if (result.reason === 'offline') {
        setLicenseGateError('No se pudo comprobar el acceso (sin conexión). Inténtalo de nuevo cuando tengas red.');
      } else {
        setLicenseGateError('Clave no reconocida.');
      }
    };
    submit.addEventListener('click', attempt);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });
  };

  const init = () => {
    loadState();
    document.documentElement.dataset.mode = STATE.mode;
    document.documentElement.dataset.lang = STATE.lang;
    const gateTitleEl = $('#licenseGateTitle');
    if (gateTitleEl) gateTitleEl.textContent = t('licenseGateTitle');
    const gateTextEl = $('#licenseGateText');
    if (gateTextEl) gateTextEl.textContent = t('licenseGateText');
    const gateInputEl = $('#licenseGateInput');
    if (gateInputEl) gateInputEl.placeholder = t('licenseGateInputPlaceholder');
    const gateSubmitEl = $('#licenseGateSubmit');
    if (gateSubmitEl) gateSubmitEl.textContent = t('licenseGateSubmit');
    wireLicenseGate();

    const cached = LICENSE.checkStoredValidOffline();
    if (cached) {
      revealApp();
      // Revalidación contra el Worker real: si ya no es válido, bloquea de
      // inmediato en vez de esperar a la siguiente apertura de la app. Si
      // sigue siendo válido, arranca además la vigilancia periódica (ver
      // LICENSE.startWatching) para detectar una revocación mientras la
      // app sigue abierta.
      LICENSE.check(cached.username).then((result) => {
        if (result.ok) {
          LICENSE.writeStored({ username: cached.username, expires: result.expires });
          LICENSE.startWatching(cached.username, lockApp);
          LICENSE.recordVisit(cached.username);
        } else if (result.reason !== 'offline') {
          LICENSE.clearStored();
          lockApp();
        }
        // 'offline': sin red justo al arrancar, se sigue confiando en la
        // caché local (ya validada arriba) hasta la próxima comprobación.
      }).catch(() => {});
    } else {
      showLicenseGate();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Al volver atrás o reabrir la pestaña, algunos navegadores (sobre todo en
  // móvil) restauran la página desde la caché tal cual estaba (a media
  // pregunta del quiz, con la ficha abierta...) sin volver a ejecutar init().
  // Forzamos una recarga real para que siempre se vea la pantalla principal.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) location.reload();
  });

  } catch (err) {
    // ============= GLOBAL FALLBACK SI ALGO EXPLOTA =============
    const msg = 'OnMyOwnTrip init error: ' + (err && err.message ? err.message : String(err));
    try { console.error('[OMOT init]', err); } catch (_) {}
    const warn = document.createElement('div');
    warn.setAttribute('style', 'position:fixed;left:16px;right:16px;top:16px;z-index:2147483647;background:#111;color:#fff;padding:12px 14px;border-radius:12px;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.3);max-width:540px;margin:0 auto;white-space:pre-wrap;word-break:break-word;');
    warn.textContent = '👀 Algo falló al cargar la app:\n' + (err && err.message ? err.message : String(err)) + '\n\n' + (err && err.stack ? String(err.stack).slice(0,200) : '');
    try { document.body.appendChild(warn); } catch (_) {}
  }
})();
