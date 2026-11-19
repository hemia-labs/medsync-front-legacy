// Operator visual corrections over af17232. Real shell, synthetic data and transport only.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const contrast = require('./contrast.cjs');
const path = require('node:path');
const OUT = process.env.NC1_QA_OUT || path.join(require('node:os').tmpdir(), 'medsync-nc1-clues-qa');
fs.mkdirSync(OUT, { recursive: true });
const button = (p, name) => p.getByRole('button', { name, exact: true });
const { selectSection } = require('../nc1-settings-navigation.cjs');
const reports = [];
const BASE = process.env.NC1_QA_BASE || 'http://127.0.0.1:4388';
const selectedCase = process.env.NC1_QA_CASE;
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
async function open(p, theme, query = 'scenario=verified') {
  await p.goto(BASE + '/admin?section=identity&' + query + (theme ? '&theme=night' : ''));
  await p.locator('.health-units').waitFor();
  await p.waitForFunction(() => !document.querySelector('.health-units').__vue__.loading);
}
async function capture(p, r, name) {
  await p.screenshot({ path: OUT + '/' + name + '-' + r.width + '-' + r.theme + '.png', fullPage: true, timeout: 60000 });
  r.screenshots.push(name + '-' + r.width + '-' + r.theme + '.png');
}
async function checkContrast(p, r, selectors) {
  for (const selector of selectors) {
    const target = p.locator(selector).first();
    const value = await contrast(target); r.contrast.push({ selector, ...value });
    assert(value.ratio >= 4.5, selector + ' contrast=' + value.ratio);
  }
}
async function writes(p) { return p.evaluate(() => window.qaLog); }
async function waitFound(p) { await p.waitForFunction(() => { const v = document.querySelector('.health-units').__vue__; return v.reval && v.reval.state === 'found' && !v.busy; }); }
const cases = {
  async summary(p, r, night) {
    await open(p, night);
    const order = await p.evaluate(() => ['.clinic-account', '.clinic-panel', '.health-units'].map(s => document.querySelector(s).getBoundingClientRect().top));
    assert(order[0] < order[1] && order[1] < order[2]);
    assert.equal(await p.getByRole('heading', { name: 'Contacto y ubicación', exact: true }).count(), 1);
    const typography = await p.locator('.clinic-detail-list dd').last().evaluate(el => ({ weight: getComputedStyle(el).fontWeight, size: getComputedStyle(el).fontSize, font: getComputedStyle(el).fontFamily }));
    assert.equal(typography.weight, '400'); assert.equal(typography.size, '14px'); r.typography = typography;
    const billingAvailable = await p.locator('.health-units').evaluate(el => {
      let vm = el.__vue__;
      while (vm && typeof vm.hasPlanBilling !== 'boolean') vm = vm.$parent;
      if (!vm) throw new Error('Settings billing availability not exposed');
      return vm.hasPlanBilling;
    });
    assert.equal(await p.locator('.clinic-account__link').count(), billingAvailable ? 1 : 0);
    if (!billingAvailable) assert(!(await p.locator('.clinic-account__description').innerText()).includes('Plan y facturación'));
    await checkContrast(p, r, ['.clinic-account__description', ...(billingAvailable ? ['.clinic-account__link'] : []), '.clinic-detail-list dd', '.unit-introduction p']);
    assert.equal(await p.locator('.clinic-identity input[type=file]').count(), 0);
    await capture(p, r, 'summary');
    await p.getByText('¿Cómo obtengo mi CLUES?', { exact: true }).click();
    assert((await p.locator('.unit-introduction').innerText()).includes('servicios de salud de tu estado'));
    await p.getByText('Ver datos del catálogo', { exact: true }).click();
    assert((await p.locator('.unit-official').innerText()).includes('Institución'));
    await p.getByText('Fuente y versión', { exact: true }).click();
    assert((await p.locator('.unit-source').innerText()).includes('sis.establishments-qa'));
    assert.equal((await writes(p)).length, 0);
  },
  async business(p, r, night) {
    await open(p, night);
    await button(p, 'Editar datos del consultorio').click();
    assert(await button(p, 'Editar unidad').isDisabled());
    const name = p.getByRole('textbox', { name: 'Nombre comercial *', exact: true });
    await name.fill('Nombre sin guardar');
    if (await p.getByRole('link', { name: 'Ver plan y facturación' }).count()) await p.getByRole('link', { name: 'Ver plan y facturación' }).click();
    else await selectSection(p, 'Apariencia');
    await button(p, 'Seguir editando').click();
    assert.equal(await name.inputValue(), 'Nombre sin guardar');
    await capture(p, r, 'business-editor');
    await button(p, 'Cancelar').click(); await button(p, 'Descartar cambios').click();
    assert.equal((await writes(p)).length, 0);
    await button(p, 'Editar datos del consultorio').click();
    await name.fill('Consultorio QA visual'); await button(p, 'Guardar cambios').click();
    await button(p, 'Editar datos del consultorio').waitFor();
    const log = await writes(p);
    assert.equal(log.length, 1); assert.equal(log[0].method, 'put'); assert(log[0].path.endsWith('business/current'));
    const state = await p.evaluate(() => window.qaState);
    assert.equal(state.business.name, 'Consultorio QA visual'); assert.equal(state.units[0].displayName, 'Sonrisa Clara Centro');
  },
  async catalogAndManual(p, r, night) {
    await open(p, night);
    await button(p, 'Editar unidad').focus(); await p.keyboard.press('Enter');
    assert(await p.locator('[data-field="displayName"] input').evaluate(el => el === document.activeElement));
    await button(p, 'Usar nombre comercial').click();
    assert.equal(await p.locator('[data-field="displayName"] input').inputValue(), 'Sonrisa Clara Dental');
    const lookup = p.getByRole('textbox', { name: 'Buscar por CLUES o nombre', exact: true });
    await lookup.fill('QASMP000202');
    const item = p.locator('.v-menu__content.menuable__content__active .v-list-item', { hasText: 'QASMP000202' }).first();
    await item.click();
    await p.waitForFunction(() => document.querySelector('.unit-selection').textContent.includes('NORTE'));
    assert.equal(await button(p, 'Buscar en catálogo').getAttribute('aria-pressed'), 'true');
    assert((await p.locator('.unit-selection').innerText()).includes('QASMP000202'));
    assert(await p.getByText('Antes de guardar una clave diferente', { exact: true }).evaluate(el => el.parentElement.open));
    assert.equal((await writes(p)).length, 0);
    await checkContrast(p, r, ['.unit-name-suggestion', '.catalog-field-code', '.catalog-field-guidance', '.catalog-field-modes button[aria-pressed="true"]']);
    await capture(p, r, 'catalog-editor');
    await button(p, 'Ingresar mi CLUES').click();
    assert.equal(await button(p, 'Ingresar mi CLUES').getAttribute('aria-pressed'), 'true');
    await p.getByRole('textbox', { name: 'Tu CLUES', exact: true }).fill('QAPRV000999');
    assert((await p.locator('.unit-selection').innerText()).includes('Sin verificar'));
    await capture(p, r, 'manual-editor');
    await button(p, 'Guardar unidad').click();
    await p.getByText('Unidad guardada.', { exact: false }).waitFor();
    const log = await writes(p); assert.equal(log.length, 1); assert.equal(log[0].method, 'patch'); assert.equal(log[0].payload.expectedRevision, 3);
    assert.equal(log[0].payload.identity.cluesRef.code, 'QAPRV000999'); assert(!log[0].payload.identity.cluesRef.releaseId);
    await button(p, 'Editar unidad').click();
    assert.equal(await button(p, 'Ingresar mi CLUES').getAttribute('aria-pressed'), 'true');
    await button(p, 'Cancelar').click();
    assert.equal((await writes(p)).length, 1);
  },
  async logo(p, r, night) {
    await open(p, night);
    assert.equal(await p.locator('.private-logo').count(), 0);
    await selectSection(p, 'Apariencia');
    await p.getByRole('heading', { name: 'Logo para documentos', exact: true }).waitFor();
    await checkContrast(p, r, ['.private-logo__choose', '.private-logo__help']);
    await button(p, 'Elegir imagen').focus();
    const chooserPromise = p.waitForEvent('filechooser'); await button(p, 'Elegir imagen').press('Enter');
    const chooser = await chooserPromise; await chooser.setFiles({ name: 'logo-qa.png', mimeType: 'image/png', buffer: pixel });
    await p.getByText('Imagen lista para guardar', { exact: true }).waitFor();
    assert(await p.locator('.private-logo__preview img').evaluate(el => el.complete && el.naturalWidth > 0));
    await selectSection(p, 'Información del consultorio');
    await button(p, 'Seguir editando').click();
    await p.locator('.swal2-container').waitFor({ state: 'hidden' });
    assert.equal(await p.locator('.private-logo__preview img').count(), 1);
    await capture(p, r, 'logo-selected');
    await button(p, 'Cancelar selección').click(); assert.equal(await p.locator('.private-logo__preview img').count(), 0);
    await p.locator('.private-logo input[type=file]').setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('QA') });
    await p.getByText('Selecciona PNG, JPEG o WebP de hasta 5 MB.', { exact: true }).waitFor();
    assert.equal((await writes(p)).length, 0);
    await p.locator('.private-logo input[type=file]').setInputFiles({ name: 'logo-qa.png', mimeType: 'image/png', buffer: pixel });
    await p.getByText('Imagen lista para guardar', { exact: true }).waitFor();
    await p.locator('.private-logo').getByRole('button', { name: 'Guardar logo', exact: true }).click();
    await p.getByText('Imagen lista para guardar', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal((await writes(p)).length, 1);
    assert.equal((await writes(p))[0].path, 'business/current/logo');
    await selectSection(p, 'Información del consultorio');
    await p.locator('.health-units').waitFor();
    assert.equal(await p.locator('.private-logo').count(), 0);
    await selectSection(p, 'Apariencia');
    await p.locator('.private-logo').getByRole('button', { name: 'Eliminar logo', exact: true }).click();
    await p.locator('.private-logo__preview img').waitFor({ state: 'hidden' });
    assert.equal((await writes(p)).length, 2);
    assert.equal((await writes(p))[1].method, 'delete');
    await p.locator('.private-logo input[type=file]').setInputFiles({ name: 'logo-qa.png', mimeType: 'image/png', buffer: pixel });
    await p.getByText('Imagen lista para guardar', { exact: true }).waitFor();
    await selectSection(p, 'Información del consultorio');
    await button(p, 'Descartar cambios').click();
    await p.locator('.health-units').waitFor();
    await selectSection(p, 'Apariencia');
    await p.locator('.private-logo').waitFor();
    assert.equal(await p.locator('.private-logo__preview img').count(), 0);
    assert.equal((await writes(p)).length, 2);
  },
  async comparison(p, r, night) {
    await open(p, night, 'scenario=stale');
    await button(p, 'Comprobar con la versión vigente').click(); await waitFound(p);
    assert(await button(p, 'Editar datos del consultorio').isDisabled());
    assert((await p.locator('.unit-compare').innerText()).includes('Nombre oficial'));
    await capture(p, r, 'comparison');
    await button(p, 'Cerrar sin cambios').click();
    assert.equal((await writes(p)).length, 0);
    assert(!(await button(p, 'Editar datos del consultorio').isDisabled()));
  },
  async secondaryAndUnknown(p, r, night) {
    await open(p, night, 'scenario=multi&detailFail=u-norte:503');
    await p.getByRole('button', { name: /Mostrar otras unidades/ }).click();
    const north = p.getByRole('region', { name: 'Unidad Sonrisa Clara Norte', exact: true });
    assert((await north.innerText()).includes('desconocidos por ahora'));
    assert(await north.getByRole('button', { name: 'Editar unidad', exact: true }).isDisabled());
    await north.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
    await north.getByRole('heading', { name: 'Sonrisa Clara Norte', exact: true }).waitFor();
    await north.getByRole('button', { name: 'Editar unidad', exact: true }).click();
    await p.locator('[data-field="displayName"] input').fill('Sede norte QA visual');
    await button(p, 'Guardar unidad').click(); await p.getByText('Unidad guardada.', { exact: false }).waitFor();
    const log = await writes(p); assert.equal(log.length, 1); assert(log[0].path.endsWith('/u-norte'));
    await capture(p, r, 'secondary-unit');
  }
};
(async () => {
  await require('./ready.cjs')();
  const browser = await chromium.launch({ headless: true });
  for (const width of [1280, 390]) for (const night of [false, true]) for (const [name, fn] of Object.entries(cases).filter(([name]) => !selectedCase || name === selectedCase)) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    // The shared template loads Google Fonts; asset loading has a separate budget from UI assertions.
    page.setDefaultNavigationTimeout(60000); page.setDefaultTimeout(12000);
    const r = { name, width, theme: night ? 'night' : 'light', screenshots: [], contrast: [], errors: [] };
    page.on('pageerror', e => r.errors.push(String(e)));
    try { await fn(page, r, night); r.overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert(r.overflow <= 0); assert.equal(r.errors.length, 0); r.pass = true; }
    catch (e) { r.pass = false; r.error = String(e); await capture(page, r, 'FAIL-' + name).catch(() => {}); }
    console.log(name, width, r.theme, r.pass ? 'PASS' : r.error); reports.push(r); await page.close();
  }
  if (!selectedCase) for (const [width, night] of [[1280, false], [390, true]]) for (const query of ['scenario=empty', 'scenario=load-error', 'scenario=inactive', 'scenario=verified&perm=none']) {
    const p = await browser.newPage({ viewport: { width, height: 900 } }); p.setDefaultNavigationTimeout(60000);
    const r = { name: query, width, theme: night ? 'night' : 'light', screenshots: [], errors: [] };
    p.on('pageerror', e => r.errors.push(String(e)));
    try {
      if (query.includes('perm=none')) { await p.goto(BASE + '/admin?section=identity&' + query + (night ? '&theme=night' : '')); await p.waitForTimeout(1200); assert.equal(await p.locator('.health-units').count(), 0); }
      else { await open(p, night, query); const text=await p.locator('.health-units').innerText(); assert(text.includes(query.includes('empty') ? 'Aún no registras' : query.includes('load-error') ? 'No se pudieron consultar' : 'Inactiva en MedSync')); }
      assert.equal((await writes(p)).length, 0); assert.equal(r.errors.length, 0); r.pass = true;
      await capture(p, r, query.replace(/[^a-z-]/g, '-'));
    } catch(e) { r.pass = false; r.error=String(e); }
    reports.push(r); console.log(query, width, r.pass ? 'PASS' : r.error); await p.close();
  }
  await browser.close(); fs.writeFileSync(OUT + '/visual-report.json', JSON.stringify(reports, null, 2));
  console.log('TOTAL', reports.filter(r => r.pass).length + '/' + reports.length);
  if (reports.some(r => !r.pass)) process.exitCode = 1;
})();
