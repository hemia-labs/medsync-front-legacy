// NC1 STG-C05-1, lote 1: the clinical history shows and acts on the consent the server applies.
// Real MedicalHistory.vue computed/methods; synthetic services. No network, database, browser or print.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const clone = value => JSON.parse(JSON.stringify(value));

async function main() {
  const root = path.resolve(__dirname, '../..');
  const modules = {};
  for (const file of ['domain/clinical-history/history.identification.js', 'domain/clinical-history/history.editor.js', 'domain/clinical-history/vitalSigns.validation.js', 'security/settingsAccess.js', 'domain/patient/allergy.js']) {
    Object.assign(modules, await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(path.join(root, 'src', file), 'utf8')).toString('base64')}`));
  }
  const source = fs.readFileSync(path.join(root, 'src/views/Patient/Sections/MedicalHistory.vue'), 'utf8');
  const template = source.split('<script>')[0];
  const script = source.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component =');
  const service = {};
  const context = { component: null, ClosedHistoryReader: {}, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, isD2AuthMode: () => true,
    dialogName: {}, fieldError: {}, ...modules, DAClinicalHistoryService: service, DADocumentService: {}, DAPrescriptionService: {}, DAClinicalHistoryTemplateService: {},
    window: {}, document: { visibilityState: 'visible' }, setTimeout, clearTimeout };
  vm.runInNewContext(script, context);
  const options = context.component;

  const REFUSAL = 'synthetic-refusal';
  const SIGNED = 'synthetic-signed';
  const listed = [ // newest first, as the documents list returns them: the signed one is first
    { id_patient_document: SIGNED, document_type: 'SENSITIVE_DATA_CONSENT', status: 'FIRMADO' },
    { id_patient_document: REFUSAL, document_type: 'SENSITIVE_DATA_CONSENT', status: 'NO_FIRMADO_POR_NEGATIVA' }
  ];
  const server = (status, id) => ({ success: true, data: { history: { status: 'DRAFT', clinical_snapshot_json: { consultation: { reason: 'Servidor: no debe sustituir la captura' } } }, consent_status: status, consent_document_id: id } });

  function fresh({ status = 'DRAFT', permissions = () => true, documents = listed } = {}) {
    const state = options.data();
    Object.assign(state, { px: { person: { id_person: 'synthetic-c05', name: 'Paciente', surname: 'Sintético', birthday: '2000-01-31', telephone: '5500000071' }, address: { direction: 'Calle Sintética C05' }, identity: { biologicalSex: '1' } },
      authUser: { id_login: 'synthetic-doctor', name: 'Profesional QA', rol: 'DOCTOR' }, hasPermission: permissions,
      $set: (obj, key, value) => { obj[key] = value; }, $nextTick: fn => fn ? fn() : Promise.resolve(), $route: { query: {} }, $el: { querySelector: () => null }, notify: () => {} });
    for (const [key, method] of Object.entries(options.methods)) state[key] = method.bind(state);
    for (const [key, getter] of Object.entries(options.computed)) Object.defineProperty(state, key, { get: getter.bind(state), configurable: true });
    Object.defineProperty(state, 'patientId', { get: () => 'synthetic-c05', configurable: true });
    Object.defineProperty(state, 'canReadHistory', { get: () => true, configurable: true });
    state.historyLoaded = true; state.isLoading = false; state.documents = clone(documents);
    state.clinicalHistory = { id_clinical_history: 'synthetic-history', status, revision: 1, version_number: 1, clinical_snapshot_json: { identification: state.buildIdentificationSnapshot(), consultation: { reason: 'Motivo guardado' } } };
    state.applyHistoryToForm(state.clinicalHistory);
    state.loadClinicalHistoryVersions = async () => {};
    return state;
  }
  // Isolates the consent gate from the other prerequisites (doctor, fields), which have their own suites.
  function readyToClose(state) {
    Object.defineProperty(state, 'canCurrentUserFinalize', { get: () => true, configurable: true });
    Object.defineProperty(state, 'criticalFieldsStatus', { get: () => [], configurable: true });
    Object.defineProperty(state, 'doctorResponsibleWarning', { get: () => '', configurable: true });
    Object.defineProperty(state, 'contextReady', { get: () => true, configurable: true });
    state.doctorResponsibleUserId = 'synthetic-doctor';
    let record = clone(state.clinicalHistory);
    const calls = { save: 0, finalize: 0 };
    service.updateDraft = async (id, payload) => { calls.save++; record = { ...record, revision: record.revision + 1, doctor_responsible_user_id: payload.doctor_responsible_user_id, clinical_snapshot_json: clone(payload.clinical_snapshot_json) }; return { success: true, data: { history: clone(record) } }; };
    service.finalize = async (id, revision) => { calls.finalize++; assert.equal(revision, record.revision); record = { ...record, status: state.hasConsentRefusal ? 'INCOMPLETE' : 'FINALIZED', revision: record.revision + 1 }; return { success: true, data: { history: clone(record) } }; };
    return calls;
  }
  const checks = [];

  // 1. Signed only.
  let state = fresh({ documents: [listed[0]] });
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  assert.equal(await state.refreshEffectiveConsent(), true);
  assert.equal(state.sensitiveConsentTitle, 'Firmado');
  assert.equal(state.hasSignedConsent, true); assert.equal(state.hasConsentRefusal, false);
  let calls = readyToClose(state);
  await state.openFinalizeDialog();
  assert.equal(state.showFinalizeDialog, true); assert.equal(state.finalizeBlockReason, '');
  state.form.consultation.reason = 'Captura pendiente C05 firmado';
  await state.finalizeHistory();
  assert.equal(calls.finalize, 1); assert.equal(state.clinicalHistory.status, 'FINALIZED');
  assert.equal(state.clinicalHistory.clinical_snapshot_json.consultation.reason, 'Captura pendiente C05 firmado');
  checks.push('signed only: Firmado, finalize enabled, FINALIZED keeps pending capture');

  // 2. 000071 shape: earlier refusal effective, another signed consent listed first.
  state = fresh();
  service.getByPatient = async () => server('NO_FIRMADO_POR_NEGATIVA', REFUSAL);
  await state.refreshEffectiveConsent();
  assert.equal(state.sensitiveConsent.id_patient_document, REFUSAL, 'not the first listed document');
  assert.equal(state.sensitiveConsentTitle, 'Negativa vigente');
  assert.equal(state.hasSignedConsent, false); assert.equal(state.hasConsentRefusal, true);
  assert.equal(state.otherSignedConsentListed, true);
  assert.match(state.sensitiveConsentHelpText, /negativa sigue vigente/); assert.doesNotMatch(state.sensitiveConsentHelpText, /posterior/);
  assert.match(state.finalizeChecklist[1].status, /Negativa vigente: se guardará como incompleta/);
  assert.match(template, /hasConsentRefusal \? 'Marcar incompleta' : 'Finalizar historia clínica'/);
  assert.match(template, /hasConsentRefusal \? 'Guardar historia como incompleta' : 'Finalizar historia clínica'/);
  calls = readyToClose(state);
  await state.openFinalizeDialog(); await state.finalizeHistory();
  assert.equal(calls.finalize, 1); assert.equal(state.clinicalHistory.status, 'INCOMPLETE', 'UI announced incomplete and server closed incomplete');
  checks.push('refusal + other signed listed: effective refusal shown, action and result both incomplete');

  // 3. No consent.
  state = fresh({ documents: [] });
  service.getByPatient = async () => server('SIN_CONSENTIMIENTO', null);
  await state.refreshEffectiveConsent();
  assert.equal(state.sensitiveConsent, null); assert.equal(state.sensitiveConsentTitle, 'Pendiente');
  calls = readyToClose(state);
  assert.match(state.finalizeBlockReason, /consentimiento firmado o una negativa/);
  checks.push('no consent: pending and blocked');

  // 4. Effective document outside the loaded page.
  state = fresh({ documents: [listed[0]] });
  service.getByPatient = async () => server('NO_FIRMADO_POR_NEGATIVA', 'off-page-refusal');
  await state.refreshEffectiveConsent();
  assert.deepEqual([state.sensitiveConsent.id_patient_document, state.sensitiveConsent.status], ['off-page-refusal', 'NO_FIRMADO_POR_NEGATIVA']);
  let opened = null; state.$emit = (name, payload) => { opened = { name, payload }; };
  state.openSensitiveDocument();
  assert.equal(opened.payload.id_patient_document, 'off-page-refusal');
  checks.push('effective id off page: status from server, link opens that document');

  // 5. Read failure blocks closing, keeps capture and offers retry.
  state = fresh();
  calls = readyToClose(state);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.openFinalizeDialog();
  state.form.consultation.reason = 'Captura pendiente durante fallo';
  service.getByPatient = async () => { throw new Error('synthetic network failure'); };
  await state.finalizeHistory();
  assert.equal(calls.save, 0); assert.equal(calls.finalize, 0);
  assert.match(state.saveError, /No se pudo verificar el consentimiento vigente/);
  assert.equal(state.sensitiveConsentTitle, 'Sin verificar');
  assert.match(state.finalizeBlockReason, /No se pudo verificar/);
  assert.equal(state.form.consultation.reason, 'Captura pendiente durante fallo');
  assert.match(template, /retryConsentVerification/);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.retryConsentVerification();
  assert.equal(state.consentRefreshError, ''); assert.equal(state.finalizeBlockReason, '');
  service.getByPatient = async () => ({ success: true, data: { history: null } });
  assert.equal(await state.refreshEffectiveConsent(), false, 'a response without consent_status is not treated as no consent');
  assert.equal(state.sensitiveConsentTitle, 'Sin verificar');
  checks.push('read failure / response without status: blocked, capture kept, retry restores');

  // 6. Change between review and close is detected; the action is not silently reinterpreted.
  state = fresh();
  calls = readyToClose(state);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.openFinalizeDialog();
  service.getByPatient = async () => server('NO_FIRMADO_POR_NEGATIVA', REFUSAL);
  await state.finalizeHistory();
  assert.equal(calls.finalize, 0); assert.equal(calls.save, 0);
  assert.match(state.saveError, /cambió. Revisa la confirmación/);
  assert.equal(state.showFinalizeDialog, true); assert.equal(state.hasConsentRefusal, true);
  await state.finalizeHistory();
  assert.equal(calls.finalize, 1, 'after reviewing the new state the user can close'); assert.equal(state.clinicalHistory.status, 'INCOMPLETE');
  state = fresh(); calls = readyToClose(state);
  service.getByPatient = async () => server('FIRMADO', SIGNED); await state.refreshEffectiveConsent();
  await state.finalizeHistory();
  assert.equal(calls.finalize, 0, 'closing without the reviewed confirmation is refused');
  checks.push('consent changed after review: no request, review again, then close');

  // 7. Refresh only touches consent metadata.
  state = fresh();
  state.form.consultation.reason = 'Captura clínica pendiente C05';
  const historyBefore = JSON.stringify(state.clinicalHistory); const formBefore = JSON.stringify(state.form);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.refreshEffectiveConsent(); await state.refreshPreparation().catch(() => {});
  assert.equal(JSON.stringify(state.clinicalHistory), historyBefore); assert.equal(JSON.stringify(state.form), formBefore);
  let refreshes = 0; service.getByPatient = async () => { refreshes++; return server('FIRMADO', SIGNED); };
  state.onVisibilityChange(); await Promise.resolve();
  assert.equal(refreshes, 1, 'returning to the tab re-reads the effective consent');
  checks.push('refresh keeps draft, history and sections; visibility refresh');

  // 8. Closed history: current consent labelled as current, not as the one used at close.
  state = fresh({ status: 'INCOMPLETE' });
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.refreshEffectiveConsent();
  assert.equal(state.sensitiveConsentTitle, 'Vigente hoy: Firmado');
  assert.match(state.sensitiveConsentHelpText, /vigente hoy; el utilizado al cerrarla está registrado/);
  checks.push('closed history separates current consent from the one used at close');

  // 9. Without documents.view nothing about the consent is presented or acted on.
  state = fresh({ permissions: permission => permission !== 'documents.view' });
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.refreshEffectiveConsent();
  assert.equal(state.sensitiveConsentTitle, 'Sin acceso'); assert.equal(state.hasSignedConsent, false);
  checks.push('no documents.view: Sin acceso, no signed state');

  // 10. C05-R1: answers arriving out of order never replace the newest verified consent.
  const deferred = () => { const pending = []; service.getByPatient = () => new Promise((resolve, reject) => pending.push({ resolve, reject })); return pending; };
  state = fresh(); calls = readyToClose(state);
  let pending = deferred();
  const background = state.refreshEffectiveConsent(); // return to the tab: read A
  const opening = state.openFinalizeDialog(); // confirmation: read B
  assert.equal(pending.length, 2);
  pending[1].resolve(server('NO_FIRMADO_POR_NEGATIVA', REFUSAL));
  await opening;
  assert.equal(state.sensitiveConsentTitle, 'Negativa vigente');
  const reviewedRefusal = state.reviewedConsentKey;
  state.form.consultation.reason = 'Captura durante lecturas invertidas';
  pending[0].resolve(server('FIRMADO', SIGNED));
  assert.equal(await background, false, 'the older answer is ignored');
  assert.equal(state.sensitiveConsentTitle, 'Negativa vigente'); assert.equal(state.hasConsentRefusal, true);
  assert.equal(state.reviewedConsentKey, reviewedRefusal); assert.equal(state.saveError, '');
  assert.equal(state.form.consultation.reason, 'Captura durante lecturas invertidas');
  service.getByPatient = async () => server('NO_FIRMADO_POR_NEGATIVA', REFUSAL);
  await state.finalizeHistory();
  assert.equal(calls.finalize, 1); assert.equal(state.clinicalHistory.status, 'INCOMPLETE');
  // A late error from an older read does not invalidate a newer valid one.
  state = fresh(); calls = readyToClose(state);
  pending = deferred();
  const olderRead = state.refreshEffectiveConsent();
  const newerRead = state.refreshEffectiveConsent();
  pending[1].resolve(server('FIRMADO', SIGNED)); assert.equal(await newerRead, true);
  pending[0].reject(new Error('synthetic late failure')); assert.equal(await olderRead, false);
  assert.equal(state.consentRefreshError, ''); assert.equal(state.sensitiveConsentTitle, 'Firmado'); assert.equal(state.finalizeBlockReason, '');
  // The initial history load takes part in the same sequence.
  pending = deferred();
  const load = state.loadClinicalHistory(state.loadRequest, state.patientId, true);
  const laterRead = state.refreshEffectiveConsent();
  pending[1].resolve(server('NO_FIRMADO_POR_NEGATIVA', REFUSAL)); await laterRead;
  pending[0].resolve(server('FIRMADO', SIGNED)); await load;
  assert.equal(state.sensitiveConsentTitle, 'Negativa vigente', 'an older history load does not overwrite a newer consent read');
  // A newer, different answer while the confirmation is open is shown and requires review.
  state = fresh(); calls = readyToClose(state);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.openFinalizeDialog();
  service.getByPatient = async () => server('NO_FIRMADO_POR_NEGATIVA', REFUSAL);
  state.onVisibilityChange(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.hasConsentRefusal, true); assert.match(state.saveError, /cambió. Revisa la confirmación/);
  await state.finalizeHistory();
  assert.equal(calls.save, 0); assert.equal(calls.finalize, 0, 'the first close after the change only asks to review');
  // A close whose own read was superseded writes nothing.
  state = fresh(); calls = readyToClose(state);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.openFinalizeDialog();
  pending = deferred();
  const supersededClose = state.finalizeHistory();
  const interloper = state.refreshEffectiveConsent();
  pending[1].resolve(server('FIRMADO', SIGNED)); await interloper;
  pending[0].resolve(server('FIRMADO', SIGNED)); await supersededClose;
  assert.equal(calls.save, 0); assert.equal(calls.finalize, 0); assert.match(state.saveError, /se volvió a verificar/);
  checks.push('C05-R1: inverted answers, late error and older load ignored; newer change shown and needs review; superseded close writes nothing');

  // 11. C05-R2: cancelling while the close is verifying really cancels it.
  for (const [label, cancel] of [['Cancel button', s => s.cancelFinalizeDialog()], ['Esc / outside click', s => { s.showFinalizeDialog = false; }]]) {
    state = fresh(); calls = readyToClose(state);
    service.getByPatient = async () => server('FIRMADO', SIGNED);
    await state.openFinalizeDialog();
    state.form.consultation.reason = `Captura conservada tras ${label}`;
    pending = deferred();
    const closing = state.finalizeHistory();
    assert.equal(state.consentChecking, true); assert.equal(calls.save, 0);
    cancel(state);
    pending[0].resolve(server('FIRMADO', SIGNED));
    await closing;
    assert.equal(calls.save, 0, `${label}: no save after cancelling`); assert.equal(calls.finalize, 0, `${label}: no close after cancelling`);
    assert.equal(state.form.consultation.reason, `Captura conservada tras ${label}`); assert.equal(state.clinicalHistory.status, 'DRAFT');
  }
  // Cancelling while the draft is being saved keeps the save but does not close.
  state = fresh(); calls = readyToClose(state);
  service.getByPatient = async () => server('FIRMADO', SIGNED);
  await state.openFinalizeDialog();
  const realUpdate = service.updateDraft;
  service.updateDraft = async (...args) => { state.cancelFinalizeDialog(); return realUpdate(...args); };
  let notified = null; state.notify = (icon, text) => { notified = { icon, text }; };
  await state.finalizeHistory();
  assert.equal(calls.save, 1); assert.equal(calls.finalize, 0); assert.match(notified.text, /No se cerró la historia/);
  // Reopening after cancelling starts a new attempt that closes normally.
  service.updateDraft = realUpdate;
  await state.openFinalizeDialog(); await state.finalizeHistory();
  assert.equal(calls.finalize, 1); assert.equal(state.clinicalHistory.status, 'FINALIZED');
  assert.match(template, /@click="cancelFinalizeDialog">Cancelar</);
  checks.push('C05-R2: Cancel or Esc during verification → zero writes, capture kept; cancel during save → saved, not closed; reopen closes');

  console.log(JSON.stringify(checks, null, 2));
  console.log('PASS NC1 C05 lote 1: consent shown and applied from server consent_status/consent_document_id; refusal → incomplete; failures block with retry; changes need re-review; draft preserved. No API, DB, browser or print.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
