const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');

const source = fs.readFileSync(path.join(__dirname, '../../src/views/Patient/Sections/MonitoringPlan.vue'), 'utf8');
const parsed = compiler.parseComponent(source);
const template = compiler.compile(parsed.template.content);
assert.deepEqual(template.errors, [], 'Existing Vue 2 template remains compilable');
const script = parsed.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component =');
const statuses = { PENDING: 'pending_confirmation', CONFIRMED: 'confirmed', CANCELLED: 'cancelled', COMPLETED: 'completed', RESCHEDULED: 'rescheduled' };
const calls = [];
let saveAppointment = async () => ({ success: true, data: [{ id: 'appointment-1' }] });
let readHistory = async () => ({ success: true, data: { appointments: [] } });
const iso = value => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 4).includes('-') ? value.split('-').reverse().join('-') : value;
};
const context = {
  ...require('./agenda-test-helpers.cjs'), component: null, VuexMixin: {}, mapGetters: () => ({}), mapActions: () => ({}), moduleTypes: {}, fnTypes: {},
  DASweetConfirm: {}, DELETE: '', DAMonitorPlanModel: class { constructor() { this.quote_date_after = ''; this.note = ''; } },
  uuid: { v4: () => '12345678-1234-4123-8123-123456789012' },
  APPOINTMENT_STATUSES: statuses, APPOINTMENT_STATUS_COLORS: {}, APPOINTMENT_STATUS_LABELS: {},
  getAppointmentConfig: () => ({}), getAppointments: () => [], normalizeAppointmentConfig: value => value, saveAppointmentConfig: () => {},
  toIsoDate: iso, formatFecha: value => value.split('-').reverse().join('-'), revertFormatFecha: value => value,
  formatDisplayDate: value => value, addMinutesToTime: () => '11:30', generateDaySlots: () => [], appointmentBlocksAvailability: () => true,
  DAMonitoringService: {},
  DAAppointmentService: {
    doctors: async () => { calls.push(['doctors']); return { success: true, data: [] }; },
    getConfig: async () => { calls.push(['config']); return { success: true, data: {} }; },
    list: async () => { calls.push(['list']); return { success: true, data: [] }; },
    patientHistory: async (id, query) => { calls.push(['history', id, query]); return readHistory(id, query); },
    save: async (appointment, options) => { calls.push(['save', appointment, options]); return saveAppointment(appointment, options); }
  }
};
vm.runInNewContext(script, context);
const component = context.component;
function state(permissions = ['px.tab.monitoring', 'tracing.create', 'tracing.correct', 'px.dates']) {
  const s = component.data();
  Object.entries(component.methods).forEach(([key, method]) => { s[key] = method.bind(s); });
  Object.entries(component.computed).forEach(([key, getter]) => Object.defineProperty(s, key, { configurable: true, get: () => getter.call(s) }));
  Object.assign(s, {
    $set: (target,key,value) => { target[key]=value; }, permissions, hasPermission: permission => s.permissions.includes(permission),
    px: { person: { id_person: 'patient-1', name: 'QA', surname: 'Paciente' } },
    getAllTreatments: [{ id: 'treatment-1', name: 'Revision de rutina' }], authUser: {},
    toastFunction: () => {}, onGetMonitoring: async () => {}, onGetAllTreatment: async () => {},
    objCita3: { quote_date_now: '2026-10-14', id_cat_treatment_now: 'Revision', quote_date_after: '', id_cat_treatment_after: 'Sin retorno previsto', note: 'Prueba' },
    dateNow: '2026-10-14', appointmentDoctorId: 'doctor-1'
  });
  return s;
}
function appoint(s) {
  s.scheduleNewAppointment = true;
  s.objCita3.quote_date_after = '2030-10-15';
  s.selectedAppointmentTime = '11:00';
  s.selectedAppointmentEndTime = '11:30';
}
function tracingResponse(payload) { return { success: true, data: [{ ...payload.tracing[0], revision: 1 }] }; }

