'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),babel=require('@babel/core'),compiler=require('vue-template-compiler');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),json=value=>JSON.parse(JSON.stringify(value));
const commonJs=source=>babel.transformSync(source,{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
function load(file,imports={}){const mod={exports:{}};new Function('require','module','exports',commonJs(read(file)))(name=>{assert(name in imports,'Unexpected import '+name);return imports[name];},mod,mod.exports);return mod.exports;}
(async()=>{
 const history=load('src/domain/billing/paymentHistory.js');
 const initial={id:'payment-initial',organizationId:'business-1',productCode:'medsync',subscriptionId:'old-subscription',provider:'paypal',amount:'499.00',currency:'MXN',paidAt:'2026-11-01T17:00:00Z',createdAt:'2026-11-01T16:00:00Z',status:'paid',reference:'CAPTURE-1',description:'Contratación del plan Básico'};
 const upgrade={...initial,id:'payment-upgrade',subscriptionId:'current-subscription',amount:'180.25',paidAt:null,createdAt:'2026-11-17T17:00:00Z',reference:'CAPTURE-2',description:'Cambio al plan Profesional'};
 assert.equal(history.paymentHistoryPage({items:[initial],nextCursor:null},'business-1').items.length,1);
 for(const patch of [{organizationId:'foreign'},{productCode:'foreign'},{provider:'other'},{status:'pending'},{status:'failed'},{amount:'NaN'},{amount:'Infinity'},{amount:'-1.00'},{amount:'1.234'},{refundedAmount:'1.234'},{paidAt:'invalid'},{createdAt:null},{currency:'bad'}])assert.equal(history.paymentHistoryPage({items:[initial,{...initial,...patch}],nextCursor:null},'business-1'),null);
 for(const cursor of [{},'', 'with space','opaque/+?=', 'x'.repeat(2049)])assert.equal(history.paymentHistoryPage({items:[],nextCursor:cursor},'business-1'),null);
 assert.ok(history.paymentHistoryPage({items:[],nextCursor:'x'.repeat(2048)},'business-1'));assert.ok(history.paymentHistoryPage({items:[],nextCursor:'abc_DEF-123'},'business-1'));
 for(const amount of ['1','1.2','1.23'])assert.ok(history.paymentHistoryPage({items:[{...initial,amount}],nextCursor:null},'business-1'));
 const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(String(error)));
 const dom=new JSDOM('<div id="app"></div>',{url:'https://medsync.example.test/admin?section=plan-billing',pretendToBeVisual:true,virtualConsole,runScripts:'dangerously'}),w=dom.window;
 w.eval(read('node_modules/vue/dist/vue.js'));w.eval(read('node_modules/vuetify/dist/vuetify.js'));w.Vue.config.productionTip=false;w.Vue.config.devtools=false;
 const checkout=load('src/domain/billing/checkout.js'),authorization=load('src/security/authorizationContext.js'),access=load('src/security/settingsAccess.js'),updates=load('src/domain/billing/subscriptionUpdates.js');
 const auth=w.Vue.observable({authenticated:true,user:{id_login:'user-1',id_session:'session-1'},business:{id_business:'business-1',name:'Consultorio de prueba'},role:'admin',permissions:['admin.config'],accessRevision:1,accessExpiresAt:'2099-01-01',token:''});
 const getters={};Object.defineProperty(getters,'CORE/AUTH/getBusiness',{get:()=>auth.business});Object.defineProperty(getters,'CORE/AUTH/getRole',{get:()=>auth.role});
 const store={getters,state:{CORE:{AUTH:auth}},commit:()=>{}};
 const source={id:'current-subscription',organizationId:'business-1',productCode:'medsync',planCode:'medsync_pro',planPriceCode:'pro_monthly',status:'active',currentPeriodEnd:'2099-01-01T00:00:00Z',nextBillingTime:'2099-01-01T00:00:00Z',cancelAtPeriodEnd:false};
 let calls=[],handlers,currentSub=json(source),currentLicense={active:true,productCode:'medsync',planCode:'medsync_pro',subscriptionId:source.id,billing:{totalMonthly:'999.00',currency:'MXN'}},page={items:[upgrade,initial],nextCursor:'bmV4dF9wYWdl-2_'},fail=null,gate=null,billingFail=false;
 const api={watchSubscription:value=>{handlers=value;return ()=>{};},plans:async()=>({available:true,offers:[]}),subscription:async()=>{if(billingFail)throw Error('Unavailable');return json(currentSub);},license:async()=>json(currentLicense),history:async(cursor,signal)=>{calls.push({cursor,signal});const result=json(page),failure=fail,pending=gate;if(pending)await pending;if(failure)throw failure;return result;}};
 const descriptor=compiler.parseComponent(read('src/views/configuration/components/PlanBilling.vue')),compiled=compiler.compile(descriptor.template.content);assert.deepEqual(compiled.errors,[]);
 const mod={exports:{}};new w.Function('require','module','exports',commonJs(descriptor.script.content))(name=>({
  '../../../services/core/billing/DAPaymentsService':{__esModule:true,default:api},'../../../components/billing/PlanCatalog.vue':{__esModule:true,default:{render:h=>h('div')}},
  '../../../utils/registration':{registrationAttemptId:()=> '11111111-1111-4111-8111-111111111111'},'../../../domain/billing/cancellation':load('src/domain/billing/cancellation.js'),
  '../../../domain/settings/settings.navigation':{registerSettingsNavigationGuard:()=>()=>{}},'../../../domain/billing/subscriptionUpdates':updates,'../../../domain/billing/checkout':checkout,
  '../../../security/settingsAccess':access,'../../../security/authorizationContext':authorization,'../../../domain/billing/paymentHistory':history,
  '../../../domain/billing/planChange':load('src/domain/billing/planChange.js',{'./checkout':checkout})
 }[name]),mod,mod.exports);
 const Page={...mod.exports.default,render:new w.Function(compiled.render),staticRenderFns:compiled.staticRenderFns.map(code=>new w.Function(code))};
 w.Vue.prototype.$store=store;
 const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await w.Vue.nextTick();await new Promise(resolve=>setImmediate(resolve));};
 let app,screen;const mount=async()=>{if(app)app.$destroy();w.document.body.innerHTML='<div id="app"></div>';app=new w.Vue({vuetify:new w.Vuetify(),render:h=>h('v-app',[h(Page,{ref:'page'})])}).$mount('#app');screen=app.$refs.page;await flush();};
 const text=()=>w.document.body.textContent,rows=()=>w.document.querySelectorAll('.billing-payment-row'),button=label=>[...w.document.querySelectorAll('button')].find(item=>item.textContent.includes(label));
 try{
  await mount();assert.equal(screen.purchase,null,'Upgrade history does not require an initial-checkout proof');assert.equal(rows().length,2);assert.match(text(),/Cambio al plan Profesional/);assert.match(text(),/Contratación del plan Básico/);assert.match(text(),/Registrado el/);assert.match(text(),/CAPTURE-2/);assert.match(text(),/PayPal/);assert(!w.document.querySelector('.billing-payments a'),'Do not invent receipt or invoice links');
  page={items:[initial,{...initial,id:'older',reference:null,description:'<script>unsafe</script>'}],nextCursor:null};button('Ver más pagos').click();await flush();assert.equal(calls.at(-1).cursor,'bmV4dF9wYWdl-2_');assert.equal(rows().length,3,'Append without duplicate payments');assert.match(text(),/<script>unsafe<\/script>/);assert(!w.document.querySelector('.billing-payments script'));
  page={items:[{...initial,id:'new-valid'},{...initial,id:'foreign',organizationId:'other'}],nextCursor:null};await screen.loadHistory();await flush();assert.equal(screen.historyError,true);assert.equal(rows().length,3,'Reject the complete page instead of accepting a valid subset');assert(!text().includes('Todavía no hay pagos confirmados'));
  const previous=rows().length;fail={status:503};await screen.loadHistory();await flush();assert.equal(rows().length,previous);assert.equal(screen.error,false);assert.match(text(),/No pudimos consultar el historial/);assert.match(text(),/Tu plan actual/);fail=null;
  page={items:[upgrade],nextCursor:'page-2'};button('Volver a consultar pagos').click();await flush();assert.equal(rows().length,1);assert.equal(screen.historyError,false);
  fail={status:503};button('Ver más pagos').click();await flush();assert.equal(screen.historyRetryMore,true);assert.equal(rows().length,1);fail=null;page={items:[initial],nextCursor:null};button('Volver a consultar pagos').click();await flush();assert.equal(calls.at(-1).cursor,'page-2');assert.equal(rows().length,2);
  let release;gate=new Promise(resolve=>{release=resolve;});page={items:[upgrade],nextCursor:null};const stale=screen.loadHistory();const old=calls.at(-1);gate=null;page={items:[{...initial,id:'fresh'}],nextCursor:null};await screen.loadHistory();assert.equal(old.signal.aborted,true);release();await stale;assert.equal(screen.paymentHistory[0].id,'fresh','Aborted older pages cannot replace current data');
  let unblock;gate=new Promise(resolve=>{unblock=resolve;});const pending=screen.loadHistory();auth.accessRevision++;await flush();assert.equal(calls.at(-2).signal.aborted,true);unblock();gate=null;await pending;await flush();
  page={items:[{...initial,status:'partially_refunded',refundedAmount:'100.00'},{...upgrade,id:'full-refund',status:'refunded',refundedAmount:'180.25'},{...initial,id:'reversed',status:'reversed'}],nextCursor:null};
  currentSub={...source,status:'cancelled',cancelAtPeriodEnd:true};await screen.load();await flush();assert.equal(rows().length,3);assert.match(text(),/Devolución parcial/);assert.match(text(),/Devuelto/);assert.match(text(),/Revertido/);assert.match(text(),/100/);
  currentSub={...source,status:'cancelled',cancelAtPeriodEnd:false};currentLicense={...currentLicense,active:false,licenseStatus:'revoked',billing:{refundConfirmation:{status:'completed',type:'full_current_period',productCode:'medsync',organizationId:'business-1',subscriptionId:source.id,paymentId:'payment-upgrade',refundId:'refund-1',amount:'180.25',currency:'MXN',refundedAt:new Date().toISOString()}}};
  await screen.load();await flush();assert.ok(screen.refund);assert.equal(rows().length,3,'A full refund never hides prior payments');assert.match(text(),/Tu devolución total fue confirmada/);
  const revision='20',snapshot={organizationId:'business-1',productCode:'medsync',revision,confirmedAt:new Date().toISOString(),subscription:currentSub,license:currentLicense};
  let before=calls.length;handlers.updated(snapshot);await flush();assert.equal(calls.length,before+1,'New confirmed revisions refresh the history');handlers.updated(snapshot);handlers.updated({...snapshot,revision:'19'});handlers.updated({...snapshot,revision:'21',organizationId:'other'});await flush();assert.equal(calls.length,before+1,'Duplicate/stale/foreign snapshots do not read history');
  page={items:[],nextCursor:null};await screen.loadHistory();await flush();assert.equal(rows().length,0);assert.match(text(),/Todavía no hay pagos confirmados/);
  for(const patch of [{organizationId:'other'},{productCode:'other'},{amount:'1.234'}]){page={items:[{...initial,...patch}],nextCursor:null};await screen.loadHistory();await flush();assert.equal(screen.historyError,true);assert.equal(rows().length,0);assert.match(text(),/No pudimos consultar el historial/);assert(!text().includes('Todavía no hay pagos confirmados'),'A broken ledger contract is an error, never an empty history');}
  billingFail=true;page={items:[initial],nextCursor:null};await screen.load();await flush();assert.equal(screen.error,true);assert.equal(rows().length,1,'History remains independently available if the subscription read fails');billingFail=false;
  before=calls.length;auth.role='assistant';auth.accessRevision++;await flush();assert.equal(calls.length,before);assert.equal(screen.paymentHistory.length,0);assert(!w.document.querySelector('.billing-payments'));
  auth.role='admin';auth.accessRevision++;await flush();let finish;gate=new Promise(resolve=>{finish=resolve;});const destroyed=screen.loadHistory();const last=calls.at(-1);app.$destroy();app=null;assert.equal(last.signal.aborted,true);finish();await destroyed;
  assert.deepEqual(errors,[]);
 }finally{if(app)app.$destroy();dom.window.close();}
 // Verify the production read transport and encoding without any provider traffic.
 const transportCalls=[],transportStore={};
 const service=load('src/services/core/billing/DAPaymentsService.js',{
  axios:{__esModule:true,default:{create:()=>({interceptors:{response:{use:()=>{}}},request:async config=>{transportCalls.push(config);return {data:{items:[],nextCursor:null}};}})}},
  '../../config/axios.url':{__esModule:true,default:{APP_CORE_URL:'https://api.example.test/'}},'../../config/axios.helper':{__esModule:true,default:{buildRequestConfig:async(method,{signal})=>({signal,headers:{}})}},
  '../../../store':{__esModule:true,default:transportStore},'../../../security/authorizationContext':{authorizationContext:()=>({}),isCurrentAuthorization:()=>true},'../../config/csrfRecovery':{canRecoverCsrf:()=>false,recoverCsrfRequest:()=>{},readableCsrfError:value=>value}
 }).default;
 const controller=new AbortController();await service.history(undefined,controller.signal);await service.history('abc_DEF-123',controller.signal);assert.equal(transportCalls[0].url,'api/payments/history');assert.equal(transportCalls[1].url,'api/payments/history?cursor=abc_DEF-123');assert(transportCalls.every(call=>call.method==='get'&&call.data===undefined&&call.signal===controller.signal));
 console.log('PASS payment history: real Vue2/Vuetify list for initial and upgrade payments without checkout proof, whole-page contract validation and base64url cursors, safe text, dates, pagination/dedup, independent errors and retry, refund/cancelled visibility, SSE revisions, aborted/stale/role-isolated responses, GET-only encoded transport. No network/DB/PayPal calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
