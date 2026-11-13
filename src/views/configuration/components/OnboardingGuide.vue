<template>
  <section class="agenda-guide" :class="{'is-modal':insideModal}" :aria-labelledby="headingId">
    <template v-if="state.guide !== 'active'">
      <h3 :id="headingId">Tu tiempo también merece cuidado.</h3>
      <p>Cada consulta necesita su espacio. Te acompañamos en esta pantalla para preparar los horarios{{ doctorName ? ' de ' + doctorName : '' }}.</p>
      <button type="button" @click="start">{{ state.guide === 'not_started' ? 'Ver ayuda de agenda' : state.guide === 'completed' ? 'Revisar guía' : 'Retomar guía' }}</button>
    </template>
    <template v-else>
      <p class="guide-eyebrow">✦ Vamos contigo · Tutorial de Agenda · Paso {{ stepNumber }} de {{ stepCount }}</p>
      <h3 :id="headingId" tabindex="-1" ref="heading">{{ insideModal ? modalTitle : step.title }}</h3>
      <p v-if="!target">{{ insideModal ? modalText : step.text }}</p>
      <p v-if="state.originAbsent && ['duration','hours'].includes(state.step) && !insideModal">Estos son los horarios iniciales de tu agenda. Revísalos y ajústalos a los días y horas en los que atiendes. Si ya te sirven, puedes dejarlos como están.</p>
      <p v-else-if="state.step === 'hours' && !insideModal">{{ needsScheduleReview ? 'La configuración guardada necesita una revisión. Sigue el aviso de esta agenda y guarda el resultado.' : 'Estos son los horarios que tiene tu agenda. Puedes conservar los que ya te sirven; no hace falta volver a guardarlos si no cambias nada.' }}</p>
      <p v-if="editor.dirty && !insideModal" class="guide-state">Cambios sin guardar · Puedes continuar revisando y llegar a Guardar.</p>
      <p v-if="state.loading" role="status">Estamos comprobando lo que está guardado…</p>
      <div v-else-if="state.error" role="alert"><p>{{ state.error }}</p><button type="button" @click="refresh">Comprobar agenda</button></div>
      <div v-else-if="state.step === 'verify' && !insideModal" aria-live="polite">
        <strong>{{ presentation.label }}</strong><p>{{ presentation.text }}</p>
        <p v-if="editor.dirty">Los cambios que aún tienes en esta pantalla no están incluidos en esta comprobación.</p>
        <button type="button" @click="refresh">Comprobar de nuevo</button>
        <button v-if="presentation.target" type="button" @click="reviewIssue">Revisar {{ labelFor(presentation.target) }}</button>
        <preparation-journey v-if="showJourney" :status="state.status" :sections="journeySections" current-id="agenda" :current-action-label="'Revisar '+labelFor(journeyTarget)" @current="reviewJourney" @open="continuePreparation" />
        <button v-else-if="nextTask && !editor.dirty && !editor.saving" type="button" @click="continuePreparation()">Ir a {{ nextTask.title }}</button>
        <router-link v-if="canBook" to="/px/dates">Ir a Citas</router-link>
        <button v-if="canManage" type="button" @click="$emit('focus-target','doctor')">Preparar otra agenda</button>
      </div>
      <div class="guide-actions">
        <button v-if="!insideModal" type="button" :disabled="atStart || editor.saving" @click="move(-1)">Anterior</button>
        <button v-if="!target && !insideModal && state.step !== 'verify'" type="button" :disabled="!canContinue" @click="advance">{{ nextLabel }}</button>
        <button v-if="!target && !insideModal && editor.loaded && !['save','verify'].includes(state.step)" type="button" :disabled="editor.saving" @click="showField">Ir a {{ controlLabel }}</button>
        <button v-if="state.step === 'save' && !insideModal" type="button" :disabled="!canContinue" @click="move(1)">Comprobar lo guardado</button>
        <button type="button" :disabled="editor.saving" @click="pause(state.step === 'verify' ? 'completed' : 'paused')">{{ state.step === 'verify' ? 'Cerrar tutorial' : 'Pausar tutorial' }}</button>
      </div>
      <p v-if="state.storageFailed" class="guide-note">Podemos acompañarte mientras esta página siga abierta. Al regresar revisaremos lo guardado. No se recuperan cambios sin guardar.</p>
      <guide-spotlight v-if="target && !insideModal && !editor.saving" :key="state.step" :target="target" :title="step.title" :text="step.text" :progress="`${stepNumber} de ${stepCount}`" :first="atStart" :last="state.step==='verify'" :next-label="nextLabel" :busy="!canContinue" @previous="move(-1)" @next="advance" @close="target=null" />
    </template>
  </section>
