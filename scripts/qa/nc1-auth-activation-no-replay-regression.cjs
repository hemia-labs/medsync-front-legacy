// NC1-AUTH-ACTIVATION-NO-REPLAY: a 401 of an authenticated account/activation operation recovers the session
// without sending the operation again. Runs the REAL DARegistrationService (its axios interceptor and the real
// CSRF recovery), the real auth store/mutations/getters/actions (refreshAccess), the real renewal path
// (DAAuthService.refreshToken -> core.instance -> interceptor -> status handler of #93/AMB-R1) and the real
// AccountActivation / Register methods. Only the network is scripted. Counters separate HTTP sends from applied
// effects. Synthetic data only: no backend, no account, no email.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const Vuex = require('vuex');
const compiler = require('vue-template-compiler');
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
  const context = { module: { exports: {} }, console, Promise, setTimeout, setImmediate, Date, JSON, Math, Number, Object, Array, String, Error };
  for (const name of importNames(source)) context[name] = stub;
  Object.assign(context, bindings);
  vm.runInNewContext(source.replace(/^import .*;?\r?\n/gm, '') + exportsCode, context);
  return context.module.exports;
};
const load = (name, bindings = {}) => evaluate(read(name).replace('export default', 'module.exports ='), '', bindings);
const named = (name, names, bindings = {}) => evaluate(read(name).replace(/export (async )?(function|const|let|class) /g, '$1$2 '), '\nmodule.exports = {' + names.join(',') + '};', bindings);
const component = (name, bindings) => evaluate(compiler.parseComponent(read(name)).script.content.replace('export default', 'module.exports ='), '', bindings);

// ---------------------------------------------------------------- real auth store
let d2 = true, redirects = 0;
const rights = named('src/security/authorizationContext.js', ['authorizationFingerprint', 'authorizationContext', 'isCurrentAuthorization', 'authorizationChangedError', 'invalidatePendingRequests', 'isAuthControlRequest']);
const permissions = named('src/security/permissions.js', ['normalizePermissions', 'setSessionPermissions']);
const types = load('src/store/modules/common/mutation-types.js');
const modules = load('src/store/modules/common/module-types.js');
const storage = new Map();
Vue.prototype.$session = { get: key => storage.get(key), set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) };
const authMutations = load('src/store/modules/auth/mutations.js', { Vue, types, ...permissions, ...rights, isD2AuthMode: () => d2, decode: value => JSON.parse(value) });
const authGetters = load('src/store/modules/auth/getters.js', { isD2AuthMode: () => d2 });
const blank = () => ({ authenticated: false, user: null, role: null, permissions: [], business: null, accessRevision: 0, isLoggingOut: false, refreshtoken: null, token: null });
const CORE = { namespaced: true, state: () => ({ currentAction: null }), modules: { AUTH: { namespaced: true, state: blank, mutations: authMutations, getters: authGetters } } };
const realStore = load('src/store/index.js', { Vue, Vuex, CORE });
const state = realStore.state.CORE.AUTH;
const sessionData = (overrides = {}) => ({ authenticated: true, user: { id_login: 'qa-owner', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'admin', email: 'qa.owner@example.invalid' },
  business: { id_business: 'qa-clinic', subscriptionStatus: 'pending_activation' }, role: 'admin', permissions: ['admin.config'], sessionState: 'active', ...overrides });
const valid = overrides => ({ success: true, status: 200, authenticated: true, data: sessionData(overrides) });
const sessionFailure = (status, code) => ({ success: false, status, unauthorized: status === 401, authenticated: false, data: { authenticated: false, ...(code ? { code } : {}) }, message: 'x' });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const nextReply = list => { const reply = list.length ? list.shift() : valid(); return reply && reply.promise ? reply.promise : Promise.resolve(reply); };
let sessionCalls = 0, sessionReplies = [];
const authService = { session: async () => { sessionCalls += 1; await new Promise(resolve => setImmediate(resolve)); return nextReply(sessionReplies); }, refreshToken: null, close: async () => ({ success: true }) };
const authActions = load('src/store/modules/auth/actions.js', {
  Vue, types, modules, window: { location: { href: '', pathname: '/activar-cuenta', replace() {} } }, DAAuthService: authService, isD2AuthMode: () => d2,
  clearLegacyAuthStorageForD2: () => storage.clear(), clearClinicalContinuityCache: () => {}, clearD2ClientAuthArtifacts: () => {},
  redirectToAuthIfNeeded: () => { redirects += 1; }, DAHasErrorModel: class {}, DAAuthModel: class {},
  DARefreshTokenModel: load('src/models/auth/DARefreshTokenModel.js'), decode: value => JSON.parse(value), process: { env: {} }
});
const actionContext = { state, commit: (key, value) => realStore.commit(modules.AUTH + '/' + key, value), dispatch: (key, payload) => authActions[key](actionContext, payload) };
const store = { state: realStore.state, getters: realStore.getters, commit: (key, value) => realStore.commit(key, value),
  dispatch: (key, payload) => authActions[key.replace(modules.AUTH + '/', '')](actionContext, payload) };

