<template>
  <section v-if="error || (showCompleted && loading) || (status && (status.pending || showCompleted || !completionDismissed))" class="preparation-card" aria-labelledby="preparation-title">
    <template v-if="status && !status.pending && showCompleted && !error">
      <header class="preparation-heading complete-summary">
        <div><h2 id="preparation-title">Preparación inicial completa</h2><p>{{ status.completed }} de {{ status.steps.length }} completos. Tus ajustes están guardados.</p></div>
        <button type="button" class="preparation-link" :disabled="loading" @click="load">{{ loading ? 'Revisando…' : 'Actualizar preparación' }}</button>
      </header>
      <details class="preparation-details">
        <summary>Revisar configuración y guías</summary>
        <p>Revisar abre los ajustes. Revisar con guía abre la ayuda conservando tu avance.</p>
        <div v-if="resumptions.length" class="other-guides"><router-link v-for="guide in resumptions" :key="guide.key" :to="guide.path" class="preparation-link">Retomar {{ guide.title }} · Paso {{ guide.step }} de {{ guide.total }}</router-link></div>
        <ol class="preparation-tasks" aria-label="Configuración completada">
          <li v-for="step in status.steps" :key="step.id" class="preparation-done">
            <div><strong>{{ step.title }}</strong><span class="task-state">Completo</span></div>
            <div v-if="step.action" class="task-actions">
              <router-link :to="step.action.path" class="preparation-link">Revisar<span class="sr-only"> {{ step.title }}</span></router-link>
              <router-link :to="preparationPath(step)" class="preparation-link">Revisar con guía<span class="sr-only"> {{ step.title }}</span></router-link>
            </div>
          </li>
        </ol>
      </details>
    </template>
    <template v-else-if="status && !status.pending && !showCompleted && !error">
      <p class="preparation-eyebrow">Preparación inicial completa</p>
      <h2 id="preparation-title" class="completion-title">Tu consultorio está preparado</h2>
      <p>La configuración inicial está guardada. Ya puedes dar de alta pacientes y organizar citas según tus accesos. Cada receta y documento seguirá comprobando sus requisitos.</p>
      <div class="completion-actions">
        <router-link v-if="hasPermission('px.new')" class="preparation-primary" to="/px/new">Registrar mi primer paciente</router-link>
        <router-link v-if="hasPermission('px.dates')" class="preparation-link" to="/px/dates">Ir a Citas</router-link>
        <router-link class="preparation-link" to="/admin">Revisar configuración</router-link>
        <button type="button" class="preparation-link" @click="dismissCompletion">Ocultar este mensaje</button>
      </div>
    </template>
    <template v-else>
    <header class="preparation-heading">
      <div>
        <p class="preparation-eyebrow">Preparación del consultorio · A tu ritmo</p>
        <h2 id="preparation-title">{{ error ? 'No pudimos revisar la preparación' : !status ? 'Revisando preparación…' : personalPending.length ? 'Continúa la configuración' : 'Tus ajustes están preparados' }}</h2>
        <p>Revisa tus tareas y las que dependen del consultorio. Puedes salir y retomar cada guía; guarda tus cambios antes de salir.</p>
      </div>
      <button type="button" class="preparation-link" :disabled="loading" @click="load">{{ loading ? 'Revisando…' : 'Actualizar preparación' }}</button>
    </header>
    <p v-if="error" role="alert" class="preparation-error">{{ error }}</p>
    <template v-if="status && !error">
      <p class="preparation-progress" role="status">{{ status.completed }} de {{ status.steps.length }} requisitos completos · {{ personalPending.length }} por resolver con tus accesos<span v-if="dependencies.length"> · {{ dependencies.length }} {{ dependencies.length === 1 ? 'pendiente' : 'pendientes' }} del administrador</span>.</p>
      <div v-if="guideCollapsed && !showCompleted" class="completion-actions">
        <p>La bienvenida está cerrada. Los requisitos pendientes siguen vigentes para las funciones que los necesitan.</p>
        <button type="button" class="preparation-link" @click="setCollapsed(false)">Ver tareas y retomar guías</button>
      </div>
      <template v-else>
        <div v-if="resumptions.length" class="preparation-next resume-panel">
          <div><p class="preparation-eyebrow">Tu guía pausada</p><strong>{{ resumptions[0].title }} · Paso {{ resumptions[0].step }} de {{ resumptions[0].total }}</strong><p>{{ resumptions[0].stepTitle }}</p></div>
          <router-link :to="resumptions[0].path" class="preparation-primary">Retomar {{ resumptions[0].title }}</router-link>
          <div v-if="resumptions.length > 1" class="other-guides"><router-link v-for="guide in resumptions.slice(1)" :key="guide.key" :to="guide.path" class="preparation-link">Retomar {{ guide.title }} · Paso {{ guide.step }} de {{ guide.total }}</router-link></div>
        </div>
        <div v-else-if="nextStep" class="preparation-next">
          <div><strong>Siguiente tarea: {{ nextStep.title }}</strong><p>{{ nextStep.detail }}</p></div>
          <button v-if="needsAgendaProfile" type="button" class="preparation-primary" :disabled="loading" @click="startGuide()">Revisar con guía: Tu perfil profesional</button>
          <router-link v-else :to="preparationPath(nextStep)" class="preparation-primary">Revisar con guía: {{ nextStep.title }}</router-link>
        </div>
        <p v-else class="preparation-progress">Ya completaste las tareas que puedes configurar con tus accesos. Puedes terminar la bienvenida y volver cuando lo necesites.</p>
        <ol class="preparation-tasks" aria-label="Tareas de configuración">
          <li v-for="step in status.steps.filter(item => item.ready || item.action)" :key="step.id" :class="{ 'preparation-done': step.ready }">
            <div><strong>{{ step.title }}</strong><span class="task-state">{{ step.ready ? 'Completo' : 'Pendiente' }}</span><p>{{ step.detail }}</p></div>
            <div v-if="step.action" class="task-actions">
              <router-link :to="step.action.path" class="preparation-link">{{ step.ready ? 'Revisar' : 'Configurar' }}<span class="sr-only"> {{ step.title }}</span></router-link>
              <router-link :to="preparationPath(step)" class="preparation-link">Revisar con guía<span class="sr-only"> {{ step.title }}</span></router-link>
            </div>
          </li>
        </ol>
        <button v-if="!showCompleted" type="button" class="preparation-link" @click="setCollapsed(true)">{{ personalPending.length ? 'Continuar después' : 'Terminar bienvenida' }}</button>
      </template>
      <section v-if="dependencies.length" class="preparation-dependencies" aria-label="Pendientes del administrador">
        <h3>Pendientes del administrador</h3>
        <div v-for="step in dependencies" :key="step.id" class="dependency-item">
          <strong>{{ step.title }}</strong><p>{{ step.help || 'Esta configuración necesita la revisión del administrador del consultorio.' }}</p>
          <button type="button" class="preparation-link" :aria-expanded="helpStep === step.id ? 'true' : 'false'" @click="helpStep = helpStep === step.id ? '' : step.id">{{ helpStep === step.id ? 'Cerrar instrucciones' : 'Ver cómo resolver ' + step.title }}</button>
          <div v-if="helpStep === step.id" class="dependency-help" role="note">
            <p>{{ step.detail }}</p>
            <p v-if="step.id === 'consent'">Pide al administrador del consultorio que abra Configuración → Documentos y consentimientos, prepare el formato de consentimiento de datos personales sensibles y lo guarde activo. Es una plantilla para pacientes; los documentos de Cuenta y legal son distintos.</p>
            <p v-else>Pide al administrador que revise este requisito en Configuración. Después pulsa Actualizar preparación para comprobar el resultado.</p>
            <p>Puedes terminar la bienvenida. Esto no completa el requisito ni habilita las funciones que dependen de él.</p>
            <button type="button" class="preparation-link" :disabled="loading" @click="load">Comprobar si ya está resuelto</button>
          </div>
        </div>
      </section>
      <details class="preparation-details"><summary>Conoce la historia clínica inicial</summary><p>El formato inicial organiza las preguntas de nuevas historias. Si ya está disponible, puedes usarlo sin personalizarlo. Cada historia conserva su versión y los requisitos de su paciente; ver esta explicación no habilita actos clínicos.</p><router-link v-if="canViewHistoryGuide" to="/admin?section=clinical-history-template" class="preparation-link">Revisar el formato inicial</router-link><p v-else>Pide al administrador que revise el formato si necesitas adaptarlo.</p></details>
      <p class="preparation-note">La emisión, firma y finalización también verifican los datos del paciente y tus autorizaciones. Logo, colores y odontograma son ajustes opcionales.</p>
    </template>
    </template>
  </section>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DABusinessService } from '../../../services/context/core-proccess-context';
