<template>
  <section class="drafts note" aria-label="Notas de evolución">
    <header class="note-head"><div><p class="eyebrow">SEGUIMIENTO</p>
      <h3 ref="heading" tabindex="-1">{{ reviewed ? 'Revisar antes de firmar' : correction ? 'Rectificar nota' : form ? (revision ? 'Retomar borrador' : 'Registrar atención') : historyId ? 'Nota firmada' : 'Seguimiento del paciente' }}</h3>
    </div></header>
    <p v-if="message" class="feedback" ref="result" tabindex="-1" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
        <section v-if="reviewed"><h4>{{ correction ? 'Revisar rectificación' : 'Revisar y firmar la nota' }}</h4>
      <p v-if="correction">Motivo de la rectificación: {{ correctionReason }}</p>
      <div v-for="diff in correctionChanges" :key="diff.label" class="change"><strong>{{ diff.label }}</strong><div class="pair"><div><small>Versión firmada</small>{{ diff.remote }}</div><div><small>Corrección</small>{{ diff.local }}</div></div></div><dl v-for="field in fields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ reviewed.form[field.key] }}</dd></dl><p>{{ dateLabel(reviewed.form.date) }} · {{ reviewed.form.origin ? 'Con cita vinculada' : 'Atención sin cita' }}</p><p>Realizados: {{ summary(reviewed.form.done, reviewed.form.performed) || 'Sin procedimiento' }}</p><p>Previstos: {{ summary(reviewed.form.future, reviewed.form.indication) || 'Sin indicación' }}</p><p>Tu firma profesional quedará vinculada a esta versión con tu nombre, cédula y fecha. Si se requiere la firma del paciente o de su representante, seguirá pendiente.</p>
      <div v-if="closedItems.length" role="group" aria-label="Confirmar procedimientos de planes cerrados">
        <p>Estos procedimientos siguen pendientes en un plan cerrado:</p>
        <ul><li v-for="item in closedItems" :key="item.id">{{ item.name }} · {{ procedureOrigin(item) }}</li></ul>
        <label><input type="checkbox" v-model="acceptClosed"> Confirmo que se realizaron. Se registrarán solo en la nota y el plan seguirá cerrado.</label>
      </div>
      <v-btn color="primary" :disabled="busy || (closedItems.length>0 && !acceptClosed)" @click="sign">{{ correction ? 'Firmar rectificación' : 'Firmar nota' }}</v-btn>
      <v-btn text :disabled="busy" @click="reviewed=null">Volver a editar</v-btn></section>
    <template v-else-if="!form">
      <template v-if="!historyId">
        <p v-if="canCreate">¿Ya atendiste al paciente? Elige la cita de esa visita para escribir su nota de evolución. También puedes registrar una atención sin cita.</p>
        <div v-if="canCreate" class="agenda-strip">
          <div v-if="visit"><span class="eyebrow">Cita del {{ dateLabel(visit.date) }}</span>
            <strong>{{ visit.startTime }} · {{ visit.title || 'Consulta' }}</strong><span>{{ visit.doctorName }}</span>
            <label v-if="visitChoices.length > 1">Elegir otra cita<select v-model="visitId"><option v-for="a in visitChoices" :value="a.id" :key="a.id">{{ dateLabel(a.date) }} · {{ a.startTime }} · {{ a.title || 'Consulta' }} · {{ a.doctorName }}</option></select></label>
          </div>
          <div v-else><span class="eyebrow">Nota de evolución</span><strong>{{ rows.length ? 'Tienes un borrador guardado' : 'Registrar una atención' }}</strong></div>
          <button class="primary" type="button" :disabled="busy" @click="openPrimary">{{ primaryLabel }}</button>
        </div>
        <button v-if="canCreate && (visit || rows.length)" class="link-btn" type="button" :disabled="busy" @click="begin">Registrar atención sin cita</button>
        <div class="facts"><div><small>Última atención firmada</small><strong>{{ latest ? dateLabel(latest.form.date) : 'Sin nota firmada' }}</strong></div>
          <div><small>Tratamiento de esa visita</small><strong>{{ latest ? treatment(latest.form) : 'Sin registro' }}</strong></div>
          <div><small>Próxima visita</small><strong>{{ nextVisit ? dateLabel(nextVisit.date) + ' · ' + nextVisit.startTime : 'Sin cita programada' }}</strong></div></div>
        <h4>Atenciones y seguimientos anteriores</h4>
        <p v-if="busy" role="status">Cargando registros…</p>
        <div v-if="integrityBanner" class="integrity-alert" :class="'is-'+integrityBanner.state" :role="integrityBanner.state==='discrepancy'?'alert':'status'" data-integrity-banner>
          <strong>{{ integrityBanner.title }}</strong><p>{{ integrityBanner.text }}</p>
          <button v-if="integrityBanner.state==='unavailable'" type="button" :disabled="busy" @click="refreshHistory">Reintentar</button></div>
        <button v-if="error" type="button" @click="refreshHistory">Volver a cargar el historial</button>
        <p v-if="!busy && !error && !historyRows.length">Aún no hay atenciones ni seguimientos registrados.</p>
        <div v-if="historyRows.length" class="history-table"><table><thead><tr><th>Fecha</th><th>Registro</th><th>Tratamiento realizado</th><th>Próxima visita</th><th>Detalle</th></tr></thead>
          <tbody><tr v-for="row in visibleRows" :key="row.key" :data-pulse-record="row.kind === 'legacy' ? row.item.id_tracing : null">
            <td data-label="Fecha">{{ dateLabel(row.date) }}</td><td data-label="Registro"><strong>{{ row.kind === 'legacy' ? 'Seguimiento anterior' : 'Nota de evolución' }}</strong><small class="chip" :class="row.kind==='signed' && !row.item.form ? 'integrity-badge is-discrepancy' : ''">{{ row.status }}</small><small v-if="badge(row.item)" class="integrity-badge" :class="'is-'+row.item.integrity.state" data-integrity-badge>{{ badge(row.item) }}</small><small v-if="row.item.form">{{ row.item.form.reason }}</small></td>
            <td data-label="Tratamiento">{{ row.treatment }}</td><td data-label="Próxima visita">{{ row.next }}</td>
            <td><slot v-if="row.kind === 'legacy'" name="legacy-actions" :item="row.item" /><button v-else-if="row.kind==='signed' && !row.item.id" type="button" disabled>Sin detalle disponible</button><button v-else type="button" :disabled="busy" @click="row.kind === 'draft' ? open(row.item) : viewSigned(row.item.id)">{{ row.kind === 'draft' ? 'Retomar borrador' : row.item.form ? 'Ver nota' : 'Ver detalle' }}</button></td>
          </tr></tbody></table></div>
        <nav v-if="historyPage > 1 || moreHistory" class="actions" aria-label="Páginas del historial"><button :disabled="busy || historyPage===1" @click="historyPage--">Anterior</button><span role="status">Página {{ historyPage }}</span><button :disabled="busy || !moreHistory" @click="nextPage">Siguiente</button></nav>
        <div v-if="canCreate" class="actions"><button type="button" :disabled="busy" @click="begin">Nuevo seguimiento</button></div>
      </template>
      <template v-else><button type="button" @click="refreshHistory">Volver al historial</button>
      <div v-if="integrityBanner" class="integrity-alert" :class="'is-'+integrityBanner.state" :role="integrityBanner.state==='discrepancy'?'alert':'status'" data-integrity-banner><strong>{{ integrityBanner.title }}</strong><p>{{ integrityBanner.text }}</p><button v-if="integrityBanner.state==='unavailable'" type="button" :disabled="busy" @click="loadSigned(signedPage,historyId)">Reintentar</button></div>
      <article v-for="entry in signed" :key="entry.id+'-'+entry.version">
        <div v-if="!entry.form" class="integrity-alert is-discrepancy" role="alert" data-integrity-alert>
          <strong>{{ entry.version ? 'Versión '+entry.version+' · revisión requerida' : 'Revisión requerida' }}</strong>
          <p>{{ discrepancyText(entry) }}</p>
          <p>Comparte esta referencia con Soporte de HEMIA: <code>{{ reference(entry) }}</code></p>
        </div>
        <template v-else>
        <h4>{{ entry.form.reason }} · {{ dateLabel(entry.form.date) }}</h4>
        <p>Versión {{ entry.version }} · {{ entry.signer }} · Cédula {{ entry.license }} · {{ new Date(entry.signedAt).toLocaleString('es-MX') }}</p>
        <p v-if="entry.integrity && entry.integrity.state==='verified'" class="integrity-badge is-verified" data-integrity-badge>Integridad verificada</p>
        <p v-else-if="entry.integrity && entry.integrity.state==='historical'" class="integrity-badge is-historical" data-integrity-badge>Anterior al control de integridad: no se puede comprobar si cambió desde su firma.</p>
        <p v-else-if="entry.integrity && entry.integrity.state==='unavailable'" class="integrity-badge is-unavailable" data-integrity-badge>Integridad sin verificar por ahora.</p>
        <details><summary>Leer versión {{ entry.version }}</summary>
          <p v-if="entry.reason">Motivo de rectificación: {{ entry.reason }}</p>
          <dl v-for="field in fields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ entry.form[field.key] }}</dd></dl>
          <p>{{ entry.form.origin ? 'Con cita vinculada' : 'Atención sin cita' }}</p>
          <p>Realizados: {{ summary(entry.form.done,entry.form.performed) || 'Sin procedimiento' }}</p>
          <p v-for="item in entry.form.done.filter(p=>p.closedPlan)" :key="item.id">{{ item.name }} · {{ item.planTitle || 'Plan cerrado' }} · {{ item.noteOnly ? 'Registrado solo en la nota' : 'Ya completado en el plan' }}</p>
          <p>Previstos: {{ summary(entry.form.future,entry.form.indication) || 'Sin indicación' }}</p>
        </details>
        <h4 v-if="signedPage===1 && entry===signed[0]">¿Qué hacemos con la próxima cita?</h4><div v-if="signedPage===1 && entry===signed[0]" class="actions"><slot name="booking" /><button type="button" @click="refreshHistory">Volver sin reservar</button></div>
        <evolution-team-notice v-if="signedPage===1 && entry===signed[0]" :patient="patient" :note-id="entry.id" />
        
        <v-btn v-if="canCorrect && signedPage===1 && entry===signed[0] && actor===entry.author && !integrityIssue" outlined small @click="startCorrection(entry)">Rectificar nota</v-btn>
        </template>
      </article>
      <nav v-if="signedPages>1" aria-label="Páginas de notas firmadas"><v-btn text :disabled="busy || signedPage===1" @click="loadSigned(signedPage-1,historyId)">Anterior</v-btn>{{ signedPage }} de {{ signedPages }}<v-btn text :disabled="busy || signedPage===signedPages" @click="loadSigned(signedPage+1,historyId)">Siguiente</v-btn></nav>
    </template>
    </template>
    <form v-else @submit.prevent="save">
      <fieldset :disabled="busy"><legend ref="editor" tabindex="-1">Datos de la visita</legend>
        <label>Cita de origen<select v-model="form.origin" :disabled="!!correction"><option value="">Atención sin cita</option>
          <option v-if="form.origin && !appointments.some(a=>a.id===form.origin)" :value="form.origin">Cita vinculada</option>
          <option v-for="a in appointments" :key="a.id" :value="a.id">{{ a.date }} · {{ a.startTime }} · {{ a.title || 'Consulta' }}</option></select></label>
        <label>Fecha de atención<input type="date" v-model="form.date"></label>
        </fieldset><fieldset :disabled="busy"><legend>Nota clínica</legend>
        <label v-for="field in fields" :key="field.key">{{ field.label }}<textarea v-model="form[field.key]" :maxlength="field.max" :rows="field.rows"></textarea></label>
      </fieldset>
      <fieldset :disabled="busy"><legend>Tratamiento de esta visita</legend>
        <p v-if="catalogError" role="alert">No se pudieron cargar los planes. <button type="button" @click="loadProcedures">Volver a intentar</button></p>
        <label v-if="catalog && !catalog.active && catalog.plans.length">Ver procedimientos de
          <select v-model="historyMode" @change="loadProcedures">
            <option value="latest">Último plan cerrado</option><option value="all">Todos los planes cerrados</option>
          </select>
        </label>
        <p v-if="catalog && !catalog.active && historyMode==='latest' && catalog.plans.length">{{ planLabel(catalog.plans[0]) }}</p>
        <p v-if="catalog && !catalog.active && !catalog.plans.length">Este paciente aún no tiene procedimientos de un plan para elegir.</p>
        <nc5-treatment-select v-model="form.done" :items="doneOptions" :disabled="busy || form.none" label="Tratamientos realizados del plan" />
        <p class="plan-hint"><strong>Al firmar la nota</strong>, los procedimientos seleccionados del plan activo quedarán marcados como realizados. Los planes cerrados conservarán su estado.</p>
        <ul v-if="form.done.some(item=>item.planId)" aria-label="Procedimientos seleccionados y plan de origen"><li v-for="item in form.done.filter(p=>p.planId)" :key="item.id">{{ procedureLabel(item) }}</li></ul>
        <label>Otro tratamiento realizado<input v-model="form.performed" maxlength="255" :disabled="form.none"></label><p class="muted">Al firmar, el tratamiento adicional quedará en «Otros tratamientos» del plan activo. Si aún no hay plan, se incorporará al próximo.</p>
        <label><input type="checkbox" v-model="form.none" @change="clearPerformed"> No se realizó un procedimiento</label>
        </fieldset><fieldset :disabled="busy"><legend>Tratamientos previstos</legend>
        <nc5-treatment-select v-if="(catalog && catalog.active) || form.future.length" v-model="form.future" :items="catalog && catalog.active ? catalog.items : []" :disabled="busy" label="Tratamientos previstos del plan" />
        <label>Otra indicación<input v-model="form.indication" maxlength="2000"></label>
      </fieldset>
      <section v-if="conflict" role="alert"><h4>{{ conflict.id === id ? 'Otra sesión guardó cambios' : 'Esta cita ya tiene otro borrador' }}</h4><p>Tu captura sigue abierta. Compara ambas versiones antes de elegir.</p>
        <dl v-for="field in differences" :key="field.label"><dt>{{ field.label }}</dt><dd>Tu captura: {{ field.local }}</dd><dd>Guardado: {{ field.remote }}</dd></dl>
        <v-btn text @click="open(conflict)">Usar versión guardada</v-btn>
        <v-btn outlined @click="reconcile">Continuar con mi captura</v-btn>
      </section>
      <p v-if="correction && correction.form.performed && correction.form.performed!==form.performed">El cambio se conservará en la nota. Revisa también el tratamiento y su costo en el plan.</p>
      <label v-if="correction">¿Por qué rectificas esta nota?<textarea v-model="correctionReason" maxlength="1000" rows="2"></textarea></label>
      <div class="draft-actions">
      <v-btn v-if="correction" color="primary" :disabled="busy || !dirty || !correctionReason.trim()" @click="reviewCorrection">Revisar rectificación</v-btn>
      <v-btn v-else type="submit" color="primary" :disabled="busy || !!conflict">Guardar borrador</v-btn>
      <v-btn v-if="revision && !correction" text :disabled="busy || !!conflict || dirty" @click="review">Revisar versión guardada</v-btn>
      <v-btn text :disabled="busy" @click="cancel">Volver</v-btn></div>
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
  props:{actor:String,canCreate:{type:Boolean,default:true},canCorrect:Boolean,patient:{type:String,required:true},legacy:{type:Array,default:()=>[]},today:String,nextVisit:Object,appointments:{type:Array,default:()=>[]}},
  data(){return {historyPage:1,visitId:'',latest:null,catalog:null,catalogError:false,historyMode:"latest",closedItems:[],acceptClosed:false,signed:[],integrity:null,signedPage:1,signedPages:1,historyId:'',correction:null,correctionReason:'',requestId:'',fields,rows:[],page:1,pages:1,id:'',revision:0,form:null,reviewed:null,baseline:'',busy:false,conflict:null,discard:false,error:'',message:''}},
  computed:{
    visitChoices(){
      return this.appointments.filter(a => a.date && a.date <= this.today && !['cancelled','rescheduled','no_show'].includes(a.status))
        .slice().sort((a,b) => (b.date+b.startTime).localeCompare(a.date+a.startTime))
    },
    visit(){ return this.visitChoices.find(a => a.id===this.visitId) || this.visitChoices[0] },
    primaryLabel(){
      if (!this.visit) return this.rows.length ? 'Retomar borrador' : 'Registrar atención sin cita'
      if (this.rows.some(n=>n.form.origin===this.visit.id)) return 'Retomar borrador'
      if (this.signed.some(n=>n.form && n.form.origin===this.visit.id)) return 'Ver nota firmada'
      return 'Registrar nota de esta cita'
    },
    historyRows(){
      const notes=(items,kind)=>items.map(item=>({item,kind,key:kind+(item.id || 'sin-referencia')+'-'+(item.version || ''),date:item.form ? item.form.date : '',
        stamp:item.form ? new Date(item.signedAt || item.updatedAt).getTime() : Number.MAX_SAFE_INTEGER,
        status:kind==='draft'?'Borrador':item.form ? 'Firmada' : 'Revisión requerida',
        treatment:item.form ? this.treatment(item.form) : 'No disponible',next:item.form ? 'Consultar en Agenda' : 'No disponible'}))
      const previous=this.legacy.map(item=>({item,kind:'legacy',key:'legacy'+item.id_tracing,date:String(item.quote_date_now || '').slice(0,10),
        stamp:Date.parse(item.quote_date_now)||0,status:item.status==='cancelled'?'Anulado':'Registro previo',
        treatment:[item.treatment_now,item.other_performed].filter(Boolean).join(' · ') || 'Sin registro',
        next:item.linked_appointment_id ? 'Ver cita vinculada' : item.quote_date_after ? 'Sugerida · '+this.dateLabel(String(item.quote_date_after).slice(0,10)) : 'Sin dato de cita'}))
      return [...notes(this.rows,'draft'),...notes(this.signed,'signed'),...previous].sort((a,b)=>b.stamp-a.stamp || a.key.localeCompare(b.key))
    },
    visibleRows(){return this.historyRows.slice((this.historyPage-1)*10,this.historyPage*10)},
    moreHistory(){return this.historyRows.length>this.historyPage*10 || (this.canCreate && this.page<this.pages) || this.signedPage<this.signedPages},
    doneOptions(){
      if(!this.catalog)return []
      if(this.catalog.active)return this.catalog.items
      const options=[]
      for(const plan of this.catalog.plans){
        const group=this.catalog.items.filter(item=>item.planId===plan.id)
        if(group.length)options.push(...group.map((item,index)=>({...item,planTitle:plan.title,startedDate:plan.startedDate,closedDate:plan.closedDate,heading:index===0?this.planLabel(plan):'',display:item.name+' · '+this.planLabel(plan)})))
      }
      return options
    },
    dirty(){return this.form && JSON.stringify(this.form)!==this.baseline},
    path(){return 'api/tracing/patient/'+encodeURIComponent(this.patient)+'/evolution-drafts'},
    signedPath(){return this.path.replace('evolution-drafts','evolution-notes')},
    correctionChanges(){return this.correction ? this.compare(this.correction.form) : []},
    differences(){return this.conflict ? this.compare(this.conflict.form) : []},
    integrityIssue(){return Boolean(this.integrity && ['discrepancy','unavailable'].includes(this.integrity.state)) || this.signed.some(entry=>!entry.form)},
    integrityBanner(){
      const state=this.integrity && this.integrity.state
      if(state==='discrepancy'){
        const title='Revisión requerida'
        if(this.historyId)return {state,title,text:'Falta una versión o hay datos que difieren de lo firmado. Puedes leer las versiones verificadas. Contacta a Soporte de HEMIA con la referencia '+this.reference({id:this.historyId})+' e informa al responsable del consultorio.'}
        let text='El historial firmado de este paciente necesita revisión. Contacta a Soporte de HEMIA e informa al responsable del consultorio.'
        if(this.signed.some(entry=>!entry.id))text+=' Si no ves un detalle, indica a Soporte de HEMIA el consultorio, la hora y este mensaje.'
        return {state,title,text}
      }
      if(state==='unavailable')return {state,title:'No se pudo comprobar la integridad',text:'Puedes seguir leyendo las notas disponibles, pero aún no están verificadas. Vuelve a intentarlo en unos momentos. Si el aviso continúa, contacta a Soporte de HEMIA.'}
      return null
    }
  },
  async created(){
    await this.refreshHistory()
    const origin=this.$route.query.draftVisit
    if(this.canCreate && typeof origin==='string' && origin) await this.openVisit(origin)
  },
  methods:{
    badge(item){
      const state=item.integrity && item.integrity.state
      if(state==='unavailable')return 'Verificar'
      if(state==='historical')return 'Anterior al control'
      return ''
    },
    discrepancyText(entry){
      const code=entry.integrity && entry.integrity.code
      if(code==='VERSION_MISSING')return entry.version ? 'Falta la versión '+entry.version+' de esta nota. El historial no está completo.' : 'Falta una nota firmada de este paciente.'
      if(code==='UNREFERENCED_VERSION')return 'Hay una versión que no consta en el control de integridad y no se muestra como nota firmada válida.'
      return 'Esta versión no coincide con lo que se firmó, por lo que no se muestra como nota firmada válida.'
    },
    reference(entry){return [entry.id ? String(entry.id).slice(0,8) : 'historial',entry.version ? 'v'+entry.version : null,entry.integrity && entry.integrity.code].filter(Boolean).join(' · ')},
    treatment(form){return [...(form.done || []).map(p=>p.name),form.performed].filter(Boolean).join(' · ') || (form.none?'Sin procedimiento':'Sin registro')},
    async refreshHistory(){
      this.historyPage=1; this.latest=null; this.historyId=''; this.error=''; this.signed=[]; this.rows=[]
      await this.loadSigned(1)
      if(this.canCreate) await this.load(1)
    },
    async viewSigned(id){await this.loadSigned(1,id);this.focusAfterRender('heading')},
    async nextPage(){
      const target=this.historyPage+1
      if(this.canCreate && this.page<target && this.page<this.pages && !await this.load(this.page+1,true))return
      if(this.signedPage<target && this.signedPage<this.signedPages && !await this.loadSigned(this.signedPage+1,'',true))return
      if (this.historyRows.length>(target-1)*10)this.historyPage=target
    },
    openPrimary(){
      if(this.visit)return this.openVisit(this.visit.id)
      if(this.rows.length)return this.open(this.rows[0])
      this.begin()
    },
    async openVisit(origin){
    this.busy=true
    try{
      const r=await DACore.get(this.path,{params:{origin}})
      if(!r.success)throw Error(r.message)
      if(r.data.items.length)this.open(r.data.items[0])
      else if(r.data.signedId){await this.loadSigned(1,r.data.signedId);this.message='Ya firmaste una nota para esta cita.'}
      else {this.begin();this.form.origin=origin;const visit=this.appointments.find(a=>a.id===origin);if(visit)this.form.date=visit.date;this.baseline=JSON.stringify(this.form)}
    }catch(e){this.error=e.message || 'No se pudo abrir el borrador de la cita.'}finally{this.busy=false}
    },
    compare(previous){
      
      const labels={date:'Fecha',origin:'Cita',reason:'Motivo',evolution:'Valoración',plan:'Plan',done:'Realizados',future:'Previstos',performed:'Otro tratamiento',indication:'Otra indicación',none:'Sin procedimiento'}
      const show=v=>Array.isArray(v)?v.map(this.procedureLabel).join(', '):typeof v==='boolean'?(v?'Sí':'No'):v
      return Object.keys(labels).filter(k=>JSON.stringify(this.form[k])!==JSON.stringify(previous[k])).map(k=>({label:labels[k],local:show(this.form[k]) || 'Sin dato',remote:show(previous[k]) || 'Sin dato'}))
    },
    async loadSigned(page,id='',append=false){
      this.busy=true
      try{
        const r=await DACore.get(this.signedPath+(id?'/'+id+'/versions':''),{params:{page}})
        if(!r.success)throw Error(r.message)
        this.signed=append ? this.signed.concat(r.data.items) : r.data.items;
        this.integrity=r.data.integrity || null
        if(!id && page===1)this.latest=r.data.items.find(item=>item.form) || null;
        this.signedPage=r.data.pagination.page;this.signedPages=r.data.pagination.totalPages;this.historyId=id;return true
      }catch(e){this.error=e.message || 'No se pudo consultar el historial.'}finally{this.busy=false}
    },
    startCorrection(entry){
      this.open({id:entry.id,revision:entry.version,form:entry.form})
      this.correction=entry
    },
    reviewCorrection(){
      if(!this.dirty || !this.correctionReason.trim())return
      this.requestId=uuid.v4()
      this.closedItems=[];this.acceptClosed=false;this.reviewed={form:copy(this.form)}
    },
    async sign(){
      if(this.busy || !this.reviewed)return
      this.busy=true;this.error=''
      try{
        const body={revision:this.revision,requestId:this.requestId}
        if(this.acceptClosed)body.confirmedClosed=this.closedItems.map(item=>item.id)
        if(this.correction){body.form=this.reviewed.form;body.reason=this.correctionReason}
        const result=await DACore.put(this.signedPath+'/'+this.id+'/'+(this.correction?'rectify':'sign'),body)
        if(!result.success){
          if(result.data && result.data.code==='CONFIRM_CLOSED_PROCEDURES'){
            this.closedItems=result.data.items;this.acceptClosed=false
            return
          }
          throw Error(result.message)
        }
        this.message=result.message
        this.reviewed=null;this.correction=null;this.form=null
        await this.viewSigned(this.id)
        this.focusAfterRender("result")
      }catch(e){this.error=e.message || 'No se pudo confirmar la firma. Puedes reintentar.'}finally{this.busy=false}
    },
    focusAfterRender(ref){this.$nextTick(()=>{const target=this.$refs[ref];if(target)target.focus()})},
    planLabel(plan){
      return [plan.title || 'Plan sin título',plan.startedDate && 'Inicio '+this.dateLabel(plan.startedDate),
        plan.closedDate && 'Cierre '+this.dateLabel(plan.closedDate),'Ref. '+plan.id].filter(Boolean).join(' · ')
    },
    procedureOrigin(item){
      return this.planLabel({id:item.planId,title:item.planTitle,startedDate:item.startedDate,closedDate:item.closedDate})
    },
    procedureLabel(item){return item.planId ? item.name+' — '+this.procedureOrigin(item) : item.name},
    async loadProcedures(){
      const ticket=this.catalogTicket=(this.catalogTicket || 0)+1
      this.catalogError=false
      try{
        const r=await DACore.get(this.path+'/procedure-options',{params:{history:this.historyMode}})
        if(!r.success)throw Error(r.message)
        if(ticket===this.catalogTicket)this.catalog=r.data
      }catch{if(ticket===this.catalogTicket){this.catalogError=true;this.catalog=null}}
    },
    dateLabel(date){return date ? new Date(date+'T12:00:00').toLocaleDateString('es-MX') : 'Sin fecha'},
    async load(page,append=false){
      this.busy=true
      try {const r=await DACore.get(this.path,{params:{page}});if(!r.success)throw Error(r.message)
        this.rows=append ? this.rows.concat(r.data.items) : r.data.items;this.page=r.data.pagination.page;this.pages=r.data.pagination.totalPages;return true
      } catch(e){this.error=e.message || 'No se pudieron cargar los borradores.'}finally{this.busy=false}
    },
    begin(){this.open({id:uuid.v4(),revision:0,form:{date:this.today || new Date().toLocaleDateString('sv-SE'),origin:'',reason:'',evolution:'',plan:'',done:[],future:[],none:false,performed:'',indication:''}})},
    open(row){this.historyMode="latest";this.catalog=null;this.loadProcedures();this.correction=null;this.correctionReason='';this.requestId='';this.id=row.id;this.revision=row.revision;this.form=copy(row.form);this.baseline=JSON.stringify(this.form);this.conflict=null;this.message='';this.error='';this.discard=false;this.focusAfterRender("editor")},
    reconcile(){
      if(this.id!==this.conflict.id){
        this.form.origin=''
        this.conflict=null
        this.error=''
        this.message='Conservaste tu captura. Puedes guardarla sin cita o elegir otra.'
        return
      }
      this.revision=this.conflict.revision;this.baseline=JSON.stringify(this.conflict.form);this.conflict=null;this.message='Revisa tu captura y guarda cuando esté lista.';this.error=''},
    summary(items,extra){return [...items.map(this.procedureLabel),extra].filter(Boolean).join(' · ')},
    async review(){
      this.busy=true;this.error=''
      try{
        const r=await DACore.get(this.path+'/'+this.id+'/review',{params:{revision:this.revision}})
        if(!r.success){if(r.status===409)this.conflict=r.data;throw Error(r.message)}
        this.requestId=uuid.v4();this.closedItems=[];this.acceptClosed=false;this.reviewed=r.data
      }catch(e){this.error=e.message || 'No se pudo revisar la versión guardada.'}finally{this.busy=false}
    },
    clearPerformed(){if(this.form.none){this.form.done=[];this.form.performed=''}},
    cancel(){if(this.baseline===JSON.stringify(this.form))this.leave();else this.discard=true},
    leave(){this.correction=null;this.form=null;this.conflict=null;this.discard=false;this.refreshHistory()},
    async save(){
      if(this.correction){this.reviewCorrection();return}
      if(this.busy || this.conflict)return
      this.busy=true;this.error='';this.message=''
      try {
        const r=await DACore.put(this.path+'/'+this.id,{revision:this.revision,form:this.form})
        if(!r.success){if(r.status===409 && r.data)this.conflict=r.data;throw Error(r.message)}
        this.form=null;this.message='Borrador guardado. Puedes retomarlo desde otra sesión.';await this.refreshHistory();this.focusAfterRender('result')
      }catch(e){this.error=e.message || 'No se pudo confirmar el guardado. Tu captura sigue abierta.'}finally{this.busy=false}
    }
  }
}
</script>
<style scoped src="./nc5Note.css"></style>
<style scoped>
 .note .v-btn{min-height:36px}.note .v-btn.primary{color:white}.note input[type=checkbox]{display:inline;width:auto}.history-table td button{margin:2px}.drafts .draft-actions .v-btn{min-height:36px}
