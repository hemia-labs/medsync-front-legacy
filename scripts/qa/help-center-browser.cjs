'use strict';
// Real help, layout, navigation and Vue Router; synthetic session, no API/DB access.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const compiler = require('vue-template-compiler'), parser = require('@babel/parser');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const out = path.resolve(process.env.HELP_QA_OUTPUT || path.join(require('node:os').tmpdir(), 'medsync-help-center-qa'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function stripImports(code) {
  for (const node of parser.parse(code, { sourceType: 'module' }).program.body.filter(n => n.type === 'ImportDeclaration').reverse()) code = code.slice(0, node.start) + code.slice(node.end);
  return code;
}
function sfc(file) {
  const parsed = compiler.parseComponent(read(file));
  assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
  return { template: parsed.template.content, script: stripImports(parsed.script.content).replace('export default', 'return'),
    styles: parsed.styles.map(style => style.content).join('\n') };
}
const sources = { admin: sfc('src/core/layouts/admin.vue'), rail: sfc('src/core/components/navigation/TenantNavigationRail.vue'), help: sfc('src/views/Help/HelpCenter.vue') };
sources.help.styles = require('@vue/component-compiler-utils').compileStyle({ source: sources.help.styles,
  filename: 'HelpCenter.vue', id: 'data-v-help-qa', scoped: true }).code;
const dataCode = read('src/domain/help/helpIndex.js').replace(/export /g, '') + '\n'
  + read('src/domain/help/helpArticles.js').replace(/export /g, '') + '\n'
  + read('src/domain/help/helpAnswers.js').replace(/export /g, '') + '\nreturn {helpSections,helpTopics,helpEntries,helpFlows,helpArticles,helpAnswers};';
const navigationCode = read('src/core/navigation/tenantNavigation.js').replace(/export /g, '') + '\nreturn {tenantNavigationItems,sortTenantNavigationItems,TENANT_NAVIGATION_TYPES,TENANT_NAVIGATION_GROUPS};';
const routeCode = read('src/router/routes/help.js').replace('export default', 'return');
const data = new Function(dataCode)();
const environment = name => ({ env: { NODE_ENV: name } });
const navigation = name => new Function('process', navigationCode)(environment(name));
const routes = name => new Function('process', routeCode)(environment(name));

function checkIndex() {
  const { helpEntries: entries, helpTopics: topics, helpFlows: flows } = data;
  assert.equal(new Set(entries.map(e => e.id)).size, entries.length);
  assert.equal(new Set(entries.map(e => e.title)).size, entries.length);
  for (const entry of entries) {
    assert.equal(entry.editorialStatus, data.helpArticles[entry.id] || data.helpAnswers[entry.id] ? 'draft' : 'title-only');
    assert.ok(topics.some(t => t.id === entry.topic));
    assert.ok(flows[entry.flow]);
    assert.ok(!['body', 'answer', 'content', 'steps', 'html'].some(key => key in entry));
    if (entry.type === 'question') {
      assert.equal(entry.validationStatus, 'proposed');
      assert.ok(entries.some(other => other.id === entry.relatedArticle && other.type === 'guide'));
    }
    for (const id of entry.prerequisites || []) assert.ok(entries.some(other => other.id === id && other.type === 'guide'));
  }
  for (const flow of Object.values(flows)) assert.ok(fs.existsSync(path.join(root, flow.source)), flow.source);
  assert.deepEqual(Object.keys(data.helpAnswers).sort(), entries.filter(entry => entry.type === 'question').map(entry => entry.id).sort());
  for (const paragraphs of Object.values(data.helpAnswers)) assert.ok(paragraphs.length && paragraphs.every(text => typeof text === 'string' && text.trim()));
  assert.deepEqual(Object.keys(data.helpArticles).sort(), entries.filter(entry => entry.type === 'guide').map(entry => entry.id).sort(), 'All 33 authorized guides are drafted');
  for (const [id, article] of Object.entries(data.helpArticles)) {
    assert.ok(entries.some(entry => entry.id === id && entry.type === 'guide'));
    assert.ok(article.summary && article.sections.length);
    assert.equal(new Set(article.sections.map(section => section.id)).size, article.sections.length);
    for (const section of article.sections) assert.ok(section.title && (section.paragraphs || section.steps || section.items));
  }
  for (const section of data.helpSections) for (const topic of topics) {
    const list = entries.filter(e => e.section === section.id && e.topic === topic.id);
    assert.ok(list.length >= 2);
    assert.equal(new Set(list.map(e => e.order)).size, list.length);
  }
  assert.equal(routes('production').length, 0);
  assert.equal(routes('test').length, 0);
  assert.equal(routes('development')[0].meta.requireAuth, true);
  assert.equal(routes('development')[0].meta.layout, 'admin');
  const prod = navigation('production').tenantNavigationItems;
  const dev = navigation('development').tenantNavigationItems;
  assert.deepEqual(dev.filter(e => e.key !== 'help'), prod, 'Existing navigation unchanged');
  assert.equal(dev.filter(e => e.key === 'help').length, 1);
  const build = path.resolve(root, process.env.HELP_QA_BUILD || 'dist', 'js');
  if (fs.existsSync(build)) {
    const files = fs.readdirSync(build).filter(file => file.endsWith('.js'));
    assert.ok(files.length);
    assert.ok(!files.some(file => file.includes('help-center-preview')));
    for (const file of files) {
      const code = fs.readFileSync(path.join(build, file), 'utf8');
      assert.ok(!code.includes('preparacion-pendiente') && !code.includes('Resuelve una tarea y comprueba el resultado'), 'No help index or article in production');
    }
  }
  return { guides: entries.filter(e => e.type === 'guide').length, questions: entries.filter(e => e.type === 'question').length };
}

