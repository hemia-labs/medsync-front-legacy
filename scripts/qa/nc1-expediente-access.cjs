'use strict';
// Component integration in JSDOM; visual QA uses the real local app separately.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');const dom=new JSDOM('<div id="app"></div>');
global.window=dom.window;global.document=dom.window.document;
const Vue=require('vue/dist/vue.common.js');Vue.config.productionTip=false;Vue.config.devtools=false;
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/views/Patient/PatientShow.vue'),'utf8');
const context={mapGetters:()=>({}),mapActions:()=>({}),VuexMixin:{},DAHistoryHeader:{},DAAlergyAlert:{},AllergyEditor:{},PatientAdministrativeForm:{},DASweetConfirm:{},DocumentsAndSignatures:{},DELETE:{},moduleTypes:{AUTH:{},PX:'CORE/PX',CONFIGURATION:{}},fnTypes:{},mutationTypes:{SET_PX:'SET_PX'}};
vm.runInNewContext(source.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','component ='),context);
const methods=context.component.methods;
async function main(){
  let prompted=0;
  const view={canManagePatient:false,isEdit:false,administrativeEdit:false,confirmSectionLeave:async()=>{prompted++;return true;}};
  await methods.requestAdministrativeEdit.call(view);assert.equal(view.isEdit,false);assert.equal(prompted,0);
  view.canManagePatient=true;view.confirmSectionLeave=async()=>false;await methods.requestAdministrativeEdit.call(view);assert.equal(view.isEdit,false);
  view.confirmSectionLeave=async()=>{prompted++;return true;};await methods.requestAdministrativeEdit.call(view);assert.equal(view.isEdit,true);assert.equal(view.administrativeEdit,true);
  const previous=prompted;await methods.requestAdministrativeEdit.call(view);assert.equal(prompted,previous,'opening twice is blocked');
  const headerSource=fs.readFileSync(path.join(root,'src/views/Patient/components/DAHistoryHeader.vue'),'utf8');
  const header=new Function(headerSource.split('<script>')[1].split('</script>')[0].replace('export default','return'))();
  header.template=headerSource.slice(headerSource.indexOf('<template>')+10,headerSource.lastIndexOf('</template>'));
  Vue.component('v-icon',{template:'<span><slot/></span>'});
  Vue.component('v-btn',{template:'<button @click="$emit(\'click\')"><slot/></button>'});
  Vue.component('v-tooltip',{render(h){return h('span',this.$scopedSlots.activator?this.$scopedSlots.activator({on:{},attrs:{}}):[]);}});
  const parent=new Vue({el:'#app',components:{Header:header},data:()=>({canManagePatient:true,isEdit:false,administrativeEdit:false,px:{person:{name:'Sintética',surname:'Prueba'}}}),methods:{requestAdministrativeEdit:methods.requestAdministrativeEdit,confirmSectionLeave:async()=>true},template:'<div><Header :px="px" :can-edit="canManagePatient" :editing="isEdit" @edit-patient="requestAdministrativeEdit"/><div v-if="isEdit && administrativeEdit" id="administrative-editor"/></div>'});
  const action=()=>Array.from(parent.$el.querySelectorAll('button')).find(el=>el.textContent.includes('Editar datos del paciente'));
  assert.ok(action());action().click();await Vue.nextTick();await Vue.nextTick();assert.ok(parent.$el.querySelector('#administrative-editor'));assert.equal(action(),undefined);
  parent.isEdit=false;parent.canManagePatient=false;await Vue.nextTick();assert.equal(action(),undefined,'permission hides real header action');
  const commits=[];const refresh={canManagePatient:true,id:'qa',isEdit:true,$store:{commit:(...args)=>commits.push(args)}};
  methods.onAdministrativeRefreshed.call(refresh,{person:{id_person:'foreign'}});assert.equal(commits.length,0);
  methods.onAdministrativeRefreshed.call(refresh,{person:{id_person:'qa'}});assert.equal(commits[0][0],'CORE/PX/SET_PX');assert.equal(refresh.isEdit,true,'partial save refresh does not unmount capture');
  methods.onAdministrativeSaved.call(refresh);assert.equal(refresh.isEdit,false);
  parent.$destroy();console.log('PASS patient access: real header event, permission, clinical leave guard, repeated-open guard and partial-refresh lifecycle. JSDOM, no network.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>dom.window.close());
