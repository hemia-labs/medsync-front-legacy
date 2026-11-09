'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const compiler=require('vue-template-compiler');
const root=path.resolve(__dirname,'../..');
function component(name,bindings={}) {
  const parsed=compiler.parseComponent(fs.readFileSync(path.join(root,'src/components/billing',name+'.vue'),'utf8'));
  assert.deepEqual(compiler.compile(parsed.template.content).errors,[]);
  const context={module:{exports:{}},Date,...bindings};
  vm.runInNewContext(parsed.script.content.replace(/^import[^\n]*\n/gm,'').replace('export default','module.exports ='),context);
  return context.module.exports;
}
(async()=>{
  let fail=false;
  const plan={code:'medsync_pro',name:'Profesional',prices:[{amount:'999.00',currency:'MXN',billingInterval:'month',billingIntervalCount:1}],features:{'professionals.included':1,'users.auxiliary.included':3,'clinical_record.enabled':true,'reports.basic':false,'unknown.feature':true}};
  const Catalog=component('PlanCatalog',{Registration:{publicPlans:async()=>fail?{available:false}:{available:true,taxBehavior:'inclusive',offers:[plan]}}});
  const view={...Catalog.data(),compact:true};
  await Catalog.methods.load.call(view);assert.equal(view.error,false);assert.equal(view.loading,false);assert.equal(view.plans[0].prices[0].amount,'999.00');
  assert.equal(Catalog.methods.money('1299.00'),'$1,299');assert.equal(Catalog.methods.money('999999999999.50'),'$999,999,999,999.50');
  assert.equal(Catalog.methods.period({billingInterval:'year',billingIntervalCount:1}),'Al año');
  assert.equal(Catalog.methods.period({billingInterval:'month',billingIntervalCount:3}),'Cada 3 meses');
  let benefits=Array.from(Catalog.methods.benefits.call(view,plan));assert.deepEqual(benefits,['1 profesional','3 usuarios auxiliares']);
  view.expanded=true;benefits=Array.from(Catalog.methods.benefits.call(view,plan));assert.ok(benefits.includes('Expediente clínico'));assert.ok(!benefits.includes('Reportes básicos'));assert.ok(!benefits.includes('unknown.feature'));
  fail=true;await Catalog.methods.load.call(view);assert.equal(view.error,true);assert.equal(view.loading,false);
  const destroyed={...Catalog.data(),_isDestroyed:true};await Catalog.methods.load.call(destroyed);assert.equal(destroyed.plans.length,0);
  const Notice=component('TrialNotice',{PlanCatalogDialog:{}});
  const business={subscriptionStatus:'trial',serverNow:'2026-10-29T00:00:00.000Z',trialEndsAt:'2026-11-01T00:00:00.000Z'};
  const state={business,role:'admin',observedAt:123,now:123,showPlans:true};
  assert.equal(Notice.computed.days.call(state),3,'Use server time rather than device date');
  state.now+=86400000;assert.equal(Notice.computed.days.call(state),2);
  state.now+=9*86400000;assert.equal(Notice.computed.days.call(state),0);
  assert.equal(Notice.computed.visible.call(state),true,'Expired trial still has a plan entry point');
  assert.equal(Notice.computed.canChoose.call(state),true);state.role='reception';assert.equal(Notice.computed.canChoose.call(state),false);
  Notice.watch.business.handler.call(state);assert.equal(state.showPlans,false,'Account refresh closes a stale dialog');
  state.business={subscriptionStatus:'active'};assert.equal(Notice.computed.visible.call(state),false);
  component('PlanCatalogDialog',{PlanCatalog:{}});
  console.log('PASS compiled Vue components and real methods: exact money, periods, published features only, catalog outage/destroyed view, server-based days, expired trial, role visibility and stale dialog cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
