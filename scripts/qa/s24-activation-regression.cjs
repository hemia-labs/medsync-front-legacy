'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const compiler=require('vue-template-compiler');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(file,bindings={},sfc=false) {
  const code=sfc?compiler.parseComponent(read(file)).script.content:read(file),sandbox={module:{exports:{}},...bindings};
  vm.runInNewContext(code.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','module.exports ='),sandbox);return sandbox.module.exports;
}
(async()=>{
  const {activationDestination}=await import('data:text/javascript;base64,'+Buffer.from(read('src/utils/activationDestination.js')).toString('base64'));
  const {isPendingActivation}=await import('data:text/javascript;base64,'+Buffer.from(read('src/utils/registration.js')).toString('base64'));
  let status={commercialState:'activated',nextAction:'setup_summary',destination:'summary',contact:{emailVerified:true},welcomePending:true};
  let pending=false,superAdmin=false,authorized=true,welcome=true,restricted=false;
  const getters=new Proxy({}, {get:(_,key)=>({
    'CORE/AUTH/isAuthorized':authorized,'CORE/AUTH/getRole':superAdmin?'super_admin':'admin','CORE/AUTH/isSuperAdmin':superAdmin,
    'CORE/AUTH/getBusiness':{registrationWelcomePending:welcome,subscriptionStatus:pending?'pending_activation':'active'},
    'CORE/AUTH/getTenantOperational':pending?{allowed:false,code:'TENANT_NOT_OPERATIONAL',reasonCode:'ACCOUNT_PENDING_ACTIVATION'}:restricted?{allowed:false,code:'TENANT_NOT_OPERATIONAL'}:{allowed:true},
    'CORE/AUTH/getPermissions':['admin.config']
  })[key]});
  const store={getters,state:{CORE:{AUTH:{permissions:['admin.config'],role:'admin'}}},dispatch:async()=>{}};
  class Router{constructor(){}beforeEach(fn){this.guard=fn;}afterEach(){}}
  const router=load('src/router/index.js',{isPendingActivation,store,isD2AuthMode:()=>true,
    Vue:{use(){}},VueRouter:Router,process:{env:{}},canAccessSettings:()=>true,hasPermission:()=>true,hasAnyPermission:()=>true,canAccessPulse:()=>true,
    ...Object.fromEntries(['dashboard','superAdmin','admin','auth','patient','error','legal','business','prescription','publicSignature','licensingDemo','help'].map(key=>[key,[]]))});
  const navigate=name=>new Promise(resolve=>router.guard({name,matched:[{meta:{requireAuth:true}}],query:{}},{},resolve));
  assert.equal((await navigate('home')).name,'accountActivation');
  assert.equal((await navigate('dashboard')).name,'accountActivation');
  assert.equal(await navigate('admin'),undefined);
  assert.equal(await navigate('accountActivation'),undefined);
  welcome=false;assert.equal(await navigate('home'),undefined);
  assert.equal((await navigate('accountActivation')).name,'home');
  welcome=true;restricted=true;assert.equal((await navigate('home')).name,'tenantRestricted');restricted=false;
  pending=true;assert.equal((await navigate('home')).name,'accountActivation');pending=false;
  superAdmin=true;assert.equal((await navigate('home')).name,'superAdminDashboard');superAdmin=false;
  authorized=false;assert.equal((await navigate('home')).name,'auth');authorized=true;
  for(const value of [null,{...status,paid:true,nextAction:'unavailable'},{...status,nextAction:'home',destination:'https://evil.invalid'},
    {...status,nextAction:'home',destination:'home',commercialState:'unavailable'}])assert.equal(activationDestination(value),null);
  let ackFailure=false,ackCalls=0;
  const Registration={
    activation:async()=>status,
    acknowledgeWelcome:async()=>{ackCalls++;return {acknowledged:!ackFailure};}
  };
  const component=load('src/views/Auth/AccountActivation.vue',{AccountFlowShell:{},ActivationWelcome:{},Registration,activationDestination},true);
  const destinations=[];
  const view={...component.data(),verified:true,accountReady:true,clearVerification(){},$refs:{},$nextTick:async()=>{},
    $store:{dispatch:async()=>({success:true})},$router:{replace:async destination=>destinations.push(JSON.stringify(destination))},
    showError:async function(message){this.error=message;}};
  await component.methods.load.call(view);
  assert.equal(destinations.length,0,'Loading a confirmed account leaves the welcome visible');
  assert.equal(ackCalls,0);
  ackFailure=true;
  await component.methods.continueFromWelcome.call(view,true);
  assert.match(view.error,/No pudimos abrir/);
  assert.equal(destinations.length,0);
  ackFailure=false;
  await component.methods.continueFromWelcome.call(view,true);
  assert.deepEqual(JSON.parse(destinations.at(-1)),{name:'admin',query:{section:'summary'}});
  await component.methods.continueFromWelcome.call(view,false);
  assert.deepEqual(JSON.parse(destinations.at(-1)),{name:'home'});
  assert.equal(view.busy,false);
  console.log('PASS R4: verified welcome, durable acknowledgment before navigation, retry, explicit Summary/Home and tenant routing.');

})().catch(e=>{console.error(e.stack);process.exitCode=1;});
