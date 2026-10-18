const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const browser = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://synthetic.invalid',pretendToBeVisual:true});
global.window=browser.window;global.document=browser.window.document;global.navigator=browser.window.navigator;
global.HTMLElement=browser.window.HTMLElement;global.Element=browser.window.Element;
global.Node=browser.window.Node;global.MutationObserver=browser.window.MutationObserver;
global.requestAnimationFrame=browser.window.requestAnimationFrame.bind(browser.window);
global.cancelAnimationFrame=browser.window.cancelAnimationFrame.bind(browser.window);
const Vue=require('vue');
const VueRouter=require('vue-router');
const Vuetify=require('vuetify');
const compiler=require('vue-template-compiler');
const {compileStyle}=require('@vue/component-compiler-utils');
const postcss=require('postcss');
const parser=require('@babel/parser');
Vue.use(VueRouter);Vue.use(Vuetify);Vue.config.productionTip=false;Vue.config.devtools=false;
Vue.config.errorHandler=error=>{throw error;};
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const strip=source=>source.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm,'');
const settle=async()=>{await new Promise(resolve=>setImmediate(resolve));await Vue.nextTick();};
const deferredChoice=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

(async()=>{
 const scrolls=[];
 window.scrollTo=(...coordinates)=>{scrolls.push(coordinates);};
 const settings=await import(`data:text/javascript;base64,${Buffer.from(read('src/security/settingsAccess.js')).toString('base64')}`);
 const guards=await import(`data:text/javascript;base64,${Buffer.from(read('src/domain/settings/settings.navigation.js')).toString('base64')}`);
 function load(file,bindings={}) {
  const sfc=compiler.parseComponent(read(file));
  const compiled=compiler.compile(sfc.template.content);
  assert.deepEqual(compiled.errors,[],`${file} template compiles`);
  const context={component:null,window,mapGetters:()=>({}),mapActions:()=>({}),moduleTypes:{AUTH:'AUTH'},fnTypes:{},...settings,...bindings};
  const ast=parser.parse(sfc.script.content,{sourceType:'module'});
  for(const node of ast.program.body.filter(node=>node.type==='ImportDeclaration')) for(const specifier of node.specifiers) if(!(specifier.local.name in context)) context[specifier.local.name]={};
  vm.runInNewContext(strip(sfc.script.content).replace('export default','component ='),context,{filename:file});
  return {options:context.component,sfc,render:new Function(compiled.render),staticRenderFns:compiled.staticRenderFns.map(source=>new Function(source))};
 }
 const shell=load('src/views/admin/index.vue');
 const header=load('src/views/admin/components/AdminSettingsHeader.vue');
 const headerComponent={...header.options,render:header.render,staticRenderFns:header.staticRenderFns};
 const emptyPanel={render:h=>h('div')};
 let dirty=false,confirm=false,notifications=[];
 const router=new VueRouter({mode:'abstract',routes:[{path:'/admin',name:'admin'},{path:'/px/dates',name:'appointments'},{path:'/auth/login',name:'login'}]});
 const view=new Vue({...shell.options,router,vuetify:new Vuetify(),render:shell.render,staticRenderFns:shell.staticRenderFns,
  components:{AdminSettingsHeader:headerComponent,AdminSettingsSidebar:emptyPanel,'da-user-index':emptyPanel,'da-config-index':emptyPanel},
  beforeCreate(){this.$swal={fire:async options=>{notifications.push(options);return {isConfirmed:confirm};}};this.$store={state:{CORE:{AUTH:{authenticated:true,user:{id_login:'SYNTHETIC_ACTOR'}}}}};},
  data(){return {...shell.options.data(),role:'admin',hasPermission:()=>true};}
 });
 await router.push({path:'/admin',query:{section:'identity',returnTo:'/px/dates'}});
 await settle();
 view.$mount();view.$el.setAttribute('data-app','true');document.body.appendChild(view.$el);await settle();
 const cleanup=guards.registerSettingsNavigationGuard(view,{hasChanges:()=>dirty,isSaving:()=>false});
 assert.equal(view.returnToAppointments,true);
 view.goToSection('users');await settle();
 assert.equal(router.currentRoute.query.section,'users');
 assert.equal(router.currentRoute.query.returnTo,'/px/dates','The explicit return target survives changing to Personal');
 assert.equal(view.mobileSection,'users');
 assert.deepEqual(scrolls,[[0,0]],'A successful section change returns to the start after rendering');
 confirm=true;await view.goToSection('appearance');await settle();
 assert.equal(router.currentRoute.query.section,'appearance');assert.equal(router.currentRoute.query.returnTo,'/px/dates');
 assert.equal(scrolls.length,2);
 dirty=true;
 const headerView=view.$children.find(child=>child.$options===headerComponent||child.$options.props&&child.$options.props.sections);
 assert.ok(headerView,'The actual settings header is rendered');
 const selector=headerView.$children.find(child=>child.$options.name==='v-select');
 assert.ok(selector,'The header renders a real Vuetify VSelect');
 assert.equal(selector.internalValue,'appearance');
 const rejectSelection=deferredChoice();
 const ordinaryPrompt=view.$swal.fire;
 view.$swal.fire=()=>rejectSelection.promise;
 selector.selectItem(view.availableSections.find(section=>section.key==='identity'));
 await settle();
 assert.equal(selector.internalValue,'identity','Real VSelect updates its own value before the guard resolves');
 assert.equal(view.mobileSection,'identity','The attempted header selection reaches parent state through its real change listener');
 assert.equal(router.currentRoute.query.section,'appearance');
 assert.equal(scrolls.length,2,'Pending discard confirmation cannot move the current editor');
 rejectSelection.resolve({isConfirmed:false});await settle();await settle();
 assert.equal(router.currentRoute.query.section,'appearance','Seguir editando keeps the appearance route');
 assert.equal(view.mobileSection,'appearance');
 assert.equal(selector.internalValue,'appearance','Cancelled navigation restores the real VSelect, without manually changing parent data');
 assert.match(selector.$el.textContent,/Apariencia/,'The visible select label agrees with the retained route');
 assert.equal(scrolls.length,2,'Seguir editando preserves the current scroll position');
 view.$swal.fire=ordinaryPrompt;
 let finishConfirmation;
 const pendingConfirmation=new Promise(resolve=>{finishConfirmation=resolve;});
 const standardPrompt=view.$swal.fire;
 view.$swal.fire=()=>pendingConfirmation;
 const firstNavigation=view.goToSection('users');
 const lastNavigation=view.goToSection('identity');
 finishConfirmation({isConfirmed:true});
 assert.equal(await firstNavigation,false,'A superseded real Vue Router navigation is a handled NavigationCancelled');
 assert.equal(await lastNavigation,true);await settle();
 assert.equal(router.currentRoute.query.section,'identity');assert.equal(view.mobileSection,'identity');
 assert.equal(scrolls.length,3,'Only the successful concurrent navigation scrolls; NavigationCancelled does not');
 assert.equal(await view.goToSection('identity'),false);
 assert.equal(scrolls.length,3,'Selecting the current section does not reset its scroll');
 view.$swal.fire=standardPrompt;
 dirty=false;
 await router.push({path:'/admin',query:{section:'appearance',returnTo:'https://external.invalid/path'}});await settle();
 assert.equal(view.returnToAppointments,false,'Only the allowlisted appointment route is offered as a return target');
 view.goToSection('users');await settle();assert.equal(router.currentRoute.query.returnTo,undefined);
 assert.equal(scrolls.length,4);
 const beforeContact=router.currentRoute.fullPath;
 notifications=[];view.openPlanContact();await settle();
 assert.equal(notifications.length,1);assert.equal(notifications[0].icon,'info');
 assert.match(notifications[0].text,/canal donde contrataste/);
 assert.equal(router.currentRoute.fullPath,beforeContact,'Plan contact offers instructions without navigating or sending a message');
 const unknownError=new Error('Synthetic unexpected router fault');
 const broken={$router:{push:()=>Promise.reject(unknownError)},activeSection:'summary',returnToAppointments:false,$nextTick:()=>Promise.resolve()};
 await assert.rejects(shell.options.methods.goToSection.call(broken,'identity'),error=>error===unknownError,'Unexpected errors must not be mistaken for an intentional navigation cancellation');
 assert.equal(scrolls.length,4,'Unexpected router failure cannot move the current editor');
 assert.ok(scrolls.every(coordinates=>coordinates.length===2&&coordinates[0]===0&&coordinates[1]===0));
 cleanup();view.$destroy();view.$el.remove();

 const side=load('src/views/admin/components/AdminSettingsSidebar.vue');
 const sections=settings.getSettingsSections('admin',()=>true);
 const sidebar=new Vue({...side.options,render:side.render,staticRenderFns:side.staticRenderFns,propsData:{sections,activeSection:'users'},components:{'v-icon':{functional:true,render:h=>h('span')}}});
 sidebar.$mount();document.body.appendChild(sidebar.$el);
 const navigation=sidebar.$el.querySelector('nav[aria-label="Apartados de configuración"]');assert.ok(navigation);
 assert.equal(sidebar.$el.querySelectorAll('[aria-current="page"]').length,1);
 const active=sidebar.$el.querySelector('[aria-current="page"]');assert.match(active.textContent,/Personal y usuarios/);
 let selection;sidebar.$on('select',value=>{selection=value;});active.click();assert.equal(selection,'users');
 sidebar.$destroy();sidebar.$el.remove();
 assert.ok(header.options.props.value,'The mobile selector remains controlled by the resolved route section');

 const layout=load('src/core/layouts/admin.vue');
 const methods=layout.options.methods;
 const visits=[];const frame={$route:{path:'/inicio',name:'home'},isMobileNavigationOpen:true,isTenantRestrictedMode:true,$router:{push:target=>{visits.push(target);return Promise.resolve();}}};
 methods.navigateToItem.call(frame,{path:'/admin',isTenantRestrictedDisabled:true});assert.equal(visits.length,0);assert.equal(frame.isMobileNavigationOpen,false);
 frame.isTenantRestrictedMode=false;methods.navigateToItem.call(frame,{path:'/admin'});assert.equal(visits[0],'/admin');
 assert.equal(methods.canShowNavigationItem.call({role:'doctor',hasPermission:()=>false},{settingsAccess:true}),true,'A doctor retains access to their own identity');
 assert.equal(methods.canShowNavigationItem.call({role:'assistant',hasPermission:()=>false},{settingsAccess:true}),true,'Assistants can reach their own legal documents');
 assert.deepEqual(settings.getSettingsSections('assistant',()=>false).map(section=>section.key),['account-legal'],'Legal access does not grant administrative settings');

 // Apply the actual style blocks in their real order, including Vue scoped
 // selector rewriting. This catches a later fixed footer overriding settings.
 const scope='data-v-ux13-layout';
 for(const block of layout.sfc.styles){
  const css=compileStyle({source:block.content,id:scope,scoped:Boolean(block.scoped)});
  assert.deepEqual(css.errors,[]);
  const style=document.createElement('style');style.textContent=css.code;document.head.appendChild(style);
 }
 const sample=document.createElement('div');sample.className='tenant-layout tenant-settings-layout';sample.setAttribute(scope,'');
 sample.innerHTML=`<div class="tenant-main-shell" ${scope}></div><footer class="tenant-footer" ${scope}></footer>`;document.body.appendChild(sample);
 const footer=sample.querySelector('footer');
 assert.equal(window.getComputedStyle(footer).position,'relative','Settings footer participates in document flow after all scoped styles');
 sample.classList.remove('tenant-settings-layout');
 assert.equal(window.getComputedStyle(footer).position,'fixed','Other modules retain their existing footer behavior');
 sample.remove();

 // Compile the component through the same Vue scoped-style compiler used by
 // vue-loader. Resolve known viewport queries explicitly because jsdom does
 // not apply them. Real rendered cards must be visible when the table is not.
 const staff=load('src/views/User/DAUser.vue',{window,ACTIONS:{EDIT:'EDIT',DELETE:'DELETE'}});
 const staffScope='data-v-ux13-staff';
 const staffSheet=document.createElement('style');document.head.appendChild(staffSheet);
 function setStaffViewport(width){
  staffSheet.textContent=staff.sfc.styles.map(block=>{
   const compiled=compileStyle({source:block.content,id:staffScope,scoped:Boolean(block.scoped)});
   assert.deepEqual(compiled.errors,[]);
   const css=postcss.parse(compiled.code);
   css.walkAtRules(rule=>{
    assert.notEqual(rule.name,'container','Legacy Vue scoped CSS must not leave responsive staff selectors inside unsupported container queries');
    if(rule.name!=='media')return;
    const maxWidth=/^\(max-width:\s*(\d+)px\)$/.exec(rule.params);
    assert.ok(maxWidth,`Explicitly evaluate every staff media condition: ${rule.params}`);
    if(width<=Number(maxWidth[1]))rule.replaceWith(...rule.nodes);else rule.remove();
   });
   return css.toString();
  }).join('\n');
 }
 const people=[{id_login:'SYNTHETIC_A',name:'Synthetic A',desc_rol:'Doctor',active:1},{id_login:'SYNTHETIC_B',name:'Synthetic B',desc_rol:'Asistente',active:1}];
 function mountStaff(){
  const component=new Vue({...staff.options,render:staff.render,staticRenderFns:staff.staticRenderFns,_scopeId:staffScope,vuetify:new Vuetify(),
   beforeCreate(){this.ActionWrapp=async()=>({success:true});},
   data(){return {...staff.options.data(),users:people.slice()};}
  });
  component.$mount();document.body.appendChild(component.$el);return component;
 }
 function assertDirectory(component,compact){
  const table=component.$el.querySelector('.staff-table-wrap');
  const cards=component.$el.querySelector('.staff-mobile-list');
  assert.equal(window.getComputedStyle(table).display,compact?'none':'block');
  assert.equal(window.getComputedStyle(cards).display,compact?'grid':'none','Users must have exactly one visible presentation, including after Vue scope rewriting');
  assert.equal(cards.children.length,2);
  for(const card of cards.children){
   assert.match(card.textContent,/Synthetic [AB]/);
   assert.equal(card.querySelectorAll('button').length,2);
   assert.match(card.querySelector('button').textContent,/Editar/);
  }
 }
 let observed;
 window.ResizeObserver=class {
  constructor(callback){this.callback=callback;observed=this;}
  observe(element){this.element=element;}
  disconnect(){this.disconnected=true;}
  resize(width){this.callback([{target:this.element,contentRect:{width}}]);}
 };
 setStaffViewport(1280);
 const staffView=mountStaff();await settle();assertDirectory(staffView,false);
 observed.resize(375);await settle();assertDirectory(staffView,true);
 assert.ok(staffView.$el.classList.contains('staff-compact'),'Narrow container switches layout even inside a desktop viewport');
 assert.equal(window.getComputedStyle(staffView.$el.querySelector('.staff-summary-grid')).gridTemplateColumns,'minmax(0, 1fr)');
 for(const card of staffView.$el.querySelectorAll('.staff-summary-card')){
  assert.equal(parseFloat(window.getComputedStyle(card).minWidth),0);
  assert.equal(parseFloat(window.getComputedStyle(card.querySelector('div')).minWidth),0);
  const label=window.getComputedStyle(card.querySelector('small'));
  assert.equal(label.whiteSpace,'normal');assert.equal(label.overflowWrap,'anywhere');
 }
 const labels=()=>Array.from(staffView.$el.querySelectorAll('.staff-summary-card small'),label=>label.textContent);
 assert.deepEqual(labels(),['Personas registradas','Coincidencias visibles','Puestos asignados']);
 staffView.users=[people[0]];await settle();
 assert.deepEqual(labels(),['Persona registrada','Coincidencia visible','Puesto asignado']);
 staffView.users=people.slice();await settle();
 observed.resize(864);await settle();assertDirectory(staffView,true);
 observed.resize(865);await settle();assertDirectory(staffView,false);
 setStaffViewport(375);assertDirectory(staffView,true);
 assert.equal(window.getComputedStyle(staffView.$el.querySelector('.staff-summary-grid')).gridTemplateColumns,'minmax(0, 1fr)','Viewport fallback keeps the summary readable before measurement');
 staffView.$destroy();staffView.$el.remove();assert.equal(observed.disconnected,true);
 delete window.ResizeObserver;setStaffViewport(1280);
 const fallbackView=mountStaff();await settle();assertDirectory(fallbackView,false);
 fallbackView.$el.getBoundingClientRect=()=>({width:375});window.dispatchEvent(new window.Event('resize'));await settle();assertDirectory(fallbackView,true);
 fallbackView.$el.getBoundingClientRect=()=>({width:1000});window.dispatchEvent(new window.Event('resize'));await settle();assertDirectory(fallbackView,false);
 fallbackView.$destroy();fallbackView.$el.remove();
 fallbackView.$el.getBoundingClientRect=()=>({width:375});window.dispatchEvent(new window.Event('resize'));
 assert.equal(fallbackView.isCompactLayout,false,'Destroyed directory removes its window resize listener');
 staffSheet.remove();
 console.log('PASS UX13 settings layout: real Vue Router query/discard behavior, scroll only after successful section changes, real Vuetify VSelect change/cancel restoration, allowlisted return to Citas, informative plan contact, sidebar ARIA/event rendering, permission scoped navigation, scoped footer cascade, rendered/scoped staff table-card visibility at 375/864/865 px, ResizeObserver and resize fallback/cleanup, summary wrapping and singular labels. DOM simulation only; viewport overflow/scroll still requires browser QA. No network, credentials or database.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>browser.window.close());
