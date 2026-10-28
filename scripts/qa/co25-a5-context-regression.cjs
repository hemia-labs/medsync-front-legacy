'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/views/Patient/Sections/MedicalHistory.vue'),'utf8');
const calls=[];let documentRead=async()=>({success:true,data:[{id:'consent'}]});
const method=vm.runInNewContext('({'+source.slice(source.indexOf('async loadConsentStatus('),source.indexOf('async loadClinicalHistory('))+'})',{
 DADocumentService:{getPatientDocuments:async()=>{calls.push('documents');return documentRead();},getTemplates:async()=>{calls.push('templates');return{success:true,data:[{id:'template'}]};}},
 DAPrescriptionService:{doctors:async()=>{calls.push('doctors');return{success:true,data:[{id:'doctor'}]};}}
}).loadConsentStatus;
const state=allowed=>({canViewConsent:allowed,canViewConsentTemplates:allowed,canViewResponsibleDoctors:allowed,loadRequest:1,patientId:'patient',documents:[{old:true}],templates:[{old:true}],doctors:[{old:true}],applyDefaultResponsibleDoctor(){}});
(async()=>{
 let s=state(false);await method.call(s);assert.equal(calls.length,0);assert.equal(s.documents.length+s.templates.length+s.doctors.length,0);assert.match(s.contextError,/acceso/);
 console.log('PASS missing context permissions make no forbidden requests and do not retain old protected context');
 s=state(false);s.canViewConsent=s.canViewConsentTemplates=true;await method.call(s);assert.deepEqual(calls,['documents','templates']);assert.equal(s.doctors.length,0);assert.match(s.contextError,/acceso/);
 console.log('PASS independent document permission preserves readable context without requesting prescription doctors');
 calls.length=0;s=state(true);await method.call(s);assert.deepEqual(calls,['documents','templates','doctors']);assert.equal(s.contextError,'');assert.equal(s.documents[0].id,'consent');
 console.log('PASS authorized complete context retains existing behavior');
 let resolve;documentRead=()=>new Promise(r=>resolve=r);s=state(true);const pending=method.call(s);s.loadRequest=2;resolve({success:true,data:[{id:'late'}]});await pending;assert.equal(s.documents[0].old,true);
 console.log('PASS late context response cannot replace the current patient context');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
