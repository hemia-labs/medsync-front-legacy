<template>
  <section class="global-dental-aliases">
    <action-confirm ref="confirmation" />
    <h1>Abreviaturas globales del odontograma</h1>
    <p>Se aplican a todos los consultorios. Los códigos y sinónimos base están protegidos.</p>
    <button type="button" :disabled="busy" @click="load">Actualizar</button>
    <p v-if="message" role="status">{{ message }}</p>
    <template v-if="state">
      <ul><li v-for="(target,word) in state.global_aliases" :key="word">{{ word }} → {{ label(target) }} <button v-if="!protectedWords.includes(word)" :disabled="busy" @click="save(word,null)">Retirar</button></li></ul>
      <form @submit.prevent="save(alias,target)">
        <label>Abreviatura <input v-model="alias" required maxlength="30" :disabled="busy" /></label>
        <label>Acción <select v-model="target" :disabled="busy"><option v-for="tool in state.catalog" :key="tool.code" :value="tool.code">{{ tool.label }}</option><option value="ok">Marcar revisado</option><option value="pres">Corregir presencia</option></select></label>
        <button :disabled="busy">Guardar abreviatura global</button>
      </form>
    </template>
  </section>
</template>
<script>
import api from '../../services/core/odontogram/DAOdontogramV2Service';
import ActionConfirm from '../../core/components/form/dialog/DAActionConfirm.vue';
import odontogramFeedback from '../../mixins/odontogramFeedback';
export default {
  mixins:[odontogramFeedback],
  components:{ActionConfirm},
  data:()=>({state:null,busy:false,message:'',messageType:'info',alias:'',target:'car',protectedWords:['caries','fractura','restos','resina','amalgama','sellador','corona','endodoncia','implante','extraccion','ausente','noerupcionado','sano','revisado','presente']}),
  mounted(){this.load();},
  methods:{
    askConfirmation(message){return this.$refs.confirmation.open(message,'Modificar abreviaturas globales');},
    label(code){const tool=this.state.catalog.find(item=>item.code===code);return tool?tool.label:code==='ok'?'Marcar revisado':'Corregir presencia';},
    async load(){this.busy=true;try{const response=await api.globalAliases();if(!response.success)throw Error(response.message);this.state=response.data;}catch(error){this.messageType='error';this.message=error.message;}finally{this.busy=false;}},
    async save(alias,target){if(this.busy||!await this.askConfirmation('Esta modificación afecta a las abreviaturas de todos los consultorios. ¿Continuar?'))return;this.busy=true;this.message='';try{const response=await api.saveGlobalAlias({alias,target,expected_version:this.state.alias_version});if(!response.success)throw Error(response.message);this.state=response.data;this.alias='';this.messageType='success';this.message='Abreviaturas actualizadas. Las capturas abiertas deben revisar sus comandos.';}catch(error){this.messageType='error';this.message=error.message;}finally{this.busy=false;}}
  }
};
</script>
<style scoped>
.global-dental-aliases { padding:24px; max-width:900px; }.global-dental-aliases label {display:block;margin:12px 0}.global-dental-aliases button,.global-dental-aliases input,.global-dental-aliases select {min-height:44px;padding:8px;border:1px solid var(--color-border,#d8e9ef);border-radius:6px;max-width:100%}.global-dental-aliases li {margin:8px 0}
</style>
