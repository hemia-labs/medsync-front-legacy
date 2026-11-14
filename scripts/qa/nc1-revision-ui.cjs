'use strict';
// Synthetic Vue 2 event/store test using the actual PatientForm handlers and template binding.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="app"></div>');
global.window=dom.window;global.document=dom.window.document;
const Vue=require('vue/dist/vue.common.js');
Vue.config.productionTip=false;Vue.config.devtools=false;
const source=fs.readFileSync(path.resolve(__dirname,'../../src/views/Patient/PatientForm.vue'),'utf8');
const refresh=source.slice(source.indexOf('    async refreshIdentity()'),source.indexOf('    getPatient:'));
const update=source.slice(source.indexOf('    onUpdate: async function(value)'),source.indexOf('\n  computed:')).replace(/\n  },\s*$/,'');
const methods=new Function('mapPatientResponseToForm','moduleTypes','fnTypes','buildSocialMediaPayload','buildPatientPayload',
 'return ({'+refresh+update+'})')(
 x=>({person:{...x.person}}),{PX:'px'},{getById:'get',update:'update'},()=>({}),p=>({...p,person:{...p.person}}));
const binding=source.match(/<identity-editor[^>]+\/>/)[0].replace(' v-else','');
async function main(){
 let submitted;
 const old={name:'Ficticia',surname:'Ensayo',birthday:'2000-01-01',age:26};
 const vm=new Vue({el:'#app',template:'<div>'+binding+'</div>',components:{IdentityEditor:{props:['subject'],template:'<button @click="$emit(\'saved\')">Guardar identidad</button>'}},
  data:()=>({id:'qa',px:{person:old,identity:{revision:1}},patient:{person:{...old,telephone:'draft phone'},query:{reason_consultation:'draft reason'}},hasPxErrorInService:false}),
  methods:{...methods,onCancel(){},async ActionWrapp(module,action,payload){if(action==='get')this.px={person:{...old,surname:'Confirmado'},identity:{revision:2}};else submitted=payload;}}});
 vm.$el.querySelector('button').click();await Vue.nextTick();await Vue.nextTick();
 assert.equal(vm.px.identity.revision,2);assert.equal(vm.patient.person.surname,'Confirmado');
 assert.equal(vm.patient.person.telephone,'draft phone');assert.equal(vm.patient.query.reason_consultation,'draft reason');
 await vm.onUpdate(true);assert.equal(submitted.expectedRevision,2);
 vm.patient.person.name='Unsaved name';await vm.refreshIdentity();assert.equal(vm.patient.person.name,'Unsaved name');
 vm.$destroy();dom.window.close();console.log('PASS NC1-R6: saved event refreshes revision; next update uses revision 2; unrelated drafts retained. Vue 2 with synthetic store.');
}
main().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
