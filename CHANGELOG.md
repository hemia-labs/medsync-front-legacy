# hmdentalassistant_front

## 0.5.0

### Minor Changes

- e8dabcc: Organize clinic information into independently saved sections and add explicit CLUES catalog search, manual capture and revalidation with draft recovery. Preserve catalog verification when switching input modes without editing, and use the exact current-version lookup. Requires the backend CLUES-F1/CAT-O1 contract; no automatic writes or revalidation.
- 5aea665: Añade la revisión y autorización explícita de sustitución de negativas en Documentos y firmas, conserva el motivo ante conflictos y envía la revisión del consentimiento al cerrar historias.
- 3056e7e: Permite buscar y seleccionar claves de nacimiento, residencia, afiliación, personal y CLUES conservando su versión de catálogo. Mantiene la captura manual no verificada, los borradores y el guardado único del perfil profesional.
- ef97c89: Share the document logo from Appearance with prescriptions, clinical histories and printable treatment plans. Authorized administrators can save the shared logo from prescription settings; issued documents retain their recorded image and prescription backgrounds remain independent.

### Patch Changes

- 778ffb9: NC1-AUTH-401-AMB: a business 401 without a terminal or recoverable code no longer closes a valid session. The client starts at most one shared `auth/session` revalidation per authorization context (user, session, business, role, permissions and revision), keeps the capture, rejects the original request and never resends it. Known codes keep their paths; network/5xx answers report uncertainty without revoking; late answers from a previous context are ignored; a confirmed session is not re-checked for 10 s within the same context.

  Auth-control requests (`api/auth/*`) now record the authorization context that sent them; an answer that arrives after that context changed (logout/login, business, role or permissions) is rejected as `AUTH_CONTEXT_CHANGED` before any cleanup, renewal, CSRF retry or redirect, so a late renewal of a previous session cannot close the current one.

- 0ea931e: NC1-AUTH-ACTIVATION-NO-REPLAY: account activation calls (status, plans, welcome acknowledgement, email code send/confirm, email change) no longer resend themselves after a 401. The session is recovered once with the shared action and the original call still fails with a clear message; repeating it takes another explicit action. Answers of an earlier authorization context are discarded before CSRF recovery. A 401 on the email-code send no longer starts the resend cooldown, since nothing was sent.

  Recovery is classified from what the shared session check actually did (applied, ended, or discarded because the authorization changed meanwhile), so a store that is still anonymous right after signup reports uncertainty on network/5xx instead of "session ended", and a late answer during hydration never counts as a recovered session. A delay announced with a 401 (Retry-After) is kept.

- 8b3c01f: Corrige el contraste del panel y diálogo de sustitución de negativa en Noche clínica, incluidos ayuda, errores y botones.
- 6233c1b: La CLUES capturada a mano se envía en mayúsculas. Si el servidor rechaza una clave de catálogo en el alta o en el establecimiento, el aviso nombra el campo, el error aparece junto al selector, la vista se desplaza hasta él y se conserva la captura. «Añadir afiliación» y «Añadir tipo de personal» tienen contraste suficiente en Noche clínica.
- 5bf9ce5: Reúne la configuración de logos en Apariencia y retira la carga de imagen de Información del consultorio. Conserva la selección pendiente si se intenta salir sin guardarla.
- dea2e5b: Añade separación entre las tarjetas de logo de acceso y logo para documentos en Apariencia.

## 0.4.2

### Patch Changes

- 6d3b8ea: Clarify treatment capture and dental selection, keep actions visible on small screens, fix menus hidden by the footer, and add a printable patient copy for active and closed plans without internal notes.

## 0.4.1

### Patch Changes

- cb13c4c: Let users recover an expired registration session without losing captured fields or automatically resubmitting account creation.

## 0.4.0

### Minor Changes

- 65156be: Display dynamically configured legal documents and review organization and individual document sets from Account and legal.
- d4bd5ce: Mostrar las versiones vigentes de términos y privacidad de Hemia Legal y consultar el resumen de pendientes desde el banner. Mantener el contrato por consultorio como único documento editable en Super Admin.
- fa9da6b: Inicio: el encabezado integra una escena médica animada a todo lo ancho de la tarjeta, con variantes de mañana, tarde y noche, y temas para Amor y amistad, Fiestas patrias, Día del Médico, Día de Muertos y Navidad. También se muestra en móvil.
- 9fa2ac5: Capture names as three plain fields (Nombre(s), Primer apellido, Segundo apellido) without surname status selectors. Integrate identity into the professional profile («Identidad profesional») with a single «Guardar perfil»: names, birth date, CURP and optional codes are saved together with the professional data in one request; the separate identity card and the «Nombre profesional» field are removed. Patient identity uses system controls and field errors.
- 2bb932a: Add Vue 2 identity capture for patients, professionals and establishments. Preserve administrative drafts and structured names, and require explicit reconciliation of conflicting unsaved names. Requires the NC1 backend and its preinstalled tables.
- 886956c: Users and registration capture Nombre(s), Primer apellido and Segundo apellido instead of a single «Apellidos». Existing accounts keep their stored surnames as historical text until someone types them; nothing is split by spaces. The joined `last_name` is still sent so an older server keeps working.
- 67129fe: Present closed clinical histories as a readable summary and complete sections with desktop/mobile navigation. Separate consent used at closure from today's effective consent, retain historical snapshots and document references, and preserve draft editing and existing actions.
- a9d5dfb: Rediseña Pulso del consultorio y Análisis del consultorio para que los mismos datos se lean más rápido: cifras clave al inicio, medidores y barras por estado, tendencia por indicador, comparativo contra el periodo anterior y navegación por secciones, con soporte de tema nocturno y móvil.

