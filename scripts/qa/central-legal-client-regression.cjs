/* Synthetic service; real Vue, Vuetify, sanitizer and authorization helpers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),DOMPurify=require('dompurify');
const dom=new JSDOM('<!doctype html><html><body><div data-app="true"></div></body></html>',{url:'https://qa.invalid/',pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver'])global[key]=key==='window'?dom.window:key==='document'?dom.window.document:dom.window[key];
global.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);global.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
const Vue=require('vue'),Vuetify=require('vuetify'),compiler=require('vue-template-compiler');Vue.use(Vuetify);Vue.config.productionTip=false;Vue.config.devtools=false;Vue.config.errorHandler=error=>{throw error;};
const root=path.resolve(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const strip=s=>s.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm,'');
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await Vue.nextTick();};
const copy=v=>JSON.parse(JSON.stringify(v)),deferred=()=>{let resolve;return {promise:new Promise(done=>{resolve=done;}),resolve:v=>resolve(v)};};
const auth=()=>({authenticated:true,user:{id_login:'user',id_session:'session',id_business:'clinic'},business:{id_business:'clinic'},role:'admin',permissions:[]});
const context=()=>({legalContext:'signed-context',legalContextExpiresAt:new Date(Date.now()+3600000).toISOString(),legalDocuments:[{documentKey:'terms',versionId:'v1',version:'2.0.0',title:'Términos QA',contentHash:'a'.repeat(64),requiredAction:'accept',contentHtml:'<p onclick="bad()">Texto de términos</p><script>bad()</script>'},{documentKey:'privacy',versionId:'v2',version:'3.0.0',title:'Privacidad QA',contentHash:'b'.repeat(64),requiredAction:'acknowledge',contentHtml:'<p>Texto de privacidad</p>'}]});
(async()=>{
 const pure=async file=>import('data:text/javascript;base64,'+Buffer.from(read(file)).toString('base64'));
 const authorization=await pure('src/security/authorizationContext.js'),navigation=await pure('src/domain/settings/settings.navigation.js'),registration=await pure('src/utils/registration.js');
 const sfc=compiler.parseComponent(read('src/views/configuration/components/CentralLegalReview.vue')),compiled=compiler.compile(sfc.template.content);assert.deepEqual(compiled.errors,[]);
 let reviewReply,acceptReply,calls=[],reviewCalls=0;
 const service={centralContext:async()=>{reviewCalls++;return copy(await (typeof reviewReply==='function'?reviewReply():reviewReply));},acceptCentral:async body=>{calls.push(copy(body));return typeof acceptReply==='function'?acceptReply(body):acceptReply;}};
 const sandbox={component:null,SaaSLegalService:service,...registration,...authorization,...navigation,sanitizeHtmlForDocumentSnapshot:html=>DOMPurify(dom.window).sanitize(html),window:dom.window,document:dom.window.document,Date};
 vm.runInNewContext(strip(sfc.script.content).replace('export default','component ='),sandbox);
 function mount(){
  reviewReply={success:true,data:context()};acceptReply={success:false};calls=[];reviewCalls=0;
  const guards=[],store={state:{CORE:{AUTH:Vue.observable(auth())}}};
  const view=new Vue({...sandbox.component,propsData:{ownerKey:'owner-1',available:true},render:new Function(compiled.render),staticRenderFns:compiled.staticRenderFns.map(s=>new Function(s)),vuetify:new Vuetify(),beforeCreate(){this.$store=store;this.$router={beforeEach(fn){guards.push(fn);return()=>{};}};}});
  view.$mount();document.querySelector('[data-app]').appendChild(view.$el);view.guards=guards;return view;
 }
 function destroy(view){view.$destroy();view.$el.remove();}
 const tests=[];async function check(name,run){await run();tests.push(name);console.log('PASS '+name);}
 await check('review is read-only, unchecked, sanitized and requires every personal confirmation',async()=>{
  const v=mount();try{
   await v.start();await flush();assert.equal(reviewCalls,1);assert.equal(calls.length,0);assert.equal(v.canSubmit,false);
   const panel=document.querySelector('.central-legal-panel');assert.ok(panel);assert.equal(panel.querySelector('script,[onclick]'),null);
   const boxes=[...panel.querySelectorAll('input[type="checkbox"]')];assert.equal(boxes.length,2);assert.ok(boxes.every(b=>!b.checked));
   boxes[0].checked=true;boxes[0].dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();assert.equal(v.canSubmit,false);
   boxes[1].checked=true;boxes[1].dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();assert.equal(v.canSubmit,true);
   assert.match(panel.textContent,/acepto este documento/);assert.match(panel.textContent,/confirmo haber leído/);assert.equal(v.$children.find(c=>c.$options.name==='v-dialog').retainFocus,true);
   assert.equal(v.close(),true);assert.equal(calls.length,0);assert.equal(v.open,false);
   await v.start();assert.ok(Object.values(v.checked).every(x=>x===false));
  }finally{destroy(v);}
 });
 await check('lost response retries exactly the same full payload/key, blocks navigation/double click, and exposes queue status',async()=>{
  const v=mount();try{
   await v.start();v.checked={v1:true,v2:true};const gate=deferred();acceptReply=()=>gate.promise;
   const sending=v.confirm();assert.equal(v.saving,true);assert.equal(await v.confirm(),false);assert.equal(v.close(),false);assert.equal(calls.length,1);
   let decision;await v.guards[0]({path:'/inicio'},{path:'/admin'},value=>{decision=value;});assert.equal(decision,false);
   gate.resolve({success:false});assert.equal(await sending,false);assert.match(v.error,/mismo envío/);assert.equal(v.result,'');
   assert.equal(calls[0].legalAcceptances.length,2);assert.ok(calls[0].legalAcceptances.every(d=>d.acknowledged===true));assert.match(calls[0].idempotencyKey,/^[a-f0-9-]{36}$/);
   acceptReply=body=>({success:true,data:{eventId:body.idempotencyKey,queued:true,evidenceId:null}});
   assert.equal(await v.confirm(),true);assert.deepEqual(calls[0],calls[1]);assert.match(v.result,/pendientes de sincronizar/);assert.doesNotMatch(v.result,/comprobante está/);assert.ok(v._events);
   await flush();assert.equal(document.activeElement,v.$refs.status);assert.equal(v.canSubmit,false);
   v.close();await v.start();assert.equal(v.result,'');assert.equal(v.submitted,null,'A later version starts a fresh review');
  }finally{destroy(v);}
 });
 await check('expired review/stale server response clears confirmations and requires freshly displayed documents',async()=>{
  const v=mount();try{
   await v.start();v.checked={v1:true,v2:true};v.review.legalContextExpiresAt=new Date(Date.now()-1).toISOString();assert.equal(await v.confirm(),false);assert.equal(calls.length,0);assert.equal(v.stale,true);
   await v.load();assert.equal(v.stale,false);assert.ok(Object.values(v.checked).every(x=>x===false));v.checked={v1:true,v2:true};
   acceptReply={status:409,success:false,code:'LEGAL_VERSION_STALE'};assert.equal(await v.confirm(),false);assert.equal(v.stale,true);assert.equal(v.submitted,null);assert.equal(Object.keys(v.checked).length,0);
   await v.load();assert.equal(v.canSubmit,false);assert.equal(v.error,'');
  }finally{destroy(v);}
 });
 await check('account/tenant/session changes discard pending responses and all review state',async()=>{
  const v=mount();try{
   await v.start();v.checked={v1:true,v2:true};const gate=deferred();acceptReply=()=>gate.promise;const pending=v.confirm();
   v.$store.state.CORE.AUTH.user.id_session='new-session';v.ownerKey='owner-2';await flush();assert.equal(v.open,false);assert.equal(v.review,null);assert.equal(v.submitted,null);assert.equal(v.saving,false);
   gate.resolve({success:true,data:{eventId:calls[0].idempotencyKey,queued:true}});assert.equal(await pending,false);assert.equal(v.result,'');
   const loadGate=deferred();reviewReply=()=>loadGate.promise;const loading=v.start();v.ownerKey='owner-3';await flush();loadGate.resolve({success:true,data:context()});await loading;assert.equal(v.review,null);
  }finally{destroy(v);}
 });
 await check('401/403/429, sync pending, failure and unreadable content are recoverable without implicit acceptance',async()=>{
  const v=mount();try{
   for(const response of [{status:401},{status:403},{status:429},{status:409,code:'LEGAL_SYNC_PENDING'},{status:503}]){reviewReply={...response,success:false};assert.equal(await v.load(),false);assert.ok(v.error);assert.equal(v.canSubmit,false);}
   reviewReply={success:true,data:context()};reviewReply.data.legalDocuments[0].contentHtml='<script>bad()</script>';assert.equal(await v.load(),false);assert.equal(v.review,null);assert.equal(calls.length,0);
  }finally{destroy(v);}
 });
 console.log('PASS central legal client: '+tests.length+' groups');dom.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;dom.window.close();});
