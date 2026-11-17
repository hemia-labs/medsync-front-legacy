# Inicio: escena integrada en el encabezado

El encabezado de Inicio ya no muestra una animacion Lottie dentro de un recuadro. La
tarjeta completa es el cielo (fondo segun la hora local) y `HomeHeroScene.vue` pinta
sobre ella un paisaje medico en SVG animado con CSS: clinica con cruz, ambulancia,
globo aerostatico, arboles, colinas y una linea de pulso que recorre la base.

| Manana | Tarde | Noche |
| --- | --- | --- |
| ![Manana](images/home-hero-normal-morning.png) | ![Tarde](images/home-hero-normal-afternoon.png) | ![Noche](images/home-hero-normal-night.png) |

| Dia de Muertos, noche | Navidad, noche | Movil |
| --- | --- | --- |
| ![Dia de Muertos](images/home-hero-day-of-dead-night.png) | ![Navidad](images/home-hero-christmas-night.png) | ![Movil](images/home-hero-normal-afternoon-mobile.png) |

## Horarios

Mismo reloj local que el saludo: manana 05:00-11:59 (amanecer calido), tarde
12:00-18:59 (cielo claro) y noche 19:00-04:59 (tarjeta azul profundo con texto claro,
luna, estrellas y ventanas encendidas). Con el tema oscuro de la app, los tres horarios
usan la paleta nocturna del paisaje y conservan su sol o luna.

## Festividades

Fechas inclusivas, cada ano, calculadas en `src/utils/homeSeason.js`. Un dia unico
tiene prioridad sobre la temporada que lo contiene.

| Fechas | Tema | Elementos |
| --- | --- | --- |
| 14 de febrero | Amor y amistad | Guirnalda y corazones que suben |
| 15 y 16 de septiembre | Fiestas patrias | Papel picado tricolor, fuegos artificiales, banderin |
| 23 de octubre | Dia del Medico | Banderines, globos y confeti |
| 20 de octubre a 3 de noviembre | Dia de Muertos | Papel picado, cempasuchil, veladoras, petalos |
| 1 de diciembre a 1 de enero | Navidad | Luces, nieve, arbol y muneco de nieve con estetoscopio |
| Resto del ano | Normal | Solo el paisaje del horario |

## Comportamiento

- Decorativa: `aria-hidden`, sin interaccion, sin solicitudes externas ni reproductor.
  Se retiran los tres JSON `doctor-*.json` (~3 MB) y `OwnedHomeLottie.vue`.
- Escritorio: ocupa el 62 % derecho de la tarjeta a toda su altura y se desvanece hacia
  el texto, que queda limitado al 58 % izquierdo.
- Hasta 760 px: banda inferior de 8.5rem bajo el texto (antes se ocultaba); sin
  guirnalda ni particulas.
- `prefers-reduced-motion`: imagen fija compuesta, sin animaciones.
- El cambio de horario o de fecha ocurre con el reloj de un minuto de Inicio.

## Verificacion local, Node 22.22.0

- `node scripts/qa/home-season-browser.cjs`: 30 fechas, 54 renders (6 temas x 3
  horarios en 1440 claro, 390 claro y 1440 oscuro), 9 cruces de medianoche por
  viewport, movimiento reducido, sin errores de navegador ni overflow. Requiere Edge.
  `HOME_QA_OUT` permite elegir la carpeta de evidencia.
- `node scripts/qa/s16-home-session-regression.cjs`: PASS.
- `node scripts/qa/ux20-scope-visual.cjs`: 12 casos PASS.
- `npm run lint -- --no-fix` sobre Home.vue, HomeHeroScene.vue y homeSeason.js: PASS.
- `npm run build` con variables HTTPS/D2 sinteticas solo en el proceso: PASS.

La QA es aislada (cabecera y componente reales, sin sesion): no acredita la pantalla
autenticada ni un despliegue. Sin cambios de backend, datos o secretos.

## Reversion

Revertir el commit restaura el recuadro Lottie, la capa `HomeSeasonalDecoration.vue` y
los JSON retirados.
