'use strict';
// NC1 identidad simple: the shared IdentityFields component (system controls). Replaces the earlier native-control
// browser check. Real template compiled, real methods executed; synthetic values only.
//   - three name fields always present; no surname status selector or «No tiene» declaration;
//   - personnel types only with canManage (v-if); professional shows only birth country + «Claves opcionales»;
//   - updaters other than names keep their previous payload (normalization N1 is a separate decision);
//   - unique ids per instance; disabled reaches every control; focus opens the disclosure first.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/components/identity/IdentityFields.vue'), 'utf8'));
const template = sfc.template.content.replace(/<!--[\s\S]*?-->/g, '');
assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
const options = new Function('fieldError', sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'return'))({});
const results = [];
const test = (name, fn) => { fn(); results.push(name); console.log('PASS ' + name); };
const make = (value = {}, extra = {}) => {
  let emitted; const self = { value, kind: 'patient', canManage: false, errors: {}, open: false, $refs: {}, $nextTick: fn => fn(), $emit: (_e, v) => { emitted = v; }, ...extra };
  Object.assign(self, options.data.call({ _uid: extra._uid || 7 }));
  Object.keys(options.methods).forEach(k => { self[k] = options.methods[k].bind(self); });
  Object.keys(options.computed).forEach(k => Object.defineProperty(self, k, { get: () => options.computed[k].call(self) }));
  return { self, emitted: () => emitted };
};

test('three name fields always visible; no surname status selector or declaration', () => {
  for (const field of ['givenNames', 'firstSurname', 'secondSurname']) assert.match(template, new RegExp(`ref="f-${field}"`));
  assert.doesNotMatch(template, /SurnameStatus|surnameStatus|Tiene apellido|Declara no tener|No tiene/);
  assert.equal(typeof options.methods.surnameStatus, 'undefined');
  assert.match(template, /label="Segundo apellido, opcional"/);
  assert.doesNotMatch(template, /<select|<fieldset|<input/, 'system controls only');
});

test('professional variant: «Claves opcionales», birth country only; personnel types only with canManage', () => {
  const pro = make({}, { kind: 'professional' }).self;
  assert.equal(pro.refsTitle, 'Claves opcionales');
  assert.deepEqual(pro.references.map(r => r.key), ['birthCountry']);
  assert.deepEqual(pro.enumerations, {});
  assert.match(template, /<div v-if="kind === 'professional' && canManage"[^>]*ref="f-authorizedPersonnelTypes"/);
  assert.equal(make({}, { kind: 'patient' }).self.refsTitle, 'Claves de nacimiento y residencia, opcional');
});

test('names: empty is pending (null), never a declaration', () => {
  const { self, emitted } = make({ firstSurname: 'De la Cruz' });
  self.set('secondSurname', self.nullable('')); assert.equal(emitted().secondSurname, null);
  self.set('firstSurname', self.nullable('De la Cruz López')); assert.equal(emitted().firstSurname, 'De la Cruz López', 'compound surname kept whole');
  assert.ok(!('firstSurnameStatus' in emitted()));
});

test('other updaters keep the previous payload (no trimming yet; N1 separate)', () => {
  const { self, emitted } = make({});
  self.setRef({ key: 'nationality', family: 'renapo.nationality' }, ' MEX '); assert.deepEqual(emitted().nationality, { family: 'renapo.nationality', code: ' MEX ' });
  self.setRef({ key: 'residence.postalCode', family: 'sepomex.postal_code' }, ''); assert.deepEqual(emitted().residence, { postalCode: null });
  self.setList('affiliations', 'sis.affiliation', 'A, , B'); assert.deepEqual(emitted().affiliations.map(x => x.code), ['A', '', 'B']);
  self.curp(' xexx990101hnexxxa4 '); assert.deepEqual(emitted().curp, { value: ' XEXX990101HNEXXXA4 ', kind: 'real' });
  self.curp(''); assert.equal(emitted().curp, null);
});

test('unique ids per instance, disabled on every control, focus opens the disclosure', () => {
  const a = make({}, { _uid: 11 }).self, b = make({}, { _uid: 12 }).self;
  assert.notEqual(a.fe('givenNames').id, b.fe('givenNames').id);
  const controls = template.split(/<v-(?:text-field|select)\b/).slice(1).map(c => c.split(/><\/v-(?:text-field|select)>/)[0]);
  assert.ok(controls.length >= 10); controls.forEach(c => assert.match(c, /:disabled="disabled"/));
  assert.match(template, /class="idf-toggle" :disabled="disabled" :aria-expanded="String\(open\)" :aria-controls="uid \+ '-refs'"/);
  assert.match(template, /role="group"/);
  const focusable = make({}).self; let focusedInput = false;
  focusable.$refs['f-birthCountry'] = [{ querySelector: () => ({ focus: () => { focusedInput = true; } }), scrollIntoView() {} }];
  focusable.focus('birthCountry'); assert.equal(focusable.open, true); assert.equal(focusedInput, true);
  const withError = make({}, { errors: { 'residence.municipality': ['Revisa el formato de este dato.'] } }).self;
  assert.deepEqual(withError.err('residence.municipality'), ['Revisa el formato de este dato. Formato: Clave EEMMM.']);
});

console.log(`PASS: ${results.length} NC1 IdentityFields groups (identidad simple). Real template and methods; synthetic values.`);
