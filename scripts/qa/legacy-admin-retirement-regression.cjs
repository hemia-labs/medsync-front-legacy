'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const load = (p, bindings, sfc = false) => {
  const source = sfc ? compiler.parseComponent(read(p)).script.content : read(p);
  const sandbox = { module: { exports: {} }, ...bindings };
  vm.runInNewContext(source.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'module.exports ='), sandbox);
  return sandbox.module.exports;
};
(async () => {
  for (const file of ['src/router/routes/super-admin.js', 'src/router/routes/business.js', 'src/core/layouts/super-admin.vue', 'src/services/core/superAdmin/DASuperAdminService.js']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file + ' removed');
  }
  function scan(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = dir + '/' + entry.name;
      if (entry.isDirectory()) scan(file);
      else if (/\.(js|vue)$/.test(file)) assert.doesNotMatch(read(file), /api\/super-admin|superAdminDashboard|DASuperAdminService|views\/super-admin|super-admin-layout/, file);
    }
  }
  scan('src');
  let cookie = true, authorized = true, role = 'super_admin', hydrateRole = null;
  const session = { get: key => key === 'token' && authorized ? 'header.' + Buffer.from(JSON.stringify({ rol: role })).toString('base64') + '.signature' : null };
  const store = { state: { CORE: { AUTH: { permissions: [] } } }, getters: new Proxy({}, { get: (_, key) => ({
    'CORE/AUTH/isAuthorized': authorized, 'CORE/AUTH/getRole': role,
    'CORE/AUTH/isSuperAdmin': role === 'super_admin', 'CORE/AUTH/getUser': authorized ? { rol: role } : null,
    'CORE/AUTH/getBusiness': {}, 'CORE/AUTH/getPermissions': []
  })[key] }), dispatch: async () => { if (hydrateRole) { authorized = true; role = hydrateRole; } } };
  class Router { constructor(options) { this.options = options; } beforeEach(fn) { this.guard = fn; } afterEach() {} }
  const router = load('src/router/index.js', {
    Vue: { use() {}, prototype: { $session: session } }, VueRouter: Router, store,
    isD2AuthMode: () => cookie, isPendingActivation: () => false,
    getSessionPermissions: () => [], hasPermission: () => true, hasAnyPermission: () => true,
    canAccessSettings: () => true, canAccessPulse: () => true,
    ...Object.fromEntries(['dashboard', 'admin', 'auth', 'patient', 'error', 'legal', 'prescription', 'publicSignature', 'licensingDemo', 'help'].map(n => [n, []])),
    atob: value => Buffer.from(value, 'base64').toString(), process: { env: {} }
  });
  const navigate = (name, requiredAuth = true) => new Promise(resolve => router.guard({ name, query: {}, matched: [{ meta: { requireAuth: requiredAuth } }] }, {}, resolve));
  for (const mode of [true, false]) {
    cookie = mode; authorized = true; role = 'super_admin';
    for (const name of ['home', 'dashboard', 'admin', 'ShowPx', 'AllPatients', 'accountActivation', 'tenantRestricted']) {
      assert.equal((await navigate(name)).name, 'accessUnavailable', mode + ' blocks ' + name);
    }
    for (const name of ['login', 'register', 'forgotPassword']) assert.equal((await navigate(name, false)).name, 'accessUnavailable');
    assert.equal(await navigate('accessUnavailable', false), undefined, 'Denial page never loops');
    assert.equal(await navigate('publicSignature', false), undefined, 'Public signing remains public');
    role = 'admin';
    assert.equal(await navigate('home'), undefined, 'Tenant entry is unchanged');
    authorized = false;
    assert.equal((await navigate('home')).name, 'auth', 'Anonymous access remains denied');
  }
  cookie = true; authorized = false; role = null; hydrateRole = 'super_admin';
  assert.equal((await navigate('ShowPx')).name, 'accessUnavailable', 'Reload hydration cannot mount tenant views for platform accounts');
  const loginSource = read('src/views/Auth/Login.vue').split('getPostLoginRoute: function() {')[1].split('    sendRecoveryCode:')[0].trim().replace(/,$/, '');
  const postLogin = vm.runInNewContext('(function() {' + loginSource + ')', { isD2AuthMode: () => cookie, isPendingActivation: () => false, atob: value => Buffer.from(value, 'base64').toString() });
  const view = { role: 'super_admin', $session: session };
  for (const mode of [true, false]) { cookie = mode; assert.equal(postLogin.call(view), '/acceso-no-disponible'); }
  const page = load('src/views/error/AccessUnavailable.vue', {}, true);
  let logoutCalls = 0;
  await page.methods.closeSession.call({ ...page.data(), $store: { dispatch: async name => { assert.equal(name, 'CORE/AUTH/logout'); logoutCalls++; } } });
  assert.equal(logoutCalls, 1);
  console.log('PASS legacy admin retirement: source removal, D2/legacy protected routes, login, hydration, no redirect loop, tenant/public continuity and logout. Synthetic sessions; no backend changes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
