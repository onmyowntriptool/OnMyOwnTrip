// ============================================================
// OnMyOwnTrip · Monitor de consumo (Cloudflare Worker "omot-monitor")
//
// Cada hora mira dos cosas y avisa por correo si algo se acerca al límite:
//   1. Los límites diarios del plan gratuito de Cloudflare para TODA la
//      cuenta (Workers, KV, Analytics Engine), vía la API GraphQL.
//   2. El gasto de la IA: tokens que anota el proxy en Analytics Engine
//      (recordAiUsage en worker/proxy.js), pasados a euros, y lo que queda
//      del saldo prepago de Gemini. AI Studio no tiene API para el saldo:
//      se apunta a mano (pestaña "Consumo" del panel) y aquí se descuenta
//      lo gastado desde esa lectura.
// El resumen queda en el KV PREMIUM (usage:snapshot) para el panel. Correo:
// alertas en cuanto pasan, resumen diario a las 06 UTC solo si hay algo que
// contar, y resumen semanal los lunes siempre.
// Se despliega con wrangler desde esta carpeta (ver README.md).
// ============================================================
import { EmailMessage } from 'cloudflare:email';

// Límites del plan gratuito (se reinician a las 00:00 UTC).
const CF_LIMITS = [
  { key: 'workers', label: 'Peticiones a Workers', limit: 100000 },
  { key: 'kvRead', label: 'Lecturas KV', limit: 100000 },
  { key: 'kvWrite', label: 'Escrituras KV', limit: 1000 },
  { key: 'kvDelete', label: 'Borrados KV', limit: 1000 },
  { key: 'kvList', label: 'Listados KV', limit: 1000 },
  { key: 'aeWrite', label: 'Puntos de Analytics Engine', limit: 100000 }
];
const KV_STORAGE_LIMIT = 1e9; // 1 GB para toda la cuenta
const TTS_FREE_CHARS_MONTH = 1000000; // voces WaveNet

// Solo se detallan los Workers y espacios KV de OnMyOwnTrip. Otros proyectos
// de la cuenta no se nombran ni se listan; los totales frente a los límites sí
// son de toda la cuenta, porque Cloudflare los aplica así.
const OMOT_SCRIPTS = ['damp-unit-7cc9onmyowntrip-proxy', 'omot-monitor'];
const KV_NAMES = {
  '15738a1268e749c48fad70e3904413a8': 'CITY_CONTENT',
  'e3ad6197f4b3418ba31c9a8f796d2d3d': 'omot-access-log',
  '7e3a634ccc45443cb1699135d1847c9a': 'omot-licenses',
  '968a39ea59bd4c36807368fca69a33dc': 'omot-premium',
  '3c93a2003f79423abd9ed0f683191206': 'omot-sponsor-metrics-demo',
  '7b50fe98aebc4bd1aae142e5c4038480': 'omot-sponsors'
};

// Precio por millón de tokens, en US$. gemini-3.8-flash tiene precio de
// lanzamiento hasta el 31-12-2026 y el doble después. El modelo ligero de
// respaldo se cuenta igual que el principal (cota alta, entra poco).
// Claude Haiku va al saldo de Anthropic, aparte.
const PRICES = [
  { re: /^gemini/, periods: [{ until: '2027-01-01', input: 0.75, output: 3.75 }, { input: 1.5, output: 7.5 }] },
  { re: /^claude-haiku/, periods: [{ input: 1, output: 5 }] }
];
const DEFAULT_CONFIG = {
  balanceEur: 7.68,
  balanceDate: '2026-10-13',
  expiry: '2027-08-10',
  usdEur: 0.87,
  // Factor de ajuste entre lo que estima este Worker y lo que cobra Google;
  // se corrige comparando con la factura real en la revisión semanal.
  calib: 1
};

