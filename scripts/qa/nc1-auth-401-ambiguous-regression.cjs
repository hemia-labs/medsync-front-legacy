// NC1-AUTH-401-AMB: client defense for an ambiguous 401 (contract §7.3 of the 401 handler analysis).
// Runs the real status handler, the real ambiguous-401 module, interceptor, HTTP client (core.instance),
// auth store, mutations and actions (refreshAccess) against a scripted network. Effect counters prove
// that nothing is replayed: `sent` counts business requests, `sessionCalls`/`refreshCalls` count auth checks.
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
const component = (name, bindings = {}) => evaluate(read(name).match(/<script>([\s\S]*?)<\/script>/)[1].replace('export default', 'module.exports ='), '', bindings);
const optionalNamed = (name, names, bindings) => (fs.existsSync(path.join(root, name)) ? named(name, names, bindings) : {});

// ---- Real auth store ----
let d2 = true;
const rights = named('src/security/authorizationContext.js', ['authorizationFingerprint', 'authorizationContext', 'isCurrentAuthorization', 'authorizationChangedError', 'invalidatePendingRequests', 'isAuthControlRequest']);
const permissions = named('src/security/permissions.js', ['normalizePermissions', 'setSessionPermissions']);
const types = load('src/store/modules/common/mutation-types.js');
const modules = load('src/store/modules/common/module-types.js');
const storage = new Map();
Vue.prototype.$session = { get: key => storage.get(key), set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) };
const authMutations = load('src/store/modules/auth/mutations.js', { Vue, types, ...permissions, ...rights, isD2AuthMode: () => d2, decode: value => JSON.parse(value) });
const blank = () => ({ authenticated: false, user: null, role: null, permissions: [], business: null, accessRevision: 0, isLoggingOut: false, refreshtoken: null, token: null });
const CORE = { namespaced: true, state: () => ({ currentAction: null }), modules: {
  AUTH: { namespaced: true, state: blank, mutations: authMutations },
  PX: { namespaced: true, state: () => ({ patient: null }) }
} };
const realStore = load('src/store/index.js', { Vue, Vuex, CORE });
const state = realStore.state.CORE.AUTH;
const sessionData = (overrides = {}) => ({ authenticated: true, user: { id_login: 'qa-doctor', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'doctor' },
  business: { id_business: 'qa-clinic' }, role: 'doctor', permissions: ['px.all', 'prescriptions.edit'], sessionState: 'active', accessExpiresAt: 'later', ...overrides });

// Scripted auth endpoints. Each call takes the next reply; a reply may be a deferred promise.
let sessionCalls = 0, refreshCalls = 0, redirects = 0, sessionReplies = [], refreshReplies = [];
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const valid = (overrides) => ({ success: true, status: 200, authenticated: true, data: sessionData(overrides) });
const sessionFailure = (status, code) => ({ success: false, status, unauthorized: status === 401, authenticated: false, data: { authenticated: false, ...(code ? { code } : {}) }, message: 'x' });
const next = list => { const reply = list.length ? list.shift() : valid(); return reply && reply.promise ? reply.promise : Promise.resolve(reply); };
const authService = {
  session: async () => { sessionCalls += 1; await new Promise(resolve => setImmediate(resolve)); return next(sessionReplies); },
  refreshToken: async () => { refreshCalls += 1; return next(refreshReplies); },
  close: async () => ({ success: true })
};
const windowStub = { location: { href: '', pathname: '/px/history/qa', replace() {} } };
const authActions = load('src/store/modules/auth/actions.js', {
  Vue, types, modules, window: windowStub, DAAuthService: authService, isD2AuthMode: () => d2,
  clearLegacyAuthStorageForD2: () => storage.clear(), clearClinicalContinuityCache: () => {}, clearD2ClientAuthArtifacts: () => {},
  redirectToAuthIfNeeded: () => { redirects += 1; }, DAHasErrorModel: class {}, DAAuthModel: class {},
  DARefreshTokenModel: load('src/models/auth/DARefreshTokenModel.js'), decode: value => JSON.parse(value), process: { env: {} }
});
const actionContext = { state, commit: (key, value) => realStore.commit(modules.AUTH + '/' + key, value), dispatch: (key, payload) => authActions[key](actionContext, payload) };
const store = {
  state: realStore.state, getters: realStore.getters,
  commit: (key, value) => realStore.commit(key, value),
  dispatch: (key, payload) => authActions[key.replace(modules.AUTH + '/', '')](actionContext, payload)
};

