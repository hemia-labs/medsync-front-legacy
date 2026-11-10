const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CaptureSession } = require('../../src/domain/odontogram/captureSession');
const { parseCommand } = require('../../src/domain/odontogram/commandParser');
const D = require('./co26-backend-fixture.cjs');
const start = () => ({ id_chart: 'chart', ...D.emptyChart('mixed') });
let number = 0; const makeId = () => 'test-' + ++number;
test('lost response retries immutable batch and does not duplicate confirmed mutation', async () => {
  let server = start(), calls = 0, original, receipt;
  const queue = new CaptureSession(server, async (id, payload) => {
    calls++;
    if (!original) { original = payload; server = { id_chart: id, ...D.applyBatch(server, payload, 'actor').chart }; receipt = { success: true, data: server }; return { success: false, status: 0 }; }
    assert.deepEqual(payload, original); return receipt;
  }, () => {}, makeId);
  queue.enqueue([{ type: 'note.set', tooth: 16, text: 'Draft' }]);
  await queue.flush(); assert.equal(queue.state, 'offline'); assert.equal(queue.hasPending(), true);
  await queue.retry(); assert.equal(queue.state, 'saved'); assert.equal(calls, 2); assert.equal(queue.chart.revision, 1);
  assert.equal(queue.chart.teeth[16].note, 'Draft'); queue.dispose();
});
test('one in-flight request; queued changes use confirmed revision of preceding batch', async () => {
  let release; let server = start(); const payloads = [];
  const queue = new CaptureSession(server, async (id, payload) => {
    payloads.push(payload);
    if (payloads.length === 1) await new Promise(resolve => { release = resolve; });
    server = { id_chart: id, ...D.applyBatch(server, payload, 'actor').chart }; return { success: true, data: server };
  }, () => {}, makeId);
  queue.enqueue([{ type: 'note.set', tooth: 16, text: 'First' }]); const flight = queue.flush();
  queue.enqueue([{ type: 'note.set', tooth: 16, text: 'Second' }]); queue.flush();
  assert.equal(payloads.length, 1); release(); await flight;
  assert.equal(payloads[1].base_revision, 1); assert.equal(queue.chart.teeth[16].note, 'Second'); queue.dispose();
});
test('403 and 409 stop automatic retry and retain exact draft', async () => {
  for (const status of [403, 409, 422]) {
    let calls = 0;
    const queue = new CaptureSession(start(), async () => { calls++; return { success: false, status, message: 'Denied' }; }, () => {}, makeId);
    queue.enqueue([{ type: 'note.set', tooth: 16, text: 'Keep' }]); await queue.flush();
    assert.equal(calls, 1); assert.equal(queue.inflight.ops[0].text, 'Keep'); assert.ok(['error','conflict'].includes(queue.state)); queue.dispose();
  }
});
test('parser ranges, multiple commands, missing faces and invalid whole input', () => {
  assert.equal(parseCommand('13-23 ok, 55 car p', 16, 'mixed', D.CATALOG).ops.length, 7);
  assert.equal(parseCommand('55 car p', 16, 'mixed', D.CATALOG).ops[0].surfaces, 'L');
  assert.equal(parseCommand('18 aus', 16, 'mixed', D.CATALOG).advance, true);
  assert.equal(parseCommand('res o', 16, 'mixed', D.CATALOG).advance, false);
  assert.equal(parseCommand('', 16, 'mixed', D.CATALOG).ops.length, 0);
  for (const input of ['15 car', '13-43 ok', '16 car m, 99 aus', '16 aus o']) assert.throws(() => parseCommand(input, 16, 'mixed', D.CATALOG));
});
test('one command with more than twenty operations is never split into partial commits', async () => {
  const payloads=[];
  const queue=new CaptureSession(start(),async(id,payload)=>{payloads.push(payload);return {success:true,data:{id_chart:id,...D.applyBatch(start(),payload,'actor').chart}};},()=>{},makeId);
  queue.enqueue(Object.keys(start().teeth).slice(0,30).map(tooth=>({type:'tooth.review',tooth:Number(tooth)})));
  await queue.flush();assert.equal(payloads.length,1);assert.equal(payloads[0].ops.length,30);queue.dispose();
});
test('undo of a pending intent keeps previous pending intentions',()=>{
 const queue=new CaptureSession(start(),async()=>({success:false,status:403}),()=>{},makeId);
 queue.enqueue([{type:'note.set',tooth:16,text:'Keep first'}]);queue.enqueue([{type:'tooth.review',tooth:55}]);
 queue.cancelLastPending();assert.equal(queue.pending.length,1);assert.equal(queue.pending[0].text,'Keep first');assert.equal(queue.groups.length,1);queue.dispose();
});
test('a subsequent denial never erases uncertainty from a previously lost response',async()=>{
 let calls=0;const queue=new CaptureSession(start(),async()=>({success:false,status:++calls===1?0:403}),()=>{},makeId);
 queue.enqueue([{type:'note.set',tooth:16,text:'Uncertain'}]);await queue.flush();await queue.retry();assert.equal(queue.uncertain,true);assert.equal(queue.hasPending(),true);queue.dispose();
});
