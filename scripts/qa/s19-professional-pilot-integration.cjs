// In-memory integration of real Vue component methods, Vuex actions, services and HTTP core.
// This is deliberately not browser/E2E QA: no DOM, live server, database or external delivery.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const Vuex = require('vuex');
const compiler = require('vue-template-compiler');
Vue.use(Vuex);
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const strip = source => source.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '');
function load(file, bindings = {}, names) {
  const source = read(file);
  const sfc = file.endsWith('.vue') ? compiler.parseComponent(source) : null;
  if(sfc) assert.deepEqual(compiler.compile(sfc.template.content).errors, [], `${file} template compiles`);
  const script = strip(sfc ? sfc.script.content : source);
  const context = { module: { exports: {} }, URLSearchParams, setTimeout, clearTimeout, ...bindings };
  vm.runInNewContext(names ? script.replace(/export /g, '') + `\nmodule.exports = {${names.join(',')}};`
    : script.replace('export default', 'module.exports ='), context, { filename: file });
  return context.module.exports;
}
const apiSource = read('src/services/common/apiurl.js');
const api = load('src/services/common/apiurl.js', {}, [...apiSource.matchAll(/^export const (\w+)/gm)].map(match => match[1]));
const rights = load('src/security/authorizationContext.js', {}, ['authorizationContext', 'isCurrentAuthorization', 'authorizationChangedError', 'isAuthControlRequest', 'invalidatePendingRequests']);
const types = load('src/store/modules/common/mutation-types.js');
const clone = value => JSON.parse(JSON.stringify(value));
const patient = { person: { id_person: 'QA_S19_FRONT_PATIENT', name: 'Paciente ficticio', surname: 'Piloto', age: 30 },
  allergy: { id_allergy: 'QA_S19_ALLERGY', has_allergy: 0, revision: 1 } };
const doctor = { id_login: 'QA_S19_DOCTOR', id_doctor_professional_profile: 'QA_S19_PROFILE',
  professional_name: 'Doctora ficticia', professional_license: 'QA_ONLY', professional_profile_active: 1, professional_profile_complete: 1,
  can_issue_prescriptions: 1, signature_image: 'QA_SYNTHETIC_SIGNATURE_PLACEHOLDER' };
const template = { sections: [
  { key: 'consultation', label: 'Consulta', fields: [{ key: 'reason', label: 'Motivo', required: true }] },
  { key: 'allergies_medications', label: 'Alergias', fields: [{ key: 'allergy_status', label: 'Estado', required: true }] }
] };
const auth = { authenticated: true, user: { id_login: 'QA_S19_RECEPTION', id_business: 'QA_S19_BUSINESS', id_session: 'QA_S19_SESSION', rol: 'receptionist' },
  role: 'receptionist', business: { id_business: 'QA_S19_BUSINESS' }, permissions: ['clinical_history.intake'], accessRevision: 1 };
const db = { history: null, prescriptions: [], tracings: [], appointments: [], consent: 'PENDIENTE' };
const requests = [];
const networkState = { failIntake: false, failHistory: false, failAppointment: false, failTracing: false, failFinalize: false, loseDraftResponse: false, loseIssueResponse: false };
const response = data => ({ status: 200, data: { data: clone(data) } });
function fail(message, status = 503, code) { throw { response: { status, data: { status, message, data: code ? { code } : {} } } }; }
const intakeData = () => ({ editable: !db.history || db.history.status === 'DRAFT', history: db.history,
  consultation: db.history && db.history.clinical_snapshot_json.consultation || {},
  doctors: [doctor], fields: ['reason', 'current_condition', 'evolution_time', 'main_symptoms'],
  suggested_doctor_profile_id: doctor.id_doctor_professional_profile,
  responsible_doctor: db.history ? doctor : null, doctor_assignment_locked: Boolean(db.history), assigned_doctor_available: true });
