'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/domain/billing/paypalApproval.js'), 'utf8').replace(/export /g, '');
const approval = { kind: 'subscription', subscriptionId: 'I-SYNTHETIC123', clientId: 'public-client-12345', environment: 'sandbox' };
function fixture() {
  const scripts = [], timers = new Map(), calls = [];
  let count = 0, eligible = true;
  const session = { start: () => { throw Error('Tests never start a real approval'); } };
  const instance = {
    findEligibleMethods: async value => { calls.push(['eligible', value]); return { isEligible: method => { assert.equal(method, 'paypal'); return eligible; } }; },
    createPayPalSubscriptionPaymentSession: value => { calls.push(['session', value]); return session; }
  };
  const context = {
    window: { paypal: { createInstance: async value => { calls.push(['instance', value]); return instance; } } },
    document: {
      createElement: kind => { assert.equal(kind, 'script'); return { remove() { this.removed = true; } }; },
      head: { appendChild: script => scripts.push(script) }
    },
    setTimeout: (fn, delay) => { const id = ++count; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id)
  };
  vm.createContext(context); vm.runInContext(source + '\nthis.api={paypalApproval,preparePayPalApproval};', context);
  return { ...context, calls, scripts, timers, session, api: context.api, deny: () => { eligible = false; } };
}
const plain = value => JSON.parse(JSON.stringify(value));
(async () => {
  const f = fixture();
  assert.deepEqual(plain(f.api.paypalApproval({ ...approval, clientSecret: 'never-project-this' })), approval);
  assert.ok(f.api.paypalApproval({ ...approval, subscriptionId: 'I-' + 'A'.repeat(178) }));
  assert.equal(f.api.paypalApproval({ ...approval, subscriptionId: 'I-' + 'A'.repeat(179) }), null);
  for (const change of [{ kind: 'order' }, { subscriptionId: 'internal-uuid' }, { clientId: '' }, { clientId: 'https://evil.test' }, { environment: 'https://evil.test' }, { environment: '__proto__' }, { environment: { toString: null } }, { subscriptionId: { toString: null } }, { clientId: 'a'.repeat(201) }]) assert.equal(f.api.paypalApproval({ ...approval, ...change }), null);
  await assert.rejects(f.api.preparePayPalApproval({ ...approval, environment: 'evil' }, 'MXN', {}));
  await assert.rejects(f.api.preparePayPalApproval(approval, undefined, {})); assert.equal(f.scripts.length, 0);
  const callbacks = { onApprove() {}, onCancel() {}, onError() {} };
  const first = f.api.preparePayPalApproval(approval, 'MXN', callbacks);
  const second = f.api.preparePayPalApproval(approval, 'MXN', callbacks);
  assert.equal(f.scripts.length, 1, 'Concurrent preparations share a single SDK download');
  assert.equal(f.scripts[0].src, 'https://www.sandbox.paypal.com/web-sdk/v6/core'); assert.equal(f.scripts[0].async, true);
  f.scripts[0].onload();
  assert.equal(await first, f.session); assert.equal(await second, f.session); assert.equal(f.timers.size, 0);
  assert.deepEqual(plain(f.calls[0]), ['instance', { clientId: approval.clientId, components: ['paypal-subscriptions'], pageType: 'checkout' }]);
  assert.deepEqual(plain(f.calls.find(call => call[0] === 'eligible')), ['eligible', { paymentFlow: 'RECURRING_PAYMENT', currencyCode: 'MXN' }]);
  assert.equal(f.calls.find(call => call[0] === 'session')[1], callbacks);
  await assert.rejects(f.api.preparePayPalApproval({ ...approval, environment: 'live' }, 'MXN', callbacks)); assert.equal(f.scripts.length, 1, 'Environment changes fall back instead of mixing SDK globals');
  f.deny(); await assert.rejects(f.api.preparePayPalApproval(approval, 'MXN', callbacks));

  const failed = fixture(); const download = failed.api.preparePayPalApproval(approval, 'MXN', callbacks);
  failed.scripts[0].onerror(); await assert.rejects(download); assert.equal(failed.scripts[0].removed, true); assert.equal(failed.timers.size, 0);
  const retry = failed.api.preparePayPalApproval(approval, 'MXN', callbacks); assert.equal(failed.scripts.length, 2); failed.scripts[1].onload(); assert.equal(await retry, failed.session);

  const timeout = fixture(); const hanging = timeout.api.preparePayPalApproval({ ...approval, environment: 'live' }, 'MXN', callbacks);
  assert.equal(timeout.scripts[0].src, 'https://www.paypal.com/web-sdk/v6/core');
  const timer = [...timeout.timers.values()][0]; assert.equal(timer.delay, 12000); timer.fn(); await assert.rejects(hanging); assert.equal(timeout.scripts[0].removed, true);
  console.log('PASS PayPal v6: strict public metadata, exact sandbox/live hosts, concurrent loader, eligibility/currency, server-created subscription session, SDK error/timeout recovery and environment isolation. No network, checkout, or financial operations.');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
