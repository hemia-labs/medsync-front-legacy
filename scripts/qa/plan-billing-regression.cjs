const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const moduleFrom = file => import('data:text/javascript;base64,' + Buffer.from(read(file)).toString('base64'));
(async () => {
  const access = await moduleFrom('src/security/settingsAccess.js');
  const checkout = await moduleFrom('src/domain/billing/checkout.js');
  const cancellation = await moduleFrom('src/domain/billing/cancellation.js');
  const updates = await moduleFrom('src/domain/billing/subscriptionUpdates.js');
  const authorization = await moduleFrom('src/security/authorizationContext.js');
  const storage = new Map(); let storageBlocked = false;
  globalThis.sessionStorage = { setItem(key, value) { if (storageBlocked) throw Error('Storage blocked'); storage.set(key, value); }, getItem: key => storage.get(key) || null, removeItem: key => storage.delete(key) };
  const checkoutModule = 'data:text/javascript;base64,' + Buffer.from(read('src/domain/billing/checkout.js')).toString('base64');
  const planChanges = await import('data:text/javascript;base64,' + Buffer.from(read('src/domain/billing/planChange.js').replace("from './checkout'", "from '" + checkoutModule + "'")).toString('base64'));
  for (const role of ['admin', 'business_admin']) assert.ok(access.getSettingsSections(role, () => false).some(s => s.key === 'plan-billing'));
  for (const role of ['doctor', 'assistant', 'super_admin', '']) assert.ok(!access.getSettingsSections(role, () => true).some(s => s.key === 'plan-billing'));
  const history = await moduleFrom('src/domain/billing/paymentHistory.js');
  const sfc = compiler.parseComponent(read('src/views/configuration/components/PlanBilling.vue'));
  assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  let subscription = { id: 'subscription-1', organizationId: 'business-1', productCode: 'medsync', planCode: 'medsync_pro', planPriceCode: 'monthly_mxn', status: 'active', nextBillingTime: '2099-01-01T00:00:00Z', currentPeriodEnd: '2099-01-02T00:00:00Z' };
  const proof = { status: 'completed', provider: 'paypal', productCode: 'medsync', organizationId: 'business-1', subscriptionId: 'subscription-1', paymentId: 'payment-1', userId: 'user-1', planCode: 'medsync_pro', planPriceCode: 'monthly_mxn', paidAmount: '799.00', recurringAmount: '899.00', currency: 'MXN', paidAt: '2026-11-01T00:00:00Z', billingInterval: 'month', billingIntervalCount: 1, nextBillingAt: '2099-01-01T00:00:00Z' };
  let catalog = { available: true, offers: [{ code: 'medsync_pro', name: 'Nombre comercial del servicio' }] }, catalogError = false;
  let reads = 0, pending, cancelResult = { cancelled: true }, cancelFailure = null, cancelGate = null; const cancelCalls = [];
  const Payments = { history: async () => ({items:[],nextCursor:null}), watchSubscription: () => null, plans: async () => { if (catalogError) throw new Error('Catalog unavailable'); return catalog; }, subscription: async () => { reads++; return pending ? pending : subscription; }, license: async () => ({ billing: { checkoutConfirmation: proof } }) };
  Payments.cancel = async (id, signal) => { cancelCalls.push({ id, signal, saved: planChanges.loadPlanChangeDiscard(id, planChanges.planChangeOwner(state.$store)) }); if (cancelGate) await cancelGate; if (cancelFailure) throw cancelFailure; return cancelResult; };
  const context = { component: null, AbortController, Intl, Payments, PlanCatalog: {}, ...access, ...checkout, ...authorization, ...updates, ...cancellation, ...planChanges, ...history };
  vm.runInNewContext(sfc.script.content.replace(/^import[^\n]*\n/gm, '').replace('export default', 'component ='), context);
  const options = context.component;
  const state = { ...options.data(), $store: { getters: { 'CORE/AUTH/getRole': 'admin', 'CORE/AUTH/getBusiness': { id_business: 'business-1', name: 'Consultorio de prueba', plan: 'pro', subscriptionStatus: 'trial', trialEndsAt: '2099-01-03T00:00:00Z' } }, state: { CORE: { AUTH: { authenticated: true, user: { id_login: 'user-1' }, business: { id_business: 'business-1' }, role: 'admin', permissions: [], accessRevision: 1 } } } } };
  for (const [name, method] of Object.entries(options.methods)) state[name] = method.bind(state);
  for (const [name, getter] of Object.entries(options.computed)) Object.defineProperty(state, name, { get: getter.bind(state) });
  await state.load();
  assert.equal(state.error, false); assert.equal(state.loading, false);
  assert.equal(state.planName, 'Nombre comercial del servicio'); assert.equal(state.isTrial, false, 'Current subscription overrides stale trial metadata');
  assert.equal(state.purchase.recurringAmount, '899.00'); assert.equal(state.periodEnd, subscription.nextBillingTime);
  assert.equal(state.periodLabel, 'al mes');assert.equal(state.paymentMethod,'PayPal');
  const savedCatalog=state.catalog,savedSubscription=state.subscription,savedLicense=state.license;
  const currentOffer={code:subscription.planCode,name:'Plan vigente',prices:[{code:'monthly_mxn',amount:'899.00',currency:'MXN',billingInterval:'month',billingIntervalCount:1}]};
  const alternative={code:'other-plan',name:'Plan del servicio',prices:[{code:'other-price',amount:'123.45',currency:'MXN',billingInterval:'year',billingIntervalCount:1}]};
  state.catalog={available:true,checkoutAvailable:true,taxBehavior:'inclusive',offers:[currentOffer,alternative]};
  const selectedEvents=[],selectionRoutes=[];state.$emit=(...event)=>selectedEvents.push(event);state.$router={push:route=>selectionRoutes.push(route)};
  state.selectPlan({plan:currentOffer,price:currentOffer.prices[0]});assert.equal(state.selectedPlan,null);
  state.selectPlan({plan:{code:alternative.code,name:'Untrusted label'},price:{code:'other-price',amount:'0.01'}});
  assert.equal(state.selectedPlan.name,alternative.name);assert.equal(state.selectedPlan.price.amount,'123.45','Resolve the choice against the current service catalog');
  state.continueWithPlan();assert.equal(selectedEvents.length,0);assert.equal(selectionRoutes[0].name,'accountPlanChange');assert.equal(selectionRoutes[0].query.plan_code,alternative.code);assert.equal(selectionRoutes[0].query.price_code,'other-price');
  options.watch.showPlans.call(state,false);assert.equal(state.selectedPlan,null);
  state.subscription=null;state.selectPlan({plan:alternative,price:alternative.prices[0]});state.continueWithPlan();
  assert.equal(selectionRoutes[1].name,'accountPlans');assert.equal(selectionRoutes[1].query.plan_code,alternative.code);assert.equal(selectionRoutes[1].query.price_code,'other-price');
  options.watch.showPlans.call(state,false);state.catalog.checkoutAvailable=false;state.selectPlan({plan:alternative,price:alternative.prices[0]});assert.equal(state.selectedPlan,null);
  const attemptId='11111111-1111-4111-8111-111111111111';
  const thirdOffer={code:'medsync_clinic',name:'Clínica',prices:[{code:'clinic_monthly',amount:'1499.00',currency:'MXN',billingInterval:'month',billingIntervalCount:1}]};
  const changeCatalog={available:true,checkoutAvailable:true,taxBehavior:'inclusive',offers:[currentOffer,alternative,thirdOffer]};
  const setDraft=(status='awaiting_approval',action='approve_subscription')=>{
    state.catalog={...changeCatalog};state.subscription={...savedSubscription,pendingPlanChange:{state:status,action,attemptId,targetPlanCode:thirdOffer.code,targetPlanPriceCode:thirdOffer.prices[0].code}};
    state.selectedPlan=null;state.showPlans=true;state.planChangeError='';state.blockedPlanChangeId='';cancelFailure=null;cancelGate=null;cancelResult={cancelled:true};
  };
  for(const status of ['preparing','awaiting_approval'])for(const offer of [alternative,thirdOffer]){
    setDraft(status);assert.equal(state.canChangePlan,true);assert.equal(state.protectedChange,null);
    state.selectPlan({plan:{code:offer.code,name:'Untrusted'},price:{code:offer.prices[0].code,amount:'0.01'}});
    assert.equal(state.selectedPlan.name,offer.name);const before=cancelCalls.length,routes=selectionRoutes.length;
    await state.continueWithPlan();assert.equal(cancelCalls.length,before+1,'Even the same target first discards the old draft');assert.equal(selectionRoutes.length,routes+1);
    const call=cancelCalls.at(-1);assert.equal(call.id,attemptId);assert.ok(call.signal instanceof AbortSignal);
    assert.deepEqual(call.saved,{attemptId,owner:planChanges.planChangeOwner(state.$store),planCode:offer.code,planPriceCode:offer.prices[0].code},'Store only owner-bound codes before sending the discard');
    assert.equal(selectionRoutes.at(-1).query.plan_code,offer.code);assert.equal(selectionRoutes.at(-1).query.price_code,offer.prices[0].code);assert.equal(selectionRoutes.at(-1).query.attempt_id,undefined);
    assert.equal(planChanges.loadPlanChangeDiscard(attemptId,planChanges.planChangeOwner(state.$store)),null);assert.equal(state.showPlans,false);assert.equal(state.changingPlan,false);
  }
  for(const response of [{cancelled:false,approvalUrl:'https://www.paypal.com/restore?token=private'},{cancelled:false}]){
    setDraft();state.selectPlan({plan:alternative,price:alternative.prices[0]});cancelResult=response;await state.continueWithPlan();
    assert.equal(selectionRoutes.at(-1).query.attempt_id,attemptId);assert.equal(selectionRoutes.at(-1).query.discard,'1');assert.equal(selectionRoutes.at(-1).query.plan_code,undefined);
    const saved=planChanges.loadPlanChangeDiscard(attemptId,planChanges.planChangeOwner(state.$store));assert.equal(saved.planCode,alternative.code);assert.ok(!JSON.stringify(saved).includes('paypal'));
  }
  for(const failure of [null,{status:503},{status:401}]){
    setDraft();state.selectPlan({plan:alternative,price:alternative.prices[0]});cancelResult={};cancelFailure=failure;const routes=selectionRoutes.length,before=cancelCalls.length;
    await state.continueWithPlan();assert.equal(selectionRoutes.length,routes);assert.equal(cancelCalls.length,before+1);assert.equal(state.showPlans,true);assert.ok(state.planChangeError);assert.equal(state.changingPlan,false);
    assert.ok(planChanges.loadPlanChangeDiscard(attemptId,planChanges.planChangeOwner(state.$store)),'Unknown outcomes retain the recovery intent');
  }
  setDraft();state.selectPlan({plan:alternative,price:alternative.prices[0]});storageBlocked=true;let beforeCancel=cancelCalls.length,beforeRoutes=selectionRoutes.length;
  await state.continueWithPlan();storageBlocked=false;assert.equal(cancelCalls.length,beforeCancel);assert.equal(selectionRoutes.length,beforeRoutes);assert.ok(state.planChangeError);
  setDraft();state.selectPlan({plan:alternative,price:alternative.prices[0]});cancelFailure={status:409,code:'PLAN_CHANGE_ALREADY_AUTHORIZED'};beforeRoutes=selectionRoutes.length;
  await state.continueWithPlan();assert.equal(selectionRoutes.length,beforeRoutes);assert.equal(state.blockedPlanChangeId,attemptId);assert.ok(state.planChangeError.includes('autorizado'));
  assert.equal(planChanges.loadPlanChangeDiscard(attemptId,planChanges.planChangeOwner(state.$store)),null);state.openBlockedPlanChange();assert.equal(selectionRoutes.at(-1).query.attempt_id,attemptId);
  for(const mutation of ['revision','role','destroyed']){
    setDraft();state.selectPlan({plan:alternative,price:alternative.prices[0]});let release;cancelGate=new Promise(resolve=>{release=resolve;});beforeRoutes=selectionRoutes.length;beforeCancel=cancelCalls.length;
    const action=state.continueWithPlan();assert.equal(state.changingPlan,true);await state.continueWithPlan();assert.equal(cancelCalls.length,beforeCancel+1,'Busy actions do not duplicate discard');
    state.selectPlan({plan:thirdOffer,price:thirdOffer.prices[0]});assert.equal(state.selectedPlan.planCode,alternative.code,'Freeze the trusted selection while discarding');
    if(mutation==='revision')state.$store.state.CORE.AUTH.accessRevision++;else if(mutation==='role')state.$store.getters['CORE/AUTH/getRole']='assistant';else state._isDestroyed=true;
    release();await action;assert.equal(selectionRoutes.length,beforeRoutes,'Discard stale completion after owner/permission changes or destruction');
    state._isDestroyed=false;state.$store.getters['CORE/AUTH/getRole']='admin';assert.equal(state.changingPlan,false);
  }
  setDraft();state.$store.getters['CORE/AUTH/getRole']='assistant';state.selectedPlan={planCode:alternative.code,planPriceCode:'other-price'};beforeCancel=cancelCalls.length;beforeRoutes=selectionRoutes.length;await state.continueWithPlan();state.resumePlanChange();assert.equal(cancelCalls.length,beforeCancel);assert.equal(selectionRoutes.length,beforeRoutes);state.$store.getters['CORE/AUTH/getRole']='admin';
  setDraft();state.selectedPlan={planCode:alternative.code,planPriceCode:'other-price'};state.catalog.checkoutAvailable=false;beforeCancel=cancelCalls.length;beforeRoutes=selectionRoutes.length;await state.continueWithPlan();assert.equal(cancelCalls.length,beforeCancel);assert.equal(selectionRoutes.length,beforeRoutes);
  setDraft();state.selectPlan({plan:alternative,price:alternative.prices[0]});let releaseClosed;cancelGate=new Promise(resolve=>{releaseClosed=resolve;});beforeRoutes=selectionRoutes.length;const closedAction=state.continueWithPlan();state.catalog.checkoutAvailable=false;releaseClosed();await closedAction;assert.equal(selectionRoutes.length,beforeRoutes);assert.ok(state.planChangeError.includes('descartada'));
  const originalSubscriptionRead=Payments.subscription;
  for(const missingId of [undefined,'invalid']){
    setDraft();const canonical=JSON.parse(JSON.stringify(state.subscription));
    const snapshotSub={...canonical,pendingPlanChange:{...canonical.pendingPlanChange,attemptId:missingId}};
    state.snapshotRevision='';state.applySubscriptionSnapshot({organizationId:'business-1',productCode:'medsync',revision:'1',confirmedAt:new Date().toISOString(),subscription:snapshotSub,license:{productCode:'medsync',active:true,subscriptionId:canonical.id,planCode:canonical.planCode}});
    assert.equal(state.draftChange.attemptId,missingId,'Reproduce an organization snapshot without the attempt ID');
    let refreshes=0;Payments.subscription=async signal=>{refreshes++;assert.ok(signal instanceof AbortSignal);return canonical;};
    state.selectPlan({plan:alternative,price:alternative.prices[0]});beforeCancel=cancelCalls.length;beforeRoutes=selectionRoutes.length;
    await state.continueWithPlan();assert.equal(refreshes,1);assert.equal(cancelCalls.length,beforeCancel+1);assert.equal(cancelCalls.at(-1).id,attemptId);assert.equal(selectionRoutes.length,beforeRoutes+1);assert.equal(selectionRoutes.at(-1).query.plan_code,alternative.code);assert.equal(state.planChangeError,'');
  }
  for(const outcome of ['gone','authorized','foreign','unavailable','unidentified','revoked','catalog-closed']){
    setDraft();const canonical=JSON.parse(JSON.stringify(state.subscription));delete state.subscription.pendingPlanChange.attemptId;
    if(outcome==='gone')canonical.pendingPlanChange=null;
    if(outcome==='authorized')canonical.pendingPlanChange.action='approve_payment';
    if(outcome==='foreign')canonical.organizationId='another-business';
    if(outcome==='unidentified')delete canonical.pendingPlanChange.attemptId;
    Payments.subscription=async()=>{
      if(outcome==='unavailable')throw {status:503};
      if(outcome==='revoked')state.$store.state.CORE.AUTH.accessRevision++;
      if(outcome==='catalog-closed')state.catalog.checkoutAvailable=false;
      return canonical;
    };
    state.selectPlan({plan:alternative,price:alternative.prices[0]});beforeCancel=cancelCalls.length;beforeRoutes=selectionRoutes.length;
    await state.continueWithPlan();assert.equal(cancelCalls.length,beforeCancel,'Never discard an unverified, absent or authorized draft');assert.equal(state.changingPlan,false);
    if(outcome==='gone'){assert.equal(selectionRoutes.length,beforeRoutes+1);assert.equal(selectionRoutes.at(-1).query.plan_code,alternative.code);assert.equal(state.planChangeError,'');}
    else if(outcome==='authorized'){assert.equal(selectionRoutes.length,beforeRoutes+1);assert.equal(selectionRoutes.at(-1).query.attempt_id,attemptId);assert.equal(state.planChangeError,'');}
    else{assert.equal(selectionRoutes.length,beforeRoutes);if(!['revoked','catalog-closed'].includes(outcome))assert.ok(state.planChangeError);}
  }
  Payments.subscription=originalSubscriptionRead;state.snapshotRevision='';
  for(const [status,action] of [['scheduled','none'],['awaiting_approval','approve_payment']]){
    setDraft(status,action);assert.equal(state.canChangePlan,false);assert.ok(state.protectedChange);beforeCancel=cancelCalls.length;await state.continueWithPlan();assert.equal(cancelCalls.length,beforeCancel);assert.equal(selectionRoutes.at(-1).query.attempt_id,attemptId);
    state.catalog={available:false,checkoutAvailable:false,offers:[]};state.selectedPlan=null;state.showPlans=true;await state.continueWithPlan();assert.equal(state.showPlans,false);assert.equal(selectionRoutes.at(-1).query.attempt_id,attemptId,'Authorized changes remain recoverable when the catalog is offline');
  }
  for(const status of ['effective','failed']){setDraft();state.subscription.pendingPlanChange.state=status;assert.equal(state.pendingChange,null);assert.equal(state.canChangePlan,true);state.selectPlan({plan:alternative,price:alternative.prices[0]});beforeCancel=cancelCalls.length;await state.continueWithPlan();assert.equal(cancelCalls.length,beforeCancel);assert.equal(selectionRoutes.at(-1).query.plan_code,alternative.code);}
  cancelFailure=null;cancelGate=null;storage.clear();state.planChangeError='';state.blockedPlanChangeId='';state.catalog=savedCatalog;state.subscription=savedSubscription;


  const originalLicense=savedLicense;
  const upgradedSubscription={...savedSubscription,planCode:alternative.code,planPriceCode:alternative.prices[0].code};
  const upgradedLicense={productCode:'medsync',active:true,subscriptionId:upgradedSubscription.id,planCode:alternative.code,billing:{currency:'MXN',baseMonthly:'123.45',addonsMonthly:'25.00',totalMonthly:'148.45',checkoutConfirmation:proof}};
  state.subscription=upgradedSubscription;state.license=upgradedLicense;state.catalog=changeCatalog;
  assert.equal(state.purchase,null,'The old checkout receipt is not proof of the new plan payment');assert.equal(state.currentPrice.recurringAmount,'148.45','Show the current Billing contract including add-ons after an upgrade');assert.equal(state.periodLabel,'al año');
  state.license={...upgradedLicense,billing:{...upgradedLicense.billing,checkoutConfirmation:undefined}};assert.equal(state.currentPrice.recurringAmount,'148.45','A current contract amount does not require an initial checkout receipt');assert.equal(state.paymentMethod,'PayPal','An upgrade keeps PayPal without relying on its original checkout receipt');state.license=null;assert.equal(state.paymentMethod,'PayPal','The payment method does not depend on price or receipt availability');state.license=upgradedLicense;
  state.catalog={available:false,offers:[]};assert.equal(state.currentPrice.recurringAmount,'148.45');assert.equal(state.periodLabel,'por periodo','A catalog outage must not hide the known amount or invent the billing interval');
  state.catalog=changeCatalog;
  for(const patch of [{subscriptionId:'different-subscription'},{planCode:'different-plan'},{productCode:'different-product'},...['0.00','-1.00','invalid',123.45].map(totalMonthly=>({billing:{...upgradedLicense.billing,totalMonthly}})),{billing:{...upgradedLicense.billing,currency:'bad'}}]){state.license={...upgradedLicense,...patch};assert.equal(state.currentPrice,null,'Never display an unbound or invalid contract amount');}
  state.license=null;for(const patch of [{organizationId:'another-business'},{productCode:'another-product'}]){state.subscription={...upgradedSubscription,...patch};assert.equal(state.paymentMethod,'Consultar con MedSync');}state.subscription=null;assert.equal(state.paymentMethod,'Consultar con MedSync','Never infer a paid method from legacy trial metadata alone');
  state.subscription=savedSubscription;state.license=originalLicense;state.catalog=savedCatalog;assert.equal(state.currentPrice.recurringAmount,'899.00','Retain the verified initial-checkout amount when current Billing totals are unavailable');

  catalog = { available: true, offers: [{ code: 'medsync_pro', name: 'Nombre actualizado en el servicio' }] };
  await state.load(); assert.equal(state.planName, 'Nombre actualizado en el servicio', 'Use the current catalog name without a frontend mapping');
  state.subscription = { ...subscription, planCode: 'unknown-plan' };
  assert.equal(state.planName, 'Plan del consultorio', 'Never show a name belonging to another plan');
  for (const name of ['', '   ', null]) {
    catalog = { available: true, offers: [{ code: 'medsync_pro', name }] };
    await state.load(); assert.equal(state.planName, 'Plan del consultorio');
  }
  catalog = { available: false, offers: [{ code: 'medsync_pro', name: 'Unavailable name' }] };
  await state.load(); assert.equal(state.planName, 'Plan del consultorio'); assert.equal(state.error, false);
  catalogError = true; await state.load();
  assert.equal(state.planName, 'Plan del consultorio'); assert.equal(state.error, false, 'A failed catalog read must not hide subscription and payment details');
  assert.equal(state.purchase.recurringAmount, '899.00');
  catalogError = false;
  catalog = { available: true, offers: [{ code: 'medsync_pro', name: 'Nombre comercial del servicio' }] };
  await state.load();
  state.subscription = { ...subscription, cancelAtPeriodEnd: true };
  assert.equal(state.statusLabel, 'Renovación cancelada'); assert.equal(state.periodEnd, subscription.currentPeriodEnd);
  state.subscription = { ...subscription, status: 'cancelled' };
  assert.equal(state.periodEnd, subscription.currentPeriodEnd, 'Cancelled subscriptions never display a renewal date');
  state.subscription = { ...subscription, status: 'suspended' };
  assert.equal(state.periodEnd, null, 'Suspended subscriptions do not promise a renewal');
  state.subscription = { ...subscription, id: 'different-subscription' }; assert.equal(state.purchase, null);
  subscription = { ...subscription, organizationId: 'another-business' }; await state.load(); assert.equal(state.error, true); assert.equal(state.subscription, null);
  subscription = null; await state.load(); assert.equal(state.isTrial, true); assert.equal(state.periodEnd, state.business.trialEndsAt); assert.equal(state.purchase, null); assert.equal(state.planName, 'Plan del consultorio', 'No local plan name inferred from legacy business metadata');
  state.$store.getters['CORE/AUTH/getRole'] = 'assistant'; const before = reads;
  await state.load(); assert.equal(reads, before, 'No billing reads after role revocation'); assert.equal(state.error, true);
  state.$store.getters['CORE/AUTH/getRole'] = 'admin';
  let resolve; pending = new Promise(done => { resolve = done; }); const request = state.load();
  state.$store.state.CORE.AUTH.accessRevision++; resolve({ id: 'old', organizationId: 'business-1', productCode: 'medsync' }); await request;
  assert.equal(state.subscription, null, 'Discard billing results after the authorization changes'); assert.equal(state.catalog, null);
  pending = null; await state.load(); assert.equal(state.loading, false);
  assert.equal(state.dateLabel('invalid'), 'Por confirmar');
  const Vue = require('vue'), Vuex = require('vuex'); Vue.use(Vuex);
  const auth = { authenticated:true,user:{id_login:'user-1',id_session:'session-1'},business:{id_business:'business-1',name:'Consultorio de prueba'},role:'admin',permissions:['admin.config','admin.users'],accessRevision:1 };
  const store = new Vuex.Store({state:{CORE:{AUTH:auth}},getters:{
    'CORE/AUTH/getRole':state=>state.CORE.AUTH.role,
    'CORE/AUTH/getBusiness':state=>state.CORE.AUTH.business
  },mutations:{hydrate(state,payload){Object.assign(state.CORE.AUTH,payload);}}});
  const live = new Vue({...options,store,render:h=>h('div')});
  const settle = async()=>{await new Promise(resolve=>setImmediate(resolve));await Vue.nextTick();};
  await settle();const initialReads=reads;
  assert.equal(live.loading,false);
  store.commit('hydrate',{user:{...auth.user},business:{...auth.business,name:'Nombre actualizado'},permissions:[...auth.permissions].reverse()});
  await settle();
  assert.equal(reads,initialReads,'Rehydrating the same session/rights must not refetch billing');
  assert.equal(live.business.name,'Nombre actualizado','Session metadata still updates the view');
  live.showPlans=true;live.showCancellation=true;
  store.commit('hydrate',{user:{...auth.user},permissions:[...auth.permissions]});await settle();
  assert.equal(live.showPlans,true,'Equivalent session checks do not close open billing dialogs');
  assert.equal(reads,initialReads);
  await live.load();assert.equal(reads,initialReads+1,'Retry still performs an explicit billing refresh');
  store.commit('hydrate',{permissions:[...auth.permissions,'documents.config']});await settle();
  assert.equal(reads,initialReads+2,'Changed permissions still refresh billing even before a revision is assigned');
  store.commit('hydrate',{accessRevision:auth.accessRevision+1});await settle();
  assert.equal(reads,initialReads+3,'Actual authorization revisions still reload protected billing data');
  assert.equal(live.showPlans,false);assert.equal(live.showCancellation,false);
  const beforeRevocation=reads;
  store.commit('hydrate',{role:'assistant',accessRevision:auth.accessRevision+1});await settle();
  assert.equal(reads,beforeRevocation,'Revoked billing access must not issue a new billing request');
  assert.equal(live.subscription,null);assert.equal(live.catalog,null);assert.equal(live.error,true);
  live.$destroy();
  console.log('PASS plan billing: current-plan rejection, catalog-validated alternative selection, self-service plan-change/checkout handoff with explicit owner-bound draft discard and authorized-request recovery, service catalog names, renamed/missing/unknown plans, catalog outage without hiding billing, admin access, trial/paid/cancelled states, verified prices, failed reads, same-session hydration without refetch, explicit refresh and stale-session isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
