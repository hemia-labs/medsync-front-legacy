'use strict';
// Real login/router with anonymous API doubles; no credentials or database writes.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const baseURL = process.env.QA_LOGIN_URL || 'http://localhost:4324';
const output = path.resolve(__dirname, '../../../docs/auth/evidence/login-branding-20261028');
const key = 'hemia_login_logo';
const logo = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="90"><rect width="260" height="90" rx="12" fill="#176879"/><text x="130" y="54" text-anchor="middle" fill="white" font-family="Arial" font-size="26">CLINICA QA</text></svg>').toString('base64');
const cases = [
  { name: 'saved-logo-empty-public', stored: logo, data: [], custom: true },
  { name: 'saved-logo-other-public', stored: logo, data: [{ image_data: 'data:image/png;base64,other-tenant' }], custom: true },
  { name: 'saved-logo-offline', stored: logo, offline: true, custom: true },
  { name: 'fresh-public-logo', data: [{ image_data: logo }], custom: true },
  { name: 'fresh-default', data: [] },
  { name: 'fresh-offline', offline: true },
  { name: 'broken-saved-logo', stored: 'data:image/png;base64,broken', data: [] },
  { name: 'broken-public-logo', data: [{ image_data: 'data:image/png;base64,broken' }] }
];

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const width of [1440, 390]) {
      for (const test of cases) {
        const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
        try {
          await context.addInitScript(({ key, stored }) => {
            if (!sessionStorage.getItem('qa-branding-initialized')) {
              localStorage.removeItem(key);
              if (stored) localStorage.setItem(key, stored);
              sessionStorage.setItem('qa-branding-initialized', 'true');
            }
          }, { key, stored: test.stored });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.route('**/api/**', async route => {
            const endpoint = new URL(route.request().url()).pathname;
            assert.equal(route.request().method(), 'GET', 'Login inspection must not write');
            let json = { success: true, data: [] };
            if (endpoint.endsWith('/auth/session')) json = { success: true, data: { authenticated: false } };
            else if (endpoint.endsWith('/config/login-image/get')) {
              if (test.offline) return route.abort('failed');
              json = { success: true, data: test.data };
            }
            return route.fulfill({ json });
          });
          await page.goto(baseURL + '/auth/login', { waitUntil: 'networkidle' });
          const image = page.locator('.auth-brand-logo');
          await expect(image).toBeVisible();
          if (test.custom) {
            await expect(image).toHaveAttribute('src', logo);
            assert.equal(await page.evaluate(key => localStorage.getItem(key), key), logo);
            await page.reload({ waitUntil: 'networkidle' });
            await expect(image).toHaveAttribute('src', logo);
          } else {
            await expect(image).toHaveAttribute('src', /med-sync-logo/);
            assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
          }
          assert.equal(await image.evaluate(img => img.complete && img.naturalWidth > 0), true);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
          assert.deepEqual(errors, []);
          if (test.name === 'saved-logo-empty-public') await page.screenshot({ path: path.join(output, 'custom-' + width + '.png'), fullPage: true });
          results.push({ name: test.name, width, status: 'PASS' });
        } finally { await context.close(); }
      }
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log('PASS ' + results.length + ' login branding browser scenarios (desktop/mobile, reload, public fallback, offline, broken images).');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