// ---- Real ambiguous-401 module (absent on the base), status handler, interceptor and HTTP client ----
let clock = 1000000;
const ambiguous = optionalNamed('src/security/ambiguousUnauthorized.js', ['isAmbiguousUnauthorized', 'revalidateAmbiguousUnauthorized', 'resetAmbiguousUnauthorized', 'unauthorizedCode',
  'TERMINAL_AUTH_CODES', 'RECOVERABLE_AUTH_CODES', 'INVENTORIED_401_CODES', 'CONFIRMED_SESSION_WINDOW_MS', 'UNCERTAIN_SESSION_MESSAGE'],
  { ...rights, Date: { now: () => clock } });
const statusModule = named('src/services/config/axios.handlestatus.js', ['actions', 'options'], {
  store, types, modules, isD2AuthMode: () => d2,
  clearD2ClientAuthArtifacts: () => {}, redirectToAuthIfNeeded: () => { redirects += 1; }, shouldSkipD2UnauthorizedRedirect: () => false,
  isAuthControlRequest: rights.isAuthControlRequest, clearLegacyAuthStorageForD2: () => storage.clear(),
  ...(ambiguous.isAmbiguousUnauthorized ? { isAmbiguousUnauthorized: ambiguous.isAmbiguousUnauthorized, revalidateAmbiguousUnauthorized: ambiguous.revalidateAmbiguousUnauthorized } : {}),
  window: { location: { pathname: '/px/history/qa', href: '' } }
});
const { handleError, handleSuccess } = named('src/services/config/axios.interceptor.js', ['handleSuccess', 'handleError'], {
  options: statusModule.options, store, isCurrentAuthorization: rights.isCurrentAuthorization, authorizationChangedError: rights.authorizationChangedError,
  canRecoverCsrf: () => false, recoverCsrfRequest: () => { throw new Error('no csrf recovery expected'); }, readableCsrfError: () => {}
});
// The network: every business request is counted; its answer comes from `answer` (or a deferred per request).
const sent = [];
let answer = null;
const network = (method, url, payload, config) => {
  sent.push({ method, url, payload });
  const reply = typeof answer === 'function' ? answer(url) : answer;
  return Promise.resolve(reply && reply.promise ? reply.promise : reply).then(response => (response.status < 300
    ? handleSuccess({ config, status: response.status, data: response.data })
    : handleError({ config, response })));
};
const client = load('src/services/config/core.instance.js', {
  notifyPulseWrite: () => {}, trackApiWrite: () => {}, axiosHelper: { buildRequestConfig: async () => ({}) },
  context: { core: { get: (url, config) => network('get', url, null, Object.assign(config, { url })), post: (url, payload, config) => network('post', url, payload, Object.assign(config, { url })),
    put: (url, payload, config) => network('put', url, payload, Object.assign(config, { url })), patch: (url, payload, config) => network('patch', url, payload, Object.assign(config, { url })),
    delete: (url, config) => network('delete', url, null, Object.assign(config, { url })) } },
  httpstatus: { SUCESS: 200 }, ResultData: class ResultData { constructor() { this.success = false; } },
  store, authorizationContext: rights.authorizationContext, isCurrentAuthorization: rights.isCurrentAuthorization,
  authorizationChangedError: rights.authorizationChangedError, isAuthControlRequest: rights.isAuthControlRequest
});