(async () => {
  // A clinical assistant can read appointments but cannot fetch agenda controls or reserve one.
  calls.length = 0;
  const assistant = state(['px.tab.monitoring', 'tracing.create', 'tracing.correct']);
  assistant.saveTracing = async data => tracingResponse(data);
  await assistant.init();
  await assistant.loadAppointmentHistory(true);
  await assistant.reloadAppointmentData('2030-10-15');
  await assistant.loadAppointmentDoctors();
  appoint(assistant); // A stale/tampered UI value must not confer agenda access.
  await assistant.onSaveMonitoring();
  assert.equal(assistant.canViewAppointmentHistory, true);
  assert(calls.some(call => call[0] === 'history'));
  assert(!calls.some(call => ['doctors', 'config', 'list', 'save'].includes(call[0])));
  assert.equal(assistant.savedNewMonitoring.quote_date_after, '00-00-0000');
  assert.equal(assistant.savedNewMonitoring.id_patient_treatment, null);
  assert.equal(assistant.savedNewMonitoring.treatment_after, 'Sin retorno previsto');

  // Partial save followed by a different slot retries only the appointment, preserving the clinical snapshot.
  calls.length = 0;
  const partial = state(); appoint(partial);
  partial.showtto2 = true; partial.ttoSelecionado1 = 'treatment-1';
  let tracingWrites = 0;
  partial.saveTracing = async data => { tracingWrites++; return tracingResponse(data); };
  saveAppointment = async () => ({ success: false, message: 'Horario ocupado' });
  await partial.onSaveMonitoring();
  assert.equal(tracingWrites, 1);
  assert.equal(partial.savedNewMonitoring.id_patient_treatment, 'treatment-1');
  assert.match(partial.newMonitoringError, /Seguimiento guardado/);
  partial.objCita3.quote_date_after = '2030-10-16'; partial.selectedAppointmentTime = '12:00'; partial.selectedAppointmentEndTime = '12:30';
  saveAppointment = async () => ({ success: true, data: [{ id: 'appointment-1' }] });
  await partial.onSaveMonitoring();
  const appointmentWrites = calls.filter(call => call[0] === 'save');
  assert.equal(tracingWrites, 1);
  assert.equal(appointmentWrites.length, 2);
  assert.equal(appointmentWrites[1][1].followUpId, partial.savedNewMonitoring.id_tracing);
  assert.equal(appointmentWrites[1][1].date, '2030-10-16');
  assert.equal(appointmentWrites[1][2].syncFollowUp, true);
  assert.equal(partial.savedNewMonitoring.quote_date_after, '15-10-2030');

  // A lost tracing response keeps a stable create ID, and saves remain locked across both writes.
  const lost = state(); let sent = [];
  lost.saveTracing = async data => { sent.push(data); return sent.length === 1 ? { success: false } : tracingResponse(data); };
  await lost.onSaveMonitoring(); await lost.onSaveMonitoring();
  assert.equal(sent[0].tracing[0].id_tracing, sent[1].tracing[0].id_tracing);
  const locked = state(); appoint(locked); let resolveWrite; let writes = 0;
  locked.saveTracing = data => { writes++; return new Promise(resolve => { resolveWrite = () => resolve(tracingResponse(data)); }); };
  const pending = locked.onSaveMonitoring();
  locked.isLoading = false; // An unrelated list refresh must not unlock the save transaction.
  await locked.onSaveMonitoring(); assert.equal(writes, 1);
  locked.closeModalEdit(); assert.equal(locked.isSavingMonitoring, true);
  resolveWrite(); await pending; assert.equal(locked.isSavingMonitoring, false);

  // Never infer treatment or appointment identity from an equal title.
  const edit = state();
  edit.showModalData({ id_tracing: 'trace-1', status: 'active', revision: 3, treatment_now: 'Revision de rutina', treatment_after: 'Revision', quote_date_now: '14-10-2026' });
  assert.equal(edit.showtto1, true, 'Legacy name remains free text');
  edit.showModalData({ id_tracing: 'trace-1', id_patient_treatment: 'closed-treatment', status: 'active', revision: 3, treatment_now: 'Nombre historico', treatment_after: 'Revision', quote_date_now: '14-10-2026' });
  assert.equal(edit.performedTreatmentOptions[0].name, 'Nombre historico');
  assert.equal(edit.ttoSelecionado2, 'closed-treatment');
  readHistory = async () => ({ success: true, data: { appointments: [
    { id: 'terminal', followUpId: 'trace-1', patientId: 'patient-1', status: statuses.COMPLETED },
    { id: 'wrong-patient', followUpId: 'trace-1', patientId: 'patient-2', status: statuses.PENDING },
    { id: 'same-title', patientId: 'patient-1', title: 'Revision', status: statuses.PENDING }
  ] } });
  assert.equal(await edit.resolveLinkedFollowUpAppointment(), null);
  const lookup = calls.filter(call => call[0] === 'history').at(-1)[2];
  assert.equal(lookup.follow_up_id, 'trace-1'); assert.equal(lookup.active_only, true); assert.equal(lookup.limit, 2);
  edit.correctionReason = 'Aclaracion'; let corrections = [];
  edit.updTracing = async data => { corrections.push(data); return { success: true, data: [{ ...data.tracing[0], revision: 4 }] }; };
  const before = calls.filter(call => call[0] === 'save').length;
  await edit.onUPDMonitoring();
  assert.equal(corrections.length, 1);
  assert.equal(corrections[0].tracing[0].id_patient_treatment, 'closed-treatment');
  assert.equal(calls.filter(call => call[0] === 'save').length, before, 'Clinical correction alone never modifies appointments');

  // If the chosen active appointment becomes terminal, keep its exact ID for server conflict, never create another.
  edit.savedEditMonitoring = null; edit.editAppointmentRequested = true; edit.editCreatesNewAppointment = false;
  edit.editLinkedAppointment = { id: 'selected-active', status: statuses.PENDING, patientId: 'patient-1', followUpId: 'trace-1' };
  edit.objCita.quote_date_after = '2030-10-16'; edit.selectedEditAppointmentTime = '12:00'; edit.selectedEditAppointmentEndTime = '12:30';
  saveAppointment = async () => ({ success: false, message: 'Cita cerrada; consulta Agenda' });
  assert.equal(await edit.syncEditedFollowUpAppointment('Revision'), false);
  const exact = calls.filter(call => call[0] === 'save').at(-1);
  assert.equal(exact[1].id, 'selected-active'); assert.equal(exact[2].explicitNewFollowUp, false);

  // A confirmed clinical correction is not posted again when only the appointment failed.
  edit.savedEditMonitoring = null;
  let correctionWrites = 0;
  edit.updTracing = async data => { correctionWrites++; return { success: true, data: [{ ...data.tracing[0], revision: 5 }] }; };
  await edit.onUPDMonitoring();
  assert.equal(correctionWrites, 1);
  assert(edit.savedEditMonitoring);
  edit.objCita.quote_date_after = '2030-10-17';
  saveAppointment = async () => ({ success: true, data: [{ id: 'selected-active' }] });
  await edit.onUPDMonitoring();
  assert.equal(correctionWrites, 1, 'Appointment retry does not add another clinical revision');
  assert.equal(edit.savedEditMonitoring.quote_date_after, '16-10-2030', 'The originally saved clinical date remains unchanged');

  const future = { date: '2099-01-01', startTime: '10:00' };
  for (const status of [statuses.CANCELLED, statuses.COMPLETED, statuses.RESCHEDULED]) assert.equal(edit.isUpcomingAppointment({ ...future, status }), false);
  assert.equal(edit.isUpcomingAppointment({ ...future, status: statuses.CONFIRMED }), true);

  // Navigation while saving cannot create an appointment for the next patient.
  const switched = state(); appoint(switched); let finish;
  switched.saveTracing = data => new Promise(resolve => { finish = () => resolve(tracingResponse(data)); });
  const saving = switched.onSaveMonitoring(); const priorWrites = calls.filter(call => call[0] === 'save').length;
  switched.px = { person: { id_person: 'patient-2' } }; finish(); await saving;
  assert.equal(calls.filter(call => call[0] === 'save').length, priorWrites);
  assert.equal(switched.savedNewMonitoring, null);

  console.log('PASS CO14 editor: clinical/agenda permissions split; optional booking and required free text; stable ID; partial retry without duplicate; save lock; exact treatment/appointment links; historical snapshots; terminal protection; future statuses; patient-change isolation; Vue template compilation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
