# Versiones del frontend de MedSync

Agrega un Changeset con `npm run changeset` a cada cambio que deba aparecer en las notas. Elige `patch`, `minor` o `major` según su efecto en la versión.

- En `develop`, el CI publica y despliega la imagen de QA por digest. Después de verificar el commit servido y el hash del login, crea un RC si hay Changesets pendientes. Un nuevo intento para el mismo commit y versión conserva el tag.
- En `main`, `hemia-ci` abre o actualiza el PR **Release: versionar frontend**. Fusionarlo autoriza al CI a publicar la imagen y el GitHub Release, desplegar el digest y verificar producción. Después de confirmar el despliegue, integra `main` en `develop` manualmente para que las próximas prereleases partan de la versión estable.

Configura `RELEASE_APP_CLIENT_ID` como variable de Actions y `RELEASE_APP_PRIVATE_KEY` como secreto de Actions del repositorio. La instalación de `hemia-ci` requiere acceso al frontend y permisos de escritura en Contents y Pull requests.

El workflow y su configuración de despliegue se describen en [Contabo deployments](contabo-deployment.md).

## Entrega NC1 CLUES a test — 2026-11-18

El operador autorizó desplegar el cambio aprobado de Información del consultorio y CLUES, integrado en [#106](https://github.com/hemia-labs/medsync-front-legacy/pull/106) (`f51f15f6dfda6af45542512b8e15f2850ca427e5`). El backend compatible ya está disponible en test: commit `583e9e1ed3be42c674682e3eacecde8c18d6e8ed`, [despliegue verificado](https://github.com/hemia-labs/medsync-back-legacy/actions/runs/44419996695).

Esta actualización documental permite iniciar el despliegue del frontend mediante el flujo protegido de PR y push a `develop`, sin modificar el código aprobado. La integración previa llevaba `[skip ci]` porque todavía no estaba autorizado el despliegue. Verificar después el marcador servido y el hash del HTML; el despliegue no sustituye la validación autenticada pendiente de NC1. Producción queda fuera de esta entrega.
