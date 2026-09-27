// Genera la presentación web (presentacion/index.html + presentacion/img/)
// a partir de las diapositivas de slides/, las variables de evento.json y
// los datos reales de la app. Uso:  node scripts/presentacion/build.js
//
// Qué hace solo:
//  - Cifras de la diapositiva 7 (destinos, países, lugares) desde
//    data/core.js + data/cities/*.js, salvo que evento.json las fuerce.
//  - Rejilla de medallas de la diapositiva 8 desde assets/badges/<id>.png
//    (les quita el fondo de cuadros falso que traen horneado).
//  - QR de la diapositiva 13 desde descarga.qr_url.
//  - Avisos al final si hay ciudades sin medalla, medallas sin ciudad o
//    ciudades nuevas que no están en destinos.orden.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sharp = require('sharp');
const QRCode = require('qrcode');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = __dirname;
const OUT = path.join(ROOT, 'presentacion');
const IMG = path.join(OUT, 'img');
const avisos = [];

const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'evento.json'), 'utf8'));

// ---------- Datos de la app ----------
const loadCities = () => {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data', 'core.js'), 'utf8') + ';this.CITIES = CITIES;', ctx);
  const dir = path.join(ROOT, 'data', 'cities');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
  } else {
    avisos.push('No existe data/cities/ (contenido de pago, no está en git): no se pueden contar los lugares; pon cifras.lugares en evento.json.');
  }
  return ctx.CITIES;
};
const CITIES = loadCities();
const ids = Object.keys(CITIES);
const totalPois = ids.reduce((n, id) => n + ((CITIES[id].pois || []).length), 0);
const paises = new Set(ids.map((id) => CITIES[id].country));

const cifras = cfg.cifras;
cifras.destinos = cifras.destinos ?? ids.length;
cifras.paises = cifras.paises ?? paises.size;
cifras.lugares = cifras.lugares ?? (Math.floor(totalPois / 10) * 10 + '+');
cifras.lugares_num = String(cifras.lugares).replace(/\D/g, '');
cfg.ponente.cargo_minusculas = cfg.ponente.cargo.toLowerCase();

// ---------- Variables {{a.b}} ----------
const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const fill = (s) => {
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/\{\{([a-z_]+(?:\.[a-z_]+)+)\}\}/g, (m, key) => {
      const v = get(cfg, key);
      if (v == null) throw new Error('Variable sin valor en evento.json: ' + key);
      return String(v);
    });
  }
  return s;
};

// ---------- Bloques generados ----------
const li = (arr) => arr.map((t) => `<li>${fill(t)}</li>`).join('\n');
const lista = (arr) => arr.map(fill).join(', ').replace(/, ([^,]*)$/, ' y $1');

const orden = [...cfg.destinos.orden];
for (const id of ids) if (!orden.includes(id)) { orden.push(id); avisos.push(`Ciudad nueva "${id}": añadida al final de la diapositiva 8. Colócala en destinos.orden de evento.json.`); }
for (const id of cfg.destinos.orden) if (!CITIES[id]) avisos.push(`"${id}" está en destinos.orden pero no existe en data/core.js.`);
const destinos = orden.filter((id) => CITIES[id]);

const perRow = Math.ceil(destinos.length / Math.ceil(destinos.length / 7));
const rows = [];
for (let i = 0; i < destinos.length; i += perRow) rows.push(destinos.slice(i, i + perRow));
const medal = rows.length <= 2 ? 176 : 132;
const cell = (id) => {
  const nombre = cfg.destinos.nombres[id] || CITIES[id].name;
  const pais = cfg.destinos.paises[id] || CITIES[id].country;
  return `<div style="width:216px; display:flex; flex-direction:column; align-items:center; gap:8px">
<img src="img/medalla-${id}.webp" alt="Medalla de ${nombre}" style="width:${medal}px; height:${medal}px; object-fit:contain">
<p style="font-family:'Sora', Arial, sans-serif; font-size:26px; font-weight:600; line-height:1.15; color:#F6F2EA; text-align:center">${nombre}</p>
<p style="font-size:24px; line-height:1.2; color:#F5A524; text-align:center">${pais}</p>
</div>`;
};
const DESTINOS_GRID = `<div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:32px">
${rows.map((r) => `<div style="display:flex; flex-direction:row; justify-content:center; align-items:start; gap:20px">\n${r.map(cell).join('\n')}\n</div>`).join('\n')}
</div>`;

