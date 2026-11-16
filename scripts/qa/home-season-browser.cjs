'use strict';
// Real Home header and HomeHeroScene, isolated in Edge. No session/API/DB/network.
// Evidence folder: HOME_QA_OUT, or the workspace docs folder next to the repository.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const compiler = require('vue-template-compiler');
const parser = require('@babel/parser');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const out = process.env.HOME_QA_OUT || path.resolve(root, '../docs/dashboard-ux/phases/evidence/HOME_HERO_SCENE_20261116');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function source(file) {
  const parsed = compiler.parseComponent(read(file));
  let script = parsed.script.content;
  for (const node of parser.parse(script, { sourceType: 'module' }).program.body.filter(n => n.type === 'ImportDeclaration').reverse()) {
    script = script.slice(0, node.start) + script.slice(node.end);
  }
  assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
  return { script: script.replace('export default', 'return'), template: parsed.template.content,
    styles: parsed.styles.map(style => style.content).join('\n') };
}
const sources = {
  home: source('src/views/Home/Home.vue'),
  scene: source('src/views/Home/components/HomeHeroScene.vue')
};
sources.home.template = '<section class="home-page"><div class="home-container">' +
  sources.home.template.match(/<header[\s\S]*?<\/header>/)[0] + '</div></section>';
