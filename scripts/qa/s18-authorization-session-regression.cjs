const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const Vuex = require('vuex');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const load = (name, bindings = {}) => {
  const context = { module: { exports: {} }, ...bindings };
  vm.runInNewContext(read(name).replace(/^import .*;?\r?\n/gm, '').replace('export default', 'module.exports ='), context);
  return context.module.exports;
};
const named = (name, names, bindings = {}) => {
  const context = { module: { exports: {} }, ...bindings };
  vm.runInNewContext(read(name).replace(/^import .*;?\r?\n/gm, '').replace(/export /g, '') + '\nmodule.exports = {' + names.join(',') + '};', context);
  return context.module.exports;
};
const rights = named('src/security/authorizationContext.js', ['authorizationFingerprint', 'authorizationContext', 'isCurrentAuthorization', 'authorizationChangedError', 'invalidatePendingRequests', 'isAuthControlRequest']);
const permissions = named('src/security/permissions.js', ['normalizePermissions', 'setSessionPermissions']);
const types = load('src/store/modules/common/mutation-types.js');
const modules = { AUTH: 'CORE/AUTH', CORE: 'CORE' };
const storage = new Map();
Vue.prototype.$session = { get: key => storage.get(key), set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) };
let d2 = true;
const authMutations = load('src/store/modules/auth/mutations.js', { Vue, types, ...permissions, ...rights,
  isD2AuthMode: () => d2, decode: value => JSON.parse(value) });
const blank = () => ({ authenticated: false, user: null, role: null, permissions: [], business: null, accessRevision: 0 });
class PatientModel { constructor() { this.notes = []; } isEmpty() { return this.notes.length === 0; } }
const CORE = { namespaced: true, state: () => ({ currentAction: null }), modules: {
  AUTH: { namespaced: true, state: blank, mutations: authMutations },
  PX: { namespaced: true, state: () => ({ patient: null }) },
  HOME: { namespaced: true, state: () => ({ patients: [] }) },
  OBJECT_STATE: { namespaced: true, state: { private: { records: [] }, model: new PatientModel() }, modules: {
    NESTED: { namespaced: true, state: { history: [] } }
  } }
} };
const store = load('src/store/index.js', { Vue, Vuex, CORE });
const commit = (key, value) => store.commit(modules.AUTH + '/' + key, value);
const state = store.state.CORE.AUTH;
const session = (permission = 'clinical_history.view', role = 'doctor') => ({ authenticated: true,
  user: { id_login: 'doctor-a', id_session: 'session-a', id_business: 'business-a', rol: role },
  business: { id_business: 'business-a' }, role, permissions: [permission], sessionState: 'active', accessExpiresAt: 'later' });
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = [];
const network = () => new Promise(resolve => deferred.push(resolve));
const windows = { location: { href: '', pathname: '/patient' } };
let sessionCalls = 0;
let sessionReply;
let closeCalls = 0;
let closeReply;
const service = { session: () => { sessionCalls += 1; return sessionReply; }, close: () => { closeCalls += 1; return closeReply; } };
let redirects = 0;
const cleanup = () => storage.clear();
const actions = load('src/store/modules/auth/actions.js', {
  Vue, types, modules, window: windows, DAAuthService: service, isD2AuthMode: () => d2,
  clearLegacyAuthStorageForD2: cleanup, clearClinicalContinuityCache: () => {}, clearD2ClientAuthArtifacts: () => {},
  redirectToAuthIfNeeded: () => { redirects += 1; }, DAHasErrorModel: class {}, DAAuthModel: class {},
  DARefreshTokenModel: load('src/models/auth/DARefreshTokenModel.js'),
  decode: value => JSON.parse(value),
  toSHA256: () => '', getTimestamp: () => 0, process: { env: {} }
});
const actionContext = { state, commit, dispatch: async (key, payload) => actions[key] ? actions[key](actionContext, payload) : undefined };

