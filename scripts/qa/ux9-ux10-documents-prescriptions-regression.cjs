// Local component behavior and real validators. No DB, server, signatures or emission.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const importSource = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
const loadVue = (file, dependencies = {}) => {
    const source = read(file);
    const parsed = compiler.parseComponent(source);
    assert.deepEqual(compiler.compile(parsed.template.content).errors, [], `${file}: template compiles`);
    const context = { component: null, mapGetters: () => ({}), VuexMixin: {}, moduleTypes: { AUTH: {} }, fnTypes: {}, dialogName: {}, fieldError: {}, DocumentSignatureOptionsDialog: {}, PrescriptionForm: {}, uuid: { v4: () => 'qa-request' }, ...dependencies };
    vm.runInNewContext(parsed.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    return context.component;
};
const bind = (options, props) => {
    const view = { ...props };
    for(const [key, method] of Object.entries(options.methods || {})) view[key] = method.bind(view);
    Object.assign(view, options.data.call(view));
    for(const [key, getter] of Object.entries(options.computed || {})) Object.defineProperty(view, key, { configurable: true, get: () => getter.call(view) });
    return view;
};
(async () => {
    const { validatePrescriptionDateRange } = await importSource('src/domain/prescriptions/prescription.filters.js');
    const { getSettingsSections } = await importSource('src/security/settingsAccess.js');
    const editor = await importSource('src/domain/prescriptions/prescription.editor.js');
    const ranges = [
        [{}, true], [{ date_from: '2026-10-16' }, true], [{ date_to: '2026-10-16' }, true],
        [{ date_from: '2026-10-16', date_to: '2026-10-16' }, true],
        [{ date_from: '2026-10-01', date_to: '2026-10-30' }, true],
        [{ date_from: '2026-10-30', date_to: '2026-10-01' }, false],
        [{ date_from: '2026-02-29' }, false], [{ date_to: '2026-02-31' }, false],
        [{ date_from: '2024-02-29' }, true], [{ date_from: ['2026-10-01'] }, false],
        [{ date_to: '01/10/2026' }, false]
    ];
    for(const [filters, valid] of ranges) assert.equal(!validatePrescriptionDateRange(filters), valid, JSON.stringify(filters));

    let listCalls = 0;
    const pageOptions = loadVue('src/views/prescriptions/Prescriptions.vue', { validatePrescriptionDateRange, DAPrescriptionService: { list: async () => { listCalls++; return { success: true, data: [{ folio: 'QA' }] }; } } });
    let focused = 0;
    const page = bind(pageOptions, { hasPermission: () => true, $nextTick: async () => {}, $refs: { filterErrorSummary: { focus: () => focused++ } } });
    page.items = [{ folio: 'previous' }];
    page.filters.date_from = '2026-10-30'; page.filters.date_to = '2026-10-01';
    await page.load();
    assert.equal(listCalls, 0, 'Invalid ranges never query or replace prior results');
    assert.equal(page.items[0].folio, 'previous'); assert.equal(focused, 1); assert.match(page.filterError, /Hasta/);
    page.clearFilters(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(listCalls, 1); assert.equal(page.filterError, '');

    const docsService = { createDocument: async () => assert.fail('Invalid document must never be saved'), getTemplates: async () => ({ success: true, data: [{ id_document_template: 'qa-template', is_active: 1 }] }) };
    const docOptions = loadVue('src/views/Patient/Sections/DocumentsAndSignatures.vue', { getSettingsSections, DADocumentService: docsService, DAPrescriptionService: { doctors: async () => ({ success: true, data: [] }) }, isD2AuthMode: () => true });
    const docs = bind(docOptions, { _uid: 1, px: { person: { id_person: 'qa-patient', age: 30 } }, authRole: 'admin', authUser: { id_login: 'qa-doctor' }, hasPermission: () => true, $refs: {}, $nextTick: callback => callback && callback() });
    docs.openCreate();
    await docs.createDocument('draft');
    assert.equal(docs.createErrors.length, 2); assert.match(docs.createFieldErrors('template')[0], /Primero configura/);
    assert.match(docs.createFieldErrors('doctor')[0], /Primero prepara/);
    assert.equal(docs.canManageTemplates, true);
    docs.authRole = 'assistant'; docs.hasPermission = () => false;
    assert.equal(docs.canManageTemplates, false); assert.equal(docs.canOpenOwnProfile, false); assert.equal(docs.canManageUsers, false);
    docs.notify('error', 'Error visible sin toast'); assert.equal(docs.notification.message, 'Error visible sin toast');
    docs.createForm.diagnosis = 'Captura a conservar';
    const retainedForm = docs.createForm;
    await docs.refreshCreateOptions();
    assert.equal(docs.createForm, retainedForm); assert.equal(docs.createForm.diagnosis, 'Captura a conservar');
    docs.templates = [{ id_document_template: 'qa-template', is_active: '0' }]; assert.equal(docs.activeTemplates.length, 0);

    let updatedDoctors = [];
    const rxOptions = loadVue('src/views/prescriptions/components/PrescriptionForm.vue', { ...editor, getSettingsSections, DAPrescriptionService: { doctors: async () => ({ success: true, data: updatedDoctors }) } });
    const rx = bind(rxOptions, { _uid: 2, authRole: 'admin', authUser: { id_login: 'qa-doctor' }, hasPermission: () => true, $refs: {}, $nextTick: async () => {} });
    rx.form = editor.emptyForm('qa-patient'); rx.form.issuer_doctor_id = 'qa-doctor';
    rx.doctors = [{ id_login: 'qa-doctor', id_doctor_professional_profile: null, can_issue_prescriptions: 0 }];
    assert.equal(rx.check(false), true, 'Preparation does not block an allowed draft');
    assert.equal(rx.check(true), false);
    assert.equal(rx.errors.find(entry => entry.code === 'doctor-profile').href, '/admin?section=doctor-identity');
    assert.equal(rx.errors.find(entry => entry.code === 'doctor-authorization').href, '/admin?section=users');
    assert.match(rx.selectedDoctorWarning, /completar el perfil no concede/);
    rx.form.notes = 'No perder este texto'; const retainedRecipe = rx.form;
    updatedDoctors = [{ id_login: 'qa-doctor', id_doctor_professional_profile: 'qa-profile', professional_profile_active: 1, professional_name: 'Doctor QA', professional_license: 'QA', signature_image: 'qa-placeholder', can_issue_prescriptions: 1 }];
    await rx.refreshDoctors();
    assert.equal(rx.form, retainedRecipe); assert.equal(rx.form.notes, 'No perder este texto'); assert.equal(rx.selectedDoctorWarning, '');
    rx.authRole = 'assistant'; rx.hasPermission = () => false; rx.doctors[0].can_issue_prescriptions = 0;
    assert.equal(rx.canManageUsers, false); assert.equal(rx.canOpenOwnProfile, false);
    console.log('PASS UX9/UX10 documents and prescriptions: date ranges preserve results, actionable inline errors without toast, permission-aware setup, incomplete drafts allowed, identity separate from authorization, refresh preserves captures. No database writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
