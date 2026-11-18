// PROTOTYPE ONLY — NC1-CLUES-UX (Claude, 2026-11-18). Real admin shell, real store, real route /admin?section=identity.
// Every request goes to a stateful SYNTHETIC transport. Nothing reaches a backend; no catalog row here is official.
// Scenarios: ?scenario=verified (default) | empty | manual | multi | inactive | load-error
// Next write fails once: ?fail=409 | 403 | network | network-create | clues | business-409
// Theme: ?theme=night. catalogAttributes is the read-only DTO addition proposed for CAT-O1 (not in backend yet).
import Vue from 'vue';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import store from '../../../src/store';
import types from '../../../src/store/modules/common/mutation-types';
import modules from '../../../src/store/modules/common/module-types';
import Admin from '../../../src/core/layouts/admin.vue';
import adminRoutes from '../../../src/router/routes/admin';
import MedSyncBrand from '../../../src/components/MedSyncBrand.vue';
import registerGlobalComponents from '../../../src/plugins/global-components';
import { DACore } from '../../../src/services/config/axios.context';
import { applyTheme, DEFAULT_THEME } from '../../../src/plugins/theme';
import VueSession from 'vue-session';
import VueSignature from 'vue-signature-pad';
import VueSweetalert2 from 'vue-sweetalert2';
import '../../../src/libs/filters';
import '../../../src/libs/directive';
import '../../../src/assets/tailwind.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import '@mdi/font/css/materialdesignicons.css';

Vue.use(Router); Vue.use(VueSession, { persist: false }); Vue.use(VueSignature); Vue.use(VueSweetalert2, { buttonsStyling: false });
Vue.component('medsync-brand', MedSyncBrand); Vue.directive('viewer', {});
registerGlobalComponents(Vue);

const params = new URLSearchParams(window.location.search);
const scenario = params.get('scenario') || 'verified';
let failNext = params.get('fail');
const clone = v => JSON.parse(JSON.stringify(v == null ? null : v));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = []; window.qaLog = log; window.qaUnknown = [];

