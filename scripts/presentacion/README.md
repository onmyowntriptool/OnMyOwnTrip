# Presentación de OnMyOwnTrip

Fuente de la presentación web publicada en
<https://onmyowntrip.com/presentacion/>.

```
scripts/presentacion/
  evento.json      variables (lo que cambia de un evento a otro)
  slides/NN-*.html una diapositiva por archivo, con {{variables}}
  plantilla.html   carcasa de la página: estilos, animaciones, navegación
  build.js         genera presentacion/index.html + presentacion/img/
```

Generar:

```
node scripts/presentacion/build.js
```

Al terminar imprime las cifras calculadas, a dónde apunta el QR y una lista
**REVISAR** si algo no cuadra (ciudad sin medalla, medalla sin ciudad,
ciudad nueva sin colocar, imagen que falta). Después, commit + push de
`presentacion/` y GitHub Pages la publica en uno o dos minutos.

## Checklist para cada nueva presentación

1. **Título del evento** (etiqueta naranja de la portada, p. ej. "DÍA MUNDIAL
   DEL TURISMO 2026"): `evento.titulo`. El tema/subtítulo va en `evento.tema`.
2. **Dónde y cuándo** (línea bajo el nombre en la portada): `evento.lugar` y
   `evento.fecha`.
3. **Diapositiva 7, cifras**: destinos, países y lugares narrados se calculan
   solos desde `data/core.js` y `data/cities/`. Revisar además a mano
   `cifras.idiomas_modos` y `cifras.plataformas` (idiomas, iOS/Android...).
4. **Diapositiva 8, medallas**: salen de `assets/badges/<id>.png`. Si hay
   una ciudad nueva, el build la añade al final y avisa: colocarla en
   `destinos.orden`. Nombres o países que quieras mostrar distinto a la app:
   `destinos.nombres` / `destinos.paises`.
5. **Diapositiva 11, hitos**: actualizar `hitos.hecho` y `hitos.proximos`
   (las notas de orador se generan a partir de estas listas).
6. **Diapositiva 12, región del foro**: `region.nombre` ("Latinoamérica",
   "Europa", "Asia"...). Revisar también la línea de expansión en
   `hitos.proximos` y la ciudad de demo (`demo.ciudad`, `demo.lugar`) que se
   usa en las diapositivas 7 y 13: conviene que sea la del país anfitrión.
7. **Diapositiva 13, QR**: se genera desde `descarga.qr_url`. Cuando las
   apps estén publicadas, rellenar `descarga.android` / `descarga.ios`
   (aparecen como botones y desaparece "Próximamente") y apuntar el QR a la
   tienda correspondiente.

Otros datos: ponente (`ponente.*`). Para cambiar un texto fijo de una
diapositiva, editar su archivo en `slides/`.

## Notas

- `data/cities/` no está en git (contenido de pago): el recuento de lugares
  solo funciona en un equipo que lo tenga. Si no está, poner
  `cifras.lugares` a mano en `evento.json`.
- Las capturas salen de `assets/capturas-ficha/final/` y las medallas de
  `assets/badges/`; si una fuente no está, se reutiliza la imagen ya generada
  en `presentacion/img/`.
- Formato de las diapositivas: el mismo subconjunto HTML del tipo "Slides"
  de claude.ai (1920×1080, estilos en línea, `<aside>` = notas). Por eso se
  pueden volver a publicar como deck descargable en .pptx/PDF si hace falta.
- En la página: clic/flechas/espacio avanzan, borde izquierdo retrocede,
  `F` pantalla completa, `N` notas, `#n` en la URL abre la diapositiva n.