const ALERT_WARN = 0.6;
const ALERT_URGENT = 0.85;
const DATASET = 'omot_metrics';
const USAGE_MARK = '_usage';

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (day, n) => isoDay(Date.parse(`${day}T00:00:00Z`) + n * 86400000);
const fmtN = (n) => Math.round(n || 0).toLocaleString('es-ES');
const fmtEur = (n) => `${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const fmtPct = (n) => `${Math.round((n || 0) * 100)} %`;

function priceFor(model, day) {
  const entry = PRICES.find((p) => p.re.test(model));
  if (!entry) return { input: 0, output: 0 };
  return entry.periods.find((p) => !p.until || day < p.until) || entry.periods[entry.periods.length - 1];
}

function costUsd(model, day, input, output) {
  const p = priceFor(model, day);
  return (input * p.input + output * p.output) / 1e6;
}

// ------------------------------------------------------------
// Cloudflare: GraphQL Analytics
// ------------------------------------------------------------
const CF_QUERY = `query ($acct: String!, $from: Date!, $to: Date!) {
  viewer { accounts(filter: { accountTag: $acct }) {
    workersInvocationsAdaptive(limit: 2000, filter: { date_geq: $from, date_leq: $to }) {
      sum { requests errors subrequests }
      dimensions { date scriptName status }
    }
    kvOperationsAdaptiveGroups(limit: 2000, filter: { date_geq: $from, date_leq: $to }) {
      sum { requests }
      dimensions { date actionType namespaceId }
    }
    kvStorageAdaptiveGroups(limit: 200, filter: { date_geq: $from, date_leq: $to }, orderBy: [date_DESC]) {
      max { byteCount keyCount }
      dimensions { date namespaceId }
    }
  } }
}`;

async function cfGraphql(env, from, to) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CF_QUERY, variables: { acct: env.CF_ACCOUNT_ID, from, to } })
  });
  const body = await res.text();
  let data = {};
  try { data = JSON.parse(body); } catch (_) {}
  if (!res.ok || (data.errors && data.errors.length)) {
    const msg = (data.errors || []).map((e) => e.message).join('; ') || `HTTP ${res.status} ${body.slice(0, 300)}`;
    throw new Error(`GraphQL: ${msg}`);
  }
  return data.data.viewer.accounts[0] || {};
}

async function analyticsSql(env, sql) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
    body: sql
  });
  if (!res.ok) throw new Error(`Analytics Engine ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).data || [];
}

async function collectCloudflare(env, today, now) {
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i - 7));
  let acct;
  try {
    acct = await cfGraphql(env, days[0], today);
  } catch (e) {
    // El plan gratuito puede limitar cuánto hacia atrás se consulta: se
    // reintenta con solo ayer y hoy antes de rendirse.
    acct = await cfGraphql(env, addDays(today, -1), today);
  }
  const perDay = Object.fromEntries(days.map((d) => [d, Object.fromEntries(CF_LIMITS.map((l) => [l.key, 0]))]));
  const scripts = {};
  for (const row of acct.workersInvocationsAdaptive || []) {
    const { date, scriptName, status } = row.dimensions;
    if (perDay[date]) perDay[date].workers += row.sum.requests;
    if (!OMOT_SCRIPTS.includes(scriptName)) continue;
    const s = scripts[scriptName] || (scripts[scriptName] = { name: scriptName, today: 0, yesterday: 0, errorsToday: 0, cpuLimitToday: 0 });
    if (date === today) {
      s.today += row.sum.requests;
      s.errorsToday += row.sum.errors;
      if (status === 'exceededResources') s.cpuLimitToday += row.sum.requests;
    } else if (date === addDays(today, -1)) {
      s.yesterday += row.sum.requests;
    }
  }
  const kvKey = { read: 'kvRead', write: 'kvWrite', delete: 'kvDelete', list: 'kvList' };
  const kvByNs = {};
  for (const row of acct.kvOperationsAdaptiveGroups || []) {
    const { date, actionType, namespaceId } = row.dimensions;
    const key = kvKey[actionType];
    if (key && perDay[date]) perDay[date][key] += row.sum.requests;
    if (date === today && key && KV_NAMES[namespaceId]) {
      const ns = kvByNs[namespaceId] || (kvByNs[namespaceId] = { name: KV_NAMES[namespaceId] || namespaceId, kvRead: 0, kvWrite: 0, kvDelete: 0, kvList: 0 });
      ns[key] += row.sum.requests;
    }
  }
  const storage = {};
  const seenNs = new Set();
  let accountBytes = 0;
  for (const row of acct.kvStorageAdaptiveGroups || []) {
    const { namespaceId } = row.dimensions;
    if (seenNs.has(namespaceId)) continue; // ya viene ordenado del día más reciente
    seenNs.add(namespaceId);
    accountBytes += row.max.byteCount || 0;
    if (KV_NAMES[namespaceId]) storage[namespaceId] = { name: KV_NAMES[namespaceId], bytes: row.max.byteCount, keys: row.max.keyCount };
  }

  // Puntos escritos en Analytics Engine (solo el dataset de la app, que es
  // el único de la cuenta).
  try {
    const rows = await analyticsSql(env, `SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, SUM(_sample_interval) AS n FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '8' DAY GROUP BY day`);
    for (const r of rows) {
      const d = String(r.day).slice(0, 10);
      if (perDay[d]) perDay[d].aeWrite += Number(r.n) || 0;
    }
  } catch (_) { /* sin dato de Analytics Engine: se queda en 0 */ }

  const dayFraction = (now - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  const metrics = CF_LIMITS.map((l) => {
    const t = perDay[today][l.key];
    const prev = days.slice(0, -1).map((d) => perDay[d][l.key]);
    return {
      key: l.key,
      label: l.label,
      limit: l.limit,
      today: t,
      // Proyección al final del día solo con al menos 3 horas de datos.
      projected: dayFraction >= 0.125 ? Math.round(t / dayFraction) : null,
      yesterday: perDay[addDays(today, -1)][l.key],
      max7: Math.max(0, ...prev)
    };
  });
  const totalBytes = accountBytes; // el límite de 1 GB es de toda la cuenta
  return {
    dayFraction,
    metrics,
    storage: { totalBytes, limit: KV_STORAGE_LIMIT, namespaces: Object.values(storage).sort((a, b) => b.bytes - a.bytes) },
    scripts: Object.values(scripts).sort((a, b) => b.today - a.today),
    kvToday: Object.values(kvByNs).sort((a, b) => (b.kvRead + b.kvWrite) - (a.kvRead + a.kvWrite)),
    daily: days.map((d) => ({ day: d, ...perDay[d] }))
  };
}

