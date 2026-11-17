'use strict';
// Full local app, isolated browser, synthetic API responses. Never creates an account or sends a code.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const origin = 'http://localhost:8080';

(async () => {
  const evidence = await fs.mkdtemp(path.join(os.tmpdir(), 'medsync-registration-password-'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [], writes = [];
  try {
    for (const width of [1280, 375, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        if (['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3009') {
          if (request.method() !== 'GET') {
            writes.push(url.pathname);
            return route.fulfill({ status: 409, json: { code: 'QA_WRITE_BLOCKED' } });
          }
          if (url.pathname.endsWith('/registration/context')) return route.fulfill({ json: {
            enabled: true, legalContext: 'synthetic-browser-context', legalSnapshotToken: 'synthetic-snapshot',
            legalDocuments: ['terms_conditions', 'privacy_notice'].map((documentKey, index) => ({
              documentKey, versionId: 'qa-v1', contentHash: 'qa-content', requiredAction: index ? 'acknowledge' : 'accept',
              title: index ? 'Aviso de privacidad de prueba' : 'Términos de prueba', contentHtml: '<p>Documento sintético.</p>'
            }))
          } });
          return route.fulfill({ json: { success: true, data: { authenticated: false } } });
        }
        return route.abort();
      });
      await page.goto(origin + '/register');
      const password = page.locator('#register-password');
      const confirm = page.locator('#register-confirmPassword');
      const helper = page.locator('#register-password-strength');
      await expect(password).toBeVisible();
      await expect(password).toHaveAttribute('type', 'password');
      await expect(confirm).toHaveAttribute('type', 'password');
      await expect(password).toHaveAttribute('aria-describedby', /register-password-strength/);
      await expect(helper.locator('.password-strength')).toHaveClass(/score-0/);

      await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
      await expect(password).toHaveAttribute('type', 'text');
      await expect(confirm).toHaveAttribute('type', 'password');
      await page.getByRole('button', { name: 'Mostrar confirmación de contraseña', exact: true }).click();
      await expect(confirm).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
      await expect(password).toHaveAttribute('type', 'password');
      await expect(confirm).toHaveAttribute('type', 'text');
      const confirmationToggle = page.getByRole('button', { name: 'Ocultar confirmación de contraseña', exact: true });
      await confirmationToggle.focus(); await page.keyboard.press('Enter');
      await expect(confirm).toHaveAttribute('type', 'password');

      await confirm.fill('Texto sintético de confirmación');
      await expect(helper.locator('.password-strength')).toHaveClass(/score-0/);
      await password.fill('ab');
      await expect(helper).toContainText('Seguridad baja.');
      await password.fill('Bosque-azul-47!!');
      await expect(helper).toContainText('Seguridad alta.');
      await expect(helper.locator('.password-strength')).toHaveClass(/score-4/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(writes, [], 'Password visibility buttons cannot submit the registration form');
      await page.screenshot({ path: path.join(evidence, `register-password-${width}.png`), fullPage: true });
      await password.fill('');
      await expect(helper.locator('.password-strength')).toHaveClass(/score-0/);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', widths: [1280, 375, 320], independentVisibility: true,
      keyboardToggle: true, reactiveStrength: true, accessibleDescription: true, horizontalOverflow: false,
      registrationWrites: writes.length, evidence }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
