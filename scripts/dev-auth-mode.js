'use strict';

const { spawn } = require('child_process');

const mode = String(process.argv[2] || 'd2').trim().toLowerCase();
const serveArgs = process.argv.slice(3);

if (mode !== 'd2' && mode !== 'legacy') {
  console.error('[local-dev] Usage: node scripts/dev-auth-mode.js d2|legacy [vue-cli-service serve args]');
  process.exit(1);
}

function withOpenSslLegacy(value) {
  const current = String(value || '').trim();
  if (current.indexOf('--openssl-legacy-provider') !== -1) {
    return current;
  }
  return current ? `${current} --openssl-legacy-provider` : '--openssl-legacy-provider';
}

const baseEnv = Object.assign({}, process.env, {
  NODE_ENV: 'development',
  NODE_OPTIONS: withOpenSslLegacy(process.env.NODE_OPTIONS),
  VUE_APP_CORE_URL_API: process.env.VUE_APP_CORE_URL_API || 'http://127.0.0.1:3009/'
});

const d2Env = Object.assign({}, baseEnv, {
  VUE_APP_AUTH_COOKIE_MODE: 'd2',
  VUE_APP_BROWSER_AUTH_TRANSPORT: 'cookie',
  VUE_APP_CSRF_ENABLED: 'true'
});

const legacyEnv = Object.assign({}, baseEnv, {
  VUE_APP_AUTH_COOKIE_MODE: 'legacy',
  VUE_APP_BROWSER_AUTH_TRANSPORT: 'authorization',
  VUE_APP_CSRF_ENABLED: 'false'
});

const env = mode === 'legacy' ? legacyEnv : d2Env;
const summary = mode === 'legacy'
  ? 'legacy Authorization transport'
  : 'D2 cookie transport';

console.log(`[local-dev] Starting frontend ${summary} with API ${env.VUE_APP_CORE_URL_API}`);

const child = spawn('vue-cli-service', ['serve'].concat(serveArgs), {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32'
});

child.on('error', (error) => {
  console.error(`[local-dev] Failed to start vue-cli-service: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code === null ? 1 : code);
});
