'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/views/Patient/PatientShow.vue'), 'utf8');
const context = { mapGetters: () => ({}), mapActions: () => ({}), VuexMixin: {},
  DAHistoryHeader: {}, DAAlergyAlert: {}, AllergyEditor: {}, PatientAdministrativeForm: {},
  DASweetConfirm: {}, DocumentsAndSignatures: {}, moduleTypes: {AUTH:{},PX:{},CONFIGURATION:{}}, fnTypes: {} };
vm.runInNewContext(source.split('<script>')[1].split('</script>')[0]
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
const methods = context.component.methods;
async function main() {
  let prompted = 0;
  const view = { canManagePatient: false, isEdit: false, administrativeEdit: false,
    confirmSectionLeave: async () => { prompted++; return true; } };
  await methods.requestAdministrativeEdit.call(view);
  assert.equal(view.isEdit, false); assert.equal(prompted, 0);
  view.canManagePatient = true;
  view.confirmSectionLeave = async () => false;
  await methods.requestAdministrativeEdit.call(view);
  assert.equal(view.isEdit, false, 'clinical draft refusal keeps current view');
  view.confirmSectionLeave = async () => true;
  await methods.requestAdministrativeEdit.call(view);
  assert.equal(view.isEdit, true); assert.equal(view.administrativeEdit, true);
  await methods.requestPatientEdit.call(view);
  assert.equal(view.administrativeEdit, false, 'existing clinical edit remains available');
  const template = source.slice(source.indexOf('<template>')+10, source.lastIndexOf('</template>'));
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try { for (const width of [390,1280]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    await page.route('**/*', route => route.abort());
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({path:require.resolve('vue/dist/vue.js')});
    await page.evaluate(({template, open}) => {
      const stub = {template:'<div><slot/></div>'};
      Vue.component('v-btn',{template:'<button @click="$emit(\'click\')"><slot/></button>'});
      for(const name of ['v-alert','v-icon','v-tabs','v-tabs-items','v-tab','v-tab-item']) Vue.component(name,stub);
      for(const name of ['da-history-header','da-alergy-alert','da-dialog','da-upload-file','AllergyEditor']) Vue.component(name,{template:'<div/>'});
      Vue.component('PatientAdministrativeForm',{template:'<div id="admin-editor">Administrative editor</div>'});
      Vue.component('da-patient-form',{template:'<div id="clinical-editor">Clinical editor</div>'});
      window.qa = new Vue({el:'#app',template,data:()=>({canReturnToAgenda:false,loadingPatient:false,patientError:'',patientReady:true,tabAccessNotice:'',px:{person:{}},canManagePatient:true,archivePending:false,canViewClinical:true,isEditProfile:false,isArchived:false,isEdit:false,administrativeEdit:false,allowedTabs:[],canEditAllergies:false,isDelete:false,isUploadFile:false,canEditClinical:true,id:'synthetic'}),methods:{requestAdministrativeEdit:new Function('return '+open)(),confirmSectionLeave:async()=>true}});
    },{template,open:methods.requestAdministrativeEdit.toString().replace('async requestAdministrativeEdit()', 'async function()')});
    await page.getByRole('button',{name:'Editar datos e identidad',exact:true}).click();
    await page.locator('#admin-editor').waitFor();
    assert.equal(await page.locator('#clinical-editor').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.close();
  }} finally {await browser.close();}
  console.log('PASS: permission, clinical draft guard, administrative editor for clinical profile, 390/1280. Synthetic shell with UI stubs.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