</template>
<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { getSettingsSections } from '../../../security/settingsAccess';
import { ONBOARDING } from '../../../domain/onboarding/context';
import { stepById, stepsFor, canContinueExplanation, agendaPresentation, nextPreparation } from '../../../domain/onboarding/agendaGuide';
import GuideSpotlight from './GuideSpotlight.vue';
import PreparationJourney from './PreparationJourney.vue';
import { preparationPath } from '../../../domain/onboarding/preparationGuide';
export default {
  components:{GuideSpotlight,PreparationJourney},
  data:()=>({target:null}),
  props:{editor:{type:Object,required:true}, doctorName:{type:String,default:''}, insideModal:Boolean, modalTitle:{type:String,default:'Aplica y después guarda'}, modalText:{type:String,default:'Pulsa Aplicar horario al terminar. Después, Guardar cambios en la agenda conserva tus horarios.'}},
  computed:{
    ...mapGetters(moduleTypes.AUTH,{role:fnTypes.getRole,hasPermission:fnTypes.hasPermission}),
    state(){return this.$store.state.CORE.ONBOARDING;},
    headingId(){return `agenda-guide-${this._uid}`;},
    step(){const step=stepsFor(this.state.subject).find(step=>step.id===this.state.step) || stepById(this.state.step);if(this.canManage)return step;if(step.id==='doctor')return {...step,title:'Esta es tu agenda',text:'Estos horarios corresponden a tu perfil profesional. Puedes revisar y preparar tu propia agenda.'};if(step.id==='timezone')return {...step,text:'Revisa la zona horaria del consultorio. Si no corresponde a tu ubicación, pide al administrador que la cambie. Todas las agendas usan esta zona.'};return step;},
    needsScheduleReview(){return !!(this.state.status && this.state.status.agenda && !this.state.status.agenda.requirements.hours);},
    stepNumber(){return Math.max(1,stepsFor(this.state.subject).findIndex(s=>s.id===this.state.step)+1);},
    stepCount(){return stepsFor(this.state.subject).length;},
    atStart(){return stepsFor(this.state.subject)[0].id===this.state.step;},
    controlLabel(){return this.labelFor(this.state.step);},
    nextLabel(){const next=stepsFor(this.state.subject)[this.stepNumber];return this.state.step==='timezone' ? 'Confirmar esta zona y continuar' : this.state.step==='save' ? 'Ir a Guardar cambios' : next ? `Siguiente: ${this.labelFor(next.id)}` : 'Cerrar esta ayuda';},
    canContinue(){return !this.insideModal && canContinueExplanation(this.editor,this.step);},
    presentation(){return this.state.subject==='business' ? {label:'Disponibilidad general del consultorio',text:'Este ajuste es compartido. Vuelve al doctor para comprobar su agenda; guardar aquí no completa los horarios de otros profesionales.'} : agendaPresentation(this.state.status && this.state.status.agenda,this.state.error);},
    nextTask(){return nextPreparation(this.state.status,getSettingsSections(this.role,this.hasPermission).map(section=>section.key));},
    journeySections(){return getSettingsSections(this.role,this.hasPermission);},
    journeyTarget(){const agenda=this.state.status && this.state.status.agenda;return this.presentation.target || (agenda && agenda.configurationState==='absent' ? 'hours' : agenda && agenda.activation && !agenda.activation.individual ? 'activation' : 'doctor');},
    showJourney(){return !!(this.state.status && this.state.status.agenda && this.state.status.agenda.subjectIsOwn !== false) && this.state.subject !== 'business' && !this.editor.dirty && !this.editor.saving;},
    canBook(){return this.hasPermission('px.dates');},
    canManage(){return ['admin','business_admin'].includes(this.role) && this.hasPermission('admin.config');}
  },
  watch:{'state.subject'(){this.target=null;},'state.guide'(value){if(value!=='active')this.target=null;},'editor.saving'(value){if(value)this.target=null;},'state.step'(value){this.target=null;if(value==='verify')this.$nextTick(()=>{if(this.$refs.heading){this.$refs.heading.focus();this.$refs.heading.scrollIntoView({block:'nearest'});}});}},
  methods:{
    reviewJourney(){const index=stepsFor(this.state.subject).findIndex(step=>step.id===this.journeyTarget);if(index>=0)this.move(index-(this.stepNumber-1));},
    reviewIssue(){const steps=stepsFor(this.state.subject),index=steps.findIndex(step=>step.id===this.presentation.target);if(index>=0)this.move(index-(this.stepNumber-1));},
    labelFor(id){return {doctor:'Doctor',timezone:'Zona horaria del consultorio',duration:'Duración habitual',hours:'Horarios semanales',closures:'Días y horarios no disponibles',activation:this.state.subject==='business'?'Consultorio disponible':'Agenda activa',save:'Guardar cambios',verify:'Resultado guardado'}[id] || 'Resultado guardado';},
    advance(){if(!this.canContinue)return;if(this.state.step==='save'){this.target=null;this.$nextTick(()=>this.$emit('focus-target','save'));}else if(this.state.step==='verify')this.target=null;else this.move(1);},
    showField(){this.target=null;const step=this.state.step;this.$nextTick(()=>{if(!this._isDestroyed && this.state.guide==='active' && !this.insideModal && !this.editor.saving && step===this.state.step)this.$emit('focus-target',this.step.target,element=>{if(!this._isDestroyed && !this.editor.saving && step===this.state.step)this.target=element;});});},
    async start(){await this.$store.dispatch(ONBOARDING+'begin',{resume:this.state.guide!=='not_started'});},
    refresh(){return this.$store.dispatch(ONBOARDING+'refresh',{force:true});},
    async move(direction){this.target=null;await this.$store.dispatch(ONBOARDING+'move',direction);this.$nextTick(()=>{if(this.$refs.heading)this.$refs.heading.focus();if(this.state.step!=='verify')this.showField();});},
    async pause(value,exitGuide=true){
      if(exitGuide && this.$router && this.$router.replace){
        const query={...this.$route.query};delete query.guide;delete query.resume;delete query.goal;
        try{await this.$router.replace({path:this.$route.path,query});}catch(_){return;}
      }
      this.target=null;this.$store.dispatch(ONBOARDING+'pause',value);
    },
    async continuePreparation(task=this.nextTask){
      if(!task || !task.action)return;
      const completed=this.state.step==='verify' && !!this.state.status && !this.state.error;
      try {await this.$router.push(preparationPath(task));} catch (_) {return;}
      this.pause(completed?'completed':'paused',false);
      this.$store.commit(ONBOARDING+'patch',{continuation:''});
    }
  }
};
</script>
<style scoped>
.agenda-guide{border:1px solid #8ab9ba;border-left:5px solid #087780;background:#f0f8f8;color:#173f48;padding:18px;margin:16px;border-radius:12px;min-width:0;overflow-wrap:anywhere}.agenda-guide h3{font-size:20px;line-height:1.35;margin:0 0 10px}.agenda-guide p{line-height:1.6;margin:8px 0}.guide-eyebrow,.guide-note{font-size:13px}.guide-state{font-weight:600}.guide-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.agenda-guide button,.agenda-guide a{display:inline-block;min-height:44px;padding:9px 12px;color:#075c64;text-decoration:underline;border-radius:7px;font-weight:600}.agenda-guide button:disabled{color:#667778;text-decoration:none;cursor:default}.agenda-guide :focus-visible{outline:3px solid #087f80;outline-offset:3px}@media(max-width:600px){.agenda-guide{margin:12px;padding:14px}.guide-actions button{flex:1 1 auto}}.is-modal{padding:10px 12px;margin:8px 12px}.is-modal h3{font-size:16px;margin-bottom:4px}.is-modal p{font-size:13px;line-height:1.4;margin:4px 0}.is-modal .guide-actions{margin-top:0}.is-modal .guide-eyebrow{font-size:11px}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
