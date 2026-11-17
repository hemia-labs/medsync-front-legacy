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
  const context={enabled:true,sessionState:'anonymous',legalContext:'qa-context',legalSnapshotToken:'same-snapshot',legalDocuments:[
    {documentKey:'terms',versionId:'v1',contentHash:'qa-hash',requiredAction:'accept',title:'Synthetic terms',contentHtml:'<p>Synthetic</p>'}
  ]};
  let next=context,recoveries=0,registrations=0,error=null;
  const component=load('src/views/Auth/Register.vue',{AccountFlowShell:{},...rules,clearInterval,setInterval,
    Registration:{context:async()=>{if(error)throw error;return next;},recoverSession:async()=>{recoveries++;if(error)throw error;return {recovered:true};},register:async()=>{registrations++;throw {code:'REGISTRATION_SESSION_EXPIRED'};}}},true);
  const make=()=>{
    const instance={...component.data(),loading:false,context:structuredClone(context),$set:(obj,k,value)=>{obj[k]=value;},$nextTick:async()=>{},$refs:{},$el:{querySelector:()=>null}};
    for(const [key,method] of Object.entries(component.methods))instance[key]=method.bind(instance);
    for(const [key,get] of Object.entries(component.computed))Object.defineProperty(instance,key,{get:()=>get.call(instance)});
    instance.form={email:'synthetic@example.invalid',telephone:'',name:'QA',firstSurname:'Sintética',secondSurname:'',businessName:'Clínica QA',password:'Synthetic form-only phrase',confirmPassword:'Synthetic form-only phrase'};
    instance.accepted={terms:true};instance.attemptId='same-attempt';return instance;
  };
  const capture=make(),before=JSON.stringify(capture.form);capture.sessionExpired=true;
  await capture.submit();assert.equal(registrations,0);
  await capture.recoverRegistrationSession();assert.equal(recoveries,1);assert.equal(registrations,0);
  assert.equal(JSON.stringify(capture.form),before);assert.equal(capture.attemptId,'same-attempt');assert.equal(capture.accepted.terms,true);
  assert.equal(capture.sessionExpired,false);assert.match(capture.recoveryNotice,/datos se conservaron/);
  await capture.submit();assert.equal(registrations,1);assert.equal(capture.sessionExpired,true);assert.equal(JSON.stringify(capture.form),before);
  console.log('PASS recovery preserves every form field and attempt, never submits automatically; expiry during submit is recoverable');
  next={...context,legalSnapshotToken:'new-snapshot',legalDocuments:[{...context.legalDocuments[0],versionId:'v2'}]};
  await capture.recoverRegistrationSession();assert.equal(capture.accepted.terms,false);assert.equal(JSON.stringify(capture.form),before);assert.equal(capture.attemptId,'same-attempt');
  console.log('PASS legal changes require fresh confirmation without discarding captured identity or password');
  const offline=make();offline.sessionExpired=true;error={code:'NETWORK_ERROR'};await offline.recoverRegistrationSession();assert.equal(offline.sessionExpired,true);assert.equal(JSON.stringify(offline.form),before);assert.equal(offline.busy,false);
  error={code:'ACCOUNT_ALREADY_AUTHENTICATED'};await offline.recoverRegistrationSession();assert.equal(offline.alreadyAuthenticated,true);assert.equal(offline.sessionExpired,false);assert.equal(JSON.stringify(offline.form),before);
  error=null;next={...context,sessionState:'active'};const active=make();await active.loadContext();assert.equal(active.alreadyAuthenticated,true);await active.submit();assert.equal(registrations,1);
  next={...context,sessionState:'expired'};const stale=make();await stale.loadContext();assert.equal(stale.sessionExpired,true);assert.match(stale.error,/sesión anterior terminó/);
  console.log('PASS outages and session changes retain capture; active and expired contexts have distinct actions');
  let calls=[],clears=0,dispatches=0;
  const service=load('src/services/core/auth/DARegistrationService.js',{
    axios:{create:()=>({interceptors:{response:{use(){}}},request:async request=>{calls.push(request);return {data:{recovered:true}};}})},
    context:{APP_CORE_URL:'http://qa.invalid'},isCsrfEnabled:()=>true,axiosHelper:{buildRequestConfig:async()=>({})},DACsrfService:{clearCsrfToken(){clears++;}},
    store:{dispatch:()=>dispatches++},authorizationContext:()=>1,isCurrentAuthorization:()=>true
  });
  await service.recoverSession();assert.equal(calls.length,1);assert.equal(calls[0].url,'api/registration/recover-session');assert.equal(Object.keys(calls[0].data).length,0);assert.equal(clears,2);assert.equal(dispatches,0);
  assert.ok(!/localStorage|sessionStorage/.test(component.methods.recoverRegistrationSession.toString()));
  console.log('PASS transport sends only recovery, refreshes CSRF cache and never hydrates/remounts auth or persists passwords');
})().catch(error=>{console.error(error);process.exitCode=1;});
