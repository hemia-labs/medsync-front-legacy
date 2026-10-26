'use strict';
// Real Vue/Vuetify templates and methods with synthetic services. Never uses a real account or DB.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const http = require('node:http'), compiler = require('vue-template-compiler'), parser = require('@babel/parser');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..'), dist = path.resolve(root, '../_qa/frontend-issues-20261026/dist');
const out = path.resolve(root, '../docs/dashboard-ux/phases/evidence/FRONT_ISSUES_FIX_20261026');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function stripImports(code) {
  for(const node of parser.parse(code, { sourceType: 'module' }).program.body.filter(n => n.type === 'ImportDeclaration').reverse()) code = code.slice(0, node.start) + code.slice(node.end);
  return code;
}
function sfc(file) {
  const parsed = compiler.parseComponent(read(file));
  assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
  return { template: parsed.template.content, script: stripImports(parsed.script.content).replace('export default', 'return'),
    styles: parsed.styles.map(style => style.content).join('\n').replace(/::v-deep/g, '') };
}
const sources = { admin: sfc('src/core/layouts/admin.vue'), rail: sfc('src/core/components/navigation/TenantNavigationRail.vue'), create: sfc('src/views/Patient/PatientCreate.vue'), patient: sfc('src/views/Patient/PatientShow.vue') };
const scripts = {
  navigation: read('src/core/navigation/tenantNavigation.js').replace(/export /g, '') + '\nreturn { tenantNavigationItems, sortTenantNavigationItems, TENANT_NAVIGATION_TYPES, TENANT_NAVIGATION_GROUPS };',
  focus: read('src/utils/mobileNavigationFocus.js').replace('export ', '') + '\nreturn containNavigationFocus;',
  validation: read('src/domain/patient/administrative.validation.js').replace(/export /g, '') + '\nreturn { patientAge, patientAdministrativeErrors, normalizePatientPhone, localDateString };',
  field: stripImports(read('src/core/directives/field-error.js')).replace('export default', 'return'),
  locale: stripImports(read('src/plugins/vuetify.js')).replace('export default', 'return'),
  es: read('node_modules/vuetify/lib/locale/es.js').replace('export default', 'return')
};
async function mountHarness(browser, width, create = false) {
  const page = await browser.newPage({ viewport: { width, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => route.abort());
  await page.setContent('<html lang="es-MX"><body><div id="app"></div></body></html>');
  await page.addScriptTag({ path: root + '/node_modules/vue/dist/vue.js' });
  await page.addScriptTag({ path: root + '/node_modules/vuetify/dist/vuetify.js' });
  await page.addStyleTag({ path: root + '/node_modules/vuetify/dist/vuetify.min.css' });
  const mdi = fs.readFileSync(root + '/node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2').toString('base64');
  await page.addStyleTag({ content: read('node_modules/@mdi/font/css/materialdesignicons.css') + '\n@font-face{font-family:"Material Design Icons";src:url(data:font/woff2;base64,' + mdi + ') format("woff2")}' });
  await page.addStyleTag({ content: read('src/assets/tailwind.css').replace(/@tailwind.*;/g, '') + '\n' + sources.rail.styles + '\n' + sources.admin.styles + '\n' + sources.create.styles });
  await page.evaluate(({ sources, scripts, create }) => {
    const empty = { render: h => h('span') };
    Object.assign(window, { VuexMixin: {}, mapActions: () => ({}), mapGetters: () => ({}), fnTypes: {}, moduleTypes: { AUTH: {} },
      PulseReturn: empty, OnboardingCoordinator: empty, ReLogin: empty, LegalUpdateNotice: empty,
      MEDSYNC_SUPPORT_EMAIL: '', isD2AuthMode: () => true, require: () => '', canAccessPulse: () => true, canAccessSettings: () => true });
    Object.assign(window, new Function(scripts.navigation)(), new Function(scripts.validation)());
    window.containNavigationFocus = new Function(scripts.focus)();
    window.fieldError = new Function(scripts.field)();
    window.es = new Function(scripts.es)();
    const vuetify = new Function(scripts.locale)();
    const rail = new Function(sources.rail.script)(); rail.template = sources.rail.template; window.TenantNavigationRail = rail;
    Vue.prototype.$route = Vue.observable({ path: '/inicio', name: 'home', query: {}, hash: '' });
    Vue.prototype.$router = { push: async target => { const route = typeof target === 'string' ? { path: target } : target; Object.assign(Vue.prototype.$route, route, { name: route.path }); } };
    Vue.prototype.$swal = { fire: () => {} };
    Vue.prototype.$store = { state: { CORE: { AUTH: { permissions: [] } } } };
    const c = new Function(sources.admin.script)(); c.template = sources.admin.template;
    c.created = undefined;
    Object.assign(c.computed, { hasPermission: () => () => true, role: () => 'doctor', user: () => ({ name: 'Usuario de prueba' }),
      business: () => ({ name: 'Consultorio de prueba' }), tenantOperational: () => null, isAuthorized: () => true });
    c.mounted = [c.mounted, function() { window.layout = this; }];
    const child = new Function(sources.create.script)(); child.template = sources.create.template;
    child.mounted = function() { window.creator = this; };
    child.methods.ActionWrapp = async () => { throw Error('No real patient creation is allowed in this harness'); };
    window.harness = new Vue({ vuetify, render: h => h('v-app', [h(c, [create ? h(child) :
      h('section', { style: { padding: '32px', minHeight: '1200px' } }, [h('h1', 'Prueba sintética del menú'), h('p', 'Contenido para comprobar el espacio del pie.'), h('button', { attrs: { id: 'last-content' }, style: { marginTop: '1000px' } }, 'Último control')])])]) }).$mount('#app');
  }, { sources, scripts, create });
  assert.deepEqual(errors, [], 'Harness must render without Vue errors');
  return { page, errors };
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let server;
  const results = [];
  try {
    for(const width of [320, 375, 414, 768, 1280]) {
      const { page, errors } = await mountHarness(browser, width);
      await page.locator('.tenant-footer-links').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      for(const link of await page.locator('.tenant-footer-links > *').all()) {
        assert.equal(await link.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true, 'Footer link hit target at ' + width);
      }
      await page.locator('#last-content').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      assert.equal(await page.evaluate(() => document.querySelector('#last-content').getBoundingClientRect().bottom <= document.querySelector('.tenant-footer').getBoundingClientRect().top), true, 'Final control unobscured');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: out + '/footer-' + width + '.png', fullPage: false });
      if(width < 1024) {
        const trigger = page.locator('.tenant-mobile-menu-button');
        await trigger.click();
        await page.waitForFunction(() => document.querySelector('#tenant-mobile-navigation').contains(document.activeElement));
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
        const buttons = page.locator('#tenant-mobile-navigation button:visible');
        await buttons.last().focus(); await page.keyboard.press('Tab');
        assert.equal(await buttons.first().evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await buttons.last().evaluate(el => el === document.activeElement), true);
        await page.screenshot({ path: out + '/drawer-' + width + '.png' });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.activeElement === document.querySelector('.tenant-mobile-menu-button'));
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        await trigger.click();
        await page.locator('.v-overlay__scrim').click({ position: { x: width - 5, y: 300 } });
        await page.waitForFunction(() => document.activeElement === document.querySelector('.tenant-mobile-menu-button'));
        await trigger.click();
        await page.locator('#tenant-mobile-navigation button').filter({ hasText: 'Pacientes' }).first().click();
        await page.waitForFunction(() => !window.layout.isMobileNavigationOpen);
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      }
      assert.deepEqual(errors, []);
      results.push({ test: 'footer, keyboard, mobile drawer', width, result: 'PASS' }); await page.close();
    }
    for(const width of [375, 1280]) {
      const { page, errors } = await mountHarness(browser, width, true);
      await page.getByRole('button', { name: 'Crear paciente', exact: true }).click();
      for(const field of ['name', 'firstSurname', 'birthDate', 'mobilePhone']) {
        const input = page.locator('[aria-describedby~="patient-' + field + '-errors"]');
        assert.equal(await input.getAttribute('aria-invalid'), 'true');
        assert.equal(await input.getAttribute('aria-required'), 'true');
        assert.ok((await page.locator('#patient-' + field + '-errors').innerText()).length > 0);
      }
      assert.equal(await page.getByLabel('Teléfono local, opcional', { exact: true }).getAttribute('aria-required'), 'false');
      await page.getByLabel('Nombre *', { exact: true }).fill('Prueba');
      await page.getByLabel('Apellido paterno *', { exact: true }).focus();
      await page.waitForFunction(() => !document.querySelector('#patient-name-errors')?.textContent.trim());
      assert.equal(await page.getByLabel('Nombre *', { exact: true }).getAttribute('aria-invalid'), 'false');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: out + '/patient-errors-' + width + '.png' });
      await page.evaluate(() => {
        const box = document.createElement('div'); document.querySelector('.tenant-content').append(box);
        new Vue({ vuetify: window.harness.$options.vuetify, template: '<div id="locale-fixture"><v-text-field label="Buscar" value="Prueba" clearable/><v-data-table :headers="[]" :items="[]"/><v-date-picker value="2026-10-26"/><v-pagination :value="1" :length="3"/></div>' }).$mount(box);
      });
      assert.equal(await page.getByRole('button', { name: 'Limpiar Buscar', exact: true }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Próximo mes', exact: true }).count(), 1);
      assert.ok((await page.locator('#locale-fixture').innerText()).includes('No hay datos disponibles'));
      assert.ok(await page.getByRole('button', { name: 'Página siguiente', exact: true }).count() >= 1);
      results.push({ test: 'Spanish input, table, calendar and pagination', width, result: 'PASS' });
      assert.deepEqual(errors, []); results.push({ test: 'patient validation ARIA and correction', width, result: 'PASS' }); await page.close();
    }
    // Actual patient tabs/watchers and Vue Router; child editors use a synthetic dirty guard.
    for(const width of [375, 1280]) {
      const { page, errors } = await mountHarness(browser, width);
      await page.addScriptTag({ path: root + '/node_modules/vue-router/dist/vue-router.js' });
      await page.addStyleTag({ content: sources.patient.styles });
      await page.evaluate(async source => {
        const vuetify = window.harness.$options.vuetify; window.harness.$destroy(); document.body.innerHTML = '<div id="app"></div>';
        const empty = { render: h => h('span') };
        Object.assign(window, { DAHistoryHeader: empty, DAAlergyAlert: empty, AllergyEditor: empty, PatientAdministrativeForm: empty, DASweetConfirm: empty, DocumentsAndSignatures: empty, DELETE: '' });
        Vue.use(VueRouter);
        window.allowLeave = true; window.guardCalls = 0;
        const context = Vue.observable({ px: {}, modules: {}, sensitive: true });
        const c = new Function(source.script)(); c.template = source.template;
        Object.keys(c.components).forEach(key => { c.components[key] = empty; }); c.components['da-dialog'] = empty;
        for(const key of ['da-medical-history', 'da-medical-monitoring', 'da-patient-documents', 'da-patient-prescriptions', 'da-odontogram', 'da-patient-treatment']) c.components[key] = {
          template: '<p class="section-fixture">' + key + '</p>',
          mounted() { this.$emit('register-navigation-guard', this.leave); this.removeGuard = this.$router.beforeEach(async (_to, _from, next) => next(await this.leave())); },
          methods: { async leave() { window.guardCalls++; return window.allowLeave; } },
          beforeDestroy() { this.removeGuard(); this.$emit('register-navigation-guard', null); }
        };
        Object.assign(c.computed, { px: () => context.px, clinicalModules: () => context.modules, hasPermission: () => p => p !== 'clinical_history.intake' && (p !== 'clinical_history.view_sensitive' || context.sensitive) });
        c.methods.ActionWrapp = async function(_module, _fn, id) {
          if(!id) { context.modules = { odontogramEnabled: true, treatmentPlanEnabled: true }; await this.$nextTick(); return { success: true }; }
          context.px = { person: { id_person: id, name: 'Sintético', active: 1 }, access: { clinical: true } };
          await this.$nextTick(); return { success: true, data: context.px };
        };
        c.mounted = [c.mounted, function() { window.patientTabs = this; }];
        const router = new VueRouter({ mode: 'abstract', routes: [{ path: '/px/history/:id', component: c, props: true }] });
        await router.push('/px/history/synthetic?tab=monitoring&returnKey=pulse');
        window.patientRouter = router; window.patientContext = context;
        new Vue({ router, vuetify, render: h => h('v-app', [h('router-view')]) }).$mount('#app');
      }, sources.patient);
      await page.locator('.section-fixture').filter({ hasText: 'da-medical-monitoring' }).waitFor();
      assert.equal(await page.evaluate(() => window.patientRouter.currentRoute.query.tab), 'monitoring', 'Initial async module/permission changes preserve deep link');
      await page.getByRole('tab', { name: 'Recetas', exact: true }).click();
      await page.waitForFunction(() => window.patientRouter.currentRoute.query.tab === 'prescriptions');
      assert.equal(await page.evaluate(() => window.patientRouter.currentRoute.query.returnKey), 'pulse');
      assert.equal(await page.evaluate(() => window.guardCalls), 1, 'A tab click asks the old editor only once');
      await page.evaluate(() => { window.allowLeave = false; });
      await page.getByRole('tab', { name: 'Seguimiento', exact: true }).click();
      await page.waitForFunction(() => window.guardCalls === 2);
      assert.equal(await page.evaluate(() => window.patientRouter.currentRoute.query.tab), 'prescriptions');
      assert.equal(await page.evaluate(() => window.patientTabs.tab), 'da-patient-prescriptions');
      await page.evaluate(async () => { window.allowLeave = true; await window.patientTabs.init(); });
      await page.locator('.section-fixture').filter({ hasText: 'da-patient-prescriptions' }).waitFor();
      await page.getByRole('tab', { name: 'Historia clínica', exact: true }).click();
      await page.waitForFunction(() => window.patientRouter.currentRoute.query.tab === 'medical-history');
      await page.evaluate(() => { window.patientContext.sensitive = false; });
      await page.waitForFunction(() => window.patientTabs.tab !== 'da-medical-history');
      assert.equal(await page.getByRole('tab', { name: 'Historia clínica', exact: true }).count(), 0);
      assert.notEqual(await page.evaluate(() => window.patientRouter.currentRoute.query.tab), 'medical-history');
      assert.deepEqual(errors, []); results.push({ test: 'real router patient tabs, async deep link, leave guard, reload and revoked permission', width, result: 'PASS' });
      await page.close();
    }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = path.resolve(dist, '.' + pathname);
      if(!file.startsWith(dist + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    for(const url of ['/privacy', '/privacity', '/aviso-de-privacidad', '/terms-and-conditions', '/sign/d/synthetic', '/inicio']) {
      const page = await browser.newPage(), requests = [], errors = [], remoteAssets = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', async route => {
        const request = new URL(route.request().url());
        if(request.origin === origin) return route.continue();
        requests.push(request.pathname);
        if(request.hostname !== 'qa.example.invalid') { remoteAssets.push(request.hostname); return route.abort(); }
        let data = {}, status = 200;
        if(request.pathname.endsWith('/auth/session')) data = { authenticated: false };
        else if(request.pathname.includes('/saas-legal/public/')) data = { document: { title: 'Documento sintético de QA', current_version: { version_number: 1, published_at: '2026-10-26', content_html: '<p>Contenido sintético de QA</p>' } } };
        else if(request.pathname.includes('signature')) { status = 404; data = null; }
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status === 200, code: status === 404 ? 'SIGNATURE_LINK_NOT_AVAILABLE' : undefined, data }) });
      });
      await page.goto(origin + url); await page.waitForLoadState('networkidle');
      if(url === '/inicio') { assert.ok(new URL(page.url()).pathname.startsWith('/auth/')); }
      else {
        assert.equal(new URL(page.url()).pathname, ['/privacity', '/aviso-de-privacidad'].includes(url) ? '/privacy' : url);
        assert.ok(requests.some(p => p.endsWith('/auth/session')), 'Real app hydrated anonymously');
        if(!url.startsWith('/sign')) assert.ok((await page.locator('body').innerText()).includes('Contenido sintético de QA'));
        else assert.ok(requests.some(p => p.includes('signature')), 'Public signature service invoked without login');
      }
      assert.equal(await page.locator('html').getAttribute('lang'), 'es-MX');
      assert.deepEqual(remoteAssets, []); assert.deepEqual(errors, []);
      results.push({ test: 'compiled app anonymous hydration', url, result: 'PASS' }); await page.close();
    }
    fs.writeFileSync(out + '/results.json', JSON.stringify({ scope: 'Synthetic browser QA; no real login, API, patient or signature writes', results }, null, 2));
    console.log('PASS frontend browser: ' + results.length + ' cases; footer hit targets, focus/Escape/overlay/route, patient ARIA, public hydration and zero external assets.');
  } finally { await browser.close(); if(server) await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
