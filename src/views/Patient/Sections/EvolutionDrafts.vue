<template>
  <section class="drafts" aria-label="Notas de evolución">
    <h3>Notas de evolución</h3>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
        <section v-if="reviewed"><h4>{{ correction ? 'Revisar rectificación' : 'Revisar y firmar la nota' }}</h4>
      <p v-if="correction">Motivo de la rectificación: {{ correctionReason }}</p>
      <dl v-for="diff in correctionChanges" :key="diff.label"><dt>{{ diff.label }}</dt><dd>Antes: {{ diff.remote }}</dd><dd>Ahora: {{ diff.local }}</dd></dl><dl v-for="field in fields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ reviewed.form[field.key] }}</dd></dl><p>{{ dateLabel(reviewed.form.date) }} · {{ reviewed.form.origin ? 'Con cita vinculada' : 'Atención sin cita' }}</p><p>Realizados: {{ summary(reviewed.form.done, reviewed.form.performed) || 'Sin procedimiento' }}</p><p>Previstos: {{ summary(reviewed.form.future, reviewed.form.indication) || 'Sin indicación' }}</p><p>Tu firma profesional quedará vinculada a esta versión con tu nombre, cédula y fecha. Si se requiere la firma del paciente o de su representante, seguirá pendiente.</p>
      <v-btn color="primary" :disabled="busy" @click="sign">{{ correction ? 'Firmar rectificación' : 'Firmar nota' }}</v-btn>
      <v-btn text :disabled="busy" @click="reviewed=null">Volver a editar</v-btn></section>
    <template v-else-if="!form">
      <template v-if="canCreate"><p>Registra lo que ocurrió en la visita. Puedes asociar una cita o documentar una atención sin cita.</p>
      <v-btn outlined small :disabled="busy" @click="begin">Registrar atención</v-btn>
      <v-btn text small :disabled="busy" @click="load(page)">Actualizar borradores</v-btn>
      <h4>Mis borradores</h4>
      <p v-if="busy">Cargando borradores…</p><p v-else-if="!rows.length && !error">Aún no tienes borradores para este paciente.</p>
      <ul><li v-for="row in rows" :key="row.id"><div><strong>{{ row.form.reason || 'Atención sin motivo registrado' }}</strong><small>{{ dateLabel(row.form.date) }} · Borrador</small></div><v-btn outlined small @click="open(row)">Retomar borrador</v-btn></li></ul>
      <nav v-if="pages>1" aria-label="Páginas de borradores"><v-btn text :disabled="busy || page===1" @click="load(page-1)">Anterior</v-btn>{{ page }} de {{ pages }}<v-btn text :disabled="busy || page===pages" @click="load(page+1)">Siguiente</v-btn></nav></template>
      <h4>{{ historyId ? 'Historial de la nota' : 'Notas con firma profesional' }}</h4>
      <v-btn v-if="historyId" text @click="loadSigned(1)">Volver a notas firmadas</v-btn>
      <p v-if="!signed.length && !busy && !error">Aún no hay notas firmadas.</p>
      <article v-for="entry in signed" :key="entry.id+'-'+entry.version">
        <h4>{{ entry.form.reason }} · {{ dateLabel(entry.form.date) }}</h4>
        <p>Versión {{ entry.version }} · {{ entry.signer }} · Cédula {{ entry.license }} · {{ new Date(entry.signedAt).toLocaleString('es-MX') }}</p>
        <details><summary>Leer versión {{ entry.version }}</summary>
          <p v-if="entry.reason">Motivo de rectificación: {{ entry.reason }}</p>
          <dl v-for="field in fields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ entry.form[field.key] }}</dd></dl>
          <p>{{ entry.form.origin ? 'Con cita vinculada' : 'Atención sin cita' }}</p>
          <p>Realizados: {{ summary(entry.form.done,entry.form.performed) || 'Sin procedimiento' }}</p>
          <p>Previstos: {{ summary(entry.form.future,entry.form.indication) || 'Sin indicación' }}</p>
        </details>
        <evolution-team-notice v-if="!historyId || (signedPage===1 && entry===signed[0])" :patient="patient" :note-id="entry.id" />
        <v-btn v-if="!historyId" text @click="loadSigned(1,entry.id)">Ver historial</v-btn>
        <v-btn v-if="!historyId && canCorrect && actor===entry.author" outlined small @click="startCorrection(entry)">Rectificar nota</v-btn>
      </article>
      <nav v-if="signedPages>1" aria-label="Páginas de notas firmadas"><v-btn text :disabled="busy || signedPage===1" @click="loadSigned(signedPage-1,historyId)">Anterior</v-btn>{{ signedPage }} de {{ signedPages }}<v-btn text :disabled="busy || signedPage===signedPages" @click="loadSigned(signedPage+1,historyId)">Siguiente</v-btn></nav>
    </template>
    <form v-else @submit.prevent="save">
      <fieldset :disabled="busy"><legend>Datos de la visita</legend>
        <label>Cita de origen<select v-model="form.origin" :disabled="!!correction"><option value="">Atención sin cita</option>
          <option v-if="form.origin && !appointments.some(a=>a.id===form.origin)" :value="form.origin">Cita vinculada</option>
          <option v-for="a in appointments" :key="a.id" :value="a.id">{{ a.date }} · {{ a.startTime }} · {{ a.title || 'Consulta' }}</option></select></label>
        <label>Fecha de atención<input type="date" v-model="form.date"></label>
        <label v-for="field in fields" :key="field.key">{{ field.label }}<textarea v-model="form[field.key]" :maxlength="field.max" :rows="field.rows"></textarea></label>
      </fieldset>
      <fieldset :disabled="busy"><legend>Tratamientos</legend>
        <nc5-treatment-select v-model="form.done" :items="treatments" :disabled="busy || form.none" label="Tratamientos realizados del plan" />
        <label>Otro tratamiento realizado<input v-model="form.performed" maxlength="255" :disabled="form.none"></label>
        <label><input type="checkbox" v-model="form.none" @change="clearPerformed"> No se realizó un procedimiento</label>
        <nc5-treatment-select v-model="form.future" :items="treatments" :disabled="busy" label="Tratamientos previstos del plan" />
        <label>Otra indicación<input v-model="form.indication" maxlength="2000"></label>
      </fieldset>
      <section v-if="conflict" role="alert"><h4>{{ conflict.id === id ? 'Otra sesión guardó cambios' : 'Esta cita ya tiene otro borrador' }}</h4><p>Tu captura sigue abierta. Compara ambas versiones antes de elegir.</p>
        <dl v-for="field in differences" :key="field.label"><dt>{{ field.label }}</dt><dd>Tu captura: {{ field.local }}</dd><dd>Guardado: {{ field.remote }}</dd></dl>
        <v-btn text @click="open(conflict)">Usar versión guardada</v-btn>
        <v-btn outlined @click="reconcile">Continuar con mi captura</v-btn>
      </section>
      <p v-if="correction && correction.form.performed && correction.form.performed!==form.performed">El cambio se conservará en la nota. Revisa también el tratamiento y su costo en el plan.</p>
      <label v-if="correction">¿Por qué rectificas esta nota?<textarea v-model="correctionReason" maxlength="1000" rows="2"></textarea></label>
      <v-btn v-if="correction" color="primary" :disabled="busy || !dirty || !correctionReason.trim()" @click="reviewCorrection">Revisar rectificación</v-btn>
      <v-btn v-else type="submit" color="primary" :disabled="busy || !!conflict">Guardar borrador</v-btn>
      <v-btn v-if="revision && !correction" text :disabled="busy || !!conflict || dirty" @click="review">Revisar versión guardada</v-btn>
      <v-btn text :disabled="busy" @click="cancel">Volver</v-btn>
      <div v-if="discard"><p>Hay cambios sin guardar.</p><v-btn text @click="discard=false">Seguir editando</v-btn><v-btn text @click="leave">Descartar cambios</v-btn></div>
    </form>
  </section>
