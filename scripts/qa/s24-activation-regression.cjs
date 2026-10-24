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
  let status={commercialState:'activated',nextAction:'setup_summary',destination:'summary',contact:{emailVerified:true}},calls=0;
  let pending=false,superAdmin=false,authorized=true,welcome=true,restricted=false,fail=false;
  const Registration={activation:async()=>{calls++;if(fail)throw Error();return status;}};
  const getters=new Proxy({}, {get:(_,key)=>({
    'CORE/AUTH/isAuthorized':authorized,'CORE/AUTH/getRole':superAdmin?'super_admin':'admin','CORE/AUTH/isSuperAdmin':superAdmin,
    'CORE/AUTH/getBusiness':{registrationWelcomePending:welcome,subscriptionStatus:pending?'pending_activation':'active'},
    'CORE/AUTH/getTenantOperational':pending?{allowed:false,code:'TENANT_NOT_OPERATIONAL',reasonCode:'ACCOUNT_PENDING_ACTIVATION'}:restricted?{allowed:false,code:'TENANT_NOT_OPERATIONAL'}:{allowed:true},
    'CORE/AUTH/getPermissions':['admin.config']
  })[key]});
  const store={getters,state:{CORE:{AUTH:{permissions:['admin.config'],role:'admin'}}},dispatch:async()=>{}};
  class Router{constructor(){}beforeEach(fn){this.guard=fn;}afterEach(){}}
  const router=load('src/router/index.js',{Registration,activationDestination,isPendingActivation,store,isD2AuthMode:()=>true,
    Vue:{use(){}},VueRouter:Router,process:{env:{}},canAccessSettings:()=>true,hasPermission:()=>true,hasAnyPermission:()=>true,canAccessPulse:()=>true,
    ...Object.fromEntries(['dashboard','superAdmin','admin','auth','patient','error','legal','business','prescription','publicSignature','licensingDemo'].map(key=>[key,[]]))});
  const navigate=name=>new Promise(resolve=>router.guard({name,matched:[{meta:{requireAuth:true}}],query:{}},{},resolve));
  let destination=await navigate('home');assert.equal(destination.name,'admin');assert.deepEqual({...destination.query},{section:'summary'});assert.equal(calls,1);
  assert.equal(await navigate('admin'),undefined);assert.equal(calls,1,'Summary/guide navigation does not repeatedly resolve destinations');
  status={...status,nextAction:'home',destination:'home'};assert.equal(await navigate('home'),undefined);
  status={...status,nextAction:'retry_preparation',destination:null};assert.equal((await navigate('home')).name,'accountActivation');
  fail=true;assert.equal((await navigate('home')).name,'accountActivation');fail=false;
  welcome=false;const before=calls;assert.equal(await navigate('home'),undefined);assert.equal(calls,before);
  welcome=true;restricted=true;assert.equal((await navigate('home')).name,'tenantRestricted');assert.equal(calls,before);restricted=false;
  pending=true;assert.equal((await navigate('home')).name,'accountActivation');assert.equal(calls,before);pending=false;
  superAdmin=true;assert.equal((await navigate('home')).name,'superAdminDashboard');assert.equal(calls,before);superAdmin=false;
  authorized=false;assert.equal((await navigate('home')).name,'auth');authorized=true;
  for(const value of [null,{...status,paid:true},{...status,nextAction:'home',destination:'https://evil.invalid'},
    {...status,nextAction:'home',destination:'home',commercialState:'unavailable'}])assert.equal(activationDestination(value),null);
  // A rejected navigation must remain recoverable, never acknowledge or start a guide.
  const component=load('src/views/Auth/AccountActivation.vue',{AccountFlowShell:{},Registration:{activation:async()=>({commercialState:'activated',nextAction:'setup_summary',destination:'summary',contact:{emailVerified:true}})},activationDestination},true);
  const view={busy:false,_isDestroyed:false,verified:true,$store:{dispatch:async()=>({success:true})},$router:{replace:async()=>{throw Error('NavigationAborted');}},showError:async function(message){this.error=message;}};
  await component.methods.load.call(view);assert.match(view.error,/No pudimos abrir/);assert.equal(view.busy,false);
  console.log('PASS R4: real router one destination resolution, no automatic guide, complete/acknowledged Home, recoverable failures, restriction/pending/superadmin/anonymous precedence, untrusted destinations, cancelled navigation.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
