const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const compiler=require('vue-template-compiler'),parser=require('@babel/parser');
const Vue=require('vue'),Vuex=require('vuex');Vue.use(Vuex);
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const imported=file=>import('data:text/javascript;base64,'+Buffer.from(read(file)).toString('base64'));
(async()=>{
 const bindings={...await imported('src/security/authorizationContext.js'),...await imported('src/security/settingsAccess.js'),...await imported('src/domain/onboarding/context.js')};
 const store=new Vuex.Store({state:{CORE:{AUTH:{authenticated:true,user:{id_login:'actor-1',id_session:'session-1',id_business:'clinic-1'},business:{id_business:'clinic-1'},role:'admin',permissions:['admin.config','admin.users','px.dates'],accessRevision:1,token:'synthetic-token'},ONBOARDING:{guide:'not_started'}}},getters:{'CORE/AUTH/getAccessRevision':state=>state.CORE.AUTH.accessRevision},mutations:{hydrate(state,payload){Object.assign(state.CORE.AUTH,payload);}}});
 function load(file){
  const sfc=compiler.parseComponent(read(file));
  const script=sfc.script.content,context={component:null,moduleTypes:{AUTH:'CORE/AUTH'},...bindings,mapActions:()=>({}),mapGetters:(_namespace,mapping)=>Object.fromEntries(Object.keys(mapping).map(local=>[local,function(){
   const auth=this.$store.state.CORE.AUTH;
   if(local==='hasPermission')return code=>auth.permissions.includes(code);
   if(['user','authUser'].includes(local))return auth.user;
   if(['business','authBusiness'].includes(local))return auth.business;
   return auth[local];
  }]))};
  for(const node of parser.parse(script,{sourceType:'module'}).program.body.filter(n=>n.type==='ImportDeclaration'))for(const item of node.specifiers)if(!(item.local.name in context))context[item.local.name]={};
  vm.runInNewContext(script.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm,'').replace('export default','component ='),context,{filename:file});
  return context.component;
 }
 const definitions=[
  ['src/views/configuration/components/PlanBilling.vue','authContext'],
  ['src/views/configuration/components/AccountLegalDocuments.vue','sessionKey'],
  ['src/views/configuration/components/PreparationChecklist.vue','sessionKey'],
  ['src/views/configuration/components/ProfessionalAgendaConfig.vue','editorContextKey'],
  ['src/views/User/components/DAProfessionalProfile.vue','profileSessionKey'],
  ['src/views/configuration/components/PrivateClinicLogo.vue','accessContext']
 ];
 const probes=definitions.map(([file,key])=>{
  const options=load(file),events=[];
  const view=new Vue({store,computed:options.computed,watch:{[key](){events.push(view[key]);}}});
  return {file,key,view,events};
 });
 const coordinatorOptions=load('src/views/configuration/components/OnboardingCoordinator.vue');
 let coordinatorDispatches=0;
 const coordinatorStore={state:store.state,dispatch:async()=>{coordinatorDispatches++;}};
 const coordinator=new Vue({...coordinatorOptions,store:coordinatorStore,mounted(){},beforeDestroy(){},beforeCreate(){this.$route={query:{},path:'/admin'};},render:h=>h('div')});
 const app=load('src/App.vue');
 const appView=new Vue({store,computed:app.computed,beforeCreate(){this.$route={name:'admin',meta:{layout:'admin'}};}});
 const initialViewKey=appView.routeViewKey;
 const settle=async()=>{await Vue.nextTick();await new Promise(resolve=>setImmediate(resolve));};
 await settle();assert.equal(coordinatorDispatches,1);
 for(let iteration=0;iteration<3;iteration++){
  const auth=store.state.CORE.AUTH;
  store.commit('hydrate',{user:{...auth.user,name:'Nombre actualizado'},business:{...auth.business,name:'Consultorio actualizado'},permissions:[...auth.permissions].reverse()});
  probes.forEach(probe=>probe.view.$forceUpdate());coordinator.$forceUpdate();await settle();
 }
 for(const probe of probes)assert.equal(probe.events.length,0,probe.file+' must ignore equivalent session hydration and UI renders');
 assert.equal(appView.routeViewKey,initialViewKey,'Equivalent session responses must not remount any settings section');
 assert.equal(coordinatorDispatches,1,'The coordinator must not redispatch equivalent session objects');
 store.commit('hydrate',{accessRevision:2});await settle();
 for(const probe of probes)assert.equal(probe.events.length,1,probe.file+' still reacts to a real authorization revision');
 assert.equal(coordinatorDispatches,2);assert.notEqual(appView.routeViewKey,initialViewKey);
 store.commit('hydrate',{user:{...store.state.CORE.AUTH.user,id_login:'actor-2'},business:{id_business:'clinic-2'}});await settle();
 for(const probe of probes)assert.equal(probe.events.length,2,probe.file+' still isolates changes of actor and clinic');
 assert.equal(coordinatorDispatches,3);
 // The remaining sections load on entry or explicit local actions, not on session objects.
 for(const file of ['src/views/configuration/index.vue','src/views/configuration/components/RolesPermissionsConfig.vue','src/views/configuration/components/PrescriptionConfig.vue','src/views/configuration/components/ClinicalHistoryTemplateConfig.vue','src/views/configuration/components/ChangePassword.vue','src/views/configuration/components/OdontogramModeSettings.vue','src/views/User/DAUser.vue']){
  const options=load(file);
  assert.ok(Object.keys(options.watch||{}).every(key=>!['authUser','authBusiness','user','business','authContext','context'].includes(key)),file+' must not watch session objects for reloads');
 }
 probes.forEach(probe=>probe.view.$destroy());coordinator.$destroy();appView.$destroy();
 console.log('PASS settings session stability: six real access keys and App view identity stay stable across equivalent hydration/renders; coordinator dispatches once; real revision, actor and clinic changes still propagate. No network or credentials.');
})().catch(error=>{console.error(error);process.exitCode=1;});
