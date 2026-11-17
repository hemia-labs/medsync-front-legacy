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
  const context={component:null,window,document,mapGetters:()=>({}),mapActions:()=>({}),moduleTypes:{AUTH:'AUTH'},fnTypes:{},...settings,...bindings};
  const ast=parser.parse(sfc.script.content,{sourceType:'module'});
  for(const node of ast.program.body.filter(node=>node.type==='ImportDeclaration')) for(const specifier of node.specifiers) if(!(specifier.local.name in context)) context[specifier.local.name]={};
  vm.runInNewContext(strip(sfc.script.content).replace('export default','component ='),context,{filename:file});
  return {options:context.component,sfc,render:new Function(compiled.render),staticRenderFns:compiled.staticRenderFns.map(source=>new Function(source))};
 }
 const focus=await import(`data:text/javascript;base64,${Buffer.from(read('src/utils/mobileNavigationFocus.js')).toString('base64')}`);
 const side=load('src/views/admin/components/AdminSettingsSidebar.vue',focus);
 const sidebarComponent={...side.options,render:side.render,staticRenderFns:side.staticRenderFns};
 const shell=load('src/views/admin/index.vue');
 const header=load('src/views/admin/components/AdminSettingsHeader.vue');
 const headerComponent={...header.options,render:header.render,staticRenderFns:header.staticRenderFns};
 const emptyPanel={render:h=>h('div')};
 let dirty=false,confirm=false,notifications=[];
 const router=new VueRouter({mode:'abstract',routes:[{path:'/admin',name:'admin'},{path:'/px/dates',name:'appointments'},{path:'/login',name:'login'}]});
 const view=new Vue({...shell.options,router,vuetify:new Vuetify(),render:shell.render,staticRenderFns:shell.staticRenderFns,
  components:{AdminSettingsHeader:headerComponent,AdminSettingsSidebar:sidebarComponent,'da-user-index':emptyPanel,'da-config-index':emptyPanel},
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
 assert.deepEqual(scrolls,[[0,0]],'A successful section change returns to the start after rendering');
 confirm=true;await view.goToSection('appearance');await settle();
 assert.equal(router.currentRoute.query.section,'appearance');assert.equal(router.currentRoute.query.returnTo,'/px/dates');
 assert.equal(scrolls.length,2);
 dirty=true;
 const headerView=view.$children.find(child=>child.$options.props&&child.$options.props.navigationOpen);
 assert.ok(headerView,'The actual settings header is rendered');
 assert.equal(headerView.$children.some(child=>child.$options.name==='v-select'),false,'The mobile selector is replaced by a drawer trigger');
 const mobileSidebar=view.$children.find(child=>child.$options.props&&child.$options.props.activeSection&&child.$options.props.value);
 assert.ok(mobileSidebar);
 headerView.$el.querySelector('.admin-mobile-section').click();await settle();
 assert.equal(view.isSettingsNavigationOpen,true,'The header button opens the mobile settings drawer');
 const mobileDrawer=mobileSidebar.$children.find(child=>child.$options.name==='v-navigation-drawer');
 assert.equal(mobileDrawer.temporary,true);assert.equal(mobileDrawer.permanent,false);
 assert.equal(mobileDrawer.isActive,true);
 const rejectSelection=deferredChoice();
 const ordinaryPrompt=view.$swal.fire;
 view.$swal.fire=()=>rejectSelection.promise;
 [...mobileSidebar.$el.querySelectorAll('.settings-nav-item')].find(item=>/Información del consultorio/.test(item.textContent)).click();
 await settle();
 assert.equal(view.isSettingsNavigationOpen,false,'Selecting an entry closes the mobile drawer before navigation confirmation');
 assert.equal(mobileDrawer.isActive,false);
 assert.equal(router.currentRoute.query.section,'appearance');
 assert.equal(scrolls.length,2,'Pending discard confirmation cannot move the current editor');
 rejectSelection.resolve({isConfirmed:false});await settle();await settle();
 assert.equal(router.currentRoute.query.section,'appearance','Seguir editando keeps the appearance route');
 assert.equal(mobileSidebar.activeSection,'appearance','Cancelled navigation preserves the selected item');
 assert.match(mobileSidebar.$el.querySelector('[aria-current="page"]').textContent,/Apariencia/);
 assert.equal(scrolls.length,2,'Seguir editando preserves the current scroll position');
 headerView.$el.querySelector('.admin-mobile-section').click();await settle();
 mobileSidebar.$el.querySelector('[aria-current="page"]').click();await settle();
 assert.equal(view.isSettingsNavigationOpen,false,'Choosing the current section also closes the drawer');
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
 assert.equal(router.currentRoute.query.section,'identity');
 assert.equal(scrolls.length,3,'Only the successful concurrent navigation scrolls; NavigationCancelled does not');
 assert.equal(await view.goToSection('identity'),false);
 assert.equal(scrolls.length,3,'Selecting the current section does not reset its scroll');
 view.$swal.fire=standardPrompt;
 dirty=false;
 await router.push({path:'/admin',query:{section:'appearance',returnTo:'https://external.invalid/path'}});await settle();
 assert.equal(view.returnToAppointments,false,'Only the allowlisted appointment route is offered as a return target');
 view.goToSection('users');await settle();assert.equal(router.currentRoute.query.returnTo,undefined);
 assert.equal(scrolls.length,4);
 notifications=[];await view.openPlanContact();await settle();
 assert.equal(notifications.length,0,'Changing plans does not require contacting the team');
 assert.equal(router.currentRoute.query.section,'plan-billing','Locked features lead directly to self-service billing');
 const unknownError=new Error('Synthetic unexpected router fault');
 const broken={$router:{push:()=>Promise.reject(unknownError)},activeSection:'summary',returnToAppointments:false,$nextTick:()=>Promise.resolve()};
 await assert.rejects(shell.options.methods.goToSection.call(broken,'identity'),error=>error===unknownError,'Unexpected errors must not be mistaken for an intentional navigation cancellation');
 assert.equal(scrolls.length,5,'Unexpected router failure cannot move the current editor');
 assert.ok(scrolls.every(coordinates=>coordinates.length===2&&coordinates[0]===0&&coordinates[1]===0));
 cleanup();view.$destroy();view.$el.remove();

 Object.defineProperty(window,'innerWidth',{value:1280,writable:true});
 const sections=settings.getSettingsSections('admin',()=>true);
 const sidebar=new Vue({...side.options,vuetify:new Vuetify(),render:side.render,staticRenderFns:side.staticRenderFns,propsData:{sections,activeSection:'users'},components:{'v-icon':{functional:true,render:h=>h('span')}}});
 sidebar.$mount();document.body.appendChild(sidebar.$el);await settle();
 const settingsDrawer=sidebar.$children.find(child=>child.$options.name==='v-navigation-drawer');
 assert.ok(settingsDrawer,'Settings uses the real Vuetify navigation drawer');
 assert.equal(settingsDrawer.permanent,true);assert.equal(settingsDrawer.fixed,true);
 assert.equal(settingsDrawer.app,false,'The secondary drawer must not register another application layout offset');
 assert.equal(settingsDrawer.$vuetify.application.left,0,'The existing grid continues to own the content offset');
 assert.ok(sidebar.$el.querySelector('.v-navigation-drawer__content'),'Vuetify owns the internal scroll container');
 assert.ok(sidebar.$el.querySelector('.v-navigation-drawer__border'),'Vuetify renders the drawer divider');

 const navigation=sidebar.$el.querySelector('nav[aria-label="Apartados de configuración"]');assert.ok(navigation);
 assert.equal(sidebar.$el.querySelectorAll('[aria-current="page"]').length,1);
 const active=sidebar.$el.querySelector('[aria-current="page"]');assert.match(active.textContent,/Personal y usuarios/);
 let selection;sidebar.$on('select',value=>{selection=value;});active.click();assert.equal(selection,'users');
 sidebar.$vuetify.breakpoint.width=390;await settle();
 assert.equal(settingsDrawer.temporary,true);assert.equal(settingsDrawer.permanent,false);
 assert.equal(sidebar.$el.querySelector('#admin-settings-navigation').getAttribute('aria-hidden'),'true','Closed mobile drawer is hidden from assistive technology');
 assert.equal(sidebar.$el.querySelector('#admin-settings-navigation').hasAttribute('inert'),true,'Closed mobile entries cannot receive keyboard focus');
 sidebar.$vuetify.breakpoint.width=1280;await settle();
 assert.equal(settingsDrawer.permanent,true);assert.equal(settingsDrawer.temporary,false);
 sidebar.$destroy();sidebar.$el.remove();
 assert.ok(header.options.props.navigationOpen,'The mobile trigger exposes the drawer state');

 const layout=load('src/core/layouts/admin.vue',{TENANT_NAVIGATION_TYPES:{SESSION:'session'}});
 const desktopDrawer=compiler.compile(layout.sfc.template.content).ast.children.find(node=>node.attrsMap&&node.attrsMap.id==='tenant-desktop-navigation');
 assert.equal(desktopDrawer.tag,'v-navigation-drawer');
 assert.ok('permanent' in desktopDrawer.attrsMap);assert.ok('fixed' in desktopDrawer.attrsMap);
 assert.ok(!('app' in desktopDrawer.attrsMap),'The existing shell retains control of content offsets');
 assert.ok(desktopDrawer.children.some(node=>node.tag==='tenant-navigation-rail'));
 const accountItems=layout.options.computed.sessionNavigationItems.call({role:'admin',hasPermission:()=>true,isTenantRestrictedMode:false,allowedNavigationItems:[{key:'logout',label:'Cerrar sesión',icon:'mdi-logout',type:'session'}]});
 const rail=load('src/core/components/navigation/TenantNavigationRail.vue');
 const railView=new Vue({...rail.options,vuetify:new Vuetify(),render:rail.render,staticRenderFns:rail.staticRenderFns,propsData:{businessName:'Clínica de ejemplo',sessionItems:accountItems}});
 railView.$mount();document.body.appendChild(railView.$el);await settle();
 assert.equal(railView.$el.querySelector('.navigation-brand strong').textContent,'Clínica de ejemplo');
 assert.equal(railView.$el.querySelectorAll('.navigation-brand img,.navigation-brand .v-icon').length,0,'Clinic identity contains text without a logo or fallback icon');
 const accountMenu=railView.$children.find(child=>child.$options.name==='v-menu');assert.ok(accountMenu);
 assert.ok(accountMenu.$children.some(child=>child.$options.name==='v-btn'),'Account activator is a real Vuetify button');
 const trigger=railView.$el.querySelector('.session-trigger');assert.ok(trigger.classList.contains('v-btn'));
 assert.ok(trigger.querySelector('.v-avatar'),'Account initials use Vuetify avatar');
 trigger.click();await settle();assert.equal(accountMenu.isActive,true,'Vuetify button opens the account menu');
 let sessionAction;railView.$on('session-action',item=>{sessionAction=item.key;});
 const renderedItems=[...railView.$el.querySelectorAll('.session-menu-item')];
 assert.deepEqual(renderedItems.map(item=>item.textContent.trim()),['Mi perfil','Plan y facturación','Cerrar sesión']);
 for(let index=0;index<renderedItems.length;index++) {
  if(index) {trigger.click();await settle();}
  renderedItems[index].click();await settle();
  assert.equal(sessionAction,accountItems[index].key,'Each Vuetify entry emits its matching account action');assert.equal(accountMenu.isActive,false);
 }
 railView.$destroy();railView.$el.remove();
 const confirmation=load('src/core/components/navigation/LogoutConfirmDialog.vue');
 const confirmationComponent={...confirmation.options,render:confirmation.render,staticRenderFns:confirmation.staticRenderFns};
 let confirmedLogouts=0;
 const logoutOwner=new Vue({vuetify:new Vuetify(),data:()=>({showLogoutConfirmation:false,isMobileNavigationOpen:false}),
  methods:{handleSessionAction:layout.options.methods.handleSessionAction,confirmLogout:layout.options.methods.confirmLogout,logout:()=>{confirmedLogouts++;}},
  render(h){return h('div',{attrs:{'data-app':'true'}},[h(confirmationComponent,{props:{value:this.showLogoutConfirmation},on:{input:value=>{this.showLogoutConfirmation=value;},confirm:this.confirmLogout}})]);}
 });
 logoutOwner.$mount();document.body.appendChild(logoutOwner.$el);await settle();
 const logoutDialog=logoutOwner.$children[0].$children.find(child=>child.$options.name==='v-dialog');assert.ok(logoutDialog,'Logout uses the real Vuetify dialog');
 logoutOwner.handleSessionAction({key:'logout'});await settle();assert.equal(logoutDialog.isActive,true);assert.equal(confirmedLogouts,0);
 document.querySelector('.logout-confirm-cancel').click();await settle();assert.equal(logoutDialog.isActive,false);assert.equal(confirmedLogouts,0,'Cancel never calls the authentication action');
 logoutOwner.handleSessionAction({key:'logout'});await settle();
 logoutDialog.$refs.content.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true}));await settle();
 assert.equal(logoutDialog.isActive,false);assert.equal(confirmedLogouts,0,'Escape cancels the native dialog');
 logoutOwner.handleSessionAction({key:'logout'});await settle();
 document.querySelector('.logout-confirm-submit').click();await settle();assert.equal(logoutDialog.isActive,false);assert.equal(confirmedLogouts,1,'Only the explicit confirm button signs out');
 logoutOwner.confirmLogout();assert.equal(confirmedLogouts,1);
 logoutOwner.$destroy();logoutOwner.$el.remove();
 const methods=layout.options.methods;
 const visits=[];const frame={$route:{path:'/inicio',name:'home'},isMobileNavigationOpen:true,isTenantRestrictedMode:true,$router:{push:target=>{visits.push(target);return Promise.resolve();}}};
 methods.navigateToItem.call(frame,{path:'/admin',isTenantRestrictedDisabled:true});assert.equal(visits.length,0);assert.equal(frame.isMobileNavigationOpen,false);
 frame.isTenantRestrictedMode=false;methods.navigateToItem.call(frame,{path:'/admin'});assert.equal(visits[0],'/admin');
 assert.equal(methods.canShowNavigationItem.call({role:'doctor',hasPermission:()=>false},{settingsAccess:true}),true,'A doctor retains access to their own identity');
 assert.equal(methods.canShowNavigationItem.call({role:'assistant',hasPermission:()=>false},{settingsAccess:true}),true,'Assistants can reach their own legal documents');
 assert.deepEqual(settings.getSettingsSections('assistant',()=>false).map(section=>section.key),['account-legal','change-password'],'Personal account access does not grant administrative settings');

 // Apply the actual style blocks in their real order, including Vue scoped
 // selector rewriting. Content no longer reserves space for a global footer.
 const scope='data-v-ux13-layout';
 for(const block of layout.sfc.styles){
  const css=compileStyle({source:block.content,id:scope,scoped:Boolean(block.scoped)});
  assert.deepEqual(css.errors,[]);
  const style=document.createElement('style');style.textContent=css.code;document.head.appendChild(style);
 }
 const sample=document.createElement('div');sample.className='tenant-layout tenant-settings-layout';sample.setAttribute(scope,'');
 sample.innerHTML=`<div class="tenant-main-shell" ${scope}></div>`;document.body.appendChild(sample);
 assert(!layout.sfc.template.content.includes('tenant-footer'),'Global footer is removed from the shared layout');
 assert.equal(window.getComputedStyle(sample.firstElementChild).paddingBottom,'0px','Settings do not reserve footer space');
 sample.classList.remove('tenant-settings-layout');
 assert.equal(window.getComputedStyle(sample.firstElementChild).paddingBottom,'0px','Other modules do not reserve footer space');
 sample.remove();

 // Compile the component through the same Vue scoped-style compiler used by
 // vue-loader. Resolve known viewport queries explicitly because jsdom does
 // not apply them. Real rendered cards must be visible when the table is not.
 const staff=load('src/views/User/DAUser.vue',{window,ACTIONS:{EDIT:'EDIT',DELETE:'DELETE'},PreparationGuide:{render:h=>h('span')}});
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
  const component=new Vue({...staff.options,router:new VueRouter({mode:'abstract',routes:[]}),render:staff.render,staticRenderFns:staff.staticRenderFns,_scopeId:staffScope,vuetify:new Vuetify(),
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
 console.log('PASS UX13 settings layout: real Vue Router query/discard behavior, scroll only after successful section changes, real mobile Vuetify drawer open/select/close and cancelled navigation, allowlisted return to Citas, self-service billing navigation, real Vuetify drawer with no duplicate layout offset, sidebar ARIA/event rendering, permission scoped navigation, footer-free layout cascade, rendered/scoped staff table-card visibility at 375/864/865 px, ResizeObserver and resize fallback/cleanup, summary wrapping and singular labels. DOM simulation only; viewport overflow/scroll still requires browser QA. No network, credentials or database.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>browser.window.close());
