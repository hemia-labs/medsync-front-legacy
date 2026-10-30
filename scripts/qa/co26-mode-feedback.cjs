const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {buildClient}=require('./odontogram-ui-preview.cjs');
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(String(error)));
 const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/qa',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
 let operatorsReady=false,writes=0,modeResponse={success:false,status:409,code:'CO26_OPERATORS_REQUIRED',message:'Missing operators'};
 try{
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.scrollTo=()=>{};w.confirm=()=>{throw Error('Native confirm must not be used');};
  w.__odontogramV2Fixture={capabilities:async()=>({success:true,data:{mode:'v1',schema_ready:true}}),aliases:async()=>({success:false}),preferences:async()=>({success:false}),activationCheck:async()=>({success:true,data:{ready:operatorsReady,capture_operators:operatorsReady?1:0,finalize_operators:operatorsReady?1:0,roles:[]}}),setMode:async()=>{writes++;return modeResponse;}};
  for(const file of [require.resolve('vue/dist/vue.js'),path.join(path.dirname(require.resolve('vuex')),'vuex.js'),require.resolve('vuetify/dist/vuetify.js')])w.eval(fs.readFileSync(file,'utf8'));
  w.eval(buildClient({includeEditors:true,extraModules:['src/views/configuration/components/OdontogramModeSettings.vue']}).script);
  const qa=w.__odontogramQA;qa.app.$destroy();w.document.body.innerHTML='<div id="settings"></div>';
  w.Vue.component('router-link',{props:['to'],render(h){return h('a',{attrs:{href:this.to}},this.$slots.default);}});
  const component=qa.require('src/views/configuration/components/OdontogramModeSettings.vue').default;
  const app=qa.app=new w.Vue({vuetify:new w.Vuetify(),render:h=>h('v-app',[h(component,{ref:'settings'})])}).$mount('#settings');
  const vm=app.$refs.settings;await new Promise(resolve=>setTimeout(resolve,30));await vm.refreshAdministration();
  vm.selected='v2';vm.save();await w.Vue.nextTick();assert.equal(vm.showModeConfirm,false);assert.equal(writes,0);assert.equal(vm.current,'v1');
  assert.match(w.document.querySelector('[role="alert"]').textContent,/Puestos y accesos/);assert.match(w.document.querySelector('[role="alert"]').textContent,/Capturar odontograma/);assert.ok(w.document.querySelector('a[href="/admin?section=roles-permissions"]'));
  operatorsReady=true;await vm.refreshAdministration();assert.equal(vm.operatorBlocked,false);vm.save();assert.equal(vm.showModeConfirm,true);vm.cancelMode();assert.equal(writes,0);
  vm.save();await vm.applyMode();await w.Vue.nextTick();assert.equal(writes,1);assert.equal(vm.operatorBlocked,true);assert.equal(vm.current,'v1');assert.equal(vm.messageType,'error');
  modeResponse={success:false,status:500,message:'Error de conexión'};await vm.refreshAdministration();vm.save();await vm.applyMode();assert.equal(vm.message,'Error de conexión');assert.equal(vm.messageType,'error');
  modeResponse={success:true,data:{mode:'v2'}};vm.save();await vm.applyMode();assert.equal(vm.current,'v2');assert.equal(vm.messageType,'success');assert.equal(vm.busy,false);assert.deepEqual(errors,[]);
  console.log('PASS settings feedback: preflight guide/no write, cancel, server 409 after changed permissions, visible 500, confirmed success; real Vue and synthetic API.');
 }finally{if(w.__odontogramQA)w.__odontogramQA.app.$destroy();w.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
