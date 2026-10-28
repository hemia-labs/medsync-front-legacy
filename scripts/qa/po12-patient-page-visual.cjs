'use strict';
// Render the real directory component/Vuetify with synthetic data, no live API.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const evidence = path.resolve(root, '../docs/platform-operations/evidence/PO12');
const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Patient/Patients.vue'), 'utf8'));
const styles = parsed.styles.map(style => style.content).join('\n');
const component = parsed.script.content.replace(/^import .*;\r?\n/gm, '').replace('export default', 'window.PatientDirectory =');
const patients = Array.from({ length: 8 }, (_, index) => ({ id_person: 'synthetic-' + index, code: '00000' + (index + 1), active: 1,
    name: ['Ana', 'Carlos', 'Elena', 'Javier', 'Laura', 'Marcos', 'Sofia', 'Teresa'][index], surname: 'Paciente de prueba',
    telephone: '555000000' + index, ocupation: index % 2 ? 'Docente' : 'Comerciante', age: 26 + index }));
(async () => {
    fs.mkdirSync(evidence, { recursive: true });
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage();
    try {
        await page.route('**/*', route => route.abort());
        await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');
        await page.addStyleTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.min.css') });
        await page.addStyleTag({ content: ':root{--color-primary-700:#1497bd;--color-primary-900:#086783;--color-primary-100:#e6f7fb}body{margin:0}' + styles });
        await page.addScriptTag({ path: path.join(root, 'node_modules/vue/dist/vue.js') });
        await page.addScriptTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.js') });
        await page.evaluate(({ component, template, patients }) => {
            window.mapGetters = () => ({ hasPermission: () => () => true,
                authUser: () => ({ id_login: 'actor', id_business: 'tenant' }), business: () => ({ id_business: 'tenant' }), authPermissions: () => ['px.all', 'px.new'] });
            window.moduleTypes = { AUTH: 'auth' }; window.fnTypes = {};
            window.requests = [];
            window.DAHomeService = { getPatientsPage: async body => {
                window.requests.push(body);
                const items = body.param ? patients.filter(patient => (patient.name + ' ' + patient.surname).toLowerCase().includes(body.param.toLowerCase())) : patients;
                return { success: true, data: { items, pagination: { page: body.page, pageSize: 8,
                    pageCount: body.param ? 1 : 12, total: body.param ? items.length : 89, totalPatients: 89, withOccupation: 67 } } };
            } };
            (0, eval)(component);
            window.PatientDirectory.template = template;
            window.Vue.component('router-link', { props: ['to'], template: '<a :href="to"><slot/></a>' });
            window.directoryApp = new window.Vue({ vuetify: new window.Vuetify(), render: h => h('v-app', [h(window.PatientDirectory)]) }).$mount('#app');
        }, { component, template: parsed.template.content, patients });
        const measurements = [];
        for (const [label, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
            await page.setViewportSize({ width, height });
            await page.getByRole('heading', { name: 'Directorio clínico' }).waitFor();
            await page.waitForFunction(() => document.querySelectorAll('.patients-table tbody tr').length === 8);
            const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth,
                tableVisible: getComputedStyle(document.querySelector('.patients-table-wrap')).display !== 'none',
                mobileVisible: getComputedStyle(document.querySelector('.patients-mobile-list')).display !== 'none' }));
            assert.ok(sizes.content <= sizes.viewport + 1, label + ' has no horizontal document overflow');
            assert.equal(label === 'mobile' ? sizes.mobileVisible : sizes.tableVisible, true);
            await page.screenshot({ path: path.join(evidence, 'patients-' + label + '.png'), fullPage: true });
            measurements.push({ label, ...sizes });
        }
        await page.locator('#patients-search').fill('Ana');
        await page.waitForFunction(() => window.requests.at(-1).param === 'Ana' && document.querySelectorAll('.patients-table tbody tr').length === 1);
        await page.screenshot({ path: path.join(evidence, 'patients-mobile-search.png'), fullPage: true });
        console.log(JSON.stringify({ result: 'PASS', measurements, search: 'PASS', data: 'synthetic, no network' }, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
