import Vue from 'vue';
import Vuex from 'vuex';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import Admin from '../../../src/core/layouts/admin.vue';
import PatientShow from '../../../src/views/Patient/PatientShow.vue';
import MedicalHistory from '../../../src/views/Patient/Sections/MedicalHistory.vue';
import { DACore } from '../../../src/services/config/axios.context';
import MedSyncBrand from '../../../src/components/MedSyncBrand.vue';
import HistoryService from '../../../src/services/core/clinicalHistory/DAClinicalHistoryService';
import { fixture,clone,fixtureTransport } from './fixture';
import '../../../src/assets/tailwind.css';
import '@mdi/font/css/materialdesignicons.css';
DACore.get=async url=>url==='api/px/get/nc1-local-only'?{success:true,data:await fixtureTransport.get()}:{success:false,status:404,message:'QA local: ruta no simulada'};
DACore.put=async(url,payload)=>url==='api/px/administrative'?fixtureTransport.put(payload):{success:false,status:404};
Vue.use(Vuex);Vue.use(Router);Vue.component('medsync-brand',MedSyncBrand);Vue.directive('viewer',{});
const Empty={render:h=>h('span')};Vue.component('da-dialog',Empty);
const permissions=['px.new','px.all','px.dates','px.tab.history','documents.view','clinical_history.view','clinical_history.view_sensitive','clinical_history.edit_draft','clinical_history.create_draft','clinical_history.finalize','clinical_history.print'];
const doctor={id_login:'local-doctor',name:'Profesional QA',rol:'DOCTOR',professional_name:'Profesional QA',professional_license:'QA000000',active:1,professional_profile_active:1,professional_profile_complete:1};
const getters={getUser:()=>doctor,getRole:()=>'DOCTOR',hasPermission:()=>key=>permissions.includes(key),getBusiness:()=>({name:'Consultorio de pruebas'}),getTenantOperational:()=>({allowed:true}),isAuthorized:()=>true,unauthorized:()=>false,refreshtoken:()=>'',isRefresingToken:()=>false};
const store=new Vuex.Store({modules:{CORE:{namespaced:true,actions:{ActionWrapper:async()=>({success:true,data:clone(fixture.patient)})},modules:{AUTH:{namespaced:true,state:{authenticated:true,user:doctor,role:'DOCTOR',permissions,business:{},accessRevision:1},getters},PX:{namespaced:true,mutations:{SET_PX(state,patient){fixture.patient=patient;}},getters:{getPx:()=>fixture.patient}},CONFIGURATION:{namespaced:true,getters:{clinicalModules:()=>({})}}}}}});
const router=new Router({mode:'history',routes:[{path:'*',name:'ShowPx',component:Empty}]});
// Keep actual shell/template/styles/navigation. Suppress unrelated service-backed widgets in isolated QA.
const Shell={...Admin,components:{...Admin.components,LegalUpdateNotice:Empty,TrialNotice:Empty,PulseReturn:Empty,OnboardingCoordinator:Empty,'da-re-login':Empty},methods:{...Admin.methods,loadHeaderLogo(){},loadClinicLogo(){}}};
let record=null;
// Synthetic versioned template: exercise the real section navigation, never a staging record.
const template={sections:[
  {key:'consultation',label:'Consulta',fields:[{key:'reason',label:'Motivo de consulta',type:'textarea',required:true},{key:'current_condition',label:'Padecimiento actual',type:'textarea',required:true}]},
  {key:'family_history',label:'Antecedentes familiares',fields:[{key:'relevant',label:'Antecedentes relevantes',type:'textarea'}]},
  {key:'physical_exam',label:'Exploración física',fields:[{key:'general',label:'Exploración general',type:'textarea',required:true}]},
  {key:'vital_signs',label:'Signos vitales',fields:[{key:'weight',label:'Peso (kg)',type:'number'},{key:'height',label:'Talla (cm)',type:'number'},{key:'bmi',label:'IMC',type:'number'}]},
  {key:'observations',label:'Observaciones',fields:[{key:'general',label:'Observaciones generales',type:'textarea'}]}
]};
const History={...MedicalHistory,methods:{...MedicalHistory.methods,
  async loadInitialData(){this.isLoading=false;this.historyLoaded=true;this.doctors=[doctor];this.doctorResponsibleUserId=doctor.id_login;this.documents=[{id_patient_document:'qa-consent',document_type:'SENSITIVE_DATA_CONSENT',status:'FIRMADO'}];
    if(!record){const snapshot=this.buildLegacySnapshot();snapshot.identification.phone='5500000015';snapshot.identification.address='Calle Sintética A';record={id_clinical_history:'local-history',status:'DRAFT',revision:1,version_number:1,doctor_responsible_user_id:doctor.id_login,clinical_snapshot_json:snapshot};}
    record.template_snapshot_json=clone(template);record.template_name='Historia sintética QA';record.template_version=1;
    this.clinicalHistory=clone(record);this.applyHistoryToForm(this.clinicalHistory);},async loadClinicalHistoryVersions(){},notify(){}}};
HistoryService.updateDraft=async(id,payload)=>{record={...record,revision:record.revision+1,...clone(payload)};delete record.expected_revision;return {success:true,data:{history:clone(record)}};};
HistoryService.finalize=async()=>{record={...record,status:'FINALIZED',revision:record.revision+1};return {success:true,data:{history:clone(record)}};};
const Patient={...PatientShow,components:{...PatientShow.components,'da-medical-history':History,'da-upload-file':Empty}};
Vue.config.errorHandler=error=>{document.getElementById('qa-errors').textContent=String(error);};
Vue.prototype.$swal={fire:async()=>({isConfirmed:false})};
new Vue({router,store,vuetify,data:()=>({fixture}),render(h){
  const controls=h('div',{style:{padding:'12px 16px',background:'#fff4ce'}},[
    h('strong',fixture.notice),h('label',{style:{marginLeft:'16px'}},['Resultado simulado ',h('select',{attrs:{'aria-label':'Resultado simulado'},domProps:{value:fixture.outcome},on:{change:e=>fixture.outcome=e.target.value}},['success','400','409','401','network'].map(v=>h('option',{domProps:{value:v}},v)))]),h('span',{attrs:{id:'qa-request-count'},style:{marginLeft:'12px'}},`Escrituras simuladas: ${fixture.requests.length}`)]);
  return h('v-app',[h('div',{attrs:{id:'qa-errors',role:'alert'}}),h(Shell,[controls,h(Patient,{props:{id:'nc1-local-only'}})])]);
}}).$mount('#app');
