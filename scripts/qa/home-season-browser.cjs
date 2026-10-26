'use strict';
// Real Home header, seasonal SVG, owned Lottie wrapper and player. No session/API/DB.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const compiler = require('vue-template-compiler');
const parser = require('@babel/parser');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const out = path.resolve(root, '../docs/dashboard-ux/phases/evidence/HOME_CHRISTMAS_20261026');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function source(file) {
  const parsed = compiler.parseComponent(read(file));
  let script = parsed.script.content;
  for (const node of parser.parse(script, { sourceType: 'module' }).program.body.filter(n => n.type === 'ImportDeclaration').reverse()) {
    script = script.slice(0, node.start) + script.slice(node.end);
  }
  if (parsed.template) assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
  return { script: script.replace('export default', 'return'), template: parsed.template && parsed.template.content,
    styles: parsed.styles.map(style => style.content).join('\n') };
}
const sources = {
  home: source('src/views/Home/Home.vue'),
  decoration: source('src/views/Home/components/HomeSeasonalDecoration.vue'),
  owned: source('src/views/Home/components/OwnedHomeLottie.vue'),
  legacy: source('node_modules/lottie-vuejs/src/LottieAnimation.vue')
};
sources.home.template = '<section class="home-page"><div class="home-container">' +
  sources.home.template.match(/<header[\s\S]*?<\/header>/)[0] + '</div></section>';
