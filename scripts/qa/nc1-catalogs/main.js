// Local QA only — NC1 identidad integrada (Claude, 2026-11-16). Real admin shell, real store, real routes:
//   /admin?section=doctor-identity  (Configuración › Mi perfil profesional, the current entry point)
//   /px/history/qa-patient           (expediente: «Editar paciente» and clinical edit)
//   /px/new                          (Nuevo paciente)
// Every request goes to a stateful synthetic transport that mirrors the backend contract of this lot
// (derived surname statuses and display name, one atomic profile + identity save). Nothing reaches a backend.
// Demo switch: ?state=conflict | field-error | forbidden makes the next profile save fail that way.
import Vue from 'vue';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import store from '../../../src/store';
import types from '../../../src/store/modules/common/mutation-types';
import modules from '../../../src/store/modules/common/module-types';
import Admin from '../../../src/core/layouts/admin.vue';
import adminRoutes from '../../../src/router/routes/admin';
import patientRoutes from '../../../src/router/routes/patient';
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
let failNext = params.get('state');
const DOCTOR = 'qa-identity-doctor', PATIENT = 'qa-patient';
const clone = v => JSON.parse(JSON.stringify(v == null ? null : v));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = []; window.qaLog = log; window.qaUnknown = [];
const derive = identity => { ['firstSurname', 'secondSurname'].forEach(k => { identity[k + 'Status'] = identity[k] ? 'present' : 'unknown'; }); return identity; };
const composed = i => [i.givenNames, i.firstSurname, i.secondSurname].filter(Boolean).join(' ');
const meta = (identity, revision) => ({ ...identity, contractVersion: 'nc1.identity.v1.1', revision, updatedAt: revision ? '2026-11-16T12:00:00Z' : null, provenance: revision ? 'captured' : 'legacy_unresolved', qualityIssues: [], catalogValidation: 'unverified' });

// ---- synthetic state ----
const state = {
  establishment: {id:'qa-est',displayName:'Unidad sintética QA',active:true,cluesRef:null,revision:0,validFrom:null,validTo:null},
  profile: { id_doctor_professional_profile: 'qa-pp', id_login: DOCTOR, professional_name: 'Dra. Valeria QA Sintética', professional_license: '12345678', university: 'Universidad QA', specialty: 'Medicina general', specialty_license: '', professional_phone: null, signature_image: null, can_issue_prescriptions: 1, can_sign_documents: 1, is_active: 1 },
  profileIdentity: derive({ givenNames: null, firstSurname: null, secondSurname: null, birthDate: null, curp: null, birthCountry: null, authorizedPersonnelTypes: null, legacyProfessionalName: 'Dra. Valeria QA Sintética' }),
  profileRevision: 0,
  patient: { person: { id_person: PATIENT, name: 'Ana QA', surname: 'Sintética Pérez', fullname: 'Ana QA Sintética Pérez', birthday: '12-04-1990', age: 36, telephone: '5500000999', local_telephone: '', ocupation: '', rfc: '', active: 1, code: '000999' },
    address: { cp: '01234', direction: '', residence: '' }, query: {}, emergencyContact: null, family_parents: [], family_grandparents: [], family_brothers: [], patologic: [], allergy: { review_status: 'not_reviewed', items: [] } },
  patientIdentity: derive({ givenNames: 'Ana QA', firstSurname: null, secondSurname: null, birthDate: '1990-04-12', biologicalSex: '2', genderIdentity: null, indigenousSelfIdentification: null, afromexicanSelfIdentification: null, migrantStatus: null, curp: null, birthCountry: null, birthEntity: null, nationality: null, originCountry: null, residence: null, affiliations: null, legacySurname: 'Sintética Pérez' }),
  patientRevision: 0
};
const reply = (data, extra = {}) => ({ success: true, status: 200, data, ...extra });
const failure = (status, message, data = null) => ({ success: false, status, message, data });
const profileView = () => ({ ...clone(state.profile), identity: meta(clone(state.profileIdentity), state.profileRevision) });
const patientView = () => ({ ...clone(state.patient), access: { clinical: true }, identity: meta(clone(state.patientIdentity), state.patientRevision) });

