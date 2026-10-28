'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const webpack = require('webpack');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const { createFixture } = require('../../../hemia-assistance-back-legacy/scripts/qa/co25-csrf-http-fixture');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
    const deadline = Date.now() + 5000;
    while (!predicate()) { if (Date.now() > deadline) throw Error('Fixture wait timed out'); await delay(10); }
}
async function bundle(origin) {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'co25-browser-'));
    const config = { mode: 'development', devtool: false, context: root,
        entry: path.join(__dirname, 'fixtures/co25-browser-entry.js'),
        output: { path: folder, filename: 'bundle.js' },
        plugins: [new webpack.NormalModuleReplacementPlugin(/store(?:\/index)?$/, resource => {
            const target = path.resolve(resource.context, resource.request).replace(/[\\/]index$/, '');
            if (target === path.join(root, 'src/store')) resource.request = path.join(__dirname, 'fixtures/co25-store.js');
        }), new webpack.NormalModuleReplacementPlugin(/\.vue$/, path.join(__dirname, 'fixtures/co25-empty-view.js')), new webpack.DefinePlugin({
            'process.env.VUE_APP_AUTH_COOKIE_MODE': JSON.stringify('d2'),
            'process.env.VUE_APP_BROWSER_AUTH_TRANSPORT': JSON.stringify('cookie'),
            'process.env.VUE_APP_CSRF_ENABLED': JSON.stringify('true'),
            'process.env.VUE_APP_CORE_URL_API': JSON.stringify(origin)
        })] };
    await new Promise((resolve, reject) => webpack(config, (error, stats) => {
        if (error || stats.hasErrors()) reject(error || Error(stats.toString({ all: false, errors: true })));
        else resolve();
    }));
    // Keep the isolated bundle for diagnosis; it contains synthetic settings only.
    return fs.readFile(path.join(folder, 'bundle.js'), 'utf8');
}
(async () => {
    const fixture = await createFixture();
    const { state, origin } = fixture;
    let browser;
    const checks = [];
    const pass = label => { checks.push(label); console.log('PASS ' + label); };
    try {
        state.bundle = await bundle(origin);
        browser = await chromium.launch({ channel: 'msedge', headless: true });
        const context = await browser.newContext();
        const setAccess = async (id = 'one', expiry = 900) => context.addCookies([
            { name: 'co25_at', value: fixture.accessCookie(id, expiry), url: origin, httpOnly: true, sameSite: 'Lax' }
        ]);
        await setAccess();
        const a = await context.newPage(), b = await context.newPage();
        const errors = [];
        for (const page of [a, b]) {
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(origin);
            await page.waitForFunction(() => Boolean(window.co25));
        }
        // Distinct query strings prevent Chromium from coalescing identical
        // pending GETs, so both initial issuances really reach the endpoint.
        await a.route('**/api/auth/csrf', route => route.continue({ url: route.request().url() + '?qa=tab-a' }));
        await b.route('**/api/auth/csrf', route => route.continue({ url: route.request().url() + '?qa=tab-b' }));
        // First issuance race: both browser tabs arrive without a CSRF cookie.
        state.holdCsrf = true;
        let acquisitionError;
        const acquisitionFailed = error => { acquisitionError = error; return false; };
        const firstA = a.evaluate(() => co25.csrf.ensureCsrfToken().then(() => true)).catch(acquisitionFailed);
        const firstB = b.evaluate(() => co25.csrf.ensureCsrfToken().then(() => true)).catch(acquisitionFailed);
        await until(() => state.held.length === 2 || acquisitionError);
        if (acquisitionError) throw acquisitionError;
        const held = state.held.splice(0);
        held[1](); await delay(60); held[0]();
        await Promise.all([firstA, firstB]); state.holdCsrf = false;
        const sent = [];
        for (const page of [a, b]) page.on('request', req => {
            if (req.method() === 'POST' && req.url().endsWith('/api/appointment/save')) sent.push(req.postData());
        });
        const save = (page, id) => page.evaluate(id => co25.core.post('api/appointment/save', { request_id: id, revision: 7, description: 'Synthetic draft' }), id);
        const replies = await Promise.all([save(a, 'tab-a'), save(b, 'tab-b')]);
        assert.ok(replies.every(r => r.success));
        assert.equal(state.effects.length, 2);
        assert.equal(sent.length, 3, 'one stale tab retries exactly once');
        const duplicate = sent.find((body, i) => sent.indexOf(body) !== i);
        assert.ok(duplicate, 'retry keeps exact body, revision and request_id');
        pass('two real tabs: first-issuance race recovers once, identical body, exactly two effects');

        await context.clearCookies({ name: 'co25_csrf' });
        await a.evaluate(() => co25.csrf.clearCsrfToken());
        const gets = state.csrfGets;
        const many = await a.evaluate(() => Promise.all(Array.from({ length: 8 }, (_, i) =>
            co25.core.post('api/appointment/save', { request_id: 'parallel-' + i, revision: 7 }))));
        assert.ok(many.every(r => r.success)); assert.equal(state.csrfGets - gets, 1);
        pass('eight simultaneous mutations share a single CSRF GET');

        await context.clearCookies({ name: 'co25_csrf' });
        const beforeMissing = state.attempts.length;
        assert.equal((await save(a, 'missing-cookie')).success, true);
        assert.equal(state.attempts.length - beforeMissing, 2);
        pass('missing cookie renews and retries only the rejected request');

        // Freeze only the browser clock, allowing a cached token to actually
        // expire on the server before the browser attempts its next write.
        process.env.CSRF_TOKEN_TTL_SECONDS = '2';
        await context.clearCookies({ name: 'co25_csrf' });
        await a.evaluate(() => co25.csrf.clearCsrfToken());
        await a.clock.install(); await a.clock.pauseAt(new Date());
        await a.evaluate(() => co25.csrf.ensureCsrfToken().then(() => true));
        await delay(2200);
        const expiryAttempts = state.attempts.length;
        assert.equal((await save(a, 'real-expiry')).success, true);
        assert.equal(state.attempts.length - expiryAttempts, 2);
        await a.clock.resume(); process.env.CSRF_TOKEN_TTL_SECONDS = '900';
        pass('actual server expiry with a stale browser clock recovers exactly once');

        state.forcedReason = 'expired'; state.forcedRemaining = 1;
        assert.equal((await save(a, 'expired-contract')).success, true);
        pass('expired rejection uses the same bounded recovery contract');

        const multipartBefore = state.effects.length;
        await context.clearCookies({ name: 'co25_csrf' });
        const upload = await a.evaluate(() => {
            const form = new FormData(); form.append('request_id', 'upload-one'); form.append('file', new Blob(['synthetic-image'], { type: 'text/plain' }), 'qa.txt');
            return co25.core.post('api/upload', form);
        });
        assert.equal(upload.success, true); assert.equal(state.effects.length - multipartBefore, 1);
        assert.equal((state.effects.at(-1).body.match(/name="file"/g) || []).length, 1);
        assert.match(state.effects.at(-1).body, /synthetic-image/);
        pass('FormData upload survives recovery without duplicate parts or writes');

        for (const reason of ['permission', 'origin_not_allowed', 'bad_signature', 'bad_binding', 'missing_header']) {
            const previousGets = state.csrfGets, attempts = state.attempts.length;
            state.forcedReason = reason; state.forcedRemaining = 1;
            assert.equal((await save(a, 'rejected-' + reason)).success, false);
            assert.equal(state.csrfGets, previousGets); assert.equal(state.attempts.length - attempts, 1);
        }
        pass('permission, origin, signature, binding and missing-header failures never retry');

        state.forcedReason = 'mismatch'; state.forcedRemaining = 2;
        const repeated = state.attempts.length;
        await a.locator('#save').click();
        await a.waitForFunction(() => document.getElementById('result').textContent.includes('solicitud segura'));
        assert.equal(state.attempts.length - repeated, 2);
        assert.equal(await a.locator('#draft').inputValue(), 'Captura sintetica');
        pass('second rejection stops recovery and preserves the form with an actionable error');

        const renewalAttempts = state.attempts.length;
        await context.clearCookies({ name: 'co25_csrf' }); state.failCsrfGet = true;
        assert.equal((await save(a, 'renewal-fails')).success, false);
        assert.equal(state.attempts.length - renewalAttempts, 1); state.failCsrfGet = false;
        pass('failed renewal does not replay a mutation');

        const beforeNetwork = state.csrfGets;
        await a.route('**/api/appointment/save', route => route.abort('failed'));
        assert.equal((await save(a, 'network-fails')).success, false);
        assert.equal(state.csrfGets, beforeNetwork);
        await a.unroute('**/api/appointment/save');
        pass('network error never triggers CSRF replay');

        // First synchronize after the deliberately failed renewal, then drop
        // the HTTP response after the synthetic write has already happened.
        await a.evaluate(() => co25.csrf.ensureCsrfToken({ force: true }).then(() => true));
        const unknownEffects = state.effects.length, unknownAttempts = state.attempts.length;
        state.dropAfterWrite = true;
        assert.equal((await save(a, 'response-lost-after-write')).success, false);
        state.dropAfterWrite = false;
        assert.equal(state.effects.length - unknownEffects, 1);
        assert.equal(state.attempts.length - unknownAttempts, 1);
        pass('lost response after a confirmed write never replays an unknown outcome');

        await context.clearCookies({ name: 'co25_csrf' }); state.holdCsrf = true;
        const beforePermissionChange = state.effects.length;
        const permissionChange = save(a, 'permissions-change');
        await until(() => state.held.length === 1);
        await a.evaluate(() => { co25.store.state.CORE.AUTH.accessRevision++; });
        state.held.shift()(); state.holdCsrf = false;
        assert.equal((await permissionChange).data.code, 'AUTH_CONTEXT_CHANGED');
        assert.equal(state.effects.length, beforePermissionChange);
        await a.evaluate(() => co25.csrf.ensureCsrfToken().then(() => true));
        pass('permission revision change during recovery cancels the old mutation');

        await setAccess('two'); // Another tab changes the actual browser session.
        await context.clearCookies({ name: 'co25_csrf' });
        const priorEffects = state.effects.length;
        const switched = await save(a, 'old-session-intent');
        assert.equal(switched.data.code, 'AUTH_CONTEXT_CHANGED');
        assert.equal(state.effects.length, priorEffects);
        pass('server session change blocks replay even if the old tab store has not updated');

        await setAccess();
        await a.evaluate(() => co25.csrf.clearCsrfToken());
        state.holdCsrf = true;
        const late = a.evaluate(() => co25.csrf.ensureCsrfToken().then(() => 'unexpected', () => 'discarded'));
        await until(() => state.held.length === 1);
        await a.evaluate(() => co25.csrf.clearCsrfToken());
        state.held.shift()(); state.holdCsrf = false;
        assert.equal(await late, 'discarded');
        assert.equal(await a.evaluate(() => co25.csrf.getCsrfState().hasToken), false);
        pass('cleanup invalidates a real in-flight renewal response');

        await a.evaluate(() => co25.csrf.ensureCsrfToken().then(() => true));
        await setAccess('one', -10);
        await context.addCookies([{ name: 'co25_rt', value: 'synthetic-refresh', url: origin, httpOnly: true }]);
        const renewed = await a.evaluate(() => co25.auth.refreshToken());
        assert.equal(renewed.success, true);
        assert.equal(state.refreshContexts.at(-1), 'preauth');
        assert.equal(await a.evaluate(() => co25.csrf.getCsrfState().hasToken), false);
        assert.equal((await save(a, 'after-refresh')).success, true);
        pass('expired access refresh obtains preauth CSRF then clears it before session mutations');

        state.forcedReason = 'mismatch'; state.forcedRemaining = 1;
        const registered = await a.evaluate(() => co25.registration.register({ name: 'Synthetic QA' }, 'registration-one'));
        assert.equal(registered.success, true);
        assert.equal(state.effects.at(-1).key, 'registration-one');
        pass('separate registration transport recovers and preserves Idempotency-Key');
        await a.evaluate(() => co25.csrf.ensureCsrfToken().then(() => true));
        await setAccess('two'); await context.clearCookies({ name: 'co25_csrf' });
        const registrationSwitch = await a.evaluate(() => co25.registration.register({ name: 'Synthetic QA' }, 'registration-old-session')
            .then(() => 'unexpected', error => error.code));
        assert.equal(registrationSwitch, 'AUTH_CONTEXT_CHANGED');
        pass('registration reports session-change errors without requiring HTTP headers on local errors');
        await setAccess(); await a.evaluate(() => co25.csrf.clearCsrfToken());
        assert.equal((await a.evaluate(() => co25.auth.close())).success, true);
        assert.equal(await a.evaluate(() => co25.csrf.getCsrfState().hasToken), false);
        pass('logout clears the CSRF cache and browser session cookies');
        const login = await a.evaluate(() => co25.auth.login({ phone: '5550000000', password: 'synthetic-only' }));
        assert.equal(login.success, true); assert.equal(login.d2Session.authenticated, true);
        assert.equal(state.loginContexts.at(-1), 'preauth');
        assert.equal(await a.evaluate(() => co25.csrf.getCsrfState().hasToken), false);
        assert.equal((await save(a, 'after-login')).success, true);
        pass('login uses preauth CSRF and clears it before the first authenticated write');
        assert.deepEqual(errors, []);
        const evidence = path.resolve(root, '../docs/clinical-operations/evidence/CO25');
        await fs.mkdir(evidence, { recursive: true });
        await fs.writeFile(path.join(evidence, (process.env.CO25_QA_EVIDENCE_PREFIX || 'a1') + '-browser-results.json'), JSON.stringify({
            checkedAt: new Date().toISOString(), runtime: process.version, browser: await browser.version(), checks,
            scope: 'Real Axios clients, real cookies in two Edge tabs, HTTP CSRF controller/middleware/OptionalAuth. Synthetic auth state and persistence; no DB or external services.',
            pageErrors: errors
        }, null, 2) + '\n');
    } finally {
        if (browser) await browser.close();
        state.held.splice(0).forEach(finish => finish());
        await fixture.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
