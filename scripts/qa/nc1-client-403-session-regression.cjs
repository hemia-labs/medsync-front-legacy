// NC1 P2 (permission denials 401 -> 403): what the client does with each backend answer.
// Runs the real status handler, interceptor, HTTP client, auth store/actions and the real
// PrescriptionForm.saveDraft / DocumentsAndSignatures.createDocument methods against a simulated network.
//   - 403 permission denial (new backend contract): session kept, capture kept, the server message is
//     shown, one session revalidation, no replay and no authentication loop.
//   - 401 without an AUTH_* code (old backend answer to a denial): the session is dropped and the user is
//     sent to authentication. This is why the backend must not answer 401 to a valid session.
//   - Real authentication 401s (AUTH_SESSION_INVALID / AUTH_ACCESS_EXPIRED) keep their recovery.
// Synthetic data only; no network, no backend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const Vuex = require('vuex');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const importNames = source => {
  const names = [];
  for (const match of source.matchAll(/^import\s+(.+?)\s+from\s+['"][^'"]+['"];?/gm)) {
    const clause = match[1];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) braces[1].split(',').map(part => part.trim()).filter(Boolean).forEach(part => names.push(part.split(/\s+as\s+/).pop()));
    const head = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim();
    if (head) head.split(/\s+/).filter(name => name !== '*' && name !== 'as').forEach(name => names.push(name));
  }
  return names;
};
const evaluate = (source, exportsCode, bindings) => {
  const stub = new Proxy(function stub() { return stub; }, { get: (target, key) => (key === Symbol.toPrimitive ? () => '' : stub) });
  const context = { module: { exports: {} }, console, Promise, setTimeout, setImmediate };
  for (const name of importNames(source)) context[name] = stub;
  Object.assign(context, bindings);
  vm.runInNewContext(source.replace(/^import .*;?\r?\n/gm, '') + exportsCode, context);
  return context.module.exports;
};
const load = (name, bindings = {}) => evaluate(read(name).replace('export default', 'module.exports ='), '', bindings);
const named = (name, names, bindings = {}) => evaluate(read(name).replace(/export (async )?(function|const|let|class) /g, '$1$2 '), '\nmodule.exports = {' + names.join(',') + '};', bindings);
const component = (name, bindings = {}) => {
  const script = read(name).match(/<script>([\s\S]*?)<\/script>/)[1];
  return evaluate(script.replace('export default', 'module.exports ='), '', bindings);
};

// ---- Real auth store (same construction as s18-authorization-session-regression) ----
const rights = named('src/security/authorizationContext.js', ['authorizationFingerprint', 'authorizationContext', 'isCurrentAuthorization', 'authorizationChangedError', 'invalidatePendingRequests', 'isAuthControlRequest']);
const permissions = named('src/security/permissions.js', ['normalizePermissions', 'setSessionPermissions']);
const types = load('src/store/modules/common/mutation-types.js');
const modules = load('src/store/modules/common/module-types.js');
const storage = new Map();
Vue.prototype.$session = { get: key => storage.get(key), set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) };
const authMutations = load('src/store/modules/auth/mutations.js', { Vue, types, ...permissions, ...rights, isD2AuthMode: () => true, decode: value => JSON.parse(value) });
const blank = () => ({ authenticated: false, user: null, role: null, permissions: [], business: null, accessRevision: 0, isLoggingOut: false });
const CORE = { namespaced: true, state: () => ({ currentAction: null }), modules: {
  AUTH: { namespaced: true, state: blank, mutations: authMutations },
  PX: { namespaced: true, state: () => ({ patient: null }) }
} };
const realStore = load('src/store/index.js', { Vue, Vuex, CORE });
const state = realStore.state.CORE.AUTH;
const sessionData = () => ({ authenticated: true, user: { id_login: 'qa-doctor', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'doctor' },
  business: { id_business: 'qa-clinic' }, role: 'doctor', permissions: ['prescriptions.view.own', 'documents.view'], sessionState: 'active', accessExpiresAt: 'later' });
