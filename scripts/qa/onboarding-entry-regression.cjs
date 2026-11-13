// Real Vue 2 + Router 3, persisted visual metadata, service doubles; no browser/DB.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;
window.scrollTo=()=>{};
const Vue=require('vue'),Router=require('vue-router'),compiler=require('vue-template-compiler');
Vue.use(Router);Vue.config.productionTip=false;Vue.config.devtools=false;
const errors=[];Vue.config.errorHandler=e=>errors.push(e);
const read=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8');
const imported=file=>import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
function component(file,bindings={}){const sfc=compiler.parseComponent(read(file)),context={...bindings,component:null};assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','component ='),context);return {...context.component,...compiler.compileToFunctions(sfc.template.content)};}
const settle=async()=>{for(let n=0;n<20;n++)await Vue.nextTick();};
(async()=>{
 const branches=await imported('src/domain/onboarding/preparationGuide.js');
 const navigation=await imported('src/domain/settings/settings.navigation.js');
 const sections=['identity','doctor-identity','users','agenda','documents','prescriptions'].map(key=>({key,title:key}));
 const status={completed:0,pending:6,steps:['identity','profile','authorizations','agenda','consent','prescriptions'].map((id,i)=>({id,title:id,ready:false,detail:'Pendiente',action:{path:'/admin?section='+sections[i].key}}))};
 const storage=window.localStorage,context={key:'business:actor',business:'business',user:'actor'};
 let reads=0,delay=null,allComplete=false;
 const common={...branches,localStorage:storage,window,mapGetters:()=>({user:()=>({id_login:'actor',id_business:'business'}),role:()=> 'admin',hasPermission:()=>()=>true}),moduleTypes:{AUTH:{}},fnTypes:{},guideContext:()=>context,getSettingsSections:()=>sections,ONBOARDING:'test/',DABusinessService:{getPreparation:async()=>{reads++;if(delay)await delay;return {success:true,data:allComplete?{...status,completed:6,pending:0,steps:status.steps.map(s=>({...s,ready:true}))}:status};}}};
 const Guide=component('src/views/configuration/components/PreparationGuide.vue',{...common,GuideSpotlight:{render:h=>h('span')},PreparationJourney:{render:h=>h('span')},journeyRequirement:()=> 'profile'});
 const router=new Router({mode:'abstract',routes:[{path:'/admin'},{path:'/inicio'}]});
 Vue.prototype.$store={state:{CORE:{AUTH:{business:{id_business:'business'}}}},dispatch:async()=>{},commit:()=>{}};
 await router.push('/admin?section=doctor-identity');
 let focus=0;
 const host=new Vue({router,render(h){return h(Guide,{ref:'guide',props:{branch:'doctor-identity'},on:{'focus-control':()=>focus++}});}}).$mount();document.body.appendChild(host.$el);await settle();
 const guide=host.$refs.guide;
 assert.equal(guide.$el.nodeType,8,'Normal navigation renders no tutorial, even invitation');assert.equal(reads,0,'Normal settings does not start guide verification');
 await router.push(branches.preparationPath(status.steps[1]));await settle();
 assert.equal(guide.active,true);assert.ok(guide.$el.classList.contains('preparation-guide'));assert.equal(router.currentRoute.query.resume,undefined);
 guide.move(2);await settle();const key=guide.key,step=guide.index;assert.equal(step,2);
 await guide.pause('paused');await settle();
 assert.equal(router.currentRoute.query.guide,undefined);assert.equal(guide.$el.nodeType,8);assert.equal(JSON.parse(storage.getItem(key)).step,step);assert.equal(JSON.parse(storage.getItem(key)).state,'paused');
 const previousFocus=focus;
 await router.push('/admin?section=doctor-identity&returnTo=/px/dates');await settle();assert.equal(focus,previousFocus,'Normal navigation never moves focus to guide controls');
 await router.push(branches.preparationPath(status.steps[1]));await settle();assert.equal(guide.index,step,'Explicit resume restores exact step');
 const Admin=component('src/views/admin/index.vue',{...common,isTenantAdministrator:()=>true,AdminSettingsHeader:{},AdminSettingsSidebar:{}});
 const shell={$router:router,get $route(){return router.currentRoute;},activeSection:'doctor-identity',returnToAppointments:false,$nextTick:Vue.nextTick};
 await Admin.methods.goToSection.call(shell,'doctor-identity');await settle();assert.equal(guide.$el.nodeType,8,'Clicking current menu section closes help');assert.equal(JSON.parse(storage.getItem(key)).step,step);
 await router.push('/admin?section=agenda&doctor=selected-doctor&guide=1');await settle();
 await Admin.methods.goToSection.call({...shell,get $route(){return router.currentRoute;},activeSection:'agenda'},'agenda');await settle();
 assert.equal(router.currentRoute.query.doctor,'selected-doctor','Closing from current menu keeps selected doctor');assert.equal(router.currentRoute.query.guide,undefined);
 await router.push('/admin?section=doctor-identity');await settle();
 // Closing help is not leaving the editor: do not discard an unsaved form.
 let discarded=0,prompts=0;
 const cleanup=navigation.registerSettingsNavigationGuard({$router:router,$swal:{fire:async()=>{prompts++;return {isConfirmed:false};}}},{hasChanges:()=>true,onDiscard:()=>discarded++});
 await router.push(branches.preparationPath(status.steps[1]));await settle();await guide.pause('paused');await settle();assert.equal(prompts,0);assert.equal(discarded,0);
 await router.push(branches.preparationPath(status.steps[1]));await settle();
 await router.push('/admin?section=identity').catch(()=>{});await settle();assert.equal(prompts,1);assert.equal(guide.active,true,'Cancelled real editor navigation keeps the current guide');cleanup();
 // A late readiness response cannot reactivate hidden help or steal focus.
 let release;delay=new Promise(resolve=>release=resolve);const pending=guide.verify();await router.push('/admin?section=doctor-identity');await settle();const focusAtExit=focus;release();await pending;delay=null;await settle();assert.equal(guide.active,false);assert.equal(focus,focusAtExit);
 host.$destroy();
 // Reload in normal mode preserves persisted progress but never opens help.
 const reloaded=new Vue({router,render:h=>h(Guide,{ref:'guide',props:{branch:'doctor-identity'}})}).$mount();await settle();assert.equal(reloaded.$el.nodeType,8);assert.equal(reloaded.$refs.guide.index,step);
 allComplete=true;await router.push(branches.preparationPath(status.steps[1]));await settle();assert.equal(reloaded.$refs.guide.completed,true);await reloaded.$refs.guide.pause('paused');await settle();assert.equal(reloaded.$el.nodeType,8);reloaded.$destroy();
 const Checklist=component('src/views/configuration/components/PreparationChecklist.vue',{...common,resumableGuides:()=>[{key:'paused-agenda',title:'agenda',step:4,total:8,path:'/admin?section=agenda&guide=1&resume=1'}]});
 const checklist=new Vue({...Checklist,router,propsData:{showCompleted:true}}).$mount();await settle();
 assert.match(checklist.$el.textContent,/6 de 6 completos/);assert.equal(checklist.$el.querySelector('details').open,false,'Finished summary starts compact');
 const links=[...checklist.$el.querySelectorAll('ol a')];assert.equal(links.length,12);
 for(let i=0;i<links.length;i+=2){assert.equal(links[i].getAttribute('href').includes('guide='),false);assert.match(links[i+1].getAttribute('href'),/guide=1&resume=1/);}
 assert.match(checklist.$el.textContent,/Retomar agenda/);checklist.$destroy();
 const home=new Vue({...Checklist,router}).$mount();await settle();assert.equal(home.$el.nodeType,8,'An optional paused review cannot bring completed onboarding back to Home');home.$destroy();
 assert.equal(navigation.isGuideOnlyNavigation({path:'/admin',query:{section:'agenda',doctor:'other'}},{path:'/admin',query:{section:'agenda',doctor:'own',guide:'1'}}),false,'Doctor changes still require discard guard');
 assert.deepEqual(errors.map(e=>e.message),[]);
 console.log('PASS UX26: real router normal/explicit entry, exact-step resume/reload, same-menu exit, draft preservation, cancelled navigation, late responses, compact 6/6, separate review links and automatically hidden completed Home preparation. Services doubled.');
})().catch(error=>{console.error(error);process.exitCode=1;});