// ------------------------------------------------------------
// IA: tokens anotados por el proxy
// ------------------------------------------------------------
async function collectAi(env, today, config, now) {
  const [usage, sessions] = await Promise.all([
    analyticsSql(env, `SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, blob2 AS model, blob3 AS kind, blob4 AS provider,
      SUM(_sample_interval * double1) AS n, SUM(_sample_interval * double2) AS input, SUM(_sample_interval * double3) AS output
      FROM ${DATASET} WHERE blob1 = '${USAGE_MARK}' AND timestamp > NOW() - INTERVAL '35' DAY GROUP BY day, model, kind, provider`),
    analyticsSql(env, `SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, SUM(_sample_interval * double1) AS n
      FROM ${DATASET} WHERE blob1 != '${USAGE_MARK}' AND blob3 = 'city' AND timestamp > NOW() - INTERVAL '35' DAY GROUP BY day`)
  ]);
  const days = {};
  const dayRow = (d) => days[d] || (days[d] = {
    day: d, gemini: { n: 0, input: 0, output: 0, eur: 0 }, claude: { n: 0, input: 0, output: 0, usd: 0 },
    tts: { n: 0, chars: 0 }, sessions: 0, models: {}
  });
  for (const r of usage) {
    const d = String(r.day).slice(0, 10);
    const row = dayRow(d);
    const n = Number(r.n) || 0, input = Number(r.input) || 0, output = Number(r.output) || 0;
    if (r.kind === 'tts') { row.tts.n += n; row.tts.chars += input; continue; }
    if (r.provider === 'claude') {
      row.claude.n += n; row.claude.input += input; row.claude.output += output;
      row.claude.usd += costUsd(r.model, d, input, output);
      continue;
    }
    row.gemini.n += n; row.gemini.input += input; row.gemini.output += output;
    row.gemini.eur += costUsd(r.model, d, input, output) * config.usdEur * config.calib;
    row.models[r.model] = (row.models[r.model] || 0) + n;
  }
  for (const r of sessions) dayRow(String(r.day).slice(0, 10)).sessions += Number(r.n) || 0;
  const list = Object.values(days).sort((a, b) => a.day.localeCompare(b.day));

  // Saldo: lo leído a mano menos lo gastado DESPUÉS de ese día (los costes
  // de Google tardan horas en aparecer, así que el día de la lectura ya
  // está descontado en el saldo que se apuntó).
  const spentSince = list.filter((d) => d.day > config.balanceDate).reduce((n, d) => n + d.gemini.eur, 0);
  const remaining = Math.max(0, config.balanceEur - spentSince);

  // Media de los últimos 7 días completos, en tokens (no en euros) para
  // poder aplicarle el precio de cada fecha futura.
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 7));
  const sum7 = last7.reduce((acc, d) => {
    const r = days[d];
    if (r) { acc.input += r.gemini.input; acc.output += r.gemini.output; acc.eur += r.gemini.eur; acc.sessions += r.sessions; acc.n += r.gemini.n; }
    return acc;
  }, { input: 0, output: 0, eur: 0, sessions: 0, n: 0 });
  const avg = { input: sum7.input / 7, output: sum7.output / 7 };
  const dailyEur = (day) => costUsd('gemini', day, avg.input, avg.output) * config.usdEur * config.calib;

  // Simulación día a día desde hoy: dura hasta que se acaba el saldo o
  // caducan los créditos, lo que llegue antes.
  let left = remaining, day = today, runwayDays = null, endsBy = 'none';
  for (let i = 0; i < 1000; i++) {
    if (day >= config.expiry) { endsBy = 'expiry'; runwayDays = i; break; }
    left -= dailyEur(day);
    if (left <= 0) { endsBy = 'balance'; runwayDays = i + 1; break; }
    day = addDays(day, 1);
  }
  const monthNow = isoDay(now).slice(0, 7);
  const ttsMonth = list.filter((d) => d.day.startsWith(monthNow)).reduce((n, d) => n + d.tts.chars, 0);

  return {
    days: list,
    last7: { ...sum7, avgDailyEur: sum7.eur / 7, costPerSessionEur: sum7.sessions ? sum7.eur / sum7.sessions : null },
    gemini: {
      balanceEur: config.balanceEur,
      balanceDate: config.balanceDate,
      expiry: config.expiry,
      spentSince,
      remainingEur: remaining,
      monthlyNowEur: dailyEur('2026-10-01') * 30,
      monthly2027Eur: dailyEur('2027-01-01') * 30,
      runwayDays,
      endsOn: runwayDays == null ? null : addDays(today, runwayDays),
      endsBy
    },
    tts: { monthChars: ttsMonth, freeChars: TTS_FREE_CHARS_MONTH }
  };
}