// Backend answers, shaped as responseData builds them.
const ambiguous401 = (message = 'No autorizado.') => ({ status: 401, data: { status: 401, data: null, message } });
const coded401 = code => ({ status: 401, data: { status: 401, data: { code }, message: 'La sesion ya no esta activa.' } });
const ok = data => ({ status: 200, data: { status: 200, data, message: 'ok' } });
const denial = () => ({ status: 403, data: { status: 403, data: { code: 'PERMISSION_DENIED' }, message: 'No tienes permiso para guardar recetas.' } });
const CAPTURE = 'receta-sintetica-en-captura';
const save = () => client.post('/api/prescription/save', { prescription: { notes: CAPTURE } });

const results = [], failures = [];
const signIn = (overrides) => {
  if (ambiguous.resetAmbiguousUnauthorized) ambiguous.resetAmbiguousUnauthorized();
  d2 = true; clock = 1000000; storage.clear();
  realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
  realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData(overrides));
  realStore.state.CORE.PX.patient = CAPTURE;
  sessionCalls = 0; refreshCalls = 0; redirects = 0; sessionReplies = []; refreshReplies = []; sent.length = 0; answer = null;
};
const test = async (name, fn) => {
  signIn();
  try { await fn(); results.push(name); console.log('PASS ' + name); }
  catch (error) { failures.push(name); process.exitCode = 1; console.log('FAIL ' + name + '\n     ' + String(error && error.message).split('\n').slice(0, 3).join('\n     ')); }
};
const keptSession = (message = 'session kept') => { assert.equal(state.authenticated, true, message); assert.equal(redirects, 0, 'no redirect to authentication'); };
const ended = () => { assert.equal(state.authenticated, false, 'session cleared'); assert.equal(redirects, 1, 'one redirect to authentication'); };

