const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/views/Patient/Sections/MonitoringPlan.vue'), 'utf8');
  const script = source.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component =');
  const pending = [];
  const context = { component: null, VuexMixin: {}, mapGetters: () => ({}), mapActions: () => ({}), moduleTypes: {}, fnTypes: {},
    DASweetConfirm: {}, DELETE: '', DAMonitorPlanModel: class {}, getAppointmentConfig: () => ({}), getAppointments: () => [],
    formatFecha: value => value.split('-').reverse().join('-'), revertFormatFecha: value => value,
    toIsoDate: value => value || '', DAMonitoringService: { revisions: () => new Promise(resolve => pending.push(resolve)) }
  };
  vm.runInNewContext(script, context);
  const component = context.component;
  const state = component.data();
  Object.entries(component.methods).forEach(([key, method]) => { state[key] = method.bind(state); });
  Object.assign(state, {
    canCancelMonitoring: true, canCreateMonitoring: true, canCorrectMonitoring: true,
    px: { person: { id_person: 'qa-patient' } }, toastFunction: () => {}, onGetMonitoring: async () => {},
    getAllTreatments: [], performedTreatmentOptions: [], hasNextAppointmentDate: value => Boolean(value && value !== '00-00-0000'),
    selectedMonitoring: { revision: 3, status: 'active' }, isReadOnly: false, isEdit: true, isNote: true,
    objCita: { quote_date_now: '2026-10-13', id_cat_treatment_now: 'Existing treatment', quote_date_after: '', id_cat_treatment_after: 'Follow-up', note: 'Unsaved correction' },
    showtto: true, showtto1: true, idtracing: 'qa-note', correctionReason: 'Clarification', updMonitorings: [],
    hasMonitoringActionResult: result => Array.isArray(result) ? Boolean(result.length) : Boolean(result)
  });
  let writes = [];
  state.updTracing = async payload => { writes.push(payload); return { success: false, status: 409, message: 'Conflict, capture retained' }; };
  await state.onUPDMonitoring();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].tracing[0].revision, 3);
  assert.equal(writes[0].tracing[0].change_reason, 'Clarification');
  assert.equal(state.objCita.note, 'Unsaved correction');
  assert.equal(state.isReadOnly, false);
  assert.equal(state.isNote, true);
  assert.equal(state.isLoading, false);
  assert.equal(state.correctionError, 'Conflict, capture retained');
  state.correctionReason = '';
  await state.onUPDMonitoring();
  assert.equal(writes.length, 1, 'Reason is required before request');
  state.correctionReason = 'Reason'; state.canCorrectMonitoring = false;
  await state.onUPDMonitoring();
  assert.equal(writes.length, 1, 'Read-only cannot correct');
  state.canCorrectMonitoring = true; state.selectedMonitoring.status = 'cancelled';
  await state.onUPDMonitoring();
  assert.equal(writes.length, 1, 'Cancelled content stays readonly');

  state.showDelete({ id_tracing: 'qa-note', revision: 3, status: 'active' });
  state.deleteTracing = async payload => { writes.push(payload); return { success: false, message: 'Retry without losing reason' }; };
  await state.onDelete();
  assert.equal(writes.length, 1, 'Cancellation also requires reason');
  state.cancellationReason = 'Duplicate entry';
  await state.onDelete();
  assert.equal(writes.length, 2);
  assert.equal(writes[1].revision, 3);
  assert.equal(state.isDelete, true);
  assert.equal(state.cancellationReason, 'Duplicate entry');
  assert.equal(state.cancellationError, 'Retry without losing reason');

  const load = state.loadMonitoringRevisions({ target: { open: true } });
  state.idtracing = 'different-note';
  pending[0]({ success: true, data: [{ snapshot: { note: 'Previous patient content' } }] });
  await load;
  assert.equal(state.monitoringRevisions.length, 0, 'Old response cannot populate another note');
  assert.equal(state.revisionsLoading, false);
  console.log('PASS S16 editor: correction conflict retains capture, revision and reason submitted, permission guards, cancelled readonly, failed cancellation retains reason, stale history response isolated.');
})().catch(error => { console.error(error); process.exitCode = 1; });
