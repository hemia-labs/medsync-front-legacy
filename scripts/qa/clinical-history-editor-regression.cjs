const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
    const source = fs.readFileSync(path.join(__dirname, '../../src/domain/clinical-history/history.editor.js'), 'utf8');
    const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const vitalSigns = await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(path.join(__dirname, '../../src/domain/clinical-history/vitalSigns.validation.js'), 'utf8')).toString('base64')}`);
    const settings = await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(path.join(__dirname, '../../src/security/settingsAccess.js'), 'utf8')).toString('base64')}`);
    const sfc = fs.readFileSync(path.join(__dirname, '../../src/views/Patient/Sections/MedicalHistory.vue'), 'utf8');
    const script = sfc.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component =');
    const services = {};
    const context = { component: null, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {},
        isD2AuthMode: () => true, dialogName: {}, fieldError: {}, ...helper, ...vitalSigns, ...settings,
        DAClinicalHistoryService: services, DADocumentService: {}, DAPrescriptionService: {}, DAClinicalHistoryTemplateService: {},
        window: {}, document: {}, setTimeout, clearTimeout };
    vm.runInNewContext(script, context);
    const options = context.component;
    const fresh = () => {
        const state = options.data();
        Object.assign(state, { px: { person: { id_person: 'qa-patient', name: 'QA', surname: 'Test' } },
            hasPermission: () => true, $set: (object, key, value) => { object[key] = value; },
            $nextTick: callback => callback ? callback() : Promise.resolve(), $route: { query: {} }, notify: () => {} });
        Object.entries(options.methods).forEach(([key, method]) => { state[key] = method.bind(state); });
        Object.entries(options.computed).forEach(([key, getter]) => Object.defineProperty(state, key, { get: getter.bind(state), configurable: true }));
        state.clinicalHistory = { id_clinical_history: 'qa-history', status: 'DRAFT', clinical_snapshot_json: {} };
        state.historyLoaded = true; state.isLoading = false;
        state.currentTemplateSchema = { sections: [
            { key: 'consultation', label: 'Consulta', fields: [
                { key: 'reason', label: 'Motivo', type: 'textarea', required: true },
                { key: 'current_condition', label: 'Padecimiento', type: 'textarea', required: true },
                { key: 'disabled', label: 'Disabled', required: true, enabled: false }
            ] },
            { key: 'observations', label: 'Notas', fields: [{ key: 'general', label: 'Observaciones', type: 'textarea' }] },
            { key: 'hidden', label: 'Hidden', enabled: false, fields: [{ key: 'hidden', required: true }] }
        ] };
        state.markSaved();
        state.focusHistoryField = () => {};
        state.loadClinicalHistoryVersions = async () => {};
        return state;
    };
    let state = fresh();
    assert.equal(state.requiredFieldsTotal, 2);
    assert.equal(state.requiredFieldsCompleted, 0, 'Empty optional sections never count as captured requirements');
    state.form.consultation.reason = 'QA';
    assert.equal(state.requiredFieldsCompleted, 1);
    assert.equal(state.captureProgressPercent, 50);
    state.currentTemplateSchema.sections[0].fields.forEach(field => { field.required = false; });
    assert.equal(state.requiredFieldsTotal, 0);
    assert.equal(state.captureProgressPercent, 0, 'Zero requirements must not imply a completed clinical review');
    for (const [type, value, missing] of [['number', 0, false], ['boolean', false, false], ['checkbox', false, true], ['checkbox', true, false], ['multiselect', [], true], ['multiselect', ['QA'], false], ['textarea', '  ', true]]) {
        state.form.observations.general = value;
        assert.equal(state.isDynamicFieldMissing({ key: 'observations' }, { key: 'general', type }), missing);
    }
    state = fresh();
    state.form.consultation.reason = 'x'.repeat(5001);
    state.form.observations.general = 'y'.repeat(5002);
    const errors = state.validateTextLengths().errors;
    assert.equal(errors.length, 2);
    assert.equal(errors[0].fieldLabel, 'Motivo');
    assert.equal(errors[1].sectionLabel, 'Notas');
    assert.equal(await state.saveDraft(false), false);
    assert.equal(state.form.consultation.reason.length, 5001, 'Validation never truncates text');
    assert.equal(state.requiredFieldsCompleted, 0, 'Overlong required text is still pending');
    state = fresh();
    const baseline = state.savedSnapshot;
    state.form.consultation.reason = 'QA unsaved';
    let calls = 0;
    services.updateDraft = async (id) => { assert.equal(id, 'qa-history'); calls++; throw Error('offline'); };
    assert.equal(await state.saveDraft(false), false);
    assert.equal(state.isBusy, false);
    assert.equal(state.dirty, true);
    assert.equal(state.savedSnapshot, baseline);
    assert.equal(state.form.consultation.reason, 'QA unsaved');
    let leave = state.confirmLeave();
    await state.resolveLeave('save');
    assert.equal(state.showLeaveDialog, true, 'Failed save keeps the editor and leave decision open');
    await state.resolveLeave('stay');
    assert.equal(await leave, false);
    assert.equal(state.form.consultation.reason, 'QA unsaved');
    leave = state.confirmLeave();
    await state.resolveLeave('discard');
    assert.equal(await leave, true);
    assert.equal(state.form.consultation.reason, '');
    assert.equal(state.dirty, false);
    state.form.consultation.reason = 'QA saved';
    services.updateDraft = async (id, payload) => {
        assert.equal(id, 'qa-history'); calls++;
        return { success: true, data: { history: { ...state.clinicalHistory, clinical_snapshot_json: JSON.parse(JSON.stringify(payload.clinical_snapshot_json)) } } };
    };
    leave = state.confirmLeave();
    await state.resolveLeave('save');
    assert.equal(await leave, true);
    assert.equal(state.dirty, false);
    assert.equal(state.form.consultation.reason, 'QA saved');
    assert.equal(calls, 3, 'Retry saves the same draft, never creates another');
    const section = { key: 'consultation', fields: [{ key: 'reason', label: 'Motivo' }] };
    const action = { fieldKey: 'reason', value: 'QA replacement' };
    state.applyQuickAction(section, action);
    assert.equal(state.form.consultation.reason, 'QA saved');
    assert.equal(state.showQuickActionDialog, true);
    state.closeQuickActionDialog(false);
    assert.equal(state.form.consultation.reason, 'QA saved');
    state.applyQuickAction(section, action); state.confirmQuickAction(); state.undoQuickAction();
    assert.equal(state.form.consultation.reason, 'QA saved', 'Undo restores the exact previous value');
    state.applyQuickAction(section, action); state.confirmQuickAction();
    state.setDynamicFieldValue(section, section.fields[0], 'QA further edit');
    assert.equal(state.lastQuickAction, null, 'An old undo cannot overwrite a later manual edit');
    services.getByPatient = async () => { throw Error('offline'); };
    await state.loadClinicalHistory();
    assert.equal(state.loadError, true);
    assert.equal(state.form.consultation.reason, 'QA further edit');
    let completeRead;
    services.getByPatient = () => new Promise(resolve => { completeRead = resolve; });
    const pendingRead = state.loadClinicalHistory();
    state.loadRequest++;
    completeRead({ success: true, data: { history: null } });
    await pendingRead;
    assert.equal(state.clinicalHistory.id_clinical_history, 'qa-history', 'Stale responses cannot replace current patient state');
    const parentSfc = fs.readFileSync(path.join(__dirname, '../../src/views/Patient/PatientShow.vue'), 'utf8');
    const parentScript = parentSfc.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'parent =');
    const parentContext = { parent: null, VuexMixin: {}, mapGetters: () => ({}), mapActions: () => ({}), moduleTypes: {}, fnTypes: {},
        DAHistoryHeader: {}, DAAlergyAlert: {}, AllergyEditor: {}, PatientAdministrativeForm: {}, DASweetConfirm: {}, DocumentsAndSignatures: {}, DELETE: {} };
    vm.runInNewContext(parentScript, parentContext);
    const parent = { $nextTick: async () => {}, ...parentContext.parent.data(), allowedTabs: [{ component: 'da-medical-history' }, { component: 'da-patient-prescriptions' }] };
    Object.entries(parentContext.parent.methods).forEach(([key, method]) => { parent[key] = method.bind(parent); });
    parent.ensureValidTab();
    parent.registerSectionGuard(async () => false);
    assert.equal(await parent.requestTabChange('da-patient-prescriptions'), false);
    assert.equal(parent.tab, 'da-medical-history', 'Rejected navigation never unmounts the editor');
    parent.registerSectionGuard(async () => true);
    assert.equal(await parent.requestTabChange('da-patient-prescriptions'), true);
    assert.equal(parent.tab, 'da-patient-prescriptions');
    let focused = '', prevented = false;
    const first = { disabled: false, tabIndex: 0, getClientRects: () => [1], focus: () => { focused = 'first'; } };
    const last = { ...first, focus: () => { focused = 'last'; } };
    const keyEvent = { key: 'Tab', shiftKey: false, currentTarget: { querySelectorAll: () => [first, last] }, preventDefault: () => { prevented = true; } };
    context.document.activeElement = last;
    state.trapDialogFocus(keyEvent);
    assert.equal(focused, 'first'); assert.equal(prevented, true);
    context.document.activeElement = first; keyEvent.shiftKey = true;
    state.trapDialogFocus(keyEvent);
    assert.equal(focused, 'last');
    let printClosed = false;
    context.window.open = () => ({ close: () => { printClosed = true; } });
    services.getById = async () => { throw Error('offline'); };
    await state.printClinicalHistoryById('qa-history');
    assert.equal(state.isBusy, false, 'A print load failure cannot leave navigation permanently blocked');
    assert.equal(printClosed, true);
    state = fresh();
    state.clinicalHistory.revision = 7;
    state.form.consultation.reason = 'Preserve my draft';
    services.updateDraft = async (id, payload) => {
        assert.equal(payload.expected_revision, 7);
        return { success: false, status: 409, message: 'Conflicto de revision', data: { code: 'HISTORY_REVISION_CONFLICT' } };
    };
    assert.equal(await state.saveDraft(false), false);
    assert.equal(state.form.consultation.reason, 'Preserve my draft');
    assert.equal(state.clinicalHistory.revision, 7, 'A conflict cannot silently advance the edit base');
    assert.equal(state.revisionConflict, true); assert.equal(state.dirty, true);
    state.confirmDialog = async () => false;
    let loads = 0;
    services.getById = async () => { loads++; throw Error('offline'); };
    await state.reloadConflictingHistory();
    assert.equal(loads, 0, 'Rejecting replacement preserves the editor');
    state.confirmDialog = async () => true;
    await state.reloadConflictingHistory();
    assert.equal(state.form.consultation.reason, 'Preserve my draft', 'Failed recovery preserves the editor');
    const original = { id_clinical_history: 'h', status: 'DRAFT', revision: 0, clinical_snapshot_json: { consultation: { reason: 'Saved' }, allergies_medications: { current_medications: 'Keep', allergy_revision: 1 } } };
    const afterAllergy = JSON.parse(JSON.stringify(original)); afterAllergy.revision = 1; afterAllergy.clinical_snapshot_json.allergies_medications.allergy_revision = 2;
    assert.equal(helper.canRefreshAllergyRevision(original, afterAllergy, 2), true);
    afterAllergy.clinical_snapshot_json.allergies_medications.current_medications = 'Someone changed medication';
    assert.equal(helper.canRefreshAllergyRevision(original, afterAllergy, 2), false, 'Allergy review cannot acknowledge a concurrent medication edit');
    afterAllergy.clinical_snapshot_json.allergies_medications.current_medications = 'Keep'; afterAllergy.status = 'FINALIZED';
    assert.equal(helper.canRefreshAllergyRevision(original, afterAllergy, 2), false);
    state.clinicalHistory = { status: 'FINALIZED', responsible_snapshot_json: { professional_name: 'Historic doctor', professional_license: '123' } };
    assert.match(state.selectedDoctorLabel, /Historic doctor/);
    const print = state.printableDoctorFields({}, { status: 'FINALIZED' });
    assert.equal(print[1].value, 'Sin copia histórica disponible.');
    state = fresh();
    state.form.vital_signs.weight = '-5'; state.form.vital_signs.oxygen_saturation = '150';
    let clinicalWrites = 0;
    services.updateDraft = async () => { clinicalWrites++; return { success: true }; };
    assert.equal(await state.saveDraft(false), false);
    assert.equal(clinicalWrites, 0, 'Invalid measurements never reach draft persistence');
    assert.equal(state.form.vital_signs.weight, '-5', 'Validation retains capture for correction');
    assert.equal(state.validationErrors.length, 2);
    state.form.vital_signs.weight = '70'; state.form.vital_signs.oxygen_saturation = '98';
    for(const height of ['1.68', '168']) {
        state.form.vital_signs.height = height; delete state.form.vital_signs.height_unit;
        assert.equal(Number(state.getDynamicFieldValue({ key: 'vital_signs' }, { key: 'height' })), 168);
        state.updateBmi(); assert.equal(state.form.vital_signs.bmi, '24.80');
        assert.equal(state.form.vital_signs.height, height, 'Reading/recalculating never rewrites historical height');
        const printField = state.printableField({ key: 'vital_signs' }, { key: 'height', label: 'Talla', type: 'number' }, state.form, {});
        assert.equal(Number(printField.value), 168); assert.match(printField.label, /cm/);
    }
    state.setDynamicFieldValue({ key: 'vital_signs' }, { key: 'height' }, '0.5');
    assert.equal(state.form.vital_signs.height_unit, 'cm');
    assert.equal(state.getDynamicFieldValue({ key: 'vital_signs' }, { key: 'height' }), '0.5', 'Explicit new cm captures bypass the legacy metre heuristic');
    state.authUser = { id_login: 'qa-doctor' }; state.authRole = 'doctor'; state.doctors = [];
    assert.match(state.profilePreparationMessage, /Mi perfil profesional/);
    assert.equal(state.canPrepareOwnProfile, true);
    state.hasPermission = permission => permission !== 'documents.config';
    assert.equal(state.canPrepareDocuments, false, 'Document setup action respects the real settings section permission');
    await state.createSensitiveConsent(); assert.equal(state.showConsentSetupDialog, true);
    assert.equal(clinicalWrites, 0);
    state.clinicalHistory.status = 'FINALIZED'; state.documents = [{ document_type: 'SENSITIVE_DATA_CONSENT', status: 'FIRMADO' }];
    assert.doesNotMatch(state.sensitiveConsentHelpText, /puede finalizarse/);
    assert.match(state.responsibleDoctorHelp, /registrado al cerrar/);
    console.log('PASS clinical history: configured requirements, zero requirements, typed values, all length errors, save failure/retry, leave decisions, quick-action protection/undo and stale/error loads. No browser storage or database writes.');
    console.log('PASS S16: expected revision, conflict preserves text/base, explicit recovery, failed recovery preserves capture, allergy-only revision refresh and historical professional identity.');
})().catch(error => { console.error(error); process.exitCode = 1; });
