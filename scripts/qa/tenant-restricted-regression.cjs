'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),compiler=require('vue-template-compiler');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(String(error)));console.on('error',error=>errors.push(String(error)));
 const dom=new JSDOM('<div id="app"></div>',{url:'https://medsync.example.test/tenant-restricted',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console}),w=dom.window;
 for(const file of ['node_modules/vue/dist/vue.js','node_modules/vue-router/dist/vue-router.js','node_modules/vuex/dist/vuex.js','node_modules/vuetify/dist/vuetify.js'])w.eval(read(file));
 w.Vue.config.productionTip=false;w.Vue.config.devtools=false;
 let cookieMode=true,reads=0,logouts=0,response={status:200,data:{name:'Consultorio Pediátrico Arcoíris',tenantOperational:{allowed:false,reasonCode:'TENANT_CANCELLED',tenantStatus:'cancelled'}}},getCurrent=async()=>response;
 const session=new Map([['business',{name:'Consultorio legacy'}],['tenantOperational',{allowed:false,reasonCode:'TENANT_SUSPENDED',tenantStatus:'suspended'}]]),sessionWrites=[];
 w.Vue.prototype.$session={get:key=>session.get(key),set:(key,value)=>{sessionWrites.push(key);session.set(key,value);}};
 const store=new w.Vuex.Store({modules:{CORE:{namespaced:true,modules:{AUTH:{namespaced:true,state:{role:'admin',business:{name:'Consultorio de la sesión'},tenantOperational:{allowed:false,reasonCode:'TENANT_CANCELLED',tenantStatus:'cancelled'}},getters:{getRole:s=>s.role,getBusiness:s=>s.business,getTenantOperational:s=>s.tenantOperational},mutations:{hydrate:(s,p)=>Object.assign(s,p)},actions:{logout:()=>{logouts++;}}}}}}});
 const descriptor=compiler.parseComponent(read('src/views/error/TenantRestricted.vue')),compiled=compiler.compile(descriptor.template.content);assert.deepEqual(compiled.errors,[]);
 const source=descriptor.script.content.replace(/^import[^\n]*\n/gm,'').replace('export default','return');
 const options=new w.Function('canManageCheckout','mapGetters','moduleTypes','fnTypes','DABusinessService','isD2AuthMode',source)(role=>['admin','business_admin'].includes(role),w.Vuex.mapGetters,{AUTH:'CORE/AUTH'},{getTenantOperational:'getTenantOperational',getBusiness:'getBusiness',logout:'logout'},{getCurrent:()=>{reads++;return getCurrent();}},()=>cookieMode);
 options.render=new w.Function(compiled.render);options.staticRenderFns=compiled.staticRenderFns.map(code=>new w.Function(code));
 const router=new w.VueRouter({mode:'abstract',routes:[{path:'/tenant-restricted',name:'tenantRestricted'},{path:'/admin',name:'admin'},{path:'/cuenta/planes',name:'accountPlans'},{path:'/px/all',name:'AllPatients'}]});
 await router.push('/tenant-restricted');let app,view;
 const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await w.Vue.nextTick();};
 const button=text=>Array.from(w.document.querySelectorAll('a,button')).find(node=>(node.textContent.trim() || node.getAttribute('aria-label') || '').includes(text));
 const mount=async()=>{if(app)app.$destroy();w.document.body.innerHTML='<div id="app"></div>';app=new w.Vue({store,router,vuetify:new w.Vuetify(),render:h=>h('v-app',[h(options,{ref:'view'})])}).$mount('#app');view=app.$refs.view;await flush();};
 try {
  await mount();assert.equal(reads,1);assert.equal(view.title,'Tu consultorio está en modo consulta');assert.equal(view.businessName,response.data.name);
  assert.match(w.document.body.textContent,/Creación y edición en pausa/);assert.match(w.document.body.textContent,/según los permisos de tu cuenta/);
  assert(button('Ver plan y facturación'));assert.equal(button('Ver plan y facturación').getAttribute('href'),'/admin?section=plan-billing');assert.equal(button('Elegir un plan'),undefined);
  button('Ver plan y facturación').click();await flush();assert.equal(router.currentRoute.name,'admin');assert.equal(router.currentRoute.query.section,'plan-billing');
  button('Consultar expedientes').click();await flush();assert.equal(router.currentRoute.path,'/px/all');
  const before=reads;await new Promise(resolve=>setTimeout(resolve,25));assert.equal(reads,before,'No background polling is introduced');assert.deepEqual(sessionWrites,[],'D2 never persists tenant state to legacy session');
  for(const role of ['assistant','doctor','super_admin','']){
   store.commit('CORE/AUTH/hydrate',{role});await flush();assert.equal(button('Ver plan y facturación'),undefined);assert.equal(button('Elegir un plan'),undefined);assert(button('Consultar expedientes'));
   assert.match(w.document.body.textContent,/Contacta al administrador de tu consultorio/);
  }
  for(const role of ['admin','business_admin']){
   store.commit('CORE/AUTH/hydrate',{role});response={status:200,data:{name:'Consultorio de prueba',tenantOperational:{allowed:false,reasonCode:'TRIAL_EXPIRED',tenantStatus:'trial'}}};await view.refreshStatus();await flush();
   assert.equal(view.title,'Tu periodo de prueba ha terminado');assert.equal(view.statusLabel,'Prueba finalizada');assert(button('Elegir un plan'));assert.equal(button('Ver plan y facturación'),undefined);
   assert.equal(button('Elegir un plan').getAttribute('href'),'/cuenta/planes');
  }
  for(const [reasonCode,tenantStatus,title]of [['SUBSCRIPTION_PAST_DUE','past_due','Revisa el estado de tu suscripción'],['TENANT_SUSPENDED','suspended','El acceso a tu consultorio está suspendido'],['TENANT_INACTIVE','inactive','El acceso a tu consultorio está pausado'],['UNKNOWN','unknown','El acceso a tu consultorio está limitado']]){
   response={status:200,data:{name:'Nombre largo del consultorio para verificar presentación',tenantOperational:{allowed:false,reasonCode,tenantStatus}}};await view.refreshStatus();await flush();assert.equal(view.title,title);assert(button('Ver plan y facturación'));
  }
  let resolve;getCurrent=()=>new Promise(done=>{resolve=done;});const first=view.refreshStatus(),pendingReads=reads;await view.refreshStatus();await flush();assert.equal(reads,pendingReads,'Refresh is single-flight');assert.equal(view.refreshing,true);assert(button('Actualizar estado').disabled);
  resolve({status:503,message:'No pudimos consultar el estado. Inténtalo de nuevo.'});await first;await flush();assert.equal(view.refreshing,false);assert.equal(w.document.querySelector('[role=alert]').textContent.trim(),'No pudimos consultar el estado. Inténtalo de nuevo.');
  assert.equal(view.tenantOperational.reasonCode,'UNKNOWN','A failed refresh never grants operational access');
  getCurrent=async()=>{throw Error('offline');};await view.refreshStatus();await flush();assert.match(view.loadError,/No fue posible actualizar/);assert.equal(view.refreshing,false);
  cookieMode=false;getCurrent=async()=>({status:200,data:{name:'Consultorio legacy actualizado',tenantOperational:{allowed:false,reasonCode:'TENANT_SUSPENDED',tenantStatus:'suspended'}}});await mount();assert.equal(view.businessName,'Consultorio legacy actualizado');assert.equal(view.tenantOperational.reasonCode,'TENANT_SUSPENDED');assert.deepEqual(sessionWrites,['tenantOperational']);
  assert.equal(button('Cerrar sesión'),undefined);assert.equal(logouts,0);
  let finish;getCurrent=()=>new Promise(done=>{finish=done;});const request=view.refreshStatus(),previous=view.business;app.$destroy();app=null;finish({status:200,data:{name:'Respuesta tardía'}});await request;assert.equal(view.business,previous,'Destroyed views ignore late responses');
  assert.deepEqual(errors,[]);
 }finally{if(app)app.$destroy();w.close();}
 process.stdout.write('PASS tenant restricted: real Vue2/Vuetify, reason-specific copy, admin/staff routes, readonly access, D2/legacy state, refresh loading/deduplication, failures and teardown; no polling or payment calls.\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
