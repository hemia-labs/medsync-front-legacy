// Local QA only: renders the actual PatientCreate view in the actual admin shell.
// Creation is answered by a synthetic transport; nothing reaches a backend.
import Vue from 'vue';
import Vuex from 'vuex';
import Router from 'vue-router';
import vuetify from '../../../src/plugins/vuetify';
import Admin from '../../../src/core/layouts/admin.vue';
import PatientCreate from '../../../src/views/Patient/PatientCreate.vue';
import MedSyncBrand from '../../../src/components/MedSyncBrand.vue';
import DAPxService from '../../../src/services/core/px/DAPxService';
import '../../../src/assets/tailwind.css';
import '@mdi/font/css/materialdesignicons.css';
const sent=[];
DAPxService.createMinimal=async payload=>{sent.push(JSON.parse(JSON.stringify(payload)));window.qaSent=sent;return {success:false,status:400,message:'QA local: alta simulada sin backend. Revisa window.qaSent.'};};
Vue.use(Vuex);Vue.use(Router);Vue.component('medsync-brand',MedSyncBrand);Vue.directive('viewer',{});
const Empty={render:h=>h('span')};
const permissions=['px.new','px.all'];
const doctor={id_login:'local-doctor',name:'Profesional QA',rol:'DOCTOR',professional_name:'Profesional QA',active:1,professional_profile_active:1,professional_profile_complete:1};
const getters={getUser:()=>doctor,getRole:()=>'DOCTOR',hasPermission:()=>key=>permissions.includes(key),getBusiness:()=>({name:'Consultorio de pruebas'}),getTenantOperational:()=>({allowed:true}),isAuthorized:()=>true,unauthorized:()=>false,refreshtoken:()=>'',isRefresingToken:()=>false};
const store=new Vuex.Store({modules:{CORE:{namespaced:true,actions:{ActionWrapper:async()=>({success:true})},modules:{AUTH:{namespaced:true,state:{authenticated:true,user:doctor,role:'DOCTOR',permissions,business:{},accessRevision:1},getters},CONFIGURATION:{namespaced:true,getters:{clinicalModules:()=>({})}}}}}});
const router=new Router({mode:'history',routes:[{path:'*',name:'NewPatient',component:Empty}]});
const Shell={...Admin,components:{...Admin.components,LegalUpdateNotice:Empty,TrialNotice:Empty,PulseReturn:Empty,OnboardingCoordinator:Empty,'da-re-login':Empty},methods:{...Admin.methods,loadHeaderLogo(){},loadClinicLogo(){}}};
Vue.config.errorHandler=error=>{document.getElementById('qa-errors').textContent=String(error);};
new Vue({router,store,vuetify,render(h){
  return h('v-app',[h('div',{attrs:{id:'qa-errors',role:'alert'}}),h(Shell,[h(PatientCreate)])]);
}}).$mount('#app');
