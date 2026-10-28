# Centro de ayuda: arquitectura de contenidos

Estado vigente: 33 guías y 23 respuestas FAQ en borrador. Las preguntas siguen propuestas por validar; no hay métricas de frecuencia. Las notas siguientes registran etapas anteriores.

Fecha: 2026-10-26. Alcance: índice local sin artículos ni respuestas, 33 guías y 23 preguntas.

Actualización posterior: [primer artículo modelo](README.md) disponible como borrador bajo el ID `revisar-preparacion`. Las tablas conservan todos los identificadores y relaciones; solo ese título tiene contenido y enlace. Las demás 32 guías y las 23 preguntas siguen sin cuerpo ni respuesta.

## Criterio y orden

Aplicar el [estándar editorial](HELP_CENTER_EDITORIAL_STANDARD.md). El orden es una hipótesis de diseño, sin métricas ni evidencia de frecuencia. Las preguntas están propuestas por validar.

| Orden | Tema | Justificación |
| --- | --- | --- |
| 1 | Empezar a usar MedSync | Identificar pendientes y responsables antes de operar; datos del consultorio, perfil y horarios. |
| 2 | Organizar la agenda | Punto de entrada al trabajo de recepción y del doctor; primero consulta/reserva, después cambios y resultado. |
| 3 | Registrar y encontrar pacientes | Identificar a la persona antes de abrir su expediente; edición y archivo después de la búsqueda. No obliga a registrar un paciente antes de toda reserva: la agenda admite citas con datos de contacto. |
| 4 | Registrar la atención | Captura inicial y alergias antes de finalización; distinguir versiones, seguimiento, odontograma y tratamiento según accesos. |
| 5 | Trabajar con recetas y documentos | Emisión, cancelación y firmas tienen consecuencias distintas de guardar borradores. Mantener juntas las salidas clínicas y separar sus títulos. |
| 6 | Preparar el consultorio y el equipo | Ajustes menos frecuentes y delegación. Las guías de recetas y documentos remiten a estas dependencias, aunque aparezcan más abajo. |
| 7 | Resolver problemas de acceso | Recuperación y cambio de contraseña son necesidades específicas; disponibles a un salto desde el índice, no ocultas en submenús. |

Cada sección tiene los mismos siete temas. Evita reaprender categorías al pasar de guía a preguntas. Todos los temas tienen al menos dos entradas por sección. Los títulos no son enlaces; solo las secciones y los temas navegan. Se conserva el historial de navegación y las anclas en la URL.

## Inspección del producto y límites de alcance

Se leyeron las instrucciones raíz/frontend, README y roadmap maestro, router y layouts, navegación compartida, permisos, preparación inicial, pantallas de pacientes/agenda/atención/documentos/configuración y rutas de backend relacionadas. El frontend y backend estaban limpios al comenzar. Se trabajó sobre el checkout existente, sin cambiar de rama ni descartar trabajo.

