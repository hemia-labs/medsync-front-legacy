// Rendered integration checks for the visual handoff, not clinical acceptance QA.
// Real Vue2/Vuetify SFCs, fake services, no browser/network/DB writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { buildClient } = require('./odontogram-ui-preview.cjs');
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
const copy = value => JSON.parse(JSON.stringify(value));
async function fixture(production = false) {
  const errors = [];
  const vc = new VirtualConsole();
  ['jsdomError', 'warn', 'error'].forEach(event => vc.on(event, e => errors.push(String(e))));
  const dom = new JSDOM('<html><body><div id="app"></div></body></html>', { url: 'http://localhost/preview?scenario=existing', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.scrollTo = () => {};
  [require.resolve('vue/dist/vue.js'), path.join(path.dirname(require.resolve('vuex')), 'vuex.js'), require.resolve('vuetify/dist/vuetify.js')].forEach(file => w.eval(fs.readFileSync(file, 'utf8')));
  w.eval(buildClient({ production }).script);
  const qa = w.__odontogramQA;
  for (let i = 0; qa.vm.loading && i < 150; i++) await pause();
  assert.equal(qa.vm.loading, false);
  return { w, qa, errors, tick: () => w.Vue.nextTick(), close() { qa.app.$destroy(); w.close(); } };
}
(async () => {
  const f = await fixture();
  try {
    const calls = copy(f.qa.calls);
    f.w.document.querySelector('.odontogram-preview-entry button').click();
    for (let i = 0; !f.w.document.querySelector('.co26') && i < 150; i++) await pause();
    const preview = f.qa.vm.$children.find(child => child.$options.components && child.$options.components.PlanEditor);
    assert.ok(preview, 'Preview mounts through the real patient section');
    assert.equal(f.w.document.querySelectorAll('.co26-tooth').length, 32);
    preview.changeMode('primary'); await f.tick(); assert.equal(f.w.document.querySelectorAll('.co26-tooth').length, 20);
    preview.changeMode('mixed'); await f.tick(); assert.equal(f.w.document.querySelectorAll('.co26-tooth').length, 52);
    console.log('PASS integration and three dentitions: 32 / 20 / 52 distinct pieces.');
    preview.changeMode('permanent');
    preview.command = '18 aus'; preview.runCommand(); assert.equal(preview.selected, 17);
    preview.command = 'res m'; preview.runCommand(); assert.equal(preview.selected, 17);
    assert.equal(preview.teeth[18].findings[0].code, 'aus');
    const before = copy(preview.teeth[15]); preview.command = '15 car'; preview.runCommand(); assert.deepEqual(copy(preview.teeth[15]), before);
    preview.command = ''; preview.runCommand(); assert.equal(preview.selected, 14); assert.deepEqual(copy(preview.teeth[15]), before);
    console.log('PASS keyboard: presence advances, findings remain, missing surfaces reject, blank Enter only moves.');
    preview.selectTooth(16); const original = copy(preview.current);
    preview.review(); assert.equal(preview.dialog, 'review'); preview.confirmDialog();
    assert.deepEqual(copy(preview.current.findings), original.findings); assert.equal(preview.current.note, original.note); assert.equal(preview.current.reviewed, true);
    preview.undo(); assert.deepEqual(copy(preview.current), original);
    console.log('PASS contextual review and undo preserve restorations and notes.');
    preview.role = 'read'; preview.updateNote('must not change'); assert.equal(preview.current.note, original.note);
    await f.tick(); assert.equal(f.w.document.querySelector('.co26-detail textarea').disabled, true);
    preview.role = 'assistant'; preview.dialog = 'finalize'; preview.confirmDialog(); assert.equal(preview.closed, false); preview.dialog = '';
    preview.role = 'doctor'; preview.sync = 'pending'; preview.dialog = 'finalize'; preview.confirmDialog(); assert.equal(preview.closed, false); preview.dialog = ''; preview.sync = 'saved';
    console.log('PASS simulated read/capture/finalize and pending-save states.');
    preview.openPlan([]); await f.tick(); await pause();
    const plan = preview.$children.find(child => child.$options.props && child.$options.props.initial);
    assert.ok(plan); plan.draft.name = 'Tratamiento manual ficticio'; plan.draft.notes = 'Nota manual'; plan.toggle(11); plan.draft.teeth[11].surfaces = 'M';
    plan.openImport(); plan.picked = ['16']; plan.importSelection();
    assert.equal(plan.draft.name, 'Tratamiento manual ficticio'); assert.equal(plan.draft.notes, 'Nota manual'); assert.equal(plan.draft.teeth[11].surfaces, 'M'); assert.ok(plan.draft.teeth[16]);
    plan.openImport(); plan.picked = ['16']; plan.importSelection(); assert.equal(Object.keys(plan.draft.teeth).length, 2);
    plan.save(); await f.tick(); assert.equal(preview.plans.length, 1); assert.equal(preview.planOpen, false);
    console.log('PASS same treatment editor: manual capture, reviewed import, no overwrite or repeated association.');
    preview.openDialog('new'); preview.newMode = 'mixed'; preview.copyPrevious = true; preview.copyNotes = true; preview.confirmDialog();
    assert.equal(preview.teeth[16].reviewed, false); assert.match(preview.teeth[16].note, /^Copiada del anterior/); assert.ok(preview.history.length > 1);
    preview.openDialog('finalize'); preview.confirmDialog(); assert.equal(preview.closed, true);
    const finalTeeth = copy(preview.teeth); preview.undo(); assert.deepEqual(copy(preview.teeth), finalTeeth);
    preview.openDialog('reopen'); preview.confirmDialog(); assert.equal(preview.closed, false);
    console.log('PASS new/derived chart, historical snapshot, finalization and reopening in memory.');
    await f.tick(); assert.deepEqual(copy(f.qa.calls), calls, 'Preview never calls any clinical service'); assert.deepEqual(f.errors, []);
    preview.$emit('close'); await f.tick(); assert.ok(f.w.document.querySelector('.odontogram-record')); assert.equal(f.w.document.querySelector('.co26'), null);
    console.log('PASS zero clinical service calls and return to existing odontogram.');
  } finally { f.close(); }
  const prod = await fixture(true);
  try { assert.equal(prod.qa.vm.previewAvailable, false); assert.equal(prod.w.document.querySelector('.odontogram-preview-entry'), null); assert.deepEqual(prod.errors, []); console.log('PASS production excludes synthetic preview.'); } finally { prod.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
