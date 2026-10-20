'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const moduleSource = read('src/domain/settings/permissions.presentation.js');
const navigationSource = read('src/domain/settings/settings.navigation.js');
const sfc = compiler.parseComponent(read('src/views/configuration/components/RolesPermissionsConfig.vue'));
assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
const script = sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '');
const fixture = [
  ['admin.users','Administracion'],['admin.config','Administracion'],['dashboard','General'],
  ['dashboard.operations','Indicadores'],['dashboard.clinical','Indicadores'],['dashboard.financial','Indicadores'],['dashboard.scope.all','Indicadores'],
  ['px.new','Pacientes'],['px.all','Pacientes'],['px.dates','Pacientes'],
  ['clinical_history.intake','Historia clinica'],['clinical_history.view','Historia clinica'],['clinical_history.create_draft','Historia clinica'],['clinical_history.edit_draft','Historia clinica'],['clinical_history.finalize','Historia clinica'],
  ['tracing.create','Seguimiento'],['tracing.correct','Seguimiento'],['tracing.cancel','Seguimiento'],
  ['documents.view','Documentos'],['documents.create','Documentos'],['documents.sign','Documentos'],['documents.config','Documentos'],
  ['prescriptions.create','Recetas'],['prescriptions.issue','Recetas'],['prescriptions.config','Recetas'],
  ['treatments.view','Tratamientos'],['treatments.cost_view','Tratamientos'],['treatments.cost_edit','Tratamientos'],['treatments.consent.sign','Tratamientos']
].map(([code,module])=>({code,module,name:'Nombre anterior '+code,description:'Descripción anterior',allowed:false,licensing:{planAllowed:code!=='documents.config',minimumPlan:code==='documents.config'?'enterprise':'free',isPremium:code==='documents.config'}}));
const roles = [{id_rol:'admin',code:'admin',desc_rol:'Administrador'},{id_rol:'assistant',code:'assistant',desc_rol:'Asistente'},{id_rol:'doctor',code:'doctor',desc_rol:'Doctor'},{id_rol:'reception',code:'reception',desc_rol:'Recepcion'}];
const defaults = id => id === 'admin' ? fixture.filter(p=>p.code!=='documents.config').map(p=>p.code) : ['px.new','px.all','px.dates'];
const dataFor = (id,selected=defaults(id)) => fixture.map(permission=>({...permission,allowed:selected.includes(permission.code)}));

