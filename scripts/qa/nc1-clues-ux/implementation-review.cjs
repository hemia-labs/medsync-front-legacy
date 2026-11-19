// T1, I1/I2/I3 and exact D-5 contract, real Vue shell with synthetic transport. No authenticated acceptance.
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
  await p.goto((process.env.NC1_QA_BASE || 'http://127.0.0.1:4388') + '/admin?section=identity&' + query + (theme ? '&theme=night' : ''));
  await p.locator('.health-units').waitFor();
  await p.waitForFunction(() => !document.querySelector('.health-units').__vue__.loading);
}
async function confirm(p) { await btn(p, 'Actualizar a la versión vigente…').click(); await btn(p, 'Actualizar referencia').click(); await idle(p); }
async function manual(p) { await btn(p, 'Editar unidad').click(); await btn(p, 'Ingresar mi CLUES').click(); }
const unitName = p => p.locator('.health-units [data-field="displayName"] input');
async function selectCurrent(p, release = 'sis.establishments-qa') {
  await field(p).locator('input').first().fill('QASMP000202');
  await p.waitForFunction(release => {
    const v = document.querySelector('.health-units .catalog-field').__vue__;
    return !v.loading && v.rows.some(r => r.ref.releaseId === release && r.ref.code === 'QASMP000202');
  }, release);
  const matches = p.locator('.v-menu__content.menuable__content__active .v-list-item', { hasText: 'QASMP000202' });
  assert.equal(await matches.count(), 1); // I2: a historical selection must not precede the current search result.
  await matches.first().click();
}
async function startRegistration(p, night, failures) {
  await open(p, night, 'scenario=empty&advanceCatalog=1&fail=' + failures);
  await btn(p, 'Registrar la unidad del consultorio').click(); await selectCurrent(p);
  await btn(p, 'Guardar unidad').click(); await idle(p);
}
async function catalogError(p) {
  assert.match(await field(p).locator('.v-messages').first().innerText(), /El catálogo cambió/);
  assert.doesNotMatch(await p.locator('.health-units').innerText(), /Registro sin confirmar:/);
  assert.equal(await btn(p, 'Guardar unidad').isEnabled(), true);
}
async function visibleReference(p, code, release) {
  const selection = field(p).locator('.v-select__selections .catalog-field-code');
  await selection.waitFor({ state: 'visible' }); assert.equal(await selection.innerText(), code);
  assert.deepEqual(await p.evaluate(() => {
    const v = document.querySelector('.health-units .catalog-field').__vue__;
    const ac = v.$children.find(c => c.$options.name === 'v-autocomplete');
    return { value: v.value, selected: ac.selectedItems.map(i => i.ref) };
  }), { value: { family: 'sis.establishments', code, releaseId: release }, selected: [{ family: 'sis.establishments', code, releaseId: release }] });
}
async function leaveSearch(p) {
  await field(p).locator('input').first().press('Escape'); await unitName(p).click();
}
const cases = {
  async i3StaleReferenceVisibleOnOpenFocusAndBlur(p, night) {
    await open(p, night, 'scenario=stale'); await btn(p, 'Editar unidad').click();
    await visibleReference(p, 'QASMP000101', 'sis.establishments-qa-2025');
    await field(p).locator('input').first().click();
    await p.waitForFunction(() => {
      const v = document.querySelector('.health-units .catalog-field').__vue__;
      return !v.loading && v.rows.some(r => r.ref.code === 'QASMP000101');
    });
    await leaveSearch(p); await visibleReference(p, 'QASMP000101', 'sis.establishments-qa-2025');
    assert.equal((await writes(p)).length, 0);
  },
  async i3SearchWithoutSelectionRestoresVisibleReference(p, night) {
    await startRegistration(p, night, 'catalog-409'); await catalogError(p);
    await visibleReference(p, 'QASMP000202', 'sis.establishments-qa');
    const before = await writes(p); assert.equal(before.length, 1);
    await field(p).locator('input').first().fill('QASMP000202');
    await p.waitForFunction(() => {
      const v = document.querySelector('.health-units .catalog-field').__vue__;
      return !v.loading && v.rows.some(r => r.ref.releaseId === 'sis.establishments-qa-next');
    });
    assert.equal(await p.locator('.v-menu__content.menuable__content__active .v-list-item', { hasText: 'QASMP000202' }).count(), 1);
    await leaveSearch(p); await visibleReference(p, 'QASMP000202', 'sis.establishments-qa');
    assert.deepEqual(await writes(p), before);
    await p.screenshot({ path: path.join(OUT, 'i3-abandoned-search-' + p.viewportSize().width + '-' + (night ? 'night' : 'light') + '.png'), fullPage: true, timeout: 60000 });
    // Restoring the saved display must not prevent the next explicit search from selecting the current release.
    await selectCurrent(p, 'sis.establishments-qa-next'); await btn(p, 'Guardar unidad').click(); await idle(p);
    const after = await writes(p); assert.equal(after.length, 2); assert.equal(after[1].key, before[0].key);
    assert.equal(after[1].payload.identity.cluesRef.releaseId, 'sis.establishments-qa-next');
    assert.equal(await p.evaluate(() => window.qaState.units.length), 1);
  },
  async i2FirstMatchAfterReleaseChangeIsCurrent(p, night) {
    await startRegistration(p, night, 'catalog-409'); await catalogError(p);
    const before = await writes(p); assert.equal(before.length, 1);
    await field(p).locator('input').first().fill('QASMP000202');
    await p.waitForFunction(() => {
      const v = document.querySelector('.health-units .catalog-field').__vue__;
      return !v.loading && v.rows.some(r => r.ref.releaseId === 'sis.establishments-qa-next');
    });
    const matches = p.locator('.v-menu__content.menuable__content__active .v-list-item', { hasText: 'QASMP000202' });
    assert.equal(await matches.count(), 1);
    assert.equal(await p.evaluate(() => document.querySelector('.health-units').__vue__.form.cluesRef.releaseId), 'sis.establishments-qa');
    assert.equal((await writes(p)).length, 1);
    await p.screenshot({ path: path.join(OUT, 'i2-first-match-' + p.viewportSize().width + '-' + (night ? 'night' : 'light') + '.png'), fullPage: true, timeout: 60000 });
    await matches.first().click(); assert.equal((await writes(p)).length, 1);
    await btn(p, 'Guardar unidad').click(); await idle(p);
    const w = await writes(p); assert.equal(w.length, 2); assert.equal(w[1].key, w[0].key);
    assert.equal(w[1].payload.identity.cluesRef.releaseId, 'sis.establishments-qa-next');
    assert.equal(w[1].payload.identity.cluesRef.code, w[0].payload.identity.cluesRef.code);
    assert.equal(await p.evaluate(() => window.qaState.units.length), 1);
    assert.equal(await btn(p, 'Editar unidad').count(), 1);
  },
  async i1RepeatedCatalogChangesKeepKeyAndCorrectedCapture(p, night) {
    await startRegistration(p, night, 'network,catalog-409,catalog-409,catalog-409');
    await unitName(p).fill('Nombre corregido');
    await btn(p, 'Comprobar y completar el registro').click(); await idle(p); await catalogError(p);
    const initial = await writes(p); assert.deepEqual(initial[1], initial[0]); // uncertainty still replays exactly
    await p.screenshot({ path: path.join(OUT, 'i1-field-error-' + p.viewportSize().width + '-' + (night ? 'night' : 'light') + '.png'), fullPage: true, timeout: 60000 });
    await btn(p, 'Cancelar').click(); assert.equal((await writes(p)).length, 2);
    await btn(p, 'Retomar el registro').click(); await catalogError(p);
    assert.equal(await unitName(p).inputValue(), 'Nombre corregido');
    for (let step = 1; step <= 3; step++) {
      const release = 'sis.establishments-qa' + '-next'.repeat(step);
      await selectCurrent(p, release); assert.equal((await writes(p)).length, step + 1);
      await btn(p, 'Guardar unidad').click(); await idle(p);
      const w = await writes(p), last = w.at(-1);
      assert.equal(last.key, initial[0].key); assert.equal(last.payload.identity.cluesRef.releaseId, release);
      assert.equal(last.payload.identity.cluesRef.code, 'QASMP000202'); assert.equal(last.payload.identity.displayName, 'Nombre corregido');
      assert.equal(last.payload.expectedRevision, 0);
      if (step < 3) { await catalogError(p); assert.equal(await p.evaluate(() => window.qaState.units.length), 0); }
    }
    const units = await p.evaluate(() => window.qaState.units);
    assert.equal(units.length, 1); assert.equal(units[0].revision, 1);
    assert.equal((await writes(p)).length, 5); assert.equal(await btn(p, 'Editar unidad').count(), 1);
  },
  async i1CorrectedPayloadIsFrozenAgainAfterLostResponse(p, night) {
    await startRegistration(p, night, 'network,catalog-409,network-create');
    await btn(p, 'Comprobar y completar el registro').click(); await idle(p); await catalogError(p);
    await selectCurrent(p, 'sis.establishments-qa-next'); await unitName(p).fill('Captura corregida');
    await btn(p, 'Guardar unidad').click(); await idle(p);
    assert.match(await p.locator('.health-units').innerText(), /Registro sin confirmar:/);
    await unitName(p).fill('Borrador posterior');
    await btn(p, 'Comprobar y completar el registro').click(); await idle(p);
    const w = await writes(p); assert.equal(w.length, 4); assert.deepEqual(w[3], w[2]);
    assert.equal(w[2].key, w[0].key); assert.notDeepEqual(w[2].payload, w[0].payload);
    assert.equal(w[2].payload.identity.displayName, 'Captura corregida');
    assert.equal(await unitName(p).inputValue(), 'Borrador posterior');
    assert.equal(await p.evaluate(() => window.qaState.units.length), 1);
    await btn(p, 'Guardar unidad').click(); await idle(p);
    const last = (await writes(p)).at(-1); assert.equal(last.method, 'patch'); assert.equal(last.payload.expectedRevision, 1);
    const units = await p.evaluate(() => window.qaState.units); assert.equal(units.length, 1); assert.equal(units[0].displayName, 'Borrador posterior');
  },
  async i1OnlyCatalogRejectionUnlocksPayload(p, night) {
    for (const failure of ['409', 'key-409', '403']) {
      await startRegistration(p, night, 'network,' + failure);
      await unitName(p).fill('Cambio posterior'); await btn(p, 'Comprobar y completar el registro').click(); await idle(p);
      const rejected = await writes(p); assert.equal(rejected.length, 2); assert.deepEqual(rejected[1], rejected[0]);
      assert.match(await p.locator('.health-units').innerText(), /Registro sin confirmar:/);
      if (failure === '403') { assert.equal(await btn(p, 'Comprobar y completar el registro').isDisabled(), true); continue; }
      await btn(p, 'Comprobar y completar el registro').click(); await idle(p);
      const w = await writes(p); assert.equal(w.length, 3); assert.deepEqual(w[2], w[0]);
      assert.equal(await unitName(p).inputValue(), 'Cambio posterior');
    }
    // Key reuse after a catalog correction is not proof of absence; keep that corrected operation frozen too.
    await startRegistration(p, night, 'network,catalog-409,key-409');
    await btn(p, 'Comprobar y completar el registro').click(); await idle(p); await catalogError(p);
    await selectCurrent(p, 'sis.establishments-qa-next');
    await btn(p, 'Guardar unidad').click(); await idle(p);
    assert.match(await p.locator('.health-units').innerText(), /Registro sin confirmar:/);
    await unitName(p).fill('Cambio después del conflicto de clave');
    await btn(p, 'Comprobar y completar el registro').click(); await idle(p);
    const corrected = await writes(p); assert.equal(corrected.length, 4); assert.deepEqual(corrected[3], corrected[2]);
    assert.equal(corrected[2].key, corrected[0].key);
    // A committed operation is replayed before catalog validation: activation cannot authorize replacing its payload.
    await startRegistration(p, night, 'network-create,catalog-409');
    await unitName(p).fill('Cambio tras commit'); await btn(p, 'Comprobar y completar el registro').click(); await idle(p);
    const w = await writes(p); assert.equal(w.length, 2); assert.deepEqual(w[1], w[0]);
    assert.equal(await p.evaluate(() => window.qaState.units.length), 1);
    assert.match(await p.locator('.health-units').innerText(), /operación confirmada/);
    assert.equal(await unitName(p).inputValue(), 'Cambio tras commit');
  },
  async t1ModeWithoutTyping(p, night) {
    await open(p, night); await manual(p);
    assert.match(await field(p).locator('.v-messages').first().innerText(), /Se conserva la referencia del catálogo\. Si editas/);
    assert.equal(await p.locator('.unit-selection-label').innerText(), 'Referencia elegida');
    assert.equal((await writes(p)).length, 0);
    await p.screenshot({ path: path.join(OUT, 't1-retained-help-' + p.viewportSize().width + '-' + (night ? 'night' : 'light') + '.png'), fullPage: true, timeout: 60000 });
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
      const p = await browser.newPage({ viewport: { width, height: 900 } });
      // The shared template loads Google Fonts; asset loading has a separate budget from UI assertions.
      p.setDefaultNavigationTimeout(60000); p.setDefaultTimeout(12000);
      const result = { name, width, theme: night ? 'night' : 'light', errors: [] };
      p.on('pageerror', e => result.errors.push(String(e)));
      try { await run(p, night); assert.equal(result.errors.length, 0); assert.equal(await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)), 0); result.pass = true; }
      catch (e) { result.pass = false; result.error = String(e); }
      result.screenshot = name + '-' + width + '-' + result.theme + '.png';
      await p.screenshot({ path: path.join(OUT, result.screenshot), fullPage: true, timeout: 60000 });
      report.push(result); console.log(name, width, result.theme, result.pass ? 'PASS' : result.error); await p.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, 'implementation-report.json'), JSON.stringify(report, null, 2));
  console.log('TOTAL', report.filter(x => x.pass).length + '/' + report.length);
  if (report.some(x => !x.pass)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
