// PROTOTYPE ONLY — NC1-CLUES-UX (Claude, 2026-11-18). Real admin shell, real store, real route /admin?section=identity.
// Every request goes to a stateful SYNTHETIC transport. Nothing reaches a backend; no catalog row here is official.
// Scenarios: ?scenario=verified (default) | empty | manual | multi | inactive | load-error
// Unit writes fail in order: ?fail=409,network | 403 | 503 | network | network-create | late-commit | clues; business-409
// Also: ?detailFail=<id>:<status|0>, ?catalogState=offline, ?perm=none, ?address=<text>; scenarios stale | stale-missing
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
// Unit writes fail in queue order: ?fail=network,409 consumes one entry per unit write. business-409 applies to business saves.
const failQueue = String(params.get('fail') || '').split(',').filter(Boolean);
// One-shot detail failures: ?detailFail=u-norte:503,u-centro:403 (0 = network); <id>:503@2 fails only the 2nd read. Later reads succeed.
const detailFail = Object.fromEntries(String(params.get('detailFail') || '').split(',').filter(Boolean).map(x => x.split(':')));
const detailReads = {};
const clone = v => JSON.parse(JSON.stringify(v == null ? null : v));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = []; window.qaLog = log; window.qaUnknown = [];

// Synthetic catalogs shaped like ESTABLECIMIENTO_DE_SALUD_SIS (8 columns). Codes start with QA and are not real CLUES.
// Two releases model D-5: an older, superseded one and the current one. Neither is official.
const RELEASE = 'sis.establishments-qa', OLD_RELEASE = 'sis.establishments-qa-2025';
const SOURCE = { releaseId: RELEASE, sourceVersion: 'QA sintético 2026-09 · no oficial (forma de ESTABLECIMIENTO_DE_SALUD_SIS)', sourceUrl: null, validFrom: '2026-11-17', validityBasis: 'download_date' };
const OLD_SOURCE = { releaseId: OLD_RELEASE, sourceVersion: 'QA sintético 2025-06 · no oficial', sourceUrl: null, validFrom: '2025-07-01', validityBasis: 'download_date' };
const entry = (clues, nombre_unidad, institucion, id_entidad_federativa, tip_abreviacion = 'P') => ({ clues, nombre_unidad, institucion, tipo_unidad: '1', tip_abreviacion, sub_abreviacion: '99', id_entidad_federativa, en_operacion: '1' });
const CATALOGS = {
  [RELEASE]: { source: SOURCE, rows: {
    QASMP000101: entry('QASMP000101', 'CONSULTORIO DENTAL SONRISA CLARA S A DE C V', 'SMP', '09'),
    QASMP000202: entry('QASMP000202', 'SONRISA CLARA SUCURSAL NORTE', 'SMP', '15'),
    QASSA000303: entry('QASSA000303', 'CENTRO DE SALUD SINTÉTICO QA ÁLVARO OBREGÓN', 'SSA', '09', 'E') } },
  [OLD_RELEASE]: { source: OLD_SOURCE, rows: {
    QASMP000101: entry('QASMP000101', 'SONRISA CLARA CONSULTORIO DENTAL', 'SMP', '09', 'C'),
    QASMP000404: entry('QASMP000404', 'SONRISA CLARA ANEXO SUR', 'SMP', '09') } }
};
const CATALOG = CATALOGS[RELEASE].rows;
const ref = (code, releaseId = RELEASE) => ({ family: 'sis.establishments', releaseId, code });
const unit = (id, displayName, active, cluesRef, extra = {}) => ({ id, displayName, active, cluesRef, validFrom: null, validTo: null, revision: 3, updatedAt: '2026-11-18T10:20:00Z', ...extra });
const QA_INACTIVE = unit('qa-inactive', 'QA Catálogos 20261118 — no usar para atención', false, ref('QASSA000303'), { revision: 4 });
const SCENARIOS = {
  verified: [unit('u-centro', 'Sonrisa Clara Centro', true, ref('QASMP000101'))],
  empty: [],
  manual: [unit('u-centro', 'Sonrisa Clara Centro', true, { family: 'sis.establishments', code: 'QAPRV000999' })],
  multi: [unit('u-centro', 'Sonrisa Clara Centro', true, ref('QASMP000101'), { validFrom: '2024-02-01' }), unit('u-norte', 'Sonrisa Clara Norte', true, ref('QASMP000202')), QA_INACTIVE],
  inactive: [QA_INACTIVE],
  stale: [unit('u-centro', 'Sonrisa Clara Centro', true, ref('QASMP000101', OLD_RELEASE))],
  'stale-missing': [unit('u-sur', 'Sonrisa Clara Anexo', true, ref('QASMP000404', OLD_RELEASE))],
  'load-error': []
};
const state = {
  business: { id_business: 'qa-clinic', name: 'Sonrisa Clara Dental', legalName: 'Sonrisa Clara Servicios Odontológicos, S.A. de C.V.', slug: 'sonrisa-clara-qa', email: 'contacto@ejemplo.invalid', phone: '5500000000',
    address: params.get('address') || 'Av. Sintética 123, Col. Prueba\nÁlvaro Obregón, Ciudad de México, CP 01000', logoUrl: '', status: 'active', subscriptionStatus: 'active', plan: 'pro' },
  units: clone(SCENARIOS[scenario] || SCENARIOS.verified), nextId: 1,
  // Models the idempotency contract proposed for CLUES-F1: key -> exact payload and created unit. Prototype only.
  operations: {}
};
const reply = (data, extra = {}) => ({ success: true, status: 200, data, ...extra });
const failure = (status, message, data = null) => ({ success: false, status, message, data });
// CAT-O1 as proposed: attributes of the exact referenced release; a superseded release is not effective (unverified).
function view(u) {
  const r = u.cluesRef, catalog = r && r.releaseId && CATALOGS[r.releaseId], row = catalog && catalog.rows[r.code];
  let check = null;
  if (r && !r.releaseId) check = { result: 'unverified', code: 'CATALOG_REF_CANDIDATE' };
  else if (r && !row) check = { result: 'invalid', code: 'CLUES_NOT_IN_SIS_RELEASE' };
  else if (r) check = r.releaseId === RELEASE ? { result: 'valid', code: null, label: row.nombre_unidad, source: catalog.source } : { result: 'unverified', code: 'RELEASE_NOT_EFFECTIVE', label: row.nombre_unidad, source: catalog.source };
  const checks = check ? [{ field: 'cluesRef', ...check }] : [];
  return { ...clone(u), contractVersion: 'nc1.identity.v1.1', qualityIssues: [], catalogChecks: checks, catalogValidation: checks.length && checks.every(c => c.result === 'valid') ? 'verified' : 'unverified',
    catalogAttributes: row ? clone(row) : null };
}
function failWrite(kind) {
  if (!failQueue.length) return null;
  const f = failQueue[0];
  if (kind === 'business' ? f !== 'business-409' : f === 'business-409') return null;
  failQueue.shift();
  if (f === '409' || f === 'business-409') return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' });
  if (f === '403') return failure(403, 'Acceso no autorizado.', { code: 'PERMISSION_DENIED' });
  if (f === '503') return failure(503, 'Servicio no disponible.');
  if (f === 'clues') return failure(400, 'Revisa el campo de identidad: cluesRef', { code: 'CLUES_NOT_IN_SIS_RELEASE', field: 'cluesRef' });
  return f; // network | network-create | late-commit
}
const hash = v => JSON.stringify(v);
function commitCreate(key, identity) {
  const u = { ...clone(identity), id: 'u-new-' + state.nextId++, revision: 1, updatedAt: '2026-11-18T12:00:00Z' };
  state.units.push(u); if (key) state.operations[key] = { hash: hash(identity), id: u.id };
  return u;
}