(async()=>{
  const presentation=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
  const navigation=await import('data:text/javascript;base64,'+Buffer.from(navigationSource).toString('base64'));
  let sent, rejectSave=true;
  const service={getPermissions:async id=>({success:true,data:dataFor(id)}),savePermissions:async(id,permissions)=>{sent={id,permissions:[...permissions]};return rejectSave?{success:false,message:'QA: no se pudo guardar'}:{success:true,data:dataFor(id,permissions)};}};
  const context={component:null,...presentation,...navigation,DARolService:service,isD2AuthMode:()=>true,moduleTypes:{AUTH:'AUTH'},fnTypes:{getToken:'getToken'},mutationTypes:{}};
  vm.runInNewContext(script.replace('export default','component ='),context);
  const options=context.component;
  const view={...options.data(),roles,$store:{dispatch:async()=>{}},$swal:{fire:async()=>({isConfirmed:false})}};
  Object.entries(options.methods).forEach(([key,fn])=>view[key]=fn.bind(view));
  Object.entries(options.computed).forEach(([key,fn])=>Object.defineProperty(view,key,{get:fn.bind(view)}));
  await view.selectRole('reception');
  assert.ok(view.permissionGroups.every(group=>!view.isGroupExpanded(group)));
  view.toggleGroup(view.permissionGroups[0]);view.toggleGroup(view.permissionGroups[1]);
  assert.equal(view.expandedGroups.length,2,'Groups open independently');
  view.toggleAllGroups();assert.equal(view.allGroupsExpanded,true);view.toggleAllGroups();assert.equal(view.expandedGroups.length,0);
  view.selectedPermissions.push('clinical_history.intake');
  assert.equal(view.changedPermissionCodes.join(','),'clinical_history.intake');
  view.permissionSearch='recepcion';
  assert.ok(view.permissionGroups.some(group=>group.items.some(p=>p.code==='clinical_history.intake')),'Search ignores accents');
  assert.ok(view.permissionGroups.every(group=>view.isGroupExpanded(group)));
  assert.equal(await view.selectRole('doctor'),false,'Role change retains dirty selection when discard is cancelled');
  assert.equal(await view.savePermissions(),false);assert.equal(view.dirty,true);
  assert.deepEqual(sent,{id:'reception',permissions:['px.new','px.all','px.dates','clinical_history.intake']},'Filtering cannot remove hidden grants or add other grants');
  rejectSave=false;assert.equal(await view.savePermissions(),true);assert.equal(view.dirty,false);
  assert.equal(view.isAdministrativePermission({code:'admin.users'}),true);
  assert.equal(view.isPermissionLocked(fixture.find(p=>p.code==='documents.config')),true);
  assert.match(view.permissionLockReason(fixture.find(p=>p.code==='documents.config')),/Clínica/);
  assert.equal(presentation.roleLabel(roles[3]),'Recepción');
  assert.deepEqual(presentation.permissionText({code:'future',name:'Acceso nuevo',description:'Información del servidor'}),{name:'Acceso nuevo',description:'Información del servidor'});
  console.log('PASS UX19 methods: collapsed groups, independent expansion, accent search, hidden grants retained, dirty guard, rejected save recovery, unchanged code payload, plan/admin locks and fallback copy.');
  if(!process.argv.includes('--visual'))return;

  const {chromium}=require('@playwright/test');
  const evidence=path.resolve(root,'../docs/dashboard-ux/evidence/UX19');fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'msedge'});let page;
  try{
    page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.abort());
    await page.setContent('<!doctype html><html lang="es"><meta charset="utf-8"><body><div id="app"></div></body></html>');
    await page.addStyleTag({path:path.join(root,'node_modules/vuetify/dist/vuetify.min.css')});
    const mdiCss=read('node_modules/@mdi/font/css/materialdesignicons.min.css').replace(/@font-face\s*\{[^}]+\}/g,'');
    const mdiFont=fs.readFileSync(path.join(root,'node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2')).toString('base64');
    await page.addStyleTag({content:`@font-face{font-family:"Material Design Icons";src:url(data:font/woff2;base64,${mdiFont}) format("woff2");font-weight:normal;font-style:normal}${mdiCss}`});
    await page.addStyleTag({content:'body{margin:0}.qa-wrap{max-width:1120px;margin:0 auto;padding:16px}'+sfc.styles.map(style=>style.content.replace(/::v-deep /g,'')).join('\n')});
    await page.addScriptTag({path:path.join(root,'node_modules/vue/dist/vue.js')});
    await page.addScriptTag({path:path.join(root,'node_modules/vuetify/dist/vuetify.js')});
    await page.evaluate(({moduleSource,navigationSource,script,template,fixture,roles})=>{
      const Vue=window.Vue, Vuetify=window.Vuetify;
      const expose=source=>{const names=[...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(match=>match[1]);(0,eval)(source.replace(/export /g,'')+'\nObject.assign(window,{'+names.join(',')+'});');};
      expose(moduleSource);expose(navigationSource);
      window.qaFixture=Vue.observable({fail:false,posts:[],confirmations:0});
      const defaults=id=>id==='admin'?fixture.filter(p=>p.code!=='documents.config').map(p=>p.code):['px.new','px.all','px.dates'];
      window.DARolService={getRoles:async()=>({success:true,data:roles}),getPermissions:async id=>({success:true,data:fixture.map(p=>({...p,allowed:defaults(id).includes(p.code)}))}),savePermissions:async(id,selected)=>{window.qaFixture.posts.push({id,selected:[...selected]});return window.qaFixture.fail?{success:false,message:'No se pudo guardar. Prueba de error.'}:{success:true,data:fixture.map(p=>({...p,allowed:selected.includes(p.code)}))};}};
      window.isD2AuthMode=()=>true;window.moduleTypes={AUTH:'AUTH'};window.fnTypes={getToken:'getToken'};window.mutationTypes={};
      Vue.prototype.$router={beforeEach:()=>()=>{}};Vue.prototype.$store={dispatch:async()=>{}};Vue.prototype.$swal={fire:async()=>{window.qaFixture.confirmations++;return {isConfirmed:false};}};
      (0,eval)(script.replace('export default','window.AccessEditor ='));window.AccessEditor.template=template;
      window.qaApp=new Vue({vuetify:new Vuetify(),render:h=>h('v-app',[h('main',{class:'qa-wrap'},[h(window.AccessEditor,{ref:'editor'})])])}).$mount('#app');
    },{moduleSource,navigationSource,script,template:sfc.template.content,fixture,roles});
    const getEditor=()=>page.evaluate(()=>window.qaApp.$refs.editor.selectedRoleId);
    const saveButton=()=>page.locator('.permissions-heading').getByRole('button',{name:'Guardar cambios',exact:true});
    const pendingSave=()=>page.locator('.permissions-savebar').getByRole('button',{name:'Guardar cambios',exact:true});
    for(const [viewport,width,height] of [['desktop',1440,1000],['mobile',390,844],['narrow',320,740]]){
      await page.setViewportSize({width,height});
      await page.mouse.move(0,0);
      await page.getByRole('button',{name:'Administrador',exact:false}).first().waitFor();
      await page.evaluate(async()=>{const editor=window.qaApp.$refs.editor;editor.selectedRoleId='admin';await editor.loadPermissions();window.qaFixture.posts=[];});
      assert.equal(await page.locator('.group-title[aria-expanded="true"]').count(),0);
      assert.equal(await saveButton().isDisabled(),true);
      assert.equal(await page.locator('.access-help[open]').count(),0);
      await page.locator('.roles-permissions').screenshot({path:path.join(evidence,'overview-'+viewport+'.png')});
      const first=page.getByRole('button',{name:/Administración del consultorio/});await first.focus();await first.press('Enter');
      await page.getByRole('switch',{name:'Administrar al equipo y sus accesos',exact:true}).waitFor();
      assert.equal(await page.getByRole('switch',{name:'Administrar al equipo y sus accesos',exact:true}).isDisabled(),true);
      const documents=page.getByRole('button',{name:/^Documentos/});await documents.click();
      assert.equal(await first.getAttribute('aria-expanded'),'true','Another section stays open');
      assert.equal(await page.getByRole('switch',{name:'Editar plantillas de documentos',exact:true}).isDisabled(),true);
      await page.getByText('Requiere el plan Clínica.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Recepción',exact:true}).click();
      await page.getByRole('heading',{name:'Recepción',exact:true}).waitFor();
      assert.equal(await getEditor(),'reception');
      await page.getByLabel('Buscar un acceso',{exact:true}).fill('recepcion');
      const intake=page.getByRole('switch',{name:'Capturar el motivo de consulta en recepción',exact:true});await intake.waitFor();
      await intake.focus();await intake.press('Space');assert.equal(await intake.getAttribute('aria-checked'),'true');
      assert.equal(await page.evaluate(()=>window.qaFixture.posts.length),0,'Switch prepares a draft without automatic API writes');
      await page.locator('.capture-state').filter({hasText:'1 cambio sin guardar'}).waitFor();
      await page.getByLabel('Buscar un acceso',{exact:true}).fill('costos');
      assert.equal(await page.locator('.permission-row:visible').count(),2);
      await page.getByLabel('Buscar un acceso',{exact:true}).fill('no-existe-acceso');
      await page.getByText('No encontramos accesos con esa búsqueda.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();
      await page.getByRole('button',{name:'Abrir todas las secciones',exact:true}).click();
      assert.equal(await page.locator('.group-title[aria-expanded="false"]').count(),0);
      await page.getByRole('button',{name:'Cerrar todas las secciones',exact:true}).click();
      await page.getByRole('button',{name:/^Historia clínica/}).filter({hasText:'1 cambio'}).waitFor();
      await page.locator('.permission-group').last().scrollIntoViewIfNeeded();
      const actionBox=await pendingSave().boundingBox();assert.ok(actionBox && actionBox.y>=0 && actionBox.y+actionBox.height<=height,'Pending-save action stays in the viewport');
      await page.mouse.move(0,0);
      await page.locator('.roles-permissions').screenshot({path:path.join(evidence,'pending-'+viewport+'.png')});
      await page.getByRole('button',{name:'Doctor',exact:true}).click();assert.equal(await getEditor(),'reception');
      await page.evaluate(()=>{window.qaFixture.fail=true;});await pendingSave().click();
      await page.getByText('No se pudo guardar. Prueba de error.',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>window.qaApp.$refs.editor.dirty),true);
      await page.evaluate(()=>{window.qaFixture.fail=false;});await pendingSave().click();
      await page.getByText('Accesos guardados.',{exact:true}).waitFor();
      assert.deepEqual(await page.evaluate(()=>window.qaFixture.posts.at(-1)),{id:'reception',selected:['px.new','px.all','px.dates','clinical_history.intake']});
      await page.getByRole('button',{name:/^Historia clínica/}).click();
      await page.locator('.permission-group').filter({has:page.getByRole('button',{name:/^Historia clínica/})}).screenshot({path:path.join(evidence,'clinical-'+viewport+'.png')});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow: '+viewport);
      const savedIntake=page.getByRole('switch',{name:'Capturar el motivo de consulta en recepción',exact:true});await savedIntake.focus();await savedIntake.press('Space');
      assert.equal(await page.getByText('Accesos guardados.',{exact:true}).count(),0,'Editing again clears the previous save acknowledgement');
      await savedIntake.press('Space');assert.equal(await page.evaluate(()=>window.qaApp.$refs.editor.dirty),false);
      await page.getByRole('button',{name:'Doctor',exact:true}).click();await page.getByRole('heading',{name:'Doctor',exact:true}).waitFor();
      assert.equal(await page.locator('.group-title[aria-expanded="true"]').count(),0);
      await page.getByLabel('Buscar un acceso',{exact:true}).fill('admin');
      await page.getByRole('switch',{name:'Configurar el consultorio',exact:true}).waitFor();
      assert.equal(await page.getByRole('switch',{name:'Configurar el consultorio',exact:true}).isDisabled(),true);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS UX19 browser: desktop/mobile/320px, collapsed overview, keyboard expansion and switches, independent groups, plan/admin locks, search, hidden pending marker, failed-save retention, complete exact payload and role-reset. Synthetic services; no real permission writes.');
  }catch(error){if(page)await page.screenshot({path:path.join(evidence,'qa-failure.png')});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
