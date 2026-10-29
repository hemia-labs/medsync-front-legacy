'use strict';
// Reproducible production compile; synthetic configuration, no checkout .env files.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
process.chdir(root);
Object.keys(process.env).filter(key => key.startsWith('VUE_APP_')).forEach(key => delete process.env[key]);
Object.assign(process.env, {
  NODE_ENV: 'production', VUE_APP_CORE_URL_API: 'https://127.0.0.1:39999/',
  VUE_APP_AUTH_COOKIE_MODE: 'd2', VUE_APP_BROWSER_AUTH_TRANSPORT: 'cookie', VUE_APP_CSRF_ENABLED: 'true'
});
const Service = require('@vue/cli-service/lib/Service');
const service = new Service(root);
service.loadEnv = () => {};
const destination = path.resolve(root, '../_qa/help-center-production');
service.run('build', { dest: destination, clean: false }).then(() => {
  const chunks = fs.readdirSync(path.join(destination, 'js'));
  assert.ok(chunks.some(name => /^help-center\..*\.js$/.test(name)), 'Production includes help');
  assert.ok(!chunks.some(name => name.startsWith('odontogram-co26-preview')), 'CO26 remains development-only');
  console.log('PASS help production build; authenticated help included, CO26 preview excluded. Output: ' + destination);
}).catch(() => { console.error('Help production build failed'); process.exitCode = 1; });
