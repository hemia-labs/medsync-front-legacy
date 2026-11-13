<template>
  <aside v-if="definition && guideRequested" class="preparation-guide" :class="{'is-pointing':!!target}" :aria-label="definition.title">
    <button v-if="!active" type="button" @click="start">{{ record ? record.state === 'completed' ? 'Revisar acompañamiento' : 'Retomar acompañamiento' : definition.title }}</button>
    <template v-else>
      <div class="tutorial-heading"><span class="tutorial-badge">✦ Vamos contigo</span><span v-if="completed">Datos guardados</span><span v-else>Tutorial · Paso {{ index + 1 }} de {{ definition.steps.length }}</span></div>
      <div v-if="!completed" class="tutorial-progress" aria-hidden="true"><span v-for="(item,n) in definition.steps" :key="item[0]" :class="{current:n===index,visited:n<index}" /></div>
      <h3 ref="heading" tabindex="-1">{{ completed ? completionTitle : target ? definition.title : stepTitle }}</h3>
      <p v-if="completed" role="status">{{ result || 'Tus datos están guardados. Puedes seguir preparando el consultorio.' }}</p>
      <p v-else-if="!target">{{ stepText }}</p>
      <p v-if="busy" role="status">Espera un momento mientras se completa la operación.</p>
      <p v-else-if="dirty && saveState !== 'uncertain'" role="status">Tienes cambios sin guardar. Avanzar en el tutorial no los guarda.</p>
      <p v-if="checking" role="status">Comprobando lo guardado…</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-else-if="result && !completed" role="status" class="tutorial-result">{{ result }}</p>
      <p v-if="storageFailed">La ayuda continuará en esta sesión. No podemos conservar tu avance en este navegador.</p>
      <preparation-journey v-if="showJourney && completed" :status="preparationStatus" :sections="journeySections" :current-id="journeyCurrent" :current-action-label="revealLabel" @current="focusCurrentControl" :goal="goal" :scope-note="personalScope ? '' : 'Este resumen corresponde a tu cuenta. La comprobación de arriba corresponde al profesional seleccionado.'" @open="continuePending" />
      <div class="actions">
        <template v-if="!completed && !target">
          <button type="button" :disabled="busy || index === 0" @click="move(-1)">Anterior</button>
          <button type="button" class="tutorial-primary" :disabled="busy" @click="lastStep || step[0]==='signature-apply' ? focusCurrentControl() : showField()">{{ revealLabel }}</button>
          <button v-if="!lastStep && step[0]!=='signature-apply'" type="button" :disabled="busy || waitingForSignature" @click="advance">{{ nextLabel }} →</button>
        </template>
        <button v-if="!completed && branch==='doctor-identity' && step[0].startsWith('signature')" type="button" :disabled="busy" @click="skipSignature">Dejar la firma para después</button>
        <button type="button" :disabled="busy" @click="pause('paused')">{{ completed ? 'Cerrar tutorial' : 'Pausar tutorial' }}</button>
      </div>
      <details class="tutorial-options"><summary>Más opciones</summary>
        <button type="button" :disabled="busy || checking" @click="verify">{{ checking ? 'Comprobando…' : 'Comprobar lo guardado' }}</button>
        <button v-if="profileSaved" type="button" @click="$emit('focus-control','identity')">Revisar Nombre profesional</button>
        <button v-if="!completed" type="button" :disabled="busy" @click="pause('deferred')">{{ branch === 'users' && goal !== 'authorizations' && !stage ? 'Trabajo sin asistente por ahora' : 'Dejar esta configuración para después' }}</button>
      </details>
      <preparation-journey v-if="showJourney && !completed" :status="preparationStatus" :sections="journeySections" :current-id="journeyCurrent" :current-action-label="revealLabel" @current="focusCurrentControl" :goal="goal" :scope-note="personalScope ? '' : 'Este resumen corresponde a tu cuenta. La comprobación de arriba corresponde al profesional seleccionado.'" @open="continuePending" />
      <details v-if="showJourney && optionalDestinations.length"><summary>Herramientas opcionales</summary>
        <p>Puedes prepararlas cuando las necesites. No cuentan como requisitos de tu avance.</p>
        <button v-for="destination in optionalDestinations" :key="destination.key" type="button" @click="next(destination.key)">{{ destination.title }}</button>
      </details>
      <guide-spotlight v-if="target && !busy && !completed" :key="index" :target="target" :hint-host="hintHost" :title="stepTitle" :text="stepText" :progress="`${index+1} de ${definition.steps.length}`" :first="index===0" :last="lastStep" :next-label="nextLabel" :busy="busy" :next-disabled="waitingForSignature" @previous="move(-1)" @next="advance" @close="closeHint" />
    </template>
  </aside>