| Evidencia real | Consecuencia para la arquitectura |
| --- | --- |
| `src/security/settingsAccess.js`, `src/security/permissions.js`, `src/core/layouts/admin.vue` | El rol y los permisos controlan tareas y ajustes. Un título de ayuda no concede acceso ni asegura que todos puedan ejecutar esa tarea. El índice de vista previa es común y no abre pantallas clínicas. |
| `src/views/Patient/PatientShow.vue`, backend `src/domain/clinicalHistory/access.js` | Ver al paciente no equivale a leer información clínica sensible. Captura inicial es una superficie limitada distinta de la edición/finalización clínica. |
| `src/domain/onboarding/preparationJourney.js`, `preparationGuide.js`, `PreparationChecklist.vue` | Preparación real confirmada por servidor; recorrer una guía no guarda ni completa requisitos. Los pendientes pueden corresponder a otra persona. No se monta otro onboarding. |
| Backend `src/domain/appointments/preparation.js`, frontend `ProfessionalAgendaConfig.vue` | Disponibilidad depende de perfil activo, zona horaria, duración, horarios y activación del consultorio/doctor. Cédula y firma no son requisito de la agenda: la referencia a perfil se limita a identidad y estado activo en ese flujo. |
| `src/views/dates/dates.vue` | Estados, reprogramación, cierre de agenda y recuperación de guardado incierto sustentan preguntas específicas; no preguntas genéricas duplicadas de cada artículo. |
| `src/views/Patient/Sections/MedicalHistory.vue` y backend `src/routes/mysql/clinical-history.js` | Hay borradores, finalización, consulta de versiones y captura inicial. La futura guía deberá distinguir perfil autorizado, campos requeridos y situación del consentimiento; no prometer que un único paso habilita finalizar. |
| `PrescriptionForm.vue`, `Sections/Prescriptions.vue`, `DocumentsAndSignatures.vue` | Guardar borrador, emitir, firmar, imprimir y cancelar son estados/acciones distintos. Identidad, autorización, formato y permisos intervienen por separado. |
| `ChangePassword.vue`, `DAAuthService`, backend `src/routes/mysql/auth.js` | El cambio de contraseña sí llama al servicio y existe confirmación en backend en este checkout. El índice lo incluye; esto no acredita entrega de correo en el entorno remoto. La recuperación desde Login es otro flujo. |
| `src/router/routes/licensing-demo.js` | Ya existe la convención `NODE_ENV === 'development'`. Se reutiliza para ruta y acceso del Centro de ayuda, sin crear flags ni backend. |

Administración prepara el negocio, equipo y accesos dentro de sus permisos; los doctores completan su perfil propio y tareas clínicas autorizadas; recepción/asistencia trabaja con las capacidades concedidas. Los permisos específicos, no el nombre de rol por sí solo, son la autoridad. Odontograma y Tratamiento dependen además de secciones clínicas habilitadas. La matriz no afirma pruebas reales de todas las combinaciones.

Quedan fuera de este primer índice: Fotos (deshabilitado en PatientShow), radiografías sin entrada activa, alta/compras/pagos automáticos sin verificación integral de disponibilidad, procedimientos de Super Admin y capacidades planeadas. Pulso y Análisis del consultorio existen, pero se posponen por alcance editorial de primera entrega; no se presenta un índice exhaustivo de cada pantalla. Cuenta y legal conserva sus textos/avisos existentes. No se añade ayuda pública a Login: `/ayuda` usa el layout autenticado y respeta bloqueos de cuenta pendiente/restringida existentes.

## Dependencias y referencias

Los identificadores de la guía son estables. `prerequisites` identifica lecturas relacionadas con requisitos reales; no es un motor de permisos ni una secuencia obligatoria de tutorial. Para seguimiento, la agenda es necesaria solo si se reserva una cita, no para registrar una fecha sugerida. Las firmas profesionales dependen del documento/firmas requeridas, no de todos los documentos por igual. La finalización clínica remite a documentos por la situación del consentimiento, sin convertir la creación de cualquier documento en aprobación clínica.

`helpIndex.js` separa secciones, temas, flujos y entradas. Cada entrada tiene id, título, sección, tema, orden, tipo, estado e intención; cada pregunta tiene artículo relacionado y estado propuesto. No contiene cuerpos. Los flujos documentan pantalla, ruta de referencia y fuente. `:id` es un parámetro de expediente, nunca un enlace público ni un ID de paciente real. Cambiar un título no cambia su id. No publicar enlaces a artículos hasta que exista contenido revisado.

## Capturas candidatas para la redacción futura

| Títulos / identificadores | Motivo potencial |
| --- | --- |
| `revisar-preparacion`, `perfil-profesional`, `horarios-atencion` | Localizar pendientes, firma y horarios del doctor sin confundirlos con permisos. |
| `cambiar-cita`, `estado-cita` | Localizar acciones y distinguir el registro original de su sustitución. |
| `captura-inicial`, `historia-clinica` | Distinguir recepción, borrador y requisitos de finalización. |
| `preparar-receta`, `firmar-documento` | Diferenciar guardado de emisión y estado de cada firma. |
| `odontograma`, `plan-tratamiento` | Localizar piezas/acciones y el plan activo en pantallas visuales. |
| `revisar-accesos`, `autorizaciones-profesionales` | Distinguir permisos del puesto y autorización del profesional. |

