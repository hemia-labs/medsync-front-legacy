// Production NC1 excludes the billing module; exercise the five existing consumers.
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
 const settle=async()=>{await Vue.nextTick();await new Promise(resolve=>setImmediate(resolve));};
 await settle();
 for(let iteration=0;iteration<3;iteration++){
  const auth=store.state.CORE.AUTH;
  store.commit('hydrate',{user:{...auth.user,name:'Nombre actualizado'},business:{...auth.business,name:'Consultorio actualizado'},permissions:[...auth.permissions].reverse()});
  probes.forEach(probe=>probe.view.$forceUpdate());await settle();
 }
 for(const probe of probes)assert.equal(probe.events.length,0,probe.file+' must ignore equivalent session hydration and UI renders');
 store.commit('hydrate',{accessRevision:2});await settle();
 for(const probe of probes)assert.equal(probe.events.length,1,probe.file+' still reacts to a real authorization revision');
 store.commit('hydrate',{user:{...store.state.CORE.AUTH.user,id_login:'actor-2'},business:{id_business:'clinic-2'}});await settle();
 for(const probe of probes)assert.equal(probe.events.length,2,probe.file+' still isolates changes of actor and clinic');
 console.log('PASS production NC1: five existing session consumers ignore equivalent hydration and react to actor, clinic and authorization changes.');
 probes.forEach(probe=>probe.view.$destroy());
})().catch(error=>{console.error(error);process.exitCode=1;});
