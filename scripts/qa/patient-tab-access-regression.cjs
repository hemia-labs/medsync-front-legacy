const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const source = fs.readFileSync(path.join(__dirname, '../../src/views/Patient/PatientShow.vue'), 'utf8');
const parsed = compiler.parseComponent(source);
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
const context = { module: { exports: {} }, mapGetters: () => ({}), mapActions: () => ({}),
  moduleTypes: {}, fnTypes: {}, DELETE: '', VuexMixin: {}, DAHistoryHeader: {}, DAAlergyAlert: {},
  AllergyEditor: {}, PatientAdministrativeForm: {}, DASweetConfirm: {}, DocumentsAndSignatures: {} };
vm.runInNewContext(parsed.script.content.replace(/^import .*\r?\n/gm, '').replace('export default', 'module.exports ='), context);
const component = context.module.exports;
function state(permissions, query = {}, hash = '') {
  const s = { ...component.data(), id: 'patient', px: { person: { id_person: 'patient', active: 1 }, access: { clinical: true } },
    clinicalModules: { odontogramEnabled: true, treatmentPlanEnabled: true }, $route: { query, hash },
    hasPermission: permission => permissions.includes(permission) };
  Object.entries(component.methods).forEach(([key, method]) => { s[key] = method.bind(s); });
  Object.entries(component.computed).forEach(([key, method]) => Object.defineProperty(s, key, { get: method.bind(s) }));
  return s;
}
(async () => {
  const follow = ['px.tab.monitoring'];
  const normal = state(follow);
  assert.equal(normal.tab, null);
  await normal.applyRequestedTab();
  assert.equal(normal.tab, 'da-medical-monitoring');
  assert.equal(normal.tabAccessNotice, '');
  for(const route of [{ tab: 'history' }, { tab: 'medical-history' }, { tab: 'clinical_history' }]) {
    const s = state(follow, route);
    await s.applyRequestedTab();
    assert.equal(s.tab, 'da-medical-monitoring');
    assert.match(s.tabAccessNotice, /No tienes permiso.*Historia clínica.*administrador/);
    assert.equal(s.allowedTabs.some(tab => tab.component === 'da-medical-history'), false);
  }
  const hash = state(follow, {}, '#da-medical-history');
  await hash.applyRequestedTab();
  assert.equal(hash.tab, 'da-medical-monitoring');
  assert.ok(hash.tabAccessNotice);
  const allowed = state(['px.tab.history', 'clinical_history.view', ...follow], { tab: 'history' });
  await allowed.applyRequestedTab();
  assert.equal(allowed.tab, 'da-medical-history');
  assert.equal(allowed.tabAccessNotice, '');
  const none = state([], { tab: 'history' });
  await none.applyRequestedTab();
  assert.equal(none.tab, null);
  const intake = state(['clinical_history.intake'], { tab: 'history' });
  intake.px.access.clinical = false;
  await intake.applyRequestedTab();
  assert.equal(intake.canViewClinical, false);
  assert.equal(intake.canCaptureIntake, true);
  const blocked = state(follow);
  blocked.tab = 'da-medical-monitoring';
  assert.equal(await blocked.requestTabChange('da-medical-history'), false);
  assert.equal(blocked.tab, 'da-medical-monitoring');
  assert.ok(blocked.tabAccessNotice);
  const rights = ['px.tab.history', 'clinical_history.view', ...follow];
  const revoked = state(rights);
  revoked.tab = 'da-medical-monitoring';
  revoked.sectionLeaveGuard = async () => { rights.splice(0, 2); return true; };
  assert.equal(await revoked.requestTabChange('da-medical-history'), false);
  assert.equal(revoked.tab, 'da-medical-monitoring');
  console.log('PASS: first allowed tab, denied query/hash/action, authorized history, no tabs, intake-only and revocation during navigation. Template compiles; no DB writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
