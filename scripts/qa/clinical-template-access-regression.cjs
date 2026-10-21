const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const compiler = require('vue-template-compiler');
const source = fs.readFileSync(path.join(__dirname, '../../src/views/Patient/Sections/MedicalHistory.vue'), 'utf8');
const parsed = compiler.parseComponent(source);
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
const start = source.indexOf('async loadCurrentTemplate(');
const end = source.indexOf('async loadConsentStatus(', start);
let calls = 0, response;
const methods = vm.runInNewContext('({' + source.slice(start, end) + '})', {
  DAClinicalHistoryTemplateService: { getCurrent: async () => { calls++; return response; } }
});
const state = allowed => ({ canViewCurrentTemplate: allowed, loadRequest: 1,
  currentTemplate: { old: true }, currentTemplateSource: 'old', currentTemplateSchema: { old: true },
  normalizeTemplateSchema: value => value, isValidTemplateSchema: () => true
});
(async () => {
  // Re-enter two different patient records with no template rights: neither may request it.
  for(let i = 0; i < 2; i++) {
    const s = state(false);
    await methods.loadCurrentTemplate.call(s);
    assert.equal(s.currentTemplate, null);
    assert.equal(s.currentTemplateSchema, null);
    assert.equal(s.templateLoadError, true);
  }
  assert.equal(calls, 0);
  response = { success: true, data: { template: { schema_json: { sections: [] } }, source: 'BUSINESS' } };
  const allowed = state(true);
  await methods.loadCurrentTemplate.call(allowed);
  assert.equal(calls, 1);
  assert.equal(allowed.templateLoadError, false);
  response = { success: false, status: 403 };
  const denied = state(true);
  await methods.loadCurrentTemplate.call(denied);
  assert.equal(denied.templateLoadError, true);
  assert.equal(denied.currentTemplate, null);
  console.log('PASS: repeated patient entry makes zero unauthorized template requests; allowed read and denied response handled.');
})().catch(error => { console.error(error); process.exitCode = 1; });
