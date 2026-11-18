'use strict';
// NC1-UX6: identity capture in «Nuevo paciente» uses the system's fields and section layout.
// The real PatientIdentityFields is mounted in JSDOM with stand-in Vuetify controls; the real
// PatientCreate script checks the required sex and the error order. Synthetic data only, no network.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom'); const dom = new JSDOM('<div id="app"></div>');
global.window = dom.window; global.document = dom.window.document;
const Vue = require('vue/dist/vue.common.js'); Vue.config.productionTip = false; Vue.config.devtools = false;
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const script = source => source.split('<script>')[1].split('</script>')[0];
const template = source => source.slice(source.indexOf('<template>') + 10, source.lastIndexOf('</template>'));
const results = [];
const test = async (name, fn) => { await fn(); results.push(name); console.log('PASS ' + name); };

// identityCapture.js as plain functions.
const captureSource = read('src/domain/patient/identityCapture.js');
const exported = [...captureSource.matchAll(/export const (\w+)/g)].map(m => m[1]);
const capture = new Function(captureSource.replace(/export const /g, 'const ') + '\nreturn {' + exported.join(',') + '};')();

// Stand-in Vuetify controls: keep the bound props visible and let the test emit like the real ones.
const stub = name => ({ name, props: ['value', 'items', 'label', 'errorMessages', 'disabled', 'hint', 'maxlength'], template: '<div :class="\'' + name + '\'" :data-label="label"><slot/></div>' });
Vue.component('v-select', stub('v-select')); Vue.component('v-text-field', stub('v-text-field'));
Vue.component('v-icon', { template: '<span class="icon"><slot/></span>' }); Vue.component('v-expand-transition', { template: '<div><slot/></div>' });
const catalogSource = fs.readFileSync(path.join(root, 'src/domain/identity/catalogCapture.js'), 'utf8');
const catalogNames = [...catalogSource.matchAll(/export const (\w+)/g)].map(m => m[1]);
const catalog = new Function(catalogSource.replace(/export const /g, 'const ') + '\nreturn {' + catalogNames.join(',') + '};')();
const catalogDeps = { CatalogReferenceField: stub('catalog-reference-field'), CatalogReferenceList: stub('catalog-reference-list'), ...catalog };
const fieldsSource = read('src/views/Patient/components/PatientIdentityFields.vue');
const Fields = new Function('fieldError', ...Object.keys(catalogDeps), ...exported, script(fieldsSource).replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'return'))({ inserted() {}, componentUpdated() {} }, ...Object.values(catalogDeps), ...exported.map(k => capture[k]));
Fields.template = template(fieldsSource);
const tick = async () => { await Vue.nextTick(); await Vue.nextTick(); };
function mount(props) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const vm = new Vue({ components: { Fields }, data: () => ({ identity: props.value, disabled: !!props.disabled, sexErrors: props.sexErrors || [] }),
    render(h) { return h('Fields', { ref: 'fields', props: { value: this.identity, disabled: this.disabled, sexErrors: this.sexErrors }, on: { input: v => { this.identity = v; }, 'blur-sex': () => { this.blurred = true; } } }); } }).$mount(host);
  const control = label => { const found = []; const walk = c => { c.$children.forEach(child => { if (child.label === label) found.push(child); walk(child); }); }; walk(vm); return found[0]; };
  return { vm, control, labels: () => Array.from(vm.$el.querySelectorAll('[data-label]')).map(e => e.dataset.label) };
}

