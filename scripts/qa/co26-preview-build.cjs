// Full frontend compile with synthetic configuration; never reads checkout .env files.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../..');
process.chdir(repo);
const mode = process.argv.includes('--production') ? 'production' : 'development';
Object.keys(process.env).filter(key => key.startsWith('VUE_APP_')).forEach(key => delete process.env[key]);
Object.assign(process.env, { NODE_ENV: mode, VUE_APP_CORE_URL_API: 'https://127.0.0.1:3009/', VUE_APP_AUTH_COOKIE_MODE: 'd2', VUE_APP_BROWSER_AUTH_TRANSPORT: 'cookie', VUE_APP_CSRF_ENABLED: 'true' });
const Service = require('@vue/cli-service/lib/Service');
const service = new Service(repo);
service.loadEnv = () => {};
const destination = path.resolve(repo, '../_qa/co26-review-' + mode);
service.run('build', { mode, dest: destination, clean: true }).then(() => {
  const chunks = fs.readdirSync(path.join(destination, 'js'));
  assert.equal(chunks.some(name => name.startsWith('odontogram-co26-preview')), mode === 'development');
  console.log('PASS CO26 ' + mode + ': preview chunk gated by development mode. Synthetic config only.');
}).catch(() => { console.error('CO26 build verification failed'); process.exitCode = 1; });
