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
 // The unified patient form is covered by the real component/service suite.
 require('node:child_process').execFileSync(process.execPath,[path.join(root,'scripts/qa/nc1-ux1/check.cjs')],{stdio:'inherit'});
 let profilePayload;
 const pro=load('src/views/User/components/DAProfessionalProfile.vue',{IdentityEditor:Editor,PreparationGuide:{},focusControl:()=>{},DAUserService:{saveProfessionalProfile:async(id,p)=>{profilePayload=p;return {success:true,data:{...p,id_doctor_professional_profile:'qa'}};}},buildLicenseLimitMessage:()=>'',mapGetters:()=>({}),moduleTypes:{AUTH:'auth'},fnTypes:{},getSettingsSections:()=>[],confirmSettingsDiscard:async()=>true,registerSettingsNavigationGuard:()=>()=>{}});
 pro.options.watch={};pro.options.mounted=undefined;pro.options.template='<div>'+pro.source.match(/<identity-editor[^>]+\/>/)[0]+'</div>';
 const p=new Vue({...pro.options,el:'#professional',propsData:{idLogin:'actor'}});
 p.form.professional_name='Nombre anterior';p.baseline=JSON.stringify(p.form);p.form.professional_phone='5512345678';p.form.university='Universidad pendiente';
 const e=p.$children[0];e.draft={givenNames:'Ana'};e.baseline={};e.revision=1;await e.save();await Vue.nextTick();
 assert.equal(p.form.professional_name,'Ana De la Prueba Ensayo');assert.equal(JSON.parse(p.baseline).professional_name,p.form.professional_name);assert.equal(p.hasUnsavedChanges,true);
 assert.equal(p.form.university,'Universidad pendiente');await p.save();
 assert.equal(profilePayload.professional_name,'Ana De la Prueba Ensayo');assert.equal(profilePayload.university,'Universidad pendiente');assert.equal(profilePayload.professional_phone,'5512345678');
 p.form.professional_name='Pendiente';p.onIdentitySaved(identity);assert.equal(p.form.professional_name,'Pendiente');assert.equal(p.identityConflict,true);
 p.useSavedIdentityName();assert.equal(p.form.professional_name,'Ana De la Prueba Ensayo');assert.equal(p.identityConflict,false);
 p.$destroy();console.log('PASS R3/R15: real save event, drafts/revision, dirty name/date preservation and explicit reconciliation; Vue 2, synthetic services.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