Las demás entradas parten de texto; se decidirá después si una captura aporta valor. No se crearon imágenes para artículos. Las capturas de QA solo documentan la estructura y usan datos sintéticos.

## Índice completo y trazabilidad

Las tablas siguientes se derivan del catálogo implementado. `—` indica que no se declaró una dependencia editorial; no implica ausencia de requisitos de autenticación o permisos.

### Guía de uso

#### Empezar a usar MedSync

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `revisar-preparacion` | Revisar qué falta para empezar | `preparation` | empezar | — |
| `datos-consultorio` | Completar los datos del consultorio | `identity` | empezar | — |
| `perfil-profesional` | Completar tu perfil profesional y firma | `profile` | empezar | — |
| `horarios-atencion` | Configurar los horarios de atención | `schedule` | empezar | perfil-profesional |

#### Organizar la agenda

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `consultar-agenda` | Consultar las citas de un doctor | `appointments` | tarea | horarios-atencion |
| `agendar-cita` | Agendar una cita | `appointments` | tarea | horarios-atencion |
| `cambiar-cita` | Reprogramar o cancelar una cita | `appointments` | tarea | agendar-cita |
| `estado-cita` | Registrar la confirmación o el resultado de una cita | `appointments` | tarea | agendar-cita |

#### Registrar y encontrar pacientes

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `registrar-paciente` | Registrar un paciente | `patientNew` | tarea | — |
| `encontrar-paciente` | Encontrar un paciente y abrir su expediente | `patients` | tarea | — |
| `datos-paciente` | Actualizar los datos de contacto de un paciente | `patientRecord` | tarea | encontrar-paciente |
| `archivar-paciente` | Archivar o restaurar un paciente | `patientRecord` | tarea | encontrar-paciente |

#### Registrar la atención

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `captura-inicial` | Preparar la captura inicial desde recepción | `intake` | tarea | registrar-paciente |
| `alergias-paciente` | Revisar y registrar las alergias del paciente | `allergy` | tarea | encontrar-paciente |
| `historia-clinica` | Guardar y finalizar una historia clínica | `history` | tarea | perfil-profesional, documento-paciente |
| `consultar-historia` | Consultar versiones de la historia clínica | `history` | tarea | encontrar-paciente |
| `seguimiento` | Registrar un seguimiento y su próxima cita | `followup` | tarea | encontrar-paciente, horarios-atencion |
| `odontograma` | Registrar hallazgos en el odontograma | `odontogram` | tarea | encontrar-paciente |
| `plan-tratamiento` | Preparar un plan de tratamiento | `treatment` | tarea | encontrar-paciente |

#### Trabajar con recetas y documentos

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `preparar-receta` | Preparar y emitir una receta | `prescription` | tarea | perfil-profesional, autorizaciones-profesionales, formato-receta |
| `consultar-receta` | Consultar e imprimir una receta emitida | `prescription` | tarea | — |
| `cancelar-receta` | Cancelar una receta emitida | `prescription` | tarea | — |
| `documento-paciente` | Crear un documento para un paciente | `documents` | tarea | formatos-documentos |
| `firmar-documento` | Recoger las firmas de un documento | `documents` | tarea | documento-paciente, perfil-profesional, autorizaciones-profesionales |
| `revisar-documentos` | Consultar el estado de los documentos del paciente | `documents` | concepto | — |

#### Preparar el consultorio y el equipo

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `agregar-equipo` | Agregar a una persona a tu equipo | `users` | tarea | — |
| `revisar-accesos` | Revisar los accesos de cada puesto | `permissions` | tarea | — |
| `autorizaciones-profesionales` | Autorizar a un doctor para emitir recetas y firmar | `users` | tarea | perfil-profesional |
| `formatos-documentos` | Preparar formatos de documentos y consentimientos | `templates` | tarea | — |
| `formato-receta` | Configurar el formato de recetas de un doctor | `prescriptionFormat` | tarea | perfil-profesional |
| `formato-historia` | Revisar la plantilla de historia clínica | `historyFormat` | concepto | — |

