const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../src/views/Home/Home.vue'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const waiting = { summary: [], search: [], appointments: [] };
const deferred = key => new Promise(resolve => waiting[key].push(resolve));
const context = {
  module: { exports: {} }, mapGetters: () => ({}), VuexMixin: {}, moduleTypes: { AUTH: 'auth' }, fnTypes: {},
  isD2AuthMode: () => true, clearClinicalContinuityCache: () => {},
  DAHomeService: { getContinuitySummary: () => deferred('summary'), getPatients: () => deferred('search'), getAppointments: () => deferred('appointments') },
  DAAppointmentService: { list: () => deferred('appointments') }, APPOINTMENT_STATUS_LABELS: {},
  setInterval, clearInterval, setTimeout, clearTimeout, Date, Intl
};
vm.runInNewContext(source.replace(/^import .*;\r?\n/gm, '').replace('export default', 'module.exports ='), context);
const component = context.module.exports;
const home = () => {
  const value = Object.assign(component.data(), { authUser: { id_login: 'a', id_business: 'tenant-a' }, business: null, authPermissions: ['px.all', 'px.dates'], hasPermission: () => true });
  Object.entries(component.methods).forEach(([key, method]) => { value[key] = method.bind(value); });
  Object.entries(component.computed).forEach(([key, getter]) => Object.defineProperty(value, key, { get: () => getter.call(value) }));
  return value;
};
(async () => {
  const h = home();
  const oldSummary = h.loadContinuitySummary();
  h.authUser = { id_login: 'b', id_business: 'tenant-b' }; h.resetClinicalHome();
  const newSummary = h.loadContinuitySummary();
  waiting.summary.shift()({ success: true, data: { patient: 'old-private-data' } }); await oldSummary;
  assert.equal(h.continuitySummary, null); assert.equal(h.isContinuityLoading, true);
  waiting.summary.shift()({ success: true, data: { sections: {}, scope: 'b' } }); await newSummary;
  assert.equal(h.continuitySummary.scope, 'b');
  const older = h.loadContinuitySummary(), newer = h.loadContinuitySummary();
  const oldResolve = waiting.summary.shift(); waiting.summary.shift()({ success: true, data: { sections: {}, scope: 'newer' } }); await newer;
  oldResolve({ success: true, data: { sections: {}, scope: 'older' } }); await older;
  assert.equal(h.continuitySummary.scope, 'newer', 'Out-of-order requests cannot replace newer data');
  h.Param = 'QA'; const search = h.onSearch(); const appointments = h.loadTodayAppointments();
  h.authUser = null; h.resetClinicalHome();
  waiting.search.shift()({ success: true, data: [{ id_person: 'private' }] });
  waiting.appointments.shift()({ success: true, data: [{ id: 'private-appointment' }] });
  await Promise.all([search, appointments]);
  assert.equal(h.patients.length, 0); assert.equal(h.todayAppointments.length, 0); assert.equal(h.showResult, false);
  assert.equal(h.Param, '', 'Search input must not retain a previous patient name after logout');
  h.authUser = { id_login: 'b', id_business: 'tenant-b' };
  const revoked = h.loadContinuitySummary(); h.authPermissions = []; h.resetClinicalHome();
  waiting.summary.shift()({ success: true, data: { private: true } }); await revoked;
  assert.equal(h.continuitySummary, null, 'Permission change invalidates pending replies');
  const ownSummary = { scope: { mode: 'own', doctorName: 'Doctora QA' }, canSelectOwn: true, canSelectTenant: true, sections: {} };
  h.applyContinuitySummary(ownSummary);
  assert.equal(h.homeScopeLabel, 'Mi actividad'); assert.equal(h.homeScopeDoctorName, 'Doctora QA');
  h.Param = 'Paciente QA'; h.patients = [{ id_person: 'qa' }]; h.showResult = true;
  h.selectedScope = 'tenant';
  const failedScope = h.changeHomeScope();
  assert.equal(h.continuitySummary, null);
  assert.equal(h.scopeContext.canSelectTenant, true, 'Scope selector stays available during loading');
  assert.equal(h.Param, 'Paciente QA'); assert.equal(h.patients.length, 1); assert.equal(h.showResult, true);
  waiting.summary.shift()({ success: false, message: 'Connection failure' });
  waiting.appointments.shift()({ success: false }); await failedScope;
  assert.equal(h.scopeContext.canSelectOwn, true, 'Failed indicators do not strand the scope selector');
  assert.equal(h.homeScopeLabel, 'Todo el consultorio'); assert.equal(h.homeScopeDoctorName, '');
  h.selectedScope = '';
  const oldScope = h.changeHomeScope();
  h.selectedScope = 'tenant';
  const newScope = h.changeHomeScope();
  waiting.summary.shift()({ success: true, data: ownSummary });
  waiting.appointments.shift()({ success: true, data: [{ id: 'old-own-appointment' }] });
  await oldScope;
  assert.equal(h.continuitySummary, null); assert.equal(h.todayAppointments.length, 0);
  waiting.summary.shift()({ success: true, data: { ...ownSummary, scope: { mode: 'tenant' } } });
  waiting.appointments.shift()({ success: true, data: [{ id: 'tenant-appointment', doctorName: 'Doctor B' }] }); await newScope;
  assert.equal(h.appointmentDoctor(h.todayAppointments[0]), 'Doctor B');
  assert.equal(h.appointmentDoctor({ doctor_name: 'Doctor C' }), 'Doctor C');
  assert.equal(h.appointmentDoctor({}), 'Doctor sin nombre registrado');
  h.resetClinicalHome();
  assert.equal(h.scopeContext, null, 'Session/permission reset removes prior doctor and scope metadata');
  assert.equal(h.patients.length, 0); assert.equal(h.Param, '');
  const disposed = h.loadContinuitySummary(); component.beforeDestroy.call(h);
  waiting.summary.shift()({ success: true, data: { private: true } }); await disposed;
  assert.equal(h.continuitySummary, null);
  const stores = [new Map([['medsync.home.continuitySummary.v1', 'private'], ['remembered', 'keep']]), new Map([['medsync.home.continuitySummary.v1', 'private']])];
  const cleanupContext = { Vue: { prototype: {} }, REMEMBERED_IDENTIFIER_KEY: 'remembered', window: Object.fromEntries(['localStorage', 'sessionStorage'].map((key, i) => [key, { removeItem: name => stores[i].delete(name) }])) };
  const cleanup = fs.readFileSync(path.resolve(__dirname, '../../src/utils/authStorageCleanup.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export default [\s\S]*$/, '').replace(/export /g, '');
  vm.runInNewContext(cleanup + '\nclearClinicalContinuityCache();', cleanupContext);
  assert.ok(stores.every(store => !store.has('medsync.home.continuitySummary.v1'))); assert.equal(stores[0].get('remembered'), 'keep');
  console.log('PASS S16/S17 Home: session/permission switches, late replies, scope recovery/races, search preservation, doctor labels, logout/disposal, legacy cache cleanup. Executed component methods; no browser/DB.');
})().catch(error => { console.error(error); process.exitCode = 1; });
