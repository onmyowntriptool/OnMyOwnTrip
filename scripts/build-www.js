// Copia el repo dentro de www/ para que Capacitor tenga una carpeta limpia
// que empaquetar (sin node_modules, .git, documentacion/, herramientas
// internas, etc.). La web de GitHub Pages sigue sirviéndose desde la raíz
// del repo como siempre; esto solo afecta a la app nativa.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const EXCLUDE = new Set([
  'node_modules', '.git', 'android', 'ios', 'www',
  'documentacion', '.trae', 'worker', 'admin', 'scripts',
  'images_rewards', 'scratchpad', '.claude', '.vscode', '.idea',
  'package.json', 'package-lock.json', '.gitignore', '.gitattributes',
  'capacitor.config.json', 'codemagic.yaml', 'onmyowntrip-qr.png',
  'contenido-poi-referencia.md', 'estudio-bugs-produccion.md',
  'poi-content-dump.txt', 'scratchpad_report.txt', 'test-photo.jpg',
  'debug-ios-localhost-regression.md',
  // material de la ficha de Play Store (vídeos y capturas): no lo usa la app
  'video-promo', 'capturas-ficha', 'video-clips', 'promo_final.mp4',
  'feature-graphic-1024x500.png', 'icon-source-1024.png',
  // JPG sueltos de iconos de patrocinio que la app no referencia (usa los
  // sponsor-*-icon.png): 2,8 MB que no pintan nada en el paquete
  'Restaurant_icon.jpg', 'cafe_icon.jpg', 'experiencia.jpg', 'hotel.jpg',
]);

// Exclusiones por ruta relativa (no por nombre, a diferencia de EXCLUDE):
// data/cities/ es el contenido de pago de cada ciudad, gitignored desde el
// gate V26. La app lo pide siempre al Worker (/content, ver loadCityData en
// app.js) y nunca lo lee en local; si se empaquetara, cualquiera podría
// leerlo descomprimiendo la APK/AAB sin licencia.
const EXCLUDE_PATHS = new Set([
  path.join('data', 'cities'),
]);

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

// Copia manual y recursiva: fs.cpSync no permite copiar un directorio
// dentro de sí mismo (ni con filtro), así que recorremos nosotros mismos
// y simplemente no entramos en las carpetas de la lista de exclusión.
const copyDir = (srcDir, destDir) => {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name) || entry.name.endsWith('.ps1')) continue;
    const srcPath = path.join(srcDir, entry.name);
    if (EXCLUDE_PATHS.has(path.relative(ROOT, srcPath))) continue;
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};
copyDir(ROOT, WWW);

console.log(`www/ generado desde el repo (${fs.readdirSync(WWW).length} elementos en la raíz).`);
