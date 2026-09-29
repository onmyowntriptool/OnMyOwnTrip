// Genera site/, lo que publica Cloudflare Pages en onmyowntrip.com
// (Build command: "node scripts/build-site.js", Build output: "site"):
//
//   site/            portada (carpeta portada/ del repo)
//   site/app/        la app web: el repo tal cual se sirve en GitHub Pages
//   site/sw.js       Service Worker "de baja" para la raíz (ver abajo)
//   site/_redirects  atajos (onmyowntrip.com/privacidad, /admin...)
//
// GitHub Pages sigue sirviendo el repo desde la raíz como siempre; esto solo
// afecta a onmyowntrip.com. Sin dependencias de npm a propósito: Cloudflare
// lo ejecuta en cada despliegue y no debe romperse por un paquete.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const APP = path.join(SITE, 'app');

// Lo mismo que excluye build-www.js (herramientas, material de las tiendas,
// proyectos nativos...) salvo admin/ y presentacion/, que la web sí publica.
const EXCLUDE = new Set([
  'node_modules', '.git', 'android', 'ios', 'www', 'site', 'portada',
  'documentacion', '.trae', 'worker', 'scripts',
  'images_rewards', 'scratchpad', '.claude', '.vscode', '.idea', '.github',
  'package.json', 'package-lock.json', '.gitignore', '.gitattributes',
  'capacitor.config.json', 'codemagic.yaml', 'onmyowntrip-qr.png',
  'contenido-poi-referencia.md', 'estudio-bugs-produccion.md',
  'poi-content-dump.txt', 'scratchpad_report.txt', 'test-photo.jpg',
  'debug-ios-localhost-regression.md', 'feedback-testers.md', 'gastos.md',
  'video-promo', 'capturas-ficha', 'video-clips', 'promo_final.mp4',
  'feature-graphic-1024x500.png', 'icon-source-1024.png',
  'Restaurant_icon.jpg', 'cafe_icon.jpg', 'experiencia.jpg', 'hotel.jpg',
]);
// data/cities/ es contenido de pago (gitignored): la app lo pide al Worker.
const EXCLUDE_PATHS = new Set([path.join('data', 'cities')]);

const copyDir = (srcDir, destDir, isRoot) => {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name) || entry.name.endsWith('.ps1')) continue;
    if (isRoot && entry.name.endsWith('.md')) continue;
    const srcPath = path.join(srcDir, entry.name);
    if (EXCLUDE_PATHS.has(path.relative(ROOT, srcPath))) continue;
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath, false);
    else if (entry.isFile()) fs.copyFileSync(srcPath, destPath);
  }
};

fs.rmSync(SITE, { recursive: true, force: true });
copyDir(ROOT, APP, true);
copyDir(path.join(ROOT, 'portada'), SITE, false);

// Hasta que existió la portada, onmyowntrip.com servía la app en la raíz, con
// su Service Worker en /sw.js y alcance "/". Ese SW seguiría sirviendo la app
// cacheada en vez de la portada; el navegador vuelve a pedir /sw.js al
// comprobar actualizaciones, recibe este y se da de baja solo. No borra
// cachés: la Cache API es por origen y la comparte el SW de /app/.
fs.writeFileSync(path.join(SITE, 'sw.js'), `// Da de baja el Service Worker antiguo con alcance "/" (ver scripts/build-site.js).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
`);

fs.writeFileSync(path.join(SITE, '_redirects'), [
  '/privacidad        /app/privacidad          301',
  '/privacidad.html   /app/privacidad          301',
  '/patrocinadores    /app/patrocinador        301',
  '/patrocinador      /app/patrocinador        301',
  '/admin             /app/admin/dashboard     301',
  '/presentacion      /app/presentacion/       301',
  '/presentacion/*    /app/presentacion/:splat 301',
  '/web               /app/                    301',
  '/index.html        /                        301',
  '',
].join('\n'));

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`site/ generado: ${count(SITE)} archivos (${count(APP)} en app/).`);
