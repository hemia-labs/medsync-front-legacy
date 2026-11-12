// Public published-document reader: no network, publication or acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
const sanitizerModule = { exports: {} };
const sanitizerCode = babel.transformSync(read('src/utils/sanitizeHtml.js'), { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
new Function('require', 'module', 'exports', sanitizerCode)(require, sanitizerModule, sanitizerModule.exports);
const sfc = compiler.parseComponent(read('src/views/legal/PublishedLegalDocument.vue'));
assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
let result, prints = 0, calls = 0;
const scope = { component: null, window: { print() { prints++; } },
  saasLegalService: { async publicCurrent(key) { calls++; assert.ok(['privacy_notice', 'terms_conditions'].includes(key)); return await result; } },
  ...sanitizerModule.exports };
vm.runInNewContext(sfc.script.content.replace(/^import[^\n]*\n/gm, '').replace('export default', 'component ='), scope);
const page = { ...scope.component.data(), documentKey: 'privacy_notice' };
Object.entries(scope.component.methods).forEach(([key, method]) => { page[key] = method.bind(page); });
Object.entries(scope.component.computed).forEach(([key, getter]) => Object.defineProperty(page, key, { get: () => getter.call(page) }));
(async () => {
  result = { success: false, status: 404, code: 'LEGAL_DOCUMENT_NOT_FOUND' };
  await page.load(); assert.equal(page.document, null); assert.equal(page.retryable, false); assert.match(page.error, /aún no ha publicado/);
  result = { success: false, status: 500 }; await page.load(); assert.equal(page.retryable, true); assert.match(page.error, /Reintenta/);
  result = { success: true, data: { document: { title: 'Aviso ficticio', current_version: { version_number: '2.1.0', content_html: '<p>Texto publicado</p><script>alert(1)</script><img src="x" onerror="alert(2)">', published_at: '2026-10-17T12:00:00Z' } } } };
  await page.load(); assert.equal(page.title, 'Aviso ficticio'); assert.match(page.safeContent, /Texto publicado/); assert.doesNotMatch(page.safeContent, /script|onerror/);
  assert.equal(page.version.version_number, '2.1.0');assert.match(page.publishedDate, /2026/);
  page.version.published_at = null;assert.equal(page.publishedDate, '');
  let release; result = new Promise(resolve => { release = resolve; });
  const stale = page.load(); page.documentKey = 'terms_conditions'; result = { success: false, status: 404 }; await page.load();
  release({ success: true, data: { document: { title: 'Documento anterior', current_version: {} } } }); await stale;
  assert.equal(page.document, null, 'A late privacy response cannot enter the terms route');
  page.printDocument(); assert.equal(prints, 1);
  const routes = read('src/router/routes/legal.js'); assert.equal((routes.match(/PublishedLegalDocument.vue/g) || []).length, 2);
  const router = read('src/router/index.js');
  const guardSource = router.slice(router.indexOf('function canRouteInTenantRestrictedMode'), router.indexOf('const routes ='));
  const guards = {}; vm.runInNewContext(guardSource + ';this.allowed=canRouteInTenantRestrictedMode;', guards);
  assert.equal(guards.allowed({ name: 'admin', query: { section: 'account-legal' }, matched: [] }), true);
  assert.equal(guards.allowed({ name: 'admin', query: { section: 'users' }, matched: [] }), false);
  assert.equal(guards.allowed({ name: 'admin', query: {}, matched: [] }), false);
  assert.equal(guards.allowed({ name: 'other', query: { section: 'account-legal' }, matched: [] }), false);
  console.log('PASS SaaS legal public: unpublished/error/retry, one published source, sanitized content, stale route responses, print and restricted-tenant route boundary (' + calls + ' mocked reads).');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { dom.window.close(); delete global.window; });
