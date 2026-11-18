// T1 and exact D-5 contract, real Vue shell with synthetic transport. No authenticated acceptance.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const OUT = process.env.NC1_QA_OUT || path.join(require('node:os').tmpdir(), 'medsync-nc1-clues-qa');
fs.mkdirSync(OUT, { recursive: true });
const btn = (p, name) => p.getByRole('button', { name, exact: true });
const field = p => p.locator('.health-units [data-field="cluesRef"]');
const writes = p => p.evaluate(() => window.qaLog);
async function idle(p) { await p.waitForFunction(() => !document.querySelector('.health-units').__vue__.busy); }
async function state(p, expected) { await p.waitForFunction(s => { const v = document.querySelector('.health-units').__vue__; return v.reval && v.reval.state === s && !v.busy; }, expected); }
async function open(p, theme, query = 'scenario=verified') {
  await p.goto('http://127.0.0.1:4388/admin?section=identity&' + query + (theme ? '&theme=night' : ''));
  await p.locator('.health-units').waitFor();
  await p.waitForFunction(() => !document.querySelector('.health-units').__vue__.loading);
}
async function confirm(p) { await btn(p, 'Actualizar a la versión vigente…').click(); await btn(p, 'Actualizar referencia').click(); await idle(p); }
async function manual(p) { await btn(p, 'Editar unidad').click(); await btn(p, 'Ingresar mi CLUES').click(); }
const cases = {
  async t1ModeWithoutTyping(p, night) {
    await open(p, night); await manual(p);
    assert.match(await field(p).locator('.v-messages').first().innerText(), /Se conserva la referencia del catálogo\. Si editas/);
    assert.equal(await p.locator('.unit-selection-label').innerText(), 'Referencia elegida');
    assert.equal((await writes(p)).length, 0);
    await p.screenshot({ path: path.join(OUT, 't1-retained-help-' + p.viewportSize().width + '-' + (night ? 'night' : 'light') + '.png'), fullPage: true });
    await btn(p, 'Guardar unidad').click(); await idle(p);
    const w = await writes(p); assert.equal(w.length, 1); assert.equal(w[0].payload.identity.cluesRef.releaseId, 'sis.establishments-qa');
  },
  async t1TypedAndRestoredCodeIsManual(p, night) {
    await open(p, night); await manual(p);
    await field(p).locator('input').first().fill('QAPRV000777'); await field(p).locator('input').first().fill('QASMP000101'); await field(p).locator('input').first().press('Tab');
    assert.match(await field(p).locator('.v-messages').first().innerText(), /^Se guardará como captura manual/);
    assert.equal(await p.locator('.unit-selection-label').innerText(), 'CLUES capturada manualmente');
    await btn(p, 'Guardar unidad').click(); await idle(p);
    const ref = (await writes(p))[0].payload.identity.cluesRef; assert.equal(ref.code, 'QASMP000101'); assert.equal(ref.releaseId, undefined);
  },
  async t1ReselectRestoresCatalogReference(p, night) {
    await open(p, night); await manual(p); await field(p).locator('input').first().fill('QAPRV000777');
    await btn(p, 'Buscar en catálogo').click(); await field(p).locator('input').first().fill('norte');
    await p.locator('.v-menu__content.menuable__content__active .v-list-item', { hasText: 'QASMP000202' }).first().click();
    await btn(p, 'Ingresar mi CLUES').click();
    assert.match(await field(p).locator('.v-messages').first().innerText(), /^Se conserva la referencia/);
    await btn(p, 'Guardar unidad').click(); await idle(p);
    const ref = (await writes(p))[0].payload.identity.cluesRef; assert.equal(ref.code, 'QASMP000202'); assert.equal(ref.releaseId, 'sis.establishments-qa');
  },
  async exactLookupDoesNotWrite(p, night) {
    await open(p, night, 'scenario=stale'); await btn(p, 'Comprobar con la versión vigente').click(); await state(p, 'found');
    const reads = await p.evaluate(() => window.qaReads.filter(x => x.path.includes('/catalogs/')));
    assert.deepEqual(reads.at(-1).params, { exactCode: 'QASMP000101' }); assert.equal((await writes(p)).length, 0);
    await confirm(p); const w = await writes(p); assert.equal(w.length, 1); assert.deepEqual(Object.keys(w[0].payload.identity), ['cluesRef']);
  },
  async releaseChangedNeedsFreshConfirmation(p, night) {
    await open(p, night, 'scenario=stale&fail=catalog-409'); await btn(p, 'Comprobar con la versión vigente').click(); await state(p, 'found');
    await confirm(p); await state(p, 'found');
    assert.match(await p.locator('.unit-reval').innerText(), /El catálogo cambió mientras revisabas/); assert.equal((await writes(p)).length, 1);
    const reads = await p.evaluate(() => window.qaReads.filter(x => x.params.exactCode)); assert.equal(reads.length, 2);
    await confirm(p); assert.equal((await writes(p)).length, 2);
  },
  async nonoperatingEntryIsNotCalledMissing(p, night) {
    await open(p, night, 'scenario=stale&catalogState=ineligible'); await btn(p, 'Comprobar con la versión vigente').click(); await state(p, 'ineligible');
    assert.match(await p.locator('.unit-reval').innerText(), /La clave aparece/);
    assert.equal(await btn(p, 'Actualizar a la versión vigente…').count(), 0); assert.equal((await writes(p)).length, 0);
  }
};
(async () => {
  await require('./ready.cjs')(); const browser = await chromium.launch({ headless: true }); const report = [];
  try {
    for (const width of [1280, 390]) for (const night of [false, true]) for (const [name, run] of Object.entries(cases)) {
      const p = await browser.newPage({ viewport: { width, height: 900 } }); p.setDefaultTimeout(12000);
      const result = { name, width, theme: night ? 'night' : 'light', errors: [] };
      p.on('pageerror', e => result.errors.push(String(e)));
      try { await run(p, night); assert.equal(result.errors.length, 0); assert.equal(await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)), 0); result.pass = true; }
      catch (e) { result.pass = false; result.error = String(e); }
      result.screenshot = name + '-' + width + '-' + result.theme + '.png';
      await p.screenshot({ path: path.join(OUT, result.screenshot), fullPage: true });
      report.push(result); console.log(name, width, result.theme, result.pass ? 'PASS' : result.error); await p.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, 'implementation-report.json'), JSON.stringify(report, null, 2));
  console.log('TOTAL', report.filter(x => x.pass).length + '/' + report.length);
  if (report.some(x => !x.pass)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