let sessionCalls = 0, refreshCalls = 0, redirects = 0;
const authService = {
  session: async () => { sessionCalls += 1; await new Promise(resolve => setImmediate(resolve)); return { success: true, data: sessionData() }; },
  refreshToken: async () => { refreshCalls += 1; return { success: true, d2Session: { success: true, data: sessionData() } }; },
  close: async () => ({ success: true })
};
const authActions = load('src/store/modules/auth/actions.js', {
  Vue, types, modules, window: { location: { href: '', pathname: '/px/history/qa', replace() {} } }, DAAuthService: authService, isD2AuthMode: () => true,
  clearLegacyAuthStorageForD2: () => storage.clear(), clearClinicalContinuityCache: () => {}, clearD2ClientAuthArtifacts: () => {},
  redirectToAuthIfNeeded: () => { redirects += 1; }, DAHasErrorModel: class {}, DAAuthModel: class {},
  DARefreshTokenModel: load('src/models/auth/DARefreshTokenModel.js'), decode: value => JSON.parse(value), toSHA256: () => '', getTimestamp: () => 0, process: { env: {} }
});
const actionContext = { state, commit: (key, value) => realStore.commit(modules.AUTH + '/' + key, value), dispatch: (key, payload) => authActions[key](actionContext, payload) };
const store = {
  state: realStore.state, getters: realStore.getters,
  commit: (key, value) => realStore.commit(key, value),
  dispatch: (key, payload) => authActions[key.replace(modules.AUTH + '/', '')](actionContext, payload)
};

// ---- Real status handler, interceptor and HTTP client ----
const statusModule = named('src/services/config/axios.handlestatus.js', ['actions', 'options'], {
  store, types, modules, isD2AuthMode: () => true,
  clearD2ClientAuthArtifacts: () => {}, redirectToAuthIfNeeded: () => { redirects += 1; }, shouldSkipD2UnauthorizedRedirect: () => false,
  isAuthControlRequest: rights.isAuthControlRequest, clearLegacyAuthStorageForD2: () => storage.clear(),
  window: { location: { pathname: '/px/history/qa', href: '' } }
});
const { handleError } = named('src/services/config/axios.interceptor.js', ['handleSuccess', 'handleError'], {
  options: statusModule.options, store, isCurrentAuthorization: rights.isCurrentAuthorization, authorizationChangedError: rights.authorizationChangedError,
  canRecoverCsrf: () => false, recoverCsrfRequest: () => { throw new Error('no csrf recovery expected'); }, readableCsrfError: () => {}
});
const sent = [];
let answer = null;
const network = (method, url, payload, config) => { sent.push({ method, url, payload }); return handleError({ config, response: answer }); };
const client = load('src/services/config/core.instance.js', {
  notifyPulseWrite: () => {}, trackApiWrite: () => {}, axiosHelper: { buildRequestConfig: async () => ({}) },
  context: { core: { get: (url, config) => network('get', url, null, config), post: (url, payload, config) => network('post', url, payload, config),
    put: (url, payload, config) => network('put', url, payload, config), patch: (url, payload, config) => network('patch', url, payload, config), delete: (url, config) => network('delete', url, null, config) } },
  httpstatus: { SUCESS: 200 }, ResultData: class ResultData { constructor() { this.success = false; } },
  store, authorizationContext: rights.authorizationContext, isCurrentAuthorization: rights.isCurrentAuthorization,
  authorizationChangedError: rights.authorizationChangedError, isAuthControlRequest: rights.isAuthControlRequest
});

// Backend answers, shaped exactly as responseData builds them.
const denial = (message, code = 'PERMISSION_DENIED') => ({ status: 403, data: { status: 403, data: { code }, message } });
const oldDenial = message => ({ status: 401, data: { status: 401, data: null, message } });
const auth401 = (code, message) => ({ status: 401, data: { status: 401, data: { code }, message } });

const results = [];
const signIn = () => { realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData()); sessionCalls = 0; refreshCalls = 0; redirects = 0; sent.length = 0; };
const test = async (name, fn) => { signIn(); await fn(); results.push(name); console.log('PASS ' + name); };

