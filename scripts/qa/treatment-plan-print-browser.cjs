// Synthetic Chromium regression. Serve the application in D2 mode on 4397 with API origin
// http://127.0.0.1:4398. Run: node scripts/qa/treatment-plan-print-browser.cjs [evidence-directory]
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const { createFixture } = require('./clinical-sections-fixture.cjs');

const front = 'http://127.0.0.1:4397';
const api = 'http://127.0.0.1:4398';
const output = process.argv[2] && path.resolve(process.argv[2]);
const patient = { id_person: 'qa-print-only', name: 'Ada', surname: 'Simulada', fullname: 'Ada Simulada', active: 1, age: 30, code: 'QA-R6' };
const recordUrl = front + '/px/history/' + patient.id_person + '?tab=treatment';
const config = { treatmentPlanEnabled: true, showTreatmentCosts: false, showTreatmentStatus: true, allowTreatmentToothSelection: true };
const active = {
  id_treatment_plan: 'current', title: 'Plan restaurador de prueba', status: 'active',
  started_at: '2026-11-18', diagnosis: 'Lesión simulada en molar superior',
  notes: 'INTERNO-ACTIVO-319', treatments: [{
    id_patient_treatment: 'rest', name: 'Restauración de molar', description: 'Reconstrucción de la cara oclusal.',
    status: 'pending', teeth: [16], tooth_details: [{ tooth_number: 16, surfaces: ['O'] }],
    notes: 'INTERNO-PIEZA-783', cost: 29876.54
  }]
};
const closed = {
  id_treatment_plan: 'previous', title: 'Plan preventivo de prueba', status: 'closed',
  started_at: '2026-10-05', closed_at: '2026-10-21', diagnosis: 'Prevención simulada',
  notes: 'INTERNO-HISTORICO-218', treatments: [{
    id_patient_treatment: 'prev', name: 'Sellado preventivo', description: 'Protección para la superficie del molar.',
    status: 'completed', teeth: [26], tooth_details: [{ tooth_number: 26, surfaces: ['O'] }],
    notes: 'INTERNO-SELLADO-182', cost: 26789.43
  }]
};

async function mockApi(context, isolatedOrigin) {
  const reads = new Set();
  const writes = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === front) return route.continue();
    if (url.origin !== api) return route.abort();
    const endpoint = url.pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'access-control-allow-origin': front, 'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'Content-Type, X-CSRF-Token, Authorization'
    } });
    if (request.method() !== 'GET') {
      writes.push(endpoint);
      return route.abort();
    }
    reads.add(endpoint);
    const reply = data => route.fulfill({ json: { success: true, data }, headers: {
      'access-control-allow-origin': front, 'access-control-allow-credentials': 'true'
    } });
    if (endpoint === '/api/config/clinical-modules/get') return reply(config);
    if (endpoint === '/api/px/get/' + patient.id_person) return reply({
      person: patient, address: {}, query: {}, access: { clinical: false }, allergy: { status: 'unknown', revision: 0 }
    });
    if (endpoint === '/api/treatment/plan/' + patient.id_person) return reply({
      patient, config, permissions: { costView: true }, activePlan: active, history: [closed],
      historyPagination: { page: 1, page_size: 5, total: 1 }
    });
    const response = await route.fetch({ url: isolatedOrigin + endpoint + url.search });
    if (endpoint === '/api/auth/session') {
      const session = (await response.json()).data;
      return reply({ ...session, permissions: ['px.all', 'px.tab.treatment', 'treatments.view', 'treatments.cost_view'] });
    }
    return route.fulfill({ response });
  });
  return { reads, writes };
}

