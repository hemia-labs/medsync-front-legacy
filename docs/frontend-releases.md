# Versiones del frontend de MedSync

Agrega un Changeset con `npm run changeset` a cada cambio que deba aparecer en las notas. Elige `patch`, `minor` o `major` según su efecto en la versión.

- En `develop`, el workflow **MedSync frontend releases** comprueba que QA sirva el commit exacto y que el HTML de login coincida con el manifiesto de esa imagen. Si el despliegue aún está pendiente, vuelve a ejecutar el workflow después de activar la imagen. Con Changesets pendientes, crea un tag como `v0.1.1-rc.1` y publica las notas. Un nuevo intento para el mismo commit y versión conserva el tag.
- En `main`, `hemia-ci` abre o actualiza el PR **Release: versionar frontend** en `changeset-release/main`. Al fusionarlo, el workflow publica el tag estable y las notas de `CHANGELOG.md`. Integra después `main` en `develop` para que las próximas prereleases partan de la versión estable.

Configura `RELEASE_APP_CLIENT_ID` como variable de Actions y `RELEASE_APP_PRIVATE_KEY` como secreto de Actions del repositorio. La instalación de `hemia-ci` requiere acceso al frontend y permisos de escritura en Contents y Pull requests.

Los tags de Git y GitHub Releases son independientes de las imágenes Docker. El workflow de versiones publica las notas y no ejecuta un despliegue.
