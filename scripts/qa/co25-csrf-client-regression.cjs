'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
function load(file, bindings = {}, names) {
    const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;?\r?\n/gm, '')
        .replace(/export (async function|function|const)/g, '$1').replace('export default', 'module.exports =');
    const scope = { module: { exports: {} }, ...bindings };
    vm.runInNewContext(source + (names ? '\nmodule.exports = {' + names.join(',') + '};' : ''), scope, { filename: file });
    return scope.module.exports;
}
const rights = load('src/security/authorizationContext.js', {}, ['authorizationContext', 'isCurrentAuthorization', 'authorizationChangedError']);
const store = { state: { CORE: { AUTH: { authenticated: true, user: { id_login: 'qa', id_session: 'one' }, accessRevision: 1 } } } };
let requests = [];
const service = load('src/services/core/auth/DACsrfService.js', {
    axios: { create: () => ({ get: () => new Promise(resolve => requests.push(resolve)) }) },
    context: { APP_CORE_URL: 'http://qa.invalid' }, DAC_AUTH_CSRF: '/api/auth/csrf',
    isD2AuthMode: () => true, isCsrfEnabled: () => true, store, ...rights
});
const reply = (token = 'synthetic', contextId = 'session-one', seconds = 900) => ({ data: { data: {
    csrfToken: token, contextId, contextType: 'session', expiresAt: new Date(Date.now() + seconds * 1000).toISOString()
} } });
(async () => {
    const a = service.ensureCsrfToken(), b = service.ensureCsrfToken({ force: true });
    assert.equal(requests.length, 1, 'concurrent acquisition must share one GET');
    requests.shift()(reply());
    assert.equal((await a).csrfToken, (await b).csrfToken);
    console.log('PASS concurrent renewal single flight');
    const late = service.ensureCsrfToken({ force: true });
    service.clearCsrfToken();
    requests.shift()(reply('late'));
    await assert.rejects(late, /accesos cambiaron/i);
    assert.equal(service.getCsrfState().hasToken, false);
    console.log('PASS late response after cleanup discarded');
    const obsolete = service.ensureCsrfToken();
    store.state.CORE.AUTH.accessRevision++;
    requests.shift()(reply('obsolete'));
    await assert.rejects(obsolete, /accesos cambiaron/i);
    console.log('PASS permission/session change discards pending renewal');
    const short = service.ensureCsrfToken();
    requests.shift()(reply('short', 'session-one', 10));
    await short;
    await service.ensureCsrfToken();
    assert.equal(requests.length, 0, 'short lived fresh token is usable');
    console.log('PASS short TTL cache avoids continuous renewal');
    const recovery = load('src/services/config/csrfRecovery.js', {
        DACsrfService: service, isD2AuthMode: () => true, isCsrfEnabled: () => true, ...rights
    }, ['canRecoverCsrf', 'recoverCsrfRequest']);
    const config = { method: 'post', url: '/api/appointment/save', data: '{"request_id":"stable","revision":7}',
        headers: { 'x-csrf-token': 'stale', 'Idempotency-Key': 'stable' }, csrfContext: service.getRequestContext() };
    const rejected = { config, response: { status: 403, data: { code: 'CSRF_FORBIDDEN', reason: 'mismatch' } } };
    assert.equal(recovery.canRecoverCsrf(rejected), true);
    let replay;
    const recovering = recovery.recoverCsrfRequest(rejected, async next => { replay = next; return 'saved'; });
    requests.shift()(reply('fresh'));
    assert.equal(await recovering, 'saved');
    assert.equal(replay.data, config.data);
    assert.equal(replay.url, config.url);
    assert.equal(replay.headers['Idempotency-Key'], 'stable');
    assert.equal(replay.headers['x-csrf-token'], undefined);
    assert.equal(replay.headers['X-CSRF-Token'], 'fresh');
    assert.equal(recovery.canRecoverCsrf({ ...rejected, config: replay }), false);
    console.log('PASS retry retains serialized intent and replaces header case-insensitively, once');
    const oldServer = { ...rejected, config: { ...config, csrfContext: { ...service.getRequestContext(), contextId: null } } };
    const unsupported = recovery.recoverCsrfRequest(oldServer, () => { throw Error('Must not replay'); });
    requests.shift()(reply());
    await assert.rejects(unsupported, /accesos cambiaron/i);
    console.log('PASS older server without context identifier cannot authorize an automatic replay');
    const legacy = load('src/services/config/csrfRecovery.js', {
        DACsrfService: service, isD2AuthMode: () => false, isCsrfEnabled: () => false, ...rights
    }, ['canRecoverCsrf']);
    assert.equal(legacy.canRecoverCsrf(rejected), false);
    console.log('PASS legacy mode does not acquire retry behavior');
})().catch(error => { console.error(error); process.exitCode = 1; });
