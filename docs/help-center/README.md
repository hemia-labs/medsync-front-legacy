# Centro de ayuda (vista previa de desarrollo)

La ruta `/ayuda` y el acceso Centro de ayuda usan el router y layout existentes. Solo se incluyen con `NODE_ENV=development`; esta entrega no habilita ayuda terminada en producción.

Hay 33 guías en borrador, organizadas en siete temas por tareas, y 23 preguntas propuestas por validar, con respuestas breves y enlaces a sus guías. Los temas tienen anclas reales y solo las entradas con contenido abren artículos. Los identificadores se mantienen entre el índice y el contenido.

- [Estándar editorial y fuentes](HELP_CENTER_EDITORIAL_STANDARD.md).
- [Arquitectura y relación con pantallas](HELP_CENTER_CONTENT_ARCHITECTURE.md).
- [Índice](../../src/domain/help/helpIndex.js).
- [Borradores](../../src/domain/help/helpArticles.js).

Los documentos de estándar y arquitectura conservan notas de las etapas anteriores (estructura, primer artículo y redacción por temas). El estado vigente es 33 guías y 23 respuestas FAQ redactadas. Los flujos se contrastaron con las pantallas y servicios del repositorio; no se ejecutaron acciones sobre pacientes ni envíos reales. En particular, el cambio de contraseña actual llama al servicio de verificación por correo, pero no se verificó la entrega del código. La edición administrativa del paciente no tiene entrada visible en todas las vistas clínicas; la guía describe la ruta disponible sin inventar controles.

## Validación

Desde el repositorio, con Node 22 y las dependencias instaladas:

```powershell
npm run lint -- --no-fix src/domain/help/helpArticles.js src/domain/help/helpAnswers.js src/domain/help/helpIndex.js src/views/Help/HelpCenter.vue src/router/routes/help.js src/router/index.js src/core/navigation/tenantNavigation.js scripts/qa/help-center-browser.cjs
$env:HELP_QA_SKIP_LIVE='1'
node scripts/qa/help-center-browser.cjs
```

El arnés usa Edge/Playwright con los componentes reales y sesiones sintéticas. Comprueba 33 artículos, 23 respuestas y sus enlaces a guías, referencias, enlaces, teclado, foco, encabezados, modo nocturno y reflow a 1440/390/320 px. Escribe resultados y capturas en el directorio temporal `medsync-help-center-qa`; se puede cambiar con `HELP_QA_OUTPUT`. `HELP_QA_BUILD` señala el directorio de un build de producción para comprobar su exclusión (por defecto dist). Sin `HELP_QA_SKIP_LIVE=1`, también requiere un servidor local en 4324 y comprueba la redirección anónima al login con API bloqueada.

Lint, navegador sintético y compilaciones de desarrollo/producción se comprobaron localmente. Se revisaron capturas de escritorio y móvil. La prueba detectó y corrigió un enlace de regreso oculto tras el footer en artículos cortos. Persisten avisos previos de Sass, prefetch de PulseBackdrop y tamaño de bundles. La comprobación del servidor real se omite cuando los servidores están detenidos por solicitud.

No se declara validación autenticada, con lector de pantalla ni revisión clínica/legal del contenido. Faltan revisión editorial y pruebas con usuarios. No se han añadido imágenes editoriales, nuevos servicios, dependencias ni cambios a los flujos clínicos. El siguiente paso de publicación en producción requiere una decisión explícita aparte.

## Respuestas FAQ (2026-10-27)

Las respuestas viven en `src/domain/help/helpAnswers.js`, vinculadas por ID al catálogo. Cada pregunta usa un control nativo `summary` dentro de `details`, bajo el tema h3; los títulos permanecen visibles y las respuestas se despliegan individualmente. El enlace conduce a la guía existente. No se duplican tutoriales. Se mantiene el límite a desarrollo. El arnés comprueba cada respuesta y navega a las 23 guías relacionadas mediante teclado, con retorno al historial, en los tres tamaños de pantalla.

## Correcciones de navegación y lectura (2026-10-27)

El buscador local consulta títulos y contenido, tolera acentos y ofrece sinónimos comunes. Los resultados abren la guía o la pregunta correspondiente. Las guías incorporan resúmenes, ubicación en el sistema, requisitos previos, etiquetas de interfaz destacadas, notas y preguntas relacionadas. Los temas siguen visibles sin niveles de acordeones. Se corrigen acentos en pantallas relacionadas para mantener consistencia con la ayuda.

La preparación conserva el descarte del aviso de finalización aunque aparezca temporalmente un pendiente; los pendientes reales siguen mostrándose. Su regresión usa servicios simulados y no escribe en la base de datos.