// Synthetic catalog, shaped like ESTABLECIMIENTO_DE_SALUD_SIS (8 columns). Codes start with QA and are not real CLUES.
const RELEASE = 'sis.establishments-qa';
const SOURCE = { releaseId: RELEASE, sourceVersion: 'QA sintético · no oficial (forma de ESTABLECIMIENTO_DE_SALUD_SIS)', sourceUrl: null, validFrom: '2026-11-17', validityBasis: 'download_date' };
const CATALOG = {
  QASMP000101: { clues: 'QASMP000101', nombre_unidad: 'CONSULTORIO DENTAL SONRISA CLARA S A DE C V', institucion: 'SMP', tipo_unidad: '1', tip_abreviacion: 'P', sub_abreviacion: '99', id_entidad_federativa: '09', en_operacion: '1' },
  QASMP000202: { clues: 'QASMP000202', nombre_unidad: 'SONRISA CLARA SUCURSAL NORTE', institucion: 'SMP', tipo_unidad: '1', tip_abreviacion: 'P', sub_abreviacion: '99', id_entidad_federativa: '15', en_operacion: '1' },
  QASSA000303: { clues: 'QASSA000303', nombre_unidad: 'CENTRO DE SALUD SINTÉTICO QA ÁLVARO OBREGÓN', institucion: 'SSA', tipo_unidad: '1', tip_abreviacion: 'E', sub_abreviacion: '99', id_entidad_federativa: '09', en_operacion: '1' }
};
const ref = code => ({ family: 'sis.establishments', releaseId: RELEASE, code });
const unit = (id, displayName, active, cluesRef, extra = {}) => ({ id, displayName, active, cluesRef, validFrom: null, validTo: null, revision: 3, updatedAt: '2026-11-18T10:20:00Z', ...extra });
const QA_INACTIVE = unit('qa-inactive', 'QA Catálogos 20261118 — no usar para atención', false, ref('QASSA000303'), { revision: 4 });
const SCENARIOS = {
  verified: [unit('u-centro', 'Sonrisa Clara Centro', true, ref('QASMP000101'))],
  empty: [],
  manual: [unit('u-centro', 'Sonrisa Clara Centro', true, { family: 'sis.establishments', code: 'QAPRV000999' })],
  multi: [unit('u-centro', 'Sonrisa Clara Centro', true, ref('QASMP000101'), { validFrom: '2024-02-01' }), unit('u-norte', 'Sonrisa Clara Norte', true, ref('QASMP000202')), QA_INACTIVE],
  inactive: [QA_INACTIVE],
  'load-error': []
};
const state = {
  business: { id_business: 'qa-clinic', name: 'Sonrisa Clara Dental', legalName: 'Sonrisa Clara Servicios Odontológicos, S.A. de C.V.', slug: 'sonrisa-clara-qa', email: 'contacto@ejemplo.invalid', phone: '5500000000',
    address: 'Av. Sintética 123, Col. Prueba\nÁlvaro Obregón, Ciudad de México, CP 01000', logoUrl: '', status: 'active', subscriptionStatus: 'active', plan: 'pro' },
  units: clone(SCENARIOS[scenario] || SCENARIOS.verified), nextId: 1
};
const reply = (data, extra = {}) => ({ success: true, status: 200, data, ...extra });
const failure = (status, message, data = null) => ({ success: false, status, message, data });
function view(u) {
  const r = u.cluesRef, entry = r && r.releaseId && CATALOG[r.code];
  const checks = r ? [{ field: 'cluesRef', ...(r.releaseId ? (entry ? { result: 'valid', code: null, label: entry.nombre_unidad, source: SOURCE } : { result: 'invalid', code: 'CLUES_NOT_IN_SIS_RELEASE' }) : { result: 'unverified', code: 'CATALOG_REF_CANDIDATE' }) }] : [];
  return { ...clone(u), contractVersion: 'nc1.identity.v1.1', qualityIssues: [], catalogChecks: checks, catalogValidation: checks.length && checks.every(c => c.result === 'valid') ? 'verified' : 'unverified',
    catalogAttributes: entry ? clone(entry) : null };
}
function failWrite(kind) {
  const f = failNext; if (!f) return null;
  if (kind === 'business' ? f !== 'business-409' : f === 'business-409') return null;
  failNext = null;
  if (f === '409' || f === 'business-409') return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' });
  if (f === '403') return failure(403, 'Acceso no autorizado.', { code: 'PERMISSION_DENIED' });
  if (f === 'clues') return failure(400, 'Revisa el campo de identidad: cluesRef', { code: 'CLUES_NOT_IN_SIS_RELEASE', field: 'cluesRef' });
  return 'network';
}

