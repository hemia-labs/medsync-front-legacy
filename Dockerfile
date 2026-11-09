FROM --platform=$BUILDPLATFORM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY babel.config.js postcss.config.js tailwind.config.js vue.config.js ./
COPY scripts/qa/enforce-https-api-url.js scripts/qa/
COPY scripts/ops/verify-frontend.cjs scripts/ops/
COPY public/ public/
COPY src/ src/
ARG VUE_APP_CORE_URL_API
ENV VUE_APP_AUTH_COOKIE_MODE=d2 VUE_APP_BROWSER_AUTH_TRANSPORT=cookie VUE_APP_CSRF_ENABLED=true
RUN npm run build
ARG DEPLOY_RELEASE
RUN node scripts/ops/verify-frontend.cjs seal

FROM nginx:stable-alpine-slim@sha256:f65ed258206d1eb6c4eb6141111715a2cf94ac0a4ec9675fc2da186f7aadb163
COPY ops/frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/deploy-release.json || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
CMD []