(async () => {
  // 1. Valid session.
  await test('1 valid session: capture kept, original error returned, one revalidation, operation sent once', async () => {
    answer = ambiguous401('No autorizado para esta operacion.');
    const reply = await save();
    assert.equal(reply.success, false); assert.equal(reply.status, 401);
    assert.equal(reply.message, 'No autorizado para esta operacion.', 'the original error is shown');
    assert.equal(reply.authRevalidation, 'valid');
    keptSession();
    assert.equal(sessionCalls, 1, 'one auth/session revalidation');
    assert.equal(sent.length, 1, 'operation counter = 1 (no replay)');
    assert.equal(refreshCalls, 0);
    assert.equal(realStore.state.CORE.PX.patient, CAPTURE, 'capture kept');
  });

  // 2. Revocation, renewal, failed/non-renewable renewal.
  await test('2a revocation confirmed by auth/session: existing cleanup and redirect, no replay', async () => {
    answer = ambiguous401(); sessionReplies = [sessionFailure(401, 'AUTH_SESSION_INVALID')];
    const reply = await save();
    assert.equal(reply.status, 401); assert.equal(reply.authRevalidation, 'invalid');
    ended(); assert.equal(sessionCalls, 1); assert.equal(sent.length, 1);
  });
  await test('2b expired but renewable: bounded renewal, session kept, original still rejected, no replay', async () => {
    answer = ambiguous401(); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
    refreshReplies = [{ success: true, d2Session: valid() }];
    const reply = await save();
    assert.equal(reply.status, 401); assert.equal(reply.authRevalidation, 'valid');
    keptSession(); assert.equal(refreshCalls, 1, 'one renewal'); assert.equal(sent.length, 1, 'renewal does not resurrect the operation');
  });
  await test('2c expired and renewal fails: session ends; legacy without refresh token is not renewable', async () => {
    answer = ambiguous401(); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')]; refreshReplies = [sessionFailure(401)];
    let reply = await save();
    assert.equal(reply.authRevalidation, 'invalid'); ended(); assert.equal(refreshCalls, 1); assert.equal(sent.length, 1);
    signIn(); d2 = false; realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, valid().data);
    answer = ambiguous401(); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
    reply = await save();
    assert.equal(reply.authRevalidation, 'invalid'); ended(); assert.equal(refreshCalls, 0, 'no refresh token: not renewable'); assert.equal(sent.length, 1);
  });

  // 3. Network/5xx, concurrency, burst, terminal during the window.
  await test('3a network and 5xx: no revocation, no validation, capture kept, uncertainty shown, no loop', async () => {
    for (const failure of [sessionFailure(0), sessionFailure(503)]) {
      signIn(); answer = ambiguous401(); sessionReplies = [failure];
      const reply = await save();
      assert.equal(reply.status, 401); assert.equal(reply.authRevalidation, 'uncertain');
      assert.match(reply.message, /No pudimos confirmar tu sesión/);
      keptSession(); assert.equal(realStore.state.CORE.PX.patient, CAPTURE);
      assert.deepEqual([...state.permissions].sort(), ['prescriptions.edit', 'px.all'], 'no permission change from an uncertain answer');
      assert.equal(sessionCalls, 1); assert.equal(sent.length, 1);
    }
    // Uncertainty is not cached as a valid session: the next ambiguous 401 checks again.
    answer = ambiguous401(); await save();
    assert.equal(sessionCalls, 2);
  });
  await test('3b concurrent ambiguous 401s share one revalidation', async () => {
    answer = ambiguous401();
    const replies = await Promise.all([client.get('/api/prescription/list'), client.get('/api/px/qa'), save()]);
    assert.ok(replies.every(reply => reply.status === 401 && reply.authRevalidation === 'valid'));
    assert.equal(sessionCalls, 1, 'one shared revalidation'); assert.equal(sent.length, 3); keptSession();
  });
  await test('3c sequential burst after the first revalidation: no new check inside the window, one after it', async () => {
    answer = ambiguous401();
    await save(); await save(); await client.get('/api/prescription/list');
    assert.equal(sessionCalls, 1, 'the burst after a confirmed session does not re-check');
    clock += ambiguous.CONFIRMED_SESSION_WINDOW_MS || 0;
    await save();
    assert.equal(sessionCalls, 2, 'the window expires');
    assert.equal(sent.length, 4); keptSession();
  });
  await test('3d terminal 401 inside the window is never hidden', async () => {
    answer = ambiguous401(); await save();
    assert.equal(sessionCalls, 1);
    answer = coded401('AUTH_SESSION_INVALID');
    await save();
    ended(); assert.equal(sessionCalls, 1, 'a known terminal code needs no revalidation');
    signIn(); answer = ambiguous401(); await save();
    answer = coded401('AUTH_ACCESS_INVALID'); await save(); ended();
  });

  // 4. Context changes.
  await test('4a user/session/business change during revalidation: late positive does not touch the new context', async () => {
    const pending = deferred(); sessionReplies = [pending]; answer = ambiguous401();
    const replying = save();
    await new Promise(resolve => setImmediate(resolve));
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ business: { id_business: 'qa-other' }, user: { id_login: 'qa-doctor', id_session: 'qa-session-2', id_business: 'qa-other', rol: 'doctor' } }));
    pending.resolve(valid());
    const reply = await replying;
    assert.equal(reply.status, 409); assert.equal(reply.data.code, 'AUTH_CONTEXT_CHANGED');
    assert.equal(state.business.id_business, 'qa-other', 'the new business stays'); keptSession(); assert.equal(sent.length, 1);
  });
  await test('4b permission-only change: invalidates the context and earlier responses, nothing replayed', async () => {
    const slowRead = deferred();
    answer = url => (url.includes('list') ? slowRead : ambiguous401());
    const earlier = client.get('/api/prescription/list');
    sessionReplies = [valid({ permissions: ['px.all'] })];
    const revisionBefore = state.accessRevision;
    const reply = await save();
    assert.equal(reply.status, 409, 'the operation reports the authorization change'); assert.equal(reply.data.code, 'AUTH_CONTEXT_CHANGED');
    assert.ok(state.accessRevision > revisionBefore, 'revision advanced: protected views are invalidated');
    assert.deepEqual(state.permissions, ['px.all']);
    slowRead.resolve(ok([{ id: 'receta-previa' }]));
    const late = await earlier;
    assert.equal(late.success, false, 'a 200 obtained under the old permissions is discarded'); assert.equal(late.status, 409);
    keptSession(); assert.equal(sent.length, 2);
  });

  // 5. Late answers after login/logout/business change.
  await test('5a late negative after logout and new login does not close the new session', async () => {
    const pending = deferred(); sessionReplies = [pending]; answer = ambiguous401();
    const replying = save();
    await new Promise(resolve => setImmediate(resolve));
    realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ user: { id_login: 'qa-doctor', id_session: 'qa-session-new', id_business: 'qa-clinic', rol: 'doctor' } }));
    pending.resolve(sessionFailure(401, 'AUTH_SESSION_INVALID'));
    const reply = await replying;
    assert.equal(reply.status, 409);
    keptSession('the new session survives the late negative answer'); assert.equal(state.user.id_session, 'qa-session-new'); assert.equal(sent.length, 1);
  });
  await test('5b late positive after logout does not restore the closed session', async () => {
    const pending = deferred(); sessionReplies = [pending]; answer = ambiguous401();
    const replying = save();
    await new Promise(resolve => setImmediate(resolve));
    realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
    pending.resolve(valid());
    const reply = await replying;
    assert.equal(reply.success, false);
    assert.equal(state.authenticated, false, 'logout stays'); assert.equal(sent.length, 1);
  });
  await test('5c business change while the renewal is pending: late renewal is not applied', async () => {
    const renewal = deferred(); sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')]; refreshReplies = [renewal]; answer = ambiguous401();
    const replying = save();
    for (let i = 0; refreshCalls === 0 && i < 50; i += 1) await new Promise(resolve => setImmediate(resolve));
    assert.equal(refreshCalls, 1, 'the ambiguous 401 started a renewal');
    realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData({ business: { id_business: 'qa-other' } }));
    renewal.resolve({ success: true, d2Session: valid() });
    const reply = await replying;
    assert.equal(reply.status, 409);
    assert.equal(state.business.id_business, 'qa-other', 'the late renewal does not restore the previous business'); keptSession(); assert.equal(sent.length, 1);
  });

  // 6. Exclusions, code inventory, legacy transport.
  await test('6a auth controls keep their contract: no revalidation and no recursion', async () => {
    answer = ambiguous401();
    await client.post('/api/auth/changePassword/confirm', {});
    assert.equal(sessionCalls, 0, 'auth/* is never revalidated');
    assert.equal(sent.length, 1);
  });
  await test('6b code inventory: unknown codes (even AUTH_*) are ambiguous, never terminal by prefix', async () => {
    assert.ok(ambiguous.INVENTORIED_401_CODES && ambiguous.INVENTORIED_401_CODES.AUTH_REQUIRED, 'inventory present');
    assert.deepEqual([...ambiguous.TERMINAL_AUTH_CODES], ['AUTH_SESSION_INVALID', 'AUTH_ACCESS_INVALID']);
    assert.deepEqual([...ambiguous.RECOVERABLE_AUTH_CODES], ['AUTH_ACCESS_EXPIRED']);
    for (const code of ['AUTH_SOMETHING_NEW', 'PULSE_UNAVAILABLE']) {
      signIn(); answer = coded401(code);
      const reply = await save();
      assert.equal(reply.authRevalidation, 'valid', code); keptSession(code); assert.equal(sessionCalls, 1); assert.equal(sent.length, 1);
    }
  });
  await test('6c legacy transport: same defense, no unauthorized flag for the legacy watcher, no replay', async () => {
    d2 = false; storage.set('token', 'fixture'); realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, valid().data);
    answer = ambiguous401();
    const reply = await save();
    assert.equal(reply.authRevalidation, 'valid');
    assert.equal(state.unauthorized, false, 'the legacy watcher is not triggered (it would renew)');
    keptSession(); assert.equal(sessionCalls, 1); assert.equal(refreshCalls, 0); assert.equal(sent.length, 1);
  });

  // Real form: PrescriptionForm.saveDraft against an ambiguous 401 (valid and uncertain revalidation).
  await test('form PrescriptionForm.saveDraft: sheet open, capture kept, error shown, saved once', async () => {
    const service = { save: prescription => client.post('/api/prescription/save', { prescription }) };
    const form = component('src/views/prescriptions/components/PrescriptionForm.vue', {
      DAPrescriptionService: service, payload: value => JSON.parse(JSON.stringify(value)), snapshot: value => JSON.stringify(value)
    });
    const capture = { id_person: 'qa', items: [{ generic_name: 'Paracetamol QA', dose: '500 mg' }] };
    for (const [reply, expected] of [[valid(), 'No autorizado para esta operacion.'], [sessionFailure(0), /No pudimos confirmar tu sesión/]]) {
      signIn(); sessionReplies = [reply]; answer = ambiguous401('No autorizado para esta operacion.');
      const vmThis = { busy: false, loading: false, loadError: '', saving: false, error: '', internalShow: true, form: JSON.parse(JSON.stringify(capture)), baseline: 'before',
        check: () => true, showErrors() {}, $emit() { throw new Error('saved must not be emitted'); } };
      const saved = await form.methods.saveDraft.call(vmThis, true);
      assert.equal(saved, false);
      if (expected instanceof RegExp) assert.match(vmThis.error, expected); else assert.equal(vmThis.error, expected);
      assert.equal(vmThis.internalShow, true, 'sheet stays open'); assert.deepEqual(vmThis.form, capture, 'capture kept');
      assert.equal(vmThis.baseline, 'before', 'still unsaved'); assert.equal(vmThis.saving, false);
      keptSession(); assert.equal(sessionCalls, 1); assert.equal(sent.length, 1, 'saved once, never replayed');
    }
  });

  // R1 (Codex review of ac52ee04): the renewal goes through the REAL DAAuthService.refreshToken, HTTP client
  // (core.instance) and interceptor/status handler. A late answer of the renewal, positive or negative, must not
  // touch a session/context started afterwards; a terminal answer for the current context still ends the session.
  const realRenewal = () => {
    const effects = { csrfClears: 0, bootstraps: 0 };
    const service = load('src/services/core/auth/DAAuthService.js', {
      DACore: client, DAC_AUTH_REFRESH_TOKEN: '/api/auth/refreshToken', isD2AuthMode: () => d2,
      DACsrfService: { ensureCsrfToken: async () => {}, clearCsrfToken() { effects.csrfClears += 1; } },
      DASessionService: { bootstrapSession: () => { effects.bootstraps += 1; return authService.session(); } }
    });
    return { effects, refreshToken: (...args) => service.refreshToken(...args) };
  };
  const waitFor = async (predicate, label) => {
    for (let i = 0; i < 200 && !predicate(); i += 1) await new Promise(resolve => setImmediate(resolve));
    assert.ok(predicate(), 'bounded wait: ' + label);
  };
  const legacySession = overrides => ({ ...valid(overrides).data, accessToken: JSON.stringify({ id_login: 'qa-doctor' }), refreshToken: 'synthetic-refresh' });
  const startLegacy = overrides => { d2 = false; storage.set('token', 'fixture'); realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession(overrides)); };
  const renewalSent = () => sent.some(request => request.url.includes('refreshToken'));
  // Runs: ambiguous 401 → auth/session says AUTH_ACCESS_EXPIRED → real renewal pending → change() → renewal answers.
  const lateRenewal = async ({ legacy = false, change, renewalAnswer }) => {
    const renewal = realRenewal(), original = authService.refreshToken, pending = deferred();
    authService.refreshToken = renewal.refreshToken;
    try {
      if (legacy) startLegacy();
      sessionReplies = [sessionFailure(401, 'AUTH_ACCESS_EXPIRED')];
      answer = url => (url.includes('refreshToken') ? pending : ambiguous401());
      const replying = save();
      await waitFor(renewalSent, 'real renewal sent');
      if (change) change();
      const effectsBefore = { ...renewal.effects };
      pending.resolve(renewalAnswer);
      const reply = await replying;
      return { reply, effectsBefore, effects: renewal.effects };
    } finally { authService.refreshToken = original; }
  };
  const relogin = (legacy, overrides) => {
    realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, null);
    if (legacy) realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession(overrides));
    else realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData(overrides));
  };
  const NEW_LOGIN = { user: { id_login: 'qa-doctor', id_session: 'qa-session-new', id_business: 'qa-clinic', rol: 'doctor' } };
  const legacyRenewed = { status: 200, data: { status: 200, data: { token: JSON.stringify({ id_login: 'qa-doctor', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'doctor' }), refresh_token: 'renewed', permisos: ['px.all'] }, message: 'ok' } };
  const d2Renewed = { status: 200, data: { status: 200, data: {}, message: 'ok' } };

  for (const legacy of [false, true]) {
    const mode = legacy ? 'legacy' : 'D2';
    await test(`R1a ${mode} real renewal: late terminal 401 after logout and new login does not close the new session`, async () => {
      const { reply } = await lateRenewal({ legacy, change: () => relogin(legacy, NEW_LOGIN), renewalAnswer: coded401('AUTH_SESSION_INVALID') });
      keptSession('new login survives'); assert.equal(state.user.id_session, 'qa-session-new');
      assert.equal(reply.status, 409); assert.equal(sent.filter(r => !r.url.includes('refreshToken')).length, 1, 'business request sent once');
      assert.equal(sent.filter(r => r.url.includes('refreshToken')).length, 1, 'one renewal, no retry');
    });
    await test(`R1b ${mode} real renewal: late positive answer after logout and new login changes nothing`, async () => {
      const { reply, effectsBefore, effects } = await lateRenewal({ legacy, change: () => relogin(legacy, NEW_LOGIN), renewalAnswer: legacy ? legacyRenewed : d2Renewed });
      keptSession(); assert.equal(state.user.id_session, 'qa-session-new'); assert.equal(reply.status, 409);
      assert.deepEqual(effects, effectsBefore, 'no CSRF clearing or session bootstrap from the stale renewal');
      assert.equal(sent.length, 2);
    });
    await test(`R1c ${mode} real renewal: late terminal after business, role or permission change keeps the new context`, async () => {
      for (const overrides of [{ business: { id_business: 'qa-other' } }, { role: 'assistant', user: { id_login: 'qa-doctor', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'assistant' } }, { permissions: ['px.all'] }]) {
        signIn();
        const change = () => (legacy ? realStore.commit(modules.AUTH + '/' + types.SET_AUTH_ACCESS_SESSION, legacySession(overrides)) : realStore.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, sessionData(overrides)));
        const expected = JSON.stringify(Object.keys(overrides));
        const { reply } = await lateRenewal({ legacy, change, renewalAnswer: coded401('AUTH_SESSION_INVALID') });
        keptSession('context kept after ' + expected); assert.equal(reply.status, 409, expected);
        if (overrides.business) assert.equal(state.business.id_business, 'qa-other');
        if (overrides.role) assert.equal(state.role, 'assistant');
        if (overrides.permissions) assert.deepEqual([...state.permissions], ['px.all']);
      }
    });
    await test(`R1d ${mode} real renewal: a terminal answer for the current context still ends the session`, async () => {
      const { reply } = await lateRenewal({ legacy, renewalAnswer: coded401('AUTH_SESSION_INVALID') });
      assert.equal(state.authenticated, false); assert.ok(redirects >= 1, 'redirected to authentication');
      assert.equal(reply.status, 401); assert.equal(reply.authRevalidation, 'invalid');
      assert.equal(sent.length, 2, 'no replay');
    });
  }

  // 7. 403 flow preserved (registration recovery has its own suite and transport).
  await test('7 403 denial keeps its flow: session kept, one revalidation, no replay', async () => {
    answer = denial();
    const reply = await save();
    assert.equal(reply.status, 403); keptSession(); assert.equal(sessionCalls, 1); assert.equal(sent.length, 1);
  });

  console.log(failures.length ? `FAIL: ${failures.length} of ${failures.length + results.length} NC1-AUTH-401-AMB groups.` : `PASS: ${results.length} NC1-AUTH-401-AMB groups. Synthetic data; no network or backend.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
