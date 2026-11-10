# Contabo deployments

The frontend uses these destinations:

| Branch | GitHub environment | Workflow | VPS |
| --- | --- | --- | --- |
| main | prod | build-frontend-image.yml | 195.26.247.210 |
| develop | dev | build-frontend-image.yml | 185.187.235.117 |

The production frontend uses Docker. The legacy QA PM2 workflow remains available by manual dispatch from `develop`.

## Frontend in Docker

The image builds Vue with Node and runs the compiled assets with unprivileged Nginx Alpine Slim. Node, npm, dependencies, environment files and source maps are excluded from the runtime image. The container listens on 8080, and Compose exposes it only on loopback. Use one image per environment because Vue compiles the API URL into the JavaScript.

After this workflow is on the default branch, run **Build MedSync frontend image** from `develop` for QA or from `main` for production. Configure `FRONT_REGISTRY_USERNAME` and `FRONT_REGISTRY_PASSWORD` in the corresponding `dev` or `prod` environment before dispatch. Use the repository and digest printed by the workflow and a read-only registry account on the host.

Install `ops/frontend/compose.yml` on each host. With the existing host reverse proxy, run the candidate on port 14324 first and verify `/deploy-release.json`, `/auth/login` and an actual hashed JS asset. Use a separate Compose project for that candidate. After verification, stop the old frontend listener and start the approved image on 4324:

```sh
MEDSYNC_FRONT_IMAGE='registry.hemia.cloud/medsync/qa-front@sha256:<digest>' \
  docker compose -p medsync-front -f compose.yml up -d --wait
```

Use `medsync/prod-front` for production and verify the public HTTPS route before closing the deployment. Keep the prior image or PM2 bundle for rollback. The frontend cutover does not require backend, DNS or database changes.

## Legacy QA PM2 workflow

The legacy QA workflow uses the `dev` environment and the `DEV_*` connection secrets. It is a manual recovery path. Confirm that port 4324 is free before using it. `DEV_VPS_USER` is `medsync-deploy`, `DEV_VPS_APP_DIR` is `/srv/medsync/frontend` and `DEV_VUE_APP_CORE_URL_API` is `https://api-test.medsync.mx/`. The SSH fingerprint must be the verified SHA-256 host fingerprint. Authentication uses `d2`, `cookie` and `true`.

## Dev deployment success criteria

After building, the workflow writes dist/deploy-release.json containing the application name, commit/run/attempt ID and SHA256 of index.html. These are public build identifiers, not secrets. It transfers the marker with the bundle and the dependency-free verification script.

Activation recreates only medsync-front-legacy with an explicit dist path and port, avoiding stale PM2 serve settings. Success requires three consecutive probes (two seconds apart) with the same PM2 PID, restart count and start time, online status, expected port/path/entry point, the matching release marker over HTTP, and the exact index.html hash. Redirects, errors, an API returning 200, an old release and an unstable PM2 process fail. Only a successful verification runs pm2 save. The checks use the local upstream; public HTTPS and authenticated journeys still need separate validation.

Run the legacy health checks with `node --test scripts/qa/frontend-deploy-health.test.cjs`.

## Production verification and rollback

The PR to `main` builds the production container and verifies the release marker, login page, hashed JS and missing asset responses. Publish the merged commit by dispatching **Build MedSync frontend image** from `main`. After deployment, compare the public release marker at `https://app.medsync.mx/deploy-release.json` with the published commit and verify the login page.

Keep the previous frontend image digest and its Compose configuration. On the first Docker deployment, also keep the PM2 bundle in `/srv/medsync/frontend/dist`. For the initial rollback, stop the frontend Compose project before restarting the `medsync-front-legacy` PM2 process on 4324. After subsequent Docker deployments, reapply Compose with the previous digest and verify the public marker again.

## Development endpoints

Frontend: https://test.medsync.mx/ . Backend base URL: https://api-test.medsync.mx/ (do not append /api in DEV_VUE_APP_CORE_URL_API).

The backend connects to MySQL on 127.0.0.1:3306, database hemia_assitant_legacy, user medsync_test_app. DEV_ENV_FILE contains its password and independent application signing keys. Email, self-registration and application background jobs are initially disabled; email and S3 still require their own test configuration. Never print the environment file in CI logs.
