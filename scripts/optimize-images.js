// Reduce el peso de las imágenes de la app (recompensas, niveles de
// explorador, insignias de ciudad e iconos), que venían a 1024x1024 y
// 1-1,6 MB cada una aunque en pantalla se dibujan a 12-96 px (ver los
// <canvas> de index.html y loadExplorerSprite en app.js).
//
// El tamaño de destino de cada grupo deja margen de sobra sobre el tamaño
// real de dibujo, también en pantallas de alta densidad:
//   - recompensas y niveles: canvas de 72-96 px  -> 384 px
//   - mochila: canvas de 28-34 px                -> 256 px
//   - insignias: vista ampliada de 600 px        -> resolución original,
//     solo se recomprimen (son JPEG con extensión .png)
//   - icono de aseos (pin de 12 px)              -> 128 px
//   - iconos de patrocinio (hasta ~80 px)        -> 192 px
//
// Las recompensas, niveles, mochila e insignias pasan por el recorte de
// fondo cuadriculado de loadExplorerSprite (detecta píxeles de color
// neutro), así que se mantienen en PNG sin paleta, con los colores
// exactos: nada de cuantizar colores, que podría hacer que el cuadriculado
// deje de detectarse como neutro.
//
// Uso: node scripts/optimize-images.js [carpeta_salida]
//   Sin argumento sobreescribe assets/ en su sitio. Con carpeta, escribe
//   ahí una copia (para compararla antes de aplicar).
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;

const GROUPS = [
  { dir: 'assets/rewards', size: 384, except: ['mochila-icon.png'] },
  { dir: 'assets/explorer', size: 384 },
  { files: ['assets/rewards/mochila-icon.png'], size: 256 },
  // berlin.png se deja tal cual: su fondo cuadriculado es muy nítido y al
  // recomprimir, el recorte de loadExplorerSprite deja más restos visibles.
  { dir: 'assets/badges', jpeg: true, except: ['berlin.png'] },
  { files: ['assets/icons/restroom.png'], size: 128 },
  { files: ['assets/icons/sponsor-restaurant-icon.png', 'assets/icons/sponsor-cafe-icon.png', 'assets/icons/sponsor-hotel-icon.png', 'assets/icons/sponsor-experience-icon.png'], size: 192 },
];

const listFiles = (g) => g.files || fs.readdirSync(path.join(ROOT, g.dir))
  .filter((f) => f.endsWith('.png') && !(g.except || []).includes(f))
  .map((f) => `${g.dir}/${f}`);

(async () => {
  let before = 0, after = 0;
  for (const g of GROUPS) {
    for (const rel of listFiles(g)) {
      const src = path.join(ROOT, rel);
      const dest = path.join(OUT, rel);
      const input = fs.readFileSync(src);
      const meta = await sharp(input).metadata();
      let pipe = sharp(input);
      if (g.size && Math.max(meta.width, meta.height) > g.size) {
        pipe = pipe.resize(g.size, g.size, { fit: 'inside' });
      }
      const out = g.jpeg
        ? await pipe.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
        : await pipe.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
      // Nunca empeorar: si la versión nueva no pesa menos, se deja la original.
      const final = out.length < input.length ? out : input;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, final);
      before += input.length;
      after += final.length;
      console.log(`${rel.padEnd(46)} ${(input.length / 1024).toFixed(0).padStart(6)} KB -> ${(final.length / 1024).toFixed(0).padStart(5)} KB`);
    }
  }
  console.log(`\nTotal: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
})();
