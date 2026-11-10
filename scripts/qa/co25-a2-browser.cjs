'use strict';
// Actual dates.vue template/methods, Vue and Vuetify. Only shell/session and
// transport wrappers are fixtures; requests run through real appointment HTTP/MySQL.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { chromium } = require('@playwright/test');
const front = path.resolve(__dirname, '../..'), workspace = path.dirname(front);
const { createFixture, createHttp } = require(path.join(workspace, 'hemia-assistance-back-legacy/scripts/qa/co25-a2-mysql-fixture'));
const read = file => fs.readFileSync(path.join(front, file), 'utf8');
const sources = Object.fromEntries(['src/domain/appointments/appointment.storage.js', 'src/domain/appointments/availability.js', 'src/domain/appointments/agendaInteraction.js', 'src/domain/appointments/writePolicy.js', 'src/domain/appointments/agendaNavigation.js', 'src/security/authorizationContext.js', 'src/services/core/appointment/DAAppointmentService.js', 'src/views/dates/dates.vue'].map(file => [path.basename(file), read(file)]));
const evidencePrefix = process.env.CO25_QA_EVIDENCE_PREFIX || 'a2';
const out = path.join(workspace, 'docs/clinical-operations/evidence/CO25');
async function main() {
    const f = await createFixture(), http = await createHttp(f), checks = [], errors = [];
    const originalNow = Date.now; Date.now = () => Date.parse('2030-01-01T16:00:00Z');
    let browser;
    const pass = name => { checks.push(name); console.log('PASS ' + name); };
    try {
        browser = await chromium.launch({ channel: 'msedge', headless: true });
        const sfc = sources['dates.vue'];
        const cssFolder = path.join(workspace, '_qa/co25-a2/build/css');
        const tailwind = fs.readdirSync(cssFolder).find(name => /^app\..*\.css$/.test(name));
        http.app.get('/vendor/vue.js', (_req, res) => res.type('js').send(read('node_modules/vue/dist/vue.js')));
        http.app.get('/vendor/vuetify.js', (_req, res) => res.type('js').send(read('node_modules/vuetify/dist/vuetify.js')));
        http.app.get('/styles.css', (_req, res) => res.type('css').send(read('node_modules/vuetify/dist/vuetify.min.css') + fs.readFileSync(path.join(cssFolder, tailwind), 'utf8') + sfc.split('<style scoped>')[1].split('</style>')[0]));
        http.app.get('/', (_req, res) => res.type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CO25 A2 QA</title><link rel="stylesheet" href="/styles.css"><div id="app"></div><script src="/vendor/vue.js"></script><script src="/vendor/vuetify.js"></script></html>'));
        for (const [label, viewport, slot] of [['desktop', { width: 1440, height: 1080 }, '16'], ['mobile', { width: 390, height: 844 }, '17']]) {
            const seed = await f.dao.save({ ...f.body, explicit_new_follow_up: true, request_id: randomUUID(), appointment: { doctorProfileId: 'qa-doctor', patientId: 'qa-patient', patientName: 'Paciente Sintético', followUpId: 'qa-trace', date: '2030-01-02', startTime: slot + ':00', endTime: slot + ':30', status: 'confirmed', contactPhone: '+525550000000' } });
            assert.equal(seed.status, 200, seed.message);
            const config = await f.dao.getConfig({ ...f.body, doctor_profile_id: 'qa-doctor' });
            const page = await browser.newPage({ viewport });
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => route.request().url().startsWith(http.url) ? route.continue() : route.abort());
            await page.goto(http.url);
            await page.evaluate(({ sources, appointment, config }) => {
                function load(file, bindings = {}) {
                    let source = sources[file];
                    if (source.includes('<script>')) source = source.split('<script>')[1].split('</script>')[0];
                    const names = Array.from(source.matchAll(/export (?:const|function|class) (\w+)/g), match => match[1]);
                    const isDefault = source.includes('export default');
                    source = source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\r?\n/gm, '').replace(/export (const|function|class)/g, '$1').replace('export default', 'const component =');
                    return new Function(...Object.keys(bindings), source + '\nreturn ' + (isDefault ? 'component' : '{' + names.join(',') + '}'))(...Object.values(bindings));
                }
                const request = async (method, url, data) => { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) }); return { ...await response.json(), success: response.ok }; };
                const DACore = Object.fromEntries(['get', 'post', 'delete'].map(method => [method, (url, data) => request(method.toUpperCase(), url, data)]));
                const service = load('DAAppointmentService.js', { DACore, DAC_APPOINTMENT_CONFIG_GET: '/api/appointment/config', DAC_APPOINTMENT_CONFIG_SAVE: '/api/appointment/config/save', DAC_APPOINTMENT_LIST: '/api/appointment/list', DAC_APPOINTMENT_PATIENT_HISTORY: id => '/api/appointment/patient/' + id + '/history', DAC_APPOINTMENT_SAVE: '/api/appointment/save', DAC_APPOINTMENT_DELETE: '/api/appointment/delete' });
                const storage = load('appointment.storage.js');
                const bindings = { ...storage, ...load('availability.js', storage), ...load('agendaInteraction.js'), ...load('writePolicy.js'), ...load('agendaNavigation.js', load('authorizationContext.js')), VuexMixin: {}, ProfessionalAgendaConfig: {}, AgendaLinkPatient: {}, mapActions: () => ({}), mapGetters: () => ({}), moduleTypes: {}, fnTypes: {}, DAAppointmentService: service, DAPxService: {}, getSettingsSections: () => [], buildAppointmentWhatsAppMessage: () => '', buildWhatsAppUrl: () => '', openWhatsAppUrl: () => {} };
                const component = load('dates.vue', bindings);
                // The SFC has nested slots; use the closing tag immediately before script.
                component.template = sources['dates.vue'].slice(sources['dates.vue'].indexOf('<template>') + 10, sources['dates.vue'].lastIndexOf('</template>', sources['dates.vue'].indexOf('<script>')));
                component.created = function() {};
                component.mounted = function() {};
                component.computed.hasPermission = () => permission => permission === 'px.dates';
                component.computed.authUser = () => ({ id_login: 'qa-actor', id_business: 'qa-clinic' });
                component.computed.role = () => 'assistant';
                component.computed.themePrimaryColor = () => '#287b80';
                component.computed.allMonitorings = () => [];
                Vue.use(Vuetify);
                Vue.prototype.$store = Vue.observable({ state: { CORE: { AUTH: { accessRevision: 1, authenticated: true, permissions: ['px.dates'] } } } });
                Vue.prototype.$route = { query: {} };
                for (const name of ['da-button-primary', 'da-button-secondary', 'da-button-900']) Vue.component(name, { props: ['label', 'disabled'], template: '<button type="button" :disabled="disabled">{{label}}</button>' });
                const root = new Vue({ vuetify: new Vuetify(), render: h => h('v-app', [h(component, { ref: 'dates' })]) }).$mount('#app');
                const vm = root.$refs.dates;
                vm.appointmentConfig = config; vm.dialogConfig = config; vm.agendaClockAt = Date.parse('2030-01-01T16:00:00Z');
                vm.doctors = [{ id_doctor_professional_profile: 'qa-doctor', display_name: 'Doctor QA', active: 1 }]; vm.selectedDoctorId = 'qa-doctor';
                vm.appointments = [appointment]; vm.selectedDate = appointment.date;
                window.qa = { vm, appointment, open: () => vm.openAppointment(appointment) };
                window.qa.open();
            }, { sources, appointment: seed.data[0], config: config.data });
            await page.waitForFunction(() => window.qa && !window.qa.vm.dialogLoading);
            assert.equal(await page.getByRole('button', { name: 'Completada', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'No asistió', exact: true }).isDisabled(), true);
            const prior = http.writes.length;
            if (label === 'mobile') {
                await page.locator('.v-select').filter({ hasText: 'Estado' }).click();
                await page.getByText('Cancelada', { exact: true }).last().click();
                await page.getByRole('button', { name: 'Guardar', exact: true }).click();
            } else await page.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
            await page.getByRole('button', { name: 'Confirmar cancelación', exact: true }).waitFor();
            await page.waitForFunction(() => window.qa.vm.cancellationPreview);
            assert.equal(http.writes.length, prior);
            await page.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
            await page.getByText('Selecciona el motivo de cancelación.', { exact: true }).waitFor();
            await page.locator('.v-dialog--active .v-select').last().click();
            await page.getByText('Otro', { exact: true }).last().click();
            await page.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
            await page.getByText('Describe el motivo de cancelación.', { exact: true }).waitFor();
            await page.locator('.v-dialog--active textarea').last().fill('Cambio de planes QA');
            await page.locator('.v-dialog--active textarea').last().blur();
            await page.evaluate(async () => { await Vue.nextTick(); await Promise.all(document.getAnimations().filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
            assert.equal(http.writes.length, prior);
            assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE_CLINICAL/);
            await page.screenshot({ path: path.join(out, evidencePrefix + '-cancellation-' + label + '.png') });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflow, false);
            await page.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
            await page.waitForFunction(() => !window.qa.vm.appointmentDialog && !window.qa.vm.savingAppointment);
            const saved = (await f.dao.get({ ...f.body, id_appointment: seed.data[0].id })).data;
            assert.equal(saved.status, 'cancelled'); assert.equal(saved.cancellationReason, 'Cambio de planes QA');
            assert.equal(http.writes.length, prior + 1);
            pass(label + ': future status controls, mandatory reason/detail, explicit confirmation, one persisted cancellation, operational preview, no overflow');
            let release, requested;
            const hold = new Promise(resolve => { release = resolve; });
            const pending = new Promise(resolve => { requested = resolve; });
            await page.route('**/cancellation-impact?*', async route => { requested(); await hold; await route.continue(); });
            await page.evaluate(saved => { window.qa.vm.openAppointment(saved); }, saved);
            await page.waitForFunction(() => !window.qa.vm.dialogLoading);
            await page.evaluate(() => { window.qa.vm.requestCancellation(); });
            await pending;
            await page.evaluate(() => { window.qa.vm.cancellationDetail = 'Private QA draft'; window.qa.vm.$store.state.CORE.AUTH.accessRevision++; });
            const response = page.waitForResponse(response => response.url().includes('/cancellation-impact?'));
            release(); await response;
            await page.waitForFunction(() => !window.qa.vm.cancellationLoading);
            assert.deepEqual(await page.evaluate(() => [window.qa.vm.cancellationDialog, window.qa.vm.cancellationPreview, window.qa.vm.cancellationDetail]), [false, null, '']);
            pass(label + ': permission revision clears cancellation draft and discards late impact response');
            await page.close();
        }
        const row = (await f.query('SELECT id_appointment id,revision FROM appointment LIMIT 1'))[0];
        const endpoint = http.url + '/api/appointment/' + row.id + '/cancellation-impact?revision=' + row.revision;
        for (const [headers, status] of [[{}, 200], [{ 'x-qa-role': 'monitoring' }, 403], [{ 'x-qa-role': 'anonymous' }, 401], [{ 'x-qa-tenant': 'other-clinic' }, 403]]) assert.equal((await fetch(endpoint, { headers })).status, status);
        pass('real HTTP permission gate permits agenda-only, denies monitoring-only, unauthenticated and cross-tenant preview');
        const denial = await fetch(http.url + '/api/appointment/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_business: 'other-clinic', request_id: randomUUID(), appointment: { doctorProfileId: 'qa-doctor', patientId: 'qa-patient', date: '2030-01-03', startTime: '09:00', endTime: '09:30', status: 'completed' } }) });
        assert.equal((await denial.json()).data.code, 'APPOINTMENT_NOT_STARTED');
        pass('HTTP save rejects future completion and ignores client-supplied tenant');
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(out, evidencePrefix + '-browser-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), syntheticOnly: true, realHttpAndMysql: true, checks, pageErrors: errors }, null, 2));
    } finally { Date.now = originalNow; if (browser) await browser.close(); await http.close(); await f.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