// ---------------------------------------------------------------- real renewal path (#93 / AMB-R1)
const ambiguous = named('src/security/ambiguousUnauthorized.js', ['isAmbiguousUnauthorized', 'revalidateAmbiguousUnauthorized', 'resetAmbiguousUnauthorized', 'TERMINAL_AUTH_CODES'], rights);
const statusModule = named('src/services/config/axios.handlestatus.js', ['actions', 'options'], {
  store, types, modules, isD2AuthMode: () => d2, clearD2ClientAuthArtifacts: () => {}, redirectToAuthIfNeeded: () => { redirects += 1; },
  shouldSkipD2UnauthorizedRedirect: () => false, isAuthControlRequest: rights.isAuthControlRequest, clearLegacyAuthStorageForD2: () => storage.clear(),
  isAmbiguousUnauthorized: ambiguous.isAmbiguousUnauthorized, revalidateAmbiguousUnauthorized: ambiguous.revalidateAmbiguousUnauthorized, window: { location: { pathname: '/activar-cuenta', href: '' } }
});
const coreInterceptor = named('src/services/config/axios.interceptor.js', ['handleSuccess', 'handleError'], {
  options: statusModule.options, store, isCurrentAuthorization: rights.isCurrentAuthorization, authorizationChangedError: rights.authorizationChangedError,
  canRecoverCsrf: () => false, recoverCsrfRequest: () => { throw new Error('unexpected'); }, readableCsrfError: () => {}
});
const coreSent = [];
let renewalAnswer = null;
const coreNetwork = (method, url, payload, config) => {
  coreSent.push({ method, url });
  const reply = typeof renewalAnswer === 'function' ? renewalAnswer(url) : renewalAnswer;
  return Promise.resolve(reply && reply.promise ? reply.promise : reply).then(response => (response.status < 300
    ? coreInterceptor.handleSuccess({ config, status: response.status, data: response.data }) : coreInterceptor.handleError({ config, response })));
};
const coreClient = load('src/services/config/core.instance.js', {
  notifyPulseWrite: () => {}, trackApiWrite: () => {}, axiosHelper: { buildRequestConfig: async () => ({}) },
  context: { core: { post: (url, payload, config) => coreNetwork('post', url, payload, Object.assign(config, { url })), get: (url, config) => coreNetwork('get', url, null, Object.assign(config, { url })) } },
  httpstatus: { SUCESS: 200 }, ResultData: class ResultData { constructor() { this.success = false; } },
  store, authorizationContext: rights.authorizationContext, isCurrentAuthorization: rights.isCurrentAuthorization,
  authorizationChangedError: rights.authorizationChangedError, isAuthControlRequest: rights.isAuthControlRequest
});
let csrfRenewals = 0, csrfClears = 0;
const csrf = { isCurrentContext: () => true, clearCsrfToken() { csrfClears += 1; },
  ensureCsrfToken: async () => { csrfRenewals += 1; return { contextId: 'qa-csrf', csrfToken: 'renewed', headerName: 'X-CSRF-Token' }; } };
const realAuthService = load('src/services/core/auth/DAAuthService.js', { DACore: coreClient, DAC_AUTH_REFRESH_TOKEN: '/api/auth/refreshToken', isD2AuthMode: () => d2,
  DACsrfService: { ensureCsrfToken: async () => {}, clearCsrfToken() {} }, DASessionService: { bootstrapSession: () => authService.session() } });
authService.refreshToken = (...args) => realAuthService.refreshToken(...args);

// ---------------------------------------------------------------- real registration transport
const csrfRecovery = named('src/services/config/csrfRecovery.js', ['canRecoverCsrf', 'recoverCsrfRequest', 'readableCsrfError'], {
  DACsrfService: csrf, isCsrfEnabled: () => true, isD2AuthMode: () => d2, authorizationChangedError: rights.authorizationChangedError });