const seasonScript = read('src/utils/homeSeason.js').replace('export ', '') + '\nreturn getHomeSeason;';
const getHomeSeason = new Function(seasonScript)();
const dates = [
  [2026, 9, 19, 23, 59, 'normal'], [2026, 9, 20, 0, 0, 'day-of-dead'],
  [2026, 9, 22, 23, 59, 'day-of-dead'], [2026, 9, 23, 0, 0, 'doctors-day'],
  [2026, 9, 23, 23, 59, 'doctors-day'], [2026, 9, 24, 0, 0, 'day-of-dead'],
  [2026, 9, 31, 23, 59, 'day-of-dead'], [2026, 10, 1, 0, 0, 'day-of-dead'],
  [2026, 10, 3, 23, 59, 'day-of-dead'], [2026, 10, 4, 0, 0, 'normal'],
  [2026, 10, 30, 23, 59, 'normal'], [2026, 11, 1, 0, 0, 'christmas'],
  [2026, 11, 25, 12, 0, 'christmas'], [2026, 11, 31, 23, 59, 'christmas'],
  [2027, 0, 1, 0, 0, 'christmas'], [2027, 0, 1, 23, 59, 'christmas'],
  [2027, 0, 2, 0, 0, 'normal'], [2027, 0, 31, 12, 0, 'normal'],
  [2027, 1, 13, 23, 59, 'normal'], [2027, 1, 14, 0, 0, 'valentine'],
  [2027, 1, 14, 23, 59, 'valentine'], [2027, 1, 15, 0, 0, 'normal'],
  [2027, 8, 14, 23, 59, 'normal'], [2027, 8, 15, 0, 0, 'independence'],
  [2027, 8, 16, 23, 59, 'independence'], [2027, 8, 17, 0, 0, 'normal'],
  [2027, 9, 20, 0, 0, 'day-of-dead'], [2027, 11, 1, 0, 0, 'christmas'],
  [2028, 0, 1, 23, 59, 'christmas'], [2028, 0, 2, 0, 0, 'normal']
];
for (const [year, month, day, hour, minute, expected] of dates) {
  assert.equal(getHomeSeason(new Date(year, month, day, hour, minute)), expected);
}
// What each festivity must paint, and what the plain scene must always keep.
const seasons = [
  ['normal', '2026-11-16', { '.hs-garland': 0, '.hs-fall': 0 }],
  ['day-of-dead', '2026-10-26', { '.hs-paper': 7, '.hs-flame': 3, '.hs-fall': 18 }],
  ['christmas', '2026-12-25', { '.hs-bulb-glow': 13, '.hs-snowflake': 18, '.hs-snow': 3 }],
  ['valentine', '2027-02-14', { '.hs-heart': 6, '.hs-sway': 7 }],
  ['independence', '2026-09-15', { '.hs-paper': 7, '.hs-burst': 3, '.hs-flag-wave': 1 }],
  ['doctors-day', '2026-10-23', { '.hs-bob': 3, '.hs-sway': 7, '.hs-fall': 18 }]
];
const periods = [['morning', '09', { '.hs-rays': 1, '.hs-star': 0, '.hs-balloon': 1 }],
  ['afternoon', '15', { '.hs-rays': 1, '.hs-star': 0, '.hs-balloon': 1 }],
  ['night', '21', { '.hs-rays': 0, '.hs-star': 14, '.hs-balloon': 0 }]];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const [width, theme] of [[1440, 'light'], [390, 'light'], [1440, 'clinical-night']]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, timezoneId: 'America/Mexico_City' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.route('**/*', route => route.abort());
      await page.clock.install({ time: new Date('2026-11-16T09:00:00-06:00') });
      await page.setContent('<html lang="es-MX" data-theme="' + theme + '"><body><div id="app"></div></body></html>');
      await page.addScriptTag({ path: require.resolve('vue/dist/vue.js') });
      await page.addStyleTag({ content: 'body{margin:0;font-family:Arial,sans-serif;background:' + (theme === 'light' ? '#eef4f6' : '#0b1220') +
        '}*{box-sizing:border-box}' + sources.home.styles + sources.scene.styles });
      await page.evaluate(({ sources, seasonScript }) => {
        const empty = { render: h => h('span') };
        Object.assign(window, { VuexMixin: {}, mapGetters: () => ({}), PreparationChecklist: empty, HomeInsights: empty,
          moduleTypes: {}, fnTypes: {} });
        window.getHomeSeason = new Function(seasonScript)();
        window.HomeHeroScene = new Function(sources.scene.script)();
        HomeHeroScene.template = sources.scene.template;
        const home = new Function(sources.home.script)();
        home.template = sources.home.template;
        home.created = function() { this.startHomeClock(); };
        home.beforeDestroy = function() { clearInterval(this.homeClockTimer); };
        home.watch = {};
        home.computed.displayUserName = () => 'Usuario de prueba';
        home.mounted = function() { window.home = this; };
        new Vue({ render: h => h(home) }).$mount('#app');
      }, { sources, seasonScript });
      await page.locator('.hero-scene').waitFor();
      // The 900ms entry fade runs on real time; measure and capture after it settles.
      await new Promise(resolve => setTimeout(resolve, 1100));
      const suffix = width + (theme === 'light' ? '' : '-dark');
      for (const [season, date, seasonCounts] of seasons) {
        for (const [period, hour, periodCounts] of periods) {
          await page.clock.setSystemTime(new Date(date + 'T' + hour + ':00:00-06:00'));
          await page.evaluate(() => { window.home.currentDateTime = new Date(); });
          await page.waitForFunction(([s, p]) => window.home.homeSeason === s && window.home.dayPeriod === p &&
            document.querySelector('.home-hero--' + p + ' > .hero-scene--' + p + '.hero-scene--season-' + s), [season, period]);
          for (const [selector, count] of Object.entries({ ...seasonCounts, ...periodCounts, '.hs-ambulance': 1, '.hs-ecg-pulse': 1, '.hs-window': 14 })) {
            assert.equal(await page.locator(selector).count(), count, season + '/' + period + ' ' + selector);
          }
          // The scene is part of the card: same box on desktop, a bottom band on phones.
          const boxes = await page.evaluate(() => ['.home-hero', '.hero-scene', '.hero-copy'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
          const [hero, scene, copy] = boxes;
          assert.ok(Math.abs(scene[2] - hero[2]) <= 2 && Math.abs(scene[3] - hero[3]) <= 2, 'Scene is anchored to the card corner');
          if (width > 760) {
            assert.ok(Math.abs(scene[1] - hero[1]) <= 2, 'Scene spans the full card height');
            assert.ok(scene[2] - scene[0] > (hero[2] - hero[0]) * 0.55, 'Scene covers more than half of the card');
          } else assert.ok(copy[3] <= scene[1] + 2, 'Text sits above the scene band on phones');
          assert.equal(await page.locator('.hero-scene').getAttribute('aria-hidden'), 'true');
          assert.equal(await page.locator('.hero-scene').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.locator('.home-hero').screenshot({ path: path.join(out, season + '-' + period + '-' + suffix + '.png') });
          results.push({ season, period, width, theme, status: 'PASS' });
        }
      }
      // Midnight while Home remains open: exercise its actual one-minute clock.
      for (const [date, before, after] of [
        ['2026-10-19', 'normal', 'day-of-dead'], ['2026-10-22', 'day-of-dead', 'doctors-day'],
        ['2026-10-23', 'doctors-day', 'day-of-dead'], ['2026-11-03', 'day-of-dead', 'normal'],
        ['2026-11-30', 'normal', 'christmas'], ['2026-12-31', 'christmas', 'christmas'],
        ['2027-01-01', 'christmas', 'normal'], ['2027-02-13', 'normal', 'valentine'],
        ['2027-09-16', 'independence', 'normal']
      ]) {
        await page.clock.setSystemTime(new Date(date + 'T23:59:50-06:00'));
        await page.evaluate(() => { window.home.currentDateTime = new Date(); });
        assert.equal(await page.evaluate(() => window.home.homeSeason), before);
        await page.clock.fastForward(60000);
        assert.equal(await page.evaluate(() => window.home.homeSeason), after);
        assert.equal(await page.locator('.hero-scene--season-' + after).count(), 1);
        assert.equal(await page.locator('.hs-garland').count(), after === 'normal' ? 0 : 1);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const [date, selectors] of [
        ['2026-11-16', ['.hero-scene', '.hs-ambulance', '.hs-ecg-pulse', '.hs-cloud', '.hs-spark']],
        ['2026-10-26', ['.hs-sway', '.hs-flame', '.hs-fall']],
        ['2026-12-25', ['.hs-twinkle', '.hs-fall']],
        ['2027-02-14', ['.hs-heart']], ['2026-09-15', ['.hs-burst', '.hs-flag-wave']], ['2026-10-23', ['.hs-bob']]
      ]) {
        await page.clock.setSystemTime(new Date(date + 'T09:00:00-06:00'));
        await page.evaluate(() => { window.home.currentDateTime = new Date(); });
        for (const selector of selectors) {
          await page.locator(selector).first().waitFor({ state: 'attached' });
          assert.equal(await page.locator(selector).first().evaluate(el => getComputedStyle(el).animationName), 'none', selector);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ scope: 'Isolated real Home header and HomeHeroScene; no authenticated app, API or DB',
      dateCases: dates.length, calendarTransitions: 'Nine midnight transitions via Home timer, each viewport/theme', reducedMotion: 'PASS', results }, null, 2) + '\n');
    console.log('PASS: ' + dates.length + ' calendar cases, ' + results.length + ' renders (6 seasons x 3 periods; 1440 light, 390 light, 1440 dark), 9 midnight transitions, reduced motion; no browser errors or overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