(async () => {
  await test('403 on save: session kept, one revalidation, no replay, server message returned', async () => {
    realStore.state.CORE.PX.patient = 'captura-sintetica';
    answer = denial('No tienes permiso para guardar recetas.');
    const response = await client.post('/api/prescription/save', { prescription: { id_person: 'qa' } });
    assert.equal(response.success, false);
    assert.equal(response.status, 403);
    assert.equal(response.message, 'No tienes permiso para guardar recetas.');
    assert.equal(state.authenticated, true, 'A permission denial does not end the session');
    assert.equal(redirects, 0, 'No redirect to authentication');
    assert.equal(sessionCalls, 1, 'The session is revalidated once in case permissions changed');
    assert.equal(sent.length, 1, 'The denied request is never replayed');
    assert.equal(realStore.state.CORE.PX.patient, 'captura-sintetica', 'Protected client data survives when permissions did not change');
  });

  await test('concurrent 403s share one revalidation and never loop', async () => {
    answer = denial('No tienes permiso para consultar recetas.');
    const replies = await Promise.all([client.get('/api/prescription/list'), client.get('/api/prescription/patient/qa'), client.post('/api/document/create', {})]);
    assert.ok(replies.every(reply => reply.status === 403 && reply.success === false));
    assert.equal(sessionCalls, 1, 'One revalidation for the whole burst');
    assert.equal(sent.length, 3);
    assert.equal(refreshCalls, 0);
    assert.equal(redirects, 0);
    assert.equal(state.authenticated, true);
  });

  await test('old contract: a 401 without an AUTH_* code ends a valid session (the defect)', async () => {
    answer = oldDenial('No tienes permiso para guardar recetas.');
    const response = await client.post('/api/prescription/save', { prescription: {} });
    assert.equal(response.status, 401);
    assert.equal(redirects, 1, 'The client sends the user to authentication');
    assert.equal(state.authenticated, false, 'and drops the session: this is why denials must be 403');
  });

  await test('real authentication 401s keep their recovery', async () => {
    answer = auth401('AUTH_SESSION_INVALID', 'La sesion ya no esta activa.');
    await client.get('/api/prescription/list');
    assert.equal(redirects, 1);
    assert.equal(state.authenticated, false);
    signIn();
    answer = auth401('AUTH_ACCESS_EXPIRED', 'El acceso ha vencido.');
    await client.get('/api/prescription/list');
    assert.equal(sessionCalls, 1, 'An expired access is renewed through the session check');
    assert.equal(redirects, 0);
    assert.equal(state.authenticated, true);
  });

  await test('PrescriptionForm.saveDraft on 403 keeps the sheet open, the capture and shows the denial', async () => {
    const service = { save: prescription => client.post('/api/prescription/save', { prescription }) };
    const form = component('src/views/prescriptions/components/PrescriptionForm.vue', {
      DAPrescriptionService: service, payload: value => JSON.parse(JSON.stringify(value)), snapshot: value => JSON.stringify(value)
    });
    const capture = { id_person: 'qa', items: [{ generic_name: 'Paracetamol QA', dose: '500 mg' }] };
    const vmThis = { busy: false, loading: false, loadError: '', saving: false, error: '', internalShow: true, form: JSON.parse(JSON.stringify(capture)), baseline: 'before',
      check: () => true, showErrors() { this.shown = true; }, $emit() { throw new Error('saved must not be emitted'); } };
    answer = denial('No tienes permiso para guardar recetas.');
    const saved = await form.methods.saveDraft.call(vmThis, true);
    assert.equal(saved, false);
    assert.equal(vmThis.error, 'No tienes permiso para guardar recetas.');
    assert.equal(vmThis.internalShow, true, 'The sheet stays open');
    assert.deepEqual(vmThis.form, capture, 'Capture preserved');
    assert.equal(vmThis.baseline, 'before', 'Unsaved changes stay unsaved');
    assert.equal(vmThis.saving, false);
    assert.equal(state.authenticated, true);
  });

  await test('DocumentsAndSignatures.createDocument on 403 keeps the dialog, the capture and shows the denial', async () => {
    const service = { createDocument: body => client.post('/api/document/create', body) };
    const view = component('src/views/Patient/Sections/DocumentsAndSignatures.vue', { DADocumentService: service });
    const createForm = { id_document_template: 'qa-template', responsible_doctor_user_id: 'qa-doctor' };
    const notices = [];
    const vmThis = { isLoading: false, documents: [], patientId: 'qa', showCreateDialog: true, createForm: { ...createForm },
      validateCreateForm: () => true, notify: (type, message) => notices.push({ type, message }) };
    answer = denial('No tienes permiso para crear documentos.');
    await view.methods.createDocument.call(vmThis, 'draft');
    assert.deepEqual(notices, [{ type: 'error', message: 'No tienes permiso para crear documentos.' }]);
    assert.equal(vmThis.showCreateDialog, true);
    assert.deepEqual(vmThis.createForm, createForm);
    assert.equal(vmThis.isLoading, false);
    assert.equal(state.authenticated, true);
    assert.equal(redirects, 0);
  });

  console.log(`PASS: ${results.length} NC1 client 403 groups. Synthetic data; no network or backend.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
