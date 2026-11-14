'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');const dom=new JSDOM('<div id="admin"></div><div id="professional"></div>');
global.window=dom.window;global.document=dom.window.document;
const Vue=require('vue/dist/vue.common.js');Vue.config.productionTip=false;Vue.config.devtools=false;
const root=path.resolve(__dirname,'../..');
function load(file,deps){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const code=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm,'').replace('export default','return');
 return {source,options:new Function(...Object.keys(deps),code)(...Object.values(deps))};
}
const identity={givenNames:'Ana',firstSurname:'De la Prueba',secondSurname:'Ensayo',firstSurnameStatus:'present',secondSurnameStatus:'present',birthDate:'2000-01-31',revision:2};
const Editor=load('src/components/identity/IdentityEditor.vue',{IdentityFields:{},DACore:{patch:async()=>({success:true,data:identity})},authorizationContext:()=>({}),isCurrentAuthorization:()=>true}).options;
Editor.template='<button @click="save">Identidad</button>';Editor.mounted=undefined;
async function main(){
 let administrativePayload,profilePayload;
 const admin=load('src/views/Patient/components/PatientAdministrativeForm.vue',{IdentityEditor:Editor,DAPxService:{updateAdministrative:async p=>{administrativePayload=p;return {success:true};}},patientAge:()=>26,patientAdministrativeErrors:()=>({}),normalizePatientPhone:x=>x,localDateString:()=> '2026-11-13'});
 admin.options.template='<div>'+admin.source.match(/<identity-editor[^>]+\/>/)[0]+'</div>';
 const parent=new Vue({el:'#admin',components:{Admin:admin.options},template:'<admin v-if="editing" :patient="patient" @saved="editing=false"/>',data:()=>({editing:true,patient:{person:{id_person:'qa',name:'Anterior',surname:'Nombre',birthday:'31-01-2000',telephone:'5500000000'},address:{direction:'Anterior'},identity:{revision:1}}})});
 const a=parent.$children[0],editor=a.$children[0];a.form.person.telephone='5512345678';a.form.person.ocupation='Borrador';a.form.address.direction='Domicilio pendiente';
 editor.draft={givenNames:'Ana'};editor.baseline={};editor.revision=1;await editor.save();await Vue.nextTick();
 assert.equal(parent.editing,true);assert.equal(parent.$children[0],a,'administrative form stays mounted');
 assert.equal(a.form.person.telephone,'5512345678');assert.equal(a.form.person.ocupation,'Borrador');assert.equal(a.form.address.direction,'Domicilio pendiente');assert.equal(a.form.person.surname,'De la Prueba Ensayo');
 a.$refs.form={validate:()=>true};await a.save();await Vue.nextTick();
 assert.equal(administrativePayload.expectedRevision,2);assert.equal(administrativePayload.address.direction,'Domicilio pendiente');assert.equal(administrativePayload.person.telephone,'5512345678');assert.equal(parent.editing,false,'only administrative submit closes parent');
 const pro=load('src/views/User/components/DAProfessionalProfile.vue',{IdentityEditor:Editor,PreparationGuide:{},focusControl:()=>{},DAUserService:{saveProfessionalProfile:async(id,p)=>{profilePayload=p;return {success:true,data:{...p,id_doctor_professional_profile:'qa'}};}},buildLicenseLimitMessage:()=>'',mapGetters:()=>({}),moduleTypes:{AUTH:'auth'},fnTypes:{},getSettingsSections:()=>[],confirmSettingsDiscard:async()=>true,registerSettingsNavigationGuard:()=>()=>{}});
 pro.options.watch={};pro.options.mounted=undefined;pro.options.template='<div>'+pro.source.match(/<identity-editor[^>]+\/>/)[0]+'</div>';
 const p=new Vue({...pro.options,el:'#professional',propsData:{idLogin:'actor'}});
 p.form.professional_name='Nombre anterior';p.baseline=JSON.stringify(p.form);p.form.professional_phone='5512345678';p.form.university='Universidad pendiente';
 const e=p.$children[0];e.draft={givenNames:'Ana'};e.baseline={};e.revision=1;await e.save();await Vue.nextTick();
 assert.equal(p.form.professional_name,'Ana De la Prueba Ensayo');assert.equal(JSON.parse(p.baseline).professional_name,p.form.professional_name);assert.equal(p.hasUnsavedChanges,true);
 assert.equal(p.form.university,'Universidad pendiente');await p.save();
 assert.equal(profilePayload.professional_name,'Ana De la Prueba Ensayo');assert.equal(profilePayload.university,'Universidad pendiente');assert.equal(profilePayload.professional_phone,'5512345678');
 const dirty=new Vue({...admin.options,propsData:{patient:{person:{id_person:'qa',name:'Original',surname:'Ensayo',birthday:'2000-01-31'},address:{},identity:{revision:1}}}});
 dirty.form.person.name='Pendiente';dirty.form.person.birthday='2001-02-03';dirty.onIdentitySaved(identity);
 assert.equal(dirty.form.person.name,'Pendiente');assert.equal(dirty.form.person.birthday,'2001-02-03');assert.equal(dirty.identityConflict,true);
 dirty.useSavedIdentity();assert.equal(dirty.form.person.name,'Ana');assert.equal(dirty.form.person.birthday,'2000-01-31');assert.equal(dirty.identityConflict,false);
 p.form.professional_name='Pendiente';p.onIdentitySaved(identity);assert.equal(p.form.professional_name,'Pendiente');assert.equal(p.identityConflict,true);
 p.useSavedIdentityName();assert.equal(p.form.professional_name,'Ana De la Prueba Ensayo');assert.equal(p.identityConflict,false);
 dirty.$destroy();p.$destroy();parent.$destroy();console.log('PASS R3/R15: real save event, drafts/revision, dirty name/date preservation and explicit reconciliation; Vue 2, synthetic services.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
