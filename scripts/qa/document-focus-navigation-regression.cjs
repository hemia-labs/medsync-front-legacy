const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const load = (file, context) => {
    const sfc = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInNewContext(sfc.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    return context.component;
};
const context = { component: null, mapGetters: () => ({}), mapActions: () => ({}), VuexMixin: {}, moduleTypes: { AUTH: {}, PX: {}, CONFIGURATION: {} }, fnTypes: {},
    DAHistoryHeader: {}, DAAlergyAlert: {}, AllergyEditor: {}, PatientAdministrativeForm: {}, DASweetConfirm: {}, DocumentsAndSignatures: {}, DocumentSignatureOptionsDialog: {}, DELETE: {}, buildProfilePhotoPayload: () => ({}),
    DADocumentService: {}, DAPrescriptionService: {}, dialogName: {}, fieldError: {}, getSettingsSections: () => [], isD2AuthMode: () => true, window: { setTimeout: () => 1, clearTimeout: () => {} } };
const parentOptions = load('src/views/Patient/PatientShow.vue', { ...context });
const documentOptions = load('src/views/Patient/Sections/DocumentsAndSignatures.vue', { ...context });
const bind = (options, props) => {
    const view = { ...props };
    for(const [key, method] of Object.entries(options.methods)) view[key] = method.bind(view);
    Object.assign(view, options.data.call(view));
    return view;
};
(async () => {
    const parent = bind(parentOptions, { activePatientId: 'qa-patient', hasPermission: () => true });
    parent.allowedTabs = parent.configuration;
    parent.confirmSectionLeave = async () => true;
    const target = { id_patient_document: 'qa-document', document_type: 'SENSITIVE_DATA_CONSENT', open: true };
    const queue = [], opened = [], notices = [];
    const child = () => {
        const view = bind(documentOptions, { patientId: 'qa-patient', $refs: {}, $nextTick: callback => queue.push(callback),
            $emit: (event, request) => { if(event === 'document-focus-consumed') parent.consumeDocumentFocusRequest(request); } });
        view.openView = doc => { opened.push(doc.id_patient_document); view.showDocumentDialog = true; };
        view.notify = (_kind, text) => notices.push(text);
        return view;
    };
    const flush = () => { while(queue.length) queue.shift()(); };
    await parent.openTabByComponent('da-patient-documents', target);
    const request = parent.documentFocusRequest;
    assert.equal(request.id_person, 'qa-patient');
    const first = child();
    first.focusRequestedDocument(request);
    assert.equal(parent.documentFocusRequest, request, 'A request waits for data instead of being lost during loading');
    first.documentsLoaded = true;
    first.documents = [{ id_patient_document: 'qa-document', status: 'PENDIENTE_FIRMA' }];
    first.focusRequestedDocument(request);
    first.focusRequestedDocument(request); // Both watchers can queue the same request.
    assert.equal(parent.documentFocusRequest, null);
    flush(); assert.equal(opened.length, 1, 'Initial explicit request opens once');
    first.showDocumentDialog = false;
    first.focusRequestedDocument(request); flush(); assert.equal(first.showDocumentDialog, false, 'Refreshing does not replay the consumed request');
    await parent.requestTabChange('da-patient-prescriptions');
    await parent.requestTabChange('da-patient-documents');
    const remounted = child(); remounted.documentsLoaded = true; remounted.documents = first.documents;
    remounted.focusRequestedDocument(parent.documentFocusRequest); flush(); assert.equal(remounted.showDocumentDialog, false, 'Returning to Documents mounts without reopening');
    await parent.openTabByComponent('da-patient-documents', target);
    assert.notEqual(parent.documentFocusRequest.requestId, request.requestId);
    remounted.focusRequestedDocument(parent.documentFocusRequest); flush(); assert.equal(opened.length, 2, 'A new explicit click still opens the same document');
    await parent.openTabByComponent('da-patient-documents', target);
    const latest = parent.documentFocusRequest;
    parent.consumeDocumentFocusRequest(request); assert.equal(parent.documentFocusRequest, latest, 'A late acknowledgement cannot clear a newer request');
    parent.confirmSectionLeave = async () => false;
    assert.equal(await parent.requestTabChange('da-patient-prescriptions'), false); assert.equal(parent.documentFocusRequest, latest, 'Rejected navigation retains an unhandled request');
    parent.confirmSectionLeave = async () => true;
    await parent.requestTabChange('da-patient-prescriptions'); assert.equal(parent.documentFocusRequest, null, 'Leaving before data arrives cancels the pending request');
    await parent.openTabByComponent('da-patient-documents'); assert.equal(parent.documentFocusRequest, null, 'Ordinary Documents navigation creates no fake target');
    await parent.openTabByComponent('da-patient-documents', target);
    const empty = child(); empty.documentsLoaded = true;
    empty.focusRequestedDocument(parent.documentFocusRequest); flush(); assert.equal(parent.documentFocusRequest, null); assert.equal(notices.length, 1);
    empty.focusRequestedDocument(empty.handledDocumentFocusRequest); flush(); assert.equal(notices.length, 1, 'Missing consent warns once after a successful empty response');
    await parent.openTabByComponent('da-patient-documents', target);
    const obsolete = parent.documentFocusRequest;
    parent.init = () => {};
    parentOptions.watch.id.call(parent); assert.equal(parent.documentFocusRequest, null, 'Patient changes discard the previous target');
    const other = child(); other.patientId = 'qa-other'; other.documentsLoaded = true; other.documents = first.documents;
    other.focusRequestedDocument(obsolete); flush(); assert.equal(other.showDocumentDialog, false, 'Another patient cannot receive a queued opening');
    const dying = child(); dying.documentsLoaded = true; dying.documents = first.documents;
    dying.focusRequestedDocument({ ...target, requestId: 90, id_person: 'qa-patient' }); documentOptions.beforeDestroy.call(dying); flush(); assert.equal(dying.showDocumentDialog, false, 'Destroying a section cancels its queued DOM work');
    const highlightOnly = child(); highlightOnly.documentsLoaded = true; highlightOnly.documents = first.documents;
    highlightOnly.focusRequestedDocument({ ...target, requestId: 91, id_person: 'qa-patient', open: false }); flush(); assert.equal(highlightOnly.showDocumentDialog, false);
    console.log('PASS consent navigation: one opening per request, reload/remount safety, repeated explicit access, loading/empty data, stale acknowledgements, cancelled navigation, patient changes and unmounted callbacks. No DB writes or signatures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
