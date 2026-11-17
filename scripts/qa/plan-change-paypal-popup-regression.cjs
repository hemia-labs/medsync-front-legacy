'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../src/domain/billing/planChangePayPal.js'), 'utf8').replace(/^import[^\n]*\n/gm, '').replace(/export /g, '');
const id = '11111111-1111-4111-8111-111111111111';
const approval = 'https://www.sandbox.paypal.com/billing/subscriptions/approve?ba_token=synthetic';
function fixture() {
  const calls = [], listeners = new Map(), timers = new Map();
  const popup = { closed: false, document: { title: '', body: {} }, location: { replace: url => calls.push(['navigate', url]) }, focus: () => calls.push(['focus']), close() { popup.closed = true; calls.push(['close']); } };
  const window = {
    location: { origin: 'http://localhost:8080', assign() { throw Error('The MedSync page must never redirect'); } },
    open: (...args) => { calls.push(['open', ...args]); return popup; },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
    close: () => calls.push(['child-close']), opener: null
  };
  const context = {
    window,
    checkoutAttemptId: value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value) ? value : '',
    planChangePaymentUrl: value => {
      try { const url = new URL(value); return url.protocol === 'https:' && ['www.sandbox.paypal.com', 'www.paypal.com'].includes(url.hostname) && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
    },
    setInterval: (handler, delay) => { assert.equal(delay, 500); timers.set(1, handler); return 1; },
    clearInterval: key => timers.delete(key)
  };
  vm.createContext(context); vm.runInContext(source + '\nthis.api={openPlanChangePayPal,returnFromPlanChangePayPal};', context);
  return { ...context, api: context.api, popup, calls, listeners, timers };
}
const plain = value => JSON.parse(JSON.stringify(value));
(async () => {
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const f = fixture(), returns = [], closes = [];
const handle = f.api.openPlanChangePayPal({ onReturn: result => returns.push(plain(result)), onClose: () => closes.push(true) });
assert.deepEqual(f.calls[0], ['open', 'about:blank', '_blank', 'popup=yes,width=520,height=720,resizable=yes,scrollbars=yes']);
assert.equal(f.calls.filter(c => c[0] === 'navigate').length, 0, 'Reserve a popup synchronously before asynchronous Billing preparation');
const receive = f.listeners.get('message');
const data = { type: 'medsync.plan-change.paypal-return', attemptId: id, result: 'approved' };
receive({ source: f.popup, origin: f.window.location.origin, data }); assert.equal(returns.length, 0, 'A blank popup has no owned attempt yet');
for (const url of ['https://evil.test/pay','http://www.paypal.com/pay','javascript:alert(1)','https://user:secret@www.paypal.com/pay']) assert.throws(() => handle.navigate(url, id));
assert.throws(() => handle.navigate(approval, 'invalid'));
handle.navigate(approval, id);assert.deepEqual(f.calls.find(c => c[0] === 'navigate'), ['navigate', approval]);
for (const change of [{ origin: 'https://evil.test' }, { source: {} }, { data: { ...data, attemptId: 'another-attempt' } }, { data: { ...data, result: 'unknown' } }, { data: { ...data, type: 'different' } }]) {
  receive({ source: f.popup, origin: f.window.location.origin, data, ...change }); assert.equal(returns.length, 0);
}
receive({ source: f.popup, origin: f.window.location.origin, data });await flush();
assert.deepEqual(returns, [{ attemptId: id, result: 'approved' }]);assert.equal(f.popup.closed, true);assert.equal(f.listeners.size, 0);assert.equal(f.timers.size, 0);assert.equal(closes.length, 0);
receive({ source: f.popup, origin: f.window.location.origin, data });assert.equal(returns.length, 1, 'Duplicate returns cannot confirm twice');
assert.throws(() => handle.navigate(approval, id));
for (const result of ['approved','cancelled']) {
 const child = fixture(); assert.equal(child.api.returnFromPlanChangePayPal(id, result), false);
 child.window.opener = { postMessage: (...args) => child.calls.push(['return', ...args]) };
 assert.equal(child.api.returnFromPlanChangePayPal('invalid', result), false);
 assert.equal(child.api.returnFromPlanChangePayPal(id, 'unknown'), false);
 assert.equal(child.api.returnFromPlanChangePayPal(id, result), true);
 const sent = child.calls.find(c => c[0] === 'return'); assert.deepEqual(plain(sent[1]), { ...data, result });assert.equal(sent[2], child.window.location.origin);assert.equal(child.calls.some(call => call[0] === 'child-close'),false,'The child waits for Billing confirmation; only the parent closes the popup');
}
const staged = fixture();let stages = 0, continuation;
const stagedHandle = staged.api.openPlanChangePayPal({onClose: () => assert.fail('Approval is not a manual close'),onReturn: async () => {
 stages++;
 if(stages===1){await new Promise(resolve=>{continuation=resolve;});stagedHandle.navigate('https://www.sandbox.paypal.com/checkoutnow?token=ORDER',id);return true;}
 return false;
}});
stagedHandle.navigate(approval,id);const stagedReceive=staged.listeners.get('message'),event={source:staged.popup,origin:staged.window.location.origin,data};
stagedReceive(event);await flush();stagedReceive(event);await flush();assert.equal(stages,1,'Duplicate messages during confirmation cannot repeat financial continuation');assert.equal(staged.popup.closed,false,'Keep the window while Billing confirms');continuation();await flush();assert.equal(staged.popup.closed,false);assert.equal(staged.calls.filter(call=>call[0]==='open').length,1);assert.equal(staged.calls.filter(call=>call[0]==='navigate').length,2,'Continue payment in the same window');
stagedReceive(event);await flush();assert.equal(stages,2);assert.equal(staged.popup.closed,true,'Close after the final confirmation');assert.equal(staged.listeners.size,0);assert.equal(staged.timers.size,0);
const rejected = fixture();const rejectedHandle=rejected.api.openPlanChangePayPal({onReturn:async()=>{throw Error('Unknown confirmation outcome');},onClose:()=>assert.fail()});rejectedHandle.navigate(approval,id);rejected.listeners.get('message')({source:rejected.popup,origin:rejected.window.location.origin,data});await flush();assert.equal(rejected.popup.closed,true);assert.equal(rejected.listeners.size,0);
const closed = fixture();let notifications = 0;
const closedHandle = closed.api.openPlanChangePayPal({ onReturn: () => assert.fail('Manual close never authorizes'), onClose: () => notifications++ });
closed.popup.closed = true;[...closed.timers.values()][0]();assert.equal(notifications, 1);assert.equal(closed.listeners.size, 0);assert.equal(closed.timers.size, 0);assert.throws(() => closedHandle.navigate(approval, id));
const disposed = fixture();const disposable = disposed.api.openPlanChangePayPal({ onReturn: () => assert.fail(), onClose: () => assert.fail('Context disposal is not user cancellation') });
disposable.close();assert.equal(disposed.popup.closed, true);assert.equal(disposed.timers.size, 0);assert.equal(disposed.listeners.size, 0);
const blocked = fixture();blocked.window.open = () => null;assert.throws(() => blocked.api.openPlanChangePayPal({}), /PAYPAL_POPUP_BLOCKED/);assert.equal(blocked.listeners.size, 0);assert.equal(blocked.timers.size, 0);
console.log('PASS plan-change PayPal popup: synchronous reservation, exact provider URLs, no main-page redirect, source/origin/attempt-bound returns, same-window stages, automatic final close, close/cancel cleanup, blocked-popup recovery. No network or payments.');

})().catch(error => {console.error(error.stack);process.exitCode=1;});