async function transport(method, url, payload) {
  const path = String(url).replace(/^\/+/, '').replace(/^api\//, '').split('?')[0];
  if (method !== 'get') log.push({ method, path, payload: clone(payload) });
  if (path === 'identity/catalogs/sis.establishments') {
    await wait(150); const q = (payload || {}).params || {};
    if (q.code) return reply({ check: CATALOG[q.code] && q.releaseId === RELEASE ? { result: 'valid', code: null, label: CATALOG[q.code].nombre_unidad, source: SOURCE } : { result: 'invalid', code: 'CLUES_NOT_IN_SIS_RELEASE' } });
    const text = String(q.q || '').toLowerCase();
    return reply({ available: true, source: SOURCE, hasMore: false, items: Object.values(CATALOG).filter(e => !text || (e.clues + ' ' + e.nombre_unidad).toLowerCase().includes(text)).map(e => ({ ref: ref(e.clues), label: e.nombre_unidad })) });
  }
  if (path === 'identity/establishments') {
    if (method === 'get') { await wait(250); return scenario === 'load-error' ? failure(503, 'No se pudieron consultar los establecimientos.') : reply(state.units.map(u => ({ id: u.id, displayName: u.displayName, active: u.active }))); }
    await wait(500);
    const f = failWrite('unit');
    if (f === 'network' && params.get('fail') === 'network-create') { state.units.push({ ...clone(payload.identity), id: 'u-new-' + state.nextId++, revision: 1, updatedAt: '2026-11-18T12:00:00Z' }); throw new Error('timeout after commit'); }
    if (f === 'network') throw new Error('network');
    if (f) return f;
    if (payload.expectedRevision !== 0) return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT' });
    const u = { ...clone(payload.identity), id: 'u-new-' + state.nextId++, revision: 1, updatedAt: '2026-11-18T12:00:00Z' };
    state.units.push(u); return reply(view(u));
  }
  const m = path.match(/^identity\/establishments\/(.+)$/);
  if (m) {
    const u = state.units.find(x => x.id === decodeURIComponent(m[1]));
    if (!u) return failure(404, 'No encontrado', { code: 'IDENTITY_NOT_FOUND' });
    if (method === 'get') { await wait(120); return reply(view(u)); }
    await wait(500);
    const f = failWrite('unit');
    if (f === 'network') throw new Error('network');
    if (f) { if (f.status === 409) { u.revision++; u.displayName = u.displayName + ' (editado por otra persona)'; } return f; }
    if (payload.expectedRevision !== u.revision) return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT' });
    Object.assign(u, clone(payload.identity), { revision: u.revision + 1, updatedAt: '2026-11-18T12:30:00Z' });
    return reply(view(u));
  }
  if (/^business\/current$/.test(path)) {
    if (method === 'get') { await wait(200); return reply(clone(state.business)); }
    await wait(400); const f = failWrite('business');
    if (f && f.status) return failure(409, 'Otra persona actualizó el consultorio.');
    Object.assign(state.business, clone(payload)); return reply(clone(state.business));
  }
  if (/saas-legal\/notice/.test(path)) return reply({ pending_count: 0, business_pending: false, central_sync_pending: false });
  if (/business\/preparation/.test(path)) return reply({ items: [] });
  window.qaUnknown.push(method + ' ' + path);
  return reply(/list|all|catalog|family|templates|doctors|modules|history|notes|dates|permissions|roles/i.test(path) ? [] : null);
}
['get', 'post', 'put', 'patch', 'delete'].forEach(method => { DACore[method] = (url, payload) => transport(method, url, payload); });

store.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, { authenticated: true, sessionState: 'active', accessExpiresAt: 'later',
  user: { id_login: 'qa-admin', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'admin', name: 'Valeria QA' },
  business: { id_business: 'qa-clinic', name: 'Sonrisa Clara Dental' }, role: 'admin',
  permissions: ['px.all', 'px.new', 'admin.config', 'admin.users'] });

const Empty = { render: h => h('span') };
const router = new Router({ mode: 'history', routes: [...adminRoutes, { path: '*', component: Empty }] });
const Shell = { ...Admin, components: { ...Admin.components, LegalUpdateNotice: Empty, TrialNotice: Empty, PulseReturn: Empty, OnboardingCoordinator: Empty, 'da-re-login': Empty }, methods: { ...Admin.methods, loadHeaderLogo() {}, loadClinicLogo() {} } };
if (params.get('theme') === 'night') setTimeout(() => applyTheme({ ...DEFAULT_THEME, code: 'clinical-night' }), 0);
Vue.config.errorHandler = error => { window.qaErrors = (window.qaErrors || []).concat(String(error && error.stack || error)); console.error(error); };
window.qaState = state;
const banner = document.createElement('div');
banner.setAttribute('role', 'note');
banner.textContent = 'Prototipo NC1-CLUES-UX · transporte sintético · no es test ni producción · escenario: ' + scenario;
banner.style.cssText = 'background:#7c2d12;color:#fff;font:600 12px/1.4 system-ui;padding:4px 12px;text-align:center';
document.body.insertBefore(banner, document.body.firstChild);
new Vue({ router, store, vuetify, render(h) { return h('v-app', [h(Shell, [h('router-view')])]); } }).$mount('#app');
