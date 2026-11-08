'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const load = (file, bindings = {}, names) => {
  let code = read(file);
  if(file.endsWith('.vue')) {
    const parsed = compiler.parseComponent(code);
    assert.deepEqual(compiler.compile(parsed.template.content).errors, [], file);
    code = parsed.script.content;
  }
  const context = { module: { exports: {} }, ...bindings };
  code = code.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'module.exports =');
  code = code.replace(/export /g, '');
  if(names) code += '\nmodule.exports = {' + names.join(',') + '};';
  vm.runInNewContext(code, context, { filename: file });
  return context.module.exports;
};
const bind = (c, props) => {
  const view = { ...props, ...c.data() };
  Object.entries(c.methods).forEach(([key, fn]) => view[key] = fn.bind(view));
  Object.entries(c.computed).forEach(([key, fn]) => Object.defineProperty(view, key, { get: fn.bind(view) }));
  return view;
};
const inertBindings = { mapGetters: () => ({}), mapActions: () => ({}), moduleTypes: { AUTH: {}, PX: {}, CONFIGURATION: {} }, fnTypes: {},
  VuexMixin: {}, DAHistoryHeader: {}, DAAlergyAlert: {}, AllergyEditor: {}, PatientAdministrativeForm: {}, DASweetConfirm: {}, DocumentsAndSignatures: {}, DELETE: {}, fieldError: {} };

