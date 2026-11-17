'use strict';
// Real CORE/auth actions and legacy watcher, synthetic service; no server or credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => process.argv.includes('--base')
  ? require('node:child_process').execFileSync('git', ['show', '5d4b1c2:' + file], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(root, file), 'utf8');
const load = (file, bindings = {}) => {
  const context = { module: { exports: {} }, ...bindings };
  vm.runInNewContext(read(file).replace(/^import .*;?\r?\n/gm, '').replace('export default', 'module.exports ='), context);
  return context.module.exports;
};
const types = load('src/store/modules/common/mutation-types.js');
const modules = load('src/store/modules/common/module-types.js');
const DACurrentActionModel = load('src/models/actions/DACurrentActionModel.js');
const core = load('src/store/modules/core/actions.js', { types, DACurrentActionModel });
let d2 = true, writes = 0, refreshes = 0;
const state = { authenticated: true, accessRevision: 1, refreshtoken: 'synthetic', isRefresingToken: false };
const coreState = { currentAction: null };
const session = { authenticated: true, user: { id_login: 'qa', id_session: 's', id_business: 'b' }, permissions: ['px.edit'] };
const reply = () => ({ success: true, data: { token: JSON.stringify(session.user), refresh_token: 'synthetic', permisos: session.permissions }, d2Session: { success: true, data: session } });
const denied = { success: false, status: 403, message: 'Permiso denegado', data: { code: 'PERMISSION_DENIED' } };
let writeReply = denied;
const auth = load('src/store/modules/auth/actions.js', {
  types, modules, Vue: { prototype: { $session: { set() {}, get() {}, remove() {} } } }, decode: JSON.parse,
  DAAuthService: { login: async () => reply(), refreshToken: async () => { refreshes++; return reply(); }, session: async () => ({ success: true, data: session }) },
  DAAuthModel: class {}, DAHasErrorModel: class {}, DARefreshTokenModel: class {}, isD2AuthMode: () => d2,
  clearLegacyAuthStorageForD2() {}, clearClinicalContinuityCache() {}, clearD2ClientAuthArtifacts() {}, redirectToAuthIfNeeded() {}
});
const coreContext = { state: coreState, commit: (type, value) => { if (type === types.SET_CURRENT_ACTION) coreState.currentAction = value; }, dispatch };
const authContext = { state, commit: (type, value) => { if (type === types.SET_AUTH_REFRESING_TOKEN) state.isRefresingToken = value; }, dispatch };
async function dispatch(action, payload) {
  if (action === 'QA/save') { writes++; return writeReply; }
  if (action === 'CORE/rollback' || action === 'rollback') return core.rollback(coreContext);
  if (action === 'ActionWrapper') return core.ActionWrapper(coreContext, payload);
  if (auth[action]) return auth[action](authContext, payload);
  throw new Error('Unexpected action: ' + action);
}
let passed = 0, failed = 0;
async function test(name, work) { try { await work(); passed++; console.log('PASS ' + name); } catch (error) { failed++; console.log('FAIL ' + name + ': ' + error.message); } }
const pending = () => { coreState.currentAction = new DACurrentActionModel('QA', 'save', { note: 'synthetic capture' }); };
(async () => {
  for (const mode of [true, false]) {
    d2 = mode;
    for (const action of ['login', 'getRefreshtoken', 'refreshAccess']) await test(`${mode ? 'D2' : 'legacy'} ${action} does not replay a stored write`, async () => {
      pending(); writes = 0;
      await auth[action](authContext, action === 'login' ? { param: 'qa', pwd: 'synthetic-not-a-credential' } : {});
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(writes, 0);
    });
  }
  await test('CORE rollback cannot replay even an already stored action', async () => {
    pending(); writes = 0; await core.rollback(coreContext); await new Promise(resolve => setImmediate(resolve));
    assert.equal(writes, 0); assert.ok(!coreState.currentAction || !coreState.currentAction.action);
  });
  await test('explicit save runs once and returns original denial, keeping capture', async () => {
    coreState.currentAction = null; writes = 0; writeReply = denied;
    const payload = { note: 'capture to retain' };
    const actual = await core.ActionWrapper(coreContext, { module: 'QA', action: 'save', payload });
    assert.equal(actual, denied); assert.equal(writes, 1); assert.equal(payload.note, 'capture to retain');
    assert.ok(!coreState.currentAction || !coreState.currentAction.action, 'must not retain an executable payload');
  });
  await test('a late action completion cannot seed a replay after new login', async () => {
    let finish; writeReply = new Promise(resolve => { finish = resolve; }); writes = 0; coreState.currentAction = null;
    const saving = core.ActionWrapper(coreContext, { module: 'QA', action: 'save', payload: { note: 'old capture' } });
    await auth.login(authContext, { param: 'qa', pwd: 'synthetic-not-a-credential' });
    finish(denied); await saving; await core.rollback(coreContext);
    assert.equal(writes, 1); assert.ok(!coreState.currentAction || !coreState.currentAction.action);
  });
  await test('explicit thrown failure remains rejected without repeating effects', async () => {
    const failure = new Error('synthetic failure'); let effects = 0;
    await assert.rejects(core.ActionWrapper({ ...coreContext, dispatch: async () => { effects++; throw failure; } }, { module: 'QA', action: 'save', payload: {} }), error => error === failure);
    assert.equal(effects, 1);
  });
  await test('legacy unauthorized watcher renews once without replay', async () => {
    const source = read('src/core/layouts/admin.vue');
    const start = source.indexOf('unauthorized: async function()');
    assert.ok(start >= 0);
    const bodyStart = source.indexOf('{', start); let end = bodyStart + 1, depth = 1;
    for (; depth; end++) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
    const watcher = new Function('isD2AuthMode', 'return async function() ' + source.slice(bodyStart, end))(() => false);
    d2 = false; pending(); writes = 0; const before = refreshes;
    await watcher.call({ unauthorized: true, refreshtoken: 'synthetic', getRefreshtoken: () => auth.getRefreshtoken(authContext) });
    await new Promise(resolve => setImmediate(resolve)); assert.equal(refreshes, before + 1); assert.equal(writes, 0);
  });
  console.log(`${failed ? 'FAIL' : 'PASS'} no replay: ${passed}/${passed + failed}`); process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
