'use strict';
// NC1-UX4: the real DAHistoryHeader mounted in JSDOM, plus the real PatientShow archive/photo/restore methods.
// Synthetic patients only; no network, database, upload or print. Visual checks at 1280/390 run separately.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom'); const dom = new JSDOM('<div id="app"></div>');
global.window = dom.window; global.document = dom.window.document;
const Vue = require('vue/dist/vue.common.js'); Vue.config.productionTip = false; Vue.config.devtools = false;
const root = path.resolve(__dirname, '../..');
const headerSource = fs.readFileSync(path.join(root, 'src/views/Patient/components/DAHistoryHeader.vue'), 'utf8');
const header = new Function(headerSource.split('<script>')[1].split('</script>')[0].replace('export default', 'return'))();
header.template = headerSource.slice(headerSource.indexOf('<template>') + 10, headerSource.lastIndexOf('</template>'));
Vue.component('v-icon', { template: '<span class="icon"><slot/></span>' });
const showSource = fs.readFileSync(path.join(root, 'src/views/Patient/PatientShow.vue'), 'utf8');
const showTemplate = showSource.split('<script>')[0];
const context = { mapGetters: () => ({}), mapActions: () => ({}), VuexMixin: {}, DAHistoryHeader: {}, DAAlergyAlert: {}, AllergyEditor: {}, PatientAdministrativeForm: {}, DASweetConfirm: {}, DocumentsAndSignatures: {}, DELETE: {}, moduleTypes: { AUTH: {}, PX: 'CORE/PX', CONFIGURATION: {} }, fnTypes: {}, mutationTypes: {}, DAPxService: {} };
vm.runInNewContext(showSource.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
const methods = context.component.methods;

const person = (extra = {}) => ({ id_person: 'synthetic-ux4', name: 'Paciente', surname: 'Sintético UX4', code: '000999', age: 34, active: 1, telephone: '5500000041', ...extra });
const tick = async () => { await Vue.nextTick(); await Vue.nextTick(); };
const label = b => { const c = b.cloneNode(true); c.querySelectorAll('.icon').forEach(i => i.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
const texts = el => Array.from(el.querySelectorAll('button:not(.patient-avatar)')).map(label);
const button = (el, name) => Array.from(el.querySelectorAll('button:not(.patient-avatar)')).find(b => label(b) === name);
const field = (el, label) => { const row = Array.from(el.querySelectorAll('.patient-contact > div')).find(div => div.querySelector('dt').textContent === label); return row ? row.querySelector('dd') : null; };

function mount(props) {
  const events = [];
  const host = document.createElement('div'); document.body.appendChild(host);
  const vm = new Vue({ components: { Header: header }, data: () => ({ props }), render(h) {
    return h('Header', { props: this.props, on: { edit: v => events.push(['edit', v]), 'edit-patient': () => events.push(['edit-patient']), archive: () => events.push(['archive']), restore: () => events.push(['restore']) } });
  } }).$mount(host);
  return { vm, el: vm.$el, events };
}

async function main() {
  const checks = [];
  const base = { canEdit: true, editing: false, archivePending: false, showClinical: true };

  // 1. Active, administrative access: one header, labelled contact data, Edit + discreet Archive, one photo entry.
  let m = mount({ ...base, showClinical: false, px: { person: person(), address: { direction: 'Calle Sintética UX4 número 12, colonia de prueba', cp: '01234' }, emergencyContact: { name: 'Ana Prueba', relationship: 'Hermana', phone: '5500000088' } } });
  await tick();
  assert.deepEqual(texts(m.el), ['Editar datos del paciente', 'Archivar']);
  assert.equal(m.el.querySelectorAll('.patient-avatar[aria-label]').length, 1, 'avatar is the only photo entry');
  assert.equal(m.el.querySelector('button.patient-avatar').getAttribute('aria-label'), 'Actualizar foto del paciente');
  assert.equal(field(m.el, 'Teléfono del paciente').querySelector('a').getAttribute('href'), 'tel:5500000041');
  assert.match(field(m.el, 'Domicilio').textContent, /Calle Sintética UX4.*CP 01234/);
  const emergency = field(m.el, 'Contacto de emergencia');
  assert.equal(emergency.querySelector('.patient-contact-person').textContent, 'Ana Prueba (Hermana)');
  assert.equal(emergency.querySelector('a').getAttribute('href'), 'tel:5500000088');
  assert.doesNotMatch(m.el.textContent, /Afecciones/, 'no clinical data for administrative access');
  assert.match(m.el.textContent, /Paciente activo/);
  button(m.el, 'Archivar').click(); button(m.el, 'Editar datos del paciente').click(); m.el.querySelector('button.patient-avatar').click();
  assert.deepEqual(m.events, [['archive'], ['edit-patient'], ['edit', true]]);
  checks.push('active + admin: labelled phone/address/emergency, Edit and textual Archive once, avatar only photo entry, no clinical data');

  // 2. Emergency contact states from the GET.
  const states = [
    [{}, null, 'API without EC1: no row'],
    [{ emergencyContact: null }, 'Sin contacto de emergencia registrado', 'null'],
    [{ emergencyContact: { name: 'Contacto Sintético con nombre muy largo para comprobar el ajuste', relationship: 'Tutor legal' } }, 'Teléfono sin registrar', 'no phone'],
    [{ emergencyContact: { name: '', phone: '5500000099' } }, 'Sin contacto de emergencia registrado', 'no name']
  ];
  for (const [extra, expected, label] of states) {
    m = mount({ ...base, px: { person: person({ telephone: '' }), address: {}, ...extra } }); await tick();
    const row = field(m.el, 'Contacto de emergencia');
    if (expected === null) assert.equal(row, null, label);
    else assert.match(row.textContent, new RegExp(expected), label);
    assert.match(field(m.el, 'Teléfono del paciente').textContent, /Sin registrar/, 'the patient phone is never replaced');
    if (row) assert.doesNotMatch(row.textContent, /5500000041/);
  }
  checks.push('emergency contact: key absent hides the row; null and nameless → none; without phone → «Teléfono sin registrar»; patient phone never substituted');

  // 3. Clinical access shows conditions once; read-only users see data without management actions.
  m = mount({ ...base, px: { person: person(), query: { current_condition: 'Hipertensión sintética' }, address: {} } }); await tick();
  assert.equal((m.el.textContent.match(/Hipertensión sintética/g) || []).length, 1);
  m = mount({ ...base, canEdit: false, px: { person: person(), address: { direction: 'Calle' }, emergencyContact: null } }); await tick();
  assert.deepEqual(texts(m.el), []); assert.equal(m.el.querySelector('button.patient-avatar'), null);
  assert.match(field(m.el, 'Domicilio').textContent, /Calle/);
  checks.push('clinical: conditions once; read-only: data visible, no actions, avatar not interactive');

  // 4. Photo: with a photo the avatar offers View / Update; without permission it only views.
  let viewed = null;
  Vue.prototype.$viewerApi = options => { viewed = options; };
  m = mount({ ...base, px: { person: person({ profile: 'data:image/png;base64,AAAA' }), address: {} } }); await tick();
  const avatar = m.el.querySelector('button.patient-avatar');
  assert.equal(avatar.getAttribute('aria-haspopup'), 'true');
  avatar.click(); await tick();
  assert.deepEqual(texts(m.el.querySelector('.patient-photo-menu')), ['Ver foto', 'Actualizar foto']);
  button(m.el, 'Ver foto').click(); await tick();
  assert.deepEqual(viewed.images, ['data:image/png;base64,AAAA']); assert.equal(m.events.length, 0, 'viewing does not start an update');
  avatar.click(); await tick(); button(m.el, 'Actualizar foto').click(); await tick();
  assert.deepEqual(m.events, [['edit', true]]); assert.equal(m.el.querySelector('.patient-photo-menu'), null);
  avatar.click(); await tick();
  m.el.querySelector('.patient-avatar-wrap').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
  assert.equal(m.el.querySelector('.patient-photo-menu'), null, 'Esc closes the photo menu');
  viewed = null;
  m = mount({ ...base, canEdit: false, px: { person: person({ profile: 'data:image/png;base64,BBBB' }), address: {} } }); await tick();
  m.el.querySelector('button.patient-avatar').click();
  assert.deepEqual(viewed.images, ['data:image/png;base64,BBBB']); assert.equal(m.events.length, 0);
  checks.push('photo: one entry; with photo View/Update menu (Esc closes), each action alone; without permission view only');

  // 5. Editing hides mutating actions and the photo update.
  m = mount({ ...base, editing: true, px: { person: person(), address: {} } }); await tick();
  assert.deepEqual(texts(m.el), []);
  checks.push('editing: Edit, Archive and photo update hidden');

  // 6. Archived: badge, compact notice, Restore visible, no Archive again.
  m = mount({ ...base, px: { person: person({ active: 0 }), address: {} } }); await tick();
  assert.match(m.el.textContent, /Paciente archivado/); assert.doesNotMatch(m.el.textContent, /Paciente inactivo/);
  assert.match(m.el.querySelector('.patient-archived-notice').textContent, /Restaura al paciente/);
  assert.deepEqual(texts(m.el), ['Restaurar paciente']);
  button(m.el, 'Restaurar paciente').click(); assert.deepEqual(m.events, [['restore']]);
  m = mount({ ...base, archivePending: true, px: { person: person({ active: 0 }), address: {} } }); await tick();
  assert.equal(button(m.el, 'Restaurar paciente').disabled, true);
  m = mount({ ...base, canEdit: false, px: { person: person({ active: 0 }), address: {} } }); await tick();
  assert.equal(button(m.el, 'Restaurar paciente'), undefined, 'restore follows px.new');
  checks.push('archived: «Paciente archivado», notice in header, Restore only (disabled while pending, hidden without permission)');

  // 7. PatientShow: one archive path, guarded while editing; restore and photo guarded too.
  assert.doesNotMatch(showTemplate, /Ficha administrativa/); assert.doesNotMatch(showTemplate, /v-on:delete/);
  assert.equal((showTemplate.match(/requestArchive/g) || []).length, 1, 'archive is requested only from the header');
  assert.match(showTemplate, /@restore="restorePatient"/);
  const view = { canManagePatient: true, isArchived: false, archivePending: false, isEdit: true, isDelete: false, isEditProfile: false, confirmSectionLeave: async () => true };
  await methods.requestArchive.call(view); assert.equal(view.isDelete, false, 'no archive with the form open');
  methods.requestProfileEdit.call(view); assert.equal(view.isEditProfile, false, 'no photo update with the form open');
  view.isEdit = false; await methods.requestArchive.call(view); assert.equal(view.isDelete, true);
  let restores = 0; context.DAPxService.restore = async () => { restores++; return { success: true }; };
  const archivedView = { canManagePatient: true, isArchived: true, archivePending: false, isEdit: true, id: 'synthetic-ux4', init: async () => {} };
  await methods.restorePatient.call(archivedView); assert.equal(restores, 0);
  archivedView.isEdit = false; await methods.restorePatient.call(archivedView); assert.equal(restores, 1); assert.equal(archivedView.archivePending, false);
  await methods.restorePatient.call({ ...archivedView, isArchived: false }); assert.equal(restores, 1, 'restore only for archived patients');
  checks.push('PatientShow: no separate card or delete listener, archive only from header, archive/photo/restore blocked while editing');

  console.log(JSON.stringify(checks, null, 2));
  console.log('PASS NC1-UX4: real header and PatientShow methods. JSDOM, synthetic data, no network, upload or print.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