// ------------------------------------------------------------
// Alertas
// ------------------------------------------------------------
function buildAlerts(snap) {
  const alerts = [];
  const add = (key, level, text) => alerts.push({ key, level, text });
  if (snap.cf && snap.cf.metrics) {
    for (const m of snap.cf.metrics) {
      const ratio = m.today / m.limit;
      if (ratio >= ALERT_URGENT) add(`cf:${m.key}`, 2, `${m.label}: ${fmtN(m.today)} de ${fmtN(m.limit)} hoy (${fmtPct(ratio)}). Al llegar al 100 % Cloudflare corta hasta las 00:00 UTC.`);
      else if (ratio >= ALERT_WARN) add(`cf:${m.key}`, 1, `${m.label}: ${fmtN(m.today)} de ${fmtN(m.limit)} hoy (${fmtPct(ratio)}).`);
      else if (m.projected && m.projected >= m.limit && snap.cf.dayFraction >= 0.25) add(`cf:${m.key}`, 1, `${m.label}: a este ritmo hoy se llegaría a ${fmtN(m.projected)}, por encima del límite de ${fmtN(m.limit)}.`);
    }
    const cpu = snap.cf.scripts.reduce((n, s) => n + s.cpuLimitToday, 0);
    if (cpu > 0) add('cf:cpu', cpu >= 50 ? 2 : 1, `${fmtN(cpu)} peticiones cortadas hoy por pasar del límite de CPU del plan gratuito (10 ms).`);
    const st = snap.cf.storage;
    if (st.totalBytes / st.limit >= ALERT_WARN) add('cf:kvStorage', st.totalBytes / st.limit >= ALERT_URGENT ? 2 : 1, `Almacenamiento KV: ${(st.totalBytes / 1e6).toFixed(0)} MB de 1.000 MB.`);
  }
  if (snap.ai && snap.ai.gemini) {
    const g = snap.ai.gemini;
    if (g.endsBy === 'balance' && g.runwayDays <= 10) add('ai:runway', 2, `El saldo de Gemini (${fmtEur(g.remainingEur)} estimados) se acaba en unos ${g.runwayDays} días, hacia el ${g.endsOn}.`);
    else if (g.endsBy === 'balance' && g.runwayDays <= 30) add('ai:runway', 1, `El saldo de Gemini (${fmtEur(g.remainingEur)} estimados) se acaba en unos ${g.runwayDays} días, hacia el ${g.endsOn}.`);
    const y = snap.ai.days.find((d) => d.day === addDays(snap.today, -1));
    if (y && y.gemini.eur >= 0.1 && y.gemini.eur > 3 * snap.ai.last7.avgDailyEur) add('ai:spike', 1, `Gasto de Gemini de ayer: ${fmtEur(y.gemini.eur)}, más del triple de la media de 7 días (${fmtEur(snap.ai.last7.avgDailyEur)}).`);
    if (y && y.claude.n >= 5) add('ai:claude', 1, `Ayer contestó Claude ${y.claude.n} veces: Gemini falló (saturado o sin saldo).`);
    const tts = snap.ai.tts;
    if (tts.monthChars / tts.freeChars >= ALERT_WARN) add('ai:tts', tts.monthChars / tts.freeChars >= ALERT_URGENT ? 2 : 1, `Voz (Text-to-Speech): ${fmtN(tts.monthChars)} caracteres este mes de ${fmtN(tts.freeChars)} gratis.`);
  }
  return alerts;
}

