<template>
  <section class="note" aria-labelledby="nc5-title">
    <header class="note-head">
      <div><p class="eyebrow">SEGUIMIENTO</p><h3 id="nc5-title" ref="title" tabindex="-1">{{ title }}</h3>
      <p class="muted">Maqueta de Alameda · Datos, firmas y citas de prueba</p></div>
    </header>
    <p v-if="message" class="feedback" role="status">{{ message }}</p>
    <template v-if="mode === 'list'">
      <p>¿Ya atendiste al paciente? Elige la cita de esa visita para escribir su nota de evolución. Si lo atendiste sin cita, también puedes registrar la nota por separado.</p>
      <div class="agenda-strip"><div><span class="eyebrow">Cita del {{ dateLabel(visitDay) }}</span>
        <strong>10:00 · Consulta de control</strong><span>Dra. Valeria Mendoza</span></div>
        <button class="primary" @click="openVisit">{{ visitNote ? (visitNote.draft ? 'Retomar borrador' : 'Ver nota firmada') : 'Registrar nota de esta cita' }}</button></div>
      <button class="link-btn" @click="begin('')">Registrar atención sin cita</button>
      <div class="facts"><div><small>Última atención firmada</small><strong>{{ dateLabel(lastSigned.date) }}</strong></div>
        <div><small>Tratamiento de esa visita</small><strong>{{ treatment(lastSigned) }}</strong></div>
        <div><small>Próxima visita</small><strong>{{ nextVisit }}</strong></div></div>
      <h4>Atenciones y seguimientos anteriores</h4>
      <div class="history-table"><table><thead><tr><th>Fecha</th><th>Registro</th><th>Tratamiento realizado</th><th>Próxima visita</th><th>Detalle</th></tr></thead>
      <tbody><tr v-for="row in pageRows" :key="row.id"><td data-label="Fecha">{{ dateLabel(row.value.date) }}</td>
        <td data-label="Registro"><strong>{{ row.historical ? 'Seguimiento anterior' : 'Nota de evolución' }}</strong><small class="chip">{{ status(row) }}</small></td>
        <td data-label="Tratamiento">{{ treatment(row.value) }}</td><td data-label="Próxima visita">{{ row.historical ? 'Sin dato de cita' : bookingLabel(row.booking) }}</td>
        <td><button @click="openRow(row)">{{ row.draft ? 'Retomar borrador' : row.historical ? 'Ver seguimiento' : 'Ver nota' }}</button></td></tr></tbody></table></div>
      <nav v-if="pages > 1" class="actions" aria-label="Páginas del historial"><button :disabled="page===1" @click="page--">Anterior</button><span role="status">Página {{ page }} de {{ pages }} · {{ rows.length }} registros</span><button :disabled="page===pages" @click="page++">Siguiente</button></nav>
    </template>
    <template v-else-if="mode === 'past'"><p>{{ dateLabel(current.value.date) }} · Registro previo</p>
      <dl><dt>Tratamiento realizado</dt><dd>{{ treatment(current.value) }}</dd><dt>Indicación registrada</dt><dd>{{ current.value.indication }}</dd></dl>
      <button @click="go('list')">Volver al historial</button></template>
    <form v-else-if="mode === 'edit'" novalidate @submit.prevent="review">
      <p class="muted">{{ correcting ? 'La versión firmada se conservará.' : 'Puedes guardar lo que llevas y continuar después.' }}</p>
      <fieldset><legend>Datos de la visita</legend>
        <label v-if="correcting">¿Por qué rectificas la nota?<textarea v-model.trim="form.change" data-field="change" rows="2" /><small v-if="invalid('change')">Escribe el motivo del cambio.</small></label>
        <label>Cita de origen<select v-model="form.origin" :disabled="correcting"><option value="">Atención sin cita</option><option v-if="!visitNote || current.id === visitNote.id" value="demo-control">Consulta de control · {{ dateLabel(visitDay) }} · 10:00</option></select></label>
        <label>Fecha de atención<input v-model="form.date" data-field="date" type="date"><small v-if="invalid('date')">Elige la fecha.</small></label></fieldset>
      <fieldset><legend>Nota clínica</legend><label v-for="field in fields" :key="field.key">{{ field.label }}
        <textarea v-model.trim="form[field.key]" :rows="field.rows" :data-field="field.key" :aria-invalid="invalid(field.key)" :placeholder="field.hint" /><small v-if="invalid(field.key)">{{ field.hint }}.</small></label></fieldset>
      <fieldset><legend>Tratamiento de esta visita</legend><p class="muted">{{ treatments.length ? 'Busca y elige uno o más procedimientos.' : 'Plan de ejemplo para probar la selección múltiple.' }}</p><nc5-treatment-select v-model="form.done" :items="choices" :disabled="form.none" label="Tratamientos realizados del plan" />
        <label>Otro tratamiento realizado<input v-model.trim="form.performed" maxlength="255" data-field="performed" :disabled="form.none" placeholder="Ej. Ajuste de guarda"></label><p class="muted">El tratamiento adicional quedará en «Otros tratamientos» del plan activo. Si aún no hay plan, se incorporará cuando abras uno.</p>
        <label class="check"><input v-model="form.none" type="checkbox" @change="clearTreatment"> No se realizó un procedimiento</label><small v-if="invalid('performed')">Describe el tratamiento o confirma que no hubo procedimiento.</small>
        </fieldset><fieldset><legend>Tratamientos previstos</legend><p class="muted">Elige uno o más procedimientos para otra visita.</p><nc5-treatment-select v-model="form.future" :items="choices" label="Tratamientos previstos del plan" />
        <p class="plan-hint"><strong>Al firmar la nota</strong>, los tratamientos que selecciones como realizados quedarán completados en el plan de tratamiento. Los que elijas solo como previstos conservarán su estado actual.</p><label>Otra indicación<input v-model.trim="form.indication" placeholder="Ej. Revisar la adaptación"></label></fieldset>
      <p class="muted">{{ completed }} de 4 datos clínicos completos</p><p v-if="error" role="alert" class="error-msg">{{ error }}</p>
      <div class="actions footer"><button v-if="!correcting" type="button" @click="saveDraft">Guardar borrador</button><button class="primary">{{ correcting ? 'Revisar rectificación' : 'Revisar para firmar' }}</button><button type="button" @click="cancel">Cancelar</button></div>
      <div v-if="discard" class="record"><strong>¿Descartar los cambios de esta edición?</strong><div class="actions"><button type="button" @click="discard=false">Seguir editando</button><button type="button" @click="go('list')">Descartar cambios</button></div></div>
    </form>
    <template v-else>
      <p class="muted">Dra. Valeria Mendoza · {{ dateLabel(display.date) }} · {{ display.origin ? 'Consulta de control de las 10:00' : 'Atención sin cita' }}</p>
      <template v-if="mode === 'review' && correcting"><h4>Cambios que vas a firmar</h4>
        <div v-for="diff in changes" :key="diff.label" class="change"><strong>{{ diff.label }}</strong><div class="pair"><div><small>Versión firmada</small>{{ diff.before }}</div><div><small>Corrección</small>{{ diff.after }}</div></div></div>
        <p><strong>Motivo</strong> · {{ form.change }}</p><p class="muted">Revisa también la indicación. La cita conserva su estado. Hoy figura como «{{ bookingLabel(current.booking) }}».</p></template>
      <dl class="record"><template v-for="f in fields"><dt :key="f.key">{{ f.label }}</dt><dd :key="f.key+'-value'">{{ display[f.key] }}</dd></template>
        <dt>Tratamiento realizado</dt><dd>{{ treatment(display) }}</dd><dt>Próximo procedimiento o indicación</dt><dd>{{ futureLabel(display) }}</dd></dl>
      <div v-if="mode === 'review'"><p>Al firmar se guarda esta versión. Cualquier cambio posterior quedará como rectificación.</p><div class="actions"><button class="primary" @click="sign">Firmar {{ correcting ? 'rectificación' : 'y cerrar' }} (simulado)</button><button @click="go('edit')">Volver a editar</button></div></div>
      <template v-else>
        <fieldset><legend>¿Qué hacemos con la próxima cita?</legend><p role="status">{{ bookingLabel(current.booking) }}</p>
          <template v-if="!current.booking || !['confirmed','requested'].includes(current.booking.state)">
          <div class="actions"><button @click="scheduling=true; compose=false">Reservar ahora</button><button @click="compose=true; scheduling=false">Avisar al equipo</button><button @click="saveBooking('later')">Dejar sin cita</button></div>
          <fieldset v-if="compose"><legend>Mensaje para el equipo</legend><label>¿A quién quieres avisar?<select v-model="recipient"><option disabled value="">Selecciona una persona</option><optgroup v-for="g in groups" :key="g.label" :label="g.label"><option v-for="p in g.people" :key="p.id" :value="p.id">{{ p.name }}</option></optgroup></select></label><p>{{ body }}</p><p class="muted">Contactos de ejemplo · Envío simulado en esta pestaña.</p><div class="actions"><button :disabled="!recipient" @click="notify">Enviar mensaje</button><button @click="compose=false">Cancelar</button></div></fieldset>
          <div v-if="scheduling" class="booking"><label>Fecha<input v-model="bookingDate" type="date" :min="today"></label><label>Hora<select v-model="bookingTime"><option>09:00</option><option>11:30</option></select></label>
          <button :disabled="!bookingDate || bookingDate < today || sameConflict" @click="reserve">Reservar a las {{ bookingTime }}</button></div></template></fieldset>
        <details v-if="current.chat" class="history"><summary>Mensaje enviado al equipo</summary><strong>Para {{ current.chat.name }}</strong><p>{{ current.chat.body }}</p></details><h4>Versiones de la nota</h4><details v-for="(v,i) in current.versions" :key="i" class="history"><summary>Versión {{ i+1 }} · {{ i ? 'Rectificación' : 'Firma original' }}</summary>
          <dl><dt>Profesional</dt><dd>Dra. Valeria Mendoza</dd><dt>Firma simulada</dt><dd>{{ new Date(v.stamp).toLocaleString('es-MX') }}</dd><dt>Fecha de atención</dt><dd>{{ dateLabel(v.date) }}</dd><dt>Cita de origen</dt><dd>{{ v.origin ? 'Consulta de control · 10:00' : 'Atención sin cita' }}</dd><template v-for="f in fields"><dt :key="f.key">{{ f.label }}</dt><dd :key="f.key+'-old'">{{ v[f.key] }}</dd></template><dt>Tratamiento</dt><dd>{{ treatment(v) }}</dd><dt>Próxima indicación</dt><dd>{{ futureLabel(v) }}</dd><template v-if="v.change"><dt>Motivo de la rectificación</dt><dd>{{ v.change }}</dd></template></dl></details>
        <div class="actions"><button @click="correct">Rectificar nota</button><button @click="go('list')">Volver al historial</button></div></template>
    </template><p v-if="storageError" role="alert">{{ storageError }}</p>
  </section>