async function openPreview(page, trigger, plan, otherPlan, width, entry, closeWith) {
  await trigger.focus();
  const originalUrl = page.url();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Vista previa del plan', exact: true });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Cerrar', exact: true });
  const print = dialog.getByRole('button', { name: 'Imprimir o guardar PDF', exact: true });
  await expect(close).toBeVisible();
  await expect(print).toBeEnabled();
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement)),
    { message: entry + ' should receive focus when opened' }).toBe(true);
  const iframe = dialog.locator('iframe[title="Hoja del plan de tratamiento"]');
  const sheet = iframe.contentFrame();
  await expect(sheet.getByRole('heading', { name: plan.title, exact: true })).toBeVisible();
  const html = await sheet.locator('html').innerHTML();
  const text = await sheet.locator('body').innerText();
  const item = plan.treatments[0];
  for (const value of [patient.fullname, plan.diagnosis, item.name, item.description,
    'Diente ' + item.teeth[0] + ' (Oclusal)', plan.status === 'closed' ? 'Cerrado' : 'Activo']) {
    assert.ok(text.includes(value), 'Missing in patient copy: ' + value);
  }
  await expect(sheet.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
  assert.ok(!html.includes(otherPlan.title) && !html.includes(otherPlan.treatments[0].name), 'Wrong plan in copy');
  assert.doesNotMatch(html, /INTERNO-|29,?876\.54|26,?789\.43|presupuesto|>Costo<|\$/i);
  assert.equal(await sheet.getByRole('button').count(), 0, 'Patient copy contains interactive application controls');
  assert.equal(page.url(), originalUrl);
  for (const area of [page.locator('html'), dialog, sheet.locator('html')]) {
    const dimensions = await area.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.client + 1, entry + ' overflow at ' + width + ': ' + JSON.stringify(dimensions));
  }
  const [closeBounds, printBounds] = await Promise.all([close.boundingBox(), print.boundingBox()]);
  for (const bounds of [closeBounds, printBounds]) {
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 &&
      bounds.y + bounds.height <= page.viewportSize().height + 1, 'Dialog action outside viewport');
  }
  if (output) await page.screenshot({ path: path.join(output, width + '-' + entry + '.png'), animations: 'disabled' });

  // Chromium runs the actual window.print() path without writing a PDF or selecting a printer.
  await iframe.evaluate(frame => {
    const sheetWindow = frame.contentWindow;
    window.printCalls = [];
    for (const [target, name] of [[window, 'record'], [sheetWindow, 'sheet']]) {
      target.addEventListener('beforeprint', () => window.printCalls.push({
        name, title: target.document.querySelector('h1')?.textContent, hasRecord: !!target.document.querySelector('#app')
      }), { once: true });
    }
  });
  await print.click();
  await page.waitForFunction(() => window.printCalls.length > 0, null, { timeout: 3000 });
  console.log(width + 'px ' + entry + ': native beforeprint');
  const calls = await page.evaluate(() => window.printCalls);
  assert.deepEqual(calls, [{ name: 'sheet', title: plan.title, hasRecord: false }]);
  if (closeWith === 'escapeFromSheet') {
    await sheet.getByRole('heading', { name: plan.title }).click();
    await page.keyboard.press('Escape');
  } else if (closeWith === 'escape') {
    await close.focus();
    await page.keyboard.press('Escape');
  } else {
    await close.click();
  }
  await expect(iframe).toBeHidden();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  assert.equal(page.url(), originalUrl);
}

async function verifyViewport(browser, isolatedOrigin, width) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width === 390 ? 844 : 1000 },
    isMobile: width === 390, hasTouch: width === 390 });
  try {
    const { reads, writes } = await mockApi(context, isolatedOrigin);
    const pages = [];
    const errors = [];
    context.on('page', page => { pages.push(page); page.on('pageerror', error => errors.push(error.message)); });
    const page = await context.newPage();
    await page.goto(recordUrl);
    const activePrint = page.getByRole('button', { name: 'Imprimir plan', exact: true });
    await activePrint.waitFor({ timeout: 45000 });
    await openPreview(page, activePrint, active, closed, width, 'activo', 'button');
    const history = page.getByRole('button', { name: /Planes cerrados/ });
    await history.click();
    const historyPrint = page.getByRole('button', { name: 'Imprimir ' + closed.title, exact: true });
    await openPreview(page, historyPrint, closed, active, width, 'historico', 'escape');
    await expect(history).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'Ver plan', exact: true }).click();
    const details = page.getByRole('dialog', { name: 'Consultar plan cerrado', exact: true });
    const topPrint = details.getByRole('button', { name: 'Imprimir plan', exact: true });
    await openPreview(page, topPrint, closed, active, width, 'detalle-historico', 'escapeFromSheet');
    await expect(details).toBeVisible();
    await expect(details.getByRole('heading', { name: closed.title, exact: true })).toBeVisible();
    assert.equal(pages.length, 1, 'Preview opened a new tab');
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    assert.ok(reads.has('/api/px/get/' + patient.id_person) && reads.has('/api/treatment/plan/' + patient.id_person));
    console.log('PASS ' + width + 'px: active, history card, nested history dialog; sheet-only print; privacy, layout, focus and Escape.');
  } finally {
    await context.close();
  }
}

async function main() {
  if (output) await fs.mkdir(output, { recursive: true });
  const fixture = createFixture(front);
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const isolatedOrigin = 'http://127.0.0.1:' + fixture.address().port;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chromium', headless: true });
    for (const width of [1440, 390]) {
      await verifyViewport(browser, isolatedOrigin, width);
    }
    if (output) await fs.writeFile(path.join(output, 'resultado.json'), JSON.stringify({
      result: 'PASS', scope: 'Simulación local con API interceptada y datos ficticios', at: new Date().toISOString(),
      browser: 'Chromium ' + browser.version(), frontend: front, api, widths: [1440, 390],
      entries: ['Plan activo', 'Tarjeta de plan cerrado', 'Detalle de plan cerrado'],
      verified: ['Documento correcto sin costos ni notas privadas', 'Misma pestaña y expediente',
        'beforeprint nativo solo en la hoja (6 casos)', 'Foco al abrir y regreso al botón que abrió la vista',
        'Cerrar y Escape desde los controles y la hoja', 'Controles en pantalla y sin desborde horizontal',
        'Cero escrituras a API y cero errores JS no controlados'],
      limits: 'Chromium headless; sin impresora física ni archivo PDF generado.'
    }, null, 2) + '\n');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => fixture.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