</template>
<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { guideContext, ONBOARDING } from '../../../domain/onboarding/context';
import { preparationBranches, preparationDefinition, preparationControlLabel, preparationPath, branchKey, branchRecord } from '../../../domain/onboarding/preparationGuide';
import { getSettingsSections } from '../../../security/settingsAccess';
import { DABusinessService } from '../../../services/context/core-proccess-context';
import GuideSpotlight from './GuideSpotlight.vue';
import PreparationJourney from './PreparationJourney.vue';
import { journeyRequirement } from '../../../domain/onboarding/preparationJourney';
const memory=new Map();
export default {
  components:{GuideSpotlight,PreparationJourney},
  props:{branch:String,subject:{type:String,default:''},stage:{type:String,default:''},actionLabel:String,controlLabels:{type:Object,default:()=>({})},signatureCaptureLabel:String,saveState:{type:String,default:'idle'},dirty:Boolean,busy:Boolean,signatureOpen:Boolean,signatureHasInk:Boolean,verifyEditor:Function,personalScope:{type:Boolean,default:true}},
  data:()=>({active:false,index:0,target:null,hintHost:null,record:null,checking:false,error:'',result:'',agendaProfileVerified:false,requirementReady:false,nextPending:null,preparationStatus:null,storageFailed:false,request:0,revealRequest:0,disposed:false}),
  computed:{
    ...mapGetters(moduleTypes.AUTH,{user:fnTypes.getUser,role:fnTypes.getRole,hasPermission:fnTypes.hasPermission}),
    context(){const auth=this.$store.state.CORE.AUTH;return guideContext(this.user,this.role,this.hasPermission,auth.accessRevision,auth.business);},
    guideRequested(){return this.$route.query.guide==='1';},
    goal(){return this.$route.query.goal || '';},
    key(){return this.context ? branchKey(this.context,this.branch,this.subject)+`:ui3:${this.stage || 'view'}:${this.goal}` : '';},
    definition(){const definition=preparationDefinition(this.branch,{stage:this.stage,goal:this.goal,actionLabel:this.actionLabel,signatureOpen:this.signatureOpen,signatureHasInk:this.signatureHasInk});if(definition && this.branch==='prescriptions' && !['admin','business_admin'].includes(this.role))return {...definition,steps:definition.steps.map(step=>step[0]==='doctor' ? ['doctor','Este es tu formato de recetas','Revisa los datos del formato de tu perfil profesional. Tu identidad y firma se obtienen de Mi perfil profesional.'] : step)};return definition;},
    step(){return this.definition.steps[this.index] || this.definition.steps[0];},
    lastStep(){return this.index===this.definition.steps.length-1;},
    stepTitle(){return this.step[0]==='save' && this.saveState==='uncertain' ? 'Comprueba si se guardó tu perfil' : this.step[1];},
    stepText(){return this.step[0]==='save' && this.saveState==='uncertain' ? 'No pudimos confirmar el resultado. Pulsa Comprobar guardado para consultarlo sin reenviar tus datos.' : this.step[2];},
    revealLabel(){return `Ir a ${this.controlLabel(this.step)}`;},
    nextLabel(){return this.lastStep || this.step[0]==='signature-apply' ? this.revealLabel : `Siguiente: ${this.controlLabel(this.definition.steps[this.index+1])}`;},
    profileSaved(){return this.branch==='doctor-identity' && this.saveState==='saved' && !this.dirty && !this.busy && (this.lastStep || this.goal==='agenda');},
    completed(){return ((this.goal==='agenda' && this.profileSaved && this.agendaProfileVerified) || this.requirementReady) && !this.busy && !this.dirty && !this.checking && !this.error && !['uncertain','error'].includes(this.saveState);},
    completionTitle(){return {'doctor-identity':'Perfil guardado',identity:'Datos del consultorio completos',users:'Autorizaciones guardadas',documents:'Consentimiento disponible',prescriptions:'Formato de recetas guardado','clinical-history-template':'Historia clínica disponible'}[this.branch] || 'Configuración guardada';},
    readyForAgenda(){return this.completed && this.goal==='agenda' && this.agendaProfileVerified && this.nextPending && this.nextPending.id==='agenda';},
    waitingForSignature(){return this.branch==='doctor-identity' && this.step[0]==='signature-capture' && (!this.signatureOpen || !this.signatureHasInk);},
    journeySections(){return getSettingsSections(this.role,this.hasPermission);},
    journeyCurrent(){return this.personalScope ? journeyRequirement(this.branch,this.goal) : '';},
    showJourney(){return !!this.preparationStatus && (this.lastStep || this.completed) && !this.busy && !this.checking && !this.dirty && !this.error && !['uncertain','error'].includes(this.saveState);},
    optionalDestinations(){return this.destinations.filter(s=>s.key==='users' || s.key==='clinical-history-template');},
    destinations(){return this.journeySections.filter(s=>(preparationBranches[s.key] || s.key==='agenda') && s.key!==this.branch && (s.key!=='clinical-history-template' || this.hasPermission('clinical_history_template.view')));}
  },
  watch:{guideRequested(value){if(value)this.restore();else this.suspend();},'$route.query.resume'(value){if(value==='1' && this.guideRequested)this.restore();},signatureOpen(){if(this.active && this.branch==='doctor-identity' && this.step[0].startsWith('signature'))this.goTo('signature-capture');},signatureHasInk(value){if(!value && this.active && this.signatureOpen && this.step[0]==='signature-apply')this.goTo('signature-capture');},async busy(value,previous){if(value){this.target=null;this.revealRequest++;this.request++;this.checking=false;}else if(previous && this.active){const key=this.key;await this.verify();if(this.disposed || !this.active || this.busy || key!==this.key)return;if(this.completed)this.closeHint();else if(!['error','uncertain'].includes(this.saveState))this.showField();}},key:{immediate:true,handler(){this.restore();}},'context.key'(){this.target=null;this.request++;this.agendaProfileVerified=false;this.preparationStatus=null;this.result='';this.error='';this.checking=false;}},
  beforeDestroy(){this.disposed=true;this.suspend();},
  methods:{
    controlLabel(step){return (this.controlLabels || {})[step[0]] || preparationControlLabel(this.branch,step[0],{stage:this.stage,actionLabel:this.actionLabel,signatureOpen:this.signatureOpen,signatureCaptureLabel:this.signatureCaptureLabel}) || step[1];},
    advance(){if(this.busy || this.waitingForSignature)return;if(this.lastStep || this.step[0]==='signature-apply')this.focusCurrentControl();else this.move(1);},
    focusCurrentControl(){this.target=null;this.revealRequest++;this.$nextTick(()=>{if(this.active && !this.busy && !this.disposed)this.$emit('focus-control',this.step[0]);});},
    goTo(id){if(!this.active)return;const index=this.definition.steps.findIndex(step=>step[0]===id);if(index>=0)this.move(index-this.index);},
    restore(){const wasActive=this.active;this.target=null;this.revealRequest++;this.request++;this.agendaProfileVerified=false;this.requirementReady=false;this.nextPending=null;this.preparationStatus=null;this.active=false;this.index=0;this.result='';this.error='';this.checking=false;this.record=null;if(!this.key)return;try{const raw=localStorage.getItem(this.key);this.record=raw && raw.length<4096 ? branchRecord(this.branch,JSON.parse(raw),this.definition) : memory.get(this.key);}catch(_){this.storageFailed=true;this.record=memory.get(this.key);}if(this.record)this.index=this.record.step;if(this.guideRequested && (wasActive || this.$route.query.resume==='1' || !this.record || ['active','completed'].includes(this.record.state)))this.start();if(this.guideRequested && this.$route.query.resume==='1' && this.$router){const query={...this.$route.query};delete query.resume;this.$router.replace({path:this.$route.path,query}).catch(()=>{});}},
    persist(state='active'){if(!this.key)return;this.record=branchRecord(this.branch,{version:1,step:this.index,state,updatedAt:Date.now()},this.definition);memory.set(this.key,this.record);if(memory.size>64)memory.delete(memory.keys().next().value);try{localStorage.setItem(this.key,JSON.stringify(this.record));}catch(_){this.storageFailed=true;}},
    async start(){this.active=true;this.persist();const key=this.key;await this.verify();if(this.disposed || !this.active || this.busy || key!==this.key)return;if(this.completed)this.closeHint();else if(!this.error && this.$emit)this.$nextTick(this.showField);},
    closeHint(){this.target=null;this.revealRequest++;this.$nextTick(()=>this.$refs.heading && this.$refs.heading.focus());},
    skipSignature(){this.goTo('save');this.$emit('skip-signature');},
    showField(){if(this.busy || !this.active || this.completed)return;if(this.branch==='doctor-identity' && this.step[0]==='signature-apply' && !this.signatureOpen){this.goTo('signature-capture');return;}this.target=null;this.hintHost=null;const request=++this.revealRequest,step=this.step[0];this.$nextTick(()=>{if(!this.disposed && this.active && !this.busy && request===this.revealRequest)this.$emit('focus-control',step,(element,host)=>{if(!this.disposed && this.active && !this.busy && request===this.revealRequest){this.hintHost=host || null;this.target=element;}});});},
    suspend(){this.target=null;this.hintHost=null;this.active=false;this.revealRequest++;this.request++;this.checking=false;},
    async pause(state){
      this.persist(this.completed?'completed':state);
      if(this.$router && this.$router.replace){
        const query={...this.$route.query};delete query.guide;delete query.resume;delete query.goal;
        try{await this.$router.replace({path:this.$route.path,query});}
        catch(_){this.persist('active');return;}
      }
      this.suspend();
    },
    move(direction){this.target=null;this.index=Math.max(0,Math.min(this.definition.steps.length-1,this.index+direction));this.persist();this.$nextTick(()=>{if(this.$refs.heading)this.$refs.heading.focus();if(this.$emit)this.showField();});},
    async next(section){try{await this.$router.push({path:'/admin',query:{section,guide:'1',...(this.branch==='prescriptions' && ['agenda','prescriptions'].includes(section) && this.subject ? {doctor:this.subject} : {})}});if(section==='agenda' && this.branch==='doctor-identity'){await this.$store.dispatch(ONBOARDING+'context',this.context);await this.$store.dispatch(ONBOARDING+'subject','');await this.$store.dispatch(ONBOARDING+'begin',{});}}catch(_){/* The editor's existing guard owns cancellation. */}},
    async continuePending(step=this.nextPending){if(!step || !step.action)return;try{await this.$router.push(preparationPath(step));if(step.id==='agenda' && this.branch==='doctor-identity'){await this.$store.dispatch(ONBOARDING+'context',this.context);await this.$store.dispatch(ONBOARDING+'subject','');await this.$store.dispatch(ONBOARDING+'begin',{resume:true});}}catch(_){/* The editor's guard owns cancellation. */}},
    async verify(){
      if(this.busy || !this.key || this.checking)return;
      const key=this.key,context=this.context.key,request=++this.request;
      const current=()=>!this.disposed && key===this.key && context===this.context.key && request===this.request;
      this.checking=true;this.error='';this.result='';this.agendaProfileVerified=false;this.requirementReady=false;this.nextPending=null;this.preparationStatus=null;
      try{
        let message,ready=false;
        const scoped=this.verifyEditor ? await this.verifyEditor() : null;
        const response=await DABusinessService.getPreparation({clinicalHistory:this.branch==='clinical-history-template'});
        if(!response || !response.success || !Array.isArray(response.data.steps))throw Error();
        if(scoped){message=typeof scoped==='string'?scoped:scoped.detail;ready=scoped.ready===true;}
        else {
          if(this.branch==='clinical-history-template'){
            const state=response.data.clinicalHistory;
            if(!state)throw Error();
            ready=state.state==='available';
            message=state.state==='available' ? `Formato ${state.source==='SYSTEM'?'inicial':'del consultorio'} disponible · versión ${state.version}. Puedes continuar sin personalizarlo.` : state.state==='restricted' ? 'Tu acceso no permite comprobar el formato. Pide al administrador que lo revise; ver esta explicación no cambia tus permisos.' : 'No encontramos un formato inicial utilizable. El administrador necesita revisar su instalación; personalizar no es un requisito para resolverlo.';
          }else{const requirement=response.data.steps.find(s=>s.id===this.definition.requirement);message=requirement ? requirement.detail : 'Revisa el resultado en el listado. Incorporar personal es opcional y no completa otras configuraciones.';
            ready=!!(requirement && requirement.ready && (!this.stage || this.branch==='doctor-identity'));
          }
        }
        if(current()){
          this.preparationStatus=response.data;
          const allowed=new Set(this.destinations.map(s=>s.key));
          const pending=response.data.steps.filter(s=>!s.ready && s.action && allowed.has(s.action.path.split('section=')[1]));
          this.agendaProfileVerified=response.data.steps.some(s=>s.id==='agenda' && s.action && s.action.path==='/admin?section=agenda') && allowed.has('agenda');
          this.requirementReady=ready;
          if(ready && !this.dirty && !['error','uncertain'].includes(this.saveState))this.persist('completed');
          this.nextPending=(this.goal==='agenda' && pending.find(s=>s.id==='agenda')) || pending[0] || null;
          this.result=this.branch==='doctor-identity' && this.goal==='agenda' ? this.agendaProfileVerified ? 'Tu nombre está guardado y tu perfil está activo. Puedes preparar tus horarios; la cédula y la firma se completan para recetas y documentos.' : 'Para preparar tu agenda, guarda tu nombre profesional. La cédula y la firma pueden esperar.' : message;
        }
      }catch(_){if(current())this.error='No pudimos comprobar lo guardado. Tu captura se conserva. Reintentar esta comprobación solo consulta datos.';}
      finally{if(current())this.checking=false;}
    }
  }
};
</script>
<style scoped>
.preparation-guide{margin:16px;padding:20px;background:linear-gradient(120deg,#edf9f4,#f5fbff);border:1px solid #b4dacf;border-radius:16px;color:#173f48;overflow-wrap:anywhere;min-width:0}.tutorial-heading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:12px;color:#42666a}.tutorial-badge{color:#14695d;font-weight:600}.tutorial-progress{display:flex;gap:6px;margin:12px 0 16px}.tutorial-progress span{height:4px;border-radius:5px;background:#d5e5e1;flex:1}.tutorial-progress .current{background:#087d75}.tutorial-progress .visited{background:#7dbbad}.preparation-guide h3{font-size:22px;line-height:1.35;margin:0 0 8px;letter-spacing:-.02em}.preparation-guide p{line-height:1.55;margin:8px 0}.tutorial-result{font-size:14px;color:#365b5c}.actions{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid #cde3dc;margin-top:14px;padding-top:12px}.preparation-guide button,.preparation-guide summary{min-height:44px;padding:10px 12px;border-radius:9px;font-weight:600;cursor:pointer}.preparation-guide button:hover{background:#daeee8}.actions .tutorial-primary{background:#075d61;color:white;padding:10px 16px}.preparation-guide button:disabled{opacity:.55;cursor:default}.preparation-guide :focus-visible{outline:3px solid #087f80;outline-offset:3px}.is-pointing h3{font-size:18px}.is-pointing .tutorial-progress{margin-bottom:10px}@media(max-width:600px){.preparation-guide{margin:12px;padding:16px}.preparation-guide h3{font-size:20px}.actions{gap:4px}.actions button{flex:1 1 auto}}
</style>
<style>
.hemia-guide-target:focus,.hemia-guide-target:focus-within{outline:3px solid #087f80;outline-offset:3px}
.hemia-guide-focus:focus,.hemia-guide-focus:focus-within{outline:3px solid #087f80!important;outline-offset:3px}
</style>