#### Resolver problemas de acceso

| ID | Título | Flujo | Intención | Dependencias editoriales |
| --- | --- | --- | --- | --- |
| `recuperar-acceso` | Recuperar el acceso si olvidaste tu contraseña | `login` | problema | — |
| `cambiar-contrasena` | Cambiar tu contraseña desde tu cuenta | `password` | tarea | — |


### Preguntas frecuentes

#### Empezar a usar MedSync

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `preparacion-pendiente` | ¿Por qué sigue pendiente la preparación si terminé la guía? | `preparation` | problema | revisar-preparacion |
| `perfil-autorizacion` | ¿Completar mi perfil me permite emitir recetas y firmar? | `profile` | concepto | autorizaciones-profesionales |
| `preparacion-responsable` | ¿Qué hago si un pendiente solo puede resolverlo la administración? | `preparation` | problema | revisar-preparacion |

#### Organizar la agenda

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `sin-horarios` | ¿Por qué no aparecen horarios disponibles para un doctor? | `appointments` | problema | horarios-atencion |
| `agenda-cerrada` | ¿Qué pasa con las citas guardadas si se cierra la agenda? | `appointments` | concepto | consultar-agenda |
| `cita-reprogramada` | ¿Por qué la cita original aparece como Reprogramada? | `appointments` | concepto | cambiar-cita |
| `cita-sin-confirmacion` | ¿Qué hago si no se confirmó que mi cita se guardó? | `appointments` | problema | agendar-cita |

#### Registrar y encontrar pacientes

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `paciente-archivado` | ¿Archivar un paciente elimina su expediente? | `patientRecord` | concepto | archivar-paciente |
| `acceso-historia` | ¿Por qué puedo ver al paciente pero no su historia clínica? | `patientRecord` | problema | revisar-accesos |

#### Registrar la atención

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `intake-historia` | ¿La captura de recepción ya es una historia clínica finalizada? | `intake` | concepto | captura-inicial |
| `historia-bloqueada` | ¿Por qué no puedo finalizar la historia clínica? | `history` | problema | historia-clinica |
| `alergias-estado` | ¿Sin alergias registradas significa lo mismo que sin confirmar? | `allergy` | concepto | alergias-paciente |
| `seguimiento-reserva` | ¿Una fecha sugerida en Seguimiento ya reserva una cita? | `followup` | concepto | seguimiento |
| `odontograma-visible` | ¿Por qué no veo Odontograma o Tratamiento en el expediente? | `patientRecord` | problema | revisar-accesos |

#### Trabajar con recetas y documentos

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `receta-borrador` | ¿Qué diferencia hay entre una receta en borrador y una emitida? | `prescription` | concepto | preparar-receta |
| `receta-no-emite` | ¿Por qué puedo guardar una receta pero no emitirla? | `prescription` | problema | preparar-receta |
| `plantilla-documento` | ¿Una plantilla guardada ya es un documento del paciente? | `documents` | concepto | documento-paciente |
| `documento-pendiente` | ¿Por qué un documento sigue pendiente de firma? | `documents` | problema | firmar-documento |
| `negativa-firma` | ¿Qué pasa si el paciente o su tutor no acepta firmar? | `documents` | concepto | revisar-documentos |

#### Preparar el consultorio y el equipo

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `puesto-autorizacion` | ¿El puesto y las autorizaciones profesionales son lo mismo? | `permissions` | concepto | autorizaciones-profesionales |
| `plantilla-version` | ¿Cambiar la plantilla modifica las historias ya creadas? | `historyFormat` | concepto | formato-historia |

#### Resolver problemas de acceso

| ID | Título | Flujo | Intención | Artículo relacionado |
| --- | --- | --- | --- | --- |
| `codigo-recuperacion` | ¿Qué hago si no recibo el código de recuperación? | `login` | problema | recuperar-acceso |
| `codigo-vencido` | ¿Qué hago si mi código de recuperación venció? | `login` | problema | recuperar-acceso |

### Pantallas y fuentes por flujo

Las rutas de expediente son referencias internas parametrizadas, no enlaces navegables de esta entrega.

