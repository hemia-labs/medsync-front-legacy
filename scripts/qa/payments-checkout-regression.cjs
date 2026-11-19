'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = value => JSON.parse(JSON.stringify(value));
const key = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const offers = { available: true, checkoutAvailable: true, taxBehavior: 'inclusive', offers: [{ code: 'medsync_pro', name: 'Profesional', prices: [{ code: 'monthly_mxn', amount: '999.00', currency: 'MXN', billingInterval: 'month', billingIntervalCount: 1 }], features: { 'professionals.included': 1 } }] };
const legal = { requestId: 'legal-1', expiresAt: '2099-01-01T00:00:00Z', documents: [{ documentVersionId: 'terms-v1', contentHash: 'hash-terms', title: 'Condiciones de contratación', version: '1', kind: 'terms', contentHtml: '<h2>Términos vigentes</h2><p onclick=bad()>Texto<script>window.compromised=true</script><img src=x onerror=bad()><a href=javascript:bad()>peligro</a></p>', requiredAction: 'accept', acceptedInRegistration: true, acceptedAt: '2026-11-01T00:00:00Z', artifacts: { html: { url: 'https://legal.example.test/terms' } } }, { documentVersionId: 'privacy-v1', contentHash: 'hash-privacy', title: 'Privacidad de pagos', version: '1', kind: 'privacy', contentHtml: '<p>Privacidad actual</p>', requiredAction: 'acknowledge', acceptedInRegistration: false, acceptedAt: null, artifacts: { pdf: { url: 'https://legal.example.test/privacy.pdf' } } }] };
const pending = { attemptId: key, status: 'pending', statusFresh: true, planCode: 'medsync_pro', planPriceCode: 'monthly_mxn', retryAfterSeconds: 0 };
const ready = { ...pending, status: 'ready', subscriptionId: 'subscription-1', checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=synthetic', subscriptionStatus: 'pending' };
const subscription = { id: 'subscription-1', organizationId: 'business-1', productCode: 'medsync', planCode: 'medsync_pro', planPriceCode: 'monthly_mxn', status: 'active', nextBillingTime: '2099-01-01T00:00:00Z', cancelAtPeriodEnd: false };
const proof = { status: 'completed', provider: 'paypal', organizationId: 'business-1', productCode: 'medsync', subscriptionId: 'subscription-1', paymentId: 'payment-1', userId: 'user-1', planCode: 'medsync_pro', planPriceCode: 'monthly_mxn', paidAmount: '799.00', recurringAmount: '899.00', currency: 'MXN', paidAt: '2026-11-01T00:00:00Z', billingInterval: 'month', billingIntervalCount: 1, nextBillingAt: '2099-01-01T00:00:00Z' };
const license = { billing: { checkoutConfirmation: proof }, active: true, productCode: 'medsync', planCode: 'medsync_pro', subscriptionId: 'subscription-1', licenseStatus: 'active', validUntil: '2099-01-01T00:00:00Z' };
function commonJs(source) { return babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code; }
function moduleWith(file, bindings = {}) {
  const code = commonJs(read(file)), mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { if (!(name in bindings)) throw Error('Unexpected import ' + name); return bindings[name]; }, mod, mod.exports);
  return mod.exports;
}
(async () => {
  const rules = moduleWith('src/domain/billing/checkout.js');
  const activationRules = moduleWith('src/utils/activationDestination.js');
  assert.equal(rules.checkoutAttemptId(key.toUpperCase()), key);
  for (const bad of ['https://evil.test', '//evil.test', key + '&plan=evil', [key], 'not-an-id']) assert.equal(rules.checkoutAttemptId(bad), '');
  assert.deepEqual(rules.checkoutResumeRoute(key), { name: 'accountPlans', query: { attempt_id: key } });
  assert.equal(rules.checkoutResumeRoute('https://evil.test'), null);
  assert.equal(rules.checkoutLoginPath({ pathname: '/cuenta/planes', search: '?attempt_id=' + key + '&result=approved&token=private' }), '/login?checkout_attempt=' + key);
  assert.equal(rules.checkoutLoginPath({ pathname: '/inicio', search: '?attempt_id=' + key }), '/login');
  assert.deepEqual(rules.checkoutResumeRoute(key, 'change_plan'), { name: 'accountPlanChange', query: { attempt_id: key } });
  assert.deepEqual(rules.checkoutLoginRoute(key, 'change_plan'), { name: 'login', query: { checkout_attempt: key, checkout_operation: 'change_plan' } });
  assert.equal(rules.checkoutLoginPath({ pathname: '/cuenta/cambiar-plan', search: '?attempt_id=' + key + '&result=approved&token=discard' }), '/login?checkout_attempt=' + key + '&checkout_operation=change_plan');
  assert.equal(rules.checkoutLoginPath({ pathname: '/cuenta/cambiar-plan', search: '?attempt_id=https://evil.test' }), '/login');
  assert.equal(rules.checkoutResumeRoute(key, 'https://evil.test').name, 'accountPlans');
  for (const bad of ['javascript:alert(1)', 'data:text/html,bad', 'http://www.paypal.com/pay', 'https://user:secret@paypal.com/pay']) assert.equal(rules.safePaymentUrl(bad), '');
  assert.equal(rules.usableOffers(offers), true);
  assert.equal(rules.selectedOffer(offers, 'medsync_pro', 'missing'), null);
  assert.equal(rules.legalDocuments(legal).length, 2);
  assert.equal(rules.legalDocuments({ ...legal, expiresAt: '2000-01-01' }).length, 0);
  assert.equal(rules.legalDocuments({ ...legal, documents: [{ ...legal.documents[0], contentHtml: '' }] }).length, 0);
  for (const change of [{ requiredAction: 'unknown' }, { acceptedInRegistration: 'true' }, { acceptedAt: null }]) assert.equal(rules.legalDocuments({ ...legal, documents: [{ ...legal.documents[0], ...change }] }).length, 0);
  assert.equal(rules.paymentConfirmed(ready, null, null), false, 'Ready/return query does not mean paid');
  assert.equal(rules.paymentConfirmed({ ...ready, status: 'rejected' }, subscription, license), false);
  assert.equal(rules.paymentConfirmed({ ...ready, abandoned: true }, subscription, license), false);
  assert.equal(rules.paymentConfirmed(ready, subscription, license), true);
  for (const invalid of [{ ...license, subscriptionId: 'another' }, { ...license, planCode: 'another' }, { ...license, active: false }, { ...license, licenseStatus: 'grace' }, { ...license, validUntil: '2000-01-01' }]) assert.equal(rules.paymentConfirmed(ready, subscription, invalid), false);
  assert.equal(rules.paymentConfirmed({ ...ready, statusFresh: false }, subscription, license), true, 'Frozen receipt freshness does not invalidate completed payment evidence');
  assert.equal(rules.paymentConfirmed(ready, subscription, { ...license, billing: {} }), false, 'Active subscription alone is not a completed payment');
  for (const change of [{ status: 'pending' }, { subscriptionId: 'wrong' }, { organizationId: 'wrong' }, { planCode: 'wrong' }, { planPriceCode: 'wrong' }, { paidAmount: '0.00' }, { paidAmount: 'unknown' }, { currency: '' }, { provider: 'unknown' }, { paidAt: null }]) assert.equal(rules.paymentConfirmed(ready, subscription, { ...license, billing: { checkoutConfirmation: { ...proof, ...change } } }), false);
  assert.equal(rules.paymentConfirmed(ready, subscription, license, Date.now(), { organizationId: 'wrong' }), false);
  assert.equal(rules.paymentConfirmed(ready, subscription, license, Date.now(), { userId: 'wrong' }), false);
  assert.equal(rules.paymentConfirmed(ready, { ...subscription, status: 'pending' }, license), false);
  assert.ok(!rules.paymentErrorMessage({ code: 'PRIVATE_RAW', message: 'secret-input' }).includes('secret-input'));
  const paidBusiness = { id_business: 'business-1', name: 'Clínica de prueba', plan: 'pro', subscriptionStatus: 'active', billingManaged: true, billingAccessUntil: '2099-01-01T00:00:00Z', trialEndsAt: '2026-01-01T00:00:00Z' };
  assert.equal(rules.paidSessionApplied(paidBusiness, license, { allowed: true }), true, 'Historical trial dates do not make a paid account a trial');
  for (const [planCode, plan] of [['medsync_basic', 'basic'], ['medsync_pro', 'pro'], ['medsync_clinic', 'enterprise']]) assert.equal(rules.paidSessionApplied({ ...paidBusiness, plan }, { ...license, planCode }, { allowed: true }), true);
  assert.equal(rules.paidSessionApplied({ ...paidBusiness, billingManaged: undefined, billingAccessUntil: undefined, billing_managed: 1, billing_access_until: '2099-01-01T00:00:00Z' }, license, { allowed: true }), true);
  for (const change of [{ billingManaged: false }, { plan: 'basic' }, { subscriptionStatus: 'trial' }, { billingAccessUntil: '2000-01-01T00:00:00Z' }]) assert.equal(rules.paidSessionApplied({ ...paidBusiness, ...change }, license, { allowed: true }), false);
  assert.equal(rules.paidSessionApplied(paidBusiness, license, { allowed: false }), false);
  assert.equal(rules.paidSessionApplied(paidBusiness, { ...license, planCode: 'unknown' }, { allowed: true }), false);


  // The real auth mutations preserve Billing's access copy in both session modes.
  const types = moduleWith('src/store/modules/common/mutation-types.js').default;
  const authStorage = new Map(); let cookieMode = true;
  const authMutations = moduleWith('src/store/modules/auth/mutations.js', {
    '../common/mutation-types': { __esModule: true, default: types },
    vue: { __esModule: true, default: { prototype: { $session: { set: (key, value) => authStorage.set(key, value) } } } },
    'jwt-decode': { __esModule: true, default: () => { throw Error('No tokens needed for native session metadata'); } },
    '../../../security/permissions': moduleWith('src/security/permissions.js'),
    '../../../services/config/authTransport.config': { isD2AuthMode: () => cookieMode },
    '../../../security/authorizationContext': moduleWith('src/security/authorizationContext.js')
  }).default;
  for (const mode of [true, false]) {
    cookieMode = mode;
    const state = { authenticated: false };
    authMutations[mode ? types.SET_D2_AUTH_SESSION : types.SET_AUTH_ACCESS_SESSION](state, { authenticated: true, business: json(paidBusiness), tenantOperational: { allowed: true }, role: 'admin', permissions: [] });
    assert.equal(state.business.billingManaged, true); assert.equal(state.business.billingAccessUntil, paidBusiness.billingAccessUntil); assert.equal(state.business.trialEndsAt, paidBusiness.trialEndsAt);
    if (!mode) assert.equal(authStorage.get('business').billingManaged, true);
  }

  // Exercise the actual transport: all writes use CSRF, retain their captured key,
  // expose only safe errors, and never replay unknown network outcomes.
  let calls = [], version = 1, failure = null, changeContext = false;
  const store = {};
  const service = moduleWith('src/services/core/billing/DAPaymentsService.js', {
    axios: { create: config => { assert.equal(config.withCredentials, true); assert.equal(config.timeout, 20000); return { interceptors: { response: { use() {} } }, request: async request => { calls.push(request); if (failure) { const error = failure; failure = null; throw error; } if (changeContext) version++; return { data: pending }; } }; } },
    '../../config/axios.url': { __esModule: true, default: { APP_CORE_URL: 'https://api.example.test/' } },
    '../../config/axios.helper': { __esModule: true, default: { buildRequestConfig: async (method, config) => ({ ...config, headers: method === 'get' ? {} : { 'X-CSRF-Token': 'synthetic-csrf' }, withCredentials: true }) } },
    '../../../store': { __esModule: true, default: store },
    '../../../security/authorizationContext': { authorizationContext: () => version, isCurrentAuthorization: owner => owner === version },
    '../../config/csrfRecovery': { canRecoverCsrf: () => false, recoverCsrfRequest: () => { throw Error('Unexpected replay'); }, readableCsrfError: value => value }
  }).default;
  const snapshot = { idempotencyKey: key, planCode: 'medsync_pro', planPriceCode: 'monthly_mxn', legalAcceptanceId: 'accept-1' };
  failure = {}; await assert.rejects(service.create(snapshot), error => error.code === 'NETWORK_ERROR'); assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['X-CSRF-Token'], 'synthetic-csrf'); assert.deepEqual(calls[0].data, snapshot);
  await service.attempt(key); assert.equal(calls[1].method, 'get'); assert.equal(calls[1].data, undefined);
  failure = { response: { status: 503, data: { code: 'BILLING_UNAVAILABLE', message: 'secret-provider-details' } } };
  await assert.rejects(service.plans(), error => error.code === 'BILLING_UNAVAILABLE' && !JSON.stringify(error).includes('secret-provider-details'));
  const previous = calls.length; version++; await service.plans(); assert.equal(calls.length, previous + 1);
  changeContext = true; await assert.rejects(service.plans(), error => error.code === 'AUTH_CONTEXT_CHANGED'); changeContext = false;


  const cancelBody = { idempotencyKey: key, expectedSubscriptionId: 'subscription-1', expectedPeriodEnd: '2099-01-01T00:00:00Z' };
  const beforeCancel = calls.length; failure = {};
  await assert.rejects(service.cancelSubscription(cancelBody), error => error.code === 'NETWORK_ERROR');
  assert.equal(calls.length, beforeCancel + 1, 'Cancellation never replays an unknown transport outcome');
  assert.equal(calls.at(-1).url, 'api/payments/subscription/cancel');
  assert.equal(calls.at(-1).method, 'post'); assert.equal(calls.at(-1).headers['X-CSRF-Token'], 'synthetic-csrf');
  assert.deepEqual(calls.at(-1).data, cancelBody);

  const quoteInput = { expectedSubscriptionId: other, targetPlanCode: 'medsync_pro', targetPlanPriceCode: 'monthly_mxn' };
  await service.planChangeQuote(quoteInput);
  const quoteRequest = calls.at(-1), quoteUrl = new URL(quoteRequest.url, 'https://api.example.test/');
  assert.equal(quoteRequest.method, 'get'); assert.equal(quoteRequest.data, undefined); assert.equal(quoteUrl.pathname, '/api/payments/subscription/plan-change-quote');
  assert.deepEqual(Object.fromEntries(quoteUrl.searchParams), quoteInput);
  const changeBody = { ...snapshot, expectedSubscriptionId: other, expectedAmountDueNow: '125.50' }, beforeChangeWrites = calls.length;
  failure = {}; await assert.rejects(service.changePlan(changeBody), error => error.code === 'NETWORK_ERROR');
  assert.equal(calls.length, beforeChangeWrites + 1, 'Unknown upgrade outcomes are never replayed');
  assert.equal(calls.at(-1).url, 'api/payments/subscription/change-plan'); assert.deepEqual(calls.at(-1).data, changeBody); assert.equal(calls.at(-1).headers['X-CSRF-Token'], 'synthetic-csrf');
  await service.confirm(key); assert.equal(calls.at(-1).url, 'api/payments/checkout-attempts/' + key + '/confirm'); assert.equal(calls.at(-1).method, 'post'); assert.deepEqual(calls.at(-1).data, {}); assert.equal(calls.at(-1).headers['X-CSRF-Token'], 'synthetic-csrf');
  const discardWrites = calls.length; failure = {}; await assert.rejects(service.cancel(key), error => error.code === 'NETWORK_ERROR');
  assert.equal(calls.length, discardWrites + 1, 'An unknown discard outcome never auto replays'); assert.equal(calls.at(-1).url, 'api/payments/checkout-attempts/' + key + '/cancel'); assert.equal(calls.at(-1).method, 'post'); assert.deepEqual(calls.at(-1).data, {}); assert.equal(calls.at(-1).headers['X-CSRF-Token'], 'synthetic-csrf');

  const errors = [], virtualConsole = new VirtualConsole();
  ['jsdomError', 'error'].forEach(event => virtualConsole.on(event, error => errors.push(String(error))));
  const dom = new JSDOM('<div id="app"></div>', { url: 'https://medsync.example.test/cuenta/planes', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole });
  const w = dom.window; w.eval(read('node_modules/vue/dist/vue.js')); w.eval(read('node_modules/vuetify/dist/vuetify.js'));
  w.Vue.config.productionTip = false; w.Vue.config.devtools = false;
  // The SDK defines this element before preparePayPalApproval resolves.
  w.customElements.define('paypal-button', class extends w.HTMLElement {});
  const purify = require('dompurify')(w);
  const route = w.Vue.observable({ name: 'accountPlans', query: {}, params: {} });
  const navigation = [], redirects = [], apiCalls = [], registrationCalls = [], welcomeChoices = [];
  const getters = w.Vue.observable({ 'CORE/AUTH/getRole': 'admin', 'CORE/AUTH/getBusiness': { id_business: 'business-1', name: 'Clínica de prueba', subscriptionStatus: 'trial', trialEndsAt: '2099-01-01T00:00:00Z' }, 'CORE/AUTH/getUser': { id_login: 'user-1', id_session: 'session-1' }, 'CORE/AUTH/getTenantOperational': { allowed: true }, 'CORE/AUTH/isAuthorized': true });
  const router = { replace: async destination => { navigation.push(json(destination)); route.name = destination.name; route.query = json(destination.query || {}); await w.Vue.nextTick(); }, push: async destination => { navigation.push(json(destination)); if (destination.name === 'accountPlans') route.query = json(destination.query || {}); await w.Vue.nextTick(); } };
  Object.defineProperty(w.Vue.prototype, '$route', { get: () => route }); Object.defineProperty(w.Vue.prototype, '$router', { get: () => router });
  w.Vue.component('router-link', { props: ['to'], render(h) { return h('a', { attrs: { href: this.to.name === 'accountPlans' ? '/cuenta/planes?' + new w.URLSearchParams(this.to.query).toString() : '#' }, on: { click: event => { event.preventDefault(); this.$router.push(this.to); } } }, this.$slots.default); } });
  let generatedKeys = 0;
  let nextId = key, currentReceipt = json(ready), paid = false, projectionUnavailable = false, sessionUnavailable = false, createFailure = null, createGate = null, accessGate = null;
  let activationState = { commercialState: 'activated', subscriptionStatus: 'trial', trialEndsAt: '2099-01-01T00:00:00Z', welcomePending: false, nextAction: 'home', destination: 'home', contact: { emailVerified: true } };
  const api = {
    watchSubscription: () => null,
    savedSnapshot: async () => { apiCalls.push(['snapshot']); if (projectionUnavailable) throw { status: 503, code: 'BILLING_UNAVAILABLE' }; return paid ? webhookSnapshot() : null; },
    plans: async () => { apiCalls.push(['plans']); return json(offers); },
    prepareLegal: async id => { apiCalls.push(['prepare', id]); return json(legal); },
    acceptLegal: async payload => { apiCalls.push(['accept', json(payload), json(route.query)]); return { accepted: true, requestId: legal.requestId, legalAcceptanceId: 'accept-1' }; },
    create: async payload => { apiCalls.push(['create', json(payload), json(route.query)]); if (createGate) await createGate; if (createFailure) throw createFailure; return json({ ...currentReceipt, attemptId: payload.idempotencyKey }); },
    attempt: async id => { apiCalls.push(['attempt', id]); return json({ ...currentReceipt, attemptId: id }); },
    subscription: async () => { apiCalls.push(['subscription']); return paid ? json(subscription) : null; },
    license: async () => { apiCalls.push(['license']); if (projectionUnavailable) throw { status: 503, code: 'BILLING_UNAVAILABLE' }; return paid ? json(license) : { ...json(license), active: false, billing: {} }; },
  };
  const webhookSnapshot = (revision = '1') => ({ organizationId: 'business-1', productCode: 'medsync', revision, confirmedAt: new Date().toISOString(), subscription: json(subscription), license: json(license) });
  const registrationApi = {
    activation: async () => { registrationCalls.push('activation'); return json(activationState); },
    acknowledgeWelcome: async trialWelcome => { welcomeChoices.push(trialWelcome); registrationCalls.push('ack'); activationState = { ...activationState, welcomePending: false, nextAction: 'home', destination: 'home' }; return { acknowledged: true }; }
  };
  const refreshSession = async (action, options) => {
    apiCalls.push(['auth', action, options]);
    if (accessGate) await accessGate;
    if (sessionUnavailable) return { success: false, status: 503 };
    if (paid) getters['CORE/AUTH/getBusiness'] = { ...getters['CORE/AUTH/getBusiness'], ...paidBusiness };
    return { success: true, data: { authenticated: true, business: json(getters['CORE/AUTH/getBusiness']), tenantOperational: { allowed: true } } };
  };
  w.Vue.prototype.$store = { getters, dispatch: refreshSession };
  function component(file, imports) {
    const descriptor = compiler.parseComponent(read(file)), compiled = compiler.compile(descriptor.template.content); assert.deepEqual(compiled.errors, []);
    const mod = { exports: {} };
    new w.Function('require', 'module', 'exports', commonJs(descriptor.script.content))(name => { if (!(name in imports)) throw Error('Unexpected component import ' + name); return imports[name]; }, mod, mod.exports);
    return { ...mod.exports.default, render: new w.Function(compiled.render), staticRenderFns: compiled.staticRenderFns.map(code => new w.Function(code)) };
  }
  const Catalog = component('src/components/billing/PlanCatalog.vue', { '../../services/core/auth/DARegistrationService': { __esModule: true, default: { publicPlans: async () => offers } } });
  let paypalCallbacks, sdkFailure = false, popupFailure = false; const popupCalls = [];
  const reservedWindows = []; let reserveBlocked = false;
  const Page = component('src/views/Auth/AccountPlans.vue', {
    '../../domain/billing/planChangePayPal': { returnFromPlanChangePayPal: () => false, openPlanChangePayPal: callbacks => { if (reserveBlocked) throw Error('blocked'); const popup = { callbacks, closed: false, close() { this.closed = true; }, navigate(url, id) { redirects.push(url); this.id = id; } }; reservedWindows.push(popup); return popup; } },
    dompurify: { __esModule: true, default: purify },
    './AccountFlowShell.vue': { __esModule: true, default: { render(h) { return h('main', this.$slots.default); } } },
    '../../services/core/billing/DAPaymentsService': { __esModule: true, default: api },
    '../../components/billing/PlanCatalog.vue': { __esModule: true, default: Catalog },
    '../../services/core/auth/DARegistrationService': { __esModule: true, default: registrationApi },
    '../../utils/activationDestination': activationRules,
    '../../utils/registration': { registrationAttemptId: () => { generatedKeys++; return nextId; } },
    '../../domain/billing/checkout': rules,
    '../../domain/billing/subscriptionUpdates': moduleWith('src/domain/billing/subscriptionUpdates.js'),
    '../../domain/billing/paypalApproval': { paypalApproval: value => value || null, preparePayPalApproval: async (config, currency, callbacks) => { assert.equal(currency, 'MXN'); paypalCallbacks = callbacks; if (sdkFailure) throw Error('SDK unavailable'); return { start(options, receipt) { popupCalls.push([options, receipt]); return popupFailure ? Promise.reject(Error('blocked')) : Promise.resolve(); } }; } }
  });

  // Keep real Vue/Vuetify timers; capture only checkout backoff timers for deterministic polling.
  const pollTimers = new Map(), nativeTimeout = w.setTimeout.bind(w), nativeClear = w.clearTimeout.bind(w); let timerId = -1;
  w.setTimeout = (fn, delay, ...args) => { if ([2000, 3000, 5000, 10000, 15000, 30000, 45000].includes(delay)) { const id = timerId--; pollTimers.set(id, { fn, delay }); return id; } return nativeTimeout(fn, delay, ...args); };
  w.clearTimeout = id => { if (pollTimers.has(id)) pollTimers.delete(id); else nativeClear(id); };
  let app, screen;
  const flush = async (ms = 0) => { await new Promise(resolve => setTimeout(resolve, ms)); await w.Vue.nextTick(); await new Promise(resolve => setTimeout(resolve, 0)); };
  const button = text => Array.from(w.document.querySelectorAll('button')).find(node => (node.textContent.trim() || node.getAttribute('aria-label') || '').includes(text));
  const paypalButton = () => w.document.querySelector('paypal-button') || undefined;
  const closeButton = () => w.document.querySelector('.payment-checkout-navigation button');
  const writes = () => apiCalls.filter(call => ['accept', 'create', 'verify', 'retry'].includes(call[0]));
  const mount = async (query = {}) => { if (app) { app.$destroy(); app = null; } route.query = json(query); await flush(); pollTimers.clear(); w.document.body.innerHTML = '<div id="app"></div>'; app = new w.Vue({ vuetify: new w.Vuetify(), render: h => h('v-app', [h(Page, { ref: 'screen' })]) }).$mount('#app'); screen = app.$refs.screen; await flush(); return screen; };
  const choose = async () => { w.document.querySelector('.catalog-select').click(); await flush(); };
  const agree = async () => { const input = w.document.querySelector('input[type=checkbox]'); assert.ok(input); input.click(); await flush(); };
  try {
    const prepareNormal=api.prepareLegal;
    api.prepareLegal=async()=>{throw {status:503,code:'BILLING_UNAVAILABLE'};};
    const beforeFailure=writes().length;
    const plansForUrl=api.plans;
    api.plans=async()=>({...json(offers),offers:[{...json(offers.offers[0]),code:'medsync_basic',name:'Basico del servicio',prices:[{...json(offers.offers[0].prices[0]),code:'medsync_basic_monthly_mxn',amount:'499.00'}]}]});
    await mount({plan_code:'medsync_basic',price_code:'medsync_basic_monthly_mxn'});
    assert.equal(screen.selection.planCode,'medsync_basic');assert.equal(screen.selection.planPriceCode,'medsync_basic_monthly_mxn');
    assert.equal(screen.selection.name,'Basico del servicio');assert.match(w.document.querySelector('#selected-plan-title').textContent,/Basico del servicio/);
    assert.equal(screen.canCreate,false);assert.equal(writes().length,beforeFailure);
    api.plans=plansForUrl;
    await mount({plan_code:'medsync_pro',price_code:'monthly_mxn'});
    assert.equal(screen.selection.planCode,'medsync_pro','Keep the URL-selected service offer even if conditions cannot load');
    assert.equal(screen.selection.planPriceCode,'monthly_mxn');assert.equal(screen.canCreate,false);
    assert.match(w.document.querySelector('#selected-plan-title').textContent,/Profesional/);
    assert.ok(button('Volver a cargar condiciones'));assert.equal(w.document.querySelector('.catalog-select'),null,'Do not ask the user to choose the same plan twice');
    assert.equal(writes().length,beforeFailure,'A selected offer never accepts conditions or creates a checkout');
    await mount({plan_code:'medsync_pro',price_code:'foreign-price'});assert.equal(screen.selection,null,'Reject an unknown URL offer even during a conditions outage');
    api.prepareLegal=prepareNormal;
    await mount({plan_code:'medsync_pro',price_code:'monthly_mxn'});assert.equal(screen.selection.planCode,'medsync_pro');assert.equal(screen.documents.length,2);
    // Re-entering plans or a rejected duplicate adopts the original buyer-bound approval.
    const normalSubscription = api.subscription, normalResumeAttempt = api.attempt, normalResumeCreate = api.create, normalResumePlans = api.plans;
    const originalApproval = { kind: 'subscription', subscriptionId: 'I-ORIGINAL123', clientId: 'public-app', environment: 'sandbox' };
    const originalReceipt = { ...ready, attemptId: other, planCode: 'medsync_basic', planPriceCode: 'medsync_basic_monthly_mxn', paypalApproval: originalApproval };
    const originalSubscription = { ...subscription, status: 'pending', planCode: originalReceipt.planCode, planPriceCode: originalReceipt.planPriceCode, pendingCheckoutAttemptId: other };
    const rejectedDuplicate = { ...pending, status: 'rejected', statusFresh: false, planCode: originalReceipt.planCode, planPriceCode: originalReceipt.planPriceCode, errorCode: 'BILLING_CHECKOUT_REJECTED' };
    let pendingSubscription = originalSubscription, candidateReceipt = originalReceipt, candidateFailure = null;
    api.plans = async () => ({ ...json(offers), offers: [...json(offers.offers), { ...json(offers.offers[0]), code: 'medsync_basic', name: 'Básico', prices: [{ ...json(offers.offers[0].prices[0]), code: 'medsync_basic_monthly_mxn', amount: '499.00' }] }] });
    api.subscription = async () => { apiCalls.push(['subscription']); return json(pendingSubscription); };
    api.attempt = async id => { apiCalls.push(['attempt', id]); if (id === other && candidateFailure) throw candidateFailure; return json(id === other ? candidateReceipt : currentReceipt); };
    currentReceipt = rejectedDuplicate;
    for (const entry of [{}, { plan_code: 'medsync_basic', price_code: 'medsync_basic_monthly_mxn' }, { attempt_id: key }, { attempt_id: other }]) {
      const beforeWrites = writes().length, beforeKeys = generatedKeys, beforeLegal = apiCalls.filter(call => call[0] === 'prepare').length;
      await mount(entry);
      assert.equal(screen.attemptId, other, 'Resume the canonical attempt instead of inventing a new checkout');
      assert.equal(screen.attempt.checkoutId, originalReceipt.checkoutId); assert.equal(screen.attempt.subscriptionId, originalReceipt.subscriptionId);
      assert.equal(screen.approval.subscriptionId, originalApproval.subscriptionId); assert.ok(paypalButton()); assert.equal(screen.confirmed, false);
      assert.equal(button('Volver a intentar el pago'), undefined); assert.equal(writes().length, beforeWrites); assert.equal(generatedKeys, beforeKeys);
      assert.equal(apiCalls.filter(call => call[0] === 'prepare').length, beforeLegal, 'Existing consent and approval are retained');
    }
    const beforeOriginalOpen = writes().length, beforeOriginalPopup = popupCalls.length;
    paypalButton().click(); await flush(); assert.equal(popupCalls.length, beforeOriginalPopup + 1);
    assert.deepEqual(json(await popupCalls.at(-1)[1]), { subscriptionId: originalApproval.subscriptionId });
    paypalCallbacks.onCancel(); await flush(); closeButton().click(); await flush(); assert.equal(navigation.at(-1).name, 'home');
    await mount(); assert.equal(screen.attemptId, other); assert.ok(paypalButton()); assert.equal(writes().length, beforeOriginalOpen, 'Exit and return never cancel, verify or create a payment');

    // Do not silently adopt another plan or a receipt outside the original buyer/contract.
    await mount({ plan_code: 'medsync_pro', price_code: 'monthly_mxn' });
    assert.equal(screen.attemptId, ''); assert.equal(screen.canCreate, false); assert.match(screen.error, /intento en proceso/);
    assert.deepEqual(json(screen.pendingAttemptRoute), { name: 'accountPlans', query: { attempt_id: other } });
    const pendingLink = w.document.querySelector('.payment-alert a'); assert.ok(pendingLink); assert.equal(pendingLink.getAttribute('href'), '/cuenta/planes?attempt_id=' + other); pendingLink.click(); await flush(); assert.equal(screen.attemptId, other); assert.ok(paypalButton());
    for (const change of [{ attemptId: key }, { status: 'rejected' }, { abandoned: true }, { planCode: 'medsync_pro' }, { planPriceCode: 'foreign-price' }, { subscriptionId: 'other-contract' }, { subscriptionId: undefined }, { subscriptionStatus: 'cancelled' }, { checkoutStatus: 'cancelled' }]) {
      candidateReceipt = { ...originalReceipt, ...change }; const beforeNavigation = navigation.length, beforeWrites = writes().length;
      await mount(); assert.equal(navigation.length, beforeNavigation); assert.equal(screen.canCreate, false); assert.ok(screen.error); assert.equal(paypalButton(), undefined); assert.equal(writes().length, beforeWrites);
    }
    candidateReceipt = originalReceipt;
    for (const change of [{ organizationId: 'other-business' }, { productCode: 'other-product' }, { pendingCheckoutAttemptId: undefined }]) {
      pendingSubscription = { ...originalSubscription, ...change }; const beforeNavigation = navigation.length;
      await mount(); assert.equal(navigation.length, beforeNavigation); assert.equal(screen.canCreate, false); assert.ok(screen.error); assert.equal(paypalButton(), undefined);
    }
    pendingSubscription = originalSubscription; candidateFailure = { status: 404, code: 'PAYMENT_NOT_FOUND' };
    await mount({ attempt_id: key }); assert.equal(screen.attemptId, key); assert.equal(screen.missingAttempt, false); assert.ok(screen.error); assert.equal(paypalButton(), undefined); candidateFailure = null;
    const availableSubscription = api.subscription;
    api.subscription = async () => { throw { status: 503, code: 'BILLING_UNAVAILABLE' }; };
    await mount({ plan_code: 'medsync_basic', price_code: 'medsync_basic_monthly_mxn' }); assert.equal(screen.canCreate, false); assert.ok(screen.error);
    await mount({ attempt_id: other }); assert.ok(paypalButton(), 'A direct original link remains usable without a subscription-discovery request'); api.subscription = availableSubscription;

    // A transient old receipt for the same canonical key is hydrated without replacing the same URL.
    pendingSubscription = { ...originalSubscription, pendingCheckoutAttemptId: key }; let sameKeyReads = 0;
    api.attempt = async id => { apiCalls.push(['attempt', id]); return json(++sameKeyReads === 1 ? rejectedDuplicate : { ...originalReceipt, attemptId: key }); };
    const sameKeyNavigation = navigation.length; await mount({ attempt_id: key });
    assert.equal(screen.attemptId, key); assert.equal(screen.attempt.status, 'ready'); assert.ok(paypalButton()); assert.equal(navigation.length, sameKeyNavigation);
    api.attempt = async id => { apiCalls.push(['attempt', id]); if (id === other && candidateFailure) throw candidateFailure; return json(id === other ? candidateReceipt : currentReceipt); };

    // Recheck immediately before submit; another tab may already have prepared the same payment.
    pendingSubscription = null; await mount({ plan_code: 'medsync_basic', price_code: 'medsync_basic_monthly_mxn' }); await agree(); assert.equal(screen.canCreate, true);
    pendingSubscription = originalSubscription; const preSubmitWrites = writes().length;
    button('Continuar con PayPal').click(); await flush(); assert.equal(screen.attemptId, other); assert.ok(paypalButton()); assert.equal(writes().length, preSubmitWrites);
    // If a competing tab wins after the check, both receipt and HTTP conflicts recover the original.
    for (const outcome of ['receipt', 'processing', 409, 422]) {
      pendingSubscription = null; await mount({ plan_code: 'medsync_basic', price_code: 'medsync_basic_monthly_mxn' }); await agree();
      api.create = async payload => { apiCalls.push(['create', json(payload), json(route.query)]); pendingSubscription = originalSubscription; if (!['receipt', 'processing'].includes(outcome)) throw { status: outcome, code: 'PAYMENT_CONFLICT' }; return json(outcome === 'processing' ? { ...rejectedDuplicate, status: 'processing', errorCode: 'CHECKOUT_IN_PROGRESS' } : rejectedDuplicate); };
      const competingWrites = writes().length, competingCreates = apiCalls.filter(call => call[0] === 'create').length;
      button('Continuar con PayPal').click(); await flush(); assert.equal(screen.attemptId, other); assert.ok(paypalButton()); assert.equal(screen.approval.subscriptionId, originalApproval.subscriptionId);
      assert.equal(apiCalls.filter(call => call[0] === 'create').length, competingCreates + 1); assert.equal(writes().length, competingWrites + 2, 'Exactly the explicit consent/create, no automatic retry/verify/cancel');
    }
    api.create = normalResumeCreate;
    pendingSubscription = null; currentReceipt = json(pending); await mount({ attempt_id: key }); pendingSubscription = originalSubscription; currentReceipt = rejectedDuplicate;
    const consultWrites = writes().length; await screen.consult(); await flush(); assert.equal(screen.attemptId, other); assert.ok(paypalButton()); assert.equal(writes().length, consultWrites);
    pendingSubscription = null; currentReceipt = rejectedDuplicate; await mount({ attempt_id: key });
    assert.equal(screen.attempt.status, 'rejected'); assert.equal(paypalButton(), undefined); assert.equal(button('Volver a intentar el pago'), undefined, 'A real rejection is not revived or resent');
    // A lookup that finishes after navigation or loss of buyer permissions cannot adopt its receipt.
    let releaseDiscovery;
    api.subscription = () => new Promise(resolve => { releaseDiscovery = resolve; });
    const staleKeys = generatedKeys, staleWrites = writes().length;
    await mount({ plan_code: 'medsync_basic', price_code: 'medsync_basic_monthly_mxn' }); assert.equal(screen.loading, true);
    const staleNavigation = navigation.length; route.query = { attempt_id: other }; await flush();
    releaseDiscovery(originalSubscription); await flush();
    assert.equal(navigation.length, staleNavigation); assert.equal(screen.attemptId, other); assert.ok(paypalButton()); assert.equal(generatedKeys, staleKeys); assert.equal(writes().length, staleWrites);
    await mount({ plan_code: 'medsync_basic', price_code: 'medsync_basic_monthly_mxn' }); const actorNavigation = navigation.length;
    getters['CORE/AUTH/getRole'] = 'assistant'; await flush(); releaseDiscovery(originalSubscription); await flush();
    assert.equal(navigation.length, actorNavigation); assert.equal(paypalButton(), undefined); assert.equal(generatedKeys, staleKeys); assert.equal(writes().length, staleWrites);
    getters['CORE/AUTH/getRole'] = 'admin';
    api.subscription = normalSubscription; api.attempt = normalResumeAttempt; api.create = normalResumeCreate; api.plans = normalResumePlans; currentReceipt = json(ready); nextId = key; popupCalls.length = 0;
    apiCalls.length=0;
    await mount();
    assert.equal(apiCalls.filter(call => call[0] === 'prepare').length, 1, 'Current docs are preloaded without a plan or extra step'); assert.equal(writes().length, 0);
    await choose(); assert.equal(screen.documents.length, 2); assert.equal(button('Revisar condiciones y continuar'), undefined);
    assert.ok(button('Continuar con PayPal')); assert.equal(w.document.body.textContent.includes('En PayPal revisarás y confirmarás tu suscripción.'), false);
    assert.equal(w.document.querySelectorAll('input[type=checkbox]').length, 1, 'Only new/changed docs require a checkbox');
    assert.match(w.document.body.textContent, /Condiciones del plan/); assert.equal(screen.canCreate, false);
    const readButton = button('Condiciones de contratación'); readButton.focus(); readButton.click(); await flush(50);
    assert.equal(screen.legalOpen, true); assert.equal(w.document.activeElement.id, 'payment-legal-title');
    assert.ok(w.document.querySelector('[role=dialog][aria-labelledby=payment-legal-title]'));
    assert.ok(w.document.querySelector('[role=dialog] .flow-legal.payment-legal-dialog'), 'Detached legal modal retains the scoped authentication palette');
    assert.equal(w.document.querySelector('.payment-document-body script'), null); assert.equal(w.document.querySelector('.payment-document-body img'), null); assert.equal(w.document.querySelector('[onclick]'), null); assert.equal(w.compromised, undefined);
    const unsafe = w.document.querySelector('.payment-document-body a'); assert.equal(unsafe.hasAttribute('href'), false);
    const escape = new w.KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }); w.document.activeElement.dispatchEvent(escape); await flush(50);
    assert.equal(screen.legalOpen, false); assert.equal(w.document.activeElement, readButton);
    await screen.clearSelection(); await choose(); assert.equal(apiCalls.filter(call => call[0] === 'prepare').length, 1); assert.equal(screen.legalKey, key);
    await agree(); assert.equal(screen.canCreate, true);
    let releaseCreate; createGate = new Promise(resolve => { releaseCreate = resolve; }); currentReceipt = { ...ready, statusFresh: false };
    button('Continuar con PayPal').click(); await flush(); assert.equal(route.query.attempt_id, key);
    assert.equal(screen.statusTitle, 'Preparando tu pago'); assert.match(w.document.body.textContent, /Estamos preparando tu solicitud de pago/); assert.ok(w.document.querySelector('.payment-status-motion[aria-hidden=true]')); assert.equal(w.document.querySelector('.payment-provider'), null); assert.match(w.document.querySelector('.payment-status-summary').textContent, /999.00 MXN/); assert.ok(!w.document.body.textContent.includes('Total pagado'));
    const acceptance = apiCalls.find(call => call[0] === 'accept'); assert.equal(acceptance[2].attempt_id, key, 'UUID precedes the first acceptance POST');
    assert.deepEqual(acceptance[1].confirmations, legal.documents.map(doc => ({ documentVersionId: doc.documentVersionId, contentHash: doc.contentHash, accepted: true })), 'New checkout receipt covers all current docs including registration matches');
    assert.deepEqual(apiCalls.find(call => call[0] === 'create')[1], snapshot);
    await screen.createCheckout(); assert.equal(apiCalls.filter(call => call[0] === 'create').length, 1);
    const beforeAuthority = apiCalls.filter(call => call[0] === 'license').length;
    releaseCreate(); await flush(); createGate = null;
    assert.equal(redirects.length, 1); assert.equal(apiCalls.filter(call => call[0] === 'license').length, beforeAuthority, 'Ready checkout redirects before authority reads');
    assert.equal(screen.redirectReady(), false); assert.equal(redirects.length, 1);

    // Pending preparation keeps the original window and the same attempt.
    currentReceipt = json(pending); nextId = other; await mount(); await choose(); await agree(); button('Continuar con PayPal').click(); await flush();
    assert.equal(redirects.length, 1); assert.equal(screen.redirectIntent, other); assert.equal(pollTimers.size, 0);
    const written = writes().length, idleReads = apiCalls.length;
    w.dispatchEvent(new w.Event('focus')); await flush(); assert.equal(apiCalls.length, idleReads);
    currentReceipt = { ...ready, attemptId: other, statusFresh: false }; await screen.consult();
    assert.equal(redirects.length, 2); assert.equal(writes().length, written); assert.equal(pollTimers.size, 0);

    // Reload/approved/cancelled never approve or write automatically, even ready.
    currentReceipt = json(ready); paid = false; nextId = key;
    const reloadWrites = writes().length; let previousRedirects = redirects.length;
    await mount({ attempt_id: key, result: 'approved' });
    assert.equal(screen.confirmed, false); assert.equal(screen.accessConfirmed, false); assert.equal(redirects.length, previousRedirects); assert.equal(writes().length, reloadWrites);
    assert.equal(button('Verificar pago'), undefined); assert.equal(button('Retomar pago'), undefined); assert.ok(button('Actualizar estado')); assert.equal(pollTimers.size, 1);
    await screen.consult(); assert.equal(writes().length, reloadWrites); assert.equal(redirects.length, previousRedirects);
    await mount({ attempt_id: key, result: 'cancelled' }); assert.match(w.document.body.textContent, /Si no completaste/); assert.equal(redirects.length, previousRedirects);

    let live, liveClosed = 0;
    api.watchSubscription = handlers => { live = handlers; return () => { liveClosed++; }; };
    await mount({ attempt_id: key, result: 'approved' });
    assert.equal(screen.updatesOpen, true); assert.equal(pollTimers.size, 1); assert.equal(screen.statusTitle, 'Para continuar, completa tu pago en PayPal');
    assert.ok(w.document.querySelector('.payment-status-motion[aria-hidden=true]'), 'An approved return waits for webhook evidence'); assert.equal(screen.paymentPhase, 'pending'); assert.equal(w.document.querySelector('#account-plans-title').textContent, 'Estamos confirmando tu pago'); assert.equal(w.document.querySelector('.payment-progress [aria-current=step]').textContent.trim(), '1Confirmación'); assert.ok(!w.document.body.textContent.includes('Total pagado'));
    assert.equal(button('Continuar a MedSync').disabled, false, 'The waiting animation never blocks continuation');
    const passiveReads = apiCalls.length, passiveWrites = writes().length;
    screen.now = screen.waitingSince + 61000; await flush();
    assert.equal(screen.paymentPhase, 'delayed'); assert.match(w.document.querySelector('#account-plans-title').textContent, /confirmación está tardando/); assert.equal(screen.confirmed, false); assert.equal(apiCalls.length, passiveReads); assert.equal(writes().length, passiveWrites); assert.equal(pollTimers.size, 1);
    screen.now = Date.now(); await flush();
    w.dispatchEvent(new w.Event('focus')); await flush(); assert.equal(apiCalls.length, passiveReads, 'Focus does not poll Billing');
    assert.equal(button('Actualizar estado'), undefined);
    paid = true; live.updated(webhookSnapshot()); await flush(); assert.equal(screen.accessConfirmed, true); assert.equal(screen.paymentPhase, 'active'); assert.equal(w.document.querySelectorAll('.payment-progress .complete').length, 3); assert.equal(w.document.querySelector('.payment-status-motion'), null); assert.ok(liveClosed > 0); assert.equal(writes().length, passiveWrites);
    paid = false; await mount({ attempt_id: key }); live.ended(); await flush(); assert.equal(screen.updatesOpen, false); assert.equal(pollTimers.size, 0); assert.ok(button('Actualizar estado'));
    const staleLive = live; await mount(); const beforeStaleNotice = apiCalls.length; staleLive.updated(webhookSnapshot('2')); await flush(); assert.equal(apiCalls.length, beforeStaleNotice, 'Closed attempt cannot refresh another screen');
    api.watchSubscription = () => null;

    // A confirmed buyer can leave while the existing global access refresh is in flight.
    let releaseAccess; accessGate = new Promise(resolve => { releaseAccess = resolve; });
    getters['CORE/AUTH/getBusiness'] = { id_business: 'business-1', name: 'Clínica', plan: 'pro', subscriptionStatus: 'trial', registrationWelcomePending: true };
    const previousActivation = activationState;
    activationState = { ...activationState, welcomePending: true, nextAction: 'setup_summary', destination: 'summary' };
    paid = true; currentReceipt = { ...ready, statusFresh: false, subscriptionStatus: 'active' };
    await mount({ attempt_id: key, result: 'approved' });
    assert.equal(screen.confirmed, true); assert.equal(screen.accessConfirmed, false); assert.equal(screen.statusTitle, 'Completando tu suscripción');
    assert.notEqual(getters['CORE/AUTH/getBusiness'].billingManaged, true, 'Local paid access is still pending before leaving'); assert.equal(screen.paymentPhase, 'applying'); assert.equal(w.document.querySelector('#account-plans-title').textContent, 'Estamos activando tu plan'); assert.equal(w.document.querySelector('.payment-progress [aria-current=step]').textContent.trim(), '2Activación'); assert.match(w.document.querySelector('.payment-success-receipt').textContent, /Total pagado799.00 MXN/);
    assert.equal(button('Continuar a MedSync').disabled, false, 'Confirmed completion never traps the buyer on this screen');
    const completionWrites = writes().length, completionReads = apiCalls.length;
    button('Continuar a MedSync').click(); await flush();
    assert.deepEqual(navigation.at(-1), { name: 'accountActivation' }, 'Leaving preserves the onboarding destination');
    assert.equal(writes().length, completionWrites); assert.equal(apiCalls.length, completionReads, 'Leave neither restarts access refresh nor submits a payment');
    app.$destroy(); app = null; releaseAccess(); accessGate = null; await flush();
    assert.equal(getters['CORE/AUTH/getBusiness'].billingManaged, true, 'The global access refresh finishes after unmount');
    activationState = previousActivation;

    // Full server proof + local applied session, including stale frozen receipt.
    paid = true; currentReceipt = { ...ready, statusFresh: false, subscriptionStatus: 'active' }; await mount({ attempt_id: key, result: 'approved' });
    assert.equal(screen.confirmed, true); assert.equal(screen.accessConfirmed, true); assert.equal(pollTimers.size, 0); assert.equal(w.document.activeElement.id, 'account-plans-title', 'Payment success focuses and announces the new title');
    assert.match(w.document.body.textContent, /Tu plan ya está activo/); assert.match(w.document.querySelector('.payment-success-receipt').textContent, /Profesional/); assert.match(w.document.body.textContent, /799.00 MXN/); assert.match(w.document.body.textContent, /899.00 MXN/);
    assert.ok(!w.document.body.textContent.includes('999.00')); assert.ok(!w.document.body.textContent.includes('Billing')); assert.ok(!w.document.body.textContent.includes(key)); assert.ok(!w.document.body.textContent.includes('monthly_mxn')); assert.ok(!w.document.body.textContent.includes('medsync_pro'));
    assert.ok(button('Continuar a MedSync')); assert.equal(button('Continuar gratis'), undefined);
    assert.ok(screen.nextBillingLabel); screen.subscription.cancelAtPeriodEnd = true; await flush(); assert.equal(screen.nextBillingLabel, ''); screen.subscription.cancelAtPeriodEnd = false; screen.subscription.nextBillingTime = '2098-01-01'; assert.equal(screen.nextBillingLabel, '');
    screen.catalog = null; assert.equal(screen.paidPlanName, 'contratado', 'An unavailable catalog never invents a plan name');
    activationState = { ...activationState, subscriptionStatus: 'active', welcomePending: false }; button('Continuar a MedSync').click(); await flush(); assert.equal(navigation.at(-1).name, 'home'); assert.equal(screen.business.plan, 'pro');

    projectionUnavailable = true; await mount({ attempt_id: key });
    assert.equal(screen.confirmed, false); assert.equal(screen.accessConfirmed, false); assert.equal(screen.checkoutUrl, ''); assert.match(w.document.body.textContent, /servicio de pagos no está disponible/);
    projectionUnavailable = false; sessionUnavailable = true; await screen.consult(); await flush();
    assert.equal(screen.confirmed, true); assert.equal(screen.accessConfirmed, false); assert.equal(w.document.querySelector('.payment-success-continue'), null);
    sessionUnavailable = false; await screen.consult(); await flush(); assert.equal(screen.accessConfirmed, true); assert.equal(writes().length, reloadWrites);
    const normalSavedSnapshot = api.savedSnapshot;
    api.savedSnapshot = async () => ({ ...webhookSnapshot('2'), organizationId: 'other-business' }); await screen.consult(); await flush(); assert.equal(screen.confirmed, false); api.savedSnapshot = normalSavedSnapshot;

    // Only explicit updates read; Retry-After prevents overlapping or premature reads.
    paid = false; currentReceipt = json(pending); getters['CORE/AUTH/getBusiness'] = { id_business: 'business-1', name: 'Clínica', subscriptionStatus: 'trial' };
    await mount({ attempt_id: key });
    const normalAttempt = api.attempt; let releaseRead, busySignal;
    api.attempt = async (_id, signal) => { apiCalls.push(['deferred-get']); busySignal = signal; return new Promise(resolve => { releaseRead = resolve; }); };
    const manual = screen.consult(); await flush(); assert.equal(screen.busy, true); w.dispatchEvent(new w.Event('focus')); await screen.consult(); assert.equal(apiCalls.filter(call => call[0] === 'deferred-get').length, 1);
    releaseRead(json(pending)); await manual; assert.equal(screen.busy, false); assert.equal(pollTimers.size, 0); api.attempt = normalAttempt;

    // The committed preparation webhook exposes a ready popup without GET polling or payment evidence.
    currentReceipt = json(pending); paid = false; await mount({ attempt_id: key });
    const preparationReads = apiCalls.filter(call => call[0] === 'attempt').length;
    currentReceipt = { ...ready, paypalApproval: { kind: 'subscription', subscriptionId: 'I-SYNTHETIC123', clientId: 'public-app', environment: 'sandbox' } };
    const preparedSnapshot = { ...webhookSnapshot('8'), subscription: { ...subscription, status: 'pending' }, license: { ...license, active: false, subscriptionId: null, planCode: null, licenseStatus: 'revoked', billing: {} } };
    screen.applySubscriptionSnapshot({ ...preparedSnapshot, organizationId: 'wrong-business' }); screen.applySubscriptionSnapshot(preparedSnapshot); screen.applySubscriptionSnapshot(preparedSnapshot); await flush();
    assert.equal(apiCalls.filter(call => call[0] === 'attempt').length, preparationReads + 1); assert.equal(screen.attempt.status, 'ready'); assert.equal(screen.paypalReady, true); assert.equal(screen.confirmed, false); assert.equal(pollTimers.size, 0); assert.ok(paypalButton());

    // Loading an already committed preparation snapshot closes the initial receipt/read race.
    const savedPreparation = api.savedSnapshot, readPreparation = api.attempt; let receiptReads = 0;
    api.savedSnapshot = async () => preparedSnapshot;
    api.attempt = async id => { receiptReads++; return json({ ...(receiptReads === 1 ? pending : currentReceipt), attemptId: id }); };
    await mount({ attempt_id: key }); assert.equal(receiptReads, 2); assert.equal(screen.attempt.status, 'ready'); assert.equal(screen.paypalReady, true); assert.equal(screen.confirmed, false);
    screen.applySubscriptionSnapshot(preparedSnapshot); await flush(); assert.equal(receiptReads, 2);
    api.savedSnapshot = savedPreparation; api.attempt = readPreparation;

    // A payment webhook can recover one stale pending receipt, without polling or another purchase.
    currentReceipt = json(pending); paid = false; await mount({ attempt_id: key });
    const beforeRecovery = apiCalls.filter(call => call[0] === 'attempt').length, recoveryWrites = writes().length;
    currentReceipt = json(ready); paid = true;
    screen.applySubscriptionSnapshot({ ...webhookSnapshot('9'), organizationId: 'other-business' }); await flush();
    assert.equal(apiCalls.filter(call => call[0] === 'attempt').length, beforeRecovery);
    screen.applySubscriptionSnapshot(webhookSnapshot('10')); screen.applySubscriptionSnapshot(webhookSnapshot('10')); await flush();
    assert.equal(apiCalls.filter(call => call[0] === 'attempt').length, beforeRecovery + 1); assert.equal(screen.accessConfirmed, true); assert.equal(writes().length, recoveryWrites); assert.equal(pollTimers.size, 0);
    currentReceipt = json(pending); paid = false; await mount({ attempt_id: key });
    let releaseMetadata;
    api.attempt = async () => new Promise(resolve => { releaseMetadata = resolve; });
    screen.applySubscriptionSnapshot(webhookSnapshot('11')); await flush();
    screen.applySubscriptionSnapshot({ ...webhookSnapshot('12'), subscription: { ...subscription, status: 'cancelled' }, license: { ...license, active: false, licenseStatus: 'revoked' } });
    releaseMetadata(json({ ...ready, paypalApproval: currentReceipt.paypalApproval || { kind: 'subscription', subscriptionId: 'I-SYNTHETIC123', clientId: 'public-app', environment: 'sandbox' } })); await flush(); assert.equal(screen.snapshotRevision, '12'); assert.equal(screen.confirmed, false); assert.equal(screen.license.licenseStatus, 'revoked'); assert.equal(screen.checkoutUrl, ''); assert.equal(screen.approval, null); assert.equal(screen.paypalReady, false); assert.equal(screen.statusTitle, 'Esta solicitud ya no está vigente'); screen.redirectIntent = key; screen.redirectDone = false; const blockedRedirects = redirects.length; assert.equal(screen.redirectReady(), false); assert.equal(redirects.length, blockedRedirects); screen.redirectIntent = ''; assert.equal(paypalButton(), undefined); assert.equal(button('Continuar en el sitio de PayPal'), undefined);
    api.attempt = normalAttempt;

    // A popup only approves the server-created subscription. Its callbacks cannot activate access.
    const popupReceipt = { ...ready, paypalApproval: { kind: 'subscription', subscriptionId: 'I-SYNTHETIC123', clientId: 'public-client-12345', environment: 'sandbox' } };
    currentReceipt = popupReceipt; await mount(); await choose(); await agree();
    const beforePopupWrites = writes().length, beforePopupRedirects = redirects.length;
    button('Continuar con PayPal').click(); await flush();
    assert.equal(redirects.length, beforePopupRedirects + 1); assert.equal(screen.paypalOpening, true); assert.equal(screen.paypalReady, false);
    assert.equal(reservedWindows.at(-1).id, key);
    reservedWindows.at(-1).callbacks.onClose(); await flush(); assert.equal(screen.paypalReady, true); assert.ok(paypalButton()); assert.equal(button('Continuar a MedSync'), undefined); assert.equal(button('Continuar en el sitio de PayPal'), undefined);
    assert.equal(screen.paymentKicker, ''); assert.equal(w.document.querySelector('.payment-kicker'), null); assert.equal(screen.paymentHeading, 'Para continuar, completa tu pago en PayPal');
    assert.equal(screen.paymentCopy, 'Haz clic en el botón de PayPal para revisar y confirmar la suscripción de ' + screen.businessName + '.'); assert.ok(w.document.querySelector('.payment-status-copy').textContent.includes(screen.businessName)); assert.equal(w.document.querySelector('.payment-success-business'), null); assert.ok(!w.document.body.textContent.includes('Método de pago: PayPal'));
    assert.ok(!w.document.body.textContent.includes('Tu pago está listo'));
    assert.equal(paypalButton().getAttribute('type'), 'subscribe'); assert.ok(paypalButton().classList.contains('paypal-gold')); assert.equal(paypalButton().disabled, false);
    const beforeLeavingWrites = writes().length; assert.ok(closeButton()); assert.equal(closeButton().disabled, false); assert.equal(closeButton().getAttribute('aria-label'), 'Cerrar y volver a MedSync'); assert.ok(closeButton().querySelector('.mdi-close'));
    closeButton().click(); await flush(); assert.equal(navigation.at(-1).name, 'home'); assert.equal(screen.attemptId, key); assert.equal(writes().length, beforeLeavingWrites, 'Leaving never creates, retries, verifies or cancels payment');
    const beforeOpenReads = apiCalls.length; paypalButton().click(); await flush(); assert.equal(paypalButton(), undefined); screen.openPayPal();
    assert.equal(popupCalls.length, 1); assert.deepEqual(json(popupCalls[0][0]), { presentationMode: 'popup' }); assert.deepEqual(json(await popupCalls[0][1]), { subscriptionId: 'I-SYNTHETIC123' });
    assert.equal(apiCalls.length, beforeOpenReads); assert.equal(screen.confirmed, false); assert.equal(writes().length, beforePopupWrites + 2);
    paypalCallbacks.onApprove({ subscriptionId: 'I-WRONG' }); await flush(); assert.equal(screen.confirmed, false); assert.equal(screen.paypalApproved, false);
    paypalCallbacks.onError({ message: 'private-provider-detail' }); await flush(); assert.equal(screen.paypalOpening, false); assert.ok(!w.document.body.textContent.includes('private-provider-detail'));
    screen.openPayPal(); await flush(); paypalCallbacks.onCancel(); await flush(); assert.equal(screen.paypalOpening, false); assert.equal(screen.attemptId, key); assert.ok(paypalButton());
    popupFailure = true; paypalButton().click(); await flush(); assert.equal(screen.paypalOpening, false); assert.match(screen.paypalNotice, /No pudimos abrir/); popupFailure = false;
    assert.equal(button('Continuar en el sitio de PayPal'), undefined); assert.equal(button('Continuar a MedSync'), undefined); assert.equal(redirects.length, beforePopupRedirects + 1); assert.equal(writes().length, beforePopupWrites + 2);
    const callbackReads = apiCalls.length; paypalCallbacks.onApprove({ subscriptionId: 'I-SYNTHETIC123' }); await flush();
    assert.equal(screen.confirmed, false); assert.equal(screen.accessConfirmed, false); assert.equal(apiCalls.length, callbackReads + 2); assert.equal(screen.statusTitle, 'Confirmando tu pago'); assert.equal(screen.paymentPhase, 'pending'); assert.equal(w.document.querySelector('.payment-progress .complete'), null); assert.equal(paypalButton(), undefined); assert.ok(!w.document.body.textContent.includes('Total pagado'));
    paid = true; screen.applySubscriptionSnapshot(webhookSnapshot('3')); await flush(); assert.equal(screen.accessConfirmed, true); assert.equal(apiCalls.filter(call => call[0] === 'verify').length, 0);
    // A terminal webhook for the same subscription closes an already opened SDK session locally.
    paid = false; await mount({ attempt_id: key }); paypalButton().click(); await flush();
    const callbacksBeforeRefund = paypalCallbacks, beforeRefundCalls = apiCalls.length;
    screen.applySubscriptionSnapshot({ ...webhookSnapshot('4'), subscription: { ...subscription, status: 'cancelled' }, license: { ...license, active: false, licenseStatus: 'revoked' } });
    callbacksBeforeRefund.onApprove({ subscriptionId: 'I-SYNTHETIC123' }); callbacksBeforeRefund.onCancel(); callbacksBeforeRefund.onError({ message: 'stale' }); await flush();
    assert.equal(screen.checkoutUrl, ''); assert.equal(screen.approval, null); assert.equal(screen.paypalReady, false); assert.equal(screen.paypalApproved, false); assert.equal(screen.paypalNotice, ''); assert.equal(screen.confirmed, false); assert.equal(apiCalls.length, beforeRefundCalls); assert.match(w.document.body.textContent, /solicitud ya no está vigente/); assert.ok(button('Continuar a MedSync'));
    // A different old subscription does not disable this new subscription's approval.
    screen.applySubscriptionSnapshot({ ...webhookSnapshot('5'), subscription: { ...subscription, id: 'older-subscription', status: 'cancelled' }, license: { ...license, active: false, subscriptionId: 'older-subscription', licenseStatus: 'revoked' } });
    assert.equal(screen.checkoutUrl, ready.checkoutUrl); assert.ok(screen.approval);
    paid = false; sdkFailure = true; await mount({ attempt_id: key }); assert.equal(screen.paypalReady, false); assert.equal(button('Continuar en el sitio de PayPal'), undefined); assert.equal(button('Continuar a MedSync'), undefined); assert.ok(button('Volver a cargar PayPal')); assert.ok(closeButton()); assert.equal(closeButton().disabled, false); assert.equal(paypalButton(), undefined); const beforeSdkRetryWrites = writes().length, beforeSdkRetryRedirects = redirects.length; sdkFailure = false; button('Volver a cargar PayPal').click(); await flush(); assert.equal(screen.paypalReady, true); assert.ok(paypalButton()); assert.equal(writes().length, beforeSdkRetryWrites); assert.equal(redirects.length, beforeSdkRetryRedirects);
    const staleCallbacks = paypalCallbacks; await mount(); const staleCallbackReads = apiCalls.length; staleCallbacks.onApprove({ subscriptionId: 'I-SYNTHETIC123' }); assert.equal(screen.paypalApproved, false); assert.equal(apiCalls.length, staleCallbackReads);
    currentReceipt = json(ready); previousRedirects = redirects.length; getters['CORE/AUTH/getBusiness'] = { id_business: 'business-1', name: 'Clínica', subscriptionStatus: 'trial', trialEndsAt: '2099-01-01T00:00:00Z' };

    // Route/actor changes invalidate old receipts, modal and redirect intent immediately.
    currentReceipt = json(pending); await mount({ attempt_id: key }); let staleRelease, staleSignal;
    api.attempt = async (id, signal) => id === key ? new Promise(resolve => { staleRelease = resolve; staleSignal = signal; }) : json({ ...pending, attemptId: id });
    const stale = screen.consult(); await flush(); screen.redirectIntent = key; route.query = { attempt_id: other }; await flush();
    assert.equal(staleSignal.aborted, true); assert.equal(screen.redirectIntent, ''); assert.equal(screen.attempt.attemptId, other);
    staleRelease(json(ready)); await stale; assert.equal(screen.attempt.attemptId, other); assert.equal(redirects.length, previousRedirects);
    api.attempt = normalAttempt; await mount(); await choose(); button('Condiciones de contratación').click(); await flush(50);
    getters['CORE/AUTH/getUser'] = { id_login: 'user-2', id_session: 'session-2' }; await flush(); assert.equal(screen.legalOpen, false); assert.equal(screen.selection, null);
    getters['CORE/AUTH/getUser'] = { id_login: 'user-1', id_session: 'session-1' }; await flush(); await choose(); button('Condiciones de contratación').click(); await flush(50);
    screen.prepared.expiresAt = '2000-01-01'; screen.now = Date.now(); await flush(); assert.equal(screen.legalOpen, false); assert.equal(screen.canCreate, false);
    await screen.refreshLegal(); assert.equal(screen.documents.length, 2); assert.equal(w.document.querySelector('input[type=checkbox]').checked, false);

    // One click reserves the window before asynchronous work, including a delayed provider receipt.
    paid = false; currentReceipt = json(pending); nextId = key;
    await mount(); await choose(); await agree();
    reserveBlocked = true; const blockedWrites = writes().length;
    button('Continuar con PayPal').click(); await flush();
    assert.equal(writes().length, blockedWrites); assert.match(screen.error, /ventanas emergentes/); reserveBlocked = false;
    button('Continuar con PayPal').click();
    const delayedWindow = reservedWindows.at(-1), delayedOpens = redirects.length;
    assert.ok(delayedWindow, 'Reserve synchronously within the original click'); await flush();
    assert.equal(screen.attempt.status, 'pending'); assert.equal(delayedWindow.closed, false);
    currentReceipt = json(ready);
    screen.applySubscriptionSnapshot({ ...webhookSnapshot('20'), subscription: { ...subscription, status: 'pending' }, license: { ...license, active: false, billing: {} } }); await flush();
    assert.equal(redirects.length, delayedOpens + 1); assert.equal(delayedWindow.id, key);
    assert.equal(paypalButton(), undefined, 'An opened window needs no second payment click');
    const centralLicense = api.license, savedLocal = api.savedSnapshot;
    let committed = false;
    api.license = async () => { apiCalls.push(['license']); committed = true; return json(license); };
    api.savedSnapshot = async () => { apiCalls.push(['snapshot']); return committed ? webhookSnapshot('21') : null; };
    paid = true; const returnWrites = writes().length;
    delayedWindow.callbacks.onReturn({ attemptId: key, result: 'approved' }); await flush();
    assert.equal(screen.accessConfirmed, true, 'Returning reconciles a paid central record without a webhook notice');
    assert.equal(pollTimers.size, 0); assert.equal(writes().length, returnWrites);
    api.license = centralLicense; api.savedSnapshot = savedLocal;

    // Delayed confirmation retries are bounded, serialized and read-only; cancel/unmount stop them.
    paid = false; currentReceipt = json(ready); await mount({ attempt_id: key, result: 'approved' });
    const boundedRecoveryWrites = writes().length, recoveryStart = apiCalls.filter(call => call[0] === 'license').length;
    for (let i = 0; i < 6; i++) {
      assert.equal(pollTimers.size, 1); const [id, timer] = [...pollTimers][0]; pollTimers.delete(id); timer.fn(); await flush();
    }
    assert.equal(screen.confirmationReads, 6); assert.equal(pollTimers.size, 0);
    assert.equal(apiCalls.filter(call => call[0] === 'license').length, recoveryStart + 6);
    assert.equal(writes().length, boundedRecoveryWrites); assert.equal(screen.confirmed, false);
    await mount({ attempt_id: key, result: 'cancelled' }); assert.equal(pollTimers.size, 0);
    button('Continuar con PayPal').click(); await flush();
    const cancelWindow = reservedWindows.at(-1), cancelReads = apiCalls.length;
    cancelWindow.callbacks.onReturn({ attemptId: key, result: 'cancelled' }); await flush();
    assert.equal(apiCalls.length, cancelReads); assert.equal(pollTimers.size, 0); assert.equal(screen.paypalApproved, false);
    await mount({ attempt_id: key, result: 'approved' }); assert.equal(pollTimers.size, 1);
    const [staleTimerId, staleTimer] = [...pollTimers][0];
    await mount(); const staleRecoveryReads = apiCalls.length; staleTimer.fn(); await flush();
    assert.equal(pollTimers.has(staleTimerId), false); assert.equal(apiCalls.length, staleRecoveryReads);
    previousRedirects = redirects.length;
    getters['CORE/AUTH/getBusiness'] = { id_business: 'business-1', name: 'Clínica', subscriptionStatus: 'trial', trialEndsAt: '2099-01-01T00:00:00Z' }; await flush();

    // Lost POST/404 reconstruction remains explicit and uses exactly the same UUID.
    currentReceipt = json(ready); createFailure = { code: 'NETWORK_ERROR' }; nextId = key;
    await mount(); await choose(); await agree(); button('Continuar con PayPal').click(); await flush(); assert.equal(route.query.attempt_id, key); assert.ok(screen.error);
    api.attempt = async () => { throw { status: 404, code: 'PAYMENT_NOT_FOUND' }; }; await screen.consult(); await flush(); assert.equal(screen.missingAttempt, true);
    const beforeRebuild = writes().length; nextId = other; button('Recuperar solicitud').click(); await flush(); assert.equal(writes().length, beforeRebuild); assert.equal(screen.legalKey, other); assert.equal(screen.checkoutKey, key);
    await choose(); assert.equal(screen.canCreate, false); await agree(); createFailure = { status: 409, code: 'PAYMENT_CONFLICT' };
    api.attempt = async () => ({ ...ready, planCode: 'original-plan' }); button('Continuar con PayPal').click(); await flush();
    assert.equal(route.query.attempt_id, key); assert.equal(screen.attempt.planCode, 'original-plan'); assert.equal(redirects.length, previousRedirects); assert.equal(apiCalls.filter(call => call[0] === 'create').at(-1)[1].idempotencyKey, key);
    createFailure = null; api.attempt = normalAttempt;

    // 401 must revalidate stale auth before login resume; 503 preserves session.
    api.attempt = async () => { throw { status: 401, code: 'AUTH_REQUIRED' }; }; await mount({ attempt_id: key }); assert.equal(screen.authRequired, true);
    w.Vue.prototype.$store.dispatch = async () => ({ success: false, status: 503 }); const navBefore = navigation.length; await screen.resumeLogin(); assert.equal(navigation.length, navBefore); assert.equal(getters['CORE/AUTH/isAuthorized'], true);
    w.Vue.prototype.$store.dispatch = async () => { getters['CORE/AUTH/isAuthorized'] = false; return { success: true, data: { authenticated: false } }; }; await screen.resumeLogin(); assert.deepEqual(navigation.at(-1), { name: 'login', query: { checkout_attempt: key } });
    getters['CORE/AUTH/isAuthorized'] = true; w.Vue.prototype.$store.dispatch = refreshSession; api.attempt = normalAttempt;

    // Leaving a pending checkout preserves setup without choosing the trial welcome.
    activationState = { ...activationState, subscriptionStatus: 'trial', trialEndsAt: '2099-01-01T00:00:00Z', welcomePending: true, nextAction: 'setup_summary', destination: 'summary' };
    currentReceipt = json(ready); await mount({ attempt_id: key, result: 'cancelled' }); const freeWrites = writes().length;
    assert.ok(button('Continuar a MedSync')); button('Continuar a MedSync').click(); await flush();
    assert.deepEqual(navigation.at(-1), { name: 'admin', query: { section: 'summary' } }); assert.equal(activationState.trialEndsAt, '2099-01-01T00:00:00Z'); assert.equal(writes().length, freeWrites); assert.equal(registrationCalls.filter(call => call === 'ack').length, 1);
    assert.equal(welcomeChoices.at(-1), false, 'Pending checkout exit must not request the trial welcome');
    activationState = { ...activationState, welcomePending: true, nextAction: 'setup_summary', destination: 'summary' };
    await mount(); assert.ok(button('Continuar gratis'));
    button('Continuar gratis').click(); await flush();
    assert.equal(welcomeChoices.at(-1), true, 'Only the explicit free selector requests a trial welcome');
    assert.deepEqual(navigation.at(-1), { name: 'admin', query: { section: 'summary' } });
    assert.equal(activationState.trialEndsAt, '2099-01-01T00:00:00Z'); assert.equal(writes().length, freeWrites);
    const acknowledgedChoices = welcomeChoices.length;
    await screen.continueAccount(false); await flush();
    assert.equal(welcomeChoices.length, acknowledgedChoices, 'An already acknowledged welcome is never sent again');
    const activationNormal = registrationApi.activation; registrationApi.activation = async () => { throw { status: 403 }; }; await mount(); button('Volver a MedSync').click(); await flush(); assert.equal(navigation.at(-1).name, 'home'); registrationApi.activation = activationNormal;
    getters['CORE/AUTH/getRole'] = 'reception'; await flush(); const denied = apiCalls.length; await mount(); assert.equal(apiCalls.length, denied); assert.match(w.document.body.textContent, /Sólo una cuenta administradora/);
    getters['CORE/AUTH/getRole'] = 'admin'; await flush(); const plansNormal = api.plans; api.plans = async () => ({ ...offers, checkoutAvailable: false }); await mount(); assert.equal(w.document.querySelector('.catalog-select'), null); api.plans = plansNormal;

    api.attempt = async (_id, signal) => { busySignal = signal; return new Promise(resolve => { releaseRead = resolve; }); }; route.query = { attempt_id: key }; await flush(); const destroyedScreen = screen;
    app.$destroy(); app = null; assert.equal(busySignal.aborted, true); assert.equal(pollTimers.size, 0); releaseRead(json(ready)); await flush(); assert.equal(destroyedScreen.attempt, null);
    assert.deepEqual(errors, []);
  } finally { if (app) app.$destroy(); w.close(); }

  // Use the actual router guard for D2 and legacy: pending stays isolated,
  // expired trials can open payments, other roles cannot, and login resumes UUID only.
  const registrationForRoutes = moduleWith('src/utils/registration.js');
  let cookie = true, authorized = true, role = 'admin', accountPending = false, restricted = true;
  const tenant = () => accountPending ? { allowed: false, code: 'TENANT_NOT_OPERATIONAL', reasonCode: 'ACCOUNT_PENDING_ACTIVATION' } : restricted ? { allowed: false, code: 'TENANT_NOT_OPERATIONAL', reasonCode: 'TRIAL_EXPIRED' } : { allowed: true };
  const routerStore = { getters: new Proxy({}, { get: (_, name) => ({ 'CORE/AUTH/isAuthorized': authorized, 'CORE/AUTH/getRole': role, 'CORE/AUTH/getUser': { rol: role }, 'CORE/AUTH/getTenantOperational': tenant(), 'CORE/AUTH/getPermissions': [], 'CORE/AUTH/getBusiness': { subscriptionStatus: accountPending ? 'pending_activation' : 'trial' } })[name] }), state: { CORE: { AUTH: { permissions: [], role } } }, dispatch: async () => {} };
  class Router { constructor() {} beforeEach(fn) { this.guard = fn; } afterEach() {} }
  const sandbox = { module: { exports: {} }, ...rules, isPendingActivation: registrationForRoutes.isPendingActivation, Vue: { use() {}, prototype: { $session: { get: name => name === 'token' ? authorized ? 'token' : null : name === 'tenantOperational' ? tenant() : null } } }, VueRouter: Router, store: routerStore, isD2AuthMode: () => cookie, process: { env: {} }, getSessionPermissions: () => [], hasPermission: () => true, hasAnyPermission: () => true, canAccessSettings: () => true, canAccessPulse: () => true, ...Object.fromEntries(['dashboard', 'superAdmin', 'admin', 'auth', 'patient', 'error', 'legal', 'business', 'prescription', 'publicSignature', 'licensingDemo', 'help'].map(name => [name, []])) };
  vm.runInNewContext(read('src/router/index.js').replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'module.exports ='), sandbox);
  const guarded = sandbox.module.exports;
  const navigate = (name, query = {}) => new Promise(resolve => guarded.guard({ name, query, matched: [{ meta: { requireAuth: name !== 'login', allowTenantRestricted: ['accountPlans', 'accountPlanChange'].includes(name), paymentsAccess: ['accountPlans', 'accountPlanChange'].includes(name) } }] }, {}, resolve));
  for (const mode of [true, false]) {
    cookie = mode; accountPending = true; assert.equal((await navigate('accountPlans', { attempt_id: key })).name, 'accountActivation');
    accountPending = false; assert.equal(await navigate('accountPlans', { attempt_id: key }), undefined);
    role = 'reception'; assert.equal((await navigate('accountPlans')).name, 'home'); role = 'admin';
    authorized = false; assert.deepEqual(json(await navigate('accountPlans', { attempt_id: key })), { name: 'login', query: { checkout_attempt: key } }); authorized = true;
    assert.deepEqual(json(await navigate('login', { checkout_attempt: key })), { name: 'accountPlans', query: { attempt_id: key } });
    assert.notEqual((await navigate('login', { checkout_attempt: 'https://evil.test' })).name, 'accountPlans');
    assert.equal(await navigate('accountPlanChange', { attempt_id: key }), undefined);
    authorized = false; assert.deepEqual(json(await navigate('accountPlanChange', { attempt_id: key })), { name: 'login', query: { checkout_attempt: key, checkout_operation: 'change_plan' } }); authorized = true;
    assert.deepEqual(json(await navigate('login', { checkout_attempt: key, checkout_operation: 'change_plan' })), { name: 'accountPlanChange', query: { attempt_id: key } });
    role = 'reception'; assert.equal((await navigate('accountPlanChange', { attempt_id: key })).name, 'home'); role = 'admin';
  }
  console.log('PASS MedSync checkout UX: pending/applying/active, single-click popup and bounded confirmation recovery, proof-only totals and catalog prices, URL-selected basic/pro offers retained during conditions outage without writes, unknown URL prices rejected, real Vue2/Vuetify/DOMPurify modal, registration match/new checkout consent, single-click reserved popup, same-attempt resume after exit, rejected/processing duplicates and concurrent tabs, buyer isolation and stale discovery, single SDK popup action with no redirect button, webhook snapshots and bounded read-only recovery, completed payment proof, paid local session recovery, 404 same-key/409 original, trial->setup, stale route/actor and D2/legacy routing. No network/DB/PayPal calls.');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