// ------------------------------------------------------------
// Correo
// ------------------------------------------------------------
function encodeHeader(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

async function sendMail(env, subject, text) {
  const raw = [
    `From: ${encodeHeader('Alerta Consumo API')} <${env.REMITENTE}>`,
    `To: <${env.DESTINO}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${env.REMITENTE.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text
  ].join('\r\n');
  await env.CORREO.send(new EmailMessage(env.REMITENTE, env.DESTINO, raw));
}

function summaryText(snap, alerts) {
  const out = [];
  if (alerts.length) {
    out.push('AVISOS', ...alerts.map((a) => `${a.level === 2 ? '[URGENTE]' : '[Aviso]'} ${a.text}`), '');
  }
  if (snap.ai && snap.ai.gemini) {
    const g = snap.ai.gemini, l7 = snap.ai.last7;
    out.push('GEMINI (saldo prepago)',
      `Saldo estimado: ${fmtEur(g.remainingEur)} (leído ${fmtEur(g.balanceEur)} el ${g.balanceDate}; gastado desde entonces ${fmtEur(g.spentSince)})`,
      `Últimos 7 días: ${fmtN(l7.n)} respuestas, ${fmtEur(l7.eur)} (media ${fmtEur(l7.avgDailyEur)}/día)`,
      `Previsión al ritmo actual: ${fmtEur(g.monthlyNowEur)}/mes hasta diciembre, ${fmtEur(g.monthly2027Eur)}/mes desde enero de 2027 (precio x2)`,
      g.endsBy === 'balance' ? `El saldo dura hasta el ${g.endsOn} (unos ${g.runwayDays} días)`
        : g.endsBy === 'expiry' ? `El saldo llega hasta la caducidad de los créditos (${g.expiry})`
          : 'Sin gasto suficiente para prever un final',
      l7.costPerSessionEur != null ? `Coste por sesión de ciudad: ${fmtEur(l7.costPerSessionEur * 1000)} cada 1.000 sesiones` : '',
      `Voz: ${fmtN(snap.ai.tts.monthChars)} caracteres este mes (gratis hasta ${fmtN(snap.ai.tts.freeChars)})`,
      '');
  } else if (snap.aiError) {
    out.push(`GEMINI: sin datos (${snap.aiError})`, '');
  }
  if (snap.cf && snap.cf.metrics) {
    out.push('CLOUDFLARE (plan gratuito, límites diarios de toda la cuenta)');
    for (const m of snap.cf.metrics) {
      out.push(`${m.label}: hoy ${fmtN(m.today)} · ayer ${fmtN(m.yesterday)} · máx. 7 días ${fmtN(m.max7)} · límite ${fmtN(m.limit)} (${fmtPct(Math.max(m.today, m.yesterday, m.max7) / m.limit)} en el peor día)`);
    }
    out.push(`Almacenamiento KV: ${(snap.cf.storage.totalBytes / 1e6).toFixed(1)} MB de 1.000 MB`);
    out.push('Por Worker (hoy / ayer): ' + snap.cf.scripts.map((s) => `${s.name} ${fmtN(s.today)} / ${fmtN(s.yesterday)}`).join(' · '));
    out.push('');
  } else if (snap.cfError) {
    out.push(`CLOUDFLARE: sin datos (${snap.cfError})`, '');
  }
  out.push(`Panel: ${snap.panelUrl} (pestaña Consumo)`);
  return out.filter((l) => l !== null).join('\n');
}

// ------------------------------------------------------------
// Ejecución
// ------------------------------------------------------------
async function run(env, { mail = 'auto', now = Date.now() } = {}) {
  const today = isoDay(now);
  let config = DEFAULT_CONFIG;
  try { config = { ...DEFAULT_CONFIG, ...(JSON.parse(await env.PREMIUM.get('usage:config')) || {}) }; } catch (_) {}

  const snap = { generatedAt: new Date(now).toISOString(), today, panelUrl: env.PANEL_URL, config };
  const [cf, ai] = await Promise.allSettled([collectCloudflare(env, today, now), collectAi(env, today, config, now)]);
  if (cf.status === 'fulfilled') snap.cf = cf.value; else snap.cfError = String(cf.reason && cf.reason.message || cf.reason);
  if (ai.status === 'fulfilled') snap.ai = ai.value; else snap.aiError = String(ai.reason && ai.reason.message || ai.reason);
  snap.alerts = buildAlerts(snap);
  await env.PREMIUM.put('usage:snapshot', JSON.stringify(snap));

  // Un aviso se manda una vez al día por motivo, salvo que suba de nivel.
  let state = { day: today, sent: {} };
  try {
    const saved = JSON.parse(await env.PREMIUM.get('usage:alerts'));
    if (saved && saved.day === today) state = saved;
  } catch (_) {}
  const fresh = snap.alerts.filter((a) => (state.sent[a.key] || 0) < a.level);

  const hour = new Date(now).getUTCHours();
  const weekly = hour === 6 && new Date(now).getUTCDay() === 1;
  let sent = null;
  if (mail === 'test' || weekly) {
    sent = mail === 'test' ? 'test' : 'weekly';
    await sendMail(env, `${mail === 'test' ? '[Prueba] ' : ''}Resumen semanal de consumo · OnMyOwnTrip`, summaryText(snap, snap.alerts));
  } else if (mail === 'auto' && fresh.length) {
    sent = 'alert';
    const urgent = fresh.some((a) => a.level === 2);
    await sendMail(env, `${urgent ? 'URGENTE' : 'Aviso'}: ${fresh[0].text.split(':')[0]}${fresh.length > 1 ? ` y ${fresh.length - 1} más` : ''} · OnMyOwnTrip`, summaryText(snap, fresh));
  } else if (mail === 'auto' && (snap.cfError || snap.aiError) && hour === 6) {
    // Si la recogida de datos falla, se avisa una vez al día.
    sent = 'error';
    await sendMail(env, 'El monitor de consumo no pudo leer los datos · OnMyOwnTrip', summaryText(snap, []));
  }
  if (sent && sent !== 'test' && fresh.length) {
    for (const a of fresh) state.sent[a.key] = a.level;
    await env.PREMIUM.put('usage:alerts', JSON.stringify(state));
  }
  return { ...snap, mailSent: sent };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, { now: event.scheduledTime }));
  },

  // /run?key=MONITOR_KEY[&mail=none|test] para lanzarlo a mano.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/run' || !env.MONITOR_KEY || url.searchParams.get('key') !== env.MONITOR_KEY) {
      return new Response('not found', { status: 404 });
    }
    const mail = ['none', 'test', 'auto'].includes(url.searchParams.get('mail')) ? url.searchParams.get('mail') : 'none';
    try {
      const snap = await run(env, { mail });
      return new Response(JSON.stringify(snap, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
};
