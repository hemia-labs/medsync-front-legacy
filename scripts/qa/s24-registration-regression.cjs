'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const compiler=require('vue-template-compiler');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(file,bindings={},component=false) {
  let source=component?compiler.parseComponent(read(file)).script.content:read(file);
  source=source.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','module.exports =');
  const context={module:{exports:{}},...bindings};vm.runInNewContext(source,context,{filename:file});return context.module.exports;
}
(async()=>{
  const rules=await import('data:text/javascript;base64,'+Buffer.from(read('src/utils/registration.js')).toString('base64'));
  const valid={name:'Médica Ñ',businessName:'Clínica Ñ',telephone:'5512345678',email:'QA@example.test',password:'  Una frase extensa y privada  '};
  assert.deepEqual(rules.registrationErrors(valid),{});
  assert.ok(rules.registrationErrors({...valid,telephone:'+525512345678'}).telephone);
  assert.ok(rules.registrationErrors({...valid,password:'corta'}).password);
  assert.deepEqual(rules.registrationErrors({...valid,password:'😀'.repeat(128)}),{});
  assert.ok(rules.registrationErrors({...valid,password:'😀'.repeat(129)}).password);
  assert.equal(rules.usableRegistrationContext({enabled:true,legalDocuments:[]}),false);
  const complete={enabled:true,legalDocuments:rules.LEGAL_KEYS.map(documentKey=>({documentKey,versionId:'v1',contentHash:'hash',title:'Legal',contentHtml:'<p>Texto</p>'}))};
  assert.equal(rules.usableRegistrationContext(complete),true);
  assert.equal(rules.usableRegistrationContext({...complete,legalDocuments:[complete.legalDocuments[0],complete.legalDocuments[0]]}),false);

  let cookie=true,authorized=true,superAdmin=false,pending=true;
  const restricted=()=>pending?{allowed:false,code:'TENANT_NOT_OPERATIONAL',reasonCode:'ACCOUNT_PENDING_ACTIVATION'}:null;
  const store={state:{CORE:{AUTH:{permissions:[],role:'admin'}}},getters:new Proxy({}, {get:(_,key)=>({
    'CORE/AUTH/isAuthorized':authorized,'CORE/AUTH/getRole':superAdmin?'super_admin':'admin','CORE/AUTH/isSuperAdmin':superAdmin,
    'CORE/AUTH/getTenantOperational':restricted(),'CORE/AUTH/getUser':{rol:superAdmin?'super_admin':'admin'},
    'CORE/AUTH/getPermissions':[]
  })[key]}),dispatch:async()=>{}};
  const Vue={use(){},nextTick:fn=>fn(),prototype:{$session:{get:key=>key==='token'?(authorized?'token':null):key==='tenantOperational'?restricted():null}}};
  class Router{constructor(options){this.options=options;}beforeEach(fn){this.guard=fn;}afterEach(){}}
  const router=load('src/router/index.js',{Vue,VueRouter:Router,store,isD2AuthMode:()=>cookie,isPendingActivation:rules.isPendingActivation,
    ...Object.fromEntries(['dashboard','superAdmin','admin','auth','patient','error','legal','business','prescription','publicSignature','licensingDemo'].map(name=>[name,[]])),
    process:{env:{}},getSessionPermissions:()=>[],hasAnyPermission:()=>true,hasPermission:()=>true,canAccessSettings:()=>true,canAccessPulse:()=>true});
  const navigate=(name,meta={requireAuth:true})=>new Promise(resolve=>router.guard({name,matched:[{meta}],query:{}},{},resolve));
  for(const mode of [true,false]){
    cookie=mode;
    for(const name of ['home','admin','AllPatients','ShowPx','tenantRestricted','login','register'])assert.equal((await navigate(name,{requireAuth:!['login','register'].includes(name)})).name,'accountActivation');
    assert.equal(await navigate('accountActivation',{requireAuth:true,allowTenantRestricted:true}),undefined);
    pending=false;assert.equal((await navigate('accountActivation')).name,'home');
    superAdmin=true;assert.equal((await navigate('accountActivation')).name,'superAdminDashboard');superAdmin=false;
    authorized=false;assert.equal((await navigate('accountActivation')).name,'auth');authorized=true;pending=true;
  }
  const App=load('src/App.vue',{mapActions:()=>({}),moduleTypes:{AUTH:'CORE/AUTH',CONFIGURATION:'CORE/CONFIGURATION'},fnTypes:{},
    isPendingActivation:rules.isPendingActivation,getThemeContext:()=>'',syncThemeContext:()=>{}},true);
  let themeRequests=0;const app={$store:{state:{CORE:{AUTH:{authenticated:true,tenantOperational:restricted()}}},dispatch:()=>themeRequests++}};
  await App.methods.loadTheme.call(app);assert.equal(themeRequests,0);app.$store.state.CORE.AUTH.tenantOperational=null;
  await App.methods.loadTheme.call(app);assert.equal(themeRequests,1);

  let calls=[],csrf=0,refreshes=0,revision=1,fail=null;
  const service=load('src/services/core/auth/DARegistrationService.js',{
    axios:{create:()=>({request:async config=>{calls.push(config);if(fail){const error=fail;fail=null;throw error;}return {data:{ok:true}};}})},
    context:{APP_CORE_URL:'https://qa.invalid/'},isCsrfEnabled:()=>true,
    DACsrfService:{getCsrfHeader:async options=>{assert.equal(options.force,true);csrf++;return {'X-CSRF-Token':'synthetic'};},clearCsrfToken(){}},
    store:{getters:{'CORE/AUTH/isAuthorized':true},dispatch:async()=>{refreshes++;}},
    authorizationContext:()=>revision,isCurrentAuthorization:owner=>owner===revision
  });
  fail={};await assert.rejects(service.register({synthetic:true},'attempt'),error=>error.code==='NETWORK_ERROR');assert.equal(calls.length,1);
  await service.register({synthetic:true},'attempt');assert.equal(calls[1].headers['Idempotency-Key'],calls[0].headers['Idempotency-Key']);assert.equal(csrf,2);
  fail={response:{status:429,data:{code:'REGISTRATION_RATE_LIMITED',retryAfterSeconds:47},headers:{}}};
  await assert.rejects(service.sendCode(),error=>error.retryAfterSeconds===47);assert.equal(refreshes,0);
  fail={response:{status:401,data:{code:'AUTH_ACCESS_EXPIRED'},headers:{}}};await service.activation();assert.equal(refreshes,1);
  for(const file of ['Register','AccountActivation']) {
    const component=load('src/views/Auth/'+file+'.vue',{AccountFlowShell:{}},true);
    const destroyed={_isDestroyed:true};await component.methods.showError.call(destroyed,{code:'REGISTRATION_RATE_LIMITED',retryAfterSeconds:60});
    assert.deepEqual(destroyed,{_isDestroyed:true},'Late failure cannot start timers or update a destroyed view');
  }
  console.log('PASS R3: validation/Unicode, legal readiness, actual D2/legacy router pending isolation and active/superadmin/anonymous destinations, pending theme suppression, actual transport CSRF, no unknown-outcome write replay, stable idempotency, server cooldown and auth renewal.');
})().catch(error=>{console.error(error);process.exitCode=1;});