</template>
<script>
import { uuid } from 'vue-uuid'
import { DACore } from '../../../services/config/axios.context'
import EvolutionTeamNotice from './EvolutionTeamNotice.vue'
import Nc5TreatmentSelect from './Nc5TreatmentSelect.vue'
const fields=[{key:'reason',label:'Motivo de atención',rows:1,max:2000},{key:'evolution',label:'Evolución y valoración',rows:3,max:10000},{key:'plan',label:'Plan e indicaciones',rows:2,max:10000}]
const copy=value=>JSON.parse(JSON.stringify(value))
export default {
  components:{Nc5TreatmentSelect,EvolutionTeamNotice},
  props:{actor:String,canCreate:{type:Boolean,default:true},canCorrect:Boolean,patient:{type:String,required:true},treatments:{type:Array,default:()=>[]},appointments:{type:Array,default:()=>[]}},
  data(){return {signed:[],signedPage:1,signedPages:1,historyId:'',correction:null,correctionReason:'',requestId:'',fields,rows:[],page:1,pages:1,id:'',revision:0,form:null,reviewed:null,baseline:'',busy:false,conflict:null,discard:false,error:'',message:''}},
  computed:{
    dirty(){return this.form && JSON.stringify(this.form)!==this.baseline},
    path(){return 'api/tracing/patient/'+encodeURIComponent(this.patient)+'/evolution-drafts'},
    signedPath(){return this.path.replace('evolution-drafts','evolution-notes')},
    correctionChanges(){return this.correction ? this.compare(this.correction.form) : []},
    differences(){return this.conflict ? this.compare(this.conflict.form) : []}
  },
  async created(){
    await this.loadSigned(1)
    if(!this.canCreate)return
    const origin=this.$route.query.draftVisit
    if(typeof origin!=='string' || !origin){await this.load(1);return}
    this.busy=true
    try{
      const r=await DACore.get(this.path,{params:{origin}})
      if(!r.success)throw Error(r.message)
      if(r.data.items.length)this.open(r.data.items[0])
      else if(r.data.signedId){await this.loadSigned(1,r.data.signedId);this.message='Ya firmaste una nota para esta cita.'}
      else {this.begin();this.form.origin=origin;this.baseline=JSON.stringify(this.form)}
    }catch(e){this.error=e.message || 'No se pudo abrir el borrador de la cita.'}finally{this.busy=false}
  },
  methods:{
    compare(previous){
      
      const labels={date:'Fecha',origin:'Cita',reason:'Motivo',evolution:'Valoración',plan:'Plan',done:'Realizados',future:'Previstos',performed:'Otro tratamiento',indication:'Otra indicación',none:'Sin procedimiento'}
      const show=v=>Array.isArray(v)?v.map(t=>t.name).join(', '):typeof v==='boolean'?(v?'Sí':'No'):v
      return Object.keys(labels).filter(k=>JSON.stringify(this.form[k])!==JSON.stringify(previous[k])).map(k=>({label:labels[k],local:show(this.form[k]) || 'Sin dato',remote:show(previous[k]) || 'Sin dato'}))
    },
    async loadSigned(page,id=''){
      this.busy=true
      try{
        const r=await DACore.get(this.signedPath+(id?'/'+id+'/versions':''),{params:{page}})
        if(!r.success)throw Error(r.message)
        this.signed=r.data.items;this.signedPage=r.data.pagination.page;this.signedPages=r.data.pagination.totalPages;this.historyId=id
      }catch(e){this.error=e.message || 'No se pudo consultar el historial.'}finally{this.busy=false}
    },
    startCorrection(entry){
      this.open({id:entry.id,revision:entry.version,form:entry.form})
      this.correction=entry
    },
    reviewCorrection(){
      if(!this.dirty || !this.correctionReason.trim())return
      this.requestId=uuid.v4()
      this.reviewed={form:copy(this.form)}
    },
    async sign(){
      if(this.busy || !this.reviewed)return
      this.busy=true;this.error=''
      try{
        const body={revision:this.revision,requestId:this.requestId}
        if(this.correction){body.form=this.reviewed.form;body.reason=this.correctionReason}
        const result=await DACore.put(this.signedPath+'/'+this.id+'/'+(this.correction?'rectify':'sign'),body)
        if(!result.success)throw Error(result.message)
        this.message=result.message
        this.reviewed=null;this.correction=null;this.form=null
        await this.loadSigned(1)
        if(this.canCreate)await this.load(1)
      }catch(e){this.error=e.message || 'No se pudo confirmar la firma. Puedes reintentar.'}finally{this.busy=false}
    },
    dateLabel(date){return date ? new Date(date+'T12:00:00').toLocaleDateString('es-MX') : 'Sin fecha'},
    async load(page){
      this.busy=true; this.error=''
      try {const r=await DACore.get(this.path,{params:{page}});if(!r.success)throw Error(r.message)
        this.rows=r.data.items;this.page=r.data.pagination.page;this.pages=r.data.pagination.totalPages
      } catch(e){this.error=e.message || 'No se pudieron cargar los borradores.'}finally{this.busy=false}
    },
    begin(){this.open({id:uuid.v4(),revision:0,form:{date:new Date().toLocaleDateString('sv-SE'),origin:'',reason:'',evolution:'',plan:'',done:[],future:[],none:false,performed:'',indication:''}})},
    open(row){this.correction=null;this.correctionReason='';this.requestId='';this.id=row.id;this.revision=row.revision;this.form=copy(row.form);this.baseline=JSON.stringify(this.form);this.conflict=null;this.message='';this.error='';this.discard=false},
    reconcile(){
      if(this.id!==this.conflict.id){
        this.form.origin=''
        this.conflict=null
        this.error=''
        this.message='Conservaste tu captura. Puedes guardarla sin cita o elegir otra.'
        return
      }
      this.revision=this.conflict.revision;this.baseline=JSON.stringify(this.conflict.form);this.conflict=null;this.message='Revisa tu captura y guarda cuando esté lista.';this.error=''},
    summary(items,extra){return [...items.map(t=>t.name),extra].filter(Boolean).join(' · ')},
    async review(){
      this.busy=true;this.error=''
      try{
        const r=await DACore.get(this.path+'/'+this.id+'/review',{params:{revision:this.revision}})
        if(!r.success){if(r.status===409)this.conflict=r.data;throw Error(r.message)}
        this.requestId=uuid.v4();this.reviewed=r.data
      }catch(e){this.error=e.message || 'No se pudo revisar la versión guardada.'}finally{this.busy=false}
    },
    clearPerformed(){if(this.form.none){this.form.done=[];this.form.performed=''}},
    cancel(){if(this.baseline===JSON.stringify(this.form))this.leave();else this.discard=true},
    leave(){this.correction=null;this.form=null;this.conflict=null;this.discard=false;if(this.canCreate)this.load(1)},
    async save(){
      if(this.correction){this.reviewCorrection();return}
      if(this.busy || this.conflict)return
      this.busy=true;this.error='';this.message=''
      try {
        const r=await DACore.put(this.path+'/'+this.id,{revision:this.revision,form:this.form})
        if(!r.success){if(r.status===409 && r.data)this.conflict=r.data;throw Error(r.message)}
        this.form=null;this.message='Borrador guardado. Puedes retomarlo desde otra sesión.';await this.load(1)
      }catch(e){this.error=e.message || 'No se pudo confirmar el guardado. Tu captura sigue abierta.'}finally{this.busy=false}
    }
  }
}
</script>
<style scoped>
.drafts{padding:18px;margin-bottom:16px;border:1px solid var(--color-border,#cbdcdb);border-radius:12px;background:var(--color-surface,#fff)}
.drafts fieldset{min-width:0;border:1px solid #bdcecf;border-radius:8px;margin:12px 0;padding:12px}.drafts label,.drafts small{display:block;margin:8px 0}.drafts textarea,.drafts select,.drafts input:not([type=checkbox]){display:block;border:1px solid #91a9ab;border-radius:6px;padding:8px;width:100%;color:inherit;font:inherit}.drafts select{appearance:auto}.drafts ul{list-style:none;padding:0}.drafts li{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #cad6d6;padding:8px 0}.drafts dd{white-space:pre-wrap;overflow-wrap:anywhere}.drafts h4{margin:12px 0 5px}
</style>
