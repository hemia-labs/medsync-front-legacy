// Local QA only: actual DocumentsAndSignatures and admin shell, synthetic service responses.
// Creation is answered by a synthetic transport; nothing reaches a backend.
import Vue from 'vue';
import Vuex from 'vuex';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import Admin from '../../../src/core/layouts/admin.vue';
import Documents from '../../../src/views/Patient/Sections/DocumentsAndSignatures.vue';

import { DADocumentService, DAPrescriptionService } from '../../../src/services/context/core-proccess-context';
import MedSyncBrand from '../../../src/components/MedSyncBrand.vue';
import DAPxService from '../../../src/services/core/px/DAPxService';
import '../../../src/assets/tailwind.css';
import '@mdi/font/css/materialdesignicons.css';
Vue.use(Vuex);Vue.use(Router);Vue.component('medsync-brand',MedSyncBrand);Vue.component('da-loader',{render:h=>h('span')});Vue.directive('viewer',{});
const Empty={render:h=>h('span')};
const permissions=['documents.view','documents.sign','documents.create'];
const doctor={id_login:'local-doctor',name:'Profesional QA',rol:'DOCTOR',professional_name:'Profesional QA',active:1,professional_profile_active:1,professional_profile_complete:1};
const getters={getUser:()=>doctor,getRole:()=>'DOCTOR',hasPermission:()=>key=>permissions.includes(key),getBusiness:()=>({name:'Consultorio de pruebas'}),getTenantOperational:()=>({allowed:true}),isAuthorized:()=>true,unauthorized:()=>false,refreshtoken:()=>'',isRefresingToken:()=>false};
const store=new Vuex.Store({modules:{CORE:{namespaced:true,actions:{ActionWrapper:async()=>({success:true})},modules:{AUTH:{namespaced:true,state:{authenticated:true,user:doctor,role:'DOCTOR',permissions,business:{},accessRevision:1},getters},CONFIGURATION:{namespaced:true,getters:{clinicalModules:()=>({})}}}}}});
const router=new Router({mode:'history',routes:[{path:'*',name:'NewPatient',component:Empty}]});
const Shell={...Admin,components:{...Admin.components,LegalUpdateNotice:Empty,TrialNotice:Empty,PulseReturn:Empty,OnboardingCoordinator:Empty,'da-re-login':Empty},methods:{...Admin.methods,loadHeaderLogo(){},loadClinicLogo(){}}};
Vue.config.errorHandler=error=>{document.getElementById('qa-errors').textContent=String(error);};

const review={consent_status:'NO_FIRMADO_POR_NEGATIVA',consent_token:'a'.repeat(64),substitution_token:'a'.repeat(64),pairs:[],diagnostics:[],documents:[{id_patient_document:'negativa-qa',document_type:'SENSITIVE_DATA_CONSENT',status:'NO_FIRMADO_POR_NEGATIVA',title:'Datos personales sensibles',refusal_at:'2026-11-17T10:00:00',created_at:'2026-11-17T09:00:00',refusal_reason:'El paciente decidió no firmar en esa revisión.',doctor_name_snapshot:'Profesional QA'}, {id_patient_document:'firmado-qa',document_type:'SENSITIVE_DATA_CONSENT',status:'FIRMADO',title:'Datos personales sensibles',signed_at:'2026-11-17T12:00:00',created_at:'2026-11-17T11:00:00',doctor_name_snapshot:'Profesional QA'}], candidates:[{refusal_id:'negativa-qa',signed_id:'firmado-qa',can_authorize:true,predicted_status:'FIRMADO',remaining_refusal_ids:[]}]};
const counters=Vue.observable({reads:0,posts:0});
const scenario=new URLSearchParams(window.location.search).get('case') || 'nominal';
DADocumentService.getConsentReview=async()=>{counters.reads++;return {success:true,data:JSON.parse(JSON.stringify(review))};};
DADocumentService.substituteRefusal=async body=>{counters.posts++;
 if(scenario==='conflict' && counters.posts===1){review.substitution_token='b'.repeat(64);return {success:false,status:409,data:{code:'CONSENT_REVIEW_CHANGED'},message:'El consentimiento cambió. Revisa el estado actual; tu motivo se conserva.'};}
 if(scenario==='network') return {success:false,status:0,message:'No se pudo confirmar la autorización. Tu motivo se conserva.'};
 review.consent_status='FIRMADO';review.candidates=[];review.pairs=[{q:body.request_id,r:body.refusal_id,s:body.signed_id,n:body.reason,d:'Profesional QA',effective:true,created_at:'2026-11-17T14:00:00'}];
 return {success:true,status:200,data:JSON.parse(JSON.stringify(review)),message:'Sustitución autorizada. Las historias anteriores se conservan.'};};
if(scenario==='assistant') review.candidates[0].can_authorize=false;
DADocumentService.getPatientDocuments=async()=>({success:true,data:review.documents});
DADocumentService.getTemplates=async()=>({success:true,data:[]});
DAPrescriptionService.doctors=async()=>({success:true,data:[]});

new Vue({router,store,vuetify,render(h){
  return h('v-app',[h('div',{attrs:{id:'qa-errors',role:'alert'}}),h(Shell,[h(Documents,{props:{px:{person:{id_person:'qa-b-patient',name:'Paciente QA',surname:'Sustitución'}}}}), h('p',{attrs:{id:'qa-counters',role:'status'}},`QA local · Ancho ${window.innerWidth} · Lecturas ${counters.reads} · Autorizaciones ${counters.posts}`)])]);
}}).$mount('#app');