.drafts fieldset{min-width:0;border:1px solid #bdcecf;border-radius:8px;margin:12px 0;padding:12px}.drafts label,.drafts small{display:block;margin:8px 0}.drafts textarea,.drafts select,.drafts input:not([type=checkbox]){display:block;border:1px solid #91a9ab;border-radius:6px;padding:8px;width:100%;color:inherit;font:inherit}.drafts select{appearance:auto}.drafts ul{list-style:none;padding:0}.drafts li{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #cad6d6;padding:8px 0}.drafts dd{white-space:pre-wrap;overflow-wrap:anywhere}.drafts h4{margin:12px 0 5px}
@media(max-width:640px){.drafts form{padding-bottom:8rem}.draft-actions{position:fixed;inset-inline:0;bottom:0;z-index:8;justify-content:center;display:flex;flex-wrap:wrap;gap:.25rem;padding:.5rem .25rem calc(.5rem + env(safe-area-inset-bottom));background:var(--color-surface,#fff);border-top:1px solid var(--color-border,#cbdcdb)}}
.drafts li,.drafts section p{overflow-wrap:anywhere}.plan-hint{margin:.5rem 0 .75rem;padding:.6rem .8rem;border-inline-start:3px solid var(--color-primary,#18756e);color:inherit;font-size:.9rem;line-height:1.45}
.integrity-alert{margin:12px 0;padding:12px 14px;border:1px solid #d92d20;border-inline-start:5px solid #b42318;border-radius:8px;background:#fef3f2;color:#7a271a}.integrity-alert.is-unavailable{border-color:#b54708;background:#fffaeb;color:#7a2e0e}.integrity-alert strong{display:block;margin-bottom:4px}.integrity-alert button{margin-top:8px}.integrity-alert code{overflow-wrap:anywhere}
.drafts .integrity-badge{display:inline-block;width:fit-content;margin:2px 6px 2px 0;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:650;background:#e5f5ef;color:#07594e}.drafts .integrity-badge.is-discrepancy{background:#fee4e2;color:#912018}.drafts .integrity-badge.is-unavailable{background:#fef0c7;color:#7a2e0e}.drafts .integrity-badge.is-historical{background:#eef2f6;color:#364152}
.theme--dark .integrity-alert{background:#3a1c1a;color:#fecdca;border-color:#f97066}.theme--dark .integrity-alert.is-unavailable{background:#3d2a10;color:#fedf89;border-color:#f79009}.theme--dark .drafts .integrity-badge{background:#1c4b3f;color:#b6f0dd}.theme--dark .drafts .integrity-badge.is-discrepancy{background:#5a1f1a;color:#fecdca}.theme--dark .drafts .integrity-badge.is-unavailable{background:#4d3412;color:#fedf89}.theme--dark .drafts .integrity-badge.is-historical{background:#2f3a46;color:#d0d9e4}
</style>
