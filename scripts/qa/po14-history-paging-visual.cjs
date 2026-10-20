'use strict';
// Real Vue2 templates/styles, Vuetify and pager; synthetic services, no authenticated app/API.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const compiler = require('vue-template-compiler');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const evidence = path.resolve(root, '../docs/platform-operations/evidence/PO14');
function source(file) {
    const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8'));
    const imports = [];
    const script = sfc.script.content.replace(/^import ([\s\S]*?) from ['"][^'"]+['"];?\r?\n/gm, (_match, binding) => {
        imports.push(...binding.replace(/[{}]/g, '').split(',').map(name => name.trim().split(/\s+as\s+/).at(-1))); return '';
    }).replace('export default', 'window.RenderComponent =');
    return { script, imports, template: sfc.template.content, css: sfc.styles.map(style => style.content).join('\n') };
}
const cases = [
    ['documents', 'src/views/Patient/Sections/DocumentsAndSignatures.vue'],
    ['patient-prescriptions', 'src/views/Patient/Sections/Prescriptions.vue'],
    ['prescriptions', 'src/views/prescriptions/Prescriptions.vue'],
    ['plans', 'src/views/Patient/Sections/TreatmentPlan.vue']
];
(async () => {
    fs.mkdirSync(evidence, { recursive: true });
    const pager = source('src/components/common/ListPageNav.vue');
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const results = [];
    try {
        for (const [name, file] of cases) {
            const component = source(file), page = await browser.newPage();
            const errors = []; page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => route.abort());
            await page.setContent('<!doctype html><html lang="es"><meta charset="utf-8"><body><div id="app"></div></body></html>');
            await page.addStyleTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.min.css') });
            const cssDir = path.join(root, '.tmp-po14-build/css');
            if (fs.existsSync(cssDir)) for (const css of fs.readdirSync(cssDir).filter(file => /^app\..*\.css$/.test(file))) await page.addStyleTag({ path: path.join(cssDir, css) });
            await page.addStyleTag({ content: ':root{--color-primary-700:#0e7490;--color-primary-500:#0891b2;--color-primary-300:#67c8dd}body{margin:0}.qa-host{width:100%;min-width:0;max-width:1300px;margin:auto;padding:12px}.v-application{background:#f4f7fa}' + component.css + pager.css });
            await page.addScriptTag({ path: path.join(root, 'node_modules/vue/dist/vue.js') });
            await page.addScriptTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.js') });
            await page.evaluate(({ component, pager, name }) => {
                const empty = { template: '<div></div>' };
                for (const key of component.imports) window[key] = empty;
                window.VuexMixin = {};
                window.fnTypes = new Proxy({}, { get: (_object, key) => key });
                window.moduleTypes = { AUTH: 'auth', TREATMENT: 'treatment', CONFIGURATION: 'config' };
                window.mapGetters = (_module, bindings) => Object.fromEntries(Object.entries(bindings).map(([key]) => [key, () => {
                    if (key === 'hasPermission') return () => true;
                    if (key === 'authRole') return 'admin';
                    if (key === 'authUser') return { id_login: 'actor', rol: 'admin' };
                    if (key === 'authBusiness') return { id_business: 'tenant' };
                    return {};
                }]));
                window.isD2AuthMode = () => true;
                window.getSettingsSections = () => [];
                window.sanitizeHtmlForDocumentSnapshot = value => value;
                window.safeDocumentImageSource = value => value;
                window.snapshot = value => JSON.stringify(value);
                window.localToday = () => '2026-10-19';
                window.requestId = () => 'synthetic-request';
                window.validatePrescriptionDateRange = () => '';
                window.dialogName = {}; window.fieldError = {};
                window.renderRequests = [];
                const pagination = page => ({ page: Number(page || 1), totalPages: 3, total: 25, pageSize: 10 });
                const documents = page => ({ items: [1, 2].map(index => ({ id_patient_document: `document-${page}-${index}`, title: `Consentimiento ${page}.${index}`,
                    document_type: 'GENERAL_ATTENTION_CONSENT', status: index === 1 ? 'BORRADOR' : 'FIRMADO', created_at: '2026-10-19T12:00:00', doctor_name_snapshot: 'Dra. Elena Prueba', origin: 'DOCUMENT_CENTER', signatures: [], requires_patient_signature: 1 })), pagination: pagination(page), creationHints: [] });
                const prescriptions = page => ({ items: [1, 2].map(index => ({ id_prescription: `rx-${page}-${index}`, folio: `RX-${page}00${index}`, issue_date: '2026-10-19',
                    status: index === 1 ? 'draft' : 'issued', doctor_name: 'Dra. Elena Prueba', patient_name: 'Paciente de prueba', created_by: 'actor', medications: 'Medicamento de prueba', notes: 'Captura sintetica' })), pagination: pagination(page) });
                window.DADocumentService = { getPatientDocuments: async (_id, params) => { window.renderRequests.push(params); return { success: true, data: documents(params.page) }; },
                    getTemplates: async () => ({ success: true, data: [] }) };
                window.DAPrescriptionService = { doctors: async () => ({ success: true, data: [] }),
                    list: async params => { window.renderRequests.push(params); return { success: true, data: prescriptions(params.page) }; },
                    listByPatient: async (_id, params) => { window.renderRequests.push(params); return { success: true, data: prescriptions(params.page) }; } };
                window.DATreatmentService = { getSigningDoctors: async () => ({ success: true, data: { doctors: [] } }) };
                window.mapActions = (_module, bindings) => Object.fromEntries(bindings.map(key => [key, async function(request) {
                    if (key !== 'getTreatmentPlan') return { success: true, data: {} };
                    window.renderRequests.push(request.params);
                    return { success: true, data: { patient: { id_person: 'patient' }, permissions: { view: true, create: true, edit: true, costView: true }, config: {}, activePlan: null,
                        history: [1, 2].map(index => ({ id_treatment_plan: `plan-${request.params.page}-${index}`, title: `Plan ${request.params.page}.${index}`, status: 'closed', started_at: '2026-09-01', closed_at: '2026-10-18', treatments: [], consent_versions: [] })),
                        historyPagination: { ...pagination(request.params.page), pageSize: 5 } } };
                }]));
                window.Vue.prototype.$router = { beforeEach: () => () => {} };
                window.Vue.prototype.$store = { getters: { 'auth/getUser': { id_login: 'actor' }, 'auth/getBusiness': { id_business: 'tenant' } } };
                window.Vue.component('da-loader', empty);
                window.Vue.component('da-button-secondary', { props: ['label'], template: '<button type="button">{{ label }}</button>' });
                (0, eval)(pager.script); window.ListPageNav = window.RenderComponent; window.ListPageNav.template = pager.template;
                (0, eval)(component.script); const definition = window.RenderComponent; definition.template = component.template;
                if (name === 'plans') { const initialData = definition.data; definition.data = function() { return { ...initialData.call(this), showHistorySection: true }; }; }
                window.qaApp = new window.Vue({ vuetify: new window.Vuetify(), render: h => h('v-app', [h('div', { class: 'qa-host' }, [h(definition, { props: { px: { person: { id_person: 'patient', name: 'Paciente', surname: 'de prueba', age: 32 } } } })])]) }).$mount('#app');
            }, { component, pager, name });
            const nav = page.locator('.list-page-nav');
            await nav.waitFor();
            for (const [layout, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
                await page.setViewportSize({ width, height });
                await page.waitForFunction(() => document.querySelector('.list-page-nav').innerText.includes('Página 1 de 3'));
                const dimensions = await page.evaluate(() => {
                    const nav = document.querySelector('.list-page-nav'), rect = nav.getBoundingClientRect();
                    return { viewport: innerWidth, content: document.documentElement.scrollWidth, pagerWidth: rect.width,
                        buttons: [...nav.querySelectorAll('button')].map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })) };
                });
                assert.ok(dimensions.content <= width + 1, name + '/' + layout + ' document overflow: ' + JSON.stringify(dimensions));
                assert.ok(dimensions.buttons.every(button => button.height >= 39 && button.width >= 60));
                await nav.getByRole('button', { name: 'Siguiente' }).click();
                await page.waitForFunction(() => document.querySelector('.list-page-nav').innerText.includes('Página 2 de 3'));
                assert.equal(await nav.getByRole('button', { name: 'Anterior' }).isEnabled(), true);
                await page.screenshot({ path: path.join(evidence, `${name}-${layout}.png`), fullPage: true });
                results.push({ name, layout, ...dimensions, navigation: 'PASS' });
                await nav.getByRole('button', { name: 'Anterior' }).click();
                await page.waitForFunction(() => document.querySelector('.list-page-nav').innerText.includes('Página 1 de 3'));
            }
            assert.deepEqual(errors, [], name + ' has no page errors');
            await page.close();
        }
        const result = { result: 'PASS', data: 'synthetic, real templates and pager, no authenticated app or API', measurements: results };
        fs.writeFileSync(path.join(evidence, 'visual-results.json'), JSON.stringify(result, null, 2) + '\n');
        console.log(JSON.stringify(result, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
