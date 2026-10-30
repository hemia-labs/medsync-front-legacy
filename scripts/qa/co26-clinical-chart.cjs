// Real Vue/store/editor flow against in-memory service responses, no clinical data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { buildClient } = require('./odontogram-ui-preview.cjs');
const pause = () => new Promise(resolve => setTimeout(resolve, 10));
async function until(check) {
  for (let i = 0; i < 500; i++) { if (check()) return; await pause(); }
  throw new Error('Timed out waiting for connected chart');
}
(async () => {
  const errors = [], vc = new VirtualConsole();
  ['jsdomError', 'warn', 'error'].forEach(event => vc.on(event, e => errors.push(String(e))));
  const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost/preview?scenario=existing', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  try {
    w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} }); w.scrollTo = () => {};
    [require.resolve('vue/dist/vue.js'), path.join(path.dirname(require.resolve('vuex')), 'vuex.js'),
      require.resolve('vuetify/dist/vuetify.js'), require.resolve('vuelidate/dist/vuelidate.min.js'),
      require.resolve('vuelidate/dist/validators.min.js')].forEach(file => w.eval(fs.readFileSync(file, 'utf8')));
    w.eval(buildClient({ includeEditors: true }).script);
    const qa = w.__odontogramQA;
    await until(() => !qa.vm.loading);
    assert.equal(w.document.querySelectorAll('.clinical-chart-teeth button').length, 32);
    const button = Array.from(w.document.querySelectorAll('.clinical-chart-teeth button')).find(b => b.textContent.includes('16'));
    button.click(); await w.Vue.nextTick();
    assert.match(w.document.querySelector('.clinical-chart-detail').textContent, /Caries oclusal/);
    w.document.querySelector('.clinical-chart-edit').click();
    await until(() => w.document.querySelector('.editor-field textarea'));
    const textarea = w.document.querySelector('.editor-field textarea');
    textarea.value = 'Diagnóstico actualizado por QA'; textarea.dispatchEvent(new w.Event('input', { bubbles: true }));
    await w.Vue.nextTick();
    w.document.querySelector('.editor-submit').click();
    await until(() => qa.calls.detailSave === 1 && !qa.vm.sectionBusy);
    const payload = qa.payloads.find(p => p.treatment === 'Diagnóstico actualizado por QA');
    assert.equal(payload.id_person, 'qa-patient');
    assert.equal(payload.id_tooth, 'qa-tooth-16');
    assert.equal(payload.id_odontogramv1, 'qa-odontogram');
    assert.match(payload.expected_treatment, /Caries oclusal/);
    await w.Vue.nextTick();
    assert.match(w.document.querySelector('.clinical-chart-detail').textContent, /Diagnóstico actualizado por QA/);
    assert.deepEqual(errors, []);
    console.log('PASS clinical chart: API data -> real tooth -> editor -> scoped save -> refreshed chart, no fixture findings inferred.');
  } finally { if (w.__odontogramQA) w.__odontogramQA.app.$destroy(); dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
