/* Browser-only synthetic host. Components use their real scripts/templates; transport calls real local API. */
(async()=>{
 let csrf='';
 async function api(url,method='GET',data){
  const r=await fetch('/'+url.replace(/^\//,''),{method,credentials:'same-origin',headers:{'content-type':'application/json',...(method==='GET'?{}:{'X-CSRF-Token':csrf})},...(data?{body:JSON.stringify(data)}:{})});
  const body=await r.json();return {...body,success:r.ok};
 }
 async function token(){const r=await api('api/auth/csrf');if(!r.success)throw Error('CSRF failed');csrf=r.data.csrfToken;}
 const DACore={get:url=>api(url),patch:(url,data)=>api(url,'PATCH',data)};
 async function component(file,deps){
  const source=await (await fetch('/source/'+file)).text();
  const script=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm,'').replace('export default','return');
  const options=new Function(...Object.keys(deps),script)(...Object.values(deps));
  options.template=source.slice(source.indexOf('<template>')+10,source.lastIndexOf('</template>'));
  const style=source.match(/<style[^>]*>([\s\S]*?)<\/style>/);if(style){const el=document.createElement('style');el.textContent=style[1];document.head.append(el);}
  return options;
 }
 const validationText=await (await fetch('/source/domain/patient/administrative.validation.js')).text();
 const validation=new Function(validationText.replace(/export /g,'')+';return {patientAge,patientAdministrativeErrors,normalizePatientPhone,localDateString};')();
 const IdentityFields=await component('components/identity/IdentityFields.vue',{});
 const authText=await (await fetch('/source/security/authorizationContext.js')).text();
 const auth=new Function(authText.replace(/export /g,'')+';return {authorizationContext,isCurrentAuthorization};')();
 const IdentityEditor=await component('components/identity/IdentityEditor.vue',{IdentityFields,DACore,...auth});
 const Admin=await component('views/Patient/components/PatientAdministrativeForm.vue',{IdentityEditor,...validation,DAPxService:{updateAdministrative:d=>api('api/px/administrative','PUT',d)}});
 const Profile=await component('views/User/components/DAProfessionalProfile.vue',{IdentityEditor,PreparationGuide:{render:h=>h('span')},focusControl:()=>{},DAUserService:{getProfessionalProfile:id=>api('api/user/professional-profile/'+id),saveProfessionalProfile:(id,d)=>api('api/user/professional-profile/'+id,'POST',d)},buildLicenseLimitMessage:(_r,msg)=>msg,mapGetters:()=>({}),moduleTypes:{AUTH:'CORE/AUTH'},fnTypes:{},getSettingsSections:()=>[],confirmSettingsDiscard:async()=>true,registerSettingsNavigationGuard:()=>()=>{}});
 // Host-only navigation/help controls; identity/admin/profile fields are unchanged product components.
 Vue.component('da-button-primary',{props:['label','disabled'],template:'<button :disabled="disabled">{{label}}</button>'});
 const store=new Vuex.Store({state:{CORE:{AUTH:{authenticated:false,user:{},business:{},permissions:[],accessRevision:0}}}});
 window.qa=new Vue({el:'#app',vuetify:new Vuetify(),store,components:{Admin,Profile},data:()=>({email:'nc1@example.invalid',password:'',logged:false,error:'',patient:null,editing:true,tab:'patient'}),
  template:`<v-app><main><h1>NC1 · QA sintética autenticada</h1><form v-if="!logged" @submit.prevent="login"><label>Correo<input v-model="email"></label><label>Contraseña<input v-model="password" type="password"></label><button>Entrar</button></form><p role="alert" v-if="error">{{error}}</p><template v-if="logged"><nav><button @click="tab='patient'">Paciente</button><button @click="tab='professional'">Profesional</button></nav><admin ref="admin" v-if="tab==='patient' && patient && editing" :patient="patient" @saved="editing=false"/><p v-if="!editing && tab==='patient'" role="status">Datos administrativos guardados</p><profile ref="profile" v-if="tab==='professional'" id-login="actor"/></template></main></v-app>`,
  methods:{async login(){await token();const r=await api('api/auth/login','POST',{param:this.email,pwd:this.password});if(!r.success){this.error=r.message;return;}this.password='';await token();store.state.CORE.AUTH={authenticated:true,user:r.data.user,business:r.data.business,permissions:r.data.permissions||[],accessRevision:1};this.patient=(await api('qa/patient')).data;this.logged=true;},api}});
 window.qaApi=api;
})().catch(e=>{document.body.textContent=e.message;console.error(e);});