const d = cfg.descarga;
const store = (href, label) => `<a href="${href}" target="_blank" rel="noopener" style="font-size:32px; line-height:1.4; color:#0B1630; background:#F5A524; border-radius:16px; padding:16px 28px; font-weight:600">${label}</a>`;
const stores = [d.android && store(d.android, 'Google Play'), d.ios && store(d.ios, 'App Store')].filter(Boolean);
const DESCARGA_ESTADO = stores.length
  ? `<div style="display:flex; flex-direction:row; gap:20px">\n${stores.join('\n')}\n</div>`
  : `<p style="font-size:32px; line-height:1.4; color:#F6F2EA; background:#13254A; border:1px solid #2A4273; border-radius:16px; padding:16px 28px">${fill(d.proximamente)}</p>`;
const DESCARGA_NOTA = stores.length
  ? `Ya está disponible en ${d.android && d.ios ? 'Google Play y App Store' : d.android ? 'Google Play' : 'App Store'}.`
  : 'Muy pronto estará disponible para Android y iPhone.';

const BLOCKS = {
  DESTINOS_GRID,
  HITOS_HECHO: li(cfg.hitos.hecho),
  HITOS_PROXIMOS: li(cfg.hitos.proximos),
  HITOS_NOTA: `Lo que ya está hecho: ${lista(cfg.hitos.hecho)}. Los próximos pasos: ${lista(cfg.hitos.proximos)}.`,
  DESCARGA_ESTADO,
  DESCARGA_NOTA,
};

// ---------- Imágenes ----------
const up2date = (src, dest) => fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;
const SHOTS = path.join(ROOT, 'assets', 'capturas-ficha', 'final');
const IMAGES = [
  ['01_audioguia_segovia.png', 'audioguia-segovia.webp'],
  ['02_chat_ia_roma.png', 'chat-ia-roma.webp'],
  ['03_ninos_quiz.png', 'ninos-quiz.webp'],
  ['04_ninos_premios.png', 'ninos-premios.webp'],
  ['05_llamada_ia.png', 'llamada-ia.webp'],
  ['06_mapa_madrid.png', 'mapa-madrid.webp'],
  ['08_busqueda.png', 'busqueda.webp'],
];

// Las medallas traen un fondo de "cuadros" (falsa transparencia) horneado
// en el JPEG: se rellena desde los bordes todo lo gris no casi blanco (el
// contorno blanco de pegatina frena el relleno) y se queda la mancha opaca
// más grande (la medalla), para descartar ruido suelto.
const cleanBadge = async (src, dest) => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
  const isBg = (i) => { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]; return Math.min(r, g, b) < 215 && Math.max(r, g, b) - Math.min(r, g, b) < 30; };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !isBg(i)) continue;
    seen[i] = 1; rgba[i * 4 + 3] = 0;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w); if (y < h - 1) stack.push(i + w);
  }
  const comp = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  for (let s0 = 0; s0 < w * h; s0++) {
    if (rgba[s0 * 4 + 3] === 0 || comp[s0] !== -1) continue;
    let size = 0; const st = [s0]; comp[s0] = id;
    while (st.length) {
      const i = st.pop(); size++; const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && rgba[j * 4 + 3] !== 0 && comp[j] === -1) { comp[j] = id; st.push(j); }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  for (let i = 0; i < w * h; i++) if (comp[i] !== best) rgba[i * 4 + 3] = 0;
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim().resize(352, 352, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 }).toFile(dest);
};