async function transport(method, url, payload) {
  const path = String(url).replace(/^\/+/, '').replace(/^api\//, '').split('?')[0];
  if (method !== 'get') log.push({ method, path, payload: clone(payload) });

  if (path.startsWith('identity/catalogs/')) {
    await wait(150);
    const family=decodeURIComponent(path.slice('identity/catalogs/'.length)), query=(payload||{}).params||{};
    const familyRows={
      'sis.country':[['142','México'],['1','Afganistán'],['2','Albania']],
      'sis.federal_entity':[['01','Aguascalientes'],['09','Ciudad de México']],
      'inegi.state':[['01','Aguascalientes'],['09','Ciudad de México']],
      'inegi.municipality':[['01001','Aguascalientes'],['01002','Asientos'],['09010','Álvaro Obregón']],
      'inegi.locality':[['010010001','Aguascalientes'],['090100001','Álvaro Obregón']],
      'sis.affiliation':[['0','No especificada'],['1','IMSS']],
      'sis.personnel_type':[['1','Médico general'],['14','Odontólogo']],
      'sis.establishments':[['QATEST00001','Unidad sintética de atención QA']]
    };
    if(params.get('catalogState')==='offline')return failure(503,'Catálogo temporalmente no disponible');
    const rows=familyRows[family],source={releaseId:family+'-qa',sourceVersion:'QA sintético · no oficial'};
    if(query.code)return reply({check:rows&&rows.some(r=>r[0]===query.code)?{result:'valid',label:rows.find(r=>r[0]===query.code)[1],source}:{result:'unverified',code:'CATALOG_UNAVAILABLE'}});
    return reply({available:Boolean(rows),source,hasMore:false,items:(rows||[]).filter(r=>(!query.parent||r[0].startsWith(query.parent))&&(!query.q||(r[0]+' '+r[1]).toLowerCase().includes(query.q.toLowerCase()))).map(r=>({ref:{family,releaseId:source.releaseId,code:r[0]},label:r[1]}))});
  }
  // Independent review (Claude, 2026-11-17): ?state=catalog-reject makes the next alta / CLUES save fail as the backend does.
  if(method!=='get'&&failNext==='catalog-reject'&&/^px\/create-minimal|^identity\/establishments/.test(path)){
    failNext=null;await wait(300);
    return /^px/.test(path)?failure(400,'Revisa el campo de identidad: residence.municipality',{code:'CATALOG_CODE_NOT_FOUND',field:'residence.municipality'})
      :failure(400,'Revisa el campo de identidad: cluesRef',{code:'CLUES_NOT_OPERATING',field:'cluesRef'});
  }
  if(path==='identity/establishments'){
    if(method==='get')return reply([clone(state.establishment)]);
    state.establishment={...clone(payload.identity),id:'qa-est',revision:1};return reply(clone(state.establishment));
  }
  if(path==='identity/establishments/qa-est'){if(method!=='get')state.establishment={...state.establishment,...clone(payload.identity),revision:state.establishment.revision+1};return reply(clone(state.establishment));}
  if (/^user\/professional-profile\//.test(path)) {
    if (method === 'get') return reply(profileView());
    await wait(400);
    if (failNext === 'conflict' && payload.identity) { failNext = null; return failure(409, 'Revisa el campo de identidad: expectedRevision', { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' }); }
    if (failNext === 'field-error' && payload.identity) { failNext = null; return failure(400, 'Revisa el campo de identidad: birthCountry', { code: 'IDENTITY_INVALID', field: 'birthCountry' }); }
    if (failNext === 'forbidden') { failNext = null; return failure(403, 'No tienes permiso para editar este perfil profesional.', { code: 'PERMISSION_DENIED' }); }
    if (payload.identity) {
      if (payload.identity_expected_revision !== state.profileRevision) return failure(409, 'Revisa el campo de identidad: expectedRevision', { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' });
      state.profileIdentity = derive({ ...state.profileIdentity, ...clone(payload.identity) }); state.profileRevision++;
      const name = composed(state.profileIdentity); if (name) state.profile.professional_name = name;
    }
    Object.keys(state.profile).forEach(k => { if (k in payload && !['identity', 'identity_expected_revision', 'professional_name'].includes(k)) state.profile[k] = typeof payload[k] === 'boolean' ? (payload[k] ? 1 : 0) : payload[k]; });
    return reply(profileView());
  }
  if (/^px\/get\//.test(path)) return reply(patientView());
  if (/^identity\/patients\//.test(path)) {
    if (method === 'get') return reply(meta(clone(state.patientIdentity), state.patientRevision));
    await wait(300);
    if (payload.expectedRevision !== state.patientRevision) return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' });
    state.patientIdentity = derive({ ...state.patientIdentity, ...clone(payload.identity) }); state.patientRevision++;
    const surname = [state.patientIdentity.firstSurname, state.patientIdentity.secondSurname].filter(Boolean).join(' ');
    if (surname) state.patient.person.surname = surname; if (state.patientIdentity.givenNames) state.patient.person.name = state.patientIdentity.givenNames;
    state.patient.person.fullname = state.patient.person.name + ' ' + state.patient.person.surname;
    return reply(meta(clone(state.patientIdentity), state.patientRevision));
  }
  if (/^px\/administrative/.test(path)) {
    await wait(300);
    if (payload.identity) {
      if (payload.expectedRevision !== state.patientRevision) return failure(409, 'Conflicto', { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' });
      state.patientIdentity = derive({ ...state.patientIdentity, ...clone(payload.identity) }); state.patientRevision++;
    }
    state.patient.person = { ...state.patient.person, ...clone(payload.person), fullname: payload.person.name + ' ' + payload.person.surname };
    state.patient.address = clone(payload.address);
    return reply({ id_person: PATIENT });
  }
  if (/saas-legal\/notice/.test(path)) return reply({ pending_count: 0, business_pending: false, central_sync_pending: false });
  if (/^business\/current/.test(path)) return reply({ id_business: 'qa-clinic', name: 'Consultorio de pruebas' });
  window.qaUnknown.push(method + ' ' + path);
  return reply(/list|all|catalog|family|patologic|templates|doctors|modules|history|notes|dates|permissions|roles/i.test(path) ? [] : null);
}
['get', 'post', 'put', 'patch', 'delete'].forEach(method => { DACore[method] = (url, payload) => transport(method, url, payload); });

store.commit(modules.AUTH + '/' + types.SET_D2_AUTH_SESSION, { authenticated: true, sessionState: 'active', accessExpiresAt: 'later',
  user: { id_login: DOCTOR, id_session: 'qa-session', id_business: 'qa-clinic', rol: params.get('role') === 'admin' ? 'admin' : 'doctor', name: 'Valeria QA' },
  business: { id_business: 'qa-clinic', name: 'Consultorio de pruebas' }, role: params.get('role') === 'admin' ? 'admin' : 'doctor',
  permissions: ['px.all', 'px.new', 'px.edit', 'clinical_history.view', 'clinical_history.edit', 'clinical_history.edit_draft', 'clinical_history.view_sensitive', 'admin.config', 'admin.users'] });

const Empty = { render: h => h('span') };
const router = new Router({ mode: 'history', routes: [...adminRoutes, ...patientRoutes, { path: '*', component: Empty }] });
const Shell = { ...Admin, components: { ...Admin.components, LegalUpdateNotice: Empty, TrialNotice: Empty, PulseReturn: Empty, OnboardingCoordinator: Empty, 'da-re-login': Empty }, methods: { ...Admin.methods, loadHeaderLogo() {}, loadClinicLogo() {} } };
if (params.get('theme') === 'night') setTimeout(() => applyTheme({ ...DEFAULT_THEME, code: 'clinical-night' }), 0);
Vue.config.errorHandler = error => { window.qaErrors = (window.qaErrors || []).concat(String(error && error.stack || error)); console.error(error); };
window.qaState = state;
new Vue({ router, store, vuetify, render(h) { return h('v-app', [h(Shell, [h('router-view')])]); } }).$mount('#app');