const sends = [], effects = [];
let answer = () => ({ status: 200, data: {} });
const fakeAxios = { create: () => {
  let onRejected = null;
  const client = { interceptors: { response: { use(_ok, fail) { onRejected = fail; } } },
    request: async config => {
      sends.push(config.method.toUpperCase() + ' ' + config.url);
      const reply = await Promise.resolve(answer(config.url, config));
      const resolved = reply && reply.promise ? await reply.promise : reply;
      if (resolved.status < 300) { if (config.method !== 'get') effects.push(config.url); return { status: resolved.status, data: resolved.data, config }; }
      const error = { config, response: { status: resolved.status, data: resolved.data, headers: resolved.headers || {} } };
      return onRejected ? onRejected(error) : Promise.reject(error);
    } };
  return client;
} };
const Registration = load('src/services/core/auth/DARegistrationService.js', {
  axios: fakeAxios, context: { APP_CORE_URL: '' }, isCsrfEnabled: () => true, DACsrfService: csrf, store,
  authorizationContext: rights.authorizationContext, isCurrentAuthorization: rights.isCurrentAuthorization, authorizationChangedError: rights.authorizationChangedError,
  axiosHelper: { buildRequestConfig: async method => ({ headers: {}, ...(method === 'get' ? {} : { csrfContext: { contextId: 'qa-csrf', headerName: 'X-CSRF-Token' } }) }) },
  canRecoverCsrf: csrfRecovery.canRecoverCsrf, recoverCsrfRequest: csrfRecovery.recoverCsrfRequest, readableCsrfError: csrfRecovery.readableCsrfError,
  TERMINAL_AUTH_CODES: ambiguous.TERMINAL_AUTH_CODES, types, clearLegacyAuthStorageForD2: () => storage.clear(), clearD2ClientAuthArtifacts: () => {},
  redirectToAuthIfNeeded: () => { redirects += 1; }
});

// ---------------------------------------------------------------- real consumers
const sessionStore = new Map();
const sessionStorage = { getItem: k => (sessionStore.has(k) ? sessionStore.get(k) : null), setItem: (k, v) => sessionStore.set(k, String(v)), removeItem: k => sessionStore.delete(k) };
const rules = named('src/utils/registration.js', ['registrationErrorMessage', 'verificationStorageKey', 'saveVerification', 'loadVerification', 'registrationErrors', 'registrationAttemptId', 'usableRegistrationContext', 'validRegistrationEmail', 'registrationPasswordError', 'isPendingActivation'], { sessionStorage, crypto: globalThis.crypto });
const { activationDestination } = named('src/utils/activationDestination.js', ['activationDestination']);
const componentBindings = { AccountFlowShell: {}, ActivationWelcome: {}, Registration, ...rules, activationDestination, sessionStorage, setInterval: () => 1, clearInterval: () => {} };
const Activation = component('src/views/Auth/AccountActivation.vue', componentBindings);
const RegisterView = component('src/views/Auth/Register.vue', { ...componentBindings, LegalDocumentDialog: {}, PlanCatalog: {} });
const navigations = [];
const instantiate = (definition, extra = {}) => {
  const instance = { ...definition.data(), _isDestroyed: false, $store: store, $route: { params: {} }, $router: { replace: async route => { navigations.push(route); } },
    $refs: { title: { focus() {} }, alert: { focus() {} }, codeInput: { focus() {} } }, $nextTick: async () => {}, $set: (o, k, v) => { o[k] = v; }, $el: { querySelector: () => null }, ...extra };
  for (const [key, method] of Object.entries(definition.methods)) instance[key] = method.bind(instance);
  for (const [key, get] of Object.entries(definition.computed || {})) Object.defineProperty(instance, key, { get: () => get.call(instance), configurable: true });
  return instance;
};

// Backend answers as the registration router serializes them (root code; AUTH_REQUIRED fallback for an uncoded 401).
const r401 = (code = 'AUTH_REQUIRED') => ({ status: 401, data: { code } });
const activationStatus = (emailVerified = false) => ({ status: 200, data: { accountId: 'qa-owner', businessId: 'qa-clinic', commercialState: 'pending', contact: { emailVerified }, welcomePending: false, subscriptionStatus: 'trial' } });
const challengeOk = { status: 201, data: { challengeId: 'qa-challenge', expiresAt: new Date(Date.now() + 600000).toISOString(), resendAfterSeconds: 60 } };
const METHODS = [
  ['activation', () => Registration.activation(), 'GET api/account/activation', activationStatus()],
  ['plans', () => Registration.plans(), 'GET api/account/activation/plans', { status: 200, data: { plans: [] } }],
  ['acknowledgeWelcome', () => Registration.acknowledgeWelcome(), 'POST api/account/setup-welcome/acknowledge', { status: 200, data: { acknowledged: true } }],
  ['sendCode', () => Registration.sendCode(), 'POST api/account/contact-verifications', challengeOk],
  ['confirm', () => Registration.confirm('qa-challenge', '123456'), 'POST api/account/contact-verifications/confirm', activationStatus(true)],
  ['changeEmail', () => Registration.changeEmail('nuevo@example.invalid'), 'PATCH api/account/activation/contact', { status: 200, data: { changed: true } }]
];
const count = url => sends.filter(entry => entry === url).length;
const failureOf = async call => { try { await call(); } catch (error) { return error; } throw new Error('expected the original call to fail'); };
const waitFor = async (predicate, label) => { for (let i = 0; i < 200 && !predicate(); i += 1) await new Promise(resolve => setImmediate(resolve)); assert.ok(predicate(), 'bounded wait: ' + label); };