(async () => {
  await test('catalogs match the shared IdentityFields component', async () => {
    const shared = read('src/components/identity/IdentityFields.vue');
    // NC1 identidad simple: IdentityFields now uses system controls (imports a directive) and shows each code as
    // a short label + format hint. Keys, families, enumerations and sex options must still match UX6.
    const options = new Function('fieldError', ...Object.keys(catalogDeps), script(shared).replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'return'))({}, ...Object.values(catalogDeps));
    const ctx = { ...options.data.call({ _uid: 1 }), kind: 'patient', value: {}, canManage: false };
    const enums = options.computed.enumerations.call(ctx), refs = options.computed.references.call(ctx);
    assert.deepEqual(capture.PATIENT_IDENTITY_ENUMS.map(e => e.key), Object.keys(enums));
    capture.PATIENT_IDENTITY_ENUMS.forEach(e => { assert.deepEqual(e.options, enums[e.key]); assert.equal(e.label, ctx.labels[e.key]); });
    assert.deepEqual(capture.PATIENT_IDENTITY_REFERENCES.map(r => [r.key, r.family]), refs.map(r => [r.key, r.family]));
    assert.deepEqual(options.methods.items.call(ctx, ctx.sexes).map(i => [i.value, i.text]), [['', 'Sin capturar'], ['1', 'Hombre'], ['2', 'Mujer'], ['3', 'Intersexual']]);
    assert.doesNotMatch(template(shared), /SurnameStatus|Declara no tener|Tiene apellido/);
    assert.deepEqual(capture.BIOLOGICAL_SEX, { 1: 'Hombre', 2: 'Mujer', 3: 'Intersexual' });
  });

  await test('pending values stay null and nothing is invented', async () => {
    assert.deepEqual(capture.withField({}, 'genderIdentity', ''), { genderIdentity: null });
    assert.deepEqual(capture.withCurp({}, ' xexx010101mnexxxa8 '), { curp: { value: 'XEXX010101MNEXXXA8', kind: 'real' } });
    assert.deepEqual(capture.withCurp({ curp: { value: 'A', kind: 'generic', reason: 'QA' } }, 'b'), { curp: { value: 'B', kind: 'generic', reason: 'QA' } });
    assert.deepEqual(capture.withCurp({ curp: { value: 'A', kind: 'real' } }, '  '), { curp: null });
    const nationality = capture.PATIENT_IDENTITY_REFERENCES.find(r => r.key === 'nationality'), municipality = capture.PATIENT_IDENTITY_REFERENCES.find(r => r.key === 'residence.municipality');
    assert.deepEqual(capture.withReference({}, nationality, ' MEX '), { nationality: { family: 'renapo.nationality', code: 'MEX' } });
    assert.deepEqual(capture.withReference({ residence: { entity: { family: 'inegi.state', code: '09' } } }, municipality, '09015'), { residence: { entity: { family: 'inegi.state', code: '09' }, municipality: { family: 'inegi.municipality', code: '09015' } } });
    assert.deepEqual(capture.withReference({ nationality: { code: 'MEX' } }, nationality, ''), { nationality: null });
    assert.deepEqual(capture.withList({}, 'affiliations', 'sis.affiliation', ' 1, ,2 '), { affiliations: [{ family: 'sis.affiliation', code: '1' }, { family: 'sis.affiliation', code: '2' }] });
    assert.deepEqual(capture.withList({}, 'affiliations', 'sis.affiliation', ' , '), { affiliations: null });
    assert.equal(capture.selectItems(capture.BIOLOGICAL_SEX)[0].text, 'Sin capturar');
  });

  await test('fields render as system controls and write the identity value', async () => {
    const { vm, control, labels } = mount({ value: {} });
    assert.deepEqual(labels(), ['Sexo biológico *', 'Género, opcional', '¿Se autodenomina indígena?, opcional', '¿Se autodenomina afromexicano/a?, opcional', 'Situación migratoria, opcional', 'CURP, opcional', 'País de nacimiento: clave', 'Entidad de nacimiento: clave DGIS', 'Nacionalidad: clave RENAPO', 'País de procedencia: clave', 'País de residencia: clave', 'Entidad de residencia: EE', 'Municipio: EEMMM', 'Localidad: EEMMMLLLL', 'Código postal', 'Afiliación']);
    assert.equal(vm.$el.querySelectorAll('select, input').length, 0, 'No native controls next to the Vuetify ones');
    control('Sexo biológico *').$emit('change', '2'); await tick(); control('Situación migratoria, opcional').$emit('change', 'returned'); await tick();
    control('CURP, opcional').$emit('input', 'xexx010101mnexxxa8'); await tick();
    assert.deepEqual(labels().slice(6, 7), ['Tipo de CURP']);
    control('Tipo de CURP').$emit('change', 'generic'); await tick();
    control('Motivo de CURP genérica').$emit('input', 'Sin documento QA'); await tick();
    control('Nacionalidad: clave RENAPO').$emit('input', { family: 'renapo.nationality', code: 'MEX' }); await tick();
    control('Afiliación').$emit('input', [{ family: 'sis.affiliation', code: '1' }]); await tick();
    control('Sexo biológico *').$emit('blur'); await tick();
    assert.equal(vm.blurred, true);
    assert.deepEqual(vm.identity, { biologicalSex: '2', migrantStatus: 'returned', curp: { value: 'XEXX010101MNEXXXA8', kind: 'generic', reason: 'Sin documento QA' }, nationality: { family: 'renapo.nationality', code: 'MEX' }, affiliations: [{ family: 'sis.affiliation', code: '1' }] });
    control('Situación migratoria, opcional').$emit('change', ''); await tick();
    assert.equal(vm.identity.migrantStatus, null, 'Choosing «Sin capturar» returns the value to pending');
  });

  await test('keys disclosure is a labelled toggle, closed by default', async () => {
    const { vm } = mount({ value: {} });
    const toggle = vm.$el.querySelector('.patient-identity-toggle'), panel = vm.$el.querySelector('#patient-identity-references');
    assert.equal(toggle.getAttribute('type'), 'button'); assert.equal(toggle.getAttribute('aria-controls'), 'patient-identity-references');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false'); assert.equal(panel.style.display, 'none');
    toggle.click(); await tick();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true'); assert.equal(panel.style.display, '');
  });

  await test('sex error and disabled state reach the field', async () => {
    const { control } = mount({ value: {}, disabled: true, sexErrors: ['Selecciona el sexo biológico.'] });
    assert.deepEqual(control('Sexo biológico *').errorMessages, ['Selecciona el sexo biológico.']);
    assert.equal(control('Sexo biológico *').disabled, true); assert.equal(control('CURP, opcional').disabled, true);
  });

  await test('Nuevo paciente places identity as a section of the form', async () => {
    const source = read('src/views/Patient/PatientCreate.vue'), markup = template(source);
    assert.doesNotMatch(markup, /<identity-fields/); assert.doesNotMatch(source, /components\/identity\/IdentityFields/);
    const personal = markup.indexOf('<p>Datos personales</p>'), identity = markup.indexOf('<p>Identidad del paciente</p>'), optional = markup.indexOf('<p>Datos opcionales</p>');
    assert.ok(personal > 0 && personal < identity && identity < optional, 'Datos personales → Identidad → Datos opcionales');
    const section = markup.slice(markup.lastIndexOf('<article class="patient-create-section">', identity), optional);
    assert.match(section, /<patient-identity-fields ref="biologicalSex" v-model="identity"[^>]*:sex-errors="fieldError\('biologicalSex'\)"[^>]*@blur-sex="touchField\('biologicalSex'\)"/);
  });

  await test('required sex: error summary follows the form order and focuses the field', async () => {
    const source = read('src/views/Patient/PatientCreate.vue');
    const context = { component: null };
    for (const file of ['src/domain/patient/administrative.validation.js']) vm.runInNewContext(read(file).replace(/export const /g, 'var '), context);
    Object.assign(context, { PatientIdentityFields: {}, mapGetters: () => ({}), moduleTypes: {}, fnTypes: {}, VuexMixin: {}, fieldError: {}, DAPxService: {}, newAgendaRequestId: () => 'qa', peekAgendaReturn: () => null, setAgendaCreatedPatient: () => false, authorizationContext: () => ({}), isCurrentAuthorization: () => true });
    vm.runInNewContext(script(source).replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    const options = context.component, state = { $store: {}, ...options.data.call({ $store: {} }) };
    for (const [key, fn] of Object.entries(options.computed)) Object.defineProperty(state, key, { get: fn.bind(state) });
    for (const [key, fn] of Object.entries(options.methods)) state[key] = fn.bind(state);
    assert.deepEqual(Object.keys(state.formErrors), ['name', 'firstSurname', 'birthDate', 'mobilePhone', 'biologicalSex']);
    Object.assign(state.form, { name: 'Ana', firstSurname: 'QA', birthDate: '1990-05-04', mobilePhone: '5500000099', postalCode: '12', localPhone: '12' });
    assert.deepEqual(Object.keys(state.formErrors), ['biologicalSex', 'localPhone', 'postalCode'], 'Identity comes before the optional and address sections');
    state.identity = { biologicalSex: '3' };
    assert.deepEqual(Object.keys(state.formErrors), ['localPhone', 'postalCode']);
    state.identity = {}; assert.deepEqual([...state.fieldError('biologicalSex')], []);
    state.touchField = field => { state.touched = { ...state.touched, [field]: true }; }; state.touchField('biologicalSex');
    assert.deepEqual([...state.fieldError('biologicalSex')], ['Selecciona el sexo biológico.']);
    let focused = false, scrolled = false;
    state.$nextTick = fn => fn(); state.$refs = { biologicalSex: { $el: { scrollIntoView() { scrolled = true; } }, focus() { focused = true; } } };
    state.focusField('biologicalSex'); assert.equal(focused && scrolled, true, 'Error summary button reaches the sex field');
    state.identity = { biologicalSex: '2', curp: { value: 'XEXX010101MNEXXXA8', kind: 'real' } }; state.form.postalCode = ''; state.form.localPhone = '';
    const payload = state.buildPayload();
    assert.deepEqual(JSON.parse(JSON.stringify(payload.identity)), { biologicalSex: '2', curp: { value: 'XEXX010101MNEXXXA8', kind: 'real' }, givenNames: 'Ana', firstSurname: 'QA', secondSurname: null, birthDate: '1990-05-04' });
  });

  console.log(`PASS: ${results.length} NC1-UX6 groups. Synthetic data only; no backend, database or print.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
