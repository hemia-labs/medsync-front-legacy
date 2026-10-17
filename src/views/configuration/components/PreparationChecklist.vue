<template>
  <section v-if="error || loading || (status && (status.pending || showCompleted))" class="preparation-card" aria-labelledby="preparation-title">
    <header class="preparation-heading">
      <div>
        <p class="preparation-eyebrow">Primeros pasos</p>
        <h2 id="preparation-title">{{ status && !status.pending ? 'Preparación revisada' : 'Prepara tu consultorio' }}</h2>
        <p>Puedes registrar pacientes y guardar borradores según tus accesos. Para agendar, emitir o firmar, revisa los requisitos de cada tarea.</p>
      </div>
      <button type="button" class="preparation-link" :disabled="loading" @click="load">{{ loading ? 'Revisando…' : 'Actualizar preparación' }}</button>
    </header>
    <p v-if="error" role="alert" class="preparation-error">{{ error }}</p>
    <template v-if="status && !error">
      <p class="preparation-progress" role="status">{{ status.completed }} de {{ status.steps.length }} pasos completos. {{ status.pending }} {{ status.pending === 1 ? 'pendiente' : 'pendientes' }}.</p>
      <div v-if="nextStep" class="preparation-next">
        <strong>Siguiente paso: {{ nextStep.title }}</strong>
        <router-link v-if="nextStep.action" :to="nextStep.action.path" class="preparation-primary">Empezar configuración</router-link>
      </div>
      <details :open="showCompleted" class="preparation-details">
        <summary>Ver pasos y requisitos por tarea</summary>
        <ol>
          <li v-for="step in status.steps" :key="step.id" :class="{ 'preparation-done': step.ready }">
            <div><strong>{{ step.title }} · {{ step.ready ? 'Completo' : 'Pendiente' }}</strong><p>{{ step.detail }}</p><p v-if="!step.ready && step.help">{{ step.help }}</p></div>
            <router-link v-if="step.action" :to="step.action.path" class="preparation-link">{{ step.action.label }}<span class="sr-only"> {{ step.title }}</span></router-link>
          </li>
        </ol>
      </details>
      <p class="preparation-note">La emisión, firma y finalización también verifican los datos del paciente y tus autorizaciones. Logo, colores y odontograma son ajustes opcionales.</p>
    </template>
  </section>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DABusinessService } from '../../../services/context/core-proccess-context';
import { getSettingsSections } from '../../../security/settingsAccess';

export default {
  props: { showCompleted: Boolean },
  data: () => ({ status:null, loading:false, error:'', request:0, disposed:false }),
  computed: {
    ...mapGetters(moduleTypes.AUTH, { user:fnTypes.getUser, role:fnTypes.getRole, hasPermission:fnTypes.hasPermission }),
    sessionKey() { return `${(this.user || {}).id_login || ''}:${(this.user || {}).id_business || ''}:${this.role || ''}:${['px.dates','admin.config','admin.users','documents.view','documents.create','documents.config','clinical_history.create','clinical_history.finalize','prescriptions.config','prescriptions.issue','documents.sign'].map(code=>this.hasPermission(code)?code:'').join(',')}`; },
    nextStep() { return this.status && (this.status.steps.find(step=>!step.ready && step.action) || this.status.steps.find(step=>!step.ready)); }
  },
  watch: { sessionKey: { immediate:true, handler(){ this.status=null; this.load(); } } },
  mounted() { window.addEventListener('focus',this.load); },
  beforeDestroy() { this.disposed=true;this.request++;window.removeEventListener('focus',this.load); },
  methods: {
    async load() {
      const key=this.sessionKey, request=++this.request;
      if (!(this.user || {}).id_login || this.role==='super_admin') {this.status=null;this.loading=false;return;}
      this.loading=true;this.error='';
      try {
        const response=await DABusinessService.getPreparation();
        if(this.disposed || request!==this.request || key!==this.sessionKey) return;
        if(!response || !response.success || !response.data || !Array.isArray(response.data.steps)) throw new Error();
        const allowed=new Set(getSettingsSections(this.role,this.hasPermission).map(item=>item.key));
        this.status={...response.data,steps:response.data.steps.map(step=>({...step,action:step.action && allowed.has(String(step.action.path).split('section=')[1]) ? step.action:null}))};
      } catch(_) { if(!this.disposed && request===this.request) {this.status=null;this.error='No pudimos revisar los pasos de preparación. Pulsa Actualizar preparación para reintentar.';} }
      finally {if(!this.disposed && request===this.request)this.loading=false;}
    }
  }
};
</script>

<style scoped>
.preparation-card{margin-bottom:24px;padding:24px;border:1px solid var(--color-primary-200,#b2d8d9);border-radius:20px;background:var(--color-primary-50,#f0f9fa);color:#213f48;box-shadow:0 8px 24px #18384a0a}.preparation-heading,.preparation-next{display:flex;gap:20px;justify-content:space-between;align-items:center}.preparation-heading h2{margin:4px 0 10px;font-size:24px;font-weight:750}.preparation-heading p{margin:0;line-height:1.6}.preparation-eyebrow{text-transform:uppercase;font-size:12px;font-weight:750;letter-spacing:.08em}.preparation-link{color:var(--color-primary-800,#075a62);text-decoration:underline;font-weight:650;background:transparent;border:0;white-space:normal}.preparation-progress{margin:18px 0}.preparation-primary{display:inline-block;padding:12px 18px;border-radius:12px;background:var(--color-primary-800,#075a62);color:white;font-weight:700;text-decoration:none}.preparation-next{padding:16px;background:white;border-radius:14px}.preparation-details{margin-top:18px}.preparation-details summary{cursor:pointer;font-weight:700}.preparation-details ol{padding-left:24px}.preparation-details li{padding:14px 0;display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid #c5dadd}.preparation-details li p{margin:6px 0;line-height:1.5}.preparation-done strong{color:#23764c}.preparation-note{font-size:13px;margin:18px 0 0;line-height:1.6}.preparation-error{color:#a1272a}.preparation-card a:focus-visible,.preparation-card button:focus-visible,.preparation-card summary:focus-visible{outline:3px solid #b57213;outline-offset:4px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:600px){.preparation-card{padding:18px}.preparation-heading,.preparation-next,.preparation-details li{align-items:stretch;flex-direction:column;gap:12px}.preparation-heading h2{font-size:22px}.preparation-primary{text-align:center}}
</style>
