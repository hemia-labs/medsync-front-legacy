const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/router/index.js'), 'utf8');
const start = source.indexOf('async function d2BeforeEach');
const end = source.indexOf('function legacyBeforeEach', start);
assert.ok(start >= 0 && end > start);
async function scenario(initial, result, recovered, authorized = true) {
  let rights = initial, calls = 0, decision, warnings = 0, signedIn = true;
  const store = { state: { CORE: { AUTH: {} } }, getters: {}, dispatch: async () => {
    calls++; rights = recovered; signedIn = authorized;
    if(result instanceof Error) throw result;
    return result;
  } };
  Object.defineProperty(store.getters, 'CORE/AUTH/getPermissions', { get: () => rights });
  const context = { store, AUTH_NAMESPACE: 'CORE/AUTH',
    Vue: { prototype: { $swal: { fire: () => { warnings++; } } } },
    ensureD2SessionHydrated: async () => true, isD2Authorized: () => signedIn,
    isD2SuperAdminSession: () => false, isD2TenantRestrictedSession: () => false,
    hasPermission: (permissions, code) => permissions.includes(code)
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + '\nthis.guard = d2BeforeEach;', context);
  await context.guard({ name: 'ShowPx', matched: [{ meta: { permission: 'px.all' } }] }, value => { decision = value; }, true);
  return { decision, calls, warnings };
}
(async () => {
  assert.deepEqual(await scenario(['px.all'], null, []), { decision: undefined, calls: 0, warnings: 0 });
  assert.deepEqual(await scenario([], { success: true }, ['px.all']), { decision: undefined, calls: 1, warnings: 0 });
  assert.deepEqual(await scenario([], { success: true }, []), { decision: false, calls: 1, warnings: 1 });
  assert.deepEqual(await scenario([], { success: false }, []), { decision: false, calls: 1, warnings: 1 });
  assert.deepEqual(await scenario([], new Error('offline'), []), { decision: false, calls: 1, warnings: 1 });
  const revoked = await scenario([], { success: false }, [], false);
  assert.equal(revoked.decision.name, 'auth');
  assert.equal(revoked.warnings, 0);
  console.log('PASS: authorized entry, recovered permissions, denied/offline feedback, revoked session. No DB or credentials used.');
})().catch(error => { console.error(error); process.exitCode = 1; });
