'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Dashboard/TenantDashboard.vue'), 'utf8'));
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
const waiting = { overview: [], trends: [] }, requests = [];
const defer = key => params => { requests.push({ key, params }); return new Promise(resolve => waiting[key].push(resolve)); };
const sandbox = { module: { exports: {} }, moduleTypes: { AUTH: 'auth' },
    DashboardActivityTrends: {}, DashboardEnterpriseLockedWidget: {}, DashboardLockedWidget: {},
    DashboardOperationalSummary: {}, DashboardProfessionalBreakdown: {}, DashboardTeamBreakdown: {}, PulseEntry: {},
    buildPlanFeatureMessage: () => 'Plan no disponible', isPlanFeatureResponse: () => false,
    DABusinessDashboardService: { getOverview: defer('overview'), getTrends: defer('trends') } };
vm.runInNewContext(parsed.script.content.replace(/^import .*;\r?\n/gm, '').replace('export default', 'module.exports ='), sandbox);
const definition = sandbox.module.exports;
const getters = { 'auth/getUser': { id_login: 'actor', id_business: 'tenant' }, 'auth/getBusiness': { id_business: 'tenant' },
    'auth/getPermissions': ['dashboard.operations'] };
const state = { ...definition.data(), $store: { getters } };
for (const [key, method] of Object.entries(definition.methods)) state[key] = method.bind(state);
for (const [key, getter] of Object.entries(definition.computed)) Object.defineProperty(state, key, { get: getter.bind(state) });
function overview(tag = 'overview') { return { success: true, data: { summary: { activity: { appointmentsCreated: 5 },
    dashboard: { capabilities: { trends: true, operationalAnalysis: true, professionalBreakdown: true, teamBreakdown: true } } },
    widgets: { trends: { status: 200, data: { tag } }, operational: { status: 500, message: 'Fallo sintetico' },
        professionalBreakdown: { status: 200, data: { items: [] } }, teamBreakdown: { status: 200, data: { users: {} } } } } }; }
(async () => {
    const first = state.fetchSummary();
    assert.equal(requests.length, 1);
    waiting.overview.shift()(overview()); await first;
    assert.equal(requests.length, 1, 'Initial load makes one request, no per-widget fanout');
    assert.equal(state.summary.activity.appointmentsCreated, 5);
    assert.equal(state.trendsData.tag, 'overview');
    assert.equal(state.operationalError, 'Fallo sintetico');
    assert.equal(state.professionalBreakdownData.items.length, 0, 'Partial widget failure preserves unrelated data');
    const pending = state.fetchSummary();
    const retry = state.fetchWidget('trends', 'getTrends', 'trends');
    waiting.trends.shift()({ success: true, data: { tag: 'retry' } }); await retry;
    waiting.overview.shift()(overview('late overview')); await pending;
    assert.equal(state.trendsData.tag, 'retry', 'Overview cannot overwrite a newer widget retry');
    const changed = state.fetchSummary();
    state.trendsGranularity = 'week';
    waiting.overview.shift()(overview('old month')); await changed;
    assert.equal(requests.at(-1).params.granularity, 'week', 'Changed granularity is fetched after summary makes capability visible');
    waiting.trends.shift()({ success: true, data: { tag: 'week' } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.trendsData.tag, 'week');
    const old = state.fetchSummary();
    getters['auth/getUser'] = { id_login: 'next', id_business: 'next-tenant' };
    getters['auth/getBusiness'] = { id_business: 'next-tenant' };
    state.clearDashboard();
    waiting.overview.shift()(overview('foreign')); await old;
    assert.equal(state.summary, null);
    assert.equal(state.trendsData, null);
    const fail = state.fetchSummary(); waiting.overview.shift()({ success: false, message: 'Fallo total' }); await fail;
    assert.equal(state.errorMessage, 'Fallo total');
    assert.equal(state.isLoading, false);
    const disposed = state.fetchSummary(); definition.beforeDestroy.call(state);
    waiting.overview.shift()(overview('destroyed')); await disposed;
    assert.equal(state.summary, null);
    console.log('PASS PO13 dashboard: one initial request, widget partial failure/retry, newer replies, changed granularity, tenant change, total failure, disposal and template compile. No API.');
})().catch(error => { console.error(error); process.exitCode = 1; });