(async () => {
  const publicRoutes = { legalRoutes: load('src/router/routes/legal.js'), signatureRoutes: load('src/router/routes/public-signature.js'), process: { env: {} } };
  const { isPublicAuthPath } = load('src/utils/publicAuthRoute.js', publicRoutes, ['isPublicAuthPath']);
  const window = { location: { pathname: '/', href: '' } };
  let cleared = 0;
  const cleanup = load('src/utils/d2AuthCleanup.js', { isPublicAuthPath, window, isD2AuthMode: () => true,
    DACsrfService: { clearCsrfToken: () => cleared++ }, clearLegacyAuthStorageForD2: () => ({}) });
  const types = load('src/store/modules/common/mutation-types.js');
  const service = { session: async () => ({ success: true, data: { authenticated: false } }) };
  const actions = load('src/store/modules/auth/actions.js', { ...cleanup, types, Vue: { prototype: { $session: {} } },
    DAAuthService: service, isD2AuthMode: () => true, clearLegacyAuthStorageForD2: () => {},
    DAAuthModel: load('src/models/auth/DAAuthModel.js'), DAHasErrorModel: class {} });
  const state = { authenticated: false, accessRevision: 0 };
  const commits = [];
  const ctx = { state, commit: (key, data) => commits.push({ key, data }), dispatch: () => {} };
  for(const route of ['/sign/d/synthetic', '/privacy', '/privacity', '/aviso-de-privacidad', '/terms-and-conditions', '/login']) {
    window.location.pathname = route; window.location.href = route;
    await actions.refreshAccess(ctx, { hydrate: true });
    assert.equal(window.location.href, route, 'Anonymous public hydration: ' + route);
  }
  state.authenticated = true; service.session = async () => ({ unauthorized: true, status: 401 });
  window.location.pathname = '/sign/d/synthetic'; window.location.href = '/sign/d/synthetic';
  await actions.refreshAccess(ctx);
  assert.equal(window.location.href, '/sign/d/synthetic', 'Revoked app session cannot block a public signature token');
  assert.equal(commits.at(-1).data, null);
  for(const route of ['/inicio', '/px/history/test', '/sign/d/', '/privacy/private']) {
    window.location.pathname = route; window.location.href = route;
    await actions.refreshAccess(ctx);
    assert.equal(window.location.href, '/login');
  }
  assert.equal(isPublicAuthPath('/sub/privacy', '/sub/'), true);
  assert.ok(cleared >= 11, 'Private auth artifacts are cleared on public as well as protected routes');
  let loginPayload;
  service.login = async payload => { loginPayload = payload; return { success: false }; };
  await actions.login(ctx, { param: 'qa-user', pwd: 'qa-password', refresh: false });
  assert.deepEqual(Object.keys(loginPayload).sort(), ['param', 'pwd', 'refresh']);
  assert.equal(loginPayload.param, 'qa-user');

  const { validateApiUrl } = require('./enforce-https-api-url');
  const env = { VUE_APP_CORE_URL_API: 'https://qa.invalid', VUE_APP_AUTH_COOKIE_MODE: 'd2', VUE_APP_BROWSER_AUTH_TRANSPORT: 'cookie', VUE_APP_CSRF_ENABLED: 'true' };
  for(const mode of ['production', 'staging']) {
    assert.equal(validateApiUrl(mode, env).ok, true);
    for(const key of Object.keys(env)) for(const value of ['', 'legacy', 'false']) assert.equal(validateApiUrl(mode, { ...env, [key]: value }).ok, false, key);
    assert.equal(validateApiUrl(mode, { ...env, VUE_APP_CORE_URL_API: 'http://qa.invalid' }).ok, false);
  }
  assert.equal(validateApiUrl('development', {}).ok, true);
  const webpackConfig = load('vue.config.js', { process: { env: { NODE_ENV: 'production', ...env, VUE_APP_CSRF_ENABLED: '' } }, require: () => ({ validateApiUrl }) });
  assert.throws(() => webpackConfig.chainWebpack({ plugins: { has: () => false } }), /CSRF/, 'Direct Vue CLI production builds cannot bypass npm prebuild validation');

  const Vue = require('vue'), Router = require('vue-router'); Vue.use(Router);
  const router = new Router({ mode: 'abstract', routes: load('src/router/routes/patient.js') });
  for(const name of ['treatmentplan', 'monitoringplan', 'odontogram', 'photoManager', 'radiographyManager']) {
    const route = router.resolve('/px/' + name).route;
    assert.equal(route.path, '/px/all');
    assert.equal(route.meta.requireAuth, true); assert.equal(route.meta.permission, 'px.all');
  }
  const parent = load('src/views/Patient/PatientShow.vue', inertBindings);
  const navigation = bind(parent, { id: 'qa', px: { person: { id_person: 'qa' }, access: { clinical: true } },
    clinicalModules: { odontogramEnabled: true, treatmentPlanEnabled: true }, hasPermission: () => true,
    $nextTick: async () => {}, $route: { path: '/px/history/qa', query: { tab: 'medical-history', returnKey: 'pulse' }, hash: '#keep-anchor' } });
  let replacements = 0;
  navigation.$router = { replace: async route => { replacements++; navigation.$route = route; } };
  navigation.$route.query.tab = 'monitoring';
  await parent.watch.allowedTabs.call(navigation);
  assert.equal(replacements, 0, 'Permission/module arrival during patient loading cannot overwrite a deep link');
  navigation.$route.query.tab = 'medical-history';
  navigation.tab = 'da-medical-history';
  await navigation.requestTabChange('da-medical-monitoring');
  assert.equal(navigation.$route.query.tab, 'monitoring');
  assert.equal(navigation.$route.query.returnKey, 'pulse'); assert.equal(navigation.$route.hash, '#keep-anchor');
  navigation.sectionLeaveGuard = async () => false;
  assert.equal(await navigation.requestTabChange('da-patient-documents'), false);
  assert.equal(navigation.$route.query.tab, 'monitoring'); assert.equal(replacements, 1);
  navigation.tab = null; navigation.sectionLeaveGuard = null;
  await navigation.applyRequestedTab(); assert.equal(navigation.tab, 'da-medical-monitoring', 'Reload restores selected section');

  const helpers = load('src/domain/patient/administrative.validation.js', {}, ['patientAge', 'patientAdministrativeErrors', 'normalizePatientPhone', 'localDateString']);
  const creator = load('src/views/Patient/PatientCreate.vue', { ...inertBindings, ...helpers });
  let requests = 0, resolveRequest, navigations = 0, alerts = 0;
  const patient = bind(creator, { ActionWrapp: () => { requests++; return new Promise(resolve => { resolveRequest = resolve; }); },
    $router: { push: async () => { navigations++; } }, $swal: { fire: () => { alerts++; } } });
  Object.assign(patient.form, { name: 'Prueba', firstSurname: 'Sintética', birthDate: '2000-01-01', mobilePhone: '5512345678' });
  const first = patient.createPatient(); await patient.createPatient();
  assert.equal(requests, 1); assert.equal(patient.isSaving, true);
  resolveRequest({ success: true, data: { id_person: 'synthetic' } }); await first;
  assert.equal(navigations, 1); assert.equal(patient.isSaving, false);
  patient.ActionWrapp = async () => { throw new Error('offline'); };
  await patient.createPatient(); assert.equal(alerts, 1); assert.equal(patient.isSaving, false);

  const clinical = {};
  const history = load('src/views/Patient/Sections/MedicalHistory.vue', { ...inertBindings, DAClinicalHistoryService: clinical,
    isD2AuthMode: () => true, dialogName: {}, vitalSignMetadata: {} });
  const historyView = (allowed = true) => {
    const view = { canReadHistory: allowed, patientId: 'synthetic', isBusy: false, loadRequest: 1, historyForbidden: false,
      clinicalHistory: { old: true }, clinicalHistoryVersions: [{ old: true }], canViewVersions: allowed };
    for(const [key, fn] of Object.entries(history.methods)) view[key] = fn.bind(view);
    return view;
  };
  clinical.getByPatient = () => { throw Error('No request should be made'); };
  let h = historyView(false); await h.loadInitialData();
  assert.equal(h.historyForbidden, true); assert.equal(h.clinicalHistory, null);
  clinical.getByPatient = async () => ({ success: false, status: 403 });
  h = historyView(); await h.loadClinicalHistory();
  assert.equal(h.historyForbidden, true); assert.equal(h.loadError, false); assert.equal(h.clinicalHistoryVersions.length, 0);
  clinical.getByPatient = async () => ({ success: false, status: 500 });
  h = historyView(); await h.loadClinicalHistory(); assert.equal(h.historyForbidden, false); assert.equal(h.loadError, true);
  let releaseHistory;
  clinical.getByPatient = () => new Promise(resolve => { releaseHistory = resolve; });
  h = historyView(); const pending = h.loadClinicalHistory(); h.denyHistoryAccess();
  releaseHistory({ success: true, data: { history: { private: 'synthetic' } } }); await pending;
  assert.equal(h.clinicalHistory, null, 'Late success cannot repopulate a denied history');
  clinical.getVersionsByPatient = async () => ({ status: 403, success: false });
  h = historyView(); await h.loadClinicalHistoryVersions(); assert.equal(h.historyForbidden, true);
  console.log('PASS frontend issues: public hydration/revocation, protected redirects, login payload, D2 build matrix, 5 legacy routes, tab URL/cancel/reload, single patient create, history 403/500/revocation. Synthetic data only.');
})().catch(error => { console.error(error); process.exitCode = 1; });