async function mount(browser, width, role) {
  const page = await browser.newPage({ viewport: { width, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.route('**/*', route => route.abort());
  await page.setContent('<html lang="es-MX"><body><div id="app"></div></body></html>');
  for (const file of ['vue/dist/vue.js', 'vuetify/dist/vuetify.js', 'vue-router/dist/vue-router.js']) await page.addScriptTag({ path: root + '/node_modules/' + file });
  await page.addStyleTag({ path: root + '/node_modules/vuetify/dist/vuetify.min.css' });
  const mdi = fs.readFileSync(root + '/node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2').toString('base64');
  const baseStyle = read('src/assets/tailwind.css').split('@layer base')[0].replace(/@tailwind.*;/g, '');
  await page.addStyleTag({ content: baseStyle + '\n' + read('node_modules/@mdi/font/css/materialdesignicons.css') + '\n@font-face{font-family:"Material Design Icons";src:url(data:font/woff2;base64,' + mdi + ') format("woff2")}\n' + Object.values(sources).map(s => s.styles).join('\n') });
  const focusCode = read('src/utils/mobileNavigationFocus.js').replace('export ', '') + '\nreturn containNavigationFocus;';
  await page.evaluate(async ({ sources, dataCode, navigationCode, focusCode, role }) => {
    const empty = { render: h => h('span') };
    Object.assign(window, { VuexMixin: {}, mapActions: () => ({}), mapGetters: () => ({}), fnTypes: {}, moduleTypes: { AUTH: {} },
      PulseReturn: empty, OnboardingCoordinator: empty, ReLogin: empty, LegalUpdateNotice: empty, MEDSYNC_SUPPORT_EMAIL: '',
      isD2AuthMode: () => true, require: () => '', canAccessPulse: () => role === 'business_admin', canAccessSettings: () => true });
    Object.assign(window, new Function(dataCode)(), new Function('process', navigationCode)({ env: { NODE_ENV: 'development' } }));
    const { Vue, VueRouter, Vuetify, tenantNavigationItems } = window;
    window.containNavigationFocus = new Function(focusCode)();
    const rail = new Function(sources.rail.script)(); rail.template = sources.rail.template; window.TenantNavigationRail = rail;
    Vue.prototype.$swal = { fire: () => {} };
    Vue.prototype.$store = { state: { CORE: { AUTH: { permissions: [] } } } };
    const layout = new Function(sources.admin.script)(); layout.template = sources.admin.template; layout.created = undefined;
    Object.assign(layout.computed, { hasPermission: () => permission => !permission || role === 'business_admin' || ['px.new', 'px.all', 'px.dates'].includes(permission),
      role: () => role, user: () => ({ name: 'Persona de prueba' }), business: () => ({ name: 'Consultorio de prueba' }), tenantOperational: () => null, isAuthorized: () => true });
    layout.mounted = [layout.mounted, function() { window.layout = this; }];
    const help = new Function(sources.help.script)(); help.template = sources.help.template; help._scopeId = 'data-v-help-qa';
    Vue.use(VueRouter);
    const stub = { template: '<p>Destino sintético de navegación</p>' };
    const router = new VueRouter({ mode: 'abstract', routes: tenantNavigationItems.filter(e => e.routeName).map(e => ({
      name: e.routeName, path: e.path, component: e.key === 'help' ? help : stub
    })) });
    window.helpRouter = router;
    await router.push('/inicio');
    new Vue({ router, vuetify: new Vuetify(), render: h => h('v-app', [h(layout, [h('router-view')])]) }).$mount('#app');
  }, { sources, dataCode, navigationCode, focusCode, role });
  return { page, errors };
}

(async () => {
  const counts = checkIndex(), results = [];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, role] of [[1440, 'business_admin'], [390, 'doctor'], [320, 'receptionist']]) {
      const { page, errors } = await mount(browser, width, role);
      const menu = width >= 1024 ? '.tenant-desktop-navigation' : '#tenant-mobile-navigation';
      if (width < 1024) await page.getByRole('button', { name: 'Abrir navegacion principal', exact: true }).click();
      const access = page.locator(menu).getByRole('button', { name: 'Centro de ayuda', exact: true });
      await access.focus(); await page.keyboard.press('Enter');
      await page.locator('.help-center h1').waitFor();
      assert.equal(await page.evaluate(() => window.helpRouter.currentRoute.name), 'helpCenter');
      if (width < 1024) await page.waitForFunction(() => !window.layout.isMobileNavigationOpen);
      assert.equal(await page.locator('.help-entry-list li').count(), counts.guides);
      assert.equal(await page.locator('.help-entry-list a').count(), 33);
      assert.equal(await page.locator('.help-entry-list button, .help-entry-list p').count(), 0);
      assert.equal(await page.locator('.help-center h1').count(), 1);
      assert.equal(await page.locator('.help-center h2').count(), 1);
      assert.equal(await page.locator('.help-center h3').count(), 7);
      assert.equal(await page.locator('.help-center h4, .help-center details, .help-center img').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const sectionLinks = page.locator('.help-sections a');
      await sectionLinks.first().focus(); await page.keyboard.press('Tab');
      assert.equal(await sectionLinks.last().evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.help-topics a').first().evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await sectionLinks.last().evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('.help-topics a').first().evaluate(el => getComputedStyle(el).color), 'rgb(51, 65, 85)');
      await page.screenshot({ path: out + '/guide-' + width + '.png', fullPage: true });
      for (const section of ['guia', 'preguntas']) {
        await page.locator('.help-sections a').nth(section === 'guia' ? 0 : 1).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(id => document.querySelector('.help-content h2').id === id, section);
        assert.equal(await page.locator('.help-entry-list li').count(), section === 'guia' ? counts.guides : counts.questions);
        for (const link of await page.locator('.help-topics a').all()) {
          await link.focus();
          assert.equal(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
          await page.keyboard.press('Enter');
          const id = (await link.getAttribute('href')).slice(1);
          await page.waitForFunction(target => document.activeElement.id === target, id);
          assert.ok(await page.locator('#' + id).evaluate(el => el.getBoundingClientRect().top >= 75));
        }
      }
      await page.locator('.help-back').focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'preguntas');
      await page.screenshot({ path: out + '/questions-' + width + '.png', fullPage: true });
      await page.screenshot({ path: out + '/questions-viewport-' + width + '.png', fullPage: false });
      for (const entry of data.helpEntries.filter(entry => entry.type === 'question')) {
        const answer = page.locator('[data-help-id="' + entry.id + '"]');
        assert.equal(await answer.locator('h4').textContent(), entry.title);
        assert.deepEqual(await answer.locator('p').allTextContents(), data.helpAnswers[entry.id]);
        await answer.locator('a').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.activeElement.id === 'help-article-title');
        assert.equal(await page.locator('#help-article-title').textContent(), data.helpEntries.find(item => item.id === entry.relatedArticle).title);
        await page.evaluate(() => window.helpRouter.back());
        await page.waitForFunction(() => !!document.querySelector('.help-answer'));
      }
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'clinical-night'));
      assert.equal(await page.locator('.help-answer p').first().evaluate(el => getComputedStyle(el).color), 'rgb(203, 213, 225)');
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.locator('.help-back').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.help-back').evaluate(el => el.getBoundingClientRect().bottom <= document.querySelector('.tenant-footer').getBoundingClientRect().top), true, 'Last link above fixed footer');
      // Same anchor can be revisited after scrolling; browser history and unknown hashes stay usable.
      await page.locator('.help-topics a').first().click();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.locator('.help-topics a').first().click();
      await page.waitForFunction(() => document.activeElement.id === 'preguntas-empezar');
      await page.evaluate(async () => { await window.helpRouter.push('/ayuda?seccion=guia#guia-agenda'); });
      await page.waitForFunction(() => document.activeElement.id === 'guia-agenda');
      await page.evaluate(() => window.helpRouter.back());
      await page.waitForFunction(() => document.activeElement.id === 'preguntas-empezar');
      await page.evaluate(async () => { await window.helpRouter.push('/ayuda?seccion=desconocida#no-existe'); });
      await page.waitForFunction(() => document.activeElement.id === 'guia');
      for (const id of Object.keys(data.helpArticles).filter(id => id !== 'revisar-preparacion')) {
        await page.locator('[data-help-id="' + id + '"] a').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.activeElement.id === 'help-article-title');
        assert.equal(await page.locator('.help-article h3').count(), data.helpArticles[id].sections.length);
        assert.equal(await page.locator('.help-center h1').count(), 1);
        assert.equal(await page.locator('.help-center h2').count(), 1);
        assert.equal(await page.locator('.help-article ol li').count(), data.helpArticles[id].sections.reduce((sum, section) => sum + (section.steps || []).length, 0));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.equal(await page.locator('.help-sections a').first().getAttribute('aria-current'), 'page');
        await page.screenshot({ path: out + '/' + id + '-' + width + '.png', fullPage: true });
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'clinical-night'));
        assert.equal(await page.locator('.help-article-summary').evaluate(el => getComputedStyle(el).color), 'rgb(229, 231, 235)');
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
        const back = page.locator('.help-article > .help-back').last();
        await back.focus();
        await back.scrollIntoViewIfNeeded();
        assert.equal(await back.evaluate(el => el.getBoundingClientRect().bottom <= document.querySelector('.tenant-footer').getBoundingClientRect().top), true);
        await page.keyboard.press('Enter');
        await page.waitForFunction(topic => document.activeElement.id === 'guia-' + topic, data.helpEntries.find(entry => entry.id === id).topic);
      }
      const articleLink = page.locator('[data-help-id="revisar-preparacion"] a');
      await articleLink.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'help-article-title');
      assert.equal(await page.locator('.help-sections a').first().getAttribute('aria-current'), 'page', 'Guide stays selected inside article');
      assert.equal(await page.locator('.help-article h3').count(), 5);
      assert.equal(await page.locator('.help-article ol li').count(), 3);
      assert.equal(await page.locator('.help-center h1').count(), 1);
      assert.equal(await page.locator('.help-center h2').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.screenshot({ path: out + '/article-' + width + '.png', fullPage: true });
      await page.locator('.help-article > .help-back').last().focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'guia-empezar');
      await page.evaluate(() => window.helpRouter.back());
      await page.waitForFunction(() => document.activeElement.id === 'help-article-title');
      await page.locator('.help-topics a').nth(1).click();
      await page.waitForFunction(() => document.activeElement.id === 'guia-agenda');
      await page.evaluate(async () => { await window.helpRouter.push('/ayuda?seccion=guia&articulo=no-existe'); });
      assert.equal(await page.locator('.help-article').count(), 0);
      await page.evaluate(async () => { await window.helpRouter.push('/ayuda?seccion=preguntas&articulo=revisar-preparacion'); });
      assert.equal(await page.locator('.help-article').count(), 0, 'Guide query cannot open inside FAQ');
      assert.equal(await page.locator('.help-answer').count(), 23);
      await page.evaluate(async () => { await window.helpRouter.push('/ayuda?seccion=guia&articulo=revisar-preparacion'); });
      await page.waitForFunction(() => document.activeElement.id === 'help-article-title');
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'clinical-night'));
      assert.equal(await page.locator('.help-article-summary').evaluate(el => getComputedStyle(el).color), 'rgb(229, 231, 235)', 'Article text inherits night foreground');
      await page.screenshot({ path: out + '/night-' + width + '.png', fullPage: false });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      results.push({ width, role, result: 'PASS', checks: 'menu, section, 14 anchors, focus, headings, 33 authorized articles, 23 FAQ answers and related guides, article links/back/history, invalid article fallback, reflow, night' });
      await page.close();
    }
    // Existing development server: anonymous help request must reach login, with all API traffic blocked.
    if (process.env.HELP_QA_SKIP_LIVE === '1') {
      results.push({ test: 'actual development router anonymous guard', result: 'SKIPPED: servers stopped at user request' });
    } else {
    const live = await browser.newPage();
    await live.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.hostname === 'localhost' && url.port === '4324' ? route.continue() : route.abort();
    });
    await live.goto('http://localhost:4324/ayuda');
    await live.waitForURL('**/auth/login', { timeout: 30000 });
    results.push({ test: 'actual development router anonymous guard (API blocked)', result: 'PASS' });
    await live.close();
    }
    const report = { scope: 'local synthetic session, actual components; no authenticated server QA', counts, results };
    fs.writeFileSync(out + '/results.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