import { getSettingsSections } from '../../../security/settingsAccess';
import { guideContext, ONBOARDING } from '../../../domain/onboarding/context';
import { preparationPath } from '../../../domain/onboarding/preparationGuide';
import { resumableGuides } from '../../../domain/onboarding/resumeGuides';

export default {
  props: { showCompleted: Boolean },
  data: () => ({ status:null, loading:false, error:'', request:0, disposed:false, completionDismissed:false, guideCollapsed:false, helpStep:'', resumptions:[] }),
  computed: {
    ...mapGetters(moduleTypes.AUTH, { user:fnTypes.getUser, role:fnTypes.getRole, hasPermission:fnTypes.hasPermission }),
    completionKey(){const auth=this.$store.state.CORE.AUTH;return `hemia:preparation-complete:v1:${encodeURIComponent((auth.business || {}).id_business || (this.user || {}).id_business || '')}:${encodeURIComponent((this.user || {}).id_login || '')}`;},
    sessionKey() { const auth=this.$store && this.$store.state.CORE.AUTH || {};return `${(this.user || {}).id_login || ''}:${(auth.business || {}).id_business || (this.user || {}).id_business || ''}:${auth.accessRevision || 0}:${this.role || ''}:${['px.dates','admin.config','admin.users','documents.view','documents.create','documents.config','clinical_history.create','clinical_history.finalize','prescriptions.config','prescriptions.issue','documents.sign'].map(code=>this.hasPermission(code)?code:'').join(',')}`; },
    personalPending(){return this.status ? this.status.steps.filter(step=>!step.ready && step.action) : [];},
    dependencies(){return this.status ? this.status.steps.filter(step=>!step.ready && !step.action) : [];},
    nextStep() { return this.status && (this.needsAgendaProfile && this.status.steps.find(step=>step.id==='profile') || this.personalPending[0]) || null; },
    // The server's agenda action tests active profile only, not signature readiness.
    needsAgendaProfile(){return !!(this.agendaStep && this.agendaStep.action && this.agendaStep.action.path==='/admin?section=doctor-identity');},
    agendaStep(){return this.status && this.status.steps.find(step=>step.id==='agenda');},
    isAdminGuide(){return ['admin','business_admin'].includes(this.role) && this.hasPermission('admin.config');},
    canViewHistoryGuide(){return this.hasPermission('clinical_history_template.view') && getSettingsSections(this.role,this.hasPermission).some(section=>section.key==='clinical-history-template');},
    canGuide(){return getSettingsSections(this.role,this.hasPermission).some(section=>section.key==='agenda');},
    guideDeferred(){const state=this.$store && this.$store.state.CORE.ONBOARDING;return state && ['paused','deferred'].includes(state.guide);}
  },
  watch: { sessionKey: { immediate:true, handler(){ this.status=null;this.resumptions=[];this.helpStep='';this.guideCollapsed=false;this.completionDismissed=false;try{this.completionDismissed=localStorage.getItem(this.completionKey)==='1';this.guideCollapsed=localStorage.getItem(this.completionKey+':welcome')==='1';}catch(_){/* Session-only dismissal when storage is unavailable. */} this.load(); } } },
  mounted() { window.addEventListener('focus',this.load); },
  beforeDestroy() { this.disposed=true;this.request++;window.removeEventListener('focus',this.load); },
  methods: {
    preparationPath,
    setCollapsed(value){this.guideCollapsed=value;try{localStorage.setItem(this.completionKey+':welcome',value?'1':'0');}catch(_){/* Keep dismissal usable in this session. */}},
    readResumptions(){this.resumptions=[];try{const auth=this.$store.state.CORE.AUTH;this.resumptions=resumableGuides(localStorage,guideContext(this.user,this.role,this.hasPermission,auth.accessRevision,auth.business),getSettingsSections(this.role,this.hasPermission),this.isAdminGuide);}catch(_){/* The screen itself still offers resume when storage is unavailable. */}},
    dismissCompletion(){this.completionDismissed=true;try{localStorage.setItem(this.completionKey,'1');}catch(_){/* Keep the current view dismissible. */}},
    async startGuide(otherDoctor=false){
      const key=this.sessionKey;
      await this.load();
      if(this.disposed || key!==this.sessionKey || this.error || !this.status || !this.canGuide)return;
      if(this.needsAgendaProfile && !otherDoctor){
        try{await this.$router.push('/admin?section=doctor-identity&guide=1&goal=agenda');}catch(_){/* Existing editor guard owns navigation. */}
        return;
      }
      const context=guideContext(this.user,this.role,this.hasPermission,this.$store.state.CORE.AUTH.accessRevision,this.$store.state.CORE.AUTH.business);
      await this.$store.dispatch(ONBOARDING+'context',context);
      await this.$store.dispatch(ONBOARDING+'subject','');
      this.$store.dispatch(ONBOARDING+'begin',{resume:!!this.guideDeferred});
      const path=this.isAdminGuide ? '/admin?section=agenda' : this.agendaStep.action && this.agendaStep.action.path || '/admin?section=agenda';
      try{await this.$router.push(path+'&guide=1&resume=1');}catch(_){await this.$store.dispatch(ONBOARDING+'pause');}
    },
    async deferGuide(){await this.$store.dispatch(ONBOARDING+'context',guideContext(this.user,this.role,this.hasPermission,this.$store.state.CORE.AUTH.accessRevision,this.$store.state.CORE.AUTH.business));await this.$store.dispatch(ONBOARDING+'pause','deferred');},
    async load() {
      const key=this.sessionKey, request=++this.request;
      if (!(this.user || {}).id_login || this.role==='super_admin') {this.status=null;this.loading=false;return;}
      this.readResumptions();
      this.loading=true;this.error='';
      try {
        const response=await DABusinessService.getPreparation();
        if(this.disposed || request!==this.request || key!==this.sessionKey) return;
        if(!response || !response.success || !response.data || !Array.isArray(response.data.steps)) throw new Error();
        const allowed=new Set(getSettingsSections(this.role,this.hasPermission).map(item=>item.key));
        this.status={...response.data,steps:response.data.steps.map(step=>({...step,action:step.action && allowed.has(String(step.action.path).split('section=')[1]) ? step.action:null}))};
        // Pending steps always show the checklist; a dismissed completion message stays dismissed, so a
        // momentary pending (an agenda being edited, a template being versioned) cannot bring it back.
      } catch(_) { if(!this.disposed && request===this.request && key===this.sessionKey) {this.status=null;this.error='No pudimos revisar los pasos de preparación. Pulsa Actualizar preparación para reintentar.';} }
      finally {if(!this.disposed && request===this.request && key===this.sessionKey)this.loading=false;}
    }
  }
};
</script>

