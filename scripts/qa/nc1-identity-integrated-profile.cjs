'use strict';
// NC1 identidad integrada: the real DAProfessionalProfile (Vue 2, JSDOM) with the real identityDraft module and
// synthetic services. One form, one «Guardar perfil», one request with identity + revision; no separate identity
// card, no «Nombre profesional» capture; 409/400/403/network keep the capture and never resend automatically.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="app"></div>');
global.window = dom.window; global.document = dom.window.document;
const Vue = require('vue/dist/vue.common.js'); Vue.config.productionTip = false; Vue.config.devtools = false;
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const draftSource = read('src/domain/identity/identityDraft.js').replace(/^export function /gm, 'function ');
const draft = new Function(draftSource + '\nreturn {editableIdentity,normalizedDraft,identityPatch,composedName,identityFieldError};')();

const sfc = compiler.parseComponent(read('src/views/User/components/DAProfessionalProfile.vue'));
assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
const template = sfc.template.content.replace(/<!--[\s\S]*?-->/g, '');

let requests = [], nextSave = null, nextGet = null, focused = [];
const service = {
  getProfessionalProfile: async () => { requests.push(['get']); return typeof nextGet === 'function' ? nextGet() : nextGet; },
  saveProfessionalProfile: async (id, payload) => { requests.push(['post', JSON.parse(JSON.stringify(payload))]); return typeof nextSave === 'function' ? nextSave(payload) : nextSave; }
};
const deps = {
  IdentityFields: {}, PreparationGuide: {}, focusControl: () => {}, DAUserService: service, buildLicenseLimitMessage: (_r, message) => message,
  mapGetters: () => ({}), moduleTypes: { AUTH: 'auth' }, fnTypes: {}, getSettingsSections: () => [],
  confirmSettingsDiscard: async () => true, registerSettingsNavigationGuard: () => () => {}, ...draft
};
const code = sfc.script.content.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '').replace('export default', 'return');
const options = new Function(...Object.keys(deps), code)(...Object.values(deps));

const identityView = (extra = {}) => ({ contractVersion: 'nc1.identity.v1.1', revision: 1, updatedAt: 'x', provenance: 'captured', qualityIssues: [], catalogValidation: 'unverified',
  givenNames: 'María José', firstSurname: 'De la Prueba', secondSurname: null, firstSurnameStatus: 'present', secondSurnameStatus: 'unknown', birthDate: null, curp: null, birthCountry: null, authorizedPersonnelTypes: null, legacyProfessionalName: null, ...extra });
const profile = (extra = {}) => ({ id_doctor_professional_profile: 'qa-pp', professional_name: 'María José De la Prueba', professional_license: '12345678', university: 'Universidad QA', specialty: '', specialty_license: '',
  professional_phone: null, signature_image: 'consultorios/qa/firma.png', can_issue_prescriptions: 1, can_sign_documents: 0, is_active: 1, identity: identityView(), ...extra });

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function mount(props = {}, loaded = profile()) {
  nextGet = { success: true, data: loaded }; requests = []; focused = [];
  const vm = new Vue({ ...options, template: '<div><span ref="guideIdentity"></span></div>', propsData: { idLogin: 'qa-doctor', ...props },
    computed: { ...options.computed, profileSessionKey() { return 'qa-session'; } } }).$mount();
  vm.$refs.guideIdentity.focus = field => focused.push(field);
  for (let i = 0; i < 5 && vm.loading; i++) await tick();
  return vm;
}
const results = [];
const test = async (name, fn) => { await fn(); results.push(name); console.log('PASS ' + name); };