const results = [], failures = [];
const signIn = (overrides) => {
  ambiguous.resetAmbiguousUnauthorized(); d2 = true; storage.clear(); sessionStore.clear();
  realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
  realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData(overrides));
  sessionCalls = 0; sessionReplies = []; redirects = 0; csrfRenewals = 0; csrfClears = 0; renewalAnswer = null;
  sends.length = 0; effects.length = 0; coreSent.length = 0; navigations.length = 0; answer = () => ({ status: 200, data: {} });
};
const legacySession = overrides => ({ ...sessionData(overrides), accessToken: JSON.stringify({ id_login: 'qa-owner' }), refreshToken: 'synthetic-refresh' });
const startLegacy = () => { d2 = false; storage.set('token', 'fixture'); realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession()); };
const test = async (name, fn) => {
  signIn();
  try { await fn(); results.push(name); console.log('PASS ' + name); }
  catch (error) { failures.push(name); process.exitCode = 1; console.log('FAIL ' + name + '\n     ' + String(error && error.message).split('\n').slice(0, 3).join('\n     ')); }
};
const kept = () => { assert.equal(state.authenticated, true, 'session kept'); assert.equal(redirects, 0, 'no redirect'); };

(async () => {
  // 1. The six authenticated methods.
  await test('1 every authenticated method: 401 + valid session -> one send, original call fails, explicit second call succeeds', async () => {
    for (const [name, call, url, success] of METHODS) {
      signIn();
      answer = () => r401();
      const error = await failureOf(call);
      assert.equal(count(url), 1, name + ': sent once, never resent by recovery');
      assert.equal(error.status, 401, name); assert.equal(error.code, 'AUTH_SESSION_RECOVERED', name); assert.equal(error.sessionRecovery, 'valid', name);
      assert.equal(error.serverCode, 'AUTH_REQUIRED', name + ': server code kept');
      assert.equal(sessionCalls, 1, name + ': one shared recovery'); assert.equal(effects.length, 0, name + ': no effect applied'); kept();
      answer = () => success;
      await call();
      assert.equal(count(url), 2, name + ': the second send is the explicit call');
    }
  });

  // 2. Revocation, renewal, failed renewal, network/5xx.
  await test('2a revocation confirmed by auth/session and terminal code: existing cleanup, no resend', async () => {
    answer = () => r401(); sessionReplies = [sessionFailure(401, 'AUTH_SESSION_INVALID')];
    let error = await failureOf(() => Registration.sendCode());
    assert.equal(error.sessionRecovery, 'invalid'); assert.equal(error.code, 'AUTH_REQUIRED'); assert.equal(state.authenticated, false); assert.equal(redirects, 1);
    assert.equal(count('POST api/account/contact-verifications'), 1);
    signIn(); answer = () => r401('AUTH_SESSION_INVALID');
    error = await failureOf(() => Registration.confirm('qa-challenge', '123456'));
    assert.equal(error.sessionRecovery, 'invalid'); assert.equal(sessionCalls, 0, 'a terminal code needs no session check'); assert.equal(state.authenticated, false); assert.equal(redirects, 1);
    assert.equal(sends.length, 1);
  });
  await test('2b expired access, real renewal: session kept, operation not resent; failed renewal ends the session', async () => {
    answer = () => r401('AUTH_ACCESS_EXPIRED'); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
    renewalAnswer = { status: 200, data: { status: 200, data: {}, message: 'ok' } };
    let error = await failureOf(() => Registration.sendCode());
    assert.equal(error.sessionRecovery, 'valid'); kept(); assert.equal(coreSent.filter(r => r.url.includes('refreshToken')).length, 1, 'one real renewal');
    assert.equal(count('POST api/account/contact-verifications'), 1, 'renewal does not resurrect the write');
    signIn(); answer = () => r401('AUTH_ACCESS_EXPIRED'); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
    renewalAnswer = { status: 401, data: { status: 401, data: { code: 'AUTH_SESSION_INVALID' }, message: 'x' } };
    error = await failureOf(() => Registration.acknowledgeWelcome());
    assert.equal(error.sessionRecovery, 'invalid'); assert.equal(state.authenticated, false); assert.ok(redirects >= 1); assert.equal(sends.length, 1);
  });
  await test('2c network or 5xx during the check: uncertainty, session not revoked nor validated, no resend', async () => {
    for (const failure of [sessionFailure(0), sessionFailure(503)]) {
      signIn(); answer = () => r401(); sessionReplies = [failure];
      const error = await failureOf(() => Registration.confirm('qa-challenge', '123456'));
      assert.equal(error.sessionRecovery, 'uncertain'); assert.equal(error.code, 'AUTH_SESSION_UNCONFIRMED');
      assert.match(rules.registrationErrorMessage(error), /No pudimos confirmar tu sesión/); kept(); assert.equal(sends.length, 1);
    }
  });

  // 3. Concurrency.
  await test('3 concurrent 401s share one recovery, one send per invocation, no loop', async () => {
    answer = () => r401();
    const errors = await Promise.all([failureOf(() => Registration.activation()), failureOf(() => Registration.plans()), failureOf(() => Registration.sendCode())]);
    assert.ok(errors.every(error => error.sessionRecovery === 'valid'));
    assert.equal(sessionCalls, 1, 'one shared session check'); assert.equal(sends.length, 3); kept();
  });

  // 4. Late answers and context changes.
  await test('4a late 401 after logout and new login: discarded before any recovery, cleanup or CSRF effect', async () => {
    const late = deferred(); answer = () => late;
    const pending = failureOf(() => Registration.sendCode());
    await waitFor(() => sends.length === 1, 'request sent');
    realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ user: { id_login: 'qa-owner', id_session: 'qa-session-new', id_business: 'qa-clinic', rol: 'admin' } }));
    late.resolve(r401('AUTH_SESSION_INVALID'));
    const error = await pending;
    assert.equal(error.code, 'AUTH_CONTEXT_CHANGED'); assert.equal(sessionCalls, 0); kept(); assert.equal(state.user.id_session, 'qa-session-new'); assert.equal(sends.length, 1);
  });
  await test('4b late success and late recoverable CSRF 403 after a context change: nothing applied, nothing resent', async () => {
    let late = deferred(); answer = () => late;
    let pending = failureOf(() => Registration.activation());
    await waitFor(() => sends.length === 1, 'request sent');
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ business: { id_business: 'qa-other' } }));
    late.resolve(activationStatus(true));
    assert.equal((await pending).code, 'AUTH_CONTEXT_CHANGED');
    signIn(); late = deferred(); answer = () => late;
    pending = failureOf(() => Registration.sendCode());
    await waitFor(() => sends.length === 1, 'request sent');
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ permissions: [] }));
    late.resolve({ status: 403, data: { code: 'CSRF_FORBIDDEN', reason: 'mismatch' } });
    assert.equal((await pending).code, 'AUTH_CONTEXT_CHANGED');
    assert.equal(csrfRenewals, 0, 'no CSRF renewal for a stale answer'); assert.equal(sends.length, 1, 'no CSRF resend');
  });
  for (const legacy of [false, true]) {
    const mode = legacy ? 'legacy' : 'D2';
    await test(`4c ${mode} real renewal: late terminal and late positive answers after relogin or business/role/permission change do not touch the new context`, async () => {
      const changes = [
        () => { realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null); legacy ? realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession({ user: { id_login: 'qa-owner', id_session: 'qa-session-new', id_business: 'qa-clinic', rol: 'admin' } })) : realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ user: { id_login: 'qa-owner', id_session: 'qa-session-new', id_business: 'qa-clinic', rol: 'admin' } })); },
        () => (legacy ? realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession({ business: { id_business: 'qa-other' } })) : realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ business: { id_business: 'qa-other' } }))),
        () => (legacy ? realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession({ role: 'assistant' })) : realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ role: 'assistant' }))),
        () => (legacy ? realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession({ permissions: [] })) : realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ permissions: [] })))
      ];
      for (const [index, change] of changes.entries()) {
        for (const late of [{ status: 401, data: { status: 401, data: { code: 'AUTH_SESSION_INVALID' }, message: 'x' } }, legacy
          ? { status: 200, data: { status: 200, data: { token: JSON.stringify({ id_login: 'qa-owner', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'admin' }), refresh_token: 'r', permisos: ['admin.config'] }, message: 'ok' } }
          : { status: 200, data: { status: 200, data: {}, message: 'ok' } }]) {
          signIn(); if (legacy) startLegacy();
          const renewal = deferred(); renewalAnswer = renewal;
          answer = () => r401('AUTH_ACCESS_EXPIRED'); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
          const pending = failureOf(() => Registration.sendCode());
          await waitFor(() => coreSent.some(r => r.url.includes('refreshToken')), 'real renewal sent');
          const before = JSON.stringify([state.user, state.business, state.role, state.permissions]);
          change();
          const after = JSON.stringify([state.user, state.business, state.role, state.permissions]);
          renewal.resolve(late);
          const error = await pending;
          assert.equal(error.code, 'AUTH_CONTEXT_CHANGED', `change ${index}`); assert.equal(error.sessionRecovery, 'changed');
          kept(); assert.equal(JSON.stringify([state.user, state.business, state.role, state.permissions]), after, 'new context untouched');
          assert.notEqual(before, after);
          assert.equal(count('POST api/account/contact-verifications'), 1, 'write sent once');
        }
      }
    });
  }

  // 5. Real consumers.
  await test('5a AccountActivation mount: automatic first send gets 401 -> error shown, no resend; explicit send succeeds', async () => {
    answer = url => (url.endsWith('account/activation') ? activationStatus() : r401());
    const view = instantiate(Activation);
    await view.initialize();
    assert.equal(count('GET api/account/activation'), 1, 'first nominal load');
    assert.equal(count('POST api/account/contact-verifications'), 1, 'first nominal send, not repeated');
    assert.match(view.error, /Actualizamos tu sesión/); assert.equal(view.challenge, null); assert.equal(view.remaining, 0, 'a 401 adds no cooldown'); assert.equal(view.busy, false);
    // A remount (authorization revision changed) runs initialize again: the saved resend time blocks an automatic send.
    const remount = instantiate(Activation);
    answer = url => (url.endsWith('account/activation') ? activationStatus() : challengeOk);
    await remount.initialize();
    assert.equal(count('POST api/account/contact-verifications'), 1, 'remount/initialize/load do not resend the code');
    answer = () => challengeOk;
    await view.sendCode();
    assert.equal(count('POST api/account/contact-verifications'), 2); assert.equal(view.challenge, 'qa-challenge'); kept();
  });
  await test('5b AccountActivation confirm: code and challenge kept, not verified; explicit confirm succeeds', async () => {
    const view = instantiate(Activation, { activation: activationStatus().data, loading: false, challenge: 'qa-challenge', code: '123456' });
    answer = () => r401();
    await view.confirm();
    assert.equal(count('POST api/account/contact-verifications/confirm'), 1); assert.equal(view.code, '123456'); assert.equal(view.challenge, 'qa-challenge');
    assert.equal(view.verified, false, 'no false transition to verified'); assert.match(view.error, /Actualizamos tu sesión/); assert.equal(view.busy, false);
    answer = url => (url.endsWith('confirm') ? activationStatus(true) : activationStatus(true));
    await view.confirm();
    assert.equal(count('POST api/account/contact-verifications/confirm'), 2); assert.equal(view.verified, true);
  });
  await test('5c AccountActivation load and welcome: 401 keeps the screen, Actualizar estado/Continuar are explicit', async () => {
    const view = instantiate(Activation);
    answer = () => r401();
    await view.load();
    assert.equal(count('GET api/account/activation'), 1); assert.equal(view.needsRefresh, true); assert.equal(view.activation, null);
    const ready = instantiate(Activation, { loading: false, activation: { ...activationStatus(true).data, commercialState: 'activated', welcomePending: true } });
    await ready.continueFromWelcome(false);
    assert.equal(count('POST api/account/setup-welcome/acknowledge'), 1); assert.equal(navigations.length, 0, 'no navigation'); assert.ok(ready.error);
    answer = () => ({ status: 200, data: { acknowledged: true } });
    await ready.continueFromWelcome(false);
    assert.equal(count('POST api/account/setup-welcome/acknowledge'), 2); assert.equal(navigations.length, 1);
  });
  await test('5d cooldown 429/Retry-After keeps its behaviour', async () => {
    const view = instantiate(Activation, { activation: activationStatus().data, loading: false });
    answer = () => ({ status: 429, data: { code: 'REGISTRATION_RATE_LIMITED' }, headers: { 'retry-after': '42' } });
    await view.sendCode();
    assert.equal(view.remaining, 42); assert.equal(view.rateLimited, true); assert.equal(count('POST api/account/contact-verifications'), 1); assert.equal(sessionCalls, 0);
  });
  await test('5e Register: code send after signup gets 401 -> no navigation, no resend; Reintentar envío is explicit', async () => {
    const view = instantiate(RegisterView, { form: { email: 'qa.owner@example.invalid' }, created: true, sessionEstablished: true,
      registrationActivation: { accountId: 'qa-owner', contact: { emailVerified: false } } });
    answer = () => r401();
    await view.resumeSession();
    assert.equal(count('POST api/account/contact-verifications'), 1); assert.equal(navigations.length, 0); assert.match(view.error, /Actualizamos tu sesión/);
    assert.equal(view.remaining, 0); assert.equal(view.busy, false);
    answer = () => challengeOk;
    await view.resumeSession();
    assert.equal(count('POST api/account/contact-verifications'), 2); assert.equal(navigations.length, 1);
  });

  // 6. CSRF, 403 and public registration keep their contracts.
  await test('6a recoverable CSRF 403 keeps its single pre-effect retry; a 403 denial is not resent', async () => {
    let attempt = 0;
    answer = () => (attempt++ === 0 ? { status: 403, data: { code: 'CSRF_FORBIDDEN', reason: 'mismatch' } } : challengeOk);
    await Registration.sendCode();
    assert.equal(count('POST api/account/contact-verifications'), 2, 'two HTTP sends (CSRF recovery)'); assert.equal(effects.length, 1, 'one applied effect'); assert.equal(csrfRenewals, 1); assert.equal(sessionCalls, 0);
    signIn(); answer = () => ({ status: 403, data: { code: 'PERMISSION_DENIED' } });
    const error = await failureOf(() => Registration.sendCode());
    assert.equal(error.code, 'PERMISSION_DENIED'); assert.equal(sends.length, 1); assert.equal(sessionCalls, 0); kept();
  });
  await test('6b public register and recoverSession: no session recovery, no resend', async () => {
    realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
    answer = () => r401();
    let error = await failureOf(() => Registration.register({}, 'qa-attempt'));
    assert.equal(error.code, 'AUTH_REQUIRED'); assert.equal(sends.length, 1); assert.equal(sessionCalls, 0);
    error = await failureOf(() => Registration.recoverSession());
    assert.equal(sends.length, 2); assert.equal(sessionCalls, 0);
  });

  // 7. ACT-R1/R2 (Codex review of af407e47): recovery from a store that is still anonymous right after signup.
  // The server may hold a session Vuex has not hydrated yet; the classification comes from what the shared check
  // did (applied / ended / discarded), never from the store being anonymous.
  const anonymous = () => { realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null); sessionCalls = 0; redirects = 0; };
  const OTHER = { user: { id_login: 'qa-other', id_session: 'qa-other-session', id_business: 'qa-other-business', rol: 'admin', email: 'otra@example.invalid' }, business: { id_business: 'qa-other-business' } };
  await test('7a anonymous owner, session valid: legitimate hydration -> recovered, one send', async () => {
    anonymous(); answer = () => r401();
    const error = await failureOf(() => Registration.sendCode());
    assert.equal(error.code, 'AUTH_SESSION_RECOVERED'); assert.equal(error.sessionRecovery, 'valid');
    kept(); assert.equal(state.user.id_login, 'qa-owner', 'hydrated with the signup session'); assert.equal(sends.length, 1);
  });
  await test('7b anonymous owner, expired access renewed (real renewal) -> recovered, no resend', async () => {
    anonymous(); answer = () => r401('AUTH_ACCESS_EXPIRED'); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
    renewalAnswer = { status: 200, data: { status: 200, data: {}, message: 'ok' } };
    const error = await failureOf(() => Registration.sendCode());
    assert.equal(error.sessionRecovery, 'valid'); kept(); assert.equal(sends.length, 1);
    assert.equal(coreSent.filter(r => r.url.includes('refreshToken')).length, 1);
  });
  await test('7c anonymous owner, network or 503 during the check -> uncertain, never "session ended"', async () => {
    for (const failure of [sessionFailure(0), sessionFailure(503)]) {
      signIn(); anonymous(); answer = () => r401(); sessionReplies = [failure];
      const error = await failureOf(() => Registration.sendCode());
      assert.equal(error.code, 'AUTH_SESSION_UNCONFIRMED', 'status ' + failure.status); assert.equal(error.sessionRecovery, 'uncertain');
      assert.equal(redirects, 0); assert.equal(sends.length, 1); assert.equal(state.authenticated, false, 'nothing hydrated, nothing revoked');
    }
  });
  await test('7d anonymous owner, invalidity confirmed by auth/session -> session ended', async () => {
    anonymous(); answer = () => r401(); sessionReplies = [sessionFailure(401, 'AUTH_SESSION_INVALID')];
    const error = await failureOf(() => Registration.sendCode());
    assert.equal(error.code, 'AUTH_REQUIRED'); assert.equal(error.sessionRecovery, 'invalid'); assert.equal(sends.length, 1);
  });
  await test('7e anonymous owner: late positive/negative answers after a foreign login, logout or revision change are not recoveries', async () => {
    const changes = [
      ['foreign login', () => realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData(OTHER)), 'qa-other'],
      ['foreign revision (logout of the anonymous context)', () => realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null), null]
    ];
    for (const [label, change, expectedUser] of changes) {
      for (const late of [valid(), sessionFailure(401, 'AUTH_SESSION_INVALID')]) {
        signIn(); anonymous();
        const pending = deferred(); sessionReplies = [pending]; answer = () => r401();
        const call = failureOf(() => Registration.sendCode());
        await waitFor(() => sessionCalls === 1, 'hydration started');
        change();
        pending.resolve(late);
        const error = await call;
        assert.equal(error.code, 'AUTH_CONTEXT_CHANGED', label); assert.equal(error.sessionRecovery, 'changed', label);
        assert.equal(redirects, 0, label + ': nothing cleared');
        assert.equal(state.user ? state.user.id_login : null, expectedUser, label + ': the late answer neither hydrates nor clears');
        assert.equal(sends.length, 1, label);
      }
    }
  });
  await test('7f 401 with a server delay keeps Retry-After (body or header)', async () => {
    answer = () => ({ status: 401, data: { code: 'AUTH_REQUIRED' }, headers: { 'retry-after': '30' } });
    const error = await failureOf(() => Registration.sendCode());
    assert.equal(error.retryAfterSeconds, 30); assert.equal(error.sessionRecovery, 'valid');
    const view = instantiate(Activation, { activation: activationStatus().data, loading: false });
    signIn(); answer = () => ({ status: 401, data: { code: 'AUTH_REQUIRED', retryAfterSeconds: 25 } });
    await view.sendCode();
    assert.equal(view.remaining, 25, 'the announced delay is honoured'); assert.equal(count('POST api/account/contact-verifications'), 1);
  });

  const signupView = () => instantiate(RegisterView, { form: { email: 'qa.owner@example.invalid' }, created: true, sessionEstablished: true,
    registrationActivation: { accountId: 'qa-owner', contact: { emailVerified: false } } });
  await test('8a Register from an anonymous store: valid recovery keeps the created account, no resend; explicit retry continues', async () => {
    anonymous(); answer = () => r401();
    const view = signupView();
    await view.resumeSession();
    assert.equal(count('POST api/account/contact-verifications'), 1); assert.equal(navigations.length, 0);
    assert.match(view.error, /Actualizamos tu sesión/); assert.equal(view.created, true); assert.equal(view.busy, false);
    // A remount/navigation into AccountActivation does not send automatically (resend time saved before sending).
    answer = url => (url.endsWith('account/activation') ? activationStatus() : challengeOk);
    const activation = instantiate(Activation);
    await activation.initialize();
    assert.equal(count('POST api/account/contact-verifications'), 1, 'no send from remount/initialize/load');
    answer = () => challengeOk;
    await view.resumeSession();
    assert.equal(count('POST api/account/contact-verifications'), 2, 'second send only by the explicit retry'); assert.equal(navigations.length, 1);
  });
  await test('8b Register from an anonymous store: 503 -> uncertainty, account created and screen kept', async () => {
    anonymous(); answer = () => r401(); sessionReplies = [sessionFailure(503)];
    const view = signupView();
    await view.resumeSession();
    assert.match(view.error, /No pudimos confirmar tu sesión/); assert.equal(view.created, true); assert.equal(view.sessionEstablished, true);
    assert.equal(count('POST api/account/contact-verifications'), 1); assert.equal(navigations.length, 0); assert.equal(redirects, 0);
  });
  await test('8c Register from an anonymous store: confirmed invalid -> "session ended", nothing resent', async () => {
    anonymous(); answer = () => r401(); sessionReplies = [sessionFailure(401, 'AUTH_SESSION_INVALID')];
    const view = signupView();
    await view.resumeSession();
    assert.match(view.error, /Tu sesión terminó/); assert.equal(count('POST api/account/contact-verifications'), 1); assert.equal(navigations.length, 0);
  });
  await test('8d Register from an anonymous store: another account signs in during recovery -> no action on it', async () => {
    anonymous(); const pending = deferred(); sessionReplies = [pending]; answer = () => r401();
    const view = signupView();
    const resuming = view.resumeSession();
    await waitFor(() => sessionCalls === 1, 'hydration started');
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData(OTHER));
    pending.resolve(valid());
    await resuming;
    assert.match(view.error, /La sesión cambió/); assert.equal(navigations.length, 0, 'no navigation into the other account');
    assert.equal(state.user.id_login, 'qa-other', 'the other session is untouched'); assert.equal(count('POST api/account/contact-verifications'), 1);
  });

  console.log(failures.length ? `FAIL: ${failures.length} of ${failures.length + results.length} NC1-AUTH-ACTIVATION-NO-REPLAY groups.` : `PASS: ${results.length} NC1-AUTH-ACTIVATION-NO-REPLAY groups. Synthetic data; no network, account or email.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
