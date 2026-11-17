'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const compiler=require('vue-template-compiler');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const moduleFrom=file=>import('data:text/javascript;base64,'+Buffer.from(read(file)).toString('base64'));
const copy=value=>JSON.parse(JSON.stringify(value));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const updates=await moduleFrom('src/domain/billing/subscriptionUpdates.js');
  const auth=await moduleFrom('src/security/authorizationContext.js');
  const access=await moduleFrom('src/security/settingsAccess.js');
  const checkout=await moduleFrom('src/domain/billing/checkout.js');
  const cancellation=await moduleFrom('src/domain/billing/cancellation.js');
  const history=await moduleFrom('src/domain/billing/paymentHistory.js');
  const end=new Date(Date.now()+86400000*20).toISOString(),now=new Date().toISOString();
  const sub={id:'subscription-1',organizationId:'business-1',productCode:'medsync',planCode:'medsync_pro',planPriceCode:'monthly',status:'cancelled',currentPeriodEnd:end,nextBillingTime:null,cancelAtPeriodEnd:true,cancellation:{state:'scheduled'}};
  const license={active:true,productCode:'medsync',planCode:sub.planCode,subscriptionId:sub.id,licenseStatus:'active',validUntil:end};
  const refund={organizationId:sub.organizationId,productCode:'medsync',revision:'9007199254740993002',confirmedAt:now,subscription:{...sub,cancelAtPeriodEnd:false},license:{...license,active:false,licenseStatus:'revoked',validUntil:now,billing:{refundConfirmation:{status:'completed',type:'full_current_period',organizationId:sub.organizationId,productCode:'medsync',subscriptionId:sub.id,paymentId:'payment-1',refundId:'PAYPAL-REFUND-1',amount:'999.00',currency:'MXN',refundedAt:now}}}};
  const firstPending={...refund,subscription:{...sub,status:'pending'},license:{...license,active:false,subscriptionId:null,planCode:null,licenseStatus:'revoked',billing:{}}};
  assert(updates.newerSubscriptionSnapshot(firstPending,'business-1',''),'The first pending subscription can exist before its paid license');
  for(const change of [{organizationId:'foreign'},{productCode:'foreign'}])assert.equal(updates.newerSubscriptionSnapshot({...firstPending,subscription:{...firstPending.subscription,...change}},'business-1',''),false);
  assert.equal(updates.newerSubscriptionSnapshot({...firstPending,license:{...firstPending.license,active:true}},'business-1',''),false,'Active licenses must still match the subscription and plan');
  assert.equal(updates.fullRefundConfirmation(firstPending.subscription,firstPending.license,'business-1'),null,'A missing paid license never means a confirmed refund');
  assert(updates.fullRefundConfirmation(refund.subscription,refund.license,'business-1'));
  for(const change of [{status:'pending'},{type:'partial'},{organizationId:'foreign'},{subscriptionId:'other'},{amount:'0.00'},{amount:'NaN'},{currency:'mxn'},{refundedAt:'2099-01-01'},{paymentId:''}]){
    const altered=copy(refund);Object.assign(altered.license.billing.refundConfirmation,change);
    assert.equal(updates.fullRefundConfirmation(altered.subscription,altered.license,'business-1'),null);
  }
  for(const change of [{active:true},{licenseStatus:'suspended'},{subscriptionId:'foreign'},{planCode:'foreign'}])assert.equal(updates.fullRefundConfirmation(refund.subscription,{...refund.license,...change},'business-1'),null);
  assert.equal(updates.fullRefundConfirmation(sub,license,'business-1'),null,'Cancellation is not a refund');
  assert.equal(updates.fullRefundConfirmation({...refund.subscription,cancelAtPeriodEnd:true},refund.license,'business-1'),null);
  assert(updates.newerSubscriptionSnapshot(refund,'business-1','9007199254740993001'));
  for(const revision of ['9007199254740993002','9007199254740993001','3','0','02',9007199254740993000,'1'.repeat(66)])assert.equal(updates.newerSubscriptionSnapshot({...refund,revision},'business-1',refund.revision),false);
  for(const change of [{organizationId:'foreign'},{productCode:'other'},{confirmedAt:'2099-01-01'},{subscription:undefined},{subscription:[]},{subscription:{...refund.subscription,organizationId:'foreign'}},{license:{...license,subscriptionId:'foreign'}}])assert.equal(updates.newerSubscriptionSnapshot({...refund,...change},'business-1',''),false);

  const Vue=require('vue'),Vuex=require('vuex');Vue.use(Vuex);
  const state={authenticated:true,user:{id_login:'user-1',id_session:'session-1'},business:{id_business:'business-1',name:'Consultorio de prueba',plan:'pro',subscriptionStatus:'active'},role:'admin',permissions:['admin.config'],accessRevision:1,accessExpiresAt:null,token:null,tenantOperational:{allowed:true}};
  const store=new Vuex.Store({state:{CORE:{AUTH:state}},getters:{'CORE/AUTH/getRole':s=>s.CORE.AUTH.role,'CORE/AUTH/getBusiness':s=>s.CORE.AUTH.business},mutations:{
    'CORE/AUTH/SET_AUTH_BUSINESS':(s,b)=>{s.CORE.AUTH.business=b;},'CORE/AUTH/SET_AUTH_TENANT_OPERATIONAL':(s,o)=>{s.CORE.AUTH.tenantOperational=o;},change:(s,p)=>Object.assign(s.CORE.AUTH,p)
  }});
  const routes=[];
  const catalog={available:true,checkoutAvailable:true,taxBehavior:'inclusive',offers:[
    {code:sub.planCode,name:'Plan vigente del servicio',prices:[{code:'pro-monthly',amount:'1234.50',currency:'MXN',billingInterval:'month',billingIntervalCount:1}],features:{'professionals.included':3,'schedule.advanced':true},featureDetails:[{code:'schedule.advanced',name:'Agenda confirmada por el servicio'}]},
    {code:'medsync_basic',name:'Otro plan del servicio',prices:[{code:'basic-annual',amount:'6789.00',currency:'MXN',billingInterval:'year',billingIntervalCount:1}],features:{'professionals.included':1}}
  ]};
  const sources=[];
  class EventSource {
    static CLOSED=2;
    constructor(url,options){this.url=url;this.options=options;this.handlers={};this.readyState=1;sources.push(this);}
    addEventListener(name,fn){this.handlers[name]=fn;}
    emit(name,data){this.handlers[name]({data:typeof data==='string'?data:JSON.stringify(data)});}
    close(){this.readyState=2;this.closed=true;}
  }
  let requests=[],pendingSub;
  const client={interceptors:{response:{use(){}}},request:async config=>{
    requests.push(config.url);
    if(config.url.endsWith('/subscription'))return {data:pendingSub?await pendingSub:copy(sub)};
    if(config.url.endsWith('/license'))return {data:copy(license)};
    if(config.url.endsWith('/history'))return {data:{items:[],nextCursor:null}};
    if(config.url.endsWith('/plans'))return {data:copy(catalog)};
    throw Error('Unexpected HTTP '+config.url);
  }};
  const serviceContext={service:null,axios:{create:()=>client},context:{APP_CORE_URL:'https://consumer.test/'},axiosHelper:{getToken:()=>({}),buildRequestConfig:async()=>({})},store,EventSource,URL,...auth,
    setTimeout:()=>{throw Error('No polling or fallback timers');},setInterval:()=>{throw Error('No polling');}};
  vm.runInNewContext(read('src/services/core/billing/DAPaymentsService.js').replace(/^import[^\n]*\n/gm,'').replace('export default','service ='),serviceContext);
  const sfc=compiler.parseComponent(read('src/views/configuration/components/PlanBilling.vue'));
  const catalogSfc=compiler.parseComponent(read('src/components/billing/PlanCatalog.vue'));
  const catalogContext={component:null,Registration:{publicPlans:()=>{throw Error('Inline catalog must reuse loaded service data');}}};
  vm.runInNewContext(catalogSfc.script.content.replace(/^import[^\n]*\n/gm,'').replace('export default','component ='),catalogContext);
  const catalogRender=compiler.compile(catalogSfc.template.content),catalogOptions={...catalogContext.component,render:new Function(catalogRender.render),staticRenderFns:catalogRender.staticRenderFns.map(code=>new Function(code))};
  const componentContext={component:null,AbortController,Intl,Payments:serviceContext.service,PlanCatalog:catalogOptions,...auth,...access,...checkout,...updates,...cancellation,...history};
  vm.runInNewContext(sfc.script.content.replace(/^import[^\n]*\n/gm,'').replace('export default','component ='),componentContext);
  const options=componentContext.component,compiled=compiler.compile(sfc.template.content);
  assert.deepEqual(compiled.errors,[]);
  const view=new Vue({...options,store,render:new Function(compiled.render),staticRenderFns:compiled.staticRenderFns.map(code=>new Function(code))});
  view.$router={push:route=>{routes.push(route);}};
  const settle=async()=>{await flush();await Vue.nextTick();};await settle();
  assert.deepEqual([...requests].sort(),['history','license','plans','subscription'].map(path=>'api/payments/'+path));assert.equal(sources.length,1);assert.equal(view.planName,'Plan vigente del servicio');assert.equal(view.statusLabel,'Renovación cancelada');
  const stream=sources[0];assert.equal(stream.url,'https://consumer.test/api/payments/subscription/events');assert.equal(stream.options.withCredentials,true);
  stream.emit('snapshot','malformed');assert.equal(view.planName,'Plan vigente del servicio');
  stream.emit('snapshot',{...refund,organizationId:'foreign'});assert.equal(view.planName,'Plan vigente del servicio');
  const partial=copy(refund);partial.revision='9007199254740993001';partial.license.billing={};
  stream.emit('snapshot',partial);await settle();assert.equal(view.planName,'Plan vigente del servicio','Revocation without confirmed total refund cannot imply Sin plan');
  view.showCancellation=true;view.showPlans=true;view.cancellationController=new AbortController();const controller=view.cancellationController;
  const beforeRefund=requests.length;
  stream.emit('snapshot',refund);await settle();
  assert.deepEqual(requests.slice(beforeRefund),['api/payments/history'],'A new revision refreshes only payment history');
  assert.equal(view.planName,'Sin plan activo');assert.equal(view.statusLabel,'Devolución total confirmada');assert.equal(view.showPlans,false);assert.equal(view.showCancellation,false);assert(controller.signal.aborted);
  assert.equal(store.state.CORE.AUTH.business.plan,null);assert.equal(store.state.CORE.AUTH.tenantOperational.allowed,false);
  const nodes=node=>[node,...(node.children||[]).flatMap(nodes)];const content=nodes(view._render()).find(node=>node.data&&node.data.staticClass==='billing-content');
  const text=nodes(content).map(node=>node.text||'').join(' ');
  assert.match(text,/Sin plan activo/);assert.match(text,/Tu devolución total fue confirmada/);assert.match(text,/Planes disponibles/);assert.match(text,/Elige un plan para activar/);
  for(const misleading of ['Puedes seguir usando tu plan','Importe por confirmar','Forma de pago','Próxima renovación','Administrar suscripción'])assert(!text.includes(misleading),misleading);
  const catalogNode=nodes(content).find(node=>node.componentOptions&&node.componentOptions.tag==='plan-catalog');
  assert(catalogNode,'Available plans render inline immediately after the webhook');
  const props=catalogNode.componentOptions.propsData;
  assert.equal(props.currentPlanCode,undefined,'A refunded plan is not marked as current');assert.equal(props.disabled,false);
  assert.equal(props.catalogData,view.catalog,'Cards use the initial authenticated service catalog');
  const cards=new Vue({...catalogOptions,propsData:props});await settle();
  const cardNodes=nodes(cards._render()),cardText=cardNodes.map(node=>node.text||'').join(' ');
  for(const value of ['Plan vigente del servicio','Otro plan del servicio','$1,234.50','$6,789','Agenda confirmada por el servicio','3 profesionales incluidos'])assert(cardText.includes(value),value);
  const buttons=cardNodes.filter(node=>node.tag==='button'&&node.data&&node.data.staticClass==='catalog-select');
  assert.equal(buttons.length,2);assert(buttons.every(button=>!button.data.attrs.disabled),'Every available offer, including the previous plan, is selectable');
  const choose=catalogNode.componentOptions.listeners.select;
  choose({plan:catalog.offers[0],price:catalog.offers[0].prices[0]});
  assert.equal(routes[0].name,'accountPlans');assert.equal(routes[0].query.plan_code,sub.planCode);assert.equal(routes[0].query.price_code,'pro-monthly');
  choose({plan:catalog.offers[1],price:catalog.offers[1].prices[0]});assert.equal(routes[1].query.plan_code,'medsync_basic');
  view.selectPlan({plan:{code:'made-up'},price:{code:'bad'}});assert.equal(routes.length,2,'Unknown frontend choices cannot enter checkout');
  view.catalog={...view.catalog,checkoutAvailable:false};view.selectPlan({plan:catalog.offers[0],price:catalog.offers[0].prices[0]});assert.equal(routes.length,2);
  view.catalog=null;const unavailable=nodes(view._render());assert(unavailable.some(node=>node.text&&node.text.includes('No pudimos consultar los planes disponibles')));
  assert(!unavailable.some(node=>node.componentOptions&&node.componentOptions.tag==='plan-catalog'),'A missing catalog cannot trigger a child fallback request');
  view.catalog=copy(catalog);cards.$destroy();
  const afterRefund=requests.length;stream.emit('snapshot',partial);stream.emit('snapshot',refund);await settle();
  assert.equal(view.planName,'Sin plan activo');assert.equal(requests.length,afterRefund,'Stale or duplicate snapshots must not issue any HTTP reads');
  assert.equal(sources.length,1,'Changing plan status must not reopen the stream');

  // A slow explicit read already in flight must not overwrite the newer webhook.
  let resolve;pendingSub=new Promise(done=>{resolve=done;});const reading=view.load();await flush();
  assert.equal(view.catalog.available,true,'A slow subscription/license read must not hold back the independently loaded service catalog');
  stream.emit('snapshot',{...refund,revision:'9007199254740993003'});resolve(copy(sub));await reading;await settle();
  assert.equal(view.planName,'Sin plan activo');assert.equal(view.license.active,false);pendingSub=null;
  // Renewing while an explicit read is pending must still reopen the stream.
  let finishRead;pendingSub=new Promise(done=>{finishRead=done;});const pendingRead=view.load();await flush();
  const beforeMidRead=requests.length;
  store.commit('change',{accessExpiresAt:'2098-01-01T00:00:00Z'});await settle();
  assert.equal(sources.length,2);assert(stream.closed);assert.equal(requests.length,beforeMidRead);
  let activeStream=sources.at(-1);
  activeStream.emit('snapshot',{...refund,revision:'9007199254740993004'});finishRead(copy(sub));await pendingRead;await settle();pendingSub=null;
  assert.equal(view.planName,'Sin plan activo');
  activeStream.emit('settled',{});assert(activeStream.closed);
  const beforeRenewal=requests.length;
  store.commit('change',{accessExpiresAt:'2099-01-01T00:00:00Z'});await settle();
  const previousStream=activeStream;activeStream=sources.at(-1);assert.notEqual(activeStream,previousStream);assert.equal(requests.length,beforeRenewal,'Credential renewal opens only the stream, without billing GETs');
  activeStream.emit('snapshot',{...refund,revision:'9007199254740993004'});assert.equal(view.planName,'Sin plan activo');
  const reads=requests.length;
  store.commit('change',{role:'assistant',accessRevision:2});await settle();
  assert(activeStream.closed);assert.equal(requests.length,reads,'Revoking permissions closes the stream without a new billing read');
  stream.emit('snapshot',{...refund,revision:'9007199254740993004'});assert.equal(view.subscription,null,'Stale session events are discarded');
  view.$destroy();assert.equal(sources.length,3);
  // Network reconnect remains EventSource transport behavior; settled/expired ends it, with no GET fallback.
  store.commit('change',{role:'admin',accessRevision:3});let delivered=0,ended=0;
  const close=serviceContext.service.watchSubscription({updated:()=>delivered++,ended:()=>ended++}),transport=sources.at(-1);
  transport.readyState=0;transport.onerror();assert.equal(transport.closed,undefined);
  transport.emit('snapshot',refund);assert.equal(delivered,1);
  transport.emit('settled',{});assert(transport.closed);assert.equal(ended,1);close();assert.equal(requests.length,reads);
  // Legacy authentication uses a single authenticated fetch stream, including split UTF-8 chunks.
  const legacyChunks=[],encoder=new TextEncoder();let legacyReads=0,fetches=0,cancelled=false;
  legacyChunks.push(encoder.encode('event: snapshot\ndata: '+JSON.stringify(refund)+'\n\n'));
  legacyChunks.push(encoder.encode('event: settled\ndata: {}\n\n'));
  serviceContext.axiosHelper.getToken=()=>({headers:{Authorization:'synthetic-legacy'}});
  serviceContext.axiosHelper.buildRequestConfig=async()=>({headers:{Authorization:'synthetic-legacy'}});
  serviceContext.AbortController=AbortController;serviceContext.TextDecoder=TextDecoder;
  serviceContext.fetch=async(url,config)=>{fetches++;assert.equal(config.headers.Authorization,'synthetic-legacy');assert.equal(config.credentials,'include');return {ok:true,headers:{get:()=> 'text/event-stream'},body:{getReader:()=>({read:async()=>{legacyReads++;return {done:false,value:legacyChunks.shift()};},cancel:async()=>{cancelled=true;}})}};};
  let legacyDelivered=0;serviceContext.service.watchSubscription({updated:()=>legacyDelivered++});await settle();
  assert.equal(fetches,1);assert.equal(legacyDelivered,1);assert.equal(legacyReads,2);assert(cancelled);assert.equal(requests.length,reads);
  console.log('PASS subscription webhook: real Vue/service, confirmed total refund -> Sin plan with a single history refresh and no polling; partial/cancellation isolation; huge/out-of-order revisions; in-flight reads; expired/revoked sessions; rendered copy; shared registration cards, service names/prices/benefits, previous/other plan checkout and unavailable catalog.');
})().catch(error=>{console.error(error);process.exitCode=1;});
