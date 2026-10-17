const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const load = (file, context) => {
    const sfc = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
    vm.runInNewContext(sfc.split('<script>')[1].split('</script>')[0].replace(/^import[^;]+;\r?\n/gm, '').replace('export default', 'component ='), context);
    return context.component;
};
const bind = (options, props) => {
    const value = { ...props };
    for(const [key, method] of Object.entries(options.methods)) value[key] = method.bind(value);
    Object.assign(value, options.data.call(value));
    for(const [key, getter] of Object.entries(options.computed)) Object.defineProperty(value, key, { get: getter.bind(value), configurable: true });
    return value;
};
(async () => {
    const calls = [], events = [], intervals = [];
    const services = {
        async listSignatureRequests() { return { success: true, data: [] }; },
        async createSignatureRequest(payload) { calls.push(payload); return { success: true, data: { id_document_signature_request: `qa-${payload.channel}`, status: 'pending', public_url: 'https://qa.invalid/sign/d/synthetic-link', token: 'synthetic-token' } }; },
        async sendSignatureRequestEmail(payload) { calls.push({ ...payload, channel: 'email' }); return { success: true, data: { id_document_signature_request: 'qa-email', status: 'pending', email_sent: true } }; }
    };
    const options = load('src/views/Patient/Sections/components/DocumentSignatureOptionsDialog.vue', { component: null, DADocumentService: services, DocumentSignatureQrPanel: {}, DocumentSignatureRequestsList: {}, dialogName: {},
        normalizePhoneForWhatsApp: value => String(value || '').replace(/\D/g, ''), buildWhatsAppSignatureMessage: () => 'Synthetic test message', buildWhatsAppUrl: () => 'https://qa.invalid/whatsapp', openWhatsAppUrl: () => events.push(['open-whatsapp']),
        window: { setInterval(callback) { intervals.push(callback); return intervals.length; }, clearInterval() {} } });
    const doc = { id_patient_document: 'qa-document', document_type: 'TREATMENT_PLAN_CONSENT', title: 'QA plan consent', status: 'PENDIENTE_FIRMA', requires_patient_signature: 1, requires_tutor_signature: 0, doctor_signature_snapshot: 'QA', signatures: [] };
    const modal = bind(options, { value: true, document: doc, patient: { name: 'QA', surname: 'Patient', telephone: '525510000000', email: 'qa@example.invalid' }, businessName: 'QA Clinic', canSignLocal: true, canRequestRemoteSignature: true, $emit: (...args) => events.push(args) });
    modal.initializeDialog();
    assert.equal(modal.selectedRole, 'PATIENT');
    await modal.createQrRequest();
    assert.equal(calls[0].channel, 'qr');
    assert.equal(modal.activeQrRequest.token, undefined);
    assert.equal(modal.activeQrRequest.public_url, 'https://qa.invalid/sign/d/synthetic-link');
    await modal.sendEmailRequest();
    assert.equal(calls[1].recipient_email, 'qa@example.invalid');
    await modal.createWhatsAppRequest();
    assert.equal(calls[2].recipient_phone, '525510000000');
    assert.equal(modal.whatsappRequest.token, undefined);
    assert.equal(modal.whatsappRequest.public_url, undefined);
    assert.equal(intervals.length, 3, 'All remote channels refresh signed status');
    modal.canRequestRemoteSignature = false;
    const total = calls.length;
    await modal.createQrRequest(); await modal.sendEmailRequest(); await modal.createWhatsAppRequest();
    assert.equal(calls.length, total, 'Denied remote operations cannot call services');
    modal.canSignLocal = false;
    modal.signLocal(); assert.equal(events.some(event => event[0] === 'sign-local'), false);
    modal.canSignLocal = true; modal.isCreating = 'email';
    const oldEvents = events.length; modal.closeDialog(); modal.signLocal(); assert.equal(events.length, oldEvents, 'Delivery cannot be interrupted by another action');
    modal.isCreating = ''; modal.signLocal(); assert.ok(events.some(event => event[0] === 'sign-local'));
    const helperSource = fs.readFileSync(path.join(__dirname, '../../src/domain/treatment-plan/plan.editor.js'), 'utf8');
    const helper = await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`);
    const planServices = {};
    const planOptions = load('src/views/Patient/Sections/TreatmentPlan.vue', { component: null, ...helper, mapActions: () => ({}), mapGetters: () => ({}), VuexMixin: {}, moduleTypes: { TREATMENT: {}, CONFIGURATION: {}, AUTH: {} }, fnTypes: {},
        isD2AuthMode: () => true, DocumentSignatureOptionsDialog: {}, DATreatmentService: planServices, sanitizeHtmlForDocumentSnapshot: value => value, dialogName: {}, fieldError: {}, window: {}, document: { activeElement: null, contains: () => false }, Blob });
    const view = bind(planOptions, { px: { person: { id_person: 'qa-patient', name: 'QA', surname: 'Patient' } }, hasPermission: () => true, authUser: { id_login: 'qa-doctor' }, authRole: 'doctor', $refs: {}, $nextTick: callback => callback ? callback() : Promise.resolve() });
    const data = { patient: { id_person: 'qa-patient', name: 'QA', surname: 'Patient' }, permissions: { view: true, consentSign: true, consentView: true, remoteRequest: true },
        config: { consentVersioningAvailable: true, consentDocumentAvailable: true }, activePlan: { id_treatment_plan: 'qa-plan', review_token: 'synthetic-review', title: 'QA', treatments: [] } };
    view.planLoaded = true; view.localPlanData = data; view.doctorUserId = 'qa-doctor';
    planServices.prepareConsentDocument = async payload => {
        assert.equal(payload.id_person, 'qa-patient'); assert.equal(payload.doctor_user_id, 'qa-doctor'); assert.equal(payload.review_token, 'synthetic-review');
        return { success: true, data: { ...data, activePlan: { ...data.activePlan, consent_document: { ...doc, doctor_name_snapshot: 'Frozen doctor', professional_license_snapshot: 'Frozen license' } } } };
    };
    assert.equal(await view.openSignatureOptions(), true);
    assert.equal(view.showSignatureOptionsDialog, true);
    assert.equal(view.signatureOptionsDocument.id_patient_document, 'qa-document');
    view.openPreparedConsentSignature(view.signatureOptionsDocument);
    assert.equal(view.showConsentDialog, true);
    assert.equal(view.localSignatureRole, 'PATIENT');
    assert.equal(view.currentDoctorName, 'Frozen doctor');
    view.signatureDeliveryBusy = true;
    assert.equal(await view.confirmLeave(), false, 'Route changes cannot interrupt delivery');
    view.signatureDeliveryBusy = false;
    view.preparedConsentDocument.requires_tutor_signature = 1;
    view.localSignatureRole = 'TUTOR'; view.consentSignature = 'Previously applied'; view.onLocalSignatureRoleChanged();
    assert.equal(view.consentSignature, ''); assert.equal(view.localSignerName, ''); assert.equal(view.dirty, true);
    view.localPlanData.permissions.consentSign = false;
    assert.equal(await view.saveConsent(), false, 'A remote-only role cannot capture locally');
    const printed = view.printableConsentHtml({ title: 'QA plan', consent: { patient_signature_role: 'TUTOR', patient_signer_name_snapshot: 'QA Tutor', patient_signature: 'data:image/png;base64,QA',
        signatures_snapshot: [{ signature_role: 'WITNESS1', signer_name_snapshot: 'QA Witness <safe>', signature_image: 'data:image/png;base64,QA' }] } });
    assert.ok(printed.includes('Firma del tutor o representante'));
    assert.ok(printed.includes('QA Tutor'));
    assert.ok(printed.includes('Firma del testigo 1'));
    assert.ok(printed.includes('QA Witness &lt;safe&gt;'), 'Printed witness names are escaped');
    console.log('PASS shared signature options: QR/email/WhatsApp with mocked delivery, local/remote permission separation, token cleanup, refresh of all channels, busy guard, prepared-plan wiring, frozen doctor and role/ink protection. No messages sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
