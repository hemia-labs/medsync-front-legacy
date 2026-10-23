// Readiness/continuation regressions using real Vue templates and service doubles.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;
const Vue=require('vue'),compiler=require('vue-template-compiler');
Vue.config.productionTip=false;Vue.config.devtools=false;
const errors=[];Vue.config.errorHandler=error=>errors.push(error);
Vue.component('router-link',{props:['to'],render(h){return h('a',{attrs:{href:this.to}},this.$slots.default);}});
const read=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8');
function component(file,bindings){const sfc=compiler.parseComponent(read(file));assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);const scope={...bindings,component:null};vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','component ='),scope);return {...scope.component,...compiler.compileToFunctions(sfc.template.content)};}
const settle=async()=>{for(let i=0;i<12;i++)await Vue.nextTick();};
(async()=>{
 const branches=await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/onboarding/preparationGuide.js')).toString('base64')}`);
 const domain={...branches};vm.runInNewContext(read('src/domain/onboarding/preparationJourney.js').replace(/^import[^\n]+\n/,'').replaceAll('export function ','function '),domain);
 const {preparationJourney,journeyRequirement}=domain;
 const titles={identity:'Datos del consultorio',profile:'Tu perfil profesional',authorizations:'Autorizaciones profesionales',agenda:'Tu agenda de atención',consent:'Consentimiento de datos personales sensibles',prescriptions:'Formato de tus recetas'};
 const sectionMap={identity:'identity',profile:'doctor-identity',authorizations:'users',agenda:'agenda',consent:'documents',prescriptions:'prescriptions'};
 const sections=Object.values(sectionMap).map(key=>({key}));
 const status={steps:Object.keys(titles).map(id=>({id,title:titles[id],ready:['identity','profile'].includes(id),detail:`Detalle ${id}`,action:{path:`/admin?section=${sectionMap[id]}`}}))};
 let result=preparationJourney(status,sections,'profile');
 assert.equal(result.completed.length,2);assert.equal(result.pending.length,4);assert.equal(result.suggested.id,'authorizations');assert.match(result.suggested.path,/goal=authorizations/);
 assert.match(result.reason,/no se activan al guardar/);assert.match(result.remaining.find(s=>s.id==='consent').path,/goal=consent/);
 assert.equal(preparationJourney(status,sections,'consent').suggested.id,'consent','Opening an unfinished task keeps it current');
 const minimal={steps:status.steps.map(s=>s.id==='profile'?{...s,ready:false}:s)};
 assert.equal(preparationJourney(minimal,sections,'profile','agenda').suggested.id,'agenda','Scheduling continuation does not force a license or signature');
 const all={steps:status.steps.map(s=>({...s,ready:true}))};
 assert.equal(preparationJourney(all,sections,'profile').suggested,null);
 const blocked={steps:[{...status.steps[4],action:null,help:'Solicita apoyo al administrador.'}]};
 assert.equal(preparationJourney(blocked,sections).blocked.length,1);
 assert.equal(preparationJourney(status,[]).suggested,null,'Disallowed sections do not produce links');
 assert.equal(journeyRequirement('users',''),'','Adding staff is optional, not authorizations');
 assert.equal(journeyRequirement('clinical-history-template'),'','The initial clinical template is optional');
 const Journey=component('src/views/configuration/components/PreparationJourney.vue',{preparationJourney});
 const journey=new Vue({...Journey,propsData:{status,sections,currentId:'profile'}}).$mount();document.body.appendChild(journey.$el);
 assert.match(journey.$el.textContent,/2 de 6 completos/);assert.match(journey.$el.textContent,/Ya completaste: Datos del consultorio · Tu perfil profesional/);
 assert.equal(journey.$el.querySelector('.journey-recommendation button').textContent,'Continuar: Autorizaciones profesionales');
 let opened;journey.$on('open',step=>opened=step);journey.$el.querySelector('.journey-recommendation button').click();assert.equal(opened.id,'authorizations');
 journey.status=all;await settle();assert.match(journey.$el.textContent,/preparación inicial está completa/);assert.equal(journey.$el.querySelector('.journey-recommendation'),null);
 journey.status=blocked;await settle();assert.match(journey.$el.textContent,/Pendiente del administrador/);assert.match(journey.$el.textContent,/Cuenta y legal no sustituye/);assert.ok(journey.$el.querySelector('a[href="/inicio"]'));journey.$destroy();

 let response={success:true,data:status},reject=false,scoped=null;const paths=[],dispatches=[],storage=new Map();
 const Guide=component('src/views/configuration/components/PreparationGuide.vue',{
  ...branches,journeyRequirement,PreparationJourney:Journey,GuideSpotlight:{render:h=>h('span')},mapGetters:()=>({role:()=> 'admin',hasPermission:()=>()=>true}),moduleTypes:{AUTH:{}},fnTypes:{},
  guideContext:()=>({key:'test:actor',user:'actor',business:'test'}),getSettingsSections:()=>sections,ONBOARDING:'test/',
  DABusinessService:{getPreparation:async()=>{if(reject)throw Error('offline');return response;}},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}
 });
 Vue.prototype.$route={path:'/admin',query:{guide:'1'}};
 Vue.prototype.$store={state:{CORE:{AUTH:{}}},dispatch:async(name,value)=>dispatches.push({name,value})};
 let cancel=false;Vue.prototype.$router={push:async value=>{if(cancel)throw Error('cancelled');paths.push(value);}};
 const harness=new Vue({data:()=>({branch:'doctor-identity',stage:'',dirty:false,busy:false,personalScope:true}),render(h){return h(Guide,{ref:'guide',props:{branch:this.branch,stage:this.stage,dirty:this.dirty,busy:this.busy,personalScope:this.personalScope,verifyEditor:async()=>scoped}});}}).$mount();document.body.appendChild(harness.$el);await settle();
 const guide=harness.$refs.guide;assert.equal(guide.completed,true);assert.equal(guide.target,null,'Completed review never opens an input spotlight');assert.ok(guide.$el.querySelector('.preparation-journey'));
 guide.$el.querySelector('.journey-recommendation button').click();await settle();assert.match(paths.pop(),/section=users&guide=1&resume=1&goal=authorizations/);
 harness.dirty=true;await settle();assert.equal(guide.$el.querySelector('.preparation-journey'),null,'Unsaved drafts must not claim completion');
 harness.dirty=false;reject=true;await guide.verify();await settle();assert.equal(guide.preparationStatus,null);assert.equal(guide.$el.querySelector('.preparation-journey'),null,'Read failure cannot show stale recommendations');
 reject=false;await guide.verify();await settle();
 cancel=true;await guide.continuePending(status.steps[3]);assert.equal(dispatches.length,0,'A cancelled editor guard cannot advance another tutorial');cancel=false;
 await guide.continuePending(status.steps[3]);assert.equal(dispatches.at(-1).name,'test/begin');assert.equal(dispatches.at(-1).value.resume,true);
 harness.branch='users';harness.stage='edit';harness.personalScope=false;scoped={ready:true,detail:'Otro profesional revisado'};await settle();
 assert.equal(guide.completed,true);assert.equal(guide.journeyCurrent,'');assert.match(guide.$el.textContent,/resumen corresponde a tu cuenta/);assert.match(guide.$el.textContent,/2 de 6 completos/,'Another doctor does not complete the signed-in actor');
 response={success:true,data:{...status,clinicalHistory:{state:'available',source:'SYSTEM',version:1}}};scoped=null;harness.branch='clinical-history-template';harness.stage='';await settle();assert.equal(guide.completed,true,'An available initial template is not an endless pending task');
 guide.pause('paused');await settle();assert.equal(guide.active,false);await guide.start();await settle();assert.equal(guide.completed,true);
 harness.$destroy();
 const agendaDomain=await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/onboarding/agendaGuide.js')).toString('base64')}`);
 const Agenda=component('src/views/configuration/components/OnboardingGuide.vue',{...agendaDomain,...branches,PreparationJourney:Journey,GuideSpotlight:{render:h=>h('span')},mapGetters:()=>({role:()=> 'admin',hasPermission:()=>()=>true}),moduleTypes:{AUTH:{}},fnTypes:{},ONBOARDING:'test/',getSettingsSections:()=>sections});
 Vue.prototype.$store={state:Vue.observable({CORE:{ONBOARDING:{guide:'active',step:'verify',subject:'own-profile',error:'',status:{...status,agenda:{subjectIsOwn:true,requirements:{profile:true,hours:false},configurationState:'absent'}}}}}),dispatch:async(name,value)=>dispatches.push({name,value})};
 const agenda=new Vue({...Agenda,propsData:{editor:{loaded:true,dirty:false,saving:false}}}).$mount();document.body.appendChild(agenda.$el);
 assert.equal(agenda.$el.querySelector('.journey-primary').textContent,'Revisar Horarios semanales','An unsaved agenda provides a real action at verification');
 agenda.$el.querySelector('.journey-primary').click();await settle();assert.equal(dispatches.at(-1).name,'test/move');assert.equal(dispatches.at(-1).value,-4);
 agenda.state.status.agenda.subjectIsOwn=false;await settle();assert.equal(agenda.$el.querySelector('.preparation-journey'),null,'Another agenda does not render the personal completion counter');
 agenda.$destroy();assert.deepEqual(errors.map(e=>e.message),[]);
 console.log('PASS journey: 2/6 review, explicit next action, current task, dependency goals, permission blocks, all complete, optional tasks, dirty/error state, navigation cancellation, scoped doctor, template availability and review resume (Vue + doubles).');
})().catch(error=>{console.error(error);process.exitCode=1;});