(async () => {
  await test('one form: no separate identity card, no «Nombre profesional», title «Identidad profesional», one save', async () => {
    assert.doesNotMatch(template, /<identity-editor/);
    assert.doesNotMatch(template, /Nombre profesional/);
    assert.doesNotMatch(template, /Guardar identidad/);
    assert.match(template, /'Identidad profesional'/);
    assert.match(template, /<identity-fields[^>]*kind="professional"[^>]*:heading="false"/);
    assert.match(template, /<identity-fields[^>]*:can-manage="showAdminControls \|\| adminControlsOnly"/);
    assert.equal((template.match(/<da-button-primary/g) || []).length, 1, 'one save action');
    assert.equal(options.components.IdentityFields !== undefined, true);
  });

  await test('load: identity draft without metadata or derived statuses; nothing pending', async () => {
    const vm = await mount();
    assert.equal(vm.identity.givenNames, 'María José'); assert.equal(vm.identity.firstSurnameStatus, undefined); assert.equal(vm.identity.revision, undefined);
    assert.equal(vm.identityRevision, 1); assert.equal(vm.hasUnsavedChanges, false); assert.equal('professional_name' in vm.form, true, 'kept only as loaded data');
    vm.$destroy();
  });

  await test('one action saves names, CURP and a professional field in one request with the identity revision', async () => {
    const vm = await mount();
    vm.identity = { ...vm.identity, secondSurname: '  Ensayo ', curp: { value: 'XEXX850203MNEXXXA1', kind: 'real' } };
    vm.form.university = 'Universidad editada';
    assert.equal(vm.hasUnsavedChanges, true);
    nextSave = payload => ({ success: true, data: profile({ university: payload.university, professional_name: 'María José De la Prueba Ensayo', identity: identityView({ revision: 2, secondSurname: 'Ensayo', secondSurnameStatus: 'present', curp: { value: 'XEXX850203MNEXXXA1', kind: 'real', validationStatus: 'unchecked' } }) }) });
    const done = vm.save(); const again = vm.save(); await done; await again;
    const posts = requests.filter(r => r[0] === 'post'); assert.equal(posts.length, 1, 'double click sends once');
    const payload = posts[0][1];
    assert.deepEqual(payload.identity, { secondSurname: 'Ensayo', curp: { value: 'XEXX850203MNEXXXA1', kind: 'real' } });
    assert.equal(payload.identity_expected_revision, 1); assert.equal(payload.university, 'Universidad editada');
    assert.equal('professional_name' in payload, false, 'no separate display-name capture');
    assert.ok(!/Status/.test(JSON.stringify(payload)));
    assert.equal(vm.identityRevision, 2); assert.equal(vm.hasUnsavedChanges, false); assert.equal(vm.saveError, '');
    vm.$destroy();
  });

  await test('profile-only change does not send identity', async () => {
    const vm = await mount(); vm.form.specialty = 'Pediatría QA';
    nextSave = payload => ({ success: true, data: profile({ specialty: payload.specialty }) });
    await vm.save(); const payload = requests.find(r => r[0] === 'post')[1];
    assert.equal(payload.identity, undefined); assert.equal(payload.identity_expected_revision, undefined);
    vm.$destroy();
  });

  await test('409 identity conflict: nothing saved, capture kept, explicit reload offered, no automatic resend', async () => {
    const vm = await mount();
    vm.identity = { ...vm.identity, givenNames: 'Otra' }; vm.form.university = 'Pendiente';
    nextSave = () => ({ success: false, status: 409, message: 'Revisa el campo de identidad: expectedRevision', data: { code: 'IDENTITY_CONFLICT', field: 'expectedRevision' } });
    await vm.save();
    assert.equal(requests.filter(r => r[0] === 'post').length, 1);
    assert.equal(vm.identityConflict, true); assert.match(vm.saveError, /No se guardó nada/);
    assert.equal(vm.identity.givenNames, 'Otra'); assert.equal(vm.form.university, 'Pendiente'); assert.equal(vm.hasUnsavedChanges, true); assert.equal(vm.uncertainProfile, null);
    assert.match(template, /v-if="identityConflict"[^>]*@click="load\(\)"/);
    vm.$destroy();
  });

  await test('400 field error and 403: mapped to the field with focus, or kept in the alert', async () => {
    const vm = await mount();
    vm.identity = { ...vm.identity, birthCountry: { family: 'sis.country', code: ' 223' } };
    nextSave = () => ({ success: false, status: 400, message: 'Revisa el campo de identidad: birthCountry', data: { code: 'IDENTITY_INVALID', field: 'birthCountry' } });
    await vm.save(); await tick();
    assert.deepEqual(JSON.parse(JSON.stringify(vm.identityErrors)), { birthCountry: ['Revisa el formato de este dato.'] });
    assert.deepEqual(focused, ['birthCountry']); assert.match(vm.saveError, /Revisa «País de nacimiento»/);
    nextSave = () => ({ success: false, status: 403, message: 'No tienes permiso para editar este perfil profesional.', data: { code: 'PERMISSION_DENIED' } });
    await vm.save();
    assert.deepEqual(JSON.parse(JSON.stringify(vm.identityErrors)), {}); assert.equal(vm.saveError, 'No tienes permiso para editar este perfil profesional.');
    assert.equal(vm.identity.birthCountry.code, ' 223', 'capture kept');
    vm.$destroy();
  });

  await test('uncertain result: «Comprobar guardado» compares identity too and never resends', async () => {
    const vm = await mount();
    vm.identity = { ...vm.identity, givenNames: 'Comprobada' };
    nextSave = () => { throw new Error('network'); };
    await vm.save();
    assert.ok(vm.uncertainProfile); assert.match(vm.saveError, /Comprobar guardado/);
    nextGet = { success: true, data: profile({ identity: identityView({ revision: 2, givenNames: 'Otra cosa' }) }) };
    await vm.save();
    assert.equal(requests.filter(r => r[0] === 'post').length, 1, 'checking does not resend');
    assert.match(vm.saveError, /no coincide/);
    vm.uncertainProfile = { id: 'qa-doctor', submitted: JSON.stringify({}), payload: { identity: { givenNames: 'Comprobada' }, identity_expected_revision: 1 } };
    nextGet = { success: true, data: profile({ identity: identityView({ revision: 2, givenNames: 'Comprobada' }) }) };
    await vm.save();
    assert.equal(vm.uncertainProfile, null); assert.equal(vm.identityRevision, 2); assert.equal(vm.identity.givenNames, 'Comprobada');
    assert.equal(requests.filter(r => r[0] === 'post').length, 1);
    vm.$destroy();
  });

  await test('administrators: authorizations view sends flags (+ identity only when changed)', async () => {
    const vm = await mount({ adminControlsOnly: true, showAdminControls: true });
    vm.form.can_sign_documents = true;
    nextSave = payload => ({ success: true, data: profile({ can_sign_documents: payload.can_sign_documents ? 1 : 0 }) });
    await vm.save();
    let payload = requests.filter(r => r[0] === 'post').pop()[1];
    assert.deepEqual(Object.keys(payload).sort(), ['can_issue_prescriptions', 'can_sign_documents', 'is_active']);
    vm.identity = { ...vm.identity, authorizedPersonnelTypes: [{ family: 'sis.personnel_type', code: '01' }] };
    nextSave = () => ({ success: true, data: profile({ identity: identityView({ revision: 2, authorizedPersonnelTypes: [{ family: 'sis.personnel_type', code: '01' }] }) }) });
    await vm.save();
    payload = requests.filter(r => r[0] === 'post').pop()[1];
    assert.deepEqual(payload.identity, { authorizedPersonnelTypes: [{ family: 'sis.personnel_type', code: '01' }] }); assert.equal(payload.identity_expected_revision, 1);
    vm.$destroy();
  });

  await test('discard, legacy name and new profile', async () => {
    let vm = await mount();
    vm.identity = { ...vm.identity, givenNames: 'Descartar' }; vm.discardChanges();
    assert.equal(vm.identity.givenNames, 'María José'); assert.equal(vm.hasUnsavedChanges, false);
    vm.$destroy();
    vm = await mount({}, profile({ professional_name: 'Dra. Nombre Antiguo', identity: identityView({ revision: 0, givenNames: null, firstSurname: null, firstSurnameStatus: 'unknown', legacyProfessionalName: 'Dra. Nombre Antiguo' }) }));
    assert.equal(vm.identityLegacy, 'Dra. Nombre Antiguo'); assert.equal(vm.identityHasNames, false); assert.equal(vm.identity.givenNames, null, 'never split');
    assert.equal(vm.validationMessage(), '', 'legacy name still counts until names are captured');
    vm.$destroy();
    vm = await mount({}, null);
    assert.equal(vm.hasProfile, false); assert.equal(vm.identityRevision, 0); assert.equal(vm.identity.givenNames, null);
    vm.identity = { ...vm.identity, givenNames: 'Nueva', firstSurname: 'Profesional' }; vm.form.professional_license = '87654321';
    nextSave = () => ({ success: true, data: profile({ identity: identityView({ givenNames: 'Nueva', firstSurname: 'Profesional' }) }) });
    await vm.save();
    const payload = requests.filter(r => r[0] === 'post').pop()[1];
    assert.equal(payload.identity_expected_revision, 0); assert.deepEqual(payload.identity, { givenNames: 'Nueva', firstSurname: 'Profesional' });
    vm.$destroy();
  });

  console.log(`PASS: ${results.length} NC1 integrated professional profile groups. Real component and identityDraft; synthetic services.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
