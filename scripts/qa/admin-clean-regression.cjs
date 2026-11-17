const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const imported = file => import('data:text/javascript;base64,' + Buffer.from(read(file)).toString('base64'));
(async () => {
  const access = await imported('src/security/settingsAccess.js');
  const navigation = await imported('src/core/navigation/tenantNavigation.js');
  const stored=new Map();
  const browserWindow={localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)}};
  const load = file => {
    const sfc = compiler.parseComponent(read(file));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [], file);
    const ast = require('@babel/parser').parse(sfc.script.content, {sourceType:'module'});
    const context = {component:null, window:browserWindow, require:()=>'', sortTenantNavigationItems:items=>items, tenantNavigationItems:[], process:{env:{NODE_ENV:'production'}}, mapGetters:()=>({}), mapActions:()=>({}), moduleTypes:{AUTH:'AUTH'}, fnTypes:{}, ...access, ...navigation};
    for (const node of ast.program.body.filter(n => n.type === 'ImportDeclaration')) for (const item of node.specifiers) if (!(item.local.name in context)) context[item.local.name] = {};
    vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    return context.component;
  };
  const layout = load('src/core/layouts/admin.vue');
  const logout=navigation.tenantNavigationItems.find(item=>item.key==='logout');
  const menuState={role:'admin',hasPermission:()=>false,isTenantRestrictedMode:false,allowedNavigationItems:[logout]};
  const menu=()=>Array.from(layout.computed.sessionNavigationItems.call(menuState));
  for(const [role,expected] of [
    ['admin',['doctor-identity','plan-billing','logout']],['business_admin',['doctor-identity','plan-billing','logout']],
    ['doctor',['doctor-identity','logout']],['specialist',['doctor-identity','logout']],
    ['assistant',['logout']],['receptionist',['logout']],['super_admin',['logout']],['',['logout']]
  ]) {
    for(const allow of [false,true]) {
      menuState.role=role;menuState.hasPermission=()=>allow;
      assert.deepEqual(menu().map(item=>item.key),expected,'Account shortcuts follow existing settings access for '+role);
      assert.equal(menu().at(-1).key,'logout');
    }
  }
  menuState.role='admin';menuState.isTenantRestrictedMode=true;
  assert.deepEqual(menu().map(item=>item.key),['plan-billing','logout'],'Restricted administrators retain subscription access');
  menuState.role='assistant';assert.deepEqual(menu().map(item=>item.key),['logout'],'Restricted staff cannot access billing');
  menuState.role='admin';
  menuState.isTenantRestrictedMode=false;
  assert.deepEqual(menu().map(item=>item.label),['Mi perfil','Plan y facturación','Cerrar sesión']);
  assert.deepEqual(menu().slice(0,2).map(item=>item.path),['/admin?section=doctor-identity','/admin?section=plan-billing']);
  const accountVisits=[];let logouts=0;
  const actor={...menuState,isMobileNavigationOpen:true,$route:{path:'/admin'},$router:{push:path=>{accountVisits.push(path);return Promise.resolve();}},logout:()=>{logouts++;}};
  Object.defineProperty(actor,'sessionNavigationItems',{get:()=>layout.computed.sessionNavigationItems.call(actor)});
  actor.navigateToItem=layout.methods.navigateToItem.bind(actor);
  for(const key of ['doctor-identity','plan-billing']) layout.methods.handleSessionAction.call(actor,{key,path:'/ignored'});
  assert.deepEqual(accountVisits,['/admin?section=doctor-identity','/admin?section=plan-billing'],'Account navigation uses allowlisted destinations even when already inside settings');
  assert.equal(actor.isMobileNavigationOpen,false,'Account shortcuts close the mobile drawer');
  actor.role='assistant';layout.methods.handleSessionAction.call(actor,{key:'plan-billing',path:'/admin?section=plan-billing'});
  assert.equal(accountVisits.length,2,'Access is checked again when the menu item is selected');
  layout.methods.handleSessionAction.call(actor,{key:'logout'});assert.equal(logouts,0);
  assert.equal(actor.showLogoutConfirmation,true,'Manual logout requires confirmation');
  actor.showLogoutConfirmation=false;layout.methods.confirmLogout.call(actor);assert.equal(logouts,0,'Cancellation cannot close the session');
  layout.methods.handleSessionAction.call(actor,{key:'logout'});layout.methods.confirmLogout.call(actor);assert.equal(logouts,1);
  layout.methods.confirmLogout.call(actor);assert.equal(logouts,1,'Duplicate confirmation cannot dispatch logout twice');
  const breadcrumbState = {
    $route:{path:'/admin',query:{}}, role:'admin', hasPermission:()=>true,
    sectionNavigationItems:[{key:'home',label:'Inicio',path:'/inicio'}],
    currentPrimaryItem:{key:'settings',label:'Configuración',path:'/admin'}
  };
  Object.defineProperty(breadcrumbState,'currentSettingsSection',{get:()=>layout.computed.currentSettingsSection.call(breadcrumbState)});
  const breadcrumbLabels = () => Array.from(layout.computed.breadcrumbs.call(breadcrumbState), item=>item.label).join(' > ');
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Resumen');
  breadcrumbState.$route.query.section='plan-billing';
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Plan y facturación');
  breadcrumbState.$route.query.section='users';
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Personal y usuarios');
  breadcrumbState.role='assistant'; breadcrumbState.hasPermission=()=>false;
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Cuenta y legal','Forbidden queries resolve to the same authorized fallback as the settings page');
  breadcrumbState.$route.query.section=['plan-billing','users'];
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Cuenta y legal');
  breadcrumbState.role='admin'; breadcrumbState.hasPermission=()=>true;
  const Vue=require('vue'), VueRouter=require('vue-router'); Vue.use(VueRouter);
  const router=new VueRouter({mode:'abstract',routes:[{path:'/admin'},{path:'/inicio'},{path:'/px/all'}]});
  const routeOwner=new Vue({...layout,router,mixins:[],created(){},mounted(){},beforeDestroy(){},render:h=>h('div')});
  const freshLayout=()=>new Vue({...layout,router,mixins:[],created(){},mounted(){},beforeDestroy(){},render:h=>h('div')});
  assert.equal(routeOwner.sidebarCollapsed,false,'A new browser preference defaults to expanded');
  for (const collapsed of [true,false]) {
    routeOwner.sidebarCollapsed=collapsed;
    await Vue.nextTick();
    assert.equal(stored.get('medsync.sidebar.collapsed'),String(collapsed),'The actual watcher persists both states');
    const reloaded=freshLayout();
    assert.equal(reloaded.sidebarCollapsed,collapsed,'A new layout instance restores the saved state before mounting');
    reloaded.$destroy();
    for (const path of ['/inicio','/admin?section=identity','/px/all','/admin?section=users']) {
      await router.push(path);
      assert.equal(routeOwner.sidebarCollapsed,collapsed,'Navigation preserves the chosen sidebar state across Settings and other screens');
      assert.equal(routeOwner.sidebarToggleLabel,collapsed?'Expandir menú lateral':'Colapsar menú lateral');
    }
  }
  await router.push('/admin?section=identity');
  breadcrumbState.$route=router.currentRoute;
  const removeGuard=router.beforeEach((_to,_from,next)=>next(false));
  await assert.rejects(router.push('/admin?section=plan-billing'), error=>VueRouter.isNavigationFailure(error,VueRouter.NavigationFailureType.aborted));
  breadcrumbState.$route=router.currentRoute;
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Información del consultorio','Cancelled navigation retains the committed breadcrumb');
  removeGuard(); await router.push('/admin?section=plan-billing'); breadcrumbState.$route=router.currentRoute;
  assert.equal(breadcrumbLabels(),'Inicio > Configuración > Plan y facturación');
  routeOwner.$destroy();
  stored.set('medsync.sidebar.collapsed','malformed');
  const malformed=freshLayout();assert.equal(malformed.sidebarCollapsed,false);malformed.$destroy();
  browserWindow.localStorage={getItem(){throw new Error('Storage denied');},setItem(){throw new Error('Storage full');}};
  const unavailable=freshLayout();assert.equal(unavailable.sidebarCollapsed,false);
  unavailable.sidebarCollapsed=true;await Vue.nextTick();assert.equal(unavailable.sidebarCollapsed,true,'Blocked storage must not break the toggle');unavailable.$destroy();
  const summary = load('src/views/configuration/components/AdminSummary.vue');
  for (const role of ['admin','business_admin','doctor','assistant','super_admin']) {
    for (const allow of [true,false]) {
      const sections = access.getSettingsSections(role, () => allow);
      const context = {sections};
      assert.equal(summary.methods.canView.call(context,'identity'), ['admin','business_admin'].includes(role) && allow);
      assert.equal(summary.methods.canView.call(context,'plan-billing'), ['admin','business_admin'].includes(role));
    }
  }
  assert.equal(summary.computed.planLabel.call({business:{}}),'Consultar plan','Missing session data never invents a paid plan');
  assert.equal(summary.computed.statusLabel.call({business:{}}),'Consultar estado');
  const header = load('src/views/admin/components/AdminSettingsHeader.vue');
  const sections = access.getSettingsSections('doctor',()=>false);
  assert.equal(header.computed.currentSection.call({sections,activeSection:'identity'}).title,undefined,'The heading never exposes an unauthorized section');
  assert.equal(header.computed.currentSection.call({sections,activeSection:'doctor-identity'}).key,'doctor-identity');
  assert.equal(header.computed.currentSection.call({sections:access.getSettingsSections('admin',()=>true),activeSection:'identity'}).key,'identity','A pending selector change cannot replace the heading of the retained editor');
  load('src/views/admin/components/AdminSettingsSidebar.vue');
  load('src/views/configuration/components/PreparationChecklist.vue');
  console.log('PASS clean admin: sidebar persistence/reload and storage failures, shared state across real routes, permission-scoped account shortcuts/actions and summary, unknown data, authorized headings, committed/permission-safe breadcrumbs and Vue 2 templates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
