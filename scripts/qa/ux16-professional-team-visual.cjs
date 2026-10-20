'use strict';
// Real Vue 2 dashboard/components, synthetic services, no authenticated session or network.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const workspaceEvidence = path.resolve(root, '../docs/dashboard-ux/evidence/UX16');
const evidence = fs.existsSync(path.dirname(path.dirname(workspaceEvidence)))
    ? workspaceEvidence : path.join(os.tmpdir(), 'medsync-ux16-evidence');
// The API response is synthetic; backend regression separately verifies the real plan catalog.
const dashboard = { level: 'operational', planLabel: 'Profesional', capabilities: {
    planStatus: true, licenseUsage: true, basicActivity: true, administrativeAlerts: true,
    trends: true, operationalAnalysis: true, teamBreakdown: true,
    professionalBreakdown: false, branchBreakdown: false, advancedReports: false
} };
const names = ['DashboardActivityTrends', 'DashboardEnterpriseLockedWidget', 'DashboardLockedWidget',
    'DashboardOperationalSummary', 'DashboardProfessionalBreakdown', 'DashboardTeamBreakdown', 'TenantDashboard'];
const components = names.map(name => {
    const file = name === 'TenantDashboard' ? name : 'components/' + name;
    const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Dashboard/' + file + '.vue'), 'utf8'));
    return { name, template: parsed.template.content, styles: parsed.styles.map(style => style.content).join('\n'),
        script: parsed.script.content.replace(/^import .*;\r?\n/gm, '').replace('export default', 'window.' + name + ' =') };
});
const metrics = fs.readFileSync(path.join(root, 'src/domain/dashboard/metrics.js'), 'utf8').replace(/export /g, '');
(async () => {
    fs.mkdirSync(evidence, { recursive: true });
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
        await page.route('**/*', route => route.abort());
        await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');
        await page.addStyleTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.min.css') });
        await page.addStyleTag({ content: 'body{margin:0}' + components.map(component => component.styles).join('\n') });
        await page.addScriptTag({ path: path.join(root, 'node_modules/vue/dist/vue.js') });
        await page.addScriptTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.js') });
        await page.evaluate(({ components, metrics, dashboard }) => {
            (0, eval)(metrics);
            window.moduleTypes = { AUTH: 'auth' };
            window.buildPlanFeatureMessage = response => response.message;
            window.isPlanFeatureResponse = () => false;
            const access = { scope: { mode: 'tenant' }, families: { administrative: true, clinical: true, financial: false } };
            const capacity = { professionals: { used: 1, limit: 1, remaining: 0 }, staffUsers: { used: 2, limit: 3, remaining: 1 } };
            const team = { users: { active: 3, inactive: 1, professionals: 1, staffUsers: 2 },
                roles: [{ role: 'professional', count: 1 }, { role: 'auxiliary', count: 2 }], license: capacity };
            window.overviewCalls = 0;
            window.DABusinessDashboardService = {
                getOverview: async () => { window.overviewCalls++; return { success: true, data: {
                    summary: { business: { name: 'Consultorio de prueba', plan: 'pro', planName: 'Profesional', status: 'active', subscriptionStatus: 'active' },
                        license: capacity, range: { from: '2026-10-01', to: '2026-10-31' }, access, dashboard,
                        activity: { patientsCreated: 12, appointmentsCreated: 24, prescriptionsIssued: 8, clinicalHistoriesFinalized: 6 } },
                    widgets: { teamBreakdown: { status: 200, data: team }, trends: { status: 200, data: { series: [
                        { period: '2026-10', patientsCreated: 12, appointmentsCreated: 24, prescriptionsIssued: 8, clinicalHistoriesFinalized: 6 }
                    ] } }, operational: { status: 200, data: { appointments: { total: 24, scheduled: 20, byStatus: [] },
                        prescriptions: { total: 8, issued: 8, drafts: 0, cancelled: 0 }, clinicalHistories: { total: 6, finalized: 6, drafts: 0, pending: 0 } } } }
                } }; }
            };
            for (const component of components) {
                (0, eval)(component.script);
                window[component.name].template = component.template;
            }
            const store = { getters: { 'auth/getUser': { id_login: 'synthetic', id_business: 'synthetic-tenant' },
                'auth/getBusiness': { id_business: 'synthetic-tenant' }, 'auth/getPermissions': ['dashboard.operations', 'dashboard.scope.all'] } };
            window.Vue.prototype.$store = store;
            new window.Vue({ vuetify: new window.Vuetify(), render: h => h('v-app', [h(window.TenantDashboard)]) }).$mount('#app');
        }, { components, metrics, dashboard });
        const measurements = [];
        for (const [label, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
            await page.setViewportSize({ width, height });
            await page.getByRole('heading', { name: 'Uso por equipo', exact: true }).waitFor();
            assert.equal(await page.locator('.professional-widget, .enterprise-locked-widget').count(), 0);
            assert.equal(await page.getByRole('heading', { name: 'Vista administrativa del equipo', exact: true }).count(), 0, 'Included information is a note, not an upgrade banner');
            const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
            assert.ok(sizes.content <= sizes.viewport + 1, label + ' has no horizontal overflow');
            await page.screenshot({ path: path.join(evidence, 'dashboard-' + label + '.png'), fullPage: true });
            await page.locator('.team-widget').screenshot({ path: path.join(evidence, 'team-' + label + '.png') });
            measurements.push({ label, ...sizes });
        }
        await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
        await page.waitForFunction(() => window.overviewCalls === 2 && document.querySelector('.team-widget .team-content'));
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ result: 'PASS', measurements, refresh: 'PASS', errors, data: 'synthetic; no network or authenticated account' }, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