const seasonScript = read('src/utils/homeSeason.js').replace('export ', '') + '\nreturn getHomeSeason;';
const getHomeSeason = new Function(seasonScript)();
const dates = [
  [2026, 9, 19, 23, 59, 'normal'], [2026, 9, 20, 0, 0, 'day-of-dead'],
  [2026, 9, 31, 23, 59, 'day-of-dead'], [2026, 10, 1, 0, 0, 'day-of-dead'],
  [2026, 10, 3, 23, 59, 'day-of-dead'], [2026, 10, 4, 0, 0, 'normal'],
  [2026, 10, 30, 23, 59, 'normal'], [2026, 11, 1, 0, 0, 'christmas'],
  [2026, 11, 25, 12, 0, 'christmas'], [2026, 11, 31, 23, 59, 'christmas'],
  [2027, 0, 1, 0, 0, 'christmas'], [2027, 0, 1, 23, 59, 'christmas'],
  [2027, 0, 2, 0, 0, 'normal'], [2027, 0, 31, 12, 0, 'normal'],
  [2027, 9, 20, 0, 0, 'day-of-dead'], [2027, 11, 1, 0, 0, 'christmas'],
  [2028, 0, 1, 23, 59, 'christmas'], [2028, 0, 2, 0, 0, 'normal']
];
for (const [year, month, day, hour, minute, expected] of dates) {
  assert.equal(getHomeSeason(new Date(year, month, day, hour, minute)), expected);
}
const animations = Object.fromEntries(['morning', 'afternoon', 'night'].map(period =>
  ['/lottie/doctor-' + period + '.json', JSON.parse(read('public/lottie/doctor-' + period + '.json'))]));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, timezoneId: 'America/Mexico_City' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.route('**/*', route => route.abort());
      await page.clock.install({ time: new Date('2026-10-26T09:00:00-06:00') });
      await page.setContent('<html lang="es-MX"><body><div id="app"></div></body></html>');
      await page.addScriptTag({ path: root + '/node_modules/vue/dist/vue.js' });
      await page.addScriptTag({ path: root + '/node_modules/lottie-web/build/player/lottie.js' });
      await page.addStyleTag({ content: 'body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}' + sources.home.styles + sources.decoration.styles });
      await page.evaluate(({ sources, animations, seasonScript }) => {
        const empty = { render: h => h('span') };
        Object.assign(window, { VuexMixin: {}, mapGetters: () => ({}), PreparationChecklist: empty, HomeInsights: empty,
          moduleTypes: {}, fnTypes: {}, axios: { get: async key => {
            if (!animations[key]) throw Error('Unexpected asset request: ' + key);
            return { data: JSON.parse(JSON.stringify(animations[key])) };
          } } });
        window.getHomeSeason = new Function(seasonScript)();
        window.LegacyLottie = new Function(sources.legacy.script)();
        LegacyLottie.template = sources.legacy.template;
        window.OwnedHomeLottie = new Function(sources.owned.script)();
        window.HomeSeasonalDecoration = new Function(sources.decoration.script)();
        HomeSeasonalDecoration.template = sources.decoration.template;
        const home = new Function(sources.home.script)();
        home.template = sources.home.template;
        home.created = function() { this.startHomeClock(); };
        home.beforeDestroy = function() { clearInterval(this.homeClockTimer); };
        home.watch = {};
        home.computed.displayUserName = () => 'Usuario de prueba';
        home.mounted = function() { window.home = this; };
        new Vue({ render: h => h(home) }).$mount('#app');
      }, { sources, animations, seasonScript });
      await page.waitForFunction(() => document.querySelector('.hero-visual > div > svg'));
      for (const [season, date] of [['day-of-dead', '2026-10-26'], ['christmas', '2026-12-25']]) {
      for (const [period, hour] of [['morning', '09'], ['afternoon', '15'], ['night', '21']]) {
        await page.clock.setSystemTime(new Date(date + 'T' + hour + ':00:00-06:00'));
        await page.evaluate(() => { window.home.currentDateTime = new Date(); });
        await page.waitForFunction(period => window.home.dayPeriod === period && document.querySelector('.hero-visual > div > svg'), period);
        assert.equal(await page.locator('.home-seasonal-decoration--' + period).count(), 1);
        assert.equal(await page.locator('.home-seasonal-decoration--' + season).count(), 1);
        assert.equal(await page.locator('.home-seasonal-decoration__paper').count(), season === 'day-of-dead' ? 5 : 0);
        assert.equal(await page.locator('.home-seasonal-decoration__ornament').count(), season === 'christmas' ? 4 : 0);
        assert.equal(await page.locator('.hero-visual').isVisible(), width > 760);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (width > 760) {
          await page.locator('.home-hero').screenshot({ path: out + '/' + season + '-' + period + '-desktop.png' });
          await page.locator('.hero-visual').screenshot({ path: out + '/' + season + '-' + period + '-detail.png' });
        } else await page.screenshot({ path: out + '/' + season + '-' + period + '-mobile.png' });
        results.push({ season, period, width, status: 'PASS' });
      }
      }
      // Midnight while Home remains open: exercise its actual one-minute clock.
      for (const [date, before, after] of [
        ['2026-10-19', 'normal', 'day-of-dead'], ['2026-11-03', 'day-of-dead', 'normal'],
        ['2026-11-30', 'normal', 'christmas'], ['2026-12-31', 'christmas', 'christmas'],
        ['2027-01-01', 'christmas', 'normal']
      ]) {
        await page.clock.setSystemTime(new Date(date + 'T23:59:50-06:00'));
        await page.evaluate(() => { window.home.currentDateTime = new Date(); });
        assert.equal(await page.evaluate(() => window.home.homeSeason), before);
        await page.clock.fastForward(60000);
        assert.equal(await page.evaluate(() => window.home.homeSeason), after);
        assert.equal(await page.locator('.home-seasonal-decoration').count(), after === 'normal' ? 0 : 1);
        assert.equal(await page.locator('.hero-visual--seasonal').count(), after === 'normal' ? 0 : 1);
      }
      if (width > 760) await page.locator('.home-hero').screenshot({ path: out + '/normal-january-2.png' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const [date, selectors] of [
        ['2026-10-26', ['.home-seasonal-decoration__paper', '.home-seasonal-decoration__flame']],
        ['2026-12-25', ['.home-seasonal-decoration__light', '.home-seasonal-decoration__ornament']]
      ]) {
      await page.clock.setSystemTime(new Date(date + 'T09:00:00-06:00'));
      await page.evaluate(() => { window.home.currentDateTime = new Date(); });
      for (const selector of selectors) assert.equal(await page.locator(selector).first().evaluate(el => getComputedStyle(el).animationName), 'none');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(out + '/results.json', JSON.stringify({ scope: 'Isolated real Home header/components/player; local assets; no authenticated app, API or DB', dateCases: dates.length,
      calendarTransitions: 'October 20, November 4, December 1, January 1 and January 2 via Home timer, both widths', reducedSeasonalMotion: 'PASS', results }, null, 2) + '\n');
    console.log('PASS: ' + dates.length + ' calendar cases, 12 desktop/mobile period renders, 5 midnight transitions at both widths, reduced seasonal motion; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
