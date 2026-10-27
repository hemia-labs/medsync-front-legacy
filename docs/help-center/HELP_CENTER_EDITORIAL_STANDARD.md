# Centro de ayuda: estándar editorial

Estado vigente: 33 guías y 23 respuestas FAQ en borrador. Las preguntas siguen propuestas por validar; no hay métricas de frecuencia. Las notas siguientes registran etapas anteriores.

Fecha: 2026-10-26. Estado: criterio adoptado para la estructura local; redacción pendiente.

Actualización posterior autorizada: [primer artículo modelo](README.md) redactado como borrador local. La restricción de solo títulos de la entrega inicial sigue vigente para las otras 32 guías y las 23 preguntas. Los criterios editoriales se mantienen; los artículos redactados pueden tener enlaces reales desde el índice y mostrar su estado de revisión.

## Fuentes leídas y decisiones

Estas son recomendaciones editoriales, salvo los criterios WCAG identificados por separado. No constituyen una norma universal ni investigación con usuarios de MedSync.

| Fuente consultada | Recomendación verificada | Aplicación en MedSync |
| --- | --- | --- |
| [Diátaxis](https://diataxis.fr/) | Distinguir tutoriales, guías de tareas, referencia y explicación según la necesidad del lector. | Separar la intención de cada entrada internamente; mostrar solo Guía de uso y Preguntas frecuentes. No convertir el menú técnico en índice. |
| [Diátaxis: guías de tareas](https://diataxis.fr/how-to-guides/) | Organizar por el resultado que busca la persona, desde su perspectiva. | Una tarea principal por título; agrupar botones que participan en una misma tarea. |
| [Diátaxis: tutoriales](https://diataxis.fr/tutorials/) | Un tutorial es una experiencia guiada de aprendizaje. | La preparación existente conserva ese papel. El centro será consulta permanente, sin otro recorrido ni activación automática del onboarding. |
| [Digital.gov: encabezados](https://digital.gov/guides/plain-language/design/headings) | Encabezados específicos facilitan orientación; las preguntas ayudan cuando se conocen las dudas de la audiencia. | Preguntas completas para restricciones, estados y recuperación; reconocer que aquí son propuestas sin evidencia de frecuencia. |
| [GOV.UK: estructura](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-structure/) | Poner primero lo importante; encabezados descriptivos y activos. Desaconseja preguntas como encabezados. | Adoptar acciones para la guía. Mantener preguntas en la sección solicitada porque allí expresan mejor incertidumbres. Esta es una decisión de producto ante recomendaciones diferentes. |
| [GOV.UK: lenguaje](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) | Voz activa, palabras familiares, claridad también para especialistas; explicar términos necesarios. | Adaptar a español de México, sin trasladar mecánicamente reglas gramaticales del inglés. |
| [GOV.UK: títulos](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-titles/) | Títulos únicos, informativos, comprensibles fuera de contexto y breves. | Preferir verbo en infinitivo y objeto; no imponer su límite editorial de 65 caracteres ni su regla inglesa de participios. Revisar títulos largos en móvil. |
| [Google: imágenes](https://developers.google.com/style/images) | Usar imágenes cuando aportan explicación visual; recortar capturas, evitar datos personales y aportar alternativas textuales. | Texto como base, capturas reales con datos ficticios solo donde aporten orientación. Sin imágenes para artículos en esta fase. |
| [WAI: estructura](https://www.w3.org/WAI/tutorials/page-structure/) y [encabezados](https://www.w3.org/WAI/tutorials/page-structure/headings/) | Regiones identificables y encabezados anidados de forma lógica. Son guías de implementación, no el texto normativo de WCAG. | Un h1, h2 de sección, h3 de tema; listas para títulos aún sin contenido. Navegación con nombre accesible y destinos reales. |

## Lenguaje y títulos

- Español natural de México, cercano, respetuoso y directo. Usar tú cuando sea necesario dirigirse a la persona; evitar alternarlo con usted.
- Preferir registrar, encontrar, guardar, revisar, cambiar y cancelar. Evitar gestión integral, parametrización, tenant, ejecutar alta, endpoints y nombres de componentes.
- Conservar historia clínica, receta, consentimiento, cédula y odontograma cuando corresponda; no diluir términos clínicos conocidos ni presentar consejo clínico como ayuda de software.
- Usar los nombres visibles de pantallas y controles cuando orienten; por ejemplo, Mi perfil profesional y Personal y usuarios. No copiar faltas de acentuación del código en títulos editoriales.
- Una necesidad por título, mayúsculas de oración, sin puntos finales en títulos de guía. Preguntas con ambos signos. No obligar a empezar con Cómo. Evitar General, Otros, Información y promesas comerciales.
- En redacción futura, distinguir guardado, emisión, firma y finalización. No insinuar que completar una guía concede permisos o guarda datos.

## Organización y prioridad

Sección → tema → entrada. Sin subcategorías ni acordeones anidados. Los títulos sin contenido no son enlaces. Los temas enlazan a encabezados existentes. No se necesita buscador para la primera versión; los temas se ven completos y cada sección reúne un índice breve.

Clasificación interna de intención: **empezar**, **tarea**, **concepto**, **problema**. Es una adaptación operativa, no los cuatro cuadrantes literales de Diátaxis. Una misma tarea conserva un único artículo aunque se relacione con varias preguntas.

Orden propuesto: requisitos iniciales → agenda y pacientes → atención clínica y documentos con consecuencias de guardado/firma → equipo y ajustes ocasionales → recuperación de acceso. Acceso permanece a un salto mediante el índice. Dentro de cada tema se respeta la secuencia de trabajo; las dependencias remiten por identificadores a títulos previos, aunque el artículo aún no exista.

La prioridad es una **hipótesis razonada** basada en dependencias del código y riesgo de error. No hay métricas, entrevistas ni tickets analizados. No usar “Lo más consultado”. Todas las preguntas son **propuestas por validar**. Validarlas con médicos, recepción y administración mediante tareas de búsqueda, y con consultas de soporte anonimizadas cuando existan; eliminar duplicados o preguntas sin utilidad comprobada.

## Imágenes, color y mantenimiento

- No exigir una imagen por artículo ni usar decoración para llenar espacio. Diagramas solo para relaciones o decisiones difíciles de expresar brevemente.
- Capturas de la aplicación real con datos ficticios; no generar pantallas ficticias ni reutilizar datos de pacientes. Recortar a la zona relevante.
- Texto alternativo según la información que aporta la imagen y explicación suficiente alrededor. Nunca dejar una instrucción esencial solo dentro de una captura.
- Registrar pantalla/ruta, revisión o versión del producto, fecha, escenario, tamaño de pantalla y responsable de revisión de cada captura. Revisarlas cuando cambie esa pantalla.
- Reutilizar tipografía del sistema, iconos MDI, tarjetas Vuetify, colores del layout y estados diurno/nocturno. El color refuerza jerarquía; selección también mediante borde, peso y atributo accesible. No crear códigos de color por especialidad o rol.
- Sugerencias internas de capturas por flujo figuran en la arquitectura; no son requisitos de producción de imágenes en esta entrega.

## Accesibilidad aplicable

Objetivo de implementación: criterios relevantes de WCAG 2.2 A/AA. Esto no declara conformidad integral de la aplicación ni es una conclusión jurídica. Los documentos Understanding explican criterios normativos; las técnicas son formas de cumplirlos, no la única forma.

| Criterio | Regla verificable para este centro |
| --- | --- |
| 1.3.1 Información y relaciones; 2.4.6 Encabezados y etiquetas ([WAI](https://www.w3.org/WAI/tutorials/page-structure/)) | Jerarquía semántica h1/h2/h3, listas reales, controles con nombres inequívocos. No usar solo tamaño o negrita como estructura. |
| [1.4.1 Uso del color, A](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) | No comunicar selección, estado o significado exclusivamente con color. |
| [2.1.1 Teclado, A](https://www.w3.org/WAI/WCAG22/Understanding/keyboard) | Todo control accesible por teclado, sin capturar Tab ni crear trampas. Enlaces nativos para navegación. |
| [2.4.7 Foco visible, AA](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) | Contorno persistente mientras el control tiene foco. Al saltar de tema, enfocar su encabezado y mantenerlo visible. |
| [1.4.10 Redistribución, AA](https://www.w3.org/WAI/WCAG22/Understanding/reflow) | Índice sin desplazamiento horizontal a 320 píxeles CSS; filas adaptables y títulos sin truncar. |

Para la próxima redacción se deberán comprobar también alternativas de imágenes (1.1.1), contraste de texto (1.4.3), contraste de componentes (1.4.11), foco no oculto (2.4.11) y tamaño mínimo de objetivos (2.5.8). Esta entrega usa controles de al menos 44 px de alto como decisión de comodidad, no como umbral universal de AA. Validar lector de pantalla y zoom nativo posteriormente; una prueba DOM no sustituye esas pruebas.

## Límite editorial y siguiente etapa

Estado de todas las entradas: solo título. Sin cuerpos, pasos, respuestas, chatbot, CMS ni imágenes de artículos. La siguiente fase deberá verificar el flujo en un entorno autorizado, redactar, revisar permisos/prerrequisitos y hacer revisión clínica cuando corresponda antes de publicar. Conservar identificadores aunque cambie el título. No cambiar el bloqueo de producción sin una decisión explícita de publicación.
