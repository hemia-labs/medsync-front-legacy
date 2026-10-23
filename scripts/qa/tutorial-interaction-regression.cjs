/* Mounted Vue 2 regressions. No HTTP, browser automation or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><button id="field">Guardar</button><div id="app"></div></body></html>', { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
global.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
const Vue = require('vue');
const compiler = require('vue-template-compiler');
const errors = [];
Vue.config.errorHandler = error => errors.push(error);
Vue.config.productionTip = false;
Vue.config.devtools = false;
const source = fs.readFileSync(path.join(__dirname, '../../src/views/configuration/components/GuideSpotlight.vue'), 'utf8');
const sfc = compiler.parseComponent(source);
assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
const sandbox = { component: null, document, window, requestAnimationFrame, cancelAnimationFrame, MutationObserver: dom.window.MutationObserver };
vm.runInNewContext(sfc.script.content.replace('export default', 'component ='), sandbox);
const Spotlight = { ...sandbox.component, ...compiler.compileToFunctions(sfc.template.content) };
const root = path.join(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const loadComponent = (file, bindings) => {
  const parsed = compiler.parseComponent(read(file));
  assert.deepEqual(compiler.compile(parsed.template.content).errors, [], file);
  const context = { component: null, ...bindings };
  vm.runInNewContext(parsed.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
  return { ...context.component, ...compiler.compileToFunctions(parsed.template.content) };
};
const settle = async () => { for (let i=0;i<8;i++) await Vue.nextTick(); };
(async () => {
  const branches = await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/onboarding/preparationGuide.js')).toString('base64')}`);
  const journeyDomain={...branches};vm.runInNewContext(read('src/domain/onboarding/preparationJourney.js').replace(/^import[^\n]+\n/,'').replaceAll('export function ','function '),journeyDomain);
  const Journey=loadComponent('src/views/configuration/components/PreparationJourney.vue',journeyDomain);
  Vue.component('router-link',{render:h=>h('a')});
  const {focusControl}=await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/onboarding/focusControl.js')).toString('base64')}`);
  const minimal = branches.preparationDefinition('doctor-identity', {goal:'agenda'});
  assert.deepEqual(minimal.steps.map(step=>step[0]), ['identity','save'], 'Scheduling needs name and Save, not signature');
  assert.deepEqual(branches.preparationDefinition('users',{goal:'authorizations',stage:'edit'}).steps.map(step=>step[0]), ['issuer','signer','save']);
  assert.match(branches.preparationDefinition('documents',{stage:'edit',actionLabel:'Crear plantilla'}).steps.at(-1)[2], /Pulsa Crear plantilla/);
  assert.match(branches.preparationPath({id:'consent',action:{path:'/admin?section=documents'}}), /goal=consent/);
  assert.match(branches.preparationPath({id:'authorizations',action:{path:'/admin?section=users'}}), /goal=authorizations/);
  assert.deepEqual(branches.preparationDefinition('users',{stage:'create'}).steps.map(step=>step[0]),['users','phone','email','access','password','save']);
  assert.equal(branches.preparationDefinition('users',{stage:'edit'}).steps.some(step=>step[0]==='password'),false,'Editing contact never asks to set a password');
  for(const stage of ['create','edit']){
    const file=stage==='create'?'src/views/User/DAAddUser.vue':'src/views/User/DAEditUser.vue';
    const parsed=compiler.parseComponent(read(file));
    const method=parsed.script.content.match(/focusGuideControl\(id, reveal\)\{([^\n]+)\},/)[1];
    const refs={name:{},phone:{},email:{},id_rol:{},password:{},guideSave:{}};
    let focused;
    const run=new Function('id','reveal','focusControl',method);
    for(const [step,ref] of Object.entries({users:'name',phone:'phone',email:'email',access:'id_rol',...(stage==='create'?{password:'password'}:{}),save:'guideSave'})){
      run.call({$refs:refs},step,undefined,value=>{focused=value;});
      assert.equal(focused,refs[ref],`${stage}: ${step} points at its field, not Save`);
    }
  }
  const target = document.getElementById('field');
  target.getBoundingClientRect=()=>({left:40,top:100,right:190,bottom:144,width:150,height:44});
  const parent = new Vue({
    data: () => ({ step: 0, visible: true, busy: false }),
    render(h) { return h('main', [this.visible ? h(Spotlight, { key: this.step, props: { target, title: `Paso ${this.step}`, text: 'Explicación vigente', progress: '1 de 2', busy: this.busy } }) : null, h('p', `Estado ${this.step}`)]); }
  }).$mount('#app');
  await Vue.nextTick();
  parent.step = 1;
  await Vue.nextTick();
  assert.deepEqual(errors.map(error => error.message), [], 'Changing a keyed step must not invalidate the parent DOM');
  assert.equal(document.querySelectorAll('.guide-spotlight').length, 1, 'Only the current help remains');
  assert.equal(document.querySelector('.guide-spotlight h3').textContent, 'Paso 1');
  parent.visible = false;
  await Vue.nextTick();
  assert.equal(document.querySelectorAll('.guide-spotlight').length, 0);
  assert.equal(target.hasAttribute('aria-describedby'), false);
  assert.equal(target.classList.contains('hemia-guide-target'), false);
  parent.$destroy();

  const adjacent=document.createElement('button');adjacent.textContent='Editar';document.body.appendChild(adjacent);
  adjacent.getBoundingClientRect=()=>({left:40,right:190,top:170,bottom:214,width:150,height:44});
  const collision=new Vue({render:h=>h(Spotlight,{props:{target,title:'Revisa el directorio',text:'Pulsa Editar'}})}).$mount();
  await settle();const collisionGuide=collision.$children[0];
  Object.defineProperty(collisionGuide.card,'offsetHeight',{value:150,configurable:true});collisionGuide.positionHint();await settle();
  assert.equal(collisionGuide.card.style.position,'relative','Desktop help reserves space instead of covering the next action');
  collision.$destroy();adjacent.remove();await settle();

  // Real Vue props/watchers: no assumptions about the order of nextTick callbacks.
  const mount = document.createElement('div'); document.body.appendChild(mount);
  const store = new Map();
  let preparationSteps=[{id:'profile',detail:'Perfil pendiente'}];
  const guide = loadComponent('src/views/configuration/components/PreparationGuide.vue', {
    ...branches, GuideSpotlight:Spotlight,PreparationJourney:Journey,journeyRequirement:journeyDomain.journeyRequirement, mapGetters:()=>({}), moduleTypes:{AUTH:{}}, fnTypes:{},
    guideContext:()=>({key:'test:clinic',business:'test',user:'actor'}), getSettingsSections:()=>[{key:'agenda'}],
    ONBOARDING:'test/', DABusinessService:{getPreparation:async()=>({success:true,data:{steps:preparationSteps}})},
    localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}
  });
  Vue.prototype.$route={query:{guide:'1'}};
  Vue.prototype.$store={state:{CORE:{AUTH:{}}}};
  const harness = new Vue({
    data:()=>({branch:'doctor-identity',stage:'',open:false,ink:false,busy:false}),
    render(h){return h(guide,{ref:'guide',props:{branch:this.branch,stage:this.stage,signatureOpen:this.open,signatureHasInk:this.ink,busy:this.busy},on:{'focus-control':(_id,reveal)=>focusControl(target,reveal),'skip-signature':()=>{this.open=false;this.ink=false;}}});}
  }).$mount(mount);
  await settle();
  const current = harness.$refs.guide;
  current.goTo('signature-capture'); await settle();
  harness.open=true;await settle();
  assert.equal(current.step[0],'signature-capture','Opening an empty pad must stay on Draw');
  assert.match(current.step[1], /Dibuja/);
  assert.equal(current.waitingForSignature,true);
  harness.ink=true;await settle();
  assert.equal(current.step[0],'signature-capture','A first stroke does not interrupt a multi-stroke signature');
  assert.equal(current.waitingForSignature,false);
  assert.equal(current.nextLabel,'Siguiente: Aplicar');
  current.advance();await settle();
  assert.equal(current.step[0],'signature-apply','The user decides when to locate Apply');
  current.advance();await settle();
  assert.equal(current.step[0],'signature-apply','Locating Apply does not skip to Save or apply a drawing');
  assert.equal(document.activeElement,target);
  assert.equal(current.target,null,'Handoff removes the card and leaves the actual control focused');
  harness.ink=false;await settle();
  assert.equal(current.step[0],'signature-capture','Clearing the drawing returns to the drawing area');
  assert.equal(current.waitingForSignature,true);
  harness.ink=true;await settle();current.advance();await settle();
  current.move(-1);await settle();
  assert.match(current.step[1],/Dibuja/,'Previous with an open pad never says Open it');
  current.skipSignature();await settle();
  assert.equal(current.step[0],'save','Omit survives the pad closing watcher');
  assert.equal(harness.open,false);
  assert.equal(document.querySelector('.guide-spotlight h3').textContent,'Guarda tu perfil');
  assert.equal(current.nextLabel,'Ir a Guardar perfil');
  document.querySelector('.spotlight-primary').click();await settle();
  assert.equal(document.activeElement,target);
  assert.equal(document.querySelector('.guide-spotlight'),null,'The final CTA frees the Save button instead of returning to the heading');
  current.showField();await settle();
  harness.busy=true;await settle();
  assert.equal(document.querySelector('.guide-spotlight'),null,'A pending save removes help before confirmation');
  harness.busy=false;await settle();
  assert.equal(current.target,target);
  harness.branch='identity';await settle();
  current.start();harness.stage='edit';await settle();
  assert.equal(current.active,true,'Opening the real editor preserves an active tutorial');
  assert.equal(current.step[0],'identity');
  assert.match(current.step[1], /Escribe el nombre/);
  current.goTo('phone');await settle();
  assert.equal(current.step[0],'phone');
  current.pause('paused');current.restore();await settle();
  assert.equal(current.active,false,'guide=1 cannot override an explicit pause after reload');
  assert.equal(current.step[0],'phone','Reload preserves the exact editor step');
  current.start();await settle();
  assert.equal(current.step[0],'phone','Resume keeps the paused step');
  harness.stage='';await settle();
  assert.match(current.step[2], /Editar datos/,'Cancel returns to the read-only action');
  preparationSteps=[{id:'identity',ready:true,detail:'Contacto guardado'},{id:'agenda',ready:false,title:'Agenda',action:{path:'/admin?section=agenda'}}];
  await current.verify();await settle();
  assert.equal(current.completed,true,'A server-confirmed completed branch stops asking for Edit');
  assert.equal(current.nextPending.id,'agenda','The primary continuation is an allowed pending task');
  assert.equal(document.querySelector('.guide-spotlight'),null,'Completed tasks no longer point at Edit');
  harness.$destroy();await settle();
  assert.equal(document.querySelector('.guide-spotlight'),null);

  // A narrow viewport places help in document flow, after the actual target.
  Object.defineProperty(window,'innerWidth',{value:390,configurable:true});
  const narrow = new Vue({render:h=>h(Spotlight,{props:{target,title:'Ayuda móvil',text:'Texto de prueba'}})}).$mount();
  // $mount without a host has no original parent, just as a newly inserted child.
  await settle();
  const narrowCard=narrow.$children[0].card;
  assert.equal(narrowCard.style.position,'relative');
  assert.equal(target.nextElementSibling,narrowCard);
  const overlay=document.createElement('div');overlay.className='swal2-container';overlay.getBoundingClientRect=()=>({width:300});document.body.appendChild(overlay);
  narrow.$children[0].positionHint();await settle();
  assert.equal(narrowCard.style.visibility,'hidden','External confirmation has priority over help');
  overlay.remove();narrow.$children[0].positionHint();await settle();
  assert.equal(narrowCard.style.visibility,'visible');
  Object.defineProperty(window,'innerWidth',{value:1440,configurable:true});
  narrow.$children[0].positionHint();await settle();
  assert.equal(narrowCard.parentElement,document.body,'Resizing back restores the desktop placement');
  Object.defineProperty(narrowCard,'offsetHeight',{get:()=>900,configurable:true});
  narrow.$children[0].positionHint();await settle();
  assert.equal(narrowCard.style.position,'relative','A card that cannot fit above or below reserves space instead of covering its target');
  Object.defineProperty(narrowCard,'offsetHeight',{get:()=>120,configurable:true});
  narrow.$children[0].positionHint();await settle();
  assert.equal(narrowCard.style.position,'relative','A shorter reflow must not cause repeated floating/inline jumps');
  narrow.$destroy();

  const agendaDomain=await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/onboarding/agendaGuide.js')).toString('base64')}`);
  const agendaComponent=loadComponent('src/views/configuration/components/OnboardingGuide.vue',{
    ...agendaDomain,...branches,GuideSpotlight:Spotlight,PreparationJourney:{render:h=>h('div')},journeyRequirement:()=>'',mapGetters:()=>({role:()=> 'doctor',hasPermission:()=>()=>true}),moduleTypes:{AUTH:{}},fnTypes:{},ONBOARDING:'test/',getSettingsSections:()=>[]
  });
  const agendaState=Vue.observable({subject:'qa-doctor',step:'activation',guide:'active',status:{steps:[]}});
  let agendaMoves=0;
  Vue.prototype.$store={state:{CORE:{AUTH:{},ONBOARDING:agendaState}},dispatch:async(name)=>{if(name==='test/move'){agendaMoves++;agendaState.step='save';}}};
  const agendaHost=new Vue({render:h=>h(agendaComponent,{ref:'guide',props:{editor:{loaded:true,subject:'qa-doctor'}},on:{'focus-target':(_id,reveal)=>focusControl(target,reveal)}})}).$mount();
  document.body.appendChild(agendaHost.$el);await settle();
  const agendaGuide=agendaHost.$refs.guide;
  assert.equal(agendaGuide.nextLabel,'Siguiente: Guardar cambios');
  await agendaGuide.advance();await settle();
  assert.equal(agendaGuide.nextLabel,'Ir a Guardar cambios');
  const movesBeforeHandoff=agendaMoves;
  agendaGuide.advance();await settle();
  assert.equal(document.activeElement,target);
  assert.equal(agendaMoves,movesBeforeHandoff,'Agenda Save handoff must not advance to verified without the user saving');
  assert.equal(agendaGuide.target,null);
  agendaHost.$destroy();await settle();

  // The profile must update its actual rendered status after the first save.
  // A service-method assertion alone cannot catch a stale Vue render.
  const shell=document.createElement('div');document.body.appendChild(shell);
  const savedProfile={id_doctor_professional_profile:'qa-profile',professional_name:'Profesional de prueba',is_active:1,can_issue_prescriptions:0,can_sign_documents:0};
  let saveResponse={success:true,data:savedProfile},readResponse={success:true,data:null},saveCalls=0;
  const field={props:['value','label','disabled'],render(h){return h('label',[this.label,h('input',{domProps:{value:this.value},attrs:{disabled:this.disabled},on:{input:event=>this.$emit('input',event.target.value)}})]);}};
  const button={props:['label','disabled'],render(h){return h('button',{attrs:{disabled:this.disabled}},this.label);}};
  const profileComponent=loadComponent('src/views/User/components/DAProfessionalProfile.vue',{
    PreparationGuide:guide,focusControl,mapGetters:()=>({role:()=> 'doctor',hasPermission:()=>()=>false}),moduleTypes:{AUTH:{}},fnTypes:{},
    getSettingsSections:()=>[],buildLicenseLimitMessage:(_response,fallback)=>fallback,confirmSettingsDiscard:async()=>false,registerSettingsNavigationGuard:()=>()=>{},
    DAUserService:{getProfessionalProfile:async()=>readResponse,saveProfessionalProfile:async()=>{saveCalls++;return saveResponse;}}
  });
  profileComponent.components={...profileComponent.components,'v-text-field':field,'v-checkbox':field,'da-button-primary':button,'da-button-secondary':button,'router-link':{render:h=>h('a')}};
  Vue.prototype.$route={query:{guide:'1',goal:'agenda'}};
  Object.defineProperty(window,'innerWidth',{value:390,configurable:true});
  const profileHost=new Vue({render:h=>h(profileComponent,{ref:'profile',props:{idLogin:'qa-actor'}})}).$mount(shell);
  await settle();
  const profile=profileHost.$refs.profile;
  assert.match(profileHost.$el.textContent,/Perfil sin crear/);
  profile.form.professional_name='Profesional de prueba';await settle();
  assert.equal(profile.$refs.profileGuide.nextLabel,'Siguiente: Guardar perfil');
  profile.$refs.profileGuide.advance();await settle();
  assert.deepEqual(errors.map(error=>error.message),[],'The real mobile profile must replace a keyed hint without invalidating Vue siblings');
  assert.equal(document.querySelector('.guide-spotlight h3').textContent,'Guarda tu nombre y continúa');
  preparationSteps=[{id:'agenda',title:'Tu agenda de atención',action:{path:'/admin?section=agenda'}}];
  await profile.save();await settle();
  assert.equal(profile.hasProfile,true);
  assert.match(profileHost.$el.textContent,/Perfil activo:/,'First save is reflected in the visible profile');
  assert.doesNotMatch(profileHost.$el.textContent,/Perfil sin crear/);
  assert.equal(profile.hasUnsavedChanges,false);
  assert.equal(profile.$refs.profileGuide.profileSaved,true);
  assert.equal(profile.$refs.profileGuide.readyForAgenda,true);
  assert.equal(profile.$refs.profileGuide.target,null,'Saved state does not bring back a stale Save instruction');
  assert.match(profileHost.$el.textContent,/Perfil guardado/);
  assert.equal(profileHost.$el.querySelector('.tutorial-progress'),null,'Confirmed saving replaces the explanation counter, even when saved from an earlier step');
  assert.equal(profileHost.$el.querySelector('.journey-primary').textContent,'Continuar: Tu agenda de atención');
  profile.form.professional_name='Otra captura';saveResponse={success:false,status:422,message:'Revisa el nombre'};
  await profile.save();await settle();
  assert.equal(profile.$refs.profileGuide.profileSaved,false,'Validation failure cannot announce successful saving');
  assert.equal(profile.form.professional_name,'Otra captura');
  saveResponse={success:false,status:503};
  await profile.save();await settle();
  assert.equal(profile.saveButtonLabel,'Comprobar guardado');
  assert.equal(profile.guideSaveState,'uncertain');
  profile.$refs.profileGuide.goTo('save');await settle();
  assert.equal(profile.$refs.profileGuide.nextLabel,'Ir a Comprobar guardado');
  assert.match(profile.$refs.profileGuide.stepText,/sin reenviar/);
  const callsBeforeCheck=saveCalls;
  readResponse={success:true,data:{...profile.form,id_doctor_professional_profile:'qa-profile'}};
  await profile.save();await settle();
  assert.equal(saveCalls,callsBeforeCheck,'Checking an uncertain save must not send a second write');
  assert.equal(profile.uncertainProfile,null);
  assert.equal(profile.$refs.profileGuide.readyForAgenda,true);
  profileHost.$destroy();
  assert.deepEqual(errors.map(error=>error.message),[]);
  dom.window.close();
  console.log('PASS: Vue2 final-action labels and focus handoff (profile/agenda), complete staff fields, multi-stroke/cleared/omitted signature, save/error/uncertain/confirmed transitions without duplicate write, mobile document flow/overlay priority and oversized-card fallback. DOM simulation with controlled geometry; no account creation or visual browser acceptance.');
})().catch(error => { console.error(error); process.exitCode = 1; dom.window.close(); });
