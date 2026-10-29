# CO26 - Cascaron visual integrado del odontograma

Fecha: 2026-10-29. Entrega de referencia visual para el desarrollador, no funcionalidad clinica terminada.

## Como verlo dentro del sistema

1. Usar Node 22 y las dependencias/configuracion habituales del frontend.
2. Ejecutar `npm run serve:d2` (o el arranque de desarrollo habitual del equipo).
3. Entrar al sistema con acceso al expediente y a la pestana Odontograma.
4. Abrir un paciente -> Odontograma -> **Ver cascaron visual**.
5. **Volver al odontograma actual** cierra la simulacion y descarta sus cambios.

El acceso aparece solo con `NODE_ENV=development`. El build de produccion no incluye el componente lazy de CO26. No cambia rutas, permisos ni la disponibilidad de la captura actual. No hay sitio aparte ni dependencia de la demo de Claude.

La vista muestra **Paciente ficticio**, aunque este abierta dentro de un expediente. No recibe el objeto `px`, IDs del paciente, servicios ni store. La seccion existente conserva su consulta normal; el componente nuevo no hace llamadas clinicas ni usa almacenamiento del navegador. No introducir datos de pacientes en esta referencia.

## Archivos para continuar el desarrollo

| Archivo | Responsabilidad |
| --- | --- |
| [Odontogram.vue](../src/views/Patient/Sections/Odontogram.vue) | Entrada desde el expediente, carga lazy solo en desarrollo y retorno a la captura existente. |
| [OdontogramPreview.vue](../src/views/Patient/Sections/components/OdontogramPreview.vue) | Composicion visual, arcadas, panel, teclado, resumen, modales y estados simulados; estilos con prefijo co26 y tema nocturno. |
| [OdontogramPreviewTooth.vue](../src/views/Patient/Sections/components/preview/OdontogramPreviewTooth.vue) | Dibujo SVG esquematico; pieza y caras con color mas texto en el panel. |
| [OdontogramPreviewPlan.vue](../src/views/Patient/Sections/components/preview/OdontogramPreviewPlan.vue) | Un editor para tratamiento manual e importado; origen, caras y preview de importacion. |
| [odontogramPreviewFixtures.js](../src/views/Patient/Sections/components/preview/odontogramPreviewFixtures.js) | Catalogo y registros sinteticos, denticiones y recorrido de ejemplo. **No es el modelo de dominio definitivo.** |

## Recorrido sugerido

1. Alternar Permanente / Temporal / Mixta: 32 / 20 / 52 posiciones, sin intercambiar temporal por sucesor.
2. Seleccionar Caries, una pieza y caras en el panel; Aplicar. Los botones de cara miden al menos 44 x 44 CSS px. En tableta/movil se puede ir al panel mediante el boton junto a las arcadas.
3. En teclado probar `18 aus`, `res m`, `15 car`, `15 car ?`, `ok` y Enter vacio. El parser es deliberadamente limitado a ejemplos individuales.
4. En pieza 16, Marcar revisado abre confirmacion y conserva caries, resina y nota. Corregir y Registrar evolucion son acciones separadas.
5. Simular acceso sin finalizar o solo lectura. Simular guardado pendiente, error o conflicto. Son estados de presentacion, no pruebas de permisos o concurrencia reales.
6. Finalizar / Reabrir; Nuevo en blanco o Partir del actual; consultar Historial sin activar el documento. La copia reinicia revisiones y pide copiar notas explicitamente.
7. Tratamiento manual permite guardar sin dientes. Seleccionar una pieza manual, escribir nombre/notas y Traer del odontograma: la seleccion se combina sin pisar esos campos.
8. Desde el resumen, seleccionar piezas -> Preparar tratamiento: se abre el mismo editor. Guardar crea solo una tarjeta de ejemplo en memoria.

## Contrato de entrega: que falta desarrollar

El documento funcional **PHASE_CO26_ODONTOGRAM_PROPOSAL_REVIEW_20261028.md**, entregado junto con este codigo por producto, sigue siendo la fuente de decisiones. En el workspace original esta en `docs/clinical-operations/phases/` fuera de este repositorio. El cascaron no sustituye sus fases F0-F7 ni sus AC01-AC24.

- Implementar/adaptar dominio Vue2, servicios, DTO, API, SQL y permisos conforme al MD; no conectar directamente los fixtures a produccion.
- Sustituir catalogo, historial, revision, guardado, deshacer y acceso simulados por contratos reales. El array de snapshots de ejemplo no es una auditoria ni un historial por revision completo.
- Los IDs, relaciones de origen y caras del plan son ilustrativos. Falta la identidad por hallazgo, deduplicacion server-side, procedencia completa, vigencia y documentos firmados.
- El modal de conflicto usa un ejemplo fijo. No compara datos reales ni recupera operaciones. El reintento solo cambia la etiqueta visual.
- Evolucion y copia son ejemplos para explicar el flujo. Falta la transaccion/auditoria, seleccion completa de origen y revision, controles de compatibilidad y confirmaciones del MD.
- Faltan parser de rangos/lotes/alias, impresion/comparacion completa, catalogo administrable, ayuda definitiva, metricas y pruebas integradas/clinicas. Solo voz esta diferida del producto; estos puntos siguen incluidos en F0-F7.
- Validar anatomia/simbologia/colores con dentistas. Los SVG son esquemas visuales, no una aprobacion clinica.
- Emulacion responsive no valida guantes, iPad/Safari o tabletas Android reales. Mantener ese pendiente en F6.

Al convertirlo en funcional, extraer componentes de presentacion reutilizables y reemplazar la simulacion por el dominio real. No retirar el limite de desarrollo hasta completar las fases y la autorizacion de salida del MD.

## Verificacion reproducible

Desde la raiz del frontend:

```sh
node scripts/qa/co26-preview-regression.cjs
node scripts/qa/odontogram-dialog-regression.cjs
node scripts/qa/co26-preview-build.cjs
node scripts/qa/co26-preview-build.cjs --production
```

Los builds de QA usan configuracion sintetica sin leer `.env` y escriben bajo `../_qa/`. No desplegar esas salidas. Para QA visual aislada del componente real (auxiliar, no la entrega): `node scripts/qa/odontogram-ui-preview.cjs 4346 --editors` y abrir `/preview?scenario=existing`; soporta `&theme=clinical-night`.
