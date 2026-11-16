<template><section><p v-if="loading" role="status">Consultando identidad…</p><p v-if="error" role="alert">{{ error }}</p><template v-if="loaded"><p v-if="legacy">Datos históricos: {{ legacy }}. Los apellidos no se separan automáticamente.</p><identity-fields v-model="draft" :kind="kind" :disabled="saving" :can-manage="canManage"/><p role="status">{{ message }}</p><button type="button" :disabled="saving" @click="save">Guardar identidad</button><button type="button" :disabled="saving" @click="reload">Recargar datos guardados</button></template></section></template>
<script>
import IdentityFields from './IdentityFields.vue';
import { DACore } from '../../services/config/axios.context';
import { authorizationContext,isCurrentAuthorization } from '../../security/authorizationContext';
export default {
  components:{IdentityFields},props:{kind:{type:String,default:'patient'},subject:{type:String,required:true},canManage:Boolean},
  data:()=>({draft:{},baseline:{},revision:0,loading:false,saving:false,loaded:false,error:'',message:'',legacy:'',sequence:0}),
  computed:{url(){return 'api/identity/'+(this.kind==='patient'?'patients/':'professionals/')+encodeURIComponent(this.subject);}},
  watch:{subject(){this.load();}},mounted(){this.load();},beforeDestroy(){this.sequence++;},
  methods:{
    async reload(){if(JSON.stringify(this.draft)!==JSON.stringify(this.baseline)&&!window.confirm('¿Descartar los cambios de identidad sin guardar?'))return;await this.load();},
    async load(){const seq=++this.sequence,context=authorizationContext(this.$store);this.loading=true;this.loaded=false;this.error='';try{const r=await DACore.get(this.url);if(seq!==this.sequence||!isCurrentAuthorization(context,this.$store))return;if(!r.success)throw new Error(r.message);const data={...r.data};this.revision=data.revision;this.legacy=data.legacySurname||data.legacyProfessionalName||'';['contractVersion','revision','updatedAt','provenance','qualityIssues','legacySurname','legacyProfessionalName','catalogValidation','curpSex'].forEach(k=>delete data[k]);if(data.curp)delete data.curp.validationStatus;this.draft=data;this.baseline=JSON.parse(JSON.stringify(data));this.loaded=true;this.message='La verificación de CURP y catálogos sigue pendiente.';}catch(e){this.error=e.message||'No se pudo consultar.';}finally{if(seq===this.sequence)this.loading=false;}},
    async save(){if(this.saving)return;const context=authorizationContext(this.$store),seq=this.sequence;this.saving=true;this.error='';const patch={};Object.keys(this.draft).forEach(k=>{if(JSON.stringify(this.draft[k])!==JSON.stringify(this.baseline[k]))patch[k]=this.draft[k];});try{const r=await DACore.patch(this.url,{identity:patch,expectedRevision:this.revision});if(seq!==this.sequence||!isCurrentAuthorization(context,this.$store))return;if(!r.success)throw new Error(r.status===409?'La identidad cambió. Conservamos tu captura; recarga para conciliar.':r.message);this.baseline=JSON.parse(JSON.stringify(this.draft));this.revision=r.data.revision;this.message='Identidad guardada; validación de catálogos pendiente.';this.$emit('saved',r.data);}catch(e){this.error=e.message||'No se pudo guardar. Conservamos tu captura.';}finally{this.saving=false;}}
  }
};
</script>