</template>
<script>
import Nc5TreatmentSelect from './Nc5TreatmentSelect.vue'
const key = 'nc5-alameda-maqueta-2'
const visitDay = '2026-11-20'
const fields = [
  {key:'reason', label:'Motivo de atención', rows:1, hint:'Describe el motivo de la visita'},
  {key:'evolution', label:'Evolución y valoración', rows:3, hint:'Describe los hallazgos de esta atención'},
  {key:'plan', label:'Plan e indicaciones', rows:2, hint:'Escribe el plan acordado'}
]
const demoPlan=['Ajuste de guarda','Revisión de adaptación','Toma de impresión'].map((name,i)=>({id:'demo-'+i,name}))
const contacts=[{id:'sofia',name:'Sofía Herrera'},{id:'agenda',name:'Sintetic Agenda'},{id:'apoyo',name:'Profesional de apoyo (ejemplo)'}]
const older=Array.from({length:9},(_,i)=>({id:'example-'+i,historical:true,value:{date:'2026-10-'+String(26-i*2).padStart(2,'0'),performed:demoPlan[i%3].name,indication:'Control de seguimiento'}}))
const empty = () => ({ date:visitDay, reason:'', evolution:'', plan:'', change:'', performed:'', indication:'', treatmentId:'', done:[], future:[], none:false, origin:'' })
function examples() {
  const value = {...empty(), date:'2026-11-12', reason:'Control de guarda', evolution:'La paciente refiere mejoría.', plan:'Revisar en dos semanas.', indication:'Revisar adaptación', performed:'Ajuste de guarda', stamp:'2026-11-12T16:00:00Z'}
  return [{id:'previous',versions:[value]}, {id:'legacy',historical:true,value:{date:'2026-11-05',performed:'Toma de impresión',indication:'Entrega de guarda'}}]
}
function valueOf(row) { return row.draft || (row.historical ? row.value : row.versions[row.versions.length-1]) }
export default {
  components: { Nc5TreatmentSelect },
  props:{treatments:{type:Array,default:()=>[]}},
  data() { return {page:1,compose:false,recipient:'',visitDay,today:new Date().toLocaleDateString('sv-SE'),fields,notes:examples(),currentId:'',mode:'list',form:empty(),baseline:'',discard:false,attempt:false,error:'',storageError:'',message:'',scheduling:false,bookingDate:new Date().toLocaleDateString('sv-SE'),bookingTime:'09:00'} },
  computed:{
    choices() { return this.treatments.length ? this.treatments : demoPlan },
    pages() { return Math.ceil(this.rows.length/10) },
    pageRows() { return this.rows.slice((this.page-1)*10,this.page*10) },
    body() { return 'Hola, ¿puedes coordinar una cita de control para QA NC1 Mínima Sintética (exp. 000069) con la Dra. Valeria Mendoza en Alameda? Gracias.' },
    groups() {
      const totals = new Map()
      for (const note of this.notes) {
        if (note.chat) totals.set(note.chat.to, (totals.get(note.chat.to) || 0) + 1)
      }
      const alphabetical = [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'es'))
      const frequent = alphabetical.filter(p => totals.has(p.id))
        .sort((a, b) => totals.get(b.id) - totals.get(a.id)).slice(0, 2)
      if (!frequent.length) return [{ label: 'Equipo del consultorio', people: alphabetical }]
      const others = alphabetical.filter(person => !frequent.includes(person))
      return [{ label: 'Contactos frecuentes', people: frequent }, { label: 'Resto del equipo', people: others }].filter(group => group.people.length)
    },
    rows() { return this.notes.concat(older).map(row => ({...row,value:valueOf(row)})).sort((a,b)=>b.value.date.localeCompare(a.value.date)) },
    current() { return this.notes.find(n=>n.id===this.currentId) || older.find(n=>n.id===this.currentId) || {id:this.currentId,versions:[]} },
    visitNote() { return this.notes.find(n=>valueOf(n).origin === 'demo-control') },
    lastSigned() { return this.rows.find(n=>!n.draft && !n.historical).value },
    nextVisit() {
      const booked=this.rows.map(r=>r.booking).filter(b=>b && b.state==='confirmed' && b.date>=this.today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
      if (booked.length) return this.bookingLabel(booked[0])
      return this.rows.some(r=>r.booking && r.booking.state==='requested') ? 'Pendiente de agendar' : 'Sin cita reservada'
    },
    correcting() { return !!(this.current.versions && this.current.versions.length) },
    display() { return this.mode==='review' ? this.form : valueOf(this.current) },
    completed() { return ['date',...fields.map(f=>f.key)].filter(k=>this.form[k]).length },
    title() { return {list:'Seguimiento del paciente',past:'Seguimiento anterior',edit:this.correcting ? 'Rectificar nota' : this.current.draft ? 'Retomar borrador' : 'Registrar atención', review:'Revisar antes de firmar',record:'Nota firmada'}[this.mode] },
    sameConflict() { const b=this.current.booking; return b && b.state==='conflict' && b.date===this.bookingDate && b.time===this.bookingTime },
    changes() {
      if (!this.correcting) return []
      const old=valueOf(this.current)
      const items=[{key:'date',label:'Fecha de atención'},...fields,{key:'performed',label:'Tratamiento realizado'},{key:'indication',label:'Próxima indicación'}]
      const format=(v,k)=>k==='date' ? this.dateLabel(v.date) : k==='performed' ? this.treatment(v) : k==='indication' ? this.futureLabel(v) : v[k] || 'Sin dato registrado'
      return items.map(f=>({label:f.label,before:format(old,f.key),after:format(this.form,f.key)})).filter(d=>d.before!==d.after)
    }
  },
  created() { try { const saved=JSON.parse(sessionStorage.getItem(key)); if (Array.isArray(saved) && saved.length) this.notes=saved } catch { this.storageError='No se pudo recuperar esta sesión de prueba.' } },
  methods:{
    treatment(v) { return v.none ? 'Sin procedimiento' : this.names(v.done,v.performed) || 'Sin dato registrado' },
    names(items,extra) { return [...(items || []).map(t=>t.name),extra].filter(Boolean).join(' · ') },
    futureLabel(v) { return this.names(v.future,v.indication) || 'Sin indicación registrada' },
    notify() {
      const person=contacts.find(p=>p.id===this.recipient)
      if (!person || this.current.chat) return
      const chat={to:person.id,name:person.name,body:this.body,stamp:new Date().toISOString()}
      if (this.put({...this.current,chat,booking:{state:'requested',name:person.name}})) this.compose=false
    },
    status(r) { return r.historical ? 'Registro previo' : r.draft ? 'Borrador' : r.versions.length>1 ? 'Rectificada' : 'Firmada' },
    dateLabel(v) { return v ? new Date(v+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}) : 'Sin fecha' },
    bookingLabel(b) {
      if (!b || b.state==='later') return 'Sin cita reservada'
      if (b.state==='requested') return 'Solicitud enviada a '+(b.name || 'tu equipo')+' · Pendiente de agendar'
      const slot=this.dateLabel(b.date)+' a las '+b.time
      return b.state==='conflict' ? 'Nota firmada. El horario del '+slot+' se ocupó. Elige otro horario.' : 'Confirmada · '+slot
    },
    put(row) {
      const notes=[row,...this.notes.filter(n=>n.id!==row.id)]
      try { sessionStorage.setItem(key,JSON.stringify(notes)); this.notes=notes; this.storageError=''; return true }
      catch { this.storageError='No se pudo guardar. Tu captura sigue abierta.'; return false }
    },
    go(mode,message='') { this.compose=false; this.recipient=''; this.mode=mode; this.message=message; this.discard=false; this.attempt=false; this.error=''; this.$nextTick(()=>this.$refs.title.focus()) },
    openVisit() { if (this.visitNote) this.openRow(this.visitNote); else this.begin('demo-control') },
    begin(origin) { this.currentId='local-'+Date.now(); this.form={...empty(),origin}; this.baseline=JSON.stringify(this.form); this.go('edit') },
    openRow(row) {
      this.currentId=row.id; this.scheduling=!!row.booking && row.booking.state==='conflict'
      if (row.booking && row.booking.date) { this.bookingDate=row.booking.date; this.bookingTime=row.booking.time }
      if (row.draft) { this.form={...row.draft}; this.baseline=JSON.stringify(this.form); this.go('edit','Retomaste tu borrador.'); return }
      this.go(row.historical ? 'past' : 'record')
    },
    clearTreatment() { if (this.form.none) { this.form.treatmentId=''; this.form.performed=''; this.$set(this.form,'done',[]) } },
    correct() { this.form={...valueOf(this.current),change:''}; this.baseline=JSON.stringify(this.form); this.go('edit') },
    cancel() { if (JSON.stringify(this.form)===this.baseline) this.go('list'); else this.discard=true },
    saveDraft() { if (this.put({...this.current,draft:{...this.form}})) this.go('list','Borrador guardado en esta pestaña.') },
    invalid(k) { return this.attempt && !this.form[k] && !(k==='performed' && (this.form.none || (this.form.done || []).length)) },
    review() {
      this.attempt=true
      const keys=[...(this.correcting ? ['change'] : []),'date',...fields.map(f=>f.key),'performed']
      const first=keys.find(k=>this.invalid(k))
      if (first) { this.error='Completa el dato señalado para continuar.'; this.$nextTick(()=>this.$el.querySelector('[data-field="'+first+'"]').focus()); return }
      if (this.correcting && !this.changes.length) { this.error='Cambia el dato que deseas rectificar.'; return }
      this.go('review')
    },
    sign() { if (this.mode!=='review') return; const version={...this.form,stamp:new Date().toISOString()}; if(this.put({...this.current,draft:null,versions:[...this.current.versions,version]})) { this.scheduling=false; this.go('record','Tu nota quedó firmada.') } },
    saveBooking(state) { if(this.put({...this.current,booking:{state,date:this.bookingDate,time:this.bookingTime}})) { this.scheduling=state==='conflict'; this.compose=false } },
    reserve() { this.saveBooking(this.bookingTime==='09:00' ? 'conflict' : 'confirmed') }
  }
}
</script>

<style scoped src="./nc5Note.css"></style>
