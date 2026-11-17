// Synthetic transport only. Real router, store, patient page, history and application shell.
import Vue from 'vue';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import store from '../../../src/store';
import types from '../../../src/store/modules/common/mutation-types';
import modules from '../../../src/store/modules/common/module-types';
import Admin from '../../../src/core/layouts/admin.vue';
import patientRoutes from '../../../src/router/routes/patient';
import MedSyncBrand from '../../../src/components/MedSyncBrand.vue';
import registerGlobalComponents from '../../../src/plugins/global-components';
import { DACore } from '../../../src/services/config/axios.context';
import { applyTheme, DEFAULT_THEME } from '../../../src/plugins/theme';
import VueSession from 'vue-session';
import VueSignature from 'vue-signature-pad';
import VueSweetalert2 from 'vue-sweetalert2';
import '../../../src/libs/filters';
import '../../../src/libs/directive';
import '../../../src/assets/tailwind.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import '@mdi/font/css/materialdesignicons.css';
Vue.use(Router); Vue.use(VueSession,{persist:false}); Vue.use(VueSignature); Vue.use(VueSweetalert2);
Vue.component('medsync-brand',MedSyncBrand); Vue.directive('viewer',{}); registerGlobalComponents(Vue);
const params=new URLSearchParams(location.search), mode=params.get('state')||'incomplete';
const clone=v=>JSON.parse(JSON.stringify(v)), reply=data=>({success:true,status:200,data});
const sections=[
  {key:'identification',label:'Identificación al cierre',fields:[{key:'full_name',label:'Nombre completo'},{key:'age',label:'Edad'},{key:'sex',label:'Sexo biológico'}]},
  {key:'consultation',label:'Motivo de consulta',fields:[{key:'reason',label:'Motivo de consulta'},{key:'current_condition',label:'Padecimiento actual'}]},
  {key:'family_history',label:'Antecedentes familiares',fields:[{key:'relevant',label:'Antecedentes relevantes'}]},
  {key:'allergies_medications',label:'Alergias y medicamentos',fields:[{key:'allergy_status',label:'Estado de alergias'},{key:'current_medications',label:'Medicamentos actuales'}]},
  {key:'physical_exam',label:'Exploración física',fields:[{key:'general',label:'Exploración general'}]},
  {key:'vital_signs',label:'Signos vitales',fields:[{key:'weight',label:'Peso',unit:'kg'},{key:'temperature',label:'Temperatura',unit:'°C'},{key:'height',label:'Talla',unit:'cm'}]},
  {key:'diagnosis',label:'Diagnóstico',fields:[{key:'initial_diagnosis',label:'Diagnóstico inicial'}]},
  {key:'therapeutic_plan',label:'Plan terapéutico',fields:[{key:'initial_plan',label:'Plan inicial'},{key:'followup',label:'Seguimiento'}]}
].map((s,order)=>({...s,order,fields:s.fields.map(f=>({type:'textarea',...f}))}));
const schema={sections};
const snapshot={identification:{full_name:'Ana QA Apellido Histórico',age:36,sex:'Mujer'},consultation:{reason:'Consulta sintética UX5',current_condition:'Primera línea conservada.\n'+('Texto clínico sintético extenso para comprobar lectura completa. '.repeat(35))+'\nÚltima línea conservada.'},family_history:{relevant:'Sin antecedentes referidos'},allergies_medications:{allergy_status:'UNKNOWN',current_medications:null,allergies:['Dato sintético']},physical_exam:{general:'Exploración sintética sin hallazgos'},vital_signs:{weight:0,temperature:36.5,height:165,height_unit:'cm'},diagnosis:{initial_diagnosis:'Diagnóstico de demostración'},therapeutic_plan:{initial_plan:'Plan de demostración.\nSe conserva el salto de línea.',followup:false},legacy_extra:{note:'Campo anterior sin metadatos; debe conservarse'}};
const professional={professional_name:'Valeria QA Histórica',professional_license:'QA00000000',specialty:'Medicina general'};
const base={id_person:'qa-patient',revision:4,template_snapshot_json:schema,clinical_snapshot_json:snapshot,template_name:'Formato histórico QA',template_version_number:1,created_at:'2026-11-16T12:00:00Z',updated_at:'2026-11-16T13:00:00Z',finalized_at:'2026-11-16T14:00:00Z',created_by_name:'Capturista QA',updated_by_name:'Profesional QA',doctor_responsible_user_id:'qa-doctor',responsible_snapshot_json:professional,finalizer_snapshot_json:professional};
const older={...clone(base),id_clinical_history:'qa-history-v1',version_number:1,status:'FINALIZED',consent_document_id:'historical-signed',consent_status:'CANCELADO'};
const latest={...clone(base),id_clinical_history:'qa-history-v2',version_number:2,status:mode==='finalized'?'FINALIZED':mode==='draft'?'DRAFT':'INCOMPLETE',consent_document_id:mode==='no-id'?null:'historical-refusal',consent_status:'FIRMADO'};
if(mode==='legacy'){latest.template_snapshot_json=null;latest.template_name=null;latest.template_version_number=null;latest.responsible_snapshot_json=null;latest.finalizer_snapshot_json=null;}
let histories=[latest,older];
const patient={person:{id_person:'qa-patient',name:'Ana QA',surname:'Nombre Actual',fullname:'Ana QA Nombre Actual',birthday:'1990-04-12',age:36,telephone:'5500000999',active:1,code:'QA-UX5'},address:{direction:'Domicilio actual, no usar en historia'},query:{},identity:{givenNames:'Ana QA',firstSurname:'Nombre',secondSurname:'Actual',biologicalSex:'2',revision:1},access:{clinical:true},allergy:{review_status:'not_reviewed',items:[]},family_parents:[],family_grandparents:[],family_brothers:[],patologic:[]};
const currentDocument={id_patient_document:'current-signed',document_type:'SENSITIVE_DATA_CONSENT',status:'FIRMADO'};
window.qaRequests=[];
async function transport(method,url,payload){
  const path=String(url).replace(/^\/+/, '').replace(/^api\//,'').split('?')[0];window.qaRequests.push({method,path});
  if(/saas-legal\/notice/.test(path))return reply({pending_count:0,business_pending:false,central_sync_pending:false});
  if(path==='px/get/qa-patient')return reply(clone(patient));
  if(path==='clinical-history/patient/qa-patient/versions')return reply({versions:clone(histories)});
  if(path==='clinical-history/patient/qa-patient')return reply({history:clone(histories[0]),consent_status:'FIRMADO',consent_document_id:'current-signed'});
  if(path==='clinical-history-template/current')return reply({template:{name:'Formato ACTUAL no histórico',schema_json:schema,version_number:5}});
  if(path==='clinical-history/draft') { const draft={...clone(latest),id_clinical_history:'qa-draft-v3',version_number:3,status:'DRAFT',consent_document_id:null,clinical_snapshot_json:payload.clinical_snapshot_json||clone(snapshot)}; histories.unshift(draft);return reply({history:clone(draft)}); }
  if(/^clinical-history\/qa-/.test(path)){const found=histories.find(h=>path==='clinical-history/'+h.id_clinical_history);if(found)return reply({history:clone(found)});}
  if(path==='document/patient/qa-patient')return reply([currentDocument]);
  if(path.startsWith('document/patient/qa-patient/'))return {success:false,status:404,message:'No accesible',data:null};
  if(path==='prescription/doctors')return reply([{...professional,id_login:'qa-doctor',is_active:1,can_sign_documents:1,can_issue_prescriptions:1}]);
  if(path==='document/templates')return reply([]);
  if(path==='business/current')return reply({id_business:'qa-clinic',name:'Consultorio de pruebas'});
  return reply(/list|all|catalog|family|patologic|templates|doctors|modules|history|notes|dates|permissions|roles/.test(path)?[]:null);
}
['get','post','put','patch','delete'].forEach(method=>{DACore[method]=(url,payload)=>transport(method,url,payload);});
store.commit(modules.AUTH+'/'+types.SET_D2_AUTH_SESSION,{authenticated:true,sessionState:'active',accessExpiresAt:'later',user:{id_login:'qa-doctor',id_session:'qa-session',id_business:'qa-clinic',rol:'doctor',name:'Valeria QA Actual'},business:{id_business:'qa-clinic',name:'Consultorio de pruebas'},role:'doctor',permissions:['px.tab.history','px.all','px.new','px.edit','clinical_history.view','clinical_history.view_sensitive','clinical_history.edit_draft','clinical_history.create_draft','clinical_history.print','clinical_history.finalize','documents.view','documents.config','prescriptions.view.own','clinical_history_template.view','admin.config']});
const Empty={render:h=>h('span')};
const router=new Router({mode:'history',routes:[...patientRoutes,{path:'*',component:Empty}]});
const Shell={...Admin,components:{...Admin.components,LegalUpdateNotice:Empty,TrialNotice:Empty,PulseReturn:Empty,OnboardingCoordinator:Empty,'da-re-login':Empty},methods:{...Admin.methods,loadHeaderLogo(){},loadClinicLogo(){}}};
if(params.get('theme')==='night')setTimeout(()=>applyTheme({...DEFAULT_THEME,code:'clinical-night'}),0);
Vue.config.errorHandler=error=>console.error(error);
new Vue({router,store,vuetify,render:h=>h('v-app',[h(Shell,[h('router-view')])])}).$mount('#app');
