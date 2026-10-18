/* Real Vue 2/Vuetify SFC and shared HTML sanitizer; in-memory services only.
 * No HTTP, database, authentication, publication or acceptance in a live system.
 * Run with Node >=22.12 (jsdom runtime requirement). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { JSDOM, VirtualConsole } = require('jsdom');
const repo = path.resolve(__dirname, '../..');
const componentId = 'src/views/super-admin/LegalDocuments.vue';
const clone = value => JSON.parse(JSON.stringify(value));
const pause = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function until(predicate, label) { for(let attempt = 0; attempt < 100; attempt++) { if(predicate()) return; await pause(); } throw Error('Timed out: ' + label); }
const keys = ['terms_conditions', 'privacy_notice', 'license_agreement'];
function fixture() {
  const warnings = [];
  const virtualConsole = new VirtualConsole();
  ['jsdomError', 'warn', 'error'].forEach(event => virtualConsole.on(event, error => warnings.push(String(error))));
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'http://qa.invalid/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} }); w.scrollTo = () => {};
  [require.resolve('vue/dist/vue.js'), path.join(path.dirname(require.resolve('vuex')), 'vuex.js'), require.resolve('vuetify/dist/vuetify.js'), require.resolve('dompurify/dist/purify.js')].forEach(file => w.eval(fs.readFileSync(file, 'utf8')));
  const Vue = w.Vue; Vue.config.productionTip = false; Vue.config.devtools = false; Vue.use(w.Vuetify); Vue.use(w.Vuex);
  const store = new w.Vuex.Store({ state: { CORE: { AUTH: { authenticated: true, user: { id_login: 'qa-super-admin', id_session: 'qa-session' }, role: 'super_admin', permissions: [], accessRevision: 1 } } } });
  const docs = keys.map((key, index) => ({ id_document: 'qa-doc-' + index, document_key: key,
    draft: { title: 'Documento ficticio ' + index, description: '', content_html: '<p>Texto ficticio de prueba ' + index + '</p>', required: true, acceptance_scope: index === 2 ? 'business' : 'user', revision: 1 }, current_version: null, versions: [] }));
  const calls = { list: 0, save: [], publish: [], version: [] };
  const qa = { saveResponse: null, publishResponse: null, listResponse: null, versionResponse: null, listGate: null, saveGate: null, publishGate: null, versionGate: null, throws: null };
  const result = data => ({ success: true, data: clone(data) });
  const service = {
    async adminList() { calls.list++; if(qa.listGate) await qa.listGate.promise; if(qa.listResponse) return qa.listResponse; return result({ documents: docs }); },
    async saveDraft(key, payload) {
      calls.save.push([key, clone(payload)]); if(qa.saveGate) await qa.saveGate.promise;
      if(qa.throws) throw qa.throws;
      if(qa.saveResponse) return qa.saveResponse;
      const doc = docs.find(row => row.document_key === key);
      assert.equal(payload.expected_revision, doc.draft.revision, 'Expected revision uses the loaded draft');
      doc.draft = { ...clone(payload), revision: doc.draft.revision + 1 }; delete doc.draft.expected_revision;
      return result({ document: doc });
    },
    async publish(key, revision) {
      calls.publish.push([key, revision]); if(qa.publishGate) await qa.publishGate.promise;
      if(qa.throws) throw qa.throws;
      if(qa.publishResponse) return qa.publishResponse;
      const doc = docs.find(row => row.document_key === key);
      assert.equal(revision, doc.draft.revision);
      const version = { ...doc.draft, id_version: key + '-v' + (doc.versions.length + 1), version_number: doc.versions.length + 1,
        content_hash: 'a'.repeat(64), published_at: '2026-10-17T12:00:00Z' };
      doc.versions.push(version); doc.current_version = version; doc.draft.revision++;
      return result({ document: doc });
    },
    async version(key, id) {
      calls.version.push([key, id]); if(qa.versionGate) await qa.versionGate.promise;
      if(qa.versionResponse) return qa.versionResponse;
      return result({ version: docs.find(row => row.document_key === key).versions.find(row => row.id_version === id) });
    }
  };
  const cache = { 'src/services/saasLegal.service.js': { exports: { default: service, __esModule: true } }, dompurify: { exports: w.DOMPurify } };
  function load(id) {
    if(cache[id]) return cache[id].exports;
    const module = cache[id] = { exports: {} };
    let source = fs.readFileSync(path.join(repo, id), 'utf8'), compiled;
    if(id.endsWith('.vue')) { const sfc = compiler.parseComponent(source); source = sfc.script.content; compiled = compiler.compile(sfc.template.content, { whitespace: 'condense' }); assert.deepEqual(compiled.errors, [], 'SFC compiles'); }
    const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
    new w.Function('require', 'module', 'exports', code)(specifier => {
      if(cache[specifier]) return cache[specifier].exports;
      const base = specifier.startsWith('@/') ? 'src/' + specifier.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(id), specifier));
      const resolved = [base, base + '.js', base + '.vue'].find(file => fs.existsSync(path.join(repo, file)) && fs.statSync(path.join(repo, file)).isFile());
      if(!resolved) throw Error('Unmocked dependency: ' + specifier);
      return load(resolved);
    }, module, module.exports);
    if(compiled) { module.exports.default.render = new w.Function(compiled.render); module.exports.default.staticRenderFns = compiled.staticRenderFns.map(code => new w.Function(code)); }
    return module.exports;
  }
  const options = load(componentId).default;
  const app = new Vue({ store, vuetify: new w.Vuetify({}), render: h => h('v-app', [h(options, { ref: 'page' })]) }).$mount('#app');
  const vm = app.$refs.page;
  const close = () => { app.$destroy(); w.close(); assert.deepEqual(warnings, [], 'No Vue/Vuetify rendering warnings'); };
  return { vm, Vue, w, docs, calls, qa, options, store, close };
}
let passed = 0;
async function check(label, callback) {
  const f = fixture();
  try { await until(() => !f.vm.loading, 'initial read'); await callback(f); passed++; process.stdout.write('PASS ' + label + '\n'); }
  finally { f.close(); }
}
(async () => {
  await check('opening reads the three global documents without writing or publishing', async f => {
    assert.equal(f.calls.list, 1); assert.equal(f.calls.save.length, 0); assert.equal(f.calls.publish.length, 0);
    assert.equal(f.vm.dirty, false); assert.equal(f.vm.documents.length, 3);
    assert.equal(f.w.document.querySelectorAll('.legal-document-option').length, 3);
    f.vm.requestSelection('license_agreement'); assert.match(f.vm.audienceLabel, /administradores/); assert.equal(f.vm.form.acceptance_scope, 'business');
  });
  await check('empty title rejects save; a content-free draft may be saved but never published', async f => {
    f.vm.form.title = ' '; await f.vm.saveDraft(); assert.ok(f.vm.fieldErrors.title); assert.equal(f.calls.save.length, 0);
    f.vm.form.title = 'Borrador ficticio'; f.vm.form.content_html = ''; await f.vm.saveDraft(); assert.equal(f.calls.save.length, 1); assert.equal(f.vm.canPublish, false);
    f.vm.requestPublish(); await f.vm.publishVersion(); assert.equal(f.vm.publishOpen, false); assert.equal(f.calls.publish.length, 0);
    for(const html of ['<p>&nbsp;\u200b</p>', '<script>alert(1)</script>', '<img src="javascript:alert(1)">']) { f.vm.form.content_html = html; assert.equal(f.vm.canPublish, false); }
  });
  await check('actual textarea editing remains local; save preserves scope and revision with duplicate-submit guard', async f => {
    const textarea = [...f.w.document.querySelectorAll('textarea')].pop(); textarea.value = '<p>Nuevo texto ficticio</p>'; textarea.dispatchEvent(new f.w.Event('input', { bubbles: true })); await f.Vue.nextTick();
    assert.equal(f.vm.dirty, true); assert.equal(f.calls.save.length, 0);
    f.qa.saveGate = deferred(); const pending = f.vm.saveDraft(); await f.vm.saveDraft(); assert.equal(f.calls.save.length, 1); assert.equal(f.vm.saving, true);
    assert.equal(f.calls.save[0][1].acceptance_scope, 'user'); assert.equal(f.calls.save[0][1].expected_revision, 1);
    let routeDecision; f.options.beforeRouteLeave.call(f.vm, {}, {}, value => { routeDecision = value; }); assert.equal(routeDecision, false);
    f.qa.saveGate.resolve(); await pending; assert.equal(f.vm.dirty, false); assert.equal(f.vm.form.revision, 2); assert.equal(f.vm.saving, false);
  });
  await check('server validation preserves captured content and shows field errors', async f => {
    f.vm.form.content_html = '<p>Captura conservada</p>'; f.qa.saveResponse = { success: false, message: 'Revisa el contenido.', data: { fieldErrors: { content_html: 'Contenido rechazado.' } } };
    await f.vm.saveDraft(); assert.equal(f.vm.form.content_html, '<p>Captura conservada</p>'); assert.equal(f.vm.dirty, true); assert.equal(f.vm.fieldErrors.content_html, 'Contenido rechazado.'); assert.match(f.vm.actionError, /Revisa/);
  });
  await check('revision conflict never overwrites local capture or retries automatically', async f => {
    f.vm.form.title = 'Captura local'; f.qa.saveResponse = { success: false, message: 'Otro administrador guardó cambios.', data: { code: 'LEGAL_DRAFT_CONFLICT' } };
    await f.vm.saveDraft(); assert.equal(f.vm.form.title, 'Captura local'); assert.equal(f.vm.syncRequired, true); await f.vm.saveDraft(); assert.equal(f.calls.save.length, 1); assert.equal(f.calls.list, 1);
    f.vm.requestReload(); assert.equal(f.vm.discardOpen, true); f.vm.cancelDiscard(); assert.equal(f.vm.form.title, 'Captura local'); assert.equal(f.calls.list, 1);
    f.vm.requestReload(); f.vm.confirmDiscard(); await until(() => !f.vm.loading, 'explicit conflict reload'); assert.equal(f.calls.list, 2); assert.equal(f.vm.syncRequired, false);
  });
  await check('unknown save outcome retains capture and requires an explicit refresh', async f => {
    f.vm.form.title = 'Captura local'; f.qa.throws = Error('Respuesta perdida.'); await f.vm.saveDraft(); assert.equal(f.vm.syncRequired, true); assert.equal(f.vm.form.title, 'Captura local'); assert.equal(f.vm.saving, false); assert.equal(f.vm.dirty, true);
  });
  await check('publication requires confirmation, saved draft and deduplicates requests', async f => {
    f.vm.form.title = 'Cambios pendientes'; f.vm.requestPublish(); assert.equal(f.vm.publishOpen, false); assert.equal(f.calls.publish.length, 0);
    await f.vm.saveDraft(); f.vm.requestPublish(); assert.equal(f.vm.publishOpen, true); assert.equal(f.calls.publish.length, 0);
    f.qa.publishGate = deferred(); const pending = f.vm.publishVersion(); await f.vm.publishVersion(); assert.equal(f.calls.publish.length, 1); assert.equal(f.calls.publish[0][1], 2);
    f.qa.publishGate.resolve(); await pending; assert.equal(f.vm.publishOpen, false); assert.equal(f.vm.versions.length, 1); assert.equal(f.vm.form.revision, 3); assert.equal(f.vm.selectedDocument.current_version.version_number, 1); assert.match(f.vm.successMessage, /pendiente/);
  });
  await check('publication conflict stays open, preserves draft and disables another publication', async f => {
    f.vm.requestPublish(); f.qa.publishResponse = { success: false, message: 'El borrador cambió.', data: { code: 'LEGAL_DRAFT_CONFLICT' } }; await f.vm.publishVersion();
    assert.equal(f.vm.publishOpen, true); assert.equal(f.vm.syncRequired, true); assert.match(f.vm.publishError, /cambió/); assert.equal(f.vm.form.revision, 1); await f.vm.publishVersion(); assert.equal(f.calls.publish.length, 1);
  });
  await check('history fetches a frozen version, exposes its hash and sanitizes executable HTML', async f => {
    f.vm.requestPublish(); await f.vm.publishVersion(); const version = f.vm.versions[0];
    f.vm.form.content_html = '<p>Nuevo borrador distinto</p>'; await f.vm.openVersion(version);
    assert.equal(f.vm.frozenVersion.content_html, version.content_html); assert.equal(f.vm.frozenVersion.content_hash.length, 64); assert.notEqual(f.vm.frozenVersion.content_html, f.vm.form.content_html);
    f.vm.frozenVersion.content_html = '<p onclick="alert(1)">Texto</p><script>alert(1)</script><img src="javascript:alert(1)">'; assert.doesNotMatch(f.vm.frozenHtml, /onclick|<script|javascript:/);
    f.vm.form.content_html = '<p onmouseover="alert(1)">Texto válido</p>'; assert.doesNotMatch(f.vm.previewHtml, /onmouseover/); assert.match(f.vm.previewHtml, /Texto válido/);
    await f.Vue.nextTick(); assert.ok(f.w.document.querySelector('.legal-hash')); assert.match(f.w.document.body.textContent, /Solo lectura/);
  });
  await check('late version response cannot reopen a closed viewer', async f => {
    f.vm.requestPublish(); await f.vm.publishVersion(); f.qa.versionGate = deferred(); const pending = f.vm.openVersion(f.vm.versions[0]); assert.equal(f.vm.versionLoading, true);
    f.vm.closeVersion(); f.qa.versionGate.resolve(); await pending; assert.equal(f.vm.versionOpen, false); assert.equal(f.vm.frozenVersion, null); assert.equal(f.vm.versionLoading, false);
  });
  await check('document switch, route leave and browser close protect unsaved capture', async f => {
    f.vm.form.title = 'Sin guardar'; f.vm.requestSelection('privacy_notice'); assert.equal(f.vm.selectedKey, 'terms_conditions'); assert.equal(f.vm.discardOpen, true);
    f.vm.cancelDiscard(); assert.equal(f.vm.form.title, 'Sin guardar'); f.vm.requestSelection('privacy_notice'); f.vm.confirmDiscard(); assert.equal(f.vm.selectedKey, 'privacy_notice'); assert.equal(f.vm.dirty, false);
    f.vm.form.title = 'Otra captura'; let decision = 'unset'; f.options.beforeRouteLeave.call(f.vm, {}, {}, value => { decision = value; }); assert.equal(decision, 'unset'); f.vm.cancelDiscard(); assert.equal(decision, false);
    decision = 'unset'; f.options.beforeRouteLeave.call(f.vm, {}, {}, value => { decision = value; }); f.vm.confirmDiscard(); assert.equal(decision, undefined);
    f.vm.form.title = 'Captura final'; const event = { preventDefaultCalled: false, preventDefault() { this.preventDefaultCalled = true; } }; f.vm.onBeforeUnload(event); assert.equal(event.preventDefaultCalled, true); assert.equal(event.returnValue, '');
  });
  await check('expired authentication releases a dirty route and clears the old administrative capture', async f => {
    f.vm.form.title = 'Captura privada del administrador anterior';
    const auth = f.store.state.CORE.AUTH; auth.authenticated = false; auth.user = null;
    let decision = 'unset'; f.options.beforeRouteLeave.call(f.vm, { path: '/auth/login' }, {}, value => { decision = value; });
    assert.equal(decision, undefined, 'Expired session can reach login before the reactive cleanup tick');
    assert.equal(f.vm.discardOpen, false);
    const event = { prevented: false, preventDefault() { this.prevented = true; } }; f.vm.onBeforeUnload(event); assert.equal(event.prevented, false);
    await f.Vue.nextTick(); assert.equal(f.vm.form, null); assert.equal(f.vm.documents.length, 0); assert.equal(f.vm.dirty, false);
    await f.vm.loadDocuments(); await f.vm.saveDraft(); f.vm.requestPublish(); assert.equal(f.calls.list, 1); assert.equal(f.calls.save.length, 0); assert.equal(f.calls.publish.length, 0);
  });
  await check('a changed role may leave during save and its late response cannot restore the old draft', async f => {
    f.vm.form.title = 'Guardado anterior pendiente'; f.qa.saveGate = deferred(); const pending = f.vm.saveDraft(); assert.equal(f.vm.busy, true);
    f.store.state.CORE.AUTH.role = 'doctor';
    let decision = 'unset'; f.options.beforeRouteLeave.call(f.vm, {}, {}, value => { decision = value; }); assert.equal(decision, undefined);
    await f.Vue.nextTick(); assert.equal(f.vm.form, null); assert.equal(f.vm.busy, false);
    f.qa.saveGate.resolve(); await pending; assert.equal(f.vm.form, null); assert.equal(f.vm.successMessage, ''); assert.equal(f.vm.documents.length, 0); assert.equal(f.calls.save.length, 1);
  });
  await check('session replacement discards an old read and loads only the new administrator context', async f => {
    f.qa.listGate = deferred(); const oldRead = f.vm.loadDocuments(); assert.equal(f.vm.loading, true);
    f.store.state.CORE.AUTH.user = { id_login: 'qa-other-admin', id_session: 'qa-new-session' }; f.store.state.CORE.AUTH.accessRevision++;
    await f.Vue.nextTick(); assert.equal(f.calls.list, 3); assert.equal(f.vm.form, null);
    f.qa.listGate.resolve(); await oldRead; await until(() => !f.vm.loading, 'new administrator read');
    assert.equal(f.vm.hasAdministrativeSession, true); assert.equal(f.vm.documents.length, 3); assert.equal(f.vm.dirty, false);
  });
  const route = fs.readFileSync(path.join(repo, 'src/router/routes/super-admin.js'), 'utf8');
  const layout = fs.readFileSync(path.join(repo, 'src/core/layouts/super-admin.vue'), 'utf8');
  assert.match(route, /name: 'superAdminLegalDocuments'[\s\S]*?role: 'super_admin'/); assert.match(layout, /route: 'superAdminLegalDocuments'/);
  process.stdout.write(`PASS ${passed} real-component legal administration regressions; route/sidebar protected.\n`);
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