const buildImages = async () => {
  fs.mkdirSync(IMG, { recursive: true });
  for (const [src, name] of IMAGES) {
    const s = path.join(SHOTS, src), dest = path.join(IMG, name);
    if (!fs.existsSync(s)) { if (!fs.existsSync(dest)) avisos.push(`Falta la captura ${src} en assets/capturas-ficha/final/.`); continue; }
    if (!up2date(s, dest)) await sharp(s).resize({ height: 1100, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest);
  }
  const icon = path.join(ROOT, 'assets', 'icons', 'icon-512.png');
  if (!up2date(icon, path.join(IMG, 'icono.png'))) await sharp(icon).resize(256).png().toFile(path.join(IMG, 'icono.png'));
  const og = path.join(ROOT, 'assets', 'icons', 'feature-graphic-1024x500.png');
  if (fs.existsSync(og) && !up2date(og, path.join(IMG, 'og.png'))) fs.copyFileSync(og, path.join(IMG, 'og.png'));

  const BADGES = path.join(ROOT, 'assets', 'badges');
  for (const id of destinos) {
    const s = path.join(BADGES, id + '.png'), dest = path.join(IMG, `medalla-${id}.webp`);
    if (!fs.existsSync(s)) { avisos.push(`La ciudad "${id}" no tiene medalla en assets/badges/${id}.png.`); continue; }
    if (!up2date(s, dest)) await cleanBadge(s, dest);
  }
  for (const f of fs.readdirSync(BADGES)) {
    const id = f.replace(/\.png$/, '');
    if (!CITIES[id]) avisos.push(`Hay una medalla assets/badges/${f} sin ciudad en data/core.js.`);
  }
  // Imágenes que ya no usa ninguna diapositiva: fuera, para no acumular.
  const keep = new Set([...IMAGES.map((x) => x[1]), 'icono.png', 'og.png', 'qr.png', ...destinos.map((id) => `medalla-${id}.webp`)]);
  for (const f of fs.readdirSync(IMG)) if (!keep.has(f)) fs.rmSync(path.join(IMG, f));

  await QRCode.toFile(path.join(IMG, 'qr.png'), d.qr_url, { width: 960, margin: 2, errorCorrectionLevel: 'M' });
};

// ---------- Diapositivas -> página ----------
const ICONS = {
  Clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  Book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  Lightning: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  Cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  Globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};
const kindOf = (file) => (file.startsWith('medalla-') ? 'badge' : file === 'qr.png' ? 'qr' : file === 'icono.png' ? 'icon' : 'phone');

const buildPage = () => {
  const files = fs.readdirSync(path.join(SRC, 'slides')).filter((f) => f.endsWith('.html')).sort();
  const notes = [];
  const slides = files.map((f, i) => {
    let html = fs.readFileSync(path.join(SRC, 'slides', f), 'utf8').trim();
    for (const [k, v] of Object.entries(BLOCKS)) html = html.split(`{{${k}}}`).join(v);
    html = fill(html);
    const m = html.match(/<aside>([\s\S]*?)<\/aside>/);
    notes.push(m ? m[1].trim() : '');
    html = html.replace(/<aside>[\s\S]*?<\/aside>\n?/, '');
    html = html.replace(/<img src="img\/([^"]+)"/g, (all, file) => {
      if (!fs.existsSync(path.join(IMG, file))) avisos.push(`${f}: falta la imagen img/${file}.`);
      return `<img class="k-${kindOf(file)}" src="img/${file}" loading="${i < 2 ? 'eager' : 'lazy'}"`;
    });
    html = html.replace(/<x-icon name="(\w+)" style="([^"]*)"><\/x-icon>/g, (_, name, style) =>
      `<svg class="k-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${style}; flex:none" aria-hidden="true">${ICONS[name]}</svg>`);
    // Cifras grandes que "cuentan" al entrar.
    html = html.replace(/(font-size:120px; font-weight:700; line-height:1.1; color:#B45309">)(\d+)(\+?)</g,
      (_, pre, n, plus) => `${pre}<span data-count="${n}">${n}</span>${plus}<`);
    const email = cfg.ponente.email;
    html = html.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `<a href="mailto:${email}" style="color:#F5A524">${email}</a>`);
    html = html.replace(/^<section id="([^"]+)" data-transition="fade"/, `<section id="s-$1" class="slide" data-index="${i + 1}" aria-roledescription="diapositiva" aria-label="${i + 1} de ${files.length}"`);
    return html;
  });
  let page = fs.readFileSync(path.join(SRC, 'plantilla.html'), 'utf8');
  page = page.split('{{SLIDES}}').join(slides.join('\n'));
  page = page.split('{{NOTES}}').join(JSON.stringify(notes).replace(/</g, '\\u003c'));
  page = page.split('{{N}}').join(String(files.length));
  page = fill(page);
  fs.writeFileSync(path.join(OUT, 'index.html'), page);
  return files.length;
};

(async () => {
  await buildImages();
  const n = buildPage();
  console.log(`Presentación generada: presentacion/index.html (${n} diapositivas)`);
  console.log(`Cifras: ${cifras.destinos} destinos · ${cifras.paises} países · ${cifras.lugares} lugares (app: ${totalPois} POIs)`);
  console.log(`QR -> ${d.qr_url}`);
  if (avisos.length) { console.log('\nREVISAR:'); for (const a of avisos) console.log(' - ' + a); }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
