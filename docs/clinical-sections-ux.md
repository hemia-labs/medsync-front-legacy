# Secciones clínicas — revisión local, 2026-11-18

Rama `codex/clinical-sections-ux`, base develop `29b0cba`. Cambio independiente de NOM-024.

La configuración se divide en Odontograma y Plan de tratamiento, conservando borradores al cambiar de pestaña. Odontograma guía activación, elección de modalidad y personalización opcional. Las tres modalidades incluyen utilidad, límites y un ejemplo ilustrativo. Las palabras de captura separan las incluidas de las propias, con búsqueda y creación; el recorrido se explica y valida por dentición. Dientes, costos y estados se reúnen con el plan y su ejemplo reactivo.

El frontend R3 usa el endpoint de guardado parcial del backend clínico. El endpoint anterior sigue disponible para clientes previos. Visibilidad/opciones del plan, modalidad, palabras y recorrido mantienen guardados separados. Se amplía la protección de salida a los borradores dentales. Una consulta de permisos no pisa el recorrido en edición; un conflicto exige revisar y cargar explícitamente la versión guardada. La respuesta del guardado de palabras actualiza su versión sin una segunda lectura que pueda fallar después de una escritura exitosa.

## Revisión de diseño

R2, indicaciones del operador: descripciones ligeras y títulos destacados; «Elegir los dientes a tratar» y pies de ejemplos simplificados. La consulta de atajos ahora agrupa cada acción con su abreviatura y sus palabras equivalentes. Se cotejaron catálogo, parser y protección del backend: `car` siempre representa Caries; `aus`, Ausente. Las palabras propias agregan sinónimos y no cambian el pincel. La prueba de navegador rechaza `car` → Ausente antes de enviar la escritura y comprueba la búsqueda por abreviatura. La suite backend `co26-aliases.js`, con DB falsa, confirmó la reserva de códigos/palabras y el aislamiento por consultorio.

Propuesta de Codex implementada como trabajo independiente revisable. La segunda perspectiva de Claude queda pendiente: el usuario pidió preservar sus sesiones de NOM-024 y no había CLI independiente disponible. No se declara acuerdo entre agentes ni aceptación visual del usuario.

## Verificación reproducible

Desde esta rama, con las dependencias instaladas:

```powershell
node --openssl-legacy-provider node_modules/@vue/cli-service/bin/vue-cli-service.js lint --no-fix src/views/configuration/index.vue src/views/configuration/components/ClinicalSectionsSettings.vue src/views/configuration/components/OdontogramModeSettings.vue src/domain/help/helpArticles.js
node scripts/qa/co26-mode-feedback.cjs
node scripts/qa/settings-session-stability-regression.cjs
```

Para el recorrido del producto con datos exclusivamente sintéticos, iniciar la API en una terminal y el frontend en otra. No conectar esta API de demostración a un servicio compartido:

```powershell
node scripts/qa/clinical-sections-fixture.cjs
```

```powershell
$env:VUE_APP_CORE_URL_API='http://127.0.0.1:4398/'
$env:VUE_APP_AUTH_COOKIE_MODE='d2'
$env:VUE_APP_BROWSER_AUTH_TRANSPORT='cookie'
node --openssl-legacy-provider node_modules/@vue/cli-service/bin/vue-cli-service.js serve --host 127.0.0.1 --port 4397 --no-open
```

```powershell
node scripts/qa/clinical-sections-visual.cjs
```

La suite abre `/admin?section=clinical-modules` en el shell real. Verifica error/reintento de guardado, conservación entre pestañas, alta/error/búsqueda/retiro de palabras, recorrido inválido/conflicto/recuperación, guardia de navegación, confirmación/cancelación de modo, restricción por rol, teclado y ausencia de desbordamiento horizontal en 1440, 390 y 320 px con temas claro/nocturno. Produce capturas y `results.json` en `.tmp-clinical-ux-evidence` (ignorado). Las escrituras son solo en memoria.

Build local de producción: usar D2/cookie/CSRF y una URL HTTPS sintética, sin despliegue. La ejecución aquí usó `https://api.example.invalid/` y destino `.tmp-clinical-ux-build`.

## Límites

- Sin prueba autenticada contra backend real, sesión nominal en test ni aceptación del usuario.
- Dos suites anteriores no pudieron ejecutar por sus adaptadores de prueba: `ux13-settings-core-regression` intenta interpretar CSS de Vuetify como JavaScript; `ux12-settings-profile-navigation-regression` no declara `IdentityFields`. No se modificaron módulos ajenos para corregir esos adaptadores.
- `odontogram-ui-preview.cjs` recibe el adaptador del plugin de Vuetify necesario para ejecutar la regresión CO26 existente con el frontend actual.
- El estado de implementación y cobertura vigente se describe en R3.


## R3 — correcciones de la revisión independiente

La activación del odontograma tiene su propio guardado. El tipo actual aparece al abrir la pestaña. «Cambiar tipo» abre la comparación. El selector del plan depende de la activación guardada. La confirmación indica el efecto del cambio, conserva el foco dentro del diálogo y permite cancelar con Escape. Las notas compatibles se copian como texto por pieza. Cuando ya hay odontogramas por piezas y caras, las modalidades disponibles para guardar son captura rápida y solo consulta.

El formulario de palabras exige elegir una acción y muestra el resultado antes de agregarla. Se puede descartar un borrador incluso en solo consulta. El recorrido permite saltar a la dentición con errores. El plan explica la diferencia entre permisos de consulta y edición de costos, el alcance de la etiqueta de estado y la conservación de los dientes asociados. Su diseño responde al ancho disponible dentro de Configuración.

El endpoint `POST /api/config/clinical-modules/changes` recibe los campos modificados y los valores esperados de esos campos y sus dependencias. El backend R3 adquiere el bloqueo de la fila en una transacción MySQL y devuelve la configuración completa tras guardar. Ante un conflicto, la pantalla conserva los cambios locales y ofrece actualizar la base para revisarlos. Ambos worktrees deben integrarse para usar este contrato. El cliente anterior sigue usando su endpoint original.

Vista local R3 en `http://127.0.0.1:4399/admin?section=clinical-modules`, con API sintética en 4400. Para reproducir la suite contra esa instancia, definir `CLINICAL_FRONT_PORT=4399` y `CLINICAL_FIXTURE_PORT=4400` antes de ejecutar `node scripts/qa/clinical-sections-visual.cjs`. La suite usa una instancia de fixture privada por ejecución. Para las pruebas del intérprete y de la captura, definir `CO26_BACKEND_ROOT` con la ruta del checkout backend.

La prueba `scripts/qa/clinical-module-changes-mysql.js` del worktree backend usa MySQL 8.4 local desechable, con base `clinical_qa` y puerto explícito en `CLINICAL_QA_MYSQL_PORT`. Se ejercitaron dos escritores sobre la primera fila, cambios simultáneos, conflicto sin escritura parcial, dependencia dental y separación por consultorio. La prueba del navegador usa exclusivamente datos sintéticos en memoria.

## R4 — prueba de usabilidad

El diálogo de cambio explica una nota por diente y qué pasa si dos notas distintas impiden la conversión. El plan se guarda junto a sus opciones. «Ver ejemplo de impresión» presenta datos ficticios con la misma plantilla que la hoja del expediente y refleja los ajustes en edición. El recorrido válido muestra sus dos primeras y dos últimas piezas. La suite del shell comprueba estas cuatro mejoras y el acceso con teclado en claro y oscuro.
