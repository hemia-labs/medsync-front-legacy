# Contabo deployments

The frontend uses Docker Compose and the same GitHub Actions workflow for PR checks, QA, and production.

| Branch | Environment | Registry repository | Compose project | Directory | Public endpoint |
| --- | --- | --- | --- | --- | --- |
| `develop` | `dev` | `registry.hemia.cloud/medsync/qa-front` | `medsync-front-qa` | `/srv/medsync-front-qa` | `https://test.medsync.mx` |
| `main` | `prod` | `registry.hemia.cloud/medsync/prod-front` | `medsync-front-prod` | `/srv/medsync-front-prod` | `https://app.medsync.mx` |

## Initial configuration

- Each host needs Docker with Compose, `jq`, `curl`, `flock`, read access to its registry repository, and an existing frontend Compose service pinned to a digest. Use `ops/frontend/compose.yml`. The reverse proxy sends frontend requests to loopback port 4324. The deploy command reuses the host’s existing read-only registry login from `/srv/medsync-qa/docker` or `/srv/medsync-prod/docker`. Its `probe` command checks the active image manifest without pulling or restarting it.
- Install `ops/frontend/deploy.sh` as `/usr/local/sbin/medsync-front-deploy`, owned by root and executable. Use a distinct SSH key for each environment. Restrict each key in `authorized_keys` with `restrict,command="/usr/local/sbin/medsync-front-deploy dev medsync-front-qa /srv/medsync-front-qa"` in QA or `restrict,command="/usr/local/sbin/medsync-front-deploy prod medsync-front-prod /srv/medsync-front-prod"` in production.
- In both Actions environments, set variables `FRONT_REGISTRY_USERNAME` and `FRONT_SSH_HOST`, and secrets `FRONT_REGISTRY_PASSWORD`, `FRONT_SSH_KEY` and `FRONT_SSH_KNOWN_HOSTS`. Pin the verified SSH host key. Limit `dev` deployments to `develop` and `prod` deployments to `main`.
- Require PR review and the `verify` job on both target branches. Use the existing `hemia-ci` GitHub App for the Changesets version PR.

## Deployment

A merge to `develop` builds and publishes the QA image. A merge that consumes Changesets and advances the package version on `main` publishes the production image and stable release. Each build uses its environment's API URL.

The workflow passes the exact registry digest to the corresponding host. The host checks the release marker, login HTML hash, and hashed JS asset locally and over public HTTPS. It persists the digest only after verification. On failure it restores the previously active digest and fails the job. The RC job depends on successful QA deployment and verification.