async function transport(method, url, payload, config) {
  const path = String(url).replace(/^\/+/, '').replace(/^api\//, '').split('?')[0];
  const key = config && config.headers && config.headers['Idempotency-Key'] || null;
  if (method !== 'get') log.push({ method, path, payload: clone(payload), key });
  if (path === 'identity/catalogs/sis.establishments') {
    await wait(150); const q = (payload || {}).params || {};
    if (params.get('catalogState') === 'offline') return failure(503, 'Catálogo temporalmente no disponible');
    if (q.code) {
      const c = CATALOGS[q.releaseId], row = c && c.rows[q.code];
      return reply({ check: row ? { result: q.releaseId === RELEASE ? 'valid' : 'unverified', code: q.releaseId === RELEASE ? null : 'RELEASE_NOT_EFFECTIVE', label: row.nombre_unidad, source: c.source } : { result: 'invalid', code: 'CLUES_NOT_IN_SIS_RELEASE' } });
    }
    const text = String(q.q || '').toLowerCase();
    // Search always uses the current release. attributes is the CAT-O1 addition proposed for establishments.
    return reply({ available: true, source: SOURCE, hasMore: false, items: Object.values(CATALOG).filter(e => !text || (e.clues + ' ' + e.nombre_unidad).toLowerCase().includes(text)).map(e => ({ ref: ref(e.clues), label: e.nombre_unidad, attributes: clone(e) })) });
  }
  if (path === 'identity/establishments') {
    if (method === 'get') { await wait(250); return scenario === 'load-error' ? failure(503, 'No se pudieron consultar los establecimientos.') : reply(state.units.map(u => ({ id: u.id, displayName: u.displayName, active: u.active }))); }
    await wait(500);
    if (key && state.operations[key]) {
      if (state.operations[key].inflight) await state.operations[key].inflight; // the same operation's late commit finishes first, as a row lock would
      const done = state.operations[key];
      if (done.hash !== hash(payload.identity)) return failure(409, 'La operación ya se usó con otro contenido.', { code: 'IDEMPOTENCY_KEY_REUSED' });
      const f = failWrite('unit'); if (f && !f.status) throw new Error('network'); if (f) return f;
      return reply(view(state.units.find(x => x.id === done.id)), { replayed: true });
    }
    const f = failWrite('unit');
    if (f === 'network-create') { commitCreate(key, payload.identity); throw new Error('timeout after commit'); }
    if (f === 'late-commit') {
      const identity = clone(payload.identity);
      const inflight = wait(1500).then(() => { const u = commitCreate(null, identity); if (key) state.operations[key] = { hash: hash(identity), id: u.id }; });
      if (key) state.operations[key] = { hash: hash(identity), inflight };
      throw new Error('timeout before commit');
    }
    if (f === 'network') throw new Error('network');
    if (f) return f;
    if (payload.expectedRevision !== 0) return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT' });
    return reply(view(commitCreate(key, payload.identity)));
  }
  const m = path.match(/^identity\/establishments\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]), u = state.units.find(x => x.id === id);
    if (!u) return failure(404, 'No encontrado', { code: 'IDENTITY_NOT_FOUND' });
    if (method === 'get') {
      await wait(120);
      detailReads[id] = (detailReads[id] || 0) + 1;
      if (detailFail[id] !== undefined) {
        const [code, nth] = String(detailFail[id]).split('@'), status = Number(code);
        if (detailReads[id] === Number(nth || 1)) { delete detailFail[id]; if (!status) throw new Error('network'); return failure(status, 'No se pudo consultar.'); }
      }
      return reply(view(u));
    }
    await wait(500);
    const f = failWrite('unit');
    if (f === 'network' || f === 'network-create' || f === 'late-commit') throw new Error('network');
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
['get', 'post', 'put', 'patch', 'delete'].forEach(method => { DACore[method] = (url, payload, config) => transport(method, url, payload, config); });

store.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, { authenticated: true, sessionState: 'active', accessExpiresAt: 'later',
  user: { id_login: 'qa-admin', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'admin', name: 'Valeria QA' },
  business: { id_business: 'qa-clinic', name: 'Sonrisa Clara Dental' }, role: 'admin',
  permissions: params.get('perm') === 'none' ? ['px.all', 'px.new'] : ['px.all', 'px.new', 'admin.config', 'admin.users'] });

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