<style scoped>
.task-actions{display:flex;flex-direction:column;align-items:flex-start;flex-shrink:0;gap:4px}.complete-summary h2{font-size:22px!important}.preparation-details>summary{min-height:44px;padding:10px 0}.other-guides a{display:inline-flex;align-items:center}

.completion-title{font-size:24px;font-weight:700;line-height:1.3;margin:8px 0 12px}
.completion-actions{display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-top:16px}.completion-actions a,.completion-actions button{min-height:44px;display:inline-flex;align-items:center}.preparation-card{background:linear-gradient(125deg,#e7f6ee,#eff9ff)!important;box-shadow:0 15px 45px #18483c14!important}.preparation-eyebrow{color:#087563}.preparation-heading h2{font-size:30px!important;letter-spacing:-.025em}.welcome-stages{display:flex;flex-wrap:wrap;gap:16px;padding:0;margin:20px 0;list-style:none}.welcome-stages li{display:flex;align-items:center;gap:8px;color:#456763;font-size:14px}.welcome-stages span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e8f2ef}.welcome-stages [aria-current] span{background:#07645f;color:white}.welcome-stages [aria-current]{font-weight:700;color:#154a43}
.preparation-invitation{padding:18px;margin:16px 0;background:white;border-radius:12px}.preparation-invitation h3{font-size:21px}.preparation-invitation p{line-height:1.6}.preparation-invitation button{min-height:44px}
.preparation-card{margin-bottom:24px;padding:24px;border:1px solid var(--color-primary-200,#b2d8d9);border-radius:20px;background:var(--color-primary-50,#f0f9fa);color:#213f48;box-shadow:0 8px 24px #18384a0a}.preparation-heading,.preparation-next{display:flex;gap:20px;justify-content:space-between;align-items:center}.preparation-heading h2{margin:4px 0 10px;font-size:24px;font-weight:750}.preparation-heading p{margin:0;line-height:1.6}.preparation-eyebrow{text-transform:uppercase;font-size:12px;font-weight:750;letter-spacing:.08em}.preparation-link{color:var(--color-primary-800,#075a62);text-decoration:underline;font-weight:650;background:transparent;border:0;white-space:normal}.preparation-progress{margin:18px 0}.preparation-primary{display:inline-block;padding:12px 18px;border-radius:12px;background:var(--color-primary-800,#075a62);color:white;font-weight:700;text-decoration:none}.preparation-next{padding:16px;background:white;border-radius:14px}.preparation-details{margin-top:18px}.preparation-details summary{cursor:pointer;font-weight:700}.preparation-details ol{padding-left:24px}.preparation-tasks li,.preparation-details li{padding:14px 0;display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid #c5dadd}.preparation-tasks li p,.preparation-details li p{margin:6px 0;line-height:1.5}.preparation-done strong{color:#23764c}.preparation-note{font-size:13px;margin:18px 0 0;line-height:1.6}.preparation-error{color:#a1272a}.preparation-card a:focus-visible,.preparation-card button:focus-visible,.preparation-card summary:focus-visible{outline:3px solid #087f80;outline-offset:4px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:600px){.preparation-card{padding:18px}.preparation-heading,.preparation-next,.preparation-details li{align-items:stretch;flex-direction:column;gap:12px}.preparation-heading h2{font-size:22px!important}.preparation-invitation{padding:12px;margin:12px 0}.preparation-invitation h3{font-size:18px}.welcome-stages{gap:8px;margin:12px 0;font-size:12px}.preparation-heading>button{align-self:flex-start}.preparation-primary{text-align:center}}
.preparation-tasks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;list-style:none;padding:0;margin:20px 0}.preparation-tasks li{min-width:0}@media(max-width:800px){.preparation-tasks{grid-template-columns:1fr}}.task-state{display:inline-block;margin-left:10px;font-size:12px;padding:3px 8px;border-radius:12px;background:#edf1f4;color:#42545f}.preparation-done .task-state{background:#dcefe4;color:#236147}.preparation-dependencies{margin-top:20px;border:1px solid #c5dadd;border-radius:12px;padding:16px;background:#fff}.preparation-dependencies h3{font-size:17px;margin:0 0 12px}.dependency-item p{margin:6px 0;line-height:1.5}.dependency-item+.dependency-item{margin-top:16px}.dependency-help{margin-top:12px;padding:12px;background:#f3f7fa;border-radius:8px}.preparation-next p{margin:6px 0;line-height:1.5}.resume-panel{flex-wrap:wrap}.other-guides{display:flex;gap:16px;flex-wrap:wrap;flex-basis:100%}.preparation-heading h2{font-size:26px!important}.preparation-card button,.preparation-card a{min-height:44px}.preparation-tasks a{display:inline-flex;align-items:center}.completion-actions p{margin:0}@media(max-width:600px){.preparation-tasks li{flex-direction:column;gap:8px}.task-state{margin-left:6px}}
</style>
