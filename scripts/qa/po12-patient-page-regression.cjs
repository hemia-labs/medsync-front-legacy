'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const source = fs.readFileSync(path.resolve(__dirname, '../../src/views/Patient/Patients.vue'), 'utf8');
const parsed = compiler.parseComponent(source);
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
let queued = [], requests = [], timers = new Map(), nextTimer = 0;
const sandbox = { component: null, mapGetters: () => ({}), moduleTypes: { AUTH: 'auth' }, fnTypes: {},
    DAHomeService: { getPatientsPage(body) { requests.push(body); return new Promise(resolve => queued.push(resolve)); } },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); } };
vm.runInNewContext(parsed.script.content.replace(/^import .*;\r?\n/gm, '').replace('export default', 'component ='), sandbox);
const component = sandbox.component;
const state = { ...component.data(), authUser: { id_login: 'actor', id_business: 'tenant' }, business: { id_business: 'tenant' },
    authPermissions: ['px.all', 'px.new'], hasPermission: code => state.authPermissions.includes(code), $nextTick: fn => Promise.resolve().then(fn) };
for (const [key, method] of Object.entries(component.methods)) state[key] = method.bind(state);
for (const [key, getter] of Object.entries(component.computed)) Object.defineProperty(state, key, { get: getter.bind(state) });
function response(page, name, count = 89) { return { success: true, data: { items: [{ id_person: name, name }],
    pagination: { page, pageSize: 8, pageCount: Math.ceil(count / 8), total: count, totalPatients: 100, withOccupation: 67 } } }; }
(async () => {
    const initial = state.loadPatients();
    assert.equal(requests[0].page_size, 8);
    queued.shift()(response(1, 'First'));
    await initial;
    assert.equal(state.totalPatients, 100);
    assert.equal(state.totalMatches, 89);
    assert.equal(state.patientsWithOccupation, 67);
    assert.equal(state.paginatedPatients[0].name, 'First');
    assert.equal(state.pageRangeText, '1-1 de 89');
    state.page = 2;
    const older = state.loadPatients();
    state.page = 3;
    const newer = state.loadPatients();
    queued[1](response(3, 'Latest')); await newer;
    queued[0](response(2, 'Stale')); await older;
    queued = [];
    assert.equal(state.page, 3);
    assert.equal(state.patients[0].name, 'Latest', 'Late page cannot overwrite newest results');
    state.searchTerm = 'A'; component.watch.searchTerm.call(state);
    state.searchTerm = 'Ana'; component.watch.searchTerm.call(state);
    assert.equal(timers.size, 1, 'Only final search remains scheduled');
    const callback = [...timers.values()][0]; timers.clear();
    const searched = callback();
    assert.equal(requests.at(-1).param, 'Ana');
    assert.equal(requests.at(-1).page, 1);
    queued.shift()(response(1, 'Ana', 1)); await searched;
    // Watcher's timer callback intentionally returns no promise; flush the request.
    await Promise.resolve();
    assert.equal(state.patients[0].name, 'Ana');
    const foreign = state.loadPatients();
    state.business = { id_business: 'different-tenant' };
    state.clearPatients();
    queued.shift()(response(1, 'Foreign')); await foreign;
    assert.equal(state.patients.length, 0, 'Old tenant response never appears');
    state.authPermissions = [];
    await state.loadPatients();
    assert.equal(state.isPatientsLoading, false);
    assert.equal(state.totalMatches, 0);
    state.authPermissions = ['px.all']; state.includeArchived = true;
    const noArchive = state.loadPatients();
    assert.equal(requests.at(-1).include_archived, false);
    queued.shift()({ success: false }); await noArchive;
    assert.equal(state.patientsServiceError, true);
    const destroyed = state.loadPatients();
    component.beforeDestroy.call(state);
    queued.shift()(response(1, 'Destroyed')); await destroyed;
    assert.equal(state.patients.length, 0);
    assert.equal(timers.size, 0);
    console.log('PASS PO12 patient directory: page/totals, remote search with debounce, late-page/tenant/destroy responses discarded, archive guard, failure state and template compile. No API.');
})().catch(error => { console.error(error); process.exitCode = 1; });
