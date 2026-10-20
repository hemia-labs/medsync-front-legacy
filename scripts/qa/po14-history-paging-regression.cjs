'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function load(file, overrides = {}) {
    const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
    const context = { module: { exports: {} }, console, setTimeout, clearTimeout, Blob,
        window: { clearTimeout, setTimeout, removeEventListener() {} }, document: { contains: () => false } };
    const script = parsed.script.content.replace(/^import ([\s\S]*?) from ['"][^'"]+['"];?\r?\n/gm, (_match, binding) => {
        for (const raw of binding.replace(/[{}]/g, '').split(',')) {
            const name = raw.trim().split(/\s+as\s+/).at(-1);
            if (name) context[name] = () => ({});
        }
        return '';
    });
    Object.assign(context, { mapGetters: () => ({}), mapActions: () => ({}),
        moduleTypes: { AUTH: 'auth', TREATMENT: 'treatment' }, fnTypes: {}, validatePrescriptionDateRange: () => '', ...overrides });
    vm.runInNewContext(script.replace('export default', 'module.exports ='), context);
    return context.module.exports;
}
function bind(definition, props = {}) {
    const state = { $store: { getters: { 'auth/getUser': { id_login: 'actor' }, 'auth/getBusiness': { id_business: 'tenant' } } },
        $refs: {}, $emit() {}, $nextTick: callback => callback ? callback() : Promise.resolve(),
        px: { person: { id_person: 'patient' } }, authUser: { id_login: 'actor' }, authBusiness: { id_business: 'tenant' }, ...props };
    for (const [key, method] of Object.entries(definition.methods)) state[key] = method.bind(state);
    Object.assign(state, definition.data.call(state));
    for (const [key, getter] of Object.entries(definition.computed || {})) Object.defineProperty(state, key, { configurable: true, get: getter.bind(state) });
    return state;
}
function pageData(id, page = 1, total = 25) { return { items: [{ id_patient_document: id, document_type: 'GENERAL_CONSENT', status: 'BORRADOR' }], pagination: { page, pageSize: 10, total, totalPages: 3 }, creationHints: [{ id_patient_document: 'off-page', document_type: 'SENSITIVE_DATA_CONSENT', status: 'FIRMADO', _summary: true }] }; }
async function checkDocuments() {
    const calls = [], gates = [];
    const service = { getPatientDocuments: (_patient, params) => { calls.push(plain(params)); const gate = deferred(); gates.push(gate); return gate.promise; },
        getTemplates: async () => ({ success: true, data: [] }), auditAction() {},
        getPatientDocument: async (_patient, id) => ({ success: true, data: [{ id_patient_document: id, status: 'FIRMADO', content_html_snapshot: '<p>Snapshot</p>' }] }) };
    const definition = load('src/views/Patient/Sections/DocumentsAndSignatures.vue', { DADocumentService: service, DAPrescriptionService: { doctors: async () => ({ success: true, data: [] }) } });
    const state = bind(definition);
    let pending = state.load(); gates.shift().resolve({ success: true, data: pageData('first') }); await pending;
    assert.deepEqual(calls[0], { page: 1, page_size: 10, document_filter: 'ALL' });
    assert.equal(state.existingSignedSensitiveConsent.id_patient_document, 'off-page');
    await state.openView(state.existingSignedSensitiveConsent);
    assert.equal(state.selectedDocument.content_html_snapshot, '<p>Snapshot</p>');
    pending = state.changeDocumentFilter('SIGNED'); gates.shift().resolve({ success: true, data: pageData('filtered') }); await pending;
    assert.equal(calls.at(-1).document_filter, 'SIGNED'); assert.equal(calls.at(-1).page, 1);
    const old = state.load(), oldGate = gates.shift();
    const fresh = state.changeDocumentPage(2), newGate = gates.shift();
    newGate.resolve({ success: true, data: pageData('fresh', 2) }); await fresh;
    oldGate.resolve({ success: true, data: pageData('old') }); await old;
    assert.equal(state.documents[0].id_patient_document, 'fresh'); assert.equal(state.documentPage, 2);
    const opened = [], consumed = [];
    state.openView = item => opened.push(item.id_patient_document);
    state.$emit = (event, value) => consumed.push([event, value]);
    pending = state.focusRequestedDocument({ id_person: 'patient', id_patient_document: 'requested' });
    gates.shift().resolve({ success: true, data: pageData('requested', 3) }); await pending;
    assert.equal(calls.at(-1).focus_document, 'requested');
    assert.deepEqual(opened, ['requested']); assert.equal(consumed[0][0], 'document-focus-consumed');
    pending = state.load(); state.authBusiness = { id_business: 'other' };
    gates.shift().resolve({ success: true, data: pageData('foreign') }); await pending;
    assert.equal(state.documents[0].id_patient_document, 'requested');
    pending = state.load(); gates.shift().resolve({ success: false }); await pending;
    assert.ok(state.loadError); assert.equal(state.documents.length, 0);
    pending = state.load(); definition.beforeDestroy.call(state);
    gates.shift().resolve({ success: true, data: pageData('destroyed') }); await pending;
    assert.equal(state.documents.length, 0);
}
async function checkPrescriptions(file) {
    const gates = [], calls = [];
    const service = { list: params => { calls.push(plain(params)); const gate = deferred(); gates.push(gate); return gate.promise; },
        listByPatient: (_id, params) => service.list(params) };
    const definition = load(file, { DAPrescriptionService: service });
    const state = bind(definition);
    const response = (id, page) => ({ success: true, data: { items: [{ id_prescription: id }], pagination: { page, total: 123, totalPages: 13, pageSize: 10 } } });
    let pending = state.load(); gates.shift().resolve(response('first', 1)); await pending;
    assert.equal(calls[0].page_size, 10); assert.equal(state.items[0].id_prescription, 'first');
    const old = state.changePage(2), oldGate = gates.shift();
    pending = state.changePage(3); gates.shift().resolve(response('latest', 3)); await pending;
    oldGate.resolve(response('late', 2)); await old;
    assert.equal(state.page, 3); assert.equal(state.items[0].id_prescription, 'latest');
    pending = state.load(); state.$store.getters['auth/getBusiness'] = { id_business: 'other' };
    gates.shift().resolve(response('foreign', 1)); await pending;
    assert.equal(state.items[0].id_prescription, 'latest');
    pending = state.load(); definition.beforeDestroy.call(state);
    gates.shift().resolve(response('destroyed', 1)); await pending;
    assert.equal(state.items[0].id_prescription, 'latest');
}
async function checkPlans() {
    const definition = load('src/views/Patient/Sections/TreatmentPlan.vue');
    const state = bind(definition), calls = [];
    state.loadConsentContext = () => {};
    state.getTreatmentPlan = async request => { calls.push(plain(request)); return { success: true, data: { patient: { id_person: 'patient' }, activePlan: { id_treatment_plan: 'active' }, history: [], historyPagination: { page: request.params.page, total: 17, totalPages: 4, pageSize: 5 } } }; };
    state.confirmLeave = async () => true;
    await state.loadPlan(); await state.changeHistoryPage(3);
    assert.deepEqual(calls.at(-1), { idPerson: 'patient', params: { page: 3, page_size: 5 } });
    assert.equal(state.localPlanData.activePlan.id_treatment_plan, 'active');
    state.confirmLeave = async () => false; await state.changeHistoryPage(4); assert.equal(state.historyPage, 3);
    state.toastFunction = () => {};
    let mutation;
    await state.performAction(async payload => { mutation = plain(payload); return { success: true }; }, { id_person: 'patient' }, 'Guardado');
    assert.equal(mutation.page, 3); assert.equal(mutation.page_size, 5);
    const gate = deferred(); state.getTreatmentPlan = () => gate.promise;
    const pending = state.loadPlan(); state.loadRequest++;
    gate.resolve({ success: true, data: { patient: { id_person: 'old' } } }); await pending;
    assert.equal(state.localPlanData.patient.id_person, 'patient');
}
async function checkPlanActions() {
    const requests = [], commits = [], gates = [];
    const context = { module: { exports: {} },
        types: new Proxy({}, { get: (_value, key) => key }), fnTypes: {},
        DAHasErrorModel: class { constructor(hasError, message) { this.hasError = hasError; this.message = message; } },
        DATreatmentService: { getTreatmentPlan: (patient, params) => { requests.push({ patient, params }); const gate = deferred(); gates.push(gate); return gate.promise; } } };
    const source = fs.readFileSync(path.join(root, 'src/store/modules/treatment/actions.js'), 'utf8');
    vm.runInNewContext(source.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '').replace('export default actions', 'module.exports = actions'), context);
    const store = { commit: (type, value) => commits.push({ type, value }) }, actions = context.module.exports;
    const old = actions.getTreatmentPlan(store, 'old-patient'), oldGate = gates.shift();
    const fresh = actions.getTreatmentPlan(store, { idPerson: 'current-patient', params: { page: 3, page_size: 5 } });
    gates.shift().resolve({ success: true, data: { patient: { id_person: 'current-patient' } } }); await fresh;
    oldGate.resolve({ success: true, data: { patient: { id_person: 'old-patient' } } }); await old;
    assert.equal(requests[0].patient, 'old-patient'); assert.equal(requests[0].params, undefined);
    assert.deepEqual(plain(requests[1]), { patient: 'current-patient', params: { page: 3, page_size: 5 } });
    const writes = commits.filter(entry => entry.type === 'SET_TREATMENT_PLAN' && entry.value);
    assert.equal(writes.length, 1); assert.equal(writes[0].value.patient.id_person, 'current-patient');
}
(async () => {
    await checkDocuments();
    await checkPrescriptions('src/views/Patient/Sections/Prescriptions.vue');
    await checkPrescriptions('src/views/prescriptions/Prescriptions.vue');
    await checkPlans();
    await checkPlanActions();
    const nav = load('src/components/common/ListPageNav.vue');
    assert.equal(nav.props.pagination.default, null);
    console.log('PASS PO14 frontend: four compiled views, page/filter requests, off-page consent warning/detail/focus, latest reply, tenant changes, disposal, active plan, leave guard and bounded mutation refresh. No API.');
})().catch(error => { console.error(error); process.exitCode = 1; });
