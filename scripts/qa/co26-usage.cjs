const assert=require('node:assert/strict');
const {UsageAggregate}=require('../../src/domain/odontogram/usageAggregate');
let now=0;const usage=new UsageAggregate(()=>now);
usage.interact('keyboard');now=40000;usage.record(3,1);usage.error();
assert.deepEqual(usage.take('mixed'),{dentition:'mixed',modality:'keyboard',operations:3,corrections:1,errors:1,active_seconds:30,paused_seconds:10});
usage.interact('touch');now=45000;usage.visibility(true);now=55000;
const data=usage.take('mixed');assert.equal(data.modality,'hybrid');assert.equal(data.active_seconds,5);assert.equal(data.paused_seconds,10);assert.equal(data.operations,0);
assert.deepEqual(Object.keys(data).sort(),['active_seconds','corrections','dentition','errors','modality','operations','paused_seconds']);
console.log('PASS numeric usage aggregation: inactivity, hidden page, modality, reset and payload field allowlist.');