(async () => {
  const originalObjectState = store.state.CORE.OBJECT_STATE;
  originalObjectState.private.records.push({ secret: 'before-first-reset' });
  originalObjectState.model.notes.push('sensitive-note');
  originalObjectState.NESTED.history.push('sensitive-history');
  for(const mode of [true, false]) {
    d2 = mode;
    const mutation = d2 ? types.SET_D2_AUTH_SESSION : types.SET_AUTH_ACCESS_SESSION;
    commit(mutation, session());
    assert.equal(store.state.CORE.OBJECT_STATE.private.records.length, 0, 'Object module snapshot predates Vuex mutations');
    assert.equal(store.state.CORE.OBJECT_STATE.NESTED.history.length, 0, 'Nested object modules are cleared');
    assert.equal(store.state.CORE.OBJECT_STATE.model.isEmpty(), true, 'Deep reset preserves model prototype');
    assert.notEqual(store.state.CORE.OBJECT_STATE, originalObjectState);
    const priorRecords = store.state.CORE.OBJECT_STATE.private.records;
    priorRecords.push({ secret: 'inside-array' });
    store.state.CORE.OBJECT_STATE.NESTED.history.push('inside-nested-module');
    const revision = state.accessRevision;
    store.state.CORE.PX.patient = 'private-fixture';
    commit(mutation, { ...session(), accessExpiresAt: 'another-expiry' });
    assert.equal(state.accessRevision, revision, 'Ordinary renewal does not discard an open form');
    assert.equal(store.state.CORE.PX.patient, 'private-fixture');
    const oldContext = rights.authorizationContext(store);
    commit(mutation, session('px.dates', 'receptionist'));
    assert.equal(rights.isCurrentAuthorization(oldContext, store), false);
    assert.equal(store.state.CORE.PX.patient, null, 'Access changes clear protected Vuex data');
    assert.equal(store.state.CORE.OBJECT_STATE.private.records.length, 0, 'Repeated resets never reuse mutated arrays');
    assert.equal(store.state.CORE.OBJECT_STATE.NESTED.history.length, 0);
    assert.notEqual(store.state.CORE.OBJECT_STATE.private.records, priorRecords);
    assert.equal(state.role, 'receptionist');
    if(!d2) assert.equal(storage.get('permissions')[0], 'px.dates', 'Legacy storage follows current permissions');
  }
  d2 = true; commit(types.SET_D2_AUTH_SESSION, session());
  const core = load('src/services/config/core.instance.js', { store, ...rights,
    axiosHelper: { buildRequestConfig: async () => ({}) }, context: { core: { get: network, post: network } },
    httpstatus: { SUCESS: 200 }, ResultData: class { constructor() { this.success = false; } }
  });
  const late = core.get('/api/px/get/fixture'); await tick();
  commit(types.SET_AUTH_ACCESS_SESSION, null);
  commit(types.SET_D2_AUTH_SESSION, session());
  deferred.shift()({ status: 200, data: { data: { name: 'previous-session-private-data' } } });
  const dropped = await late;
  assert.equal(dropped.success, false); assert.equal(dropped.data.code, 'AUTH_CONTEXT_CHANGED');
  assert.equal(JSON.stringify(dropped).includes('previous-session-private-data'), false, 'Transport never hands stale PHI back to callers');
  const current = core.get('/api/px/get/fixture'); await tick();
  deferred.shift()({ status: 200, data: { data: { name: 'current-fixture' } } });
  assert.equal((await current).data.name, 'current-fixture');
  let revoked401Calls = 0;
  const interceptor = named('src/services/config/axios.interceptor.js', ['handleError', 'handleSuccess'], { store, ...rights,
    options: { 401: () => { revoked401Calls += 1; }, default: error => Promise.reject(error) } });
  const previous = rights.authorizationContext(store);
  commit(types.SET_AUTH_PERMISSIONS, ['px.dates']);
  await assert.rejects(interceptor.handleError({ response: { status: 401 }, config: { authorizationContext: previous } }),
    error => error.response.data.data.code === 'AUTH_CONTEXT_CHANGED');
  assert.equal(revoked401Calls, 0, 'A previous session 401 cannot sign out the new session');

  const status = named('src/services/config/axios.handlestatus.js', ['actions', 'options'], {
    store: { commit: (key, value) => commit(key.split('/').pop(), value), dispatch: (key, payload) => actionContext.dispatch(key.split('/').pop(), payload) },
    types, modules, ...rights, window: windows, isD2AuthMode: () => d2,
    clearLegacyAuthStorageForD2: cleanup, clearD2ClientAuthArtifacts: () => {},
    redirectToAuthIfNeeded: () => { redirects += 1; }, shouldSkipD2UnauthorizedRedirect: () => false
  });
  let finishSession;
  sessionReply = new Promise(resolve => { finishSession = resolve; });
  const beforeCalls = sessionCalls;
  const alreadyFlying = core.get('/api/px/get/fixture'); await tick();
  const forbidden = { config: { url: 'api/clinical-history/fixture/draft', method: 'put' }, response: { status: 403, data: { message: 'Denied', data: { code: 'AUTHZ_FORBIDDEN' } } } };
  const rejected1 = assert.rejects(status.options[403](forbidden));
  const rejected2 = assert.rejects(status.options[403](forbidden));
  assert.equal(sessionCalls - beforeCalls, 1, 'Concurrent 403 checks share a session request');
  deferred.shift()({ status: 200, data: { data: { private: 'pre-revocation' } } });
  assert.equal((await alreadyFlying).success, false, '403 invalidates in-flight reads before rehydration finishes');
  finishSession({ success: true, data: session('px.dates', 'receptionist') });
  await Promise.all([rejected1, rejected2]);
  assert.equal(state.permissions[0], 'px.dates'); assert.equal(state.role, 'receptionist');
  const currentCalls = sessionCalls;
  await assert.rejects(status.options[403]({ ...forbidden, response: { status: 403, data: { data: { code: 'CSRF_TOKEN_INVALID' } } } }));
  await assert.rejects(status.options[403]({ ...forbidden, response: { status: 403, data: { data: { code: 'PLAN_FEATURE_NOT_ALLOWED' } } } }));
  assert.equal(sessionCalls, currentCalls, 'CSRF and plan denials do not refresh authorization');

  const closeRequests = [];
  const csrfService = { getCsrfHeader: async () => ({ 'X-CSRF-Token': 'csrf-fixture' }), clearCsrfToken: () => {} };
  const realHelper = load('src/services/config/axios.helper.js', { Vue, DACsrfService: csrfService,
    getSafeAuthClientConfigSummary: () => ({}), isCsrfEnabled: () => true, isD2AuthMode: () => d2 });
  const closeCore = load('src/services/config/core.instance.js', { store, ...rights, axiosHelper: realHelper,
    context: { core: { put: async (url, payload, config) => { closeRequests.push({ url, payload, config }); return closeReply; } } },
    httpstatus: { SUCESS: 200 }, ResultData: class { constructor() { this.success = false; } } });
  const realAuthService = load('src/services/core/auth/DAAuthService.js', { DACore: closeCore,
    DAC_AUTH_CLOSE: '/api/auth/close', isD2AuthMode: () => d2, DACsrfService: csrfService });
  service.close = () => { closeCalls += 1; return realAuthService.close(); };
  for(const mode of [true, false]) {
    d2 = mode; commit(mode ? types.SET_D2_AUTH_SESSION : types.SET_AUTH_ACCESS_SESSION, session());
    storage.set('token', 'legacy-fixture');
    let resolveSession, resolveClose;
    sessionReply = new Promise(resolve => { resolveSession = resolve; });
    closeReply = new Promise(resolve => { resolveClose = resolve; });
    const pending = actions.refreshAccess(actionContext);
    store.state.CORE.PX.patient = 'private-fixture';
    const closing = actions.logout(actionContext);
    assert.equal(state.authenticated, false, 'Logout clears local authorization before network completion');
    assert.equal(store.state.CORE.PX.patient, null);
    await tick();
    const closeConfig = closeRequests[closeRequests.length - 1].config;
    if(mode) {
      assert.equal(closeConfig.withCredentials, true, 'Logout still sends D2 cookies');
      assert.equal(closeConfig.headers['X-CSRF-Token'], 'csrf-fixture');
    } else {
      assert.equal(state.token, null);
      assert.equal(closeConfig.headers.Authorization, 'legacy-fixture', 'Logout sends storage bearer after runtime token is cleared');
    }
    resolveSession({ success: true, data: session() }); await pending;
    assert.equal(state.authenticated, false, 'A late session check cannot undo logout');
    resolveClose({ success: false }); await closing;
    assert.equal(storage.has('token'), false, 'Both transports clear client storage after a failed close');
    assert.equal(windows.location.href, '/auth/login');
  }
  assert.equal(closeCalls, 2);
  commit(types.SET_AUTH_ACCESS_SESSION, session());
  const redirectsBefore = redirects;
  await assert.rejects(status.actions.unauthorized({ response: { status: 401, data: { data: { code: 'AUTH_SESSION_INVALID' } } } }));
  assert.equal(state.authenticated, false); assert.equal(redirects, redirectsBefore + 1);

  const sessionRequests = [];
  const sessionClient = load('src/services/core/auth/DASessionService.js', {
    Vue, context: { APP_CORE_URL: 'http://qa.invalid' }, DAC_AUTH_SESSION: '/api/auth/session', isD2AuthMode: () => d2,
    axios: { create: () => ({ get: async (url, config) => { sessionRequests.push(config); return { status: 200, data: { data: session() } }; } }) }
  });
  d2 = false; storage.set('token', 'bearer-fixture');
  assert.equal((await sessionClient.getSession()).data.authenticated, true);
  assert.equal(sessionRequests[0].headers.Authorization, 'bearer-fixture');
  d2 = true; await sessionClient.getSession();
  assert.equal(sessionRequests[1].withCredentials, true); assert.equal(sessionRequests[1].headers, undefined);

  let renewalCalls = 0;
  let renewalReply;
  let renewalPayload;
  service.refreshToken = payload => { renewalCalls += 1; renewalPayload = payload; return renewalReply; };
  const expiredSession = { success: false, status: 401, unauthorized: true, data: { authenticated: false, code: 'AUTH_ACCESS_EXPIRED' } };
  for(const mode of [false, true]) {
    d2 = mode;
    commit(types.SET_AUTH_ACCESS_SESSION, null);
    storage.set('token', JSON.stringify({ ...session().user, exp: 1 }));
    storage.set('refreshtoken', 'valid-refresh');
    storage.set('permissions', ['clinical_history.view']);
    sessionReply = expiredSession;
    const liveSession = session('px.dates', 'receptionist');
    renewalReply = mode
      ? { success: true, d2Session: { success: true, data: liveSession } }
      : { success: true, data: { token: JSON.stringify({ ...liveSession.user, exp: 9999999999 }), refresh_token: 'rotated-refresh', permisos: liveSession.permissions, business: liveSession.business } };
    const beforeRenewal = renewalCalls;
    const beforeRedirect = redirects;
    await actions.getToken(actionContext);
    assert.equal(renewalCalls, beforeRenewal + 1, 'Startup renews expired access once in both modes');
    assert.equal(state.authenticated, true);
    assert.equal(state.role, 'receptionist', 'Renewal uses live role, not expired JWT privileges');
    assert.equal(state.permissions[0], 'px.dates');
    assert.equal(redirects, beforeRedirect, 'Valid refresh avoids forced login');
    if(!mode) {
      assert.equal(storage.get('refreshtoken'), 'rotated-refresh');
      assert.equal(renewalPayload.id_refresh_token, 'valid-refresh', 'Legacy renewal keeps the refresh until sending it');
    } else assert.equal(renewalPayload, undefined, 'D2 renewal relies on HttpOnly refresh cookie');
    const revision = state.accessRevision;
    store.state.CORE.PX.patient = 'keep-open-form';
    await actions.refreshAccess(actionContext);
    assert.equal(state.accessRevision, revision, 'Same-access renewal preserves form state');
    assert.equal(store.state.CORE.PX.patient, 'keep-open-form');

    sessionReply = { ...expiredSession, data: { authenticated: false, code: 'AUTH_SESSION_INVALID' } };
    const beforeRevoked = renewalCalls;
    await actions.refreshAccess(actionContext);
    assert.equal(renewalCalls, beforeRevoked, 'Revoked session never renews');
    assert.equal(state.authenticated, false);

    commit(mode ? types.SET_D2_AUTH_SESSION : types.SET_AUTH_ACCESS_SESSION, session());
    state.refreshtoken = 'valid-refresh';
    sessionReply = expiredSession;
    renewalReply = mode ? { success: true, d2Session: expiredSession } : expiredSession;
    const beforeFailure = renewalCalls;
    await actions.refreshAccess(actionContext);
    assert.equal(renewalCalls, beforeFailure + 1, 'Expired/failed renewal cannot loop');
    assert.equal(state.authenticated, false);
  }

  d2 = true;
  commit(types.SET_D2_AUTH_SESSION, session());
  sessionReply = expiredSession;
  let finishRenewal;
  renewalReply = new Promise(resolve => { finishRenewal = resolve; });
  const beforePendingRenewal = renewalCalls;
  const pendingRenewal = actions.refreshAccess(actionContext);
  const sharedRenewal = actions.refreshAccess(actionContext);
  await tick();
  assert.equal(renewalCalls, beforePendingRenewal + 1, 'Concurrent session checks do not rotate refresh twice');
  commit(types.SET_AUTH_ACCESS_SESSION, null);
  finishRenewal({ success: true, d2Session: { success: true, data: session() } });
  await Promise.all([pendingRenewal, sharedRenewal]);
  assert.equal(state.authenticated, false, 'Late renewal cannot undo logout or revocation');

  for(const mode of [false, true]) {
    d2 = mode;
    commit(mode ? types.SET_D2_AUTH_SESSION : types.SET_AUTH_ACCESS_SESSION, session());
    state.refreshtoken = 'refresh-for-logout';
    storage.set('token', 'expired-token-for-close');
    closeReply = Promise.reject({ response: { status: 401, data: expiredSession } });
    const beforeCloseRenewal = renewalCalls;
    const beforeCloseRequests = closeRequests.length;
    service.refreshToken = payload => {
      renewalCalls += 1;
      assert.equal(state.authenticated, false, 'Logout renewal does not reopen protected views');
      if(!mode) assert.equal(payload.id_refresh_token, 'refresh-for-logout', 'Logout preserves refresh only for server closure');
      closeReply = { status: 200, data: { data: { closed: true } } };
      return { success: true, data: { token: 'access-only-to-close', refresh_token: 'not-kept' } };
    };
    await actions.logout(actionContext);
    assert.equal(renewalCalls, beforeCloseRenewal + 1, 'Logout may renew expired access once to close server session');
    assert.equal(closeRequests.length, beforeCloseRequests + 2, 'Logout retries only close after verified renewal');
    assert.equal(state.authenticated, false);
    assert.equal(storage.has('token'), false);
    if(!mode) assert.equal(closeRequests[closeRequests.length - 1].config.headers.Authorization, 'access-only-to-close');
    else assert.equal(closeRequests[closeRequests.length - 1].config.headers['X-CSRF-Token'], 'csrf-fixture');
  }

  d2 = false;
  commit(types.SET_AUTH_ACCESS_SESSION, session());
  commit(types.SET_AUTH_UNAUTHORIZED, false);
  const refreshFailure = { config: { url: '/api/auth/refreshToken' }, response: { status: 401, data: { data: {} } } };
  await assert.rejects(status.actions.unauthorized(refreshFailure));
  assert.equal(state.unauthorized, false, 'A failed refresh cannot trigger another legacy renewal through its watcher');

  // Real session/CSRF/auth services + transport/actions; only the HTTP boundary
  // is simulated. Exercise CSRF context changes when the access cookie expires.
  for(const missingAccess of [false, true]) {
    d2 = true;
    let accessPresent = true;
    let accessExpired = false;
    let serverSessionActive = true;
    let actualRenewals = 0;
    let actualCloses = 0;
    const csrfContexts = [];
    const hasAccess = () => serverSessionActive && accessPresent && !accessExpired;
    const fakeAxios = { create: () => ({ get: async url => {
      if(url.endsWith('/csrf')) {
        const contextType = hasAccess() ? 'session' : 'preauth';
        csrfContexts.push(contextType);
        return { status: 200, data: { data: { csrfToken: contextType + '-csrf', contextType } } };
      }
      if(!serverSessionActive) return { status: 200, data: { data: { authenticated: false } } };
      if(!hasAccess()) throw { response: { status: 401, data: expiredSession } };
      return { status: 200, data: { data: session() } };
    } }) };
    const actualCsrf = load('src/services/core/auth/DACsrfService.js', {
      axios: fakeAxios, context: { APP_CORE_URL: 'http://qa.invalid' }, DAC_AUTH_CSRF: '/api/auth/csrf',
      isD2AuthMode: () => true, isCsrfEnabled: () => true
    });
    const actualSession = load('src/services/core/auth/DASessionService.js', {
      Vue, axios: fakeAxios, context: { APP_CORE_URL: 'http://qa.invalid' }, DAC_AUTH_SESSION: '/api/auth/session', isD2AuthMode: () => true
    });
    const actualHelper = load('src/services/config/axios.helper.js', {
      Vue, DACsrfService: actualCsrf, getSafeAuthClientConfigSummary: () => ({}), isCsrfEnabled: () => true, isD2AuthMode: () => true
    });
    const actualCore = load('src/services/config/core.instance.js', { store, ...rights, axiosHelper: actualHelper,
      context: { core: {
        post: async (url, data, config) => {
          assert.equal(url, 'api/auth/refreshToken');
          assert.equal(config.withCredentials, true);
          assert.equal(config.headers['X-CSRF-Token'], 'preauth-csrf', 'Expired access refresh uses fresh pre-auth CSRF');
          actualRenewals += 1; accessPresent = true; accessExpired = false;
          return { status: 200, data: { data: {} } };
        },
        put: async (url, data, config) => {
          assert.equal(url, 'api/auth/close'); actualCloses += 1;
          if(!hasAccess()) throw { response: { status: 401, data: expiredSession } };
          assert.equal(config.headers['X-CSRF-Token'], 'session-csrf', 'Close after renewal uses a new session CSRF token');
          serverSessionActive = false; accessPresent = false;
          return { status: 200, data: { data: { closed: true } } };
        }
      } }, httpstatus: { SUCESS: 200 }, ResultData: class { constructor() { this.success = false; } }
    });
    const actualAuth = load('src/services/core/auth/DAAuthService.js', {
      DACore: actualCore, DACsrfService: actualCsrf, DASessionService: actualSession, isD2AuthMode: () => true,
      DAC_AUTH_CLOSE: '/api/auth/close', DAC_AUTH_REFRESH_TOKEN: '/api/auth/refreshToken'
    });
    service.session = () => actualAuth.session();
    service.refreshToken = () => actualAuth.refreshToken();
    service.close = () => actualAuth.close();
    commit(types.SET_D2_AUTH_SESSION, session());
    await actualCsrf.ensureCsrfToken();
    accessPresent = !missingAccess; accessExpired = !missingAccess;
    const stableRevision = state.accessRevision;
    store.state.CORE.PX.patient = 'open-form-during-normal-renewal';
    await actions.refreshAccess(actionContext);
    assert.equal(state.accessRevision, stableRevision);
    assert.equal(store.state.CORE.PX.patient, 'open-form-during-normal-renewal');
    assert.equal(actualRenewals, 1);
    assert.equal(csrfContexts[0], 'session'); assert.equal(csrfContexts[1], 'preauth');
    assert.equal(actualCsrf.getCsrfState().hasToken, false, 'Renewal clears pre-auth CSRF cache');
    accessPresent = !missingAccess; accessExpired = !missingAccess;
    await actions.logout(actionContext);
    assert.equal(actualRenewals, 2);
    assert.equal(actualCloses, 2);
    assert.equal(serverSessionActive, false, 'Expired/missing access cookie logout really closes the server session');
    assert.equal(state.authenticated, false);
    await actions.getToken(actionContext);
    assert.equal(state.authenticated, false, 'Login-page bootstrap cannot restore the closed session');
    assert.equal(actualRenewals, 2, 'A closed session never renews again');
  }
  const template = compiler.parseComponent(read('src/App.vue')).template.content;
  assert.deepEqual(compiler.compile(template).errors, []);
  console.log('PASS S18 frontend: real Vuex resets, stable renewal, legacy hydration, deduplicated 403 refresh without mutation replay, late response rejection, logout/inactive cleanup, session races, both transports and App template. No browser/DB.');
})().catch(error => { console.error(error); process.exitCode = 1; });