async function http(method, url, body) {
  requests.push({ method, url, body: body && clone(body) });
  const endpoint = url.split('?')[0];
  if(endpoint === `api/clinical-history/patient/${patient.person.id_person}/intake`) {
    if(method === 'get') return response(intakeData());
    if(networkState.failIntake) fail('Captura temporalmente no disponible');
    assert.equal(body.doctor_responsible_profile_id, doctor.id_doctor_professional_profile);
    assert.equal(body.doctor_responsible_user_id, undefined, 'Reception submits profile only');
    db.history = { id_clinical_history: 'QA_S19_HISTORY', revision: db.history ? db.history.revision + 1 : 0, status: 'DRAFT',
      doctor_responsible_user_id: doctor.id_login, created_by_name: 'Recepcion ficticia',
      template_snapshot_json: template, clinical_snapshot_json: { consultation: clone(body.consultation) } };
    return response(intakeData());
  }
  if(endpoint === `api/clinical-history/patient/${patient.person.id_person}`) return response({ history: db.history });
  if(endpoint.endsWith('/versions')) return response({ versions: db.history ? [db.history] : [] });
  if(endpoint === 'api/clinical-history-template/current') return response({ template: { schema_json: template }, source: 'BUSINESS' });
  if(endpoint === 'api/prescription/doctors') return response([doctor]);
  if(endpoint === `api/clinical-history/${db.history && db.history.id_clinical_history}/draft`) {
    if(networkState.failHistory) fail('Conflicto de revisión', 409, 'HISTORY_REVISION_CONFLICT');
    assert.equal(body.expected_revision, db.history.revision);
    db.history = { ...db.history, revision: db.history.revision + 1, clinical_snapshot_json: clone(body.clinical_snapshot_json) };
    return response({ history: db.history });
  }
  if(endpoint.endsWith('/finalize')) {
    assert.equal(body.expected_revision, db.history.revision, 'Finalize uses acknowledged save revision');
    if(networkState.failFinalize) fail('Finalización no confirmada');
    db.history = { ...db.history, status: 'FINALIZED', revision: db.history.revision + 1 };
    return response({ history: db.history });
  }
  if(endpoint === api.DAC_DOCUMENT_PATIENT.replace(/^\//, '') + patient.person.id_person) return response([{ id_patient_document: 'QA_S19_CONSENT', document_type: 'SENSITIVE_DATA_CONSENT', status: db.consent }]);
  if(endpoint === api.DAC_DOCUMENT_TEMPLATES.replace(/^\//, '')) return response([]);
  if(endpoint === `api/px/get/${patient.person.id_person}`) return response(patient);
  if(endpoint === 'api/prescription/save') {
    const sent = body.prescription;
    let rx = db.prescriptions.find(item => item.id_prescription === (sent.id_prescription || sent.create_request_id));
    if(!rx) { rx = { id_prescription: sent.create_request_id || `QA_S19_RX_${db.prescriptions.length + 1}`, folio: 'QA-ONLY', status: 'draft' }; db.prescriptions.push(rx); }
    const id = rx.id_prescription;
    Object.assign(rx, clone(sent), { id_prescription: id, status: rx.status });
    if(networkState.loseDraftResponse) { networkState.loseDraftResponse = false; fail('Respuesta de alta perdida'); }
    return response(rx);
  }
  if(endpoint === 'api/prescription/issue') {
    const rx = db.prescriptions.find(item => item.id_prescription === body.id_prescription); assert(rx);
    rx.status = 'issued';
    if(networkState.loseIssueResponse) fail('Respuesta de emisión perdida');
    return response(rx);
  }
  if(endpoint === 'api/prescription/output') {
    const rx = db.prescriptions.find(item => item.id_prescription === body.id_prescription);
    if(!rx || rx.status !== 'issued') fail('Solo emitidas', 409);
    return response({ prescription: rx, config: {} });
  }
  if(endpoint.startsWith('api/prescription/') && db.prescriptions.some(item => item.id_prescription === endpoint.split('/').pop())) return response(db.prescriptions.find(item => item.id_prescription === endpoint.split('/').pop()));
  if(endpoint === 'api/tracing/save') {
    if(networkState.failTracing) fail('Seguimiento no confirmado');
    const row = body.tracing[0];
    let existing = db.tracings.find(item => item.id_tracing === row.id_tracing);
    if(!existing) { existing = { ...clone(row), revision: 1, status: 'active' }; db.tracings.push(existing); }
    return response([existing]);
  }
  if(endpoint === 'api/appointment/save') {
    assert.equal(body.sync_follow_up, true);
    if(networkState.failAppointment) fail('Horario ocupado', 409);
    const row = { ...clone(body.appointment), id: 'QA_S19_APPOINTMENT' };
    db.appointments.push(row); return response([row]);
  }
  if(endpoint === 'api/appointment/config') return response({});
  if(endpoint === 'api/appointment/list') return response(db.appointments);
  if(endpoint.startsWith('api/appointment/patient/')) return response({ appointments: db.appointments });
  throw Error(`Unexpected fixture request: ${method} ${url}`);
}
const transport = Object.fromEntries(['get', 'post', 'put', 'delete'].map(method => [method, (url, body) => http(method, url, body)]));
const core = load('src/services/config/core.instance.js', { ...rights, notifyPulseWrite: load('src/domain/pulse/pulseWrites.js', {}, ['notifyPulseWrite']).notifyPulseWrite, store: { state: { CORE: { AUTH: auth } } },
  axiosHelper: { buildRequestConfig: async () => ({}) }, context: { core: transport }, httpstatus: { SUCESS: 200 }, ResultData: class { constructor() { this.success = false; } } });
const service = name => load(`src/services/core/${name}`, { ...api, DACore: core });
const HistoryService = service('clinicalHistory/DAClinicalHistoryService.js');
const RxService = service('prescription/DAPrescriptionService.js');
const DocumentService = service('document/DADocumentService.js');
const AppointmentService = service('appointment/DAAppointmentService.js');
const MonitoringService = service('monitoring/DAMonitoringService.js');
const PatientService = service('px/DAPxService.js');
const TemplateService = service('clinicalHistoryTemplate/DAClinicalHistoryTemplateService.js');
const bindings = { ...require('./agenda-test-helpers.cjs'), ListPageNav: {}, mapGetters: () => ({}), mapActions: () => ({}), moduleTypes: {}, fnTypes: {}, VuexMixin: {},
  getSettingsSections: load('src/security/settingsAccess.js', {}, ['getSettingsSections']).getSettingsSections,
  dialogName: {}, fieldError: {}, window: {}, document: {}, isD2AuthMode: () => true,
  HistoryService, DAClinicalHistoryService: HistoryService, DAPrescriptionService: RxService, DADocumentService: DocumentService,
  DAPxService: PatientService, DAClinicalHistoryTemplateService: TemplateService };
function state(component, extras = {}) {
  const instance = { ...component.data(), px: patient, authUser: auth.user, authRole: auth.role,
    hasPermission: permission => auth.permissions.includes(permission), $set: (obj, key, value) => { obj[key] = value; },
    $nextTick: callback => callback ? callback() : Promise.resolve(), $emit: () => {}, $refs: {}, ...extras };
  Object.entries(component.methods || {}).forEach(([name, method]) => { instance[name] = method.bind(instance); });
  Object.entries(component.computed || {}).forEach(([name, getter]) => Object.defineProperty(instance, name, { configurable: true, get: () => getter.call(instance) }));
  return instance;
}
function role(name, permissions) { auth.role = name; auth.user.rol = name; auth.user.id_login = name === 'doctor' ? doctor.id_login : 'QA_S19_RECEPTION'; auth.permissions = permissions; auth.accessRevision++; }

(async () => {
  const historyHelper = await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/clinical-history/history.editor.js')).toString('base64')}`);
  const vitalSigns = await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/clinical-history/vitalSigns.validation.js')).toString('base64')}`);
  const settings = await import(`data:text/javascript;base64,${Buffer.from(read('src/security/settingsAccess.js')).toString('base64')}`);
  const allergies = await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/patient/allergy.js')).toString('base64')}`);
  const rxHelper = await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/prescriptions/prescription.editor.js')).toString('base64')}`);
  const intake = state(load('src/views/Patient/Sections/ClinicalIntake.vue', bindings));
  await intake.load(); assert.equal(intake.doctorProfileId, doctor.id_doctor_professional_profile);
  intake.form.reason = 'Motivo ficticio para piloto'; intake.form.main_symptoms = 'Sin información clínica real';
  networkState.failIntake = true; assert.equal(await intake.save(), false); assert.equal(intake.dirty, true); assert.equal(db.history, null);
  networkState.failIntake = false; assert.equal(await intake.save(), true); assert.equal(db.history.revision, 0);
  assert.equal(intake.dirty, false); assert.match(intake.feedback, /Doctora ficticia/);

  role('doctor', ['clinical_history.view', 'clinical_history.edit_draft', 'clinical_history.finalize', 'prescriptions.create', 'prescriptions.edit_draft', 'prescriptions.issue', 'prescriptions.print', 'prescriptions.download', 'px.tab.monitoring', 'tracing.create', 'px.dates']);
  const history = state(load('src/views/Patient/Sections/MedicalHistory.vue', { ...bindings, ...historyHelper, ...allergies, ...vitalSigns, ...settings }));
  await history.loadInitialData();
  assert.equal(history.form.consultation.reason, intake.form.reason, 'Doctor receives reception snapshot through service/core contract');
  assert.equal(history.doctorResponsibleUserId, doctor.id_login);
  assert.equal(history.form.allergies_medications.allergy_status, 'NONE_KNOWN');
  const beforeBlocked = requests.length; await history.finalizeHistory();
  assert.equal(requests.length, beforeBlocked, 'Pending consent does not submit save/finalize');
  db.consent = 'FIRMADO'; await history.loadConsentStatus();
  history.form.consultation.reason += ' — revisión de doctora';
  networkState.failHistory = true; await history.finalizeHistory();
  assert.equal(history.revisionConflict, true); assert.equal(history.dirty, true); assert.equal(db.history.status, 'DRAFT');
  assert.equal(requests.some(item => item.url.endsWith('/finalize')), false, 'Failed draft save cannot finalize');
  networkState.failHistory = false; networkState.failFinalize = true; await history.finalizeHistory();
  assert.equal(history.clinicalHistory.status, 'DRAFT'); assert.equal(history.dirty, false, 'Confirmed save survives finalize failure');
  networkState.failFinalize = false; await history.finalizeHistory(); assert.equal(history.isFinalized, true); assert.equal(history.canEditForm, false);

  let uuidCalls = 0;
  const rxComponent = load('src/views/prescriptions/components/PrescriptionForm.vue', { ...bindings, ...rxHelper,
    uuid: { v4: () => `99999999-1919-4191-8191-${String(++uuidCalls).padStart(12, '0')}` } });
  const rx = state(rxComponent); rx.internalShow = true;
  let loadingRx; const originalLoad = rx.loadContext;
  rx.loadContext = () => { loadingRx = originalLoad(); return loadingRx; };
  rx.init(); await loadingRx; assert.equal(rx.form.issuer_doctor_id, doctor.id_login);
  assert.equal(rx.allergyState, 'none');
  rx.form.items[0] = rxHelper.emptyItem({ generic_name: 'PRODUCTO FICTICIO NO USAR', dose: 'QA', administration_route: 'QA', frequency: 'QA', duration: 'QA' });
  const createId = rx.form.create_request_id;
  assert.match(createId, /^[0-9a-f-]{14}4[0-9a-f-]{21}$/);
  networkState.loseDraftResponse = true;
  assert.equal(await rx.saveDraft(false), false); assert.equal(db.prescriptions.length, 1);
  assert.equal(rx.form.id_prescription, ''); assert.equal(rx.form.create_request_id, createId); assert.equal(rx.dirty, true);
  assert.equal(await rx.saveDraft(false), true); assert.equal(db.prescriptions.length, 1);
  assert.equal(rx.form.id_prescription, createId); assert.equal(uuidCalls, 1, 'Retry does not replace the creation key');
  rx.step = 'review'; networkState.loseIssueResponse = true; await rx.issue();
  assert.equal(db.prescriptions.length, 1); assert.equal(db.prescriptions[0].status, 'issued'); assert.equal(rx.internalShow, false);
  let printed = 0;
  const list = state(load('src/views/Patient/Sections/Prescriptions.vue', { ...bindings, PrescriptionForm: {}, openPrescriptionPrintWindow: () => { printed++; return true; } }));
  list.toast = () => {};
  const outputCalls = requests.filter(item => item.url.endsWith('/output')).length;
  assert.equal(await list.openPrintable({ ...db.prescriptions[0], status: 'draft' }, 'printed'), false);
  assert.equal(requests.filter(item => item.url.endsWith('/output')).length, outputCalls);
  assert.equal(await list.openPrintable(db.prescriptions[0], 'printed'), true); assert.equal(printed, 1);
  const staleIssued = clone(db.prescriptions[0]); db.prescriptions[0].status = 'cancelled';
  assert.equal(await list.openPrintable(staleIssued, 'downloaded'), false); assert.equal(printed, 1);
  rx.init(); await loadingRx; assert.notEqual(rx.form.create_request_id, createId, 'A separate new sheet gets a new creation key');

  const monitoringBindings = { ...bindings, DAAppointmentService: AppointmentService, DAMonitoringService: MonitoringService,
    DASweetConfirm: {}, DELETE: '', uuid: { v4: () => '99999999-1919-4191-8191-999999999999' },
    DAMonitorPlanModel: class { constructor() { this.note = ''; this.quote_date_after = ''; } },
    APPOINTMENT_STATUSES: { PENDING: 'pending_confirmation', CONFIRMED: 'confirmed' }, APPOINTMENT_STATUS_COLORS: {}, APPOINTMENT_STATUS_LABELS: {},
    getAppointments: () => [], getAppointmentConfig: () => ({}), normalizeAppointmentConfig: value => value, saveAppointmentConfig: () => {},
    toIsoDate: value => value, formatFecha: value => value.split('-').reverse().join('-'), revertFormatFecha: value => value,
    formatDisplayDate: value => value, addMinutesToTime: () => '11:30', generateDaySlots: () => [], appointmentBlocksAvailability: () => true };
  const monitorActions = load('src/store/modules/monitoring/actions.js', { DAMonitoringService: MonitoringService, DAHasErrorModel: class {}, types });
  const monitorMutations = load('src/store/modules/monitoring/mutations.js', { types });
  const store = new Vuex.Store({ state: { saveMonitorings: [], hasErrorMonitoring: {} }, mutations: monitorMutations, actions: monitorActions });
  const monitor = state(load('src/views/Patient/Sections/MonitoringPlan.vue', monitoringBindings), {
    getAllTreatments: [{ id: 'QA_S19_TREATMENT', name: 'Procedimiento ficticio' }],
    objCita3: { quote_date_now: '2030-10-14', id_cat_treatment_now: 'Revisión de rutina', id_cat_treatment_after: 'Sin retorno previsto', quote_date_after: '', note: 'QA' }, dateNow: '2030-10-14' });
  monitor.saveTracing = payload => store.dispatch('saveTracing', payload); monitor.toastFunction = () => {};
  monitor.onGetMonitoring = async () => {}; monitor.onGetAllTreatment = async () => {};
  auth.permissions = ['px.tab.monitoring', 'tracing.create'];
  monitor.scheduleNewAppointment = true; // A retained UI choice cannot confer agenda rights.
  await monitor.onSaveMonitoring();
  assert.equal(db.tracings.length, 1); assert.equal(db.appointments.length, 0); assert.equal(store.state.saveMonitorings[0].treatment_now, 'Revisión de rutina');
  assert.equal(requests.some(item => /api\/appointment\/(config|doctors|save|list)/.test(item.url)), false);
  auth.permissions.push('px.dates'); monitor.newTracingId = '99999999-1919-4191-8191-888888888888'; monitor.savedNewMonitoring = null;
  monitor.objCita3.quote_date_after = '2030-10-15'; monitor.scheduleNewAppointment = true;
  monitor.selectedAppointmentTime = '11:00'; monitor.selectedAppointmentEndTime = '11:30'; monitor.appointmentDoctorId = doctor.id_doctor_professional_profile;
  networkState.failAppointment = true; await monitor.onSaveMonitoring();
  const clinicalWrites = requests.filter(item => item.url === 'api/tracing/save').length;
  assert.match(monitor.newMonitoringError, /Seguimiento guardado/);
  networkState.failAppointment = false; await monitor.onSaveMonitoring();
  assert.equal(requests.filter(item => item.url === 'api/tracing/save').length, clinicalWrites, 'Appointment retry uses real Vuex/service chain without repeating clinical write');
  assert.equal(db.appointments.length, 1); assert.equal(db.appointments[0].doctorProfileId, doctor.id_doctor_professional_profile);
  assert.equal(db.appointments[0].followUpId, monitor.savedNewMonitoring.id_tracing);
  console.log('PASS S19 frontend integrated contracts: intake→doctor history→consent gate/finalize; prescription creation UUID→lost draft/issue reconciliation→issued-only output; clinical/agenda permission split; real Vuex/services/core partial retry. In-memory HTTP fixtures; no browser, SQL or external messages.');
})().catch(error => { console.error(error); process.exitCode = 1; });
