# Versiones del frontend de MedSync

Agrega un Changeset con `npm run changeset` a cada cambio que deba aparecer en las notas. Elige `patch`, `minor` o `major` según su efecto en la versión.

- En `develop`, el CI publica y despliega la imagen de QA por digest. Después de verificar el commit servido y el hash del login, crea un RC si hay Changesets pendientes. Un nuevo intento para el mismo commit y versión conserva el tag.
- En `main`, `hemia-ci` abre o actualiza el PR **Release: versionar frontend**. Fusionarlo autoriza al CI a publicar la imagen y el GitHub Release, desplegar el digest y verificar producción. Después de confirmar el despliegue, integra `main` en `develop` manualmente para que las próximas prereleases partan de la versión estable.

Configura `RELEASE_APP_CLIENT_ID` como variable de Actions y `RELEASE_APP_PRIVATE_KEY` como secreto de Actions del repositorio. La instalación de `hemia-ci` requiere acceso al frontend y permisos de escritura en Contents y Pull requests.

El workflow y su configuración de despliegue se describen en [Contabo deployments](contabo-deployment.md).
