'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), interaction = require('./agenda-test-helpers.cjs');
function load(file, bindings = {}) {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (source.includes('<script>')) source = source.split('<script>')[1].split('</script>')[0];
  const names = [...source.matchAll(/export (?:const|function) (\w+)/g)].map(m => m[1]);
  const defaultExport = source.includes('export default');
  source = source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\r?\n/gm, '').replace(/export (const|function)/g, '$1').replace('export default', 'const component =');
  return new Function(...Object.keys(bindings), source + '\nreturn ' + (defaultExport ? 'component' : '{' + names.join(',') + '}'))(...Object.values(bindings));
}
const storage = load('src/domain/appointments/appointment.storage.js');
const service = {}, patients = {};
const bindings = { ...storage, ...load('src/domain/appointments/availability.js', storage), ...interaction,
  VuexMixin: {}, mapActions: () => ({}), mapGetters: () => ({}), moduleTypes: {}, fnTypes: {}, ProfessionalAgendaConfig: {}, DAAppointmentService: service, DAPxService: patients,
  getSettingsSections: () => [], buildAppointmentWhatsAppMessage() {}, buildWhatsAppUrl() {}, openWhatsAppUrl() {}, window: { matchMedia: () => ({ matches: false }) } };
const component = load('src/views/dates/dates.vue', bindings);
const now = Date.parse('2030-01-01T16:00:00Z');
const config = { enabled: true, defaultAppointmentDuration: 30, timezone: 'America/Mexico_City', workingDays: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, enabled: true, timeRanges: [{ startTime: '08:00', endTime: '20:00' }] })), blockedDates: [], blockedHours: [] };
const appointment = { doctorProfileId: 'doctor', date: '2030-01-01', startTime: '09:00', endTime: '09:30', status: 'pending_confirmation', title: '', patientName: 'Paciente QA', patientId: 'patient', contactPhone: '+525550000010' };
function store() {
  const subscribers = new Set();
  return { state: { CORE: { AUTH: { authenticated: true, accessRevision: 1, permissions: ['px.dates', 'px.all'], user: { id_login: 'actor', id_business: 'clinic', id_session: 'session' } } } }, subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }, changed() { [...subscribers].forEach(fn => fn()); }, subscribers };
}
function state(shared = store()) {
  const s = { ...component.data(), $store: shared, authUser: shared.state.CORE.AUTH.user, hasPermission: p => shared.state.CORE.AUTH.permissions.includes(p), $route: { query: {} }, $router: { push: async () => {} } };
  for (const [key, fn] of Object.entries(component.methods)) s[key] = fn.bind(s);
  for (const [key, fn] of Object.entries(component.computed)) Object.defineProperty(s, key, { get: fn.bind(s) });
  s.doctors = [{ id_doctor_professional_profile: 'doctor', id_login: 'actor', active: 1 }]; s.selectedDoctorId = 'doctor'; s.selectedDate = appointment.date;
  s.appointmentConfig = config; s.dialogConfig = config; s.agendaClockAt = now;
  s.refreshAgendaClock = () => { s.agendaClockAt = now; }; s.loadDialogDoctor = () => {};
  patients.getById = async id => ({ success: true, data: { person: { id_person: id, name: 'Nombre', surname: 'Actual' } } });
  return s;
}
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
(async () => {
  await test('day, week and list navigation cross month boundaries with correct steps', () => {
    const s = state(); s.selectedDate = '2030-01-31'; s.viewMode = 'day'; s.movePeriod(1); assert.equal(s.selectedDate, '2030-02-01'); s.movePeriod(-1); assert.equal(s.selectedDate, '2030-01-31');
    for (const view of ['week', 'list']) { s.viewMode = view; s.movePeriod(1); assert.equal(s.selectedDate, '2030-02-07'); s.movePeriod(-1); }
  });
  await test('past slots remain selectable, accessible and empty-title creation preserves old titles', () => {
    const s = state(), slot = { ...appointment, selectable: true };
    assert.equal(s.isPastFreeSlot(slot), true); assert.match(s.slotAccessibleName(slot.date, slot), /Horario pasado/);
    assert.equal(s.isPastFreeSlot({ ...slot, appointment }), false);
    s.onSlotClick(slot); assert.equal(s.editingAppointment.title, '');
    s.openAppointment({ ...appointment, id: 'saved', title: 'Nueva cita' }); assert.equal(s.editingAppointment.title, 'Nueva cita');
    assert.equal(s.slotSubtitle({ appointment, status: 'confirmed' }), 'Sin motivo registrado');
  });
  await test('past creation requires explicit confirmation, invalidates on time change, preserves retry key/payload', async () => {
    const s = state(); s.openAppointment(appointment); let calls = 0, sent;
    service.save = async (a, options) => { calls++; if (!sent) sent = JSON.stringify({ a, options }); else assert.equal(JSON.stringify({ a, options }), sent); return calls === 1 ? { success: false, status: 0 } : { success: true }; };
    s.reloadAppointments = async () => true;
    await s.saveAppointment(); assert.equal(s.pastCreationDialog, true); assert.equal(calls, 0);
    s.editingAppointment.startTime = '08:30'; component.watch.pastCreationKey.call(s); assert.equal(s.pastCreationAcknowledged, '');
    await s.saveAppointment(); await s.confirmPastCreation(); assert.equal(calls, 1); assert.ok(s.pendingSave); assert.equal(s.pendingSave.appointment.status, 'pending_confirmation');
    await s.saveAppointment(); assert.equal(calls, 2); assert.equal(s.pastCreationDialog, false); assert.equal(s.appointmentDialog, false);
  });
  await test('historical edits do not acquire new-past warning; saved identity cannot clear or change snapshot', async () => {
    const s = state(); s.openAppointment({ ...appointment, id: 'saved', revision: 1, status: 'confirmed' });
    s.clearSelectedPatient(); s.syncPatientName('other'); assert.equal(s.editingAppointment.patientId, 'patient'); assert.equal(s.editingAppointment.patientName, 'Paciente QA');
    await s.loadLinkedPatientName(); assert.equal(s.linkedPatientName, 'Nombre Actual'); assert.equal(s.originalAppointment.patientName, 'Paciente QA');
    service.save = async () => ({ success: true }); s.reloadAppointments = async () => true; await s.saveAppointment(); assert.equal(s.pastCreationDialog, false);
  });
  await test('late patient identity responses cannot cross dialogs or permission changes', async () => {
    const s = state(); s.openAppointment({ ...appointment, id: 'saved' }); let resolve;
    patients.getById = () => new Promise(r => { resolve = r; }); const pending = s.loadLinkedPatientName();
    s.$store.state.CORE.AUTH.accessRevision++; component.watch.agendaAccessKey.call(s);
    resolve({ success: true, data: { person: { id_person: 'patient', name: 'Private stale name' } } }); await pending;
    assert.equal(s.linkedPatientName, ''); assert.equal(s.appointmentDialog, false);
  });
  await test('patient record handoff retains authorized draft, request id and view only in memory', async () => {
    const shared = store(), s = state(shared); s.openAppointment({ ...appointment, id: 'saved', revision: 1 });
    s.viewMode = 'list'; s.editingAppointment.description = 'Private draft'; const key = s.appointmentRequestId; let route;
    s.$router.push = async value => { route = value; };
    s.openAppointmentRecord(); assert.equal(s.recordLeaveDialog, true); assert.equal(route, undefined);
    await s.navigateToPatientRecord('patient'); assert.deepEqual(route, { name: 'ShowPx', params: { id: 'patient' }, query: { returnKey: 'agenda' } }); assert.doesNotMatch(JSON.stringify(route), /Private draft/);
    const remembered = interaction.peekAgendaReturn(shared, 'patient'); assert.equal(remembered.draft.appointment.description, 'Private draft'); assert.equal(remembered.draft.requestId, key); assert.equal(remembered.view, 'list');
    service.doctors = async () => ({ success: true, data: s.doctors }); service.getConfig = async () => ({ success: true, data: { ...config, doctorProfileId: 'doctor' } }); service.list = async () => ({ success: true, data: [] });
    const restored = state(shared); await restored.init(); assert.equal(restored.viewMode, 'list'); assert.equal(restored.selectedDate, appointment.date); assert.equal(restored.selectedDoctorId, 'doctor'); assert.equal(restored.editingAppointment.description, 'Private draft'); assert.equal(restored.appointmentRequestId, key); assert.equal(interaction.peekAgendaReturn(shared), null);
  });
  await test('failed navigation keeps capture; pending save and lack of px.all never navigate', async () => {
    const s = state(); s.openAppointment({ ...appointment, id: 'saved' }); s.editingAppointment.description = 'Keep'; s.$router.push = async () => { throw Error('blocked'); };
    await s.navigateToPatientRecord('patient'); assert.equal(s.appointmentDialog, true); assert.equal(s.editingAppointment.description, 'Keep'); assert.equal(interaction.peekAgendaReturn(s.$store), null);
    s.pendingSave = { appointment }; s.recordLeaveDialog = false; s.openAppointmentRecord(); assert.equal(s.recordLeaveDialog, false);
    s.pendingSave = null; s.$store.state.CORE.AUTH.permissions = ['px.dates']; s.openAppointmentRecord(); assert.equal(s.recordLeaveDialog, false);
    let fetched = false; patients.getById = async () => { fetched = true; }; await s.loadLinkedPatientName(); assert.equal(fetched, false);
  });
  await test('logout, changed tenant/permissions and another store cannot read or revive a return draft', () => {
    for (const mutation of [s => { s.authenticated = false; }, s => { s.user.id_business = 'other'; }, s => { s.permissions = ['px.dates']; }, s => { s.accessRevision++; }]) {
      const shared = store(); interaction.keepAgendaReturn(shared, { patientId: 'patient', draft: { description: 'private' } });
      assert.equal(interaction.peekAgendaReturn(store()), null); assert.equal(interaction.peekAgendaReturn(shared, 'other'), null);
      mutation(shared.state.CORE.AUTH); shared.changed(); assert.equal(interaction.peekAgendaReturn(shared), null); assert.equal(shared.subscribers.size, 0);
    }
  });
  console.log('PASS CO25 A3: ' + count + ' groups');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