### Patch Changes

- 37e199b: Open actionable central documents directly in the acceptance flow and show a skeleton while document content loads.
- 9013629: Conserva la identificación clínica revisada al guardar y finalizar, permite actualizar campos del borrador explícitamente y evita completar impresiones históricas con datos administrativos actuales.
- ff3475c: Homologa la interfaz con el design system de MedSync: botones en forma de píldora con texto seminegrita (incluidos los de Vuetify), colores del sistema en botones gris, cancelar, recortador y confirmación, y tema de Vuetify con la paleta de MedSync que sigue al tema de cada clínica. Unifica la fuente en la del sistema operativo con seminegrita real, aligera las negritas, da tonos distintos a los estados hover, define variables de color que faltaban y corrige la prop `rsm`, las animaciones `fadeInScroll` y `shake` y los acentos de los textos.
- 27484ee: Amplía el centro de ayuda con siete guías y once respuestas nuevas: Inicio, documentos de la cuenta, listado de recetas del consultorio, secciones del expediente, apariencia, Pulso del consultorio y Análisis del consultorio. Agrega el tema «Dar seguimiento al consultorio» y actualiza el arnés de QA de ayuda.
- b35a968: La historia clínica muestra y aplica el consentimiento vigente que indica el servidor. Con una negativa vigente anuncia que la historia se guardará como incompleta, y antes de cerrar vuelve a verificarlo. Una respuesta antigua ya no reemplaza el consentimiento verificado más reciente, y Cancelar detiene de verdad un cierre que aún se estaba verificando.
- 23c45a4: Aclara la preparación del perfil profesional y alinea las acciones de guardado de la historia clínica con la paleta de MedSync.
- e75d2fd: Agrega el contacto de emergencia opcional a la ficha del paciente y lo muestra en la identificación de la historia clínica.
- ac631a7: Recover authentication without replaying a previously captured action or retaining its payload.
- 0cd3d33: Unifica la ficha del paciente en un guardado administrativo, conserva apellidos pendientes y concilia edad, código postal y cambios de identidad.
- b1db6a1: Simplifica la ficha del paciente (apellidos sin estados técnicos, información adicional explicada, sin claves de catálogo), usa el diálogo de confirmación del sistema y ordena el resumen de la historia clínica.
- 44c6f7d: La cabecera del expediente reúne el teléfono del paciente, el domicilio y el contacto de emergencia, con etiquetas explícitas. Archivar es una acción de texto discreta, la foto se gestiona solo desde el avatar y, en un paciente archivado, «Restaurar paciente» aparece en la propia cabecera. Ya no se muestra la tarjeta «Ficha administrativa» separada.
- 81d052c: Show the patient identity fields in «Nuevo paciente» as a regular section of the form, with the same fields, errors and layout as the rest of the page.
- 4399a13: Remove retired static legal pages and their placeholder content. Keep the public legal links on the published document reader.
- 4148e54: Rediseña la pestaña Tratamientos del expediente: barra de avance por estado en lugar de seis contadores, filtros con conteo, una acción principal por tratamiento con menú para el resto, consentimiento compacto, fechas legibles y estados vacíos sin botones duplicados. Corrige la etiqueta de dientes sin caras ("Diente 36 ·").

## 0.3.1

### Patch Changes

- 052c5c0: Automatiza la publicación y el despliegue del frontend por digest en QA y producción. Unifica las validaciones y releases en un workflow, verifica el frontend servido antes de crear el RC y reutiliza el acceso restringido de cada VPS al registry.

## 0.3.0

### Minor Changes

- 8fb482e: Agrega analítica de uso con Umami self-hosted en `analytics.hemia.cloud`. En producción registra las pantallas visitadas por patrón de ruta y las acciones guardadas con éxito, sin IDs, datos clínicos ni datos personales. El panel de super admin no se mide.

## 0.2.0

### Minor Changes

- Actualiza el registro, la activación de cuenta, el acceso a documentos legales y la navegación de la clínica. Despliega el frontend de producción como imagen estática de Docker.

## 0.1.1

### Patch Changes

- 1f48075: Agrega el versionado del frontend con Changesets, prereleases verificadas en QA y notas de versiones estables en GitHub.
