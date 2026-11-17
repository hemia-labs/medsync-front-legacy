// Local QA only — NC1 identidad simple, users and registration (Claude, 2026-11-17). Real shell, store and routes:
//   /admin?section=users  (Personal y usuarios: alta y edición)        /register  (Crear cuenta)
// Stateful synthetic transport mirroring the backend of this lot (derived last_name, separate surnames).
import Vue from 'vue';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import store from '../../../src/store';
import types from '../../../src/store/modules/common/mutation-types';
import modules from '../../../src/store/modules/common/module-types';
import Admin from '../../../src/core/layouts/admin.vue';
import adminRoutes from '../../../src/router/routes/admin';
import authRoutes from '../../../src/router/routes/auth';
import MedSyncBrand from '../../../src/components/MedSyncBrand.vue';
import registerGlobalComponents from '../../../src/plugins/global-components';
import { DACore } from '../../../src/services/config/axios.context';
import Registration from '../../../src/services/core/auth/DARegistrationService';
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

const clone = v => JSON.parse(JSON.stringify(v == null ? null : v));
const log = []; window.qaLog = log; window.qaUnknown = [];
const join = (a, b) => [a, b].filter(Boolean).join(' ');
const state = { users: [
  { id_login: 'qa-u-legacy', id_rol: 'r-assistant', name: 'Lucía Sintética Pérez', first_name: 'Lucía', last_name: 'Sintética Pérez', first_surname: null, second_surname: null, email: 'lucia.qa@example.invalid', phone: '5500000101', telephone: '5500000101', active: 1, id_business: 'qa-clinic', rol: 'Asistente' },
  { id_login: 'qa-u-split', id_rol: 'r-assistant', name: 'Mario QA De la Cruz', first_name: 'Mario QA', last_name: 'De la Cruz', first_surname: 'De la Cruz', second_surname: null, email: 'mario.qa@example.invalid', phone: '5500000102', telephone: '5500000102', active: 1, id_business: 'qa-clinic', rol: 'Asistente' }
] };
window.qaState = state;
const reply = (data, extra = {}) => ({ success: true, status: 200, data, ...extra });
function applyNames(target, body) {
  const structured = 'first_surname' in body || 'second_surname' in body;
  target.first_name = (body.first_name || target.first_name || '').trim();
  if (structured) { target.first_surname = body.first_surname || null; target.second_surname = body.second_surname || null; target.last_name = join(target.first_surname, target.second_surname); }
  else if ('last_name' in body && body.last_name !== target.last_name) { target.last_name = body.last_name; target.first_surname = null; target.second_surname = null; }
  target.name = join(target.first_name, target.last_name);
}
async function transport(method, url, payload) {
  const path = String(url).replace(/^\/+/, '').replace(/^api\//, '').split('?')[0];
  if (method !== 'get') log.push({ method, path, payload: clone(payload) });
  if (path === 'user/list') return reply(clone(state.users));
  if (/^user\/list\//.test(path)) return reply(clone(state.users.find(u => u.id_login === path.split('/').pop())));
  if (path === 'user/create') { const user = { id_login: 'qa-u-' + Date.now(), active: 1, id_business: 'qa-clinic', rol: 'Asistente', telephone: payload.phone, ...clone(payload) }; applyNames(user, payload); delete user.password; state.users.push(user); return reply(clone(user)); }
  if (/^user\/update\//.test(path)) { const user = state.users.find(u => u.id_login === path.split('/').pop()); applyNames(user, payload); ['email', 'phone', 'id_rol'].forEach(k => { if (payload[k] !== undefined) user[k] = payload[k]; }); return reply(clone(user)); }
  if (/^rol\/list/.test(path)) return reply([{ id_rol: 'r-assistant', code: 'assistant', name: 'Asistente', desc_rol: 'Asistente', active: 1, assignable: true }]);
  if (/^user\/professional-profile/.test(path)) return reply(null);
  if (/saas-legal\/notice/.test(path)) return reply({ pending_count: 0, business_pending: false, central_sync_pending: false });
  if (/^business\/current/.test(path)) return reply({ id_business: 'qa-clinic', name: 'Consultorio de pruebas' });
  window.qaUnknown.push(method + ' ' + path);
  return reply(/list|catalog|permissions|roles/i.test(path) ? [] : null);
}
// Registration has its own client: synthetic legal context, and the submitted body is only recorded.
Registration.context = async () => ({ enabled: true, legalContext: 'qa-context', legalDocuments: [{ documentKey: 'terms', versionId: 'qa-v1', contentHash: 'qa-hash', title: 'Términos (sintético)', contentHtml: '<p>Texto sintético de QA.</p>', requiredAction: 'accept' }] });
Registration.register = async body => { window.qaRegister = JSON.parse(JSON.stringify(body)); throw { code: 'QA_LOCAL_ONLY', message: 'QA local: registro no enviado.' }; };
['get', 'post', 'put', 'patch', 'delete'].forEach(method => { DACore[method] = (url, payload) => transport(method, url, payload); });

if (!/^\/register/.test(window.location.pathname)) store.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, { authenticated: true, sessionState: 'active', accessExpiresAt: 'later',
  user: { id_login: 'qa-admin', id_session: 'qa-session', id_business: 'qa-clinic', rol: 'admin', name: 'Admin QA' },
  business: { id_business: 'qa-clinic', name: 'Consultorio de pruebas' }, role: 'admin',
  permissions: ['admin.users', 'admin.config', 'px.all'] });

const Empty = { render: h => h('span') };
const router = new Router({ mode: 'history', routes: [...adminRoutes, ...authRoutes, { path: '*', component: Empty }] });
const Shell = { ...Admin, components: { ...Admin.components, LegalUpdateNotice: Empty, TrialNotice: Empty, PulseReturn: Empty, OnboardingCoordinator: Empty, 'da-re-login': Empty }, methods: { ...Admin.methods, loadHeaderLogo() {}, loadClinicLogo() {} } };
Vue.config.errorHandler = error => { window.qaErrors = (window.qaErrors || []).concat(String(error && error.stack || error)); console.error(error); };
new Vue({ router, store, vuetify, render(h) { const admin = (this.$route.meta || {}).layout === 'admin'; return h('v-app', [admin ? h(Shell, [h('router-view')]) : h('router-view')]); } }).$mount('#app');
