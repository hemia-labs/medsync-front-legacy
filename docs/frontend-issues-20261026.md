# Correcciones frontend #13–#25

Correcciones preparadas desde main `df323b5b7a9499981e4a8a357486f065f8f01c36`, conservando el cambio de contraseña integrado. Validación local del 2026-10-26; no acredita despliegue ni aceptación autenticada en el destino.

## Cambios

- #13: limpieza de sesión respeta firma y documentos legales públicos, incluidos alias; conserva redirección para rutas protegidas.
- #14: un 403 refresca permisos sin invalidar lecturas ajenas por anticipado; los cambios reales de identidad/permisos siguen descartando respuestas anteriores.
- #15: producción/staging exigen HTTPS y D2/cookie/CSRF en prebuild, CI y entorno efectivo de webpack.
- #16/#17: pie móvil sin enlaces solapados y drawer con estado ARIA, foco contenido, Escape y retorno al disparador después de cerrar.
- #18/#20: documento es-MX, Vuetify en español (incluidas etiquetas residuales en inglés), fuente de sistema y MDI local; se eliminan Google Fonts y MDI latest remotos.
- #19: consulta de historia/versiones exige permiso sensible, preserva captura administrativa autorizada y distingue 403 sin Reintentar de errores temporales; revocación limpia el contenido.
- #21/#23: errores del alta asociados a inputs mediante ARIA y guarda contra solicitudes concurrentes en la misma instancia.
- #22/#25: cinco rutas heredadas sin paciente llevan al buscador protegido; pestañas sincronizan URL tras confirmar salida, conservan query y respetan enlaces directos durante la carga.
- #24: login deja de enviar secretkey, timestamp y signature heredados.

## Validación reproducible

Node 22 y dependencias instaladas. Desde la raíz de este repositorio:

```text
node scripts/qa/frontend-issues-regression.cjs
node scripts/qa/s18-authorization-session-regression.cjs
node scripts/qa/patient-capture-validation-regression.cjs
node scripts/qa/patient-tab-access-regression.cjs
node scripts/qa/s16-patient-safety-regression.cjs
node scripts/qa/clinical-history-editor-regression.cjs
node scripts/qa/document-focus-navigation-regression.cjs
node scripts/qa/d2-logout-401-cleanup.js full
node scripts/qa/d2-router-session-hydration.js full
```

Las nueve comprobaciones pasan; las dos últimas son estáticas. ESLint sin autofix sobre los quince archivos de producto/configuración modificados pasa. Build pasa con avisos de Sass legacy y tamaño de assets/entrypoints.

Para repetir el navegador, compilar primero con estas variables de proceso de QA (sin modificar archivos .env): `VUE_APP_CORE_URL_API=https://qa.example.invalid/api`, `VUE_APP_AUTH_COOKIE_MODE=d2`, `VUE_APP_BROWSER_AUTH_TRANSPORT=cookie`, `VUE_APP_CSRF_ENABLED=true`.

```text
npm run build -- --dest ../_qa/frontend-issues-20261026/dist
node scripts/qa/frontend-issues-browser.cjs
```

El script requiere Microsoft Edge instalado (canal msedge de Playwright). Sirve el bundle en un puerto efímero y usa componentes Vue/Vuetify reales con servicios sintéticos. Resultado local: 17 casos PASS, tamaños 320/375/414/768/1280, centros clicables, último control visible, teclado/overlay/ruta, locale, errores ARIA, router y páginas públicas compiladas. Crea capturas y results.json en `../docs/dashboard-ux/phases/evidence/FRONT_ISSUES_FIX_20261026`. El servidor se cierra al terminar. No ejecutar el build y el navegador a la vez. El bundle con API ficticia es exclusivo de QA y no debe desplegarse.

## Entrega y límites

- No requiere migración. No modifica backend, grants, datos de pacientes ni secretos.
- Antes de fusionar, comprobar los secrets de build: D2/cookie/true y API HTTPS. El workflow existente despliega al hacer push a main; esta rama/PR no lo dispara. No hay CI automático para PR en el workflow actual y no se afirma una ejecución remota del frontend.
- La validación autenticada, firma válida y configuración efectiva del entorno publicado quedan pendientes. La prueba pública usa contenido legal sintético y una firma no disponible sintética, sin envíos ni escrituras reales.
- La guarda del alta no aporta idempotencia entre pestañas/reintentos de red. La autorización sensible del servidor sigue siendo necesaria.
- El lockfile tenía cambios de otra tarea y queda excluido de esta entrega. La QA local se ejecutó con las dependencias ya instaladas; una instalación limpia en destino se valida por separado.