| Flujo | Pantalla | Ruta de referencia | Fuente frontend |
| --- | --- | --- | --- |
| `preparation` | Configuración > Resumen / Inicio | `/admin?section=summary` | [PreparationChecklist.vue](../../src/views/configuration/components/PreparationChecklist.vue) |
| `identity` | Configuración > Información del consultorio | `/admin?section=identity` | [index.vue](../../src/views/configuration/index.vue) |
| `profile` | Configuración > Mi perfil profesional | `/admin?section=doctor-identity` | [DAProfessionalProfile.vue](../../src/views/User/components/DAProfessionalProfile.vue) |
| `schedule` | Configuración > Mi agenda / Agendas por doctor | `/admin?section=agenda` | [ProfessionalAgendaConfig.vue](../../src/views/configuration/components/ProfessionalAgendaConfig.vue) |
| `appointments` | Citas | `/px/dates` | [dates.vue](../../src/views/dates/dates.vue) |
| `patientNew` | Nuevo paciente | `/px/new` | [PatientCreate.vue](../../src/views/Patient/PatientCreate.vue) |
| `patients` | Pacientes | `/px/all` | [Patients.vue](../../src/views/Patient/Patients.vue) |
| `patientRecord` | Expediente del paciente | `/px/history/:id` | [PatientShow.vue](../../src/views/Patient/PatientShow.vue) |
| `intake` | Expediente > Captura inicial | `/px/history/:id` | [ClinicalIntake.vue](../../src/views/Patient/Sections/ClinicalIntake.vue) |
| `history` | Expediente > Historia clínica | `/px/history/:id?tab=medical-history` | [MedicalHistory.vue](../../src/views/Patient/Sections/MedicalHistory.vue) |
| `allergy` | Expediente > Alergias | `/px/history/:id` | [AllergyEditor.vue](../../src/views/Patient/components/AllergyEditor.vue) |
| `followup` | Expediente > Seguimiento | `/px/history/:id?tab=monitoring` | [MonitoringPlan.vue](../../src/views/Patient/Sections/MonitoringPlan.vue) |
| `odontogram` | Expediente > Odontograma | `/px/history/:id?tab=odontogram` | [Odontogram.vue](../../src/views/Patient/Sections/Odontogram.vue) |
| `treatment` | Expediente > Tratamiento | `/px/history/:id?tab=treatment` | [TreatmentPlan.vue](../../src/views/Patient/Sections/TreatmentPlan.vue) |
| `prescription` | Expediente > Recetas | `/px/history/:id?tab=prescriptions` | [Prescriptions.vue](../../src/views/Patient/Sections/Prescriptions.vue) |
| `documents` | Expediente > Documentos y firmas | `/px/history/:id?tab=documents` | [DocumentsAndSignatures.vue](../../src/views/Patient/Sections/DocumentsAndSignatures.vue) |
| `users` | Configuración > Personal y usuarios | `/admin?section=users` | [DAUser.vue](../../src/views/User/DAUser.vue) |
| `permissions` | Configuración > Puestos y accesos | `/admin?section=roles-permissions` | [RolesPermissionsConfig.vue](../../src/views/configuration/components/RolesPermissionsConfig.vue) |
| `templates` | Configuración > Documentos y consentimientos | `/admin?section=documents` | [index.vue](../../src/views/configuration/index.vue) |
| `prescriptionFormat` | Configuración > Mis recetas / Recetas por doctor | `/admin?section=prescriptions` | [PrescriptionConfig.vue](../../src/views/configuration/components/PrescriptionConfig.vue) |
| `historyFormat` | Configuración > Plantilla de historia clínica | `/admin?section=clinical-history-template` | [ClinicalHistoryTemplateConfig.vue](../../src/views/configuration/components/ClinicalHistoryTemplateConfig.vue) |
| `login` | Iniciar sesión > Olvidé mi contraseña | `/auth/login` | [Login.vue](../../src/views/Auth/Login.vue) |
| `password` | Configuración > Cambiar contraseña | `/admin?section=change-password` | [ChangePassword.vue](../../src/views/configuration/components/ChangePassword.vue) |
