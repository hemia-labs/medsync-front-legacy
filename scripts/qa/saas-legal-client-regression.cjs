/* Real SaaS legal client components, policy helpers, DOMPurify and Vue/Vuetify.
 * Synthetic service only: no HTTP, DB, publication, live acceptance or delivery. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const DOMPurify=require('dompurify');
const dom=new JSDOM('<!doctype html><html><body><div data-app="true"></div></body></html>',{url:'https://qa.invalid/',pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver'])global[key]=key==='window'?dom.window:key==='document'?dom.window.document:dom.window[key];
global.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);global.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
const Vue=require('vue');const VueRouter=require('vue-router');const Vuetify=require('vuetify');
const compiler=require('vue-template-compiler');
const {compileStyle}=require('@vue/component-compiler-utils');
Vue.use(VueRouter);Vue.use(Vuetify);Vue.config.productionTip=false;Vue.config.devtools=false;Vue.config.errorHandler=error=>{throw error;};
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const strip=source=>source.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm,'');
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;return {promise:new Promise(done=>{resolve=done;}),resolve:value=>resolve(value)};};
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await Vue.nextTick();};
const service={};let currentReply,historyReply,acceptReply,currentCalls,historyCalls,acceptCalls;
function resetMocks(){currentReply={success:true,data:{documents:[],pending_count:0}};historyReply={success:true,data:{acceptances:[]}};acceptReply={success:false};currentCalls=0;historyCalls=0;acceptCalls=[];}
service.current=async()=>{currentCalls++;return typeof currentReply==='function'?currentReply():currentReply;};
service.history=async()=>{historyCalls++;return typeof historyReply==='function'?historyReply():historyReply;};
service.accept=async id=>{acceptCalls.push(id);return typeof acceptReply==='function'?acceptReply(id):acceptReply;};
const sanitizer={module:{exports:{}},DOMPurify,window:dom.window};
vm.runInNewContext(strip(read('src/utils/sanitizeHtml.js')).replace(/export default[^;]+;/g,'').replace(/export /g,'')+'\nmodule.exports = { sanitizeHtmlForDocumentSnapshot };',sanitizer);
const auth=()=>({authenticated:true,user:{id_login:'qa-actor',id_session:'qa-session',id_business:'qa-business'},business:{id_business:'qa-business'},role:'doctor',permissions:[],accessRevision:0,token:'synthetic-token'});
const version=(n=1)=>({id_version:'qa-version-'+n,version_number:n,title:'Términos QA',description:'Documento sintético',content_html:'<p>Contenido legal QA '+n+'</p>',content_hash:'synthetic-hash-'+n,published_at:'2026-10-17T00:30:00Z',acceptance_scope:'user',required:true});
const documentItem=(n=1,extra={})=>({id_document:'qa-document',document_key:'terms_conditions',title:'Términos QA',description:'Documento sintético',acceptance_scope:'user',required:true,current_version:version(n),accepted:null,can_accept:true,pending:true,...extra});
const receipt=(n=1)=>({id_acceptance:'qa-acceptance-'+n,id_version:'qa-version-'+n,id_business:'qa-business',acceptance_scope:'user',accepted_at:'2026-10-17T00:35:00Z',accepted_by_id:'qa-actor',accepted_by_name:'Persona QA',content_hash:'synthetic-hash-'+n});
const historyItem=(n=1)=>({...receipt(n),id_document:'qa-document',document_key:'terms_conditions',title:'Términos QA',version_number:n,version:version(n)});
const results=[];
async function check(name,run){resetMocks();try{await run();results.push({name,ok:true});console.log('PASS '+name);}catch(error){results.push({name,ok:false});console.error('FAIL '+name+'\n'+error.stack);}}

(async()=>{
 const pure=async file=>import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
 const authorization=await pure('src/security/authorizationContext.js'),navigation=await pure('src/domain/settings/settings.navigation.js');
 function load(file){
  const sfc=compiler.parseComponent(read(file)),compiled=compiler.compile(sfc.template.content);
  assert.deepEqual(compiled.errors,[],file+' compiles');
  const context={component:null,SaaSLegalService:service,...sanitizer.module.exports,...authorization,...navigation,window:dom.window,document:dom.window.document,Date};
  vm.runInNewContext(strip(sfc.script.content).replace('export default','component ='),context,{filename:file});
  return {options:context.component,sfc,render:new Function(compiled.render),staticRenderFns:compiled.staticRenderFns.map(source=>new Function(source))};
 }
 const account=load('src/views/configuration/components/AccountLegalDocuments.vue'),notice=load('src/core/components/legal/LegalUpdateNotice.vue');
 function state(component,extras={}){
  const guards=[];const view={$refs:{},$store:{state:{CORE:{AUTH:auth()}}},$router:{beforeEach(fn){guards.push(fn);return()=>{guards.splice(guards.indexOf(fn),1);};}},$swal:{fire:async()=>({isConfirmed:false})},$nextTick:callback=>callback?callback():Promise.resolve(),...extras};
  Object.entries(component.options.methods).forEach(([key,method])=>{view[key]=method.bind(view);});Object.assign(view,component.options.data.call(view));
  Object.entries(component.options.computed).forEach(([key,getter])=>Object.defineProperty(view,key,{get:getter.bind(view),configurable:true}));view.guards=guards;return view;
 }
 function reviewing(){const view=state(account);view.documents=[documentItem()];view.currentLoaded=true;view.openCurrent(view.documents[0]);return view;}

 await check('current/history loading failures remain unknown and independently retry into real empty or populated results',async()=>{
  const view=state(account);currentReply={success:false,message:'SQL private failure'};historyReply={success:false};
  await view.refreshAll();assert.ok(view.currentError);assert.ok(view.historyError);assert.equal(view.currentLoaded,false);assert.equal(view.historyLoaded,false);assert.doesNotMatch(view.currentError,/SQL|private/);
  currentReply={success:true,data:{documents:[],pending_count:0}};historyReply={success:true,data:{acceptances:[]}};await view.refreshAll();assert.equal(view.currentError,'');assert.equal(view.historyError,'');assert.equal(view.currentLoaded,true);assert.equal(view.historyLoaded,true);assert.equal(view.documents.length,0);assert.equal(historyCalls,2);
  currentReply={success:true,data:{documents:[documentItem()],pending_count:1}};await view.loadCurrent();assert.equal(view.documents.length,1);
  assert.equal(view.statusLabel(documentItem(1,{current_version:null,can_accept:false,pending:false})),'Sin publicar');
  assert.equal(view.statusLabel(documentItem()),'Pendiente de aceptación');assert.equal(view.statusLabel(documentItem(1,{accepted:receipt(),can_accept:false,pending:false})),'Aceptado');
  assert.match(view.scopeHelp('business'),/administradora.*consultorio/);assert.match(view.scopeHelp('user'),/Cada usuario/);
 });
 await check('actual Vue/Vuetify dialog requires an explicit checkbox, offers close without accepting and sanitizes published HTML',async()=>{
  const hostile=documentItem();hostile.current_version.content_html='<p onclick="bad()">Contenido revisable</p><script>bad()</script><img src="javascript:bad()">';
  currentReply={success:true,data:{documents:[hostile],pending_count:1}};
  const store={state:{CORE:{AUTH:Vue.observable(auth())}}};
  const router=new VueRouter({mode:'abstract',routes:[{path:'/admin'},{path:'/inicio'}]});await router.push('/admin');
  const view=new Vue({...account.options,router,vuetify:new Vuetify(),render:account.render,staticRenderFns:account.staticRenderFns,beforeCreate(){this.$store=store;this.$swal={fire:async()=>({isConfirmed:false})};}});
  try{
   view.$mount();document.querySelector('[data-app]').appendChild(view.$el);await flush();
   view.openCurrent(view.documents[0]);await flush();
   const panel=document.querySelector('.legal-review');assert.ok(panel);assert.equal(panel.querySelector('script,[onclick],img[src^="javascript:"]'),null);
   const checkbox=panel.querySelector('input[type="checkbox"]');assert.ok(checkbox);const submit=Array.from(panel.querySelectorAll('button')).find(button=>button.textContent.includes('Aceptar esta versión'));assert.ok(submit);assert.equal(submit.disabled,true);
   checkbox.checked=true;checkbox.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();assert.equal(view.acknowledged,true);assert.equal(submit.disabled,false);
   const actualDialog=view.$children.find(child=>child.$options.name==='v-dialog');assert.ok(actualDialog);assert.equal(actualDialog.retainFocus,true,'Legal review retains Vuetify focus containment without an external confirmation modal');
   await view.requestClose();assert.equal(view.dialogOpen,false);assert.equal(view.acknowledged,false);assert.equal(acceptCalls.length,0,'Closing cannot imply legal acceptance');
   view.openCurrent(view.documents[0]);await flush();const readyPanel=document.querySelector('.legal-review');const nextCheckbox=readyPanel.querySelector('input[type="checkbox"]');nextCheckbox.checked=true;nextCheckbox.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();
   const accepted=receipt();acceptReply={success:true,data:{acceptance:accepted,already_accepted:false}};currentReply={success:true,data:{documents:[documentItem(1,{accepted,pending:false,can_accept:false})],pending_count:0}};historyReply={success:true,data:{acceptances:[historyItem()]}};
   const acceptButton=Array.from(readyPanel.querySelectorAll('button')).find(button=>button.textContent.includes('Aceptar esta versión'));acceptButton.focus();assert.equal(document.activeElement,acceptButton);
   assert.equal(await view.acceptSelected(),true);await flush();assert.equal(document.activeElement,view.$refs.acceptanceStatus,'Removing the submit button must transfer focus to the confirmed receipt, not the document body');assert.equal(view.$refs.acceptanceStatus.getAttribute('tabindex'),'-1');assert.match(document.activeElement.textContent,/Aceptación registrada/);
  }finally{view.$destroy();if(view.$el)view.$el.remove();}
 });
 await check('acceptance is server-confirmed, guarded against repeated clicks/navigation and invalidates the notice without private event data',async()=>{
  const view=reviewing(),gate=deferred();view.acknowledged=true;acceptReply=gate.promise;account.options.mounted.call(view);
  let events=0;const listener=event=>{events++;assert.equal(event.detail,null);};window.addEventListener('saas-legal-accepted',listener);
  try{
   const pending=view.acceptSelected();assert.equal(view.saving,true);assert.equal(view.selectedAcceptance,null);assert.equal(view.documents[0].accepted,null);assert.equal(await view.acceptSelected(),false);assert.deepEqual(acceptCalls,['qa-version-1']);assert.equal(await view.requestClose(),false);
   let decision;await view.guards[0]({path:'/inicio'},{path:'/admin'},value=>{decision=value;});assert.equal(decision,false);
   const accepted=receipt();currentReply={success:true,data:{documents:[documentItem(1,{accepted,pending:false,can_accept:false})],pending_count:0}};historyReply={success:true,data:{acceptances:[historyItem()]}};
   gate.resolve({success:true,data:{acceptance:accepted,already_accepted:false}});assert.equal(await pending,true);assert.equal(view.saving,false);assert.equal(view.selectedAcceptance.id_acceptance,accepted.id_acceptance);assert.equal(view.documents[0].accepted.id_acceptance,accepted.id_acceptance);assert.equal(view.acknowledged,false);assert.equal(view.canSubmitAcceptance,false);assert.equal(events,1);assert.equal(view.acceptances.length,1);
  }finally{window.removeEventListener('saas-legal-accepted',listener);account.options.beforeDestroy.call(view);}
 });
 await check('failed or malformed acceptance responses preserve review without presenting an unconfirmed acceptance',async()=>{
  for(const reply of [{success:false,message:'SQL private failure'},{success:true,data:{}},{success:true,data:{acceptance:receipt(2)}},{success:true,data:{acceptance:{id_version:'qa-version-1'}}},{success:true,data:{acceptance:{...receipt(),id_business:'other'}}}]){
   const view=reviewing();view.acknowledged=true;acceptReply=reply;assert.equal(await view.acceptSelected(),false);assert.equal(view.selectedAcceptance,null);assert.equal(view.documents[0].accepted,null);assert.equal(view.acknowledged,true);assert.equal(view.dialogOpen,true);assert.ok(view.saveError);assert.doesNotMatch(view.saveError,/SQL|private/);
  }
 });
 await check('409 requires loading and reviewing the new version with a fresh unchecked acknowledgment',async()=>{
  for(const reply of [{success:false,status:409,data:{code:'LEGAL_VERSION_STALE'}},Object.assign(new Error('Synthetic conflict'),{response:{data:{status:409,data:{code:'LEGAL_VERSION_STALE'}}}})]){
   const view=reviewing();view.acknowledged=true;acceptReply=async()=>{if(reply instanceof Error)throw reply;return reply;};const before=currentCalls;
   assert.equal(await view.acceptSelected(),false);assert.equal(view.staleVersion,true);assert.equal(view.acknowledged,false);assert.equal(view.canSubmitAcceptance,false);assert.equal(view.selectedVersion.id_version,'qa-version-1');assert.equal(currentCalls,before,'A conflict must not silently review or accept another version');
   currentReply={success:true,data:{documents:[documentItem(2)],pending_count:1}};assert.equal(await view.reviewLatest(),true);assert.equal(view.selectedVersion.id_version,'qa-version-2');assert.equal(view.acknowledged,false);assert.equal(view.canSubmitAcceptance,false);
  }
  const view=reviewing();view.acknowledged=true;currentReply={success:true,data:{documents:[documentItem(2)],pending_count:1}};await view.loadCurrent();assert.equal(view.staleVersion,true);assert.equal(view.acknowledged,false);assert.equal(view.selectedVersion.id_version,'qa-version-1');
 });
 await check('history opens the frozen accepted version with actor/time/hash and never exposes acceptance controls',async()=>{
  const view=reviewing(),original=historyItem(),immutable=copy(original);view.documents=[documentItem(2)];view.acceptances=[original];
  assert.equal(view.openReceipt(original),true);assert.equal(view.selectedVersion.id_version,'qa-version-1');assert.match(view.safeContent,/Contenido legal QA 1/);assert.doesNotMatch(view.safeContent,/Contenido legal QA 2/);assert.equal(view.selectedAcceptance.accepted_by_name,'Persona QA');assert.match(view.formatDate(original.accepted_at),/centro de México/);
  view.acknowledged=true;assert.equal(view.mayAcceptSelected,false);assert.equal(view.canSubmitAcceptance,false);assert.equal(await view.acceptSelected(),false);
  view.selectedVersion.content_html='Local alteration';assert.equal(original.version.content_html,'<p>Contenido legal QA 1</p>');assert.deepEqual(copy(original),immutable);assert.equal(acceptCalls.length,0);
  for(const html of ['', '<p>&nbsp;\u200b</p>','<script>bad()</script>']){view.openCurrent(documentItem(2));view.selectedVersion.content_html=html;view.acknowledged=true;assert.equal(view.canSubmitAcceptance,false,'An unavailable document cannot be accepted');}
 });
 await check('read and acceptance responses are discarded after actor/tenant/permissions/token/revision/epoch changes or disposal',async()=>{
  const changes={actor:view=>{view.authState.user.id_login='other';},tenant:view=>{view.authState.business.id_business='other';},permissions:view=>{view.authState.permissions=['new'];},token:view=>{view.authState.token='other-token';},revision:view=>{view.authState.accessRevision++;},epoch:()=>authorization.invalidatePendingRequests(),disposed:view=>{view.disposed=true;}};
  for(const [kind,change] of Object.entries(changes)){
   if(kind!=='disposed') {const before=reviewing();before.acknowledged=true;change(before);const calls=acceptCalls.length;assert.equal(before.canSubmitAcceptance,false,'A review checkbox belongs to its original authorization: '+kind);assert.equal(await before.acceptSelected(),false);assert.equal(acceptCalls.length,calls);}
   for(const loader of ['loadCurrent','loadHistory']){
    const view=state(account),gate=deferred();if(loader==='loadCurrent')currentReply=gate.promise;else historyReply=gate.promise;
    const pending=view[loader]();change(view);gate.resolve({success:true,data:loader==='loadCurrent'?{documents:[documentItem()],pending_count:1}:{acceptances:[historyItem()]}});await pending;
    assert.equal(view.documents.length,0,loader+' '+kind);assert.equal(view.acceptances.length,0,loader+' '+kind);
   }
   const view=reviewing(),gate=deferred();view.acknowledged=true;acceptReply=gate.promise;let events=0;const listener=()=>{events++;};window.addEventListener('saas-legal-accepted',listener);
   try{const pending=view.acceptSelected();change(view);gate.resolve({success:true,data:{acceptance:receipt()}});assert.equal(await pending,false);assert.equal(view.selectedAcceptance,null);assert.equal(events,0);}finally{window.removeEventListener('saas-legal-accepted',listener);}
  }
  const view=reviewing();view.acceptances=[historyItem()];view.authState.user.id_login='other';currentReply={success:true,data:{documents:[],pending_count:0}};historyReply={success:true,data:{acceptances:[]}};account.options.watch.sessionKey.handler.call(view);assert.equal(view.dialogOpen,false);assert.equal(view.documents.length,0);assert.equal(view.acceptances.length,0);await flush();
 });
 await check('notice checks login/current data, throttles route/focus refresh for 45 seconds and keeps business responsibility visible',async()=>{
  const originalNow=Date.now;let now=100000;Date.now=()=>now;
  try{
   const view=state(notice);currentReply={success:true,data:{documents:[documentItem(1,{acceptance_scope:'business'})],pending_count:1}};
   assert.equal(await view.load(true),true);assert.equal(view.pendingCount,1);assert.equal(view.businessPending,true);const count=currentCalls;
   assert.equal(await view.load(),false);notice.options.watch['$route.fullPath'].call(view);view.onVisible();await flush();assert.equal(currentCalls,count);
   now+=46000;view.onVisible();await flush();assert.equal(currentCalls,count+1);
   await view.load(true);assert.equal(currentCalls,count+2,'Acceptance event/manual retry can bypass throttling');
   view.authState.authenticated=false;assert.equal(await view.load(true),false);assert.equal(currentCalls,count+2);
  }finally{Date.now=originalNow;}
 });
 await check('accepted event queues one fresh check during an existing read and notice failures never invent an accepted state',async()=>{
  const view=state(notice),gate=deferred();currentReply=gate.promise;const pending=view.load(true);view.onAccepted();view.onAccepted();assert.equal(currentCalls,1);assert.equal(view.queuedRefresh,true);
  currentReply={success:true,data:{documents:[],pending_count:0}};gate.resolve({success:true,data:{documents:[documentItem()],pending_count:1}});await pending;await flush();assert.equal(currentCalls,2);assert.equal(view.pendingCount,0);assert.equal(view.loading,false);
  currentReply={success:false};await view.load(true);assert.ok(view.error);assert.equal(view.pendingCount,0,'Failure retains known state and exposes its uncertainty');
  const unknown=state(notice);await unknown.load(true);assert.equal(unknown.pendingCount,null);assert.ok(unknown.error);
 });
 await check('notice drops stale context, ignores hidden visibility and removes all lifecycle listeners',async()=>{
  for(const change of [view=>{view.authState.user.id_login='other';},view=>{view.authState.token='other';},()=>authorization.invalidatePendingRequests(),view=>{view.disposed=true;}]){
   const view=state(notice),gate=deferred();currentReply=gate.promise;const pending=view.load(true);change(view);gate.resolve({success:true,data:{documents:[documentItem()],pending_count:1}});await pending;assert.equal(view.pendingCount,null);assert.equal(view.businessPending,false);
  }
  const hidden=state(notice),visibility=Object.getOwnPropertyDescriptor(document,'visibilityState'),beforeHidden=currentCalls;Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});hidden.onVisible();assert.equal(currentCalls,beforeHidden);if(visibility)Object.defineProperty(document,'visibilityState',visibility);else delete document.visibilityState;
  const view=state(notice);notice.options.mounted.call(view);notice.options.beforeDestroy.call(view);const count=currentCalls;window.dispatchEvent(new dom.window.Event('focus'));document.dispatchEvent(new dom.window.Event('visibilitychange'));window.dispatchEvent(new dom.window.CustomEvent('saas-legal-accepted'));await flush();assert.equal(currentCalls,count);
  const anonymous=state(notice);anonymous.authState.authenticated=false;notice.options.watch.sessionKey.handler.call(anonymous);assert.equal(anonymous.pendingCount,null);assert.equal(anonymous.error,'');assert.equal(currentCalls,count);
 });
 await check('compiled scoped night styles keep headings, notice, actions, receipt and error states readable',async()=>{
  const scope='data-v-saas-legal-qa',styles=[],sample=document.createElement('section'),previous=document.documentElement.getAttribute('data-theme');
  function element(tag,className){const node=document.createElement(tag);node.className=className;node.setAttribute(scope,'');sample.appendChild(node);return node;}
  try{
   const globalStyle=document.createElement('style'),tailwind=read('src/assets/tailwind.css');globalStyle.textContent=tailwind.slice(tailwind.indexOf('html[data-theme="clinical-night"],'));document.head.appendChild(globalStyle);styles.push(globalStyle);
   for(const component of [account,notice])for(const block of component.sfc.styles){const compiled=compileStyle({source:block.content,id:scope,scoped:Boolean(block.scoped)});assert.deepEqual(compiled.errors,[]);const style=document.createElement('style');style.textContent=compiled.code;document.head.appendChild(style);styles.push(style);}
   document.documentElement.setAttribute('data-theme','clinical-night');sample.className='account-legal bg-white text-gray-700';sample.setAttribute(scope,'');document.body.appendChild(sample);
   for(const className of ['legal-heading','legal-update-notice text-gray-700']){const node=element('div',className),css=window.getComputedStyle(node);assert.equal(css.backgroundColor,'rgb(23, 47, 65)');assert.equal(css.color,'rgb(226, 232, 240)');}
   assert.equal(window.getComputedStyle(element('button','legal-button--outline')).color,'rgb(186, 230, 253)');assert.equal(window.getComputedStyle(element('button','legal-update-retry')).color,'rgb(186, 230, 253)');
   for(const className of ['legal-button--primary','legal-update-primary']){const css=window.getComputedStyle(element('button',className));assert.equal(css.backgroundColor,'rgb(14, 116, 144)');assert.equal(css.color,'rgb(255, 255, 255)');}
   for(const className of ['legal-acceptance-proof','legal-status--accepted']){const css=window.getComputedStyle(element('div',className));assert.equal(css.backgroundColor,'rgb(24, 62, 50)');assert.equal(css.color,'rgb(200, 245, 222)');}
   const error=window.getComputedStyle(element('p','legal-message--error'));assert.equal(error.backgroundColor,'rgb(73, 43, 53)');assert.equal(error.color,'rgb(255, 218, 225)');
   const content=window.getComputedStyle(element('article','legal-document-content'));assert.equal(content.backgroundColor,'rgb(255, 255, 255)');assert.equal(content.color,'rgb(37, 54, 77)');
  }finally{sample.remove();styles.forEach(style=>style.remove());if(previous===null)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',previous);}
 });
 const failed=results.filter(result=>!result.ok);console.log(JSON.stringify({checks:results.length,passed:results.length-failed.length,failed:failed.map(result=>result.name),network:false,database:false,liveAcceptances:0},null,2));if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{dom.window.close();});
